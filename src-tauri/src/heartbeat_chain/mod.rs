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
    let engine_ref = match crate::engine::try_get_engine() {
        Some(e) => e,
        None => {
            log::error!("[HeartbeatChain] Engine not initialized — cannot trigger test");
            return;
        }
    };
    let handle = match engine_ref.app_handle() {
        Some(h) => h,
        None => {
            log::error!("[HeartbeatChain] app_handle not set — engine init may have failed");
            return;
        }
    };
    let test_ms = chrono::Utc::now().timestamp_millis();
    log::info!("[HeartbeatChain] Test chain firing at {}", test_ms);
    chain::start_chain_for_beat(handle, test_ms);
}

#[tauri::command]
pub fn heartbeat_chain_update_config(config_json: String) -> Result<(), String> {
    #[derive(serde::Deserialize)]
    struct FrontendConfig {
        enabled: Option<bool>,
        agents: Option<Vec<String>>,
    }
    let frontend: FrontendConfig = serde_json::from_str(&config_json)
        .map_err(|e| format!("Invalid config JSON: {}", e))?;
    let mut config = config::load_config();
    if let Some(enabled) = frontend.enabled {
        config.config.enabled = enabled;
    }
    if let Some(agents) = frontend.agents {
        // Filter chain to only the agents the user enabled; preserve original delays/voice_ids
        config.chain = config
            .chain
            .into_iter()
            .filter(|step| agents.contains(&step.agent))
            .collect();
    }
    save_config(&config)?;
    log::info!(
        "[HeartbeatChain] Config updated (enabled={}, agents={:?})",
        config.config.enabled,
        config.chain.iter().map(|s| &s.agent).collect::<Vec<_>>()
    );
    Ok(())
}


