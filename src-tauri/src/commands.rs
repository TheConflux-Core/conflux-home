// Conflux Engine — Tauri Commands
// All invoke() handlers live here. Lib.rs stays clean.

use tauri::{Manager, Emitter};
use serde::{Deserialize, Serialize};
use super::engine;

// ── Request/Response Types ──

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatRequest {
    pub session_id: String,
    pub agent_id: String,
    pub message: String,
    pub max_tokens: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct ChatResponse {
    pub content: String,
    pub model: String,
    pub provider_id: String,
    pub provider_name: String,
    pub tokens_used: i64,
    pub latency_ms: i64,
    pub calls_remaining: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub id: String,
    pub name: String,
    pub base_url: String,
    pub api_key: String,
    pub model_id: String,
    pub model_alias: String,
    pub priority: i32,
    pub is_enabled: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentUpdateRequest {
    pub id: String,
    pub name: Option<String>,
    pub emoji: Option<String>,
    pub role: Option<String>,
    pub soul: Option<String>,
    pub instructions: Option<String>,
    pub model_alias: Option<String>,
}

// ── Chat Commands ──

#[tauri::command]
pub async fn engine_chat(window: tauri::Window, req: ChatRequest) -> Result<ChatResponse, String> {
    let engine = engine::get_engine();

    if !engine.has_quota("default").map_err(|e| e.to_string())? {
        return Err("Daily free limit reached. Upgrade to Pro for unlimited calls.".to_string());
    }

    let _ = window.emit("engine:thinking", ());

    let response = engine.chat(
        &req.session_id,
        &req.agent_id,
        &req.message,
        req.max_tokens,
    ).await.map_err(|e| e.to_string())?;

    let calls = engine.increment_quota("default", response.tokens_used, &response.provider_id)
        .map_err(|e| e.to_string())?;

    let limit = get_daily_limit(engine);

    Ok(ChatResponse {
        content: response.content,
        model: response.model,
        provider_id: response.provider_id,
        provider_name: response.provider_name,
        tokens_used: response.tokens_used,
        latency_ms: response.latency_ms,
        calls_remaining: (limit - calls).max(0),
    })
}

#[tauri::command]
pub async fn engine_chat_stream(window: tauri::Window, req: ChatRequest) -> Result<(), String> {
    let engine = engine::get_engine();

    if !engine.has_quota("default").map_err(|e| e.to_string())? {
        window.emit("engine:error", "Daily free limit reached. Upgrade to Pro for unlimited calls.")
            .map_err(|e| e.to_string())?;
        return Err("Daily free limit reached.".to_string());
    }

    let _ = window.emit("engine:thinking", ());

    let result = engine.chat(
        &req.session_id,
        &req.agent_id,
        &req.message,
        req.max_tokens,
    ).await;

    match result {
        Ok(response) => {
            let calls = engine.increment_quota("default", response.tokens_used, &response.provider_id)
                .map_err(|e| e.to_string())?;

            let limit = get_daily_limit(engine);

            // Emit response in word-chunks for streaming feel
            let words: Vec<&str> = response.content.split_whitespace().collect();
            for chunk in words.chunks(4) {
                let chunk_text = chunk.join(" ") + " ";
                let _ = window.emit("engine:chunk", serde_json::json!({ "text": chunk_text }));
                tokio::time::sleep(std::time::Duration::from_millis(20)).await;
            }

            window.emit("engine:done", serde_json::json!({
                "content": response.content,
                "model": response.model,
                "provider_id": response.provider_id,
                "provider_name": response.provider_name,
                "tokens_used": response.tokens_used,
                "latency_ms": response.latency_ms,
                "calls_remaining": (limit - calls).max(0),
            })).map_err(|e| e.to_string())?;

            Ok(())
        }
        Err(e) => {
            let msg = e.to_string();
            window.emit("engine:error", &msg).map_err(|e| e.to_string())?;
            Err(msg)
        }
    }
}

// ── Session Commands ──

#[tauri::command]
pub fn engine_create_session(agent_id: String) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let session = engine.create_session(&agent_id, "default").map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(session).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn engine_get_sessions(limit: Option<i64>) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let sessions = engine.get_sessions(limit.unwrap_or(20)).map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(sessions).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn engine_get_messages(session_id: String, limit: Option<i64>) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let messages = engine.get_messages(&session_id, limit.unwrap_or(50)).map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(messages).map_err(|e| e.to_string())?)
}

// ── Agent Commands ──

