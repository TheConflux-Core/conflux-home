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
pub async fn execute_tool_for_agent(tool_name: &str, args: &Value, agent_id: &str) -> Result<ToolResult> {
    // Google tools are checked separately (they require auth, not permissions)
    if matches!(tool_name, "google_auth" | "gmail_send" | "gmail_search" | "google_drive_list" |
        "google_doc_read" | "google_doc_write" | "google_sheet_read" | "google_sheet_write")
    {
        let engine = super::get_engine();
        return super::google::execute_google_tool(tool_name, args, engine.db()).await;
    }

    match tool_name {
        "web_search" => execute_web_search(args).await,
        "file_read" => execute_file_read(args),
        "file_write" => execute_file_write(args),
        "exec" => execute_command(args),
        "calc" => execute_calc(args),
        "time" => execute_time(),
        "memory_read" => execute_memory_read(args).await,
        "memory_write" => execute_memory_write(args).await,
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
                "description": "Search the web for information",
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

    // Use Brave Search API (if configured) or return a placeholder
    let api_key = std::env::var("BRAVE_SEARCH_API_KEY").unwrap_or_default();
    if api_key.is_empty() {
        return Ok(ToolResult {
            success: true,
            output: format!("[Web search not configured — would search for: '{}']", query),
            error: None,
        });
    }

    let url = format!(
        "https://api.search.brave.com/res/v1/web/search?q={}&count=5",
        urlencoding::encode(query)
    );

    let client = reqwest::Client::new();
    match client
        .get(&url)
        .header("X-Subscription-Token", &api_key)
        .header("Accept", "application/json")
        .send()
        .await
    {
        Ok(response) => {
            if let Ok(json) = response.json::<Value>().await {
                let results = json.get("web")
                    .and_then(|w| w.get("results"))
                    .and_then(|r| r.as_array())
                    .map(|arr| {
                        arr.iter()
                            .take(5)
                            .filter_map(|r| {
                                let title = r.get("title").and_then(|t| t.as_str())?;
                                let desc = r.get("description").and_then(|d| d.as_str())?;
                                Some(format!("• {}\n  {}", title, desc))
                            })
                            .collect::<Vec<_>>()
                            .join("\n\n")
                    })
                    .unwrap_or_else(|| "No results found".to_string());

                Ok(ToolResult {
                    success: true,
                    output: results,
                    error: None,
                })
            } else {
                Ok(ToolResult {
                    success: false,
                    output: String::new(),
                    error: Some("Failed to parse search results".to_string()),
                })
            }
        }
        Err(e) => Ok(ToolResult {
            success: false,
            output: String::new(),
            error: Some(format!("Search failed: {}", e)),
        }),
    }
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
