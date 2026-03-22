// Conflux Engine — Agent Runtime
// The reasoning loop: receive message → think → act → observe → respond.
// Includes tool calling loop with up to 3 iterations.

use anyhow::Result;
use serde_json::Value;

use super::db::EngineDb;
use super::router;
use super::router::OpenAIMessage;
use super::tools;

const MAX_TOOL_ITERATIONS: usize = 3;

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

    // Conversation history (including any prior tool calls/results)
    for msg in &history {
        messages.push(OpenAIMessage {
            role: msg.role.clone(),
            content: if msg.content.is_empty() { None } else { Some(msg.content.clone()) },
            tool_call_id: msg.tool_call_id.clone(),
            tool_calls: None, // Historical tool calls are in the content
        });
    }

    // Current user message
    messages.push(OpenAIMessage {
        role: "user".to_string(),
        content: Some(user_message.to_string()),
        tool_call_id: None,
        tool_calls: None,
    });

    // 5. Store the user message
    db.add_message(session_id, "user", user_message, 0, None, None, None)?;

    // 6. Get tool definitions
    let tool_defs = tools::get_tool_definitions();

    // 7. Tool calling loop
    let mut total_tokens: i64 = 0;
    let mut final_response: Option<router::ModelResponse> = None;

    for iteration in 0..MAX_TOOL_ITERATIONS {
        let response = router::chat(
            &agent.model_alias,
            messages.clone(),
            max_tokens,
            None,
            if iteration == 0 || !tool_defs.is_empty() { Some(tool_defs.clone()) } else { None },
        ).await?;

        total_tokens += response.tokens_used;

        // If no tool calls, we're done
        if response.tool_calls.is_empty() {
            final_response = Some(response);
            break;
        }

        // Execute tool calls
        for tool_call in &response.tool_calls {
            log::info!("[Engine] Tool call: {}({})", tool_call.name, tool_call.arguments);

            // Parse arguments
            let args: Value = serde_json::from_str(&tool_call.arguments)
                .unwrap_or_else(|_| serde_json::json!({}));

            // Execute the tool
            let tool_result = tools::execute_tool(&tool_call.name, &args).await?;

            let result_content = if tool_result.success {
                tool_result.output.clone()
            } else {
                format!("Error: {}", tool_result.error.unwrap_or_else(|| "Unknown error".to_string()))
            };

            // Add assistant message with tool_calls to conversation
            messages.push(OpenAIMessage {
                role: "assistant".to_string(),
                content: response.content.clone().into(),
                tool_call_id: None,
                tool_calls: Some(vec![serde_json::json!({
                    "id": tool_call.id,
                    "type": "function",
                    "function": {
                        "name": tool_call.name,
                        "arguments": tool_call.arguments,
                    }
                })]),
            });

            // Add tool result message
            messages.push(OpenAIMessage {
                role: "tool".to_string(),
                content: Some(result_content.clone()),
                tool_call_id: Some(tool_call.id.clone()),
                tool_calls: None,
            });

            // Store tool call and result in DB
            db.add_message_with_tools(
                session_id,
                "tool",
                &result_content,
                0,
                None,
                None,
                None,
                Some(&tool_call.id),
                Some(&tool_call.name),
                Some(&tool_call.arguments),
                Some(&result_content),
            )?;

            log::info!("[Engine] Tool result: {}", &result_content[..result_content.len().min(200)]);
        }

        // If this was the last iteration, force no tools
        if iteration == MAX_TOOL_ITERATIONS - 1 {
            let final_resp = router::chat(
                &agent.model_alias,
                messages.clone(),
                max_tokens,
                None,
                None, // No tools on final pass
            ).await?;
            total_tokens += final_resp.tokens_used;
            final_response = Some(final_resp);
        }
    }

    let response = final_response.expect("Tool loop should always produce a final response");

    // 8. Store the assistant response
    db.add_message(
        session_id,
        "assistant",
        &response.content,
        response.tokens_used,
        Some(&response.model),
        Some(&response.provider_id),
        Some(response.latency_ms),
    )?;

    // 9. Log telemetry
    let _ = db.log_event(
        "message_processed",
        Some(agent_id),
        Some(session_id),
        Some(&serde_json::json!({
            "model": response.model,
            "provider": response.provider_id,
            "tokens": total_tokens,
            "latency_ms": response.latency_ms,
            "tool_calls": response.tool_calls.len(),
        }).to_string()),
    );

    Ok(response)
}

