// Heartbeat Chain — Configuration Loading
// Loads and validates heartbeat_chain.json from ~/.openclaw/

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// The full heartbeat chain config file.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct HeartbeatChainConfig {
    pub version: u32,
    pub chain: Vec<ChainStep>,
    pub config: ChainGlobalConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChainStep {
    pub agent: String,
    pub action: String,
    pub delay_sec: u64,
    #[serde(rename = "voiceId", default)]
    pub voice_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChainGlobalConfig {
    #[serde(default = "default_enabled")]
    pub enabled: bool,
    #[serde(rename = "interruptOnAppClose", default = "default_interrupt")]
    pub interrupt_on_app_close: bool,
}

fn default_enabled() -> bool { true }
fn default_interrupt() -> bool { true }

impl Default for ChainGlobalConfig {
    fn default() -> Self {
        Self { enabled: true, interrupt_on_app_close: true }
    }
}

/// Canonical default chain (matches SPEC).
pub fn default_chain() -> HeartbeatChainConfig {
    HeartbeatChainConfig {
        version: 1,
        chain: vec![
            ChainStep { agent: "conflux".into(),  action: "sync_state".into(),     delay_sec: 0,    voice_id: Some("TvxTBL9RtGW6tVhl4NoI".into()) },
            ChainStep { agent: "aegis".into(),     action: "security_scan".into(), delay_sec: 20,  voice_id: Some("WtA85syCrJwasGeHGH2p".into()) },
            ChainStep { agent: "helix".into(),     action: "market_intel".into(),  delay_sec: 60,  voice_id: Some("NQMJRVvPew6HsaebYnZj".into()) },
            ChainStep { agent: "pulse".into(),     action: "financial_pulse".into(), delay_sec: 120, voice_id: Some("iLVmqjzCGGvqtMCk6vVQ".into()) },
            ChainStep { agent: "viper".into(),     action: "vuln_scan".into(),     delay_sec: 180,  voice_id: Some("Mtmp3KhFIjYpWYRycDe3".into()) },
            ChainStep { agent: "horizon".into(),   action: "dream_progress".into(), delay_sec: 300, voice_id: Some("56bWURjYFHyYyVf490Dp".into()) },
            ChainStep { agent: "orbit".into(),     action: "task_review".into(),   delay_sec: 420,  voice_id: Some("QzTKubutNn9TjrB7Xb2Q".into()) },
            ChainStep { agent: "hearth".into(),    action: "kitchen_check".into(),  delay_sec: 540,  voice_id: Some("W7iR5kTNHozpIl2Jqq15".into()) },
            ChainStep { agent: "echo".into(),      action: "wellness_check".into(), delay_sec: 660, voice_id: Some("EST9Ui6982FZPSi7gCHi".into()) },
            ChainStep { agent: "conflux".into(),   action: "chain_summary".into(),  delay_sec: 780,  voice_id: Some("TvxTBL9RtGW6tVhl4NoI".into()) },
        ],
        config: ChainGlobalConfig::default(),
    }
}

/// Path to the heartbeat chain config file.
pub fn config_path() -> PathBuf {
    let base = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join(".openclaw").join("heartbeat_chain.json")
}

/// Load the config file. Returns default chain if missing or invalid.
pub fn load_config() -> HeartbeatChainConfig {
    let path = config_path();
    match std::fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_else(|e| {
            log::warn!("[HeartbeatChain] Config parse error {}: {e} — using defaults", path.display());
            default_chain()
        }),
        Err(_) => {
            log::info!("[HeartbeatChain] No config at {} — using canonical defaults", path.display());
            default_chain()
        }
    }
}

/// Save the config file.
pub fn save_config(config: &HeartbeatChainConfig) -> Result<(), String> {
    let path = config_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())?;
    log::info!("[HeartbeatChain] Config saved to {}", path.display());
    Ok(())
}

/// Check if the chain is globally enabled.
pub fn is_enabled() -> bool {
    load_config().config.enabled
}