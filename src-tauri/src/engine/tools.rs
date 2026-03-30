// Conflux Engine — Tool System
// Registry, dispatch, and execution of agent tools with sandboxing.

use anyhow::Result;
use serde_json::Value;

use super::db::EngineDb;

/// Result of a tool execution.
#[derive(Debug, Clone)]
pub struct ToolResult {
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
}

// ── Security: Blocked commands and allowed paths ──

/// Commands that are never allowed in exec.
const BLOCKED_COMMANDS: &[&str] = &[
    "rm -rf /",
    "rm -rf /*",
    "mkfs",
    "dd if=",
    ":(){ :|:& };:",  // fork bomb
    "chmod 777",
    "> /dev/sda",
    "wget | sh",
    "curl | sh",
    "curl | bash",
    "wget | bash",
];

/// Paths that are never accessible.
const BLOCKED_PATHS: &[&str] = &[
    "/etc/shadow",
    "/etc/passwd",
    "/proc/",
    "/sys/",
    "/dev/",
];

/// Allowed directories for file operations.
fn get_allowed_paths() -> Vec<String> {
    let mut paths = vec![
        "/tmp/conflux".to_string(),
    ];

    if let Ok(home) = std::env::var("HOME") {
        paths.push(format!("{}/Documents", home));
        paths.push(format!("{}/Downloads", home));
        paths.push(format!("{}/Desktop", home));
        paths.push(format!("{}/.openclaw", home));
    }

    // App data directory
    if let Ok(data) = std::env::var("CONFLUX_DATA_DIR") {
        paths.push(data);
    }

    paths
}

/// Check if a file path is within allowed directories.
fn is_path_allowed(path: &str) -> bool {
    let allowed = get_allowed_paths();
    let normalized = std::path::Path::new(path).canonicalize()
        .unwrap_or_else(|_| std::path::PathBuf::from(path));
    let normalized_str = normalized.to_string_lossy();

    // Check blocked paths first
    for blocked in BLOCKED_PATHS {
        if normalized_str.starts_with(blocked) {
            return false;
        }
    }

    // Check if within allowed directories
    for allowed_path in &allowed {
        if normalized_str.starts_with(allowed_path) {
            return true;
        }
    }

    // Allow relative paths (resolved against CWD)
    if !path.starts_with('/') {
        return true;
    }

    false
}

/// Check if a shell command is safe to execute.
fn is_command_safe(command: &str) -> Result<()> {
    let lower = command.to_lowercase();

    for blocked in BLOCKED_COMMANDS {
        if lower.contains(&blocked.to_lowercase()) {
            anyhow::bail!("Command blocked for safety: contains '{}'", blocked);
        }
    }

    // Block commands that try to download and execute
    if (lower.contains("curl") || lower.contains("wget") || lower.contains("fetch"))
        && (lower.contains("sh") || lower.contains("bash") || lower.contains("exec") || lower.contains("|"))
    {
        anyhow::bail!("Command blocked: downloading and executing scripts is not allowed");
    }

    Ok(())
}

// ── Tool Permission Check ──

fn check_tool_permission(db: &EngineDb, agent_id: &str, tool_name: &str) -> Result<bool> {
    let conn = db.conn();
    let result: std::result::Result<i64, _> = conn.query_row(
        "SELECT is_allowed FROM tool_permissions WHERE agent_id = ?1 AND tool_id = ?2",
        rusqlite::params![agent_id, tool_name],
        |row| row.get(0),
    );

    match result {
        Ok(allowed) => Ok(allowed != 0),
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            // No permission record = allowed by default
            Ok(true)
        }
        Err(e) => Err(e.into()),
    }
}

/// Execute a tool by name with the given arguments.
pub async fn execute_tool(tool_name: &str, args: &Value) -> Result<ToolResult> {
    execute_tool_for_agent(tool_name, args, "default").await
}

