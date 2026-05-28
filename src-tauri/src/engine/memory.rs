// Conflux Engine — Memory Extraction
// After each conversation turn, analyzes the exchange and stores facts/preferences.
// Uses a lightweight LLM call to extract structured memories.

use anyhow::Result;
use serde::Deserialize;

use super::db::EngineDb;
use super::router;

/// Extract JSON from LLM responses that may contain thinking text or tags.
/// Handles: <think>...> blocks, plain chain-of-thought, markdown code fences, etc.
fn extract_json(text: &str) -> Option<String> {
    let mut s = text.to_string();

    // 1. Strip complete <think>...` blocks
    while let Some(start) = s.find("<think>") {
        if let Some(end) = s[start..].find("</think>") {
            s.replace_range(start..start + end + 9, "");
        } else {
            // Unclosed — everything from here is thinking
            s.truncate(start);
            break;
        }
    }

    // 2. Strip markdown code fences (```json ... ``` or ``` ... ```)
    if let Some(start) = s.find("```") {
        let after = &s[start + 3..];
        // Skip optional language tag
        let after = after.trim_start_matches("json").trim_start_matches("JSON");
        if let Some(end) = after.find("```") {
            s = after[..end].to_string();
        }
    }

    // 3. Find the JSON object — first { to last }
    let trimmed = s.trim();
    let start = trimmed.find('{')?;
    let end = trimmed.rfind('}')?;
    if end <= start {
        return None;
    }
    let candidate = &trimmed[start..=end];
    Some(candidate.to_string())
}

#[derive(Debug, Deserialize)]
struct ExtractedMemories {
    memories: Vec<ExtractedMemory>,
}

#[derive(Debug, Deserialize)]
struct ExtractedMemory {
    #[serde(rename = "type")]
    memory_type: String, // "fact", "preference", "correction", "knowledge"
    key: Option<String>,
    content: String,
    confidence: Option<f64>,
}

const EXTRACTION_PROMPT: &str = r#"Analyze this conversation and extract memories worth storing about the user or the context.

Return a JSON object with a "memories" array. Each memory has:
- "type": one of "fact", "preference", "correction", "knowledge"
- "key": a short searchable label (e.g., "user_name", "project_name", "timezone") — optional
- "content": the full memory text
- "confidence": 0.0 to 1.0

Rules:
- Only extract NEW information not already obvious
- Facts: "User's name is Don", "Project is called Conflux Home"
- Preferences: "Prefers direct answers", "Works late at night"  
- Corrections: "User corrected that the project started in March, not February"
- Knowledge: domain facts the user shared
- If nothing notable, return {"memories": []}
- Be conservative — don't extract trivial exchanges

Return ONLY the JSON object, no other text."#;

/// Extract memories from a conversation exchange and store them in the database.
/// Called after `process_turn` completes.
pub async fn extract_and_store(
    db: &EngineDb,
    session_id: &str,
    agent_id: &str,
    user_message: &str,
    assistant_response: &str,
) -> Result<()> {
    // Build the extraction prompt
    let conversation = format!(
        "User: {}\n\nAssistant: {}",
        user_message, assistant_response
    );

    let messages = vec![
        router::OpenAIMessage {
            role: "system".to_string(),
            content: Some(EXTRACTION_PROMPT.to_string()),
            tool_call_id: None,
            tool_calls: None,
        },
        router::OpenAIMessage {
            role: "user".to_string(),
            content: Some(conversation),
            tool_call_id: None,
            tool_calls: None,
        },
    ];

    // Use fast model for extraction (cheap + fast)
    let response = router::chat(
        "conflux-fast",
        messages,
        Some(500),
        Some(0.0), // low temperature for consistency
        None,      // no tools needed
    )
    .await?;

    // Parse the response — extract JSON from thinking text, tags, code fences
    let json_str = extract_json(&response.content);
    let extracted: ExtractedMemories = match json_str
        .as_ref()
        .and_then(|j| serde_json::from_str(j).ok())
    {
        Some(e) => e,
        None => {
            log::warn!(
                "[Memory] Failed to extract JSON from response — raw: {}",
                &response.content[..response.content.len().min(200)]
            );
            return Ok(()); // Don't fail the conversation for extraction errors
        }
    };

    // Store each memory
    for mem in extracted.memories {
        // Check for duplicates (same key + agent)
        if let Some(key) = &mem.key {
            if let Ok(Some(existing)) = db.get_memory_by_key(agent_id, key) {
                // Update if content changed
                if existing.content != mem.content {
                    log::info!(
                        "[Memory] Updating existing memory: {} = {}",
                        key,
                        mem.content
                    );
                    // Delete old, insert new
                    let _ = db.delete_memory(&existing.id);
                } else {
                    // Duplicate, skip
                    continue;
                }
            }
        }

        let id = db.store_memory(
            agent_id,
            &mem.memory_type,
            mem.key.as_deref(),
            &mem.content,
            Some(&format!("session:{}", session_id)),
        )?;

        // Set confidence if provided
        if let Some(conf) = mem.confidence {
            let _ = db.set_memory_confidence(&id, conf);
        }

        log::info!(
            "[Memory] Stored: [{}] {} = {}",
            mem.memory_type,
            mem.key.as_deref().unwrap_or("-"),
            &mem.content[..mem.content.len().min(100)]
        );
    }

    // Log telemetry
    let _ = db.log_event(
        "memory_extracted",
        Some(agent_id),
        Some(session_id),
        Some(
            &serde_json::json!({
                "user_msg_len": user_message.len(),
                "assistant_msg_len": assistant_response.len(),
            })
            .to_string(),
        ),
    );

    Ok(())
}

