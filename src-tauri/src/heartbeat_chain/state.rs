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
}

impl ChainState {
    pub fn new() -> Self {
        Self::default()
    }

    /// Mark chain as started.
    pub fn start_chain(&mut self) {
        self.chain_fired_at = Some(chrono::Utc::now().timestamp_millis());
        self.chain_active = true;
    }

    /// Mark chain as complete (or stopped).
    pub fn end_chain(&mut self) {
        self.chain_active = false;
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