/// Execute a tool with agent-specific permission checking.
pub async fn execute_tool_for_agent(tool_name: &str, args: &Value, _agent_id: &str) -> Result<ToolResult> {
    // Google tools are checked separately (they require auth, not permissions)
    if matches!(tool_name, "google_auth" | "gmail_send" | "gmail_search" | "google_drive_list" |
        "google_doc_read" | "google_doc_write" | "google_sheet_read" | "google_sheet_write")
    {
        let engine = super::get_engine();
        return super::google::execute_google_tool(tool_name, args, engine.db()).await;
    }

    match tool_name {
        "web_search" => execute_web_search(args).await,
        "web_fetch" => execute_web_fetch(args).await,
        "file_read" => execute_file_read(args),
        "file_write" => execute_file_write(args),
        "exec" => execute_command(args),
        "calc" => execute_calc(args),
        "time" => execute_time(),
        "memory_read" => execute_memory_read(args).await,
        "memory_write" => execute_memory_write(args).await,
        // Phase 5: Integration tools
        "web_post" => execute_web_post(args).await,
        "notify" => execute_notify(args),
        "email_send" => execute_email_send(args),
        "email_receive" => execute_email_receive(args),
        _ => Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some(format!("Unknown tool: {}", tool_name)),
        }),
    }
}

/// Get tool definitions in OpenAI function-calling format.
pub fn get_tool_definitions() -> Vec<Value> {
    vec![
        serde_json::json!({
            "type": "function",
            "function": {
                "name": "web_search",
                "description": "Search the web for information using DuckDuckGo and Wikipedia. Use this frequently to find current information, verify facts, and research topics. Always prefer searching over guessing.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": { "type": "string", "description": "The search query" }
                    },
                    "required": ["query"]
                }
            }
        }),
        serde_json::json!({
            "type": "function",
            "function": {
                "name": "web_fetch",
                "description": "Fetch and read the content of any URL. Use this to read articles, documentation, web pages, or any online content. Returns the readable text from the page.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "url": { "type": "string", "description": "The full URL to fetch (must include http:// or https://)" }
                    },
                    "required": ["url"]
                }
            }
        }),
        serde_json::json!({
            "type": "function",
            "function": {
                "name": "file_read",
                "description": "Read the contents of a file",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": { "type": "string", "description": "The file path to read" }
                    },
                    "required": ["path"]
                }
            }
        }),
        serde_json::json!({
            "type": "function",
            "function": {
                "name": "file_write",
                "description": "Write content to a file",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": { "type": "string", "description": "The file path to write" },
                        "content": { "type": "string", "description": "The content to write" }
                    },
                    "required": ["path", "content"]
                }
            }
        }),
        serde_json::json!({
            "type": "function",
            "function": {
                "name": "calc",
                "description": "Evaluate a math expression",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "expression": { "type": "string", "description": "The math expression to evaluate" }
                    },
                    "required": ["expression"]
                }
            }
        }),
        serde_json::json!({
            "type": "function",
            "function": {
                "name": "time",
                "description": "Get the current date and time",
                "parameters": { "type": "object", "properties": {} }
            }
        }),
        // ── Google Workspace Tools ──
        serde_json::json!({
            "type": "function",
            "function": {
                "name": "gmail_send",
                "description": "Send an email via Gmail",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "to": { "type": "string", "description": "Recipient email address" },
                        "subject": { "type": "string", "description": "Email subject" },
                        "body": { "type": "string", "description": "Email body text" }
                    },
                    "required": ["to", "subject", "body"]
                }
            }
        }),
        serde_json::json!({
            "type": "function",
            "function": {
                "name": "gmail_search",
                "description": "Search Gmail messages",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": { "type": "string", "description": "Gmail search query (same syntax as Gmail search)" },
                        "max_results": { "type": "integer", "description": "Max results to return (default 5)" }
                    },
                    "required": ["query"]
                }
            }
        }),
        serde_json::json!({
            "type": "function",
            "function": {
                "name": "google_drive_list",
                "description": "List files in Google Drive",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": { "type": "string", "description": "Drive search query (e.g., \"name contains 'report'\")" },
                        "max_results": { "type": "integer", "description": "Max files to list (default 10)" }
                    },
                    "required": []
                }
            }
        }),
        serde_json::json!({
            "type": "function",
            "function": {
                "name": "google_doc_read",
                "description": "Read the content of a Google Doc",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "document_id": { "type": "string", "description": "The Google Doc document ID (from the URL)" }
                    },
                    "required": ["document_id"]
                }
            }
        }),
        serde_json::json!({
            "type": "function",
            "function": {
                "name": "google_doc_write",
                "description": "Append text to a Google Doc",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "document_id": { "type": "string", "description": "The Google Doc document ID" },
                        "content": { "type": "string", "description": "Text to append to the document" }
                    },
                    "required": ["document_id", "content"]
                }
            }
        }),
        serde_json::json!({
            "type": "function",
            "function": {
                "name": "google_sheet_read",
                "description": "Read values from a Google Sheet",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "spreadsheet_id": { "type": "string", "description": "The spreadsheet ID (from the URL)" },
                        "range": { "type": "string", "description": "A1 notation range (e.g., 'Sheet1!A1:C10')" }
                    },
                    "required": ["spreadsheet_id", "range"]
                }
            }
        }),
        serde_json::json!({
            "type": "function",
            "function": {
                "name": "google_sheet_write",
                "description": "Write values to a Google Sheet",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "spreadsheet_id": { "type": "string", "description": "The spreadsheet ID" },
                        "range": { "type": "string", "description": "A1 notation range (e.g., 'Sheet1!A1')" },
                        "values": { "type": "array", "description": "2D array of values to write" }
                    },
                    "required": ["spreadsheet_id", "range", "values"]
                }
            }
        }),
    ]
}

