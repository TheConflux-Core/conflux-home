// Heartbeat Chain — Configuration Loading
// Loads and validates heartbeat_chain.json from ~/.conflux/

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
    /// Optional task message to send to the agent via process_turn.
    /// When None, the step emits hardcoded detail only (legacy behavior).
    #[serde(rename = "taskMessage", default)]
    pub task_message: Option<String>,
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
        version: 4,
        chain: vec![
            ChainStep {
                agent: "conflux".into(),
                action: "sync_state".into(),
                delay_sec: 0,
                voice_id: Some("TvxTBL9RtGW6tVhl4NoI".into()),
                task_message: Some(
                    "Check overall system health. \
                     Use conflux_weekly_summary to get a cross-app status report. \
                     Provide a 1-2 sentence summary of system health.".into()
                ),
            },
            ChainStep {
                agent: "aegis".into(),
                action: "security_scan".into(),
                delay_sec: 8,
                voice_id: Some("WtA85syCrJwasGeHGH2p".into()),
                task_message: Some(
                    "Quick system security check. \
                     Use exec to run: echo '=== LISTENING PORTS ===' && netstat -tulpn 2>/dev/null | head -20 && echo '=== OPEN FILES ===' && lsof -i 2>/dev/null | head -10. \
                     Report any unusual open ports or connections in 1-2 sentences. \
                     If everything looks normal, confirm clean.".into()
                ),
            },
            ChainStep {
                agent: "helix".into(),
                action: "market_intel".into(),
                delay_sec: 16,
                voice_id: Some("NQMJRVvPew6HsaebYnZj".into()),
                task_message: Some(
                    "Check market signals and trends. \
                     Use web_search to check major market indices (S&P 500, NASDAQ, BTC). \
                     Note any significant moves (>1% change). \
                     Keep output to 2-3 sentences with specific numbers.".into()
                ),
            },
            ChainStep {
                agent: "pulse".into(),
                action: "financial_pulse".into(),
                delay_sec: 25,
                voice_id: Some("iLVmqjzCGGvqtMCk6vVQ".into()),
                task_message: Some(
                    "Check budget and financial status. \
                     Use budget_get_summary for this month's spending. \
                     Use budget_get_goals to check savings progress. \
                     Report total spent this month and any goals at risk. \
                     Keep output to 2-3 sentences with specific dollar amounts.".into()
                ),
            },
            ChainStep {
                agent: "viper".into(),
                action: "vuln_scan".into(),
                delay_sec: 35,
                voice_id: Some("Mtmp3KhFIjYpWYRycDe3".into()),
                task_message: Some(
                    "Quick vulnerability check. \
                     Use exec to run: echo '=== USERS ===' && cat /etc/passwd | grep -v nologin | grep -v false && echo '=== SUDO ===' && groups && echo '=== SSH ===' && cat ~/.ssh/authorized_keys 2>/dev/null | wc -l && echo '=== CRONTAB ===' && crontab -l 2>/dev/null. \
                     Report any findings in 1-2 sentences. If clean, confirm no issues.".into()
                ),
            },
            ChainStep {
                agent: "horizon".into(),
                action: "dream_progress".into(),
                delay_sec: 45,
                voice_id: Some("56bWURjYFHyYyVf490Dp".into()),
                task_message: Some(
                    "Check dream and goal progress. \
                     Use dream_list to see active dreams and their completion percentages. \
                     Note any milestones recently completed or tasks due soon. \
                     Keep output to 2-3 sentences.".into()
                ),
            },
            ChainStep {
                agent: "orbit".into(),
                action: "task_review".into(),
                delay_sec: 55,
                voice_id: Some("QzTKubutNn9TjrB7Xb2Q".into()),
                task_message: Some(
                    "Review life tasks and habits. \
                     Use life_list_tasks with status='pending' to check upcoming tasks. \
                     Use life_list_habits to check habit streaks. \
                     Report how many tasks are pending and any broken habit streaks. \
                     Keep output to 2-3 sentences.".into()
                ),
            },
            ChainStep {
                agent: "hearth".into(),
                action: "kitchen_check".into(),
                delay_sec: 65,
                voice_id: Some("W7iR5kTNHozpIl2Jqq15".into()),
                task_message: Some(
                    "Check kitchen and pantry status. \
                     Use kitchen_get_inventory to check current stock. \
                     Note any items expiring within 3 days. \
                     Use kitchen_list_meals to see recent meals. \
                     Keep output to 2-3 sentences.".into()
                ),
            },
            ChainStep {
                agent: "echo".into(),
                action: "wellness_check".into(),
                delay_sec: 75,
                voice_id: Some("EST9Ui6982FZPSi7gCHi".into()),
                task_message: Some(
                    "Emotional wellness check-in. \
                     Use echo_get_entries with limit=3 to check recent journal entries. \
                     Look for patterns in mood or emotional tone. \
                     If no recent entries, gently encourage a check-in. \
                     Keep output to 1-2 sentences, warm and supportive.".into()
                ),
            },
            ChainStep {
                agent: "conflux".into(),
                action: "chain_summary".into(),
                delay_sec: 85,
                voice_id: Some("TvxTBL9RtGW6tVhl4NoI".into()),
                // task_message is unused for chain_summary — it compiles from step results
                task_message: None,
            },
        ],
        config: ChainGlobalConfig::default(),
    }
}

/// Path to the heartbeat chain config file.
pub fn config_path() -> PathBuf {
    let base = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join(".conflux").join("heartbeat_chain.json")
}

/// Load the config file. Returns default chain if missing, invalid, or stale (version < default).
pub fn load_config() -> HeartbeatChainConfig {
    let path = config_path();
    let defaults = default_chain();
    match std::fs::read_to_string(&path) {
        Ok(content) => {
            let mut config: HeartbeatChainConfig = serde_json::from_str(&content).unwrap_or_else(|e| {
                log::warn!("[HeartbeatChain] Config parse error {}: {e} — using defaults", path.display());
                defaults.clone()
            });
            // Auto-upgrade: if config version is older than defaults, replace with defaults
            if config.version < defaults.version {
                log::info!("[HeartbeatChain] Config version {} < {} — upgrading to defaults", config.version, defaults.version);
                config = defaults;
                let _ = save_config(&config);
            }
            config
        }
        Err(_) => {
            log::info!("[HeartbeatChain] No config at {} — using canonical defaults", path.display());
            let _ = save_config(&defaults);
            defaults
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