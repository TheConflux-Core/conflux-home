// Conflux Engine — Agent Runtime
// The reasoning loop: receive message → think → act → observe → respond.

use anyhow::Result;

use super::db::EngineDb;
use super::router;
use super::router::OpenAIMessage;

/// Process a chat turn for an agent: take user input, think, potentially call tools, respond.
pub async fn process_turn(
    db: &EngineDb,
    session_id: &str,
    agent_id: &str,
    user_message: &str,
    max_tokens: Option<i64>,
) -> Result<router::ModelResponse> {
    // 1. Load agent config
    let agent = db.get_agent(agent_id)?
        .ok_or_else(|| anyhow::anyhow!("Agent not found: {}", agent_id))?;

    // 2. Load recent conversation history (last 20 messages)
    let history = db.get_messages(session_id, 20)?;

    // 3. Load relevant memories
    let memories = db.search_memory(agent_id, user_message, 5)?;
    let memory_context = if !memories.is_empty() {
        let mem_lines: Vec<String> = memories.iter()
            .map(|m| format!("[{}] {}", m.memory_type, m.content))
            .collect();
        format!("\n\nRelevant memories:\n{}", mem_lines.join("\n"))
    } else {
        String::new()
    };

    // 4. Build the message array
    let mut messages: Vec<OpenAIMessage> = Vec::new();

    // System prompt: agent soul + instructions + memory
    let system_prompt = build_system_prompt(&agent, &memory_context);
    messages.push(OpenAIMessage {
        role: "system".to_string(),
        content: Some(system_prompt),
        tool_call_id: None,
        tool_calls: None,
    });

    // Conversation history
    for msg in &history {
        messages.push(OpenAIMessage {
            role: msg.role.clone(),
            content: Some(msg.content.clone()),
            tool_call_id: msg.tool_call_id.clone(),
            tool_calls: None,
        });
    }

    // Current user message
    messages.push(OpenAIMessage {
        role: "user".to_string(),
        content: Some(user_message.to_string()),
        tool_call_id: None,
        tool_calls: None,
    });

    // 5. Send to model via router
    let start = std::time::Instant::now();
    let response = router::chat(
        &agent.model_alias,
        messages,
        max_tokens,
        None,
    ).await?;
    let _latency = start.elapsed().as_millis() as i64;

    // 6. Store the user message
    db.add_message(session_id, "user", user_message, 0, None, None, None)?;

    // 7. Store the assistant response
    db.add_message(
        session_id,
        "assistant",
        &response.content,
        response.tokens_used,
        Some(&response.model),
        Some(&response.provider_id),
        Some(response.latency_ms),
    )?;

    // 8. Log telemetry
    let _ = db.log_event(
        "message_processed",
        Some(agent_id),
        Some(session_id),
        Some(&serde_json::json!({
            "model": response.model,
            "provider": response.provider_id,
            "tokens": response.tokens_used,
            "latency_ms": response.latency_ms,
        }).to_string()),
    );

    Ok(response)
}

/// Process a streaming chat turn.
pub async fn process_turn_stream(
    db: &EngineDb,
    session_id: &str,
    agent_id: &str,
    user_message: &str,
    max_tokens: Option<i64>,
    on_chunk: &mut dyn FnMut(&str) -> Result<()>,
) -> Result<router::ModelResponse> {
    // 1-4: Same as non-streaming
    let agent = db.get_agent(agent_id)?
        .ok_or_else(|| anyhow::anyhow!("Agent not found: {}", agent_id))?;

    let history = db.get_messages(session_id, 20)?;

    let memories = db.search_memory(agent_id, user_message, 5)?;
    let memory_context = if !memories.is_empty() {
        let mem_lines: Vec<String> = memories.iter()
            .map(|m| format!("[{}] {}", m.memory_type, m.content))
            .collect();
        format!("\n\nRelevant memories:\n{}", mem_lines.join("\n"))
    } else {
        String::new()
    };

    let mut messages: Vec<OpenAIMessage> = Vec::new();

    let system_prompt = build_system_prompt(&agent, &memory_context);
    messages.push(OpenAIMessage {
        role: "system".to_string(),
        content: Some(system_prompt),
        tool_call_id: None,
        tool_calls: None,
    });

    for msg in &history {
        messages.push(OpenAIMessage {
            role: msg.role.clone(),
            content: Some(msg.content.clone()),
            tool_call_id: msg.tool_call_id.clone(),
            tool_calls: None,
        });
    }

    messages.push(OpenAIMessage {
        role: "user".to_string(),
        content: Some(user_message.to_string()),
        tool_call_id: None,
        tool_calls: None,
    });

    // 5. Store user message before streaming
    db.add_message(session_id, "user", user_message, 0, None, None, None)?;

    // 6. Stream the response
    let response = router::chat_stream(
        &agent.model_alias,
        messages,
        max_tokens,
        on_chunk,
    ).await?;

    // 7. Store assistant response after streaming completes
    db.add_message(
        session_id,
        "assistant",
        &response.content,
        response.tokens_used,
        Some(&response.model),
        Some(&response.provider_id),
        Some(response.latency_ms),
    )?;

    Ok(response)
}

/// Build the system prompt for an agent.
fn build_system_prompt(
    agent: &super::types::Agent,
    memory_context: &str,
) -> String {
    let mut prompt = String::new();

    // Agent identity
    prompt.push_str(&format!(
        "You are {}, {}.\n\n",
        agent.name, agent.role
    ));

    // Soul (personality)
    if let Some(soul) = &agent.soul {
        prompt.push_str(&format!("Your personality:\n{}\n\n", soul));
    }

    // Instructions
    if let Some(instructions) = &agent.instructions {
        prompt.push_str(&format!("Your instructions:\n{}\n\n", instructions));
    }

    // Memory context
    if !memory_context.is_empty() {
        prompt.push_str(memory_context);
        prompt.push('\n');
    }

    // Default behavior
    prompt.push_str("\nBe helpful, concise, and in-character. If you don't know something, say so honestly.");

    prompt
}