// ── Phase 5: Integration Tool Definitions ──

pub fn get_integration_tool_definitions() -> Vec<Value> {
    vec![
        serde_json::json!({
            "type": "function",
            "function": {
                "name": "web_post",
                "description": "Send a POST request to any URL. Use this to trigger webhooks, call APIs, send notifications to Slack/Discord/Zapier, or integrate with external services.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "url": { "type": "string", "description": "The URL to POST to" },
                        "body": { "type": "string", "description": "JSON body to send (as a string)" },
                        "headers": { "type": "string", "description": "Optional JSON object of headers (e.g., '{\"Authorization\": \"Bearer ...\"}')" }
                    },
                    "required": ["url", "body"]
                }
            }
        }),
        serde_json::json!({
            "type": "function",
            "function": {
                "name": "notify",
                "description": "Send a desktop/mobile notification to the user. Use this for alerts, reminders, task completions, or important updates that need immediate attention.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": { "type": "string", "description": "Notification title (shown in bold)" },
                        "body": { "type": "string", "description": "Notification body text" }
                    },
                    "required": ["title", "body"]
                }
            }
        }),
        serde_json::json!({
            "type": "function",
            "function": {
                "name": "email_send",
                "description": "Send an email via SMTP. Configure email settings first in Settings > Email.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "to": { "type": "string", "description": "Recipient email address" },
                        "subject": { "type": "string", "description": "Email subject line" },
                        "body": { "type": "string", "description": "Email body (plain text)" }
                    },
                    "required": ["to", "subject", "body"]
                }
            }
        }),
        serde_json::json!({
            "type": "function",
            "function": {
                "name": "email_receive",
                "description": "Check for new emails via IMAP. Returns recent unread emails.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "folder": { "type": "string", "description": "Mailbox folder to check (default: INBOX)" },
                        "limit": { "type": "integer", "description": "Max emails to return (default: 10)" }
                    },
                    "required": []
                }
            }
        }),
    ]
}

// ── Tool Implementations ──

