// Heartbeat Chain — Chain State Persistence
// Lightweight state file for tracking chain progress.
// Per spec: no mid-chain resume — restart on app reopen.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ChainState {
    /// Wall clock ms when the last heartbeat beat fired.
    #[serde(rename = "lastBeatAt")]
    pub last_beat_at: Option<i64>,
    /// Wall clock ms when the current chain started (if running).
    #[serde(rename = "chainFiredAt")]
    pub chain_fired_at: Option<i64>,
    /// Next scheduled beat wall-clock ms.
    #[serde(rename = "nextBeatAt")]
    pub next_beat_at: Option<i64>,
    /// True if a chain is currently in-flight.
    #[serde(rename = "chainActive")]
    pub chain_active: bool,
    /// Current step index (0-based) during chain execution.
    #[serde(rename = "currentStep", default)]
    pub current_step: Option<u32>,
    /// Total steps in the chain.
    #[serde(rename = "totalSteps", default)]
    pub total_steps: Option<u32>,
}

impl ChainState {
    pub fn new() -> Self {
        Self::default()
    }

    /// Mark chain as started.
    pub fn start_chain(&mut self) {
        self.chain_fired_at = Some(chrono::Utc::now().timestamp_millis());
        self.chain_active = true;
        self.current_step = Some(0);
    }

    /// Mark chain as complete (or stopped).
    pub fn end_chain(&mut self) {
        self.chain_active = false;
        self.current_step = None;
    }

    /// Reset stale state on app startup — clears interrupted chains.
    pub fn reset_on_startup(&mut self) {
        if self.chain_active {
            log::info!(
                "[HeartbeatChain] Clearing stale chain state (was stuck at step {:?})",
                self.current_step
            );
        }
        self.chain_active = false;
        self.current_step = None;
        self.chain_fired_at = None;
        let _ = self.save();
    }
}

fn state_path() -> PathBuf {
    let base = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join(".conflux").join("heartbeat_chain_state.json")
}

impl ChainState {
    pub fn load() -> Self {
        let path = state_path();
        match std::fs::read_to_string(&path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
            Err(_) => Self::new(),
        }
    }

    pub fn save(&self) -> Result<(), String> {
        let path = state_path();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let json = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        std::fs::write(&path, json).map_err(|e| e.to_string())?;
        Ok(())
    }
}