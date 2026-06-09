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
        version: 8,
        chain: vec![
            ChainStep {
                agent: "conflux".into(),
                action: "sync_state".into(),
                delay_sec: 0,
                voice_id: Some("TvxTBL9RtGW6tVhl4NoI".into()),
                task_message: Some(
                    "Analyze the full system state. Compare with LAST HEARTBEAT data if available \
                     — focus on what changed. If this is the first run, do a full baseline report. \
                     Identify the ONE most important thing the user should know or do right now. \
                     If you detect a system issue (disk space low, memory pressure, service down, outdated packages), \
                     use life_add_task to create an actionable task for it — e.g. 'Free up disk space' or \
                     'Restart crashed service'. Only create tasks for real problems, not routine status.".into()
                ),
            },
            ChainStep {
                agent: "aegis".into(),
                action: "security_scan".into(),
                delay_sec: 8,
                voice_id: Some("WtA85syCrJwasGeHGH2p".into()),
                task_message: Some(
                    "Security check. Use exec to run: echo '=== LISTENING PORTS ===' && netstat -tulpn \
                     2>/dev/null | head -20 && echo '=== OPEN FILES ===' && lsof -i 2>/dev/null | head -10. \
                     Compare with last heartbeat — report only NEW or CHANGED ports/processes. \
                     If nothing changed, say 'No changes since last scan.' If clean and first run, confirm briefly. \
                     IMPORTANT: If you find unexpected open ports, unknown processes, or anything suspicious, \
                     use life_add_task to create a security review task (e.g. 'Investigate unknown port 4444 \
                     listening on 0.0.0.0'). Be specific in the task title so the user knows exactly what to check.".into()
                ),
            },
            ChainStep {
                agent: "helix".into(),
                action: "market_intel".into(),
                delay_sec: 16,
                voice_id: Some("NQMJRVvPew6HsaebYnZj".into()),
                task_message: Some(
                    "Check market data. Use web_search for S&P 500, NASDAQ, BTC. \
                     Compare with last heartbeat numbers if available — report the DELTA \
                     (e.g., 'NASDAQ was 17,234, now 17,412 — up 1%'). If first run, just report current numbers. \
                     Highlight what's noteworthy. Connect to user's financial picture if Pulse has data. \
                     IMPORTANT: If any index moves more than 2% since last heartbeat, or BTC moves more than 5%, \
                     use life_add_task to create a task like 'Review portfolio — NASDAQ dropped 3% today'. \
                     Major moves are actionable, not just informational.".into()
                ),
            },
            ChainStep {
                agent: "pulse".into(),
                action: "financial_pulse".into(),
                delay_sec: 25,
                voice_id: Some("iLVmqjzCGGvqtMCk6vVQ".into()),
                task_message: Some(
                    "Analyze budget status. Use budget_get_summary for this month. \
                     Compare with last heartbeat — did spending change? New entries? \
                     If nothing changed, say 'Budget unchanged since last check.' If first run, do a full report. \
                     If Helix reported market data, connect it to the user's financial picture. \
                     IMPORTANT: If any category is over 80% of its budget, use life_add_task to create a task \
                     like 'Review dining budget — 85% used with 10 days left'. If a recurring expense seems missing, \
                     create a task to check on it. Give the user specific, time-bound financial actions.".into()
                ),
            },
            ChainStep {
                agent: "viper".into(),
                action: "vuln_scan".into(),
                delay_sec: 35,
                voice_id: Some("Mtmp3KhFIjYpWYRycDe3".into()),
                task_message: Some(
                    "Quick security audit. Use exec to run: echo '=== USERS ===' && cat /etc/passwd | \
                     grep -v nologin | grep -v false && echo '=== SUDO ===' && groups && echo '=== SSH ===' && \
                     cat ~/.ssh/authorized_keys 2>/dev/null | wc -l && echo '=== CRONTAB ===' && crontab -l 2>/dev/null. \
                     Compare with last scan — report only changes. If nothing changed, say 'No changes.' \
                     IMPORTANT: If you find new user accounts, new SSH keys, unknown cron jobs, or permission \
                     changes since last scan, use life_add_task to create a hardening task (e.g. 'Review new SSH \
                     key added since last scan'). Security drift is always actionable.".into()
                ),
            },
            ChainStep {
                agent: "horizon".into(),
                action: "dream_progress".into(),
                delay_sec: 45,
                voice_id: Some("56bWURjYFHyYyVf490Dp".into()),
                task_message: Some(
                    "Check dream progress. Use dream_list with status='active'. \
                     Compare with last heartbeat — did any dream's percentage change? New milestones completed? \
                     If nothing changed and dream is at 0%, DON'T re-break it into milestones (you already did that). \
                     Instead, say 'Dream unchanged — still waiting on first milestone.' If first run, break it into milestones. \
                     IMPORTANT: If a dream has been unchanged for 2+ consecutive heartbeats, use life_add_task to create \
                     a task like 'Work on [dream name] — no progress in [X] days'. If a milestone is close to completion \
                     (>80%), create a task to push it over the finish line. Dreams need momentum.".into()
                ),
            },
            ChainStep {
                agent: "orbit".into(),
                action: "task_review".into(),
                delay_sec: 55,
                voice_id: Some("QzTKubutNn9TjrB7Xb2Q".into()),
                task_message: Some(
                    "Review tasks and habits. Use life_list_tasks with status='pending' to see user tasks. \
                     Use agent_list_tasks to see what work is assigned to agents on the Agent Board. \
                     Compare with last heartbeat — any tasks completed? New tasks added? \
                     If nothing changed, say 'Tasks unchanged.' If tasks exist from a previous run, DON'T recreate them. \
                     IMPORTANT — You are the task orchestrator. After reviewing ALL agent outputs from this heartbeat chain: \
                     (1) Use life_add_task to create USER-facing tasks for anything actionable — budget issues, stalled dreams, \
                     low supplies, security concerns. (2) Use agent_create_task to assign INTER-AGENT work — e.g., assign \
                     Forge to fix a bug, assign Helix to research a market shift. Cross-reference everything. Don't duplicate \
                     tasks that already exist in pending. Your job is to make sure nothing falls through the cracks.".into()
                ),
            },
            ChainStep {
                agent: "hearth".into(),
                action: "kitchen_check".into(),
                delay_sec: 65,
                voice_id: Some("W7iR5kTNHozpIl2Jqq15".into()),
                task_message: Some(
                    "Check kitchen state. Use kitchen_get_inventory. \
                     Compare with last heartbeat — did inventory change? New items added? Items used? \
                     If nothing changed, say 'Kitchen unchanged.' If first run and pantry is empty, \
                     generate a shopping list with cost estimate. Tell Pulse the cost against the Groceries bucket. \
                     IMPORTANT: If any staple items are critically low (milk, eggs, bread, etc.), \
                     use life_add_task to create a shopping task like 'Restock groceries — milk, eggs running low'. \
                     If items are expiring within 2 days, create a task to use them up. \
                     Don't just report — give the user a reason to act.".into()
                ),
            },
            ChainStep {
                agent: "echo".into(),
                action: "wellness_check".into(),
                delay_sec: 75,
                voice_id: Some("EST9Ui6982FZPSi7gCHi".into()),
                task_message: Some(
                    "Warm wellness check-in. Use echo_counselor_get_state. \
                     Compare with last heartbeat — any new sessions? Streak changed? \
                     If nothing changed, offer a gentle prompt. If the chain found many things changed this run, \
                     acknowledge the user is making progress. If everything is the same, gently nudge without being repetitive. \
                     IMPORTANT: If the chain flagged multiple action items from other agents (3+ tasks created this run), \
                     use life_add_task to create a self-care task like 'Take a break — you have a lot on your plate today'. \
                     If the user hasn't had an echo session in 7+ days, suggest a check-in. Balance productivity with wellbeing.".into()
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