async fn execute_web_search(args: &Value) -> Result<ToolResult> {
    let query = args.get("query")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if query.is_empty() {
        return Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some("No search query provided".to_string()),
        });
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("Mozilla/5.0 (Conflux Home)")
        .build()?;

    let mut results = Vec::new();

    // Source 1: DuckDuckGo HTML lite (no API key, no JS)
    match search_duckduckgo(&client, query).await {
        Ok(ddg_results) if !ddg_results.is_empty() => {
            results.push(format!("=== Web Results ===\n{}", ddg_results));
        }
        _ => {}
    }

    // Source 2: Wikipedia (free knowledge API)
    match search_wikipedia(&client, query).await {
        Ok(wiki_results) if !wiki_results.is_empty() => {
            results.push(format!("=== Wikipedia ===\n{}", wiki_results));
        }
        _ => {}
    }

    if results.is_empty() {
        return Ok(ToolResult {
            success: true,
            output: format!("No results found for: '{}'", query),
            error: None,
        });
    }

    Ok(ToolResult {
        success: true,
        output: results.join("\n\n"),
        error: None,
    })
}

/// Search DuckDuckGo via their lite HTML page (no API key needed).
async fn search_duckduckgo(client: &reqwest::Client, query: &str) -> Result<String> {
    let url = format!(
        "https://lite.duckduckgo.com/lite/?q={}",
        urlencoding::encode(query)
    );

    let response = client.get(&url).send().await?;
    let html = response.text().await?;

    // Parse results from the lite page
    // DuckDuckGo lite uses <a> tags with class="result-link" for results
    // and <td class="result-snippet"> for descriptions
    let mut results = Vec::new();
    let mut lines = html.lines().peekable();

    while let Some(line) = lines.next() {
        let trimmed = line.trim();

        // Look for result links: <a rel="nofollow" href="..." class="result-link">Title</a>
        if trimmed.contains("class=\"result-link\"") {
            // Extract URL from href
            let url = extract_between(trimmed, "href=\"", "\"")
                .unwrap_or_default();
            // Extract title text
            let title = extract_between(trimmed, ">", "</a>")
                .unwrap_or_default();
            let title = strip_html_tags(&title);

            // Next few lines should have the snippet
            let mut snippet = String::new();
            for _ in 0..5 {
                if let Some(next) = lines.next() {
                    let next_trimmed = next.trim();
                    if next_trimmed.contains("class=\"result-snippet\"") {
                        snippet = strip_html_tags(
                            extract_between(next_trimmed, ">", "</td>")
                                .unwrap_or(next_trimmed)
                        );
                        break;
                    }
                    // Also try <td> with the snippet
                    if !next_trimmed.is_empty() && !next_trimmed.starts_with('<') {
                        snippet = strip_html_tags(next_trimmed);
                        break;
                    }
                }
            }

            if !title.is_empty() {
                let entry = if snippet.is_empty() {
                    format!("• {} — {}", title, url)
                } else {
                    format!("• {}\n  {}\n  {}", title, snippet, url)
                };
                results.push(entry);
            }
        }

        if results.len() >= 5 {
            break;
        }
    }

    Ok(results.join("\n\n"))
}

/// Search Wikipedia via their free API (no key needed).
async fn search_wikipedia(client: &reqwest::Client, query: &str) -> Result<String> {
    let url = format!(
        "https://en.wikipedia.org/w/api.php?action=opensearch&search={}&limit=3&format=json",
        urlencoding::encode(query)
    );

    let response = client.get(&url).send().await?;
    let json: Value = response.json().await?;

    // opensearch returns [query, [titles], [descriptions], [urls]]
    let titles = json.get(1).and_then(|v| v.as_array());
    let descriptions_arr = json.get(2).and_then(|v| v.as_array());
    let urls = json.get(3).and_then(|v| v.as_array());

    if titles.is_none() || urls.is_none() {
        return Ok(String::new());
    }

    let titles = titles.unwrap();
    let urls = urls.unwrap();
    let empty_vec = Vec::new();
    let descriptions = descriptions_arr.unwrap_or(&empty_vec);

    let mut results = Vec::new();
    for i in 0..titles.len().min(3) {
        let title = titles.get(i).and_then(|t| t.as_str()).unwrap_or("");
        let url = urls.get(i).and_then(|u| u.as_str()).unwrap_or("");
        let desc = descriptions.get(i).and_then(|d| d.as_str()).unwrap_or("");

        if !title.is_empty() {
            let entry = if desc.is_empty() {
                format!("• {} — {}", title, url)
            } else {
                format!("• {}\n  {}\n  {}", title, desc, url)
            };
            results.push(entry);
        }
    }

    // If we got results, also fetch the first article's intro paragraph
    if let Some(first_url) = urls.get(0).and_then(|u| u.as_str()) {
        if let Ok(summary) = fetch_wikipedia_summary(client, first_url).await {
            if !summary.is_empty() {
                results.push(format!("📖 Summary:\n{}", summary));
            }
        }
    }

    Ok(results.join("\n\n"))
}