/// Process a streaming chat turn with tool calling support.
/// For tool calls, uses non-streaming (reliable JSON capture).
/// Streams the final text response via on_chunk callback.
pub async fn process_turn_stream(
    db: &EngineDb,
    session_id: &str,
    agent_id: &str,
    user_message: &str,
    max_tokens: Option<i64>,
    on_chunk: &mut dyn FnMut(&str) -> Result<()>,
) -> Result<router::ModelResponse> {
    // 1. Load agent config
    let agent = db.get_agent(agent_id)?
        .ok_or_else(|| anyhow::anyhow!("Agent not found: {}", agent_id))?;

    // 2. Load recent conversation history
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

    // 4. Build messages
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
            content: if msg.content.is_empty() { None } else { Some(msg.content.clone()) },
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

    // 6. Get tool definitions
    let tool_defs = tools::get_tool_definitions();

    // 7. Tool calling loop (non-streaming for tool detection, streaming for final text)
    let mut final_response: Option<router::ModelResponse> = None;

    for iteration in 0..MAX_TOOL_ITERATIONS {
        let is_final_pass = iteration == MAX_TOOL_ITERATIONS - 1;

        // For intermediate passes, use non-streaming to reliably capture tool_calls
        let response = router::chat(
            &agent.model_alias,
            messages.clone(),
            max_tokens,
            None,
            Some(tool_defs.clone()),
        ).await?;

        // If no tool calls, stream the final response
        if response.tool_calls.is_empty() {
            // If this is the first iteration with no tools, we can stream the response
            // But since we already got it non-streaming, just emit it as chunks
            on_chunk(&response.content)?;
            final_response = Some(response);
            break;
        }

        // Execute tool calls
        for tool_call in &response.tool_calls {
            log::info!("[Engine/Stream] Tool call: {}({})", tool_call.name, tool_call.arguments);

            let args: Value = serde_json::from_str(&tool_call.arguments)
                .unwrap_or_else(|_| serde_json::json!({}));

            let tool_result = tools::execute_tool(&tool_call.name, &args).await?;

            let result_content = if tool_result.success {
                tool_result.output.clone()
            } else {
                format!("Error: {}", tool_result.error.unwrap_or_else(|| "Unknown error".to_string()))
            };

            // Notify the frontend about the tool call
            on_chunk(&format!("\n🔧 *{}*\n{}\n", tool_call.name, &result_content[..result_content.len().min(500)]))?;

            // Add assistant message with tool_calls
            messages.push(OpenAIMessage {
                role: "assistant".to_string(),
                content: response.content.clone().into(),
                tool_call_id: None,
                tool_calls: Some(vec![serde_json::json!({
                    "id": tool_call.id,
                    "type": "function",
                    "function": {
                        "name": tool_call.name,
                        "arguments": tool_call.arguments,
                    }
                })]),
            });

            // Add tool result
            messages.push(OpenAIMessage {
                role: "tool".to_string(),
                content: Some(result_content.clone()),
                tool_call_id: Some(tool_call.id.clone()),
                tool_calls: None,
            });

            // Store in DB
            db.add_message_with_tools(
                session_id,
                "tool",
                &result_content,
                0,
                None,
                None,
                None,
                Some(&tool_call.id),
                Some(&tool_call.name),
                Some(&tool_call.arguments),
                Some(&result_content),
            )?;
        }

        // Last iteration — force no tools, get final text
        if is_final_pass {
            let final_resp = router::chat(
                &agent.model_alias,
                messages.clone(),
                max_tokens,
                None,
                None,
            ).await?;
            on_chunk(&final_resp.content)?;
            final_response = Some(final_resp);
        }
    }

    let response = final_response.expect("Tool loop should always produce a final response");

    // 8. Store assistant response
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

    // Tool usage instructions
    prompt.push_str("\nYou have access to tools. Use them when they would help you answer accurately. ");
    prompt.push_str("Always prefer searching the web for current information rather than guessing. ");
    prompt.push_str("Use the calculator for math. Use file tools to read/write when asked.\n");
    prompt.push_str("\nBe helpful, concise, and in-character. If you don't know something, say so honestly.");

    prompt
}
