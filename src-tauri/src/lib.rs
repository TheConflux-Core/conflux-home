// Conflux Home — Tauri Entry Point
// Initializes the Conflux Engine and exposes commands to the frontend.

mod engine;

use std::sync::OnceLock;
use tauri::Manager;
use serde::{Deserialize, Serialize};

// ── Global Engine Instance ──

static ENGINE: OnceLock<engine::ConfluxEngine> = OnceLock::new();

fn get_engine() -> &'static engine::ConfluxEngine {
    ENGINE.get().expect("Conflux Engine not initialized")
}

// ── Tauri Commands ──

#[derive(Debug, Serialize, Deserialize)]
struct ChatRequest {
    session_id: String,
    agent_id: String,
    message: String,
    max_tokens: Option<i64>,
}

#[derive(Debug, Serialize)]
struct ChatResponse {
    content: String,
    model: String,
    provider_id: String,
    provider_name: String,
    tokens_used: i64,
    latency_ms: i64,
    calls_remaining: i64,
}

#[tauri::command]
async fn engine_chat(req: ChatRequest) -> Result<ChatResponse, String> {
    let engine = get_engine();

    // Check quota
    if !engine.has_quota("default").map_err(|e| e.to_string())? {
        return Err("Daily free limit reached. Upgrade to Pro for unlimited calls.".to_string());
    }

    // Process the turn
    let response = engine.chat(
        &req.session_id,
        &req.agent_id,
        &req.message,
        req.max_tokens,
    ).await.map_err(|e| e.to_string())?;

    // Increment quota
    let calls = engine.increment_quota("default", response.tokens_used, &response.provider_id)
        .map_err(|e| e.to_string())?;

    let limit: i64 = engine.db().get_config("free_daily_limit")
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "50".to_string())
        .parse()
        .unwrap_or(50);

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
fn engine_create_session(agent_id: String) -> Result<serde_json::Value, String> {
    let engine = get_engine();
    let session = engine.create_session(&agent_id, "default").map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(session).map_err(|e| e.to_string())?)
}

#[tauri::command]
fn engine_get_sessions(limit: Option<i64>) -> Result<serde_json::Value, String> {
    let engine = get_engine();
    let sessions = engine.get_sessions(limit.unwrap_or(20)).map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(sessions).map_err(|e| e.to_string())?)
}

#[tauri::command]
fn engine_get_messages(session_id: String, limit: Option<i64>) -> Result<serde_json::Value, String> {
    let engine = get_engine();
    let messages = engine.get_messages(&session_id, limit.unwrap_or(50)).map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(messages).map_err(|e| e.to_string())?)
}

#[tauri::command]
fn engine_get_agents() -> Result<serde_json::Value, String> {
    let engine = get_engine();
    let agents = engine.get_agents().map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(agents).map_err(|e| e.to_string())?)
}

#[tauri::command]
fn engine_get_quota() -> Result<serde_json::Value, String> {
    let engine = get_engine();
    let quota = engine.get_quota("default").map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(quota).map_err(|e| e.to_string())?)
}

#[tauri::command]
fn engine_store_memory(
    agent_id: String,
    memory_type: String,
    key: Option<String>,
    content: String,
    source: Option<String>,
) -> Result<String, String> {
    let engine = get_engine();
    engine.store_memory(
        &agent_id,
        &memory_type,
        key.as_deref(),
        &content,
        source.as_deref(),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
fn engine_search_memory(agent_id: String, query: String, limit: Option<i64>) -> Result<serde_json::Value, String> {
    let engine = get_engine();
    let memories = engine.search_memory(&agent_id, &query, limit.unwrap_or(5)).map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(memories).map_err(|e| e.to_string())?)
}

#[tauri::command]
fn engine_health() -> Result<serde_json::Value, String> {
    let engine = get_engine();
    let agents = engine.get_agents().map_err(|e| e.to_string())?;
    let quota = engine.get_quota("default").map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "status": "healthy",
        "version": "1.0.0",
        "agents_count": agents.len(),
        "calls_today": quota.calls_used,
    }))
}

// ── App Setup ──

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            // Initialize the Conflux Engine
            let app_data_dir = app.path().app_data_dir()
                .expect("Failed to get app data directory");

            std::fs::create_dir_all(&app_data_dir)
                .expect("Failed to create app data directory");

            let db_path = app_data_dir.join("conflux.db");
            let engine = engine::ConfluxEngine::new(&db_path)
                .expect("Failed to initialize Conflux Engine");

            ENGINE.set(engine)
                .expect("Failed to set global engine");

            log::info!("Conflux Engine initialized at {:?}", db_path);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            engine_chat,
            engine_create_session,
            engine_get_sessions,
            engine_get_messages,
            engine_get_agents,
            engine_get_quota,
            engine_store_memory,
            engine_search_memory,
            engine_health,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