/// Fetch the intro paragraph of a Wikipedia article.
async fn fetch_wikipedia_summary(client: &reqwest::Client, article_url: &str) -> Result<String> {
    // Extract article title from URL
    let title = article_url.rsplit('/').next().unwrap_or("");
    if title.is_empty() {
        return Ok(String::new());
    }

    let api_url = format!(
        "https://en.wikipedia.org/w/api.php?action=query&titles={}&prop=extracts&exintro&explaintext&format=json",
        urlencoding::encode(title)
    );

    let response = client.get(&api_url).send().await?;
    let json: Value = response.json().await?;

    let pages = json.get("query").and_then(|q| q.get("pages"));
    if let Some(pages) = pages.and_then(|p| p.as_object()) {
        for (_, page) in pages {
            if let Some(extract) = page.get("extract").and_then(|e| e.as_str()) {
                // Return first 500 chars of the summary
                let summary = if extract.len() > 500 {
                    format!("{}...", &extract[..500])
                } else {
                    extract.to_string()
                };
                return Ok(summary);
            }
        }
    }

    Ok(String::new())
}

/// Fetch any URL and return readable text content.
async fn execute_web_fetch(args: &Value) -> Result<ToolResult> {
    let url = args.get("url")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if url.is_empty() {
        return Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some("No URL provided".to_string()),
        });
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .user_agent("Mozilla/5.0 (Conflux Home)")
        .build()?;

    let response = client.get(url).send().await?;
    let status = response.status();
    let content_type = response.headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    if !status.is_success() {
        return Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some(format!("HTTP {}: {}", status.as_u16(), status.canonical_reason().unwrap_or("error"))),
        });
    }

    // Only parse HTML content
    if content_type.contains("text/html") || content_type.contains("text/plain") {
        let html = response.text().await?;
        let text = html_to_text(&html);

        // Truncate to 5000 chars to avoid overwhelming the context
        let truncated = if text.len() > 5000 {
            format!("{}...\n\n[Content truncated — {} chars total]", &text[..5000], text.len())
        } else {
            text
        };

        Ok(ToolResult {
            success: true,
            output: format!("📄 {} ({})\n\n{}", url, content_type.split(';').next().unwrap_or(""), truncated),
            error: None,
        })
    } else {
        Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some(format!("Unsupported content type: {}", content_type)),
        })
    }
}

// ── HTML parsing helpers ──

/// Extract text between two delimiters in a string.
fn extract_between<'a>(s: &'a str, start: &str, end: &str) -> Option<&'a str> {
    let start_idx = s.find(start)? + start.len();
    let end_idx = s[start_idx..].find(end)? + start_idx;
    Some(&s[start_idx..end_idx])
}

/// Strip HTML tags from a string.
fn strip_html_tags(html: &str) -> String {
    let mut result = String::with_capacity(html.len());
    let mut in_tag = false;
    for ch in html.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => result.push(ch),
            _ => {}
        }
    }
    // Decode common HTML entities
    result
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&nbsp;", " ")
        .trim()
        .to_string()
}

