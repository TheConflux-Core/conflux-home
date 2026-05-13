// Heartbeat Chain — Public API Module
// Exposes Tauri commands and the start_chain_for_beat entry point.

pub mod chain;
pub mod config;
pub mod state;

pub use chain::{start_chain_for_beat, stop_chain, get_state, CurrentChainState};
pub use config::{load_config, save_config, is_enabled, HeartbeatChainConfig, ChainStep};
pub use state::ChainState;

use tauri::{AppHandle, Emitter};

/// Start the heartbeat chain for the current beat.
/// Called from lib.rs when the CronScheduler fires a heartbeat tick.
pub fn trigger_chain(app_handle: AppHandle) {
    let now_ms = chrono::Utc::now().timestamp_millis();
    chain::start_chain_for_beat(app_handle, now_ms);
}

// ── Tauri Commands ──────────────────────────────────────────────────────────────

#[tauri::command]
pub fn heartbeat_chain_start() {
    // Called by frontend to explicitly start a chain (e.g. on reconnect)
    if let Some(engine_ref) = crate::engine::try_get_engine() {
        if let Some(handle) = engine_ref.app_handle() {
            trigger_chain(handle);
        }
    }
}

#[tauri::command]
pub fn heartbeat_chain_stop() {
    chain::stop_chain();
}

#[tauri::command]
pub fn heartbeat_chain_get_state() -> CurrentChainState {
    chain::get_state()
}

#[tauri::command]
pub fn heartbeat_chain_trigger_test() {
    // Fire the full chain immediately (for testing)
    if let Some(engine_ref) = crate::engine::try_get_engine() {
        if let Some(handle) = engine_ref.app_handle() {
            let test_ms = chrono::Utc::now().timestamp_millis();
            chain::start_chain_for_beat(handle, test_ms);
        }
    }
    log::info!("[HeartbeatChain] Test chain triggered");
}

#[tauri::command]
pub fn heartbeat_chain_update_config(config_json: String) -> Result<(), String> {
    let config: HeartbeatChainConfig = serde_json::from_str(&config_json)
        .map_err(|e| format!("Invalid config JSON: {}", e))?;
    save_config(&config)?;
    log::info!("[HeartbeatChain] Config updated");
    Ok(())
}

// Extension trait to expose app_handle from ConfluxEngine
pub trait EngineAppHandle {
    fn app_handle(&self) -> Option<tauri::AppHandle>;
}

impl EngineAppHandle for crate::engine::ConfluxEngine {
    fn app_handle(&self) -> Option<tauri::AppHandle> {
        crate::engine::ConfluxEngine::app_handle(self)
    }
}