// ── Heartbeat Memory Extraction ──

/// Lightweight heartbeat memory extraction — no LLM call needed.
/// Analyzes the agent's heartbeat response and stores noteworthy findings
/// as memories with a 7-day expiry.
///
/// Returns true if a memory was stored, false if the response was routine.
pub fn extract_heartbeat_finding(
    db: &EngineDb,
    agent_id: &str,
    action: &str,
    response: &str,
    tools_used: &[String],
) -> bool {
    let lower = response.to_lowercase();

    // Determine if this response is worth remembering
    let is_warning = lower.contains("⚠️")
        || lower.contains("alert")
        || lower.contains("attention")
        || lower.contains("at risk")
        || lower.contains("overdue")
        || lower.contains("expiring")
        || lower.contains("warning")
        || lower.contains("critical")
        || lower.contains("urgent")
        || lower.contains("over budget")
        || lower.contains("behind");

    let has_data = response.len() > 100
        && (lower.contains("$")
            || lower.contains("task")
            || lower.contains("goal")
            || lower.contains("milestone")
            || lower.contains("streak")
            || lower.contains("inventory")
            || lower.contains("port")
            || lower.contains("process")
            || lower.contains("stock")
            || lower.contains("index")
            || lower.contains("budget")
            || lower.contains("spending")
            || lower.contains("habit"));

    let is_noteworthy = is_warning || has_data;

    if !is_noteworthy {
        return false;
    }

    // Determine memory type and key
    let (memory_type, key) = if is_warning {
        (
            "heartbeat-alert",
            Some(format!("heartbeat-alert-{}-{}", agent_id, chrono::Utc::now().format("%Y%m%d%H"))),
        )
    } else {
        (
            "heartbeat-finding",
            Some(format!("heartbeat-{}-{}", agent_id, chrono::Utc::now().format("%Y%m%d%H"))),
        )
    };

    // Truncate content to a reasonable memory size (first 500 chars)
    let content = if response.len() > 500 {
        let end = response.char_indices().nth(500).map(|(i, _)| i).unwrap_or(response.len());
        format!("{}...", &response[..end])
    } else {
        response.to_string()
    };

    // Source tag: heartbeat:<agent_id>:<action>
    let source = format!("heartbeat:{}:{}", agent_id, action);

    // Expiry: 7 days from now
    let expires_at = (chrono::Utc::now() + chrono::Duration::days(7)).format("%Y-%m-%dT%H:%M:%SZ").to_string();

    // Store with expiry
    match db.store_memory_with_expiry(
        agent_id,
        memory_type,
        key.as_deref(),
        &content,
        Some(&source),
        &expires_at,
    ) {
        Ok(id) => {
            log::info!(
                "[HeartbeatMemory] Stored {} for {}: {} (tools: {:?})",
                memory_type,
                agent_id,
                &content[..content.len().min(100)],
                tools_used
            );
            true
        }
        Err(e) => {
            log::warn!("[HeartbeatMemory] Failed to store memory for {}: {}", agent_id, e);
            false
        }
    }
}