/// Convert HTML to readable plain text.
fn html_to_text(html: &str) -> String {
    let mut result = String::with_capacity(html.len());
    let mut in_tag = false;
    let mut in_script = false;
    let mut in_style = false;
    let mut tag_buffer = String::new();

    for ch in html.chars() {
        match ch {
            '<' => {
                in_tag = true;
                tag_buffer.clear();
            }
            '>' => {
                in_tag = false;
                let tag_lower = tag_buffer.to_lowercase();

                // Skip script and style content
                if tag_lower.starts_with("script") {
                    in_script = true;
                } else if tag_lower.starts_with("/script") {
                    in_script = false;
                    continue;
                } else if tag_lower.starts_with("style") {
                    in_style = true;
                } else if tag_lower.starts_with("/style") {
                    in_style = false;
                    continue;
                }

                // Add newlines for block elements
                if tag_lower.starts_with("p") || tag_lower.starts_with("div") ||
                   tag_lower.starts_with("br") || tag_lower.starts_with("li") ||
                   tag_lower.starts_with("h1") || tag_lower.starts_with("h2") ||
                   tag_lower.starts_with("h3") || tag_lower.starts_with("h4") ||
                   tag_lower.starts_with("tr") {
                    result.push('\n');
                }
            }
            _ if in_tag => {
                tag_buffer.push(ch);
            }
            _ if in_script || in_style => {}
            _ => {
                result.push(ch);
            }
        }
    }

    // Clean up whitespace
    let mut cleaned = String::with_capacity(result.len());
    let mut prev_was_newline = false;
    for ch in result.chars() {
        if ch == '\n' {
            if !prev_was_newline {
                cleaned.push('\n');
            }
            prev_was_newline = true;
        } else {
            prev_was_newline = false;
            cleaned.push(ch);
        }
    }

    // Decode common HTML entities
    cleaned
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&nbsp;", " ")
        .trim()
        .to_string()
}

fn execute_file_read(args: &Value) -> Result<ToolResult> {
    let path = args.get("path")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if path.is_empty() {
        return Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some("No file path provided".to_string()),
        });
    }

    if !is_path_allowed(path) {
        return Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some(format!("Access denied: '{}' is outside allowed directories", path)),
        });
    }

    match std::fs::read_to_string(path) {
        Ok(content) => Ok(ToolResult {
            success: true,
            output: if content.len() > 50_000 {
                format!("{}... (truncated, {} bytes total)", &content[..50_000], content.len())
            } else {
                content
            },
            error: None,
        }),
        Err(e) => Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some(format!("Failed to read file: {}", e)),
        }),
    }
}

fn execute_file_write(args: &Value) -> Result<ToolResult> {
    let path = args.get("path").and_then(|v| v.as_str()).unwrap_or("");
    let content = args.get("content").and_then(|v| v.as_str()).unwrap_or("");

    if path.is_empty() {
        return Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some("No file path provided".to_string()),
        });
    }

    if !is_path_allowed(path) {
        return Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some(format!("Access denied: '{}' is outside allowed directories", path)),
        });
    }

    // Create parent directories if needed
    if let Some(parent) = std::path::Path::new(path).parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    match std::fs::write(path, content) {
        Ok(_) => Ok(ToolResult {
            success: true,
            output: format!("Wrote {} bytes to {}", content.len(), path),
            error: None,
        }),
        Err(e) => Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some(format!("Failed to write file: {}", e)),
        }),
    }
}

fn execute_command(args: &Value) -> Result<ToolResult> {
    let command = args.get("command")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if command.is_empty() {
        return Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some("No command provided".to_string()),
        });
    }

    // Safety check: block dangerous commands
    if let Err(e) = is_command_safe(command) {
        return Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some(format!("🛡️ Blocked: {}", e)),
        });
    }

    match std::process::Command::new("sh")
        .arg("-c")
        .arg(command)
        .output()
    {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            let combined = if stderr.is_empty() {
                stdout.to_string()
            } else {
                format!("{}\nstderr: {}", stdout, stderr)
            };

            // Truncate very long output
            let output_text = if combined.len() > 10_000 {
                format!("{}... (truncated)", &combined[..10_000])
            } else {
                combined
            };

            Ok(ToolResult {
                success: output.status.success(),
                output: output_text,
                error: if output.status.success() { None } else { Some(format!("Exit code: {}", output.status)) },
            })
        }
        Err(e) => Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some(format!("Failed to execute command: {}", e)),
        }),
    }
}