#[tauri::command]
pub fn engine_get_agents() -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let agents = engine.get_agents().map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(agents).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn engine_update_agent(req: AgentUpdateRequest) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.update_agent(
        &req.id,
        req.name.as_deref(),
        req.emoji.as_deref(),
        req.role.as_deref(),
        req.soul.as_deref(),
        req.instructions.as_deref(),
        req.model_alias.as_deref(),
    ).map_err(|e| e.to_string())
}

// ── Quota Commands ──

#[tauri::command]
pub fn engine_get_quota() -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let quota = engine.get_quota("default").map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(quota).map_err(|e| e.to_string())?)
}

// ── Memory Commands ──

#[tauri::command]
pub fn engine_store_memory(
    agent_id: String,
    memory_type: String,
    key: Option<String>,
    content: String,
    source: Option<String>,
) -> Result<String, String> {
    let engine = engine::get_engine();
    engine.store_memory(
        &agent_id,
        &memory_type,
        key.as_deref(),
        &content,
        source.as_deref(),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_search_memory(agent_id: String, query: String, limit: Option<i64>) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let memories = engine.search_memory(&agent_id, &query, limit.unwrap_or(5)).map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(memories).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn engine_get_memories(agent_id: String, limit: Option<i64>) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let memories = engine.get_all_memories(&agent_id, limit.unwrap_or(50)).map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(memories).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn engine_delete_memory(memory_id: String) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.delete_memory(&memory_id).map_err(|e| e.to_string())
}

// ── Provider Commands ──

#[tauri::command]
pub fn engine_get_providers() -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let providers = engine.get_providers().map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(providers).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn engine_update_provider(req: ProviderConfig) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.update_provider(
        &req.id,
        &req.name,
        &req.base_url,
        &req.api_key,
        &req.model_id,
        &req.model_alias,
        req.priority,
        req.is_enabled,
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_delete_provider(id: String) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.delete_provider(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_test_provider(id: String) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let result = engine.test_provider(&id);
    match result {
        Ok(info) => Ok(serde_json::json!({
            "success": true,
            "model": info.model,
            "latency_ms": info.latency_ms,
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "error": e.to_string(),
        })),
    }
}

// ── Google Commands ──

#[tauri::command]
pub fn engine_google_is_connected() -> Result<bool, String> {
    let engine = engine::get_engine();
    engine::google::is_connected(engine.db()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_google_get_email() -> Result<String, String> {
    let engine = engine::get_engine();
    engine.db().get_config("google_email")
        .map_err(|e| e.to_string())
        .map(|v| v.unwrap_or_default())
}

#[tauri::command]
pub fn engine_google_auth_url() -> Result<String, String> {
    let engine = engine::get_engine();
    engine::google::get_auth_url(engine.db()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_google_connect() -> Result<String, String> {
    let engine = engine::get_engine();
    // Open browser
    let url = engine::google::get_auth_url(engine.db()).map_err(|e| e.to_string())?;
    let _ = open::that(&url);

    // Block waiting for callback
    let tokens = engine::google::handle_oauth_callback(engine.db()).map_err(|e| e.to_string())?;

    Ok(tokens.email.unwrap_or_else(|| "Connected".to_string()))
}

#[tauri::command]
pub fn engine_google_disconnect() -> Result<(), String> {
    let engine = engine::get_engine();
    engine::google::disconnect(engine.db()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_google_set_credentials(client_id: String, client_secret: String) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.db().set_config("google_client_id", &client_id).map_err(|e| e.to_string())?;
    engine.db().set_config("google_client_secret", &client_secret).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn engine_google_get_credentials() -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let client_id = engine.db().get_config("google_client_id").map_err(|e| e.to_string())?.unwrap_or_default();
    let client_secret = engine.db().get_config("google_client_secret").map_err(|e| e.to_string())?.unwrap_or_default();
    Ok(serde_json::json!({
        "client_id": client_id,
        "client_secret": client_secret,
        "has_credentials": !client_id.is_empty() && !client_secret.is_empty(),
    }))
}

// ── Health ──

#[tauri::command]
pub fn engine_health() -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let agents = engine.get_agents().map_err(|e| e.to_string())?;
    let quota = engine.get_quota("default").map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "status": "healthy",
        "version": "1.0.0",
        "agents_count": agents.len(),
        "calls_today": quota.calls_used,
    }))
}

// ── Helpers ──

fn get_daily_limit(engine: &engine::ConfluxEngine) -> i64 {
    engine.db().get_config("free_daily_limit")
        .ok()
        .flatten()
        .unwrap_or_else(|| "50".to_string())
        .parse()
        .unwrap_or(50)
}
