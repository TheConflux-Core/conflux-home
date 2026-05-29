// Heartbeat Chain — Public API Module
// Exposes Tauri commands and the start_chain_for_beat entry point.

pub mod chain;
pub mod config;
pub mod state;

pub use chain::{start_chain_for_beat, stop_chain, get_state, CurrentChainState};
pub use config::{load_config, save_config, is_enabled, HeartbeatChainConfig, ChainStep};
pub use state::ChainState;

use tauri::AppHandle;

/// Reset stale chain state on app startup.
/// Call this during setup to clear any interrupted chains from previous runs.
pub fn reset_stale_state() {
    let mut state = ChainState::load();
    state.reset_on_startup();
}

/// Start the heartbeat chain for the current beat.
/// Called from lib.rs when the CronScheduler fires a heartbeat tick.
pub fn trigger_chain(app_handle: AppHandle) {
    let now_ms = chrono::Utc::now().timestamp_millis();
    log::info!("[HeartbeatChain] trigger_chain called at {}", now_ms);
    chain::start_chain_for_beat(app_handle, now_ms);
    log::info!("[HeartbeatChain] trigger_chain returned");
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

/// Frontend config payload — matches what HeartbeatChainSettings sends.
#[derive(serde::Deserialize)]
pub struct FrontendConfig {
    enabled: Option<bool>,
    agents: Option<Vec<String>>,
}

#[tauri::command]
pub fn heartbeat_chain_update_config(config: FrontendConfig) -> Result<(), String> {
    let mut chain_config = config::load_config();
    if let Some(enabled) = config.enabled {
        chain_config.config.enabled = enabled;
    }
    if let Some(agents) = config.agents {
        // Filter chain to only the agents the user enabled; preserve original delays/voice_ids
        chain_config.chain = chain_config
            .chain
            .into_iter()
            .filter(|step| agents.contains(&step.agent))
            .collect();
    }
    save_config(&chain_config)?;
    log::info!(
        "[HeartbeatChain] Config updated (enabled={}, agents={:?})",
        chain_config.config.enabled,
        chain_config.chain.iter().map(|s| &s.agent).collect::<Vec<_>>()
    );
    Ok(())
}