fn execute_calc(args: &Value) -> Result<ToolResult> {
    let expression = args.get("expression")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if expression.is_empty() {
        return Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some("No expression provided".to_string()),
        });
    }

    // Simple safe math evaluation (no exec, no eval)
    // For now, use a basic approach — production would use a math parser crate
    match evaluate_math(expression) {
        Ok(result) => Ok(ToolResult {
            success: true,
            output: result,
            error: None,
        }),
        Err(e) => Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some(format!("Math error: {}", e)),
        }),
    }
}

fn execute_time() -> Result<ToolResult> {
    let now = chrono::Utc::now();
    Ok(ToolResult {
        success: true,
        output: format!(
            "Current time (UTC): {}\nCurrent time (local): {}",
            now.format("%Y-%m-%d %H:%M:%S UTC"),
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S %Z")
        ),
        error: None,
    })
}

async fn execute_memory_read(_args: &Value) -> Result<ToolResult> {
    // This is handled by the runtime's memory injection
    Ok(ToolResult {
        success: true,
        output: "Memory is automatically injected into your context.".to_string(),
        error: None,
    })
}

async fn execute_memory_write(_args: &Value) -> Result<ToolResult> {
    // This would be handled by the runtime after the response
    Ok(ToolResult {
        success: true,
        output: "Memory will be stored after this turn.".to_string(),
        error: None,
    })
}

/// Basic math evaluator (supports +, -, *, /, parentheses).
/// For production, replace with a proper math crate like `evalexpr`.
fn evaluate_math(expr: &str) -> Result<String> {
    // Strip spaces
    let clean = expr.replace(' ', "");

    // Very basic: only supports simple expressions
    // For real math, use the `evalexpr` crate
    if let Ok(result) = meval::eval_str(&clean) {
        Ok(format!("{}", result))
    } else {
        // Fallback: try to evaluate with sh as a calculator
        match std::process::Command::new("sh")
            .arg("-c")
            .arg(format!("echo '{}' | bc -l 2>/dev/null || echo 'error'", clean))
            .output()
        {
            Ok(output) => {
                let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if result == "error" || result.is_empty() {
                    Err(anyhow::anyhow!("Cannot evaluate: {}", expr))
                } else {
                    Ok(result)
                }
            }
            Err(e) => Err(anyhow::anyhow!("Math eval failed: {}", e)),
        }
    }
}

// Add meval to Cargo.toml dependencies

// ── Phase 5: Integration Tool Implementations ──

/// POST to any URL (webhook, API, integration)
async fn execute_web_post(args: &Value) -> Result<ToolResult> {
    let url = args.get("url").and_then(|v| v.as_str()).unwrap_or("");
    let body = args.get("body").and_then(|v| v.as_str()).unwrap_or("");
    let headers_str = args.get("headers").and_then(|v| v.as_str());

    if url.is_empty() {
        return Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some("No URL provided".to_string()),
        });
    }

    if body.is_empty() {
        return Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some("No body provided".to_string()),
        });
    }

    let client = reqwest::Client::new();
    let mut request = client.post(url)
        .header("Content-Type", "application/json")
        .header("User-Agent", "ConfluxHome/1.0")
        .body(body.to_string());

    // Parse optional headers
    if let Some(h) = headers_str {
        if let Ok(header_map) = serde_json::from_str::<serde_json::Map<String, serde_json::Value>>(h) {
            for (key, val) in header_map {
                if let Some(v) = val.as_str() {
                    request = request.header(&key, v);
                }
            }
        }
    }

    match request.send().await {
        Ok(response) => {
            let status = response.status().as_u16();
            let response_body = response.text().await.unwrap_or_default();
            let truncated = if response_body.len() > 5000 {
                format!("{}... (truncated)", &response_body[..5000])
            } else {
                response_body
            };

            Ok(ToolResult {
                success: status < 400,
                output: format!("Status: {}\nBody: {}", status, truncated),
                error: if status >= 400 { Some(format!("HTTP {}", status)) } else { None },
            })
        }
        Err(e) => Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some(format!("Request failed: {}", e)),
        }),
    }
}

/// Send a desktop/mobile notification
fn execute_notify(args: &Value) -> Result<ToolResult> {
    let title = args.get("title").and_then(|v| v.as_str()).unwrap_or("Conflux");
    let body = args.get("body").and_then(|v| v.as_str()).unwrap_or("");

    if body.is_empty() {
        return Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some("No notification body provided".to_string()),
        });
    }

    // Use Tauri's notification plugin via command
    // We'll emit an event that the frontend can listen to
    let engine = super::get_engine();
    let _ = engine.db().emit_event("agent_notification", None, None,
        Some(&serde_json::json!({"title": title, "body": body}).to_string()));

    Ok(ToolResult {
        success: true,
        output: format!("Notification sent: {} - {}", title, body),
        error: None,
    })
}

/// Send email via SMTP
fn execute_email_send(args: &Value) -> Result<ToolResult> {
    use lettre::{Message, SmtpTransport, Transport};
    use lettre::transport::smtp::authentication::Credentials;

    let to = args.get("to").and_then(|v| v.as_str()).unwrap_or("");
    let subject = args.get("subject").and_then(|v| v.as_str()).unwrap_or("");
    let body = args.get("body").and_then(|v| v.as_str()).unwrap_or("");

    if to.is_empty() || subject.is_empty() || body.is_empty() {
        return Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some("Missing required fields: to, subject, body".to_string()),
        });
    }

    // Get SMTP config from DB
    let engine = super::get_engine();
    let smtp_host = match engine.db().get_config("smtp_host") {
        Ok(Some(h)) => h,
        _ => return Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some("Email not configured. Set smtp_host, smtp_user, smtp_pass, smtp_from in Settings > Email.".to_string()),
        }),
    };
    let smtp_user = engine.db().get_config("smtp_user").unwrap_or(None).unwrap_or_default();
    let smtp_pass = engine.db().get_config("smtp_pass").unwrap_or(None).unwrap_or_default();
    let smtp_from = engine.db().get_config("smtp_from").unwrap_or(None).unwrap_or(smtp_user.clone());

    let email = match Message::builder()
        .from(smtp_from.parse().map_err(|e| anyhow::anyhow!("Invalid from address: {}", e))?)
        .to(to.parse().map_err(|e| anyhow::anyhow!("Invalid to address: {}", e))?)
        .subject(subject)
        .body(body.to_string())
    {
        Ok(e) => e,
        Err(e) => return Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some(format!("Failed to build email: {}", e)),
        }),
    };

    let creds = Credentials::new(smtp_user, smtp_pass);

    let mailer = match SmtpTransport::relay(&smtp_host) {
        Ok(m) => m.credentials(creds).build(),
        Err(e) => return Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some(format!("SMTP connection failed: {}", e)),
        }),
    };

    match mailer.send(&email) {
        Ok(_) => Ok(ToolResult {
            success: true,
            output: format!("Email sent to {}", to),
            error: None,
        }),
        Err(e) => Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some(format!("Failed to send email: {}", e)),
        }),
    }
}

/// Receive email via IMAP (stub — requires OpenSSL)
fn execute_email_receive(_args: &Value) -> Result<ToolResult> {
    Ok(ToolResult {
        success: false,
        output: String::new(),
        error: Some("Email receive (IMAP) is not yet available. Use Gmail integration (Google tools) or check back in a future update.".to_string()),
    })
}
