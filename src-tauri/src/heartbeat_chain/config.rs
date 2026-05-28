// Heartbeat Chain — Configuration Loading
// Loads and validates heartbeat_chain.json from ~/.conflux/

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use chrono::Timelike;

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
    /// The heartbeat prompt template for this agent (NEW)
    #[serde(default)]
    pub prompt: String,
    /// Tool names this agent can use during heartbeat (NEW)
    #[serde(default)]
    pub tools: Vec<String>,
    /// Max response tokens for this step (NEW)
    #[serde(default)]
    pub max_tokens: Option<i64>,
    /// Max seconds before this step times out (NEW, default 60)
    #[serde(default = "default_step_timeout")]
    pub timeout_secs: u64,
    /// Scheduling metadata for smart skip logic (Session 5)
    #[serde(default)]
    pub schedule: Option<StepSchedule>,
    /// Priority level: "critical" (always runs), "normal" (can be skipped), "low" (skip when busy)
    #[serde(default = "default_priority")]
    pub priority: String,
}

fn default_step_timeout() -> u64 { 60 }
fn default_priority() -> String { "normal".into() }

/// Scheduling metadata for a chain step.
/// Controls how often this agent checks in.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepSchedule {
    /// Frequency: "every" | "twice_daily" | "3x_daily" | "daily" | "market_hours"
    pub frequency: String,
    /// Optional hour-of-day preferences (0-23, user's local time)
    /// If set, the agent prefers to run during these hours.
    #[serde(default)]
    pub preferred_hours: Vec<u32>,
    /// Minimum interval between runs in seconds (auto-derived from frequency if 0)
    #[serde(default)]
    pub interval_secs: u64,
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
/// Each step has a real prompt and tool list so agents actually DO things.
pub fn default_chain() -> HeartbeatChainConfig {
    HeartbeatChainConfig {
        version: 3,
        chain: vec![
            // ── Step 1: Conflux syncs team state ──
            ChainStep {
                agent: "conflux".into(),
                action: "sync_state".into(),
                delay_sec: 0,
                voice_id: Some("TvxTBL9RtGW6tVhl4NoI".into()),
                prompt: "You are Conflux, the team orchestrator. It's time for the team heartbeat. \
                         Read your recent memories to understand what's been happening. \
                         Provide a brief 2-3 sentence status sync: what's the overall state of the user's life? \
                         Reference specific recent events or patterns from your memories. \
                         If this is the first heartbeat, say so warmly.".into(),
                tools: vec!["memory_read".into(), "memory_write".into(), "time".into()],
                max_tokens: Some(300),
                timeout_secs: 45,
                schedule: Some(StepSchedule { frequency: "every".into(), preferred_hours: vec![], interval_secs: 0 }),
                priority: "critical".into(),
            },
            // ── Step 2: Aegis security scan ──
            ChainStep {
                agent: "aegis".into(),
                action: "security_scan".into(),
                delay_sec: 15,
                voice_id: Some("WtA85syCrJwasGeHGH2p".into()),
                prompt: "You are Aegis, the security sentinel. Run a quick security check. \
                         1. Use time to note the current moment. \
                         2. Check your memories for any recent security findings or alerts. \
                         3. Report your assessment in 2-3 sentences. \
                         If you find something concerning, explain what and why it matters. \
                         If all is clear, say so briefly. \
                         Store any notable findings using memory_write with category 'heartbeat-finding'.".into(),
                tools: vec!["time".into(), "memory_read".into(), "memory_write".into()],
                max_tokens: Some(300),
                timeout_secs: 45,
                schedule: Some(StepSchedule { frequency: "every".into(), preferred_hours: vec![], interval_secs: 0 }),
                priority: "critical".into(),
            },
            // ── Step 3: Helix market intelligence ──
            ChainStep {
                agent: "helix".into(),
                action: "market_intel".into(),
                delay_sec: 45,
                voice_id: Some("NQMJRVvPew6HsaebYnZj".into()),
                prompt: "You are Helix, the market intelligence agent. Check for market signals. \
                         1. Use web_search to check major market indices (S&P 500, NASDAQ) or any stocks the user follows. \
                         2. Check your memories for the user's watchlist or interests. \
                         3. Report the 2-3 most notable signals with context. \
                         If nothing notable, say 'Markets are steady — nothing urgent on your radar.' \
                         Store interesting patterns using memory_write with category 'heartbeat-finding'.".into(),
                tools: vec!["web_search".into(), "time".into(), "memory_read".into(), "memory_write".into()],
                max_tokens: Some(400),
                timeout_secs: 60,
                schedule: Some(StepSchedule { frequency: "market_hours".into(), preferred_hours: vec![9, 10, 11, 12, 13, 14, 15, 16], interval_secs: 0 }),
                priority: "normal".into(),
            },
            // ── Step 4: Pulse financial heartbeat ──
            ChainStep {
                agent: "pulse".into(),
                action: "financial_pulse".into(),
                delay_sec: 90,
                voice_id: Some("iLVmqjzCGGvqtMCk6vVQ".into()),
                prompt: "You are Pulse, the financial heartbeat. Check the user's financial picture. \
                         1. Use budget_get_summary to check this month's spending. \
                         2. Use budget_get_goals to check savings goal progress. \
                         3. Use budget_get_entries to check today's spending. \
                         4. Check your memories for recent spending patterns. \
                         Report in 2-3 sentences. Include specific dollar amounts. \
                         If on track, celebrate briefly. If something needs attention, be direct but encouraging. \
                         If no budget data exists, say 'No budget data yet — I'll keep watch when you start tracking.'".into(),
                tools: vec!["budget_get_summary".into(), "budget_get_entries".into(), "budget_get_goals".into(), "time".into(), "memory_read".into(), "memory_write".into()],
                max_tokens: Some(400),
                timeout_secs: 60,
                schedule: Some(StepSchedule { frequency: "twice_daily".into(), preferred_hours: vec![8, 20], interval_secs: 0 }),
                priority: "normal".into(),
            },
            // ── Step 5: Viper vulnerability scan ──
            ChainStep {
                agent: "viper".into(),
                action: "vuln_scan".into(),
                delay_sec: 120,
                voice_id: Some("Mtmp3KhFIjYpWYRycDe3".into()),
                prompt: "You are Viper, the vulnerability scanner. Run a quick vulnerability assessment. \
                         1. Check your memories for any recent security findings or patterns. \
                         2. Assess the current state based on what you know. \
                         3. Report in 2-3 sentences with severity ratings if issues found. \
                         If all clear, say 'No new vulnerabilities detected — defenses holding.' \
                         Store any findings using memory_write with category 'heartbeat-finding'.".into(),
                tools: vec!["time".into(), "memory_read".into(), "memory_write".into()],
                max_tokens: Some(300),
                timeout_secs: 45,
                schedule: Some(StepSchedule { frequency: "every".into(), preferred_hours: vec![], interval_secs: 0 }),
                priority: "critical".into(),
            },
            // ── Step 6: Horizon dream progress ──
            ChainStep {
                agent: "horizon".into(),
                action: "dream_progress".into(),
                delay_sec: 180,
                voice_id: Some("56bWURjYFHyYyVf490Dp".into()),
                prompt: "You are Horizon, the dream tracker. Check progress on the user's dreams and goals. \
                         1. Use dream_list to see active dreams. \
                         2. Use dream_get_dashboard to check milestones and progress. \
                         3. Check your memories for recent progress notes. \
                         Report in 2-3 sentences. Celebrate completions. Suggest the next small step. \
                         If no dreams are active, encourage warmly: 'No active dreams yet — what's something you've been wanting to pursue?'".into(),
                tools: vec!["dream_list".into(), "dream_get_dashboard".into(), "time".into(), "memory_read".into(), "memory_write".into()],
                max_tokens: Some(400),
                timeout_secs: 60,
                schedule: Some(StepSchedule { frequency: "daily".into(), preferred_hours: vec![9], interval_secs: 0 }),
                priority: "low".into(),
            },
            // ── Step 7: Orbit life autopilot ──
            ChainStep {
                agent: "orbit".into(),
                action: "task_review".into(),
                delay_sec: 240,
                voice_id: Some("QzTKubutNn9TjrB7Xb2Q".into()),
                prompt: "You are Orbit, the life organizer. Review the user's life autopilot. \
                         1. Use life_list_tasks with status 'pending' to see what's on their plate. \
                         2. Check your memories for habit streaks, overdue items, and patterns. \
                         3. Identify the top 1-2 things that need attention RIGHT NOW. \
                         Report in 2-3 sentences. Be specific — name the actual tasks. \
                         If everything is clear, celebrate: 'Your plate is clear — enjoy the breathing room!'".into(),
                tools: vec!["life_list_tasks".into(), "time".into(), "memory_read".into(), "memory_write".into()],
                max_tokens: Some(400),
                timeout_secs: 60,
                schedule: Some(StepSchedule { frequency: "3x_daily".into(), preferred_hours: vec![9, 13, 18], interval_secs: 0 }),
                priority: "normal".into(),
            },
            // ── Step 8: Hearth kitchen check ──
            ChainStep {
                agent: "hearth".into(),
                action: "kitchen_check".into(),
                delay_sec: 300,
                voice_id: Some("W7iR5kTNHozpIl2Jqq15".into()),
                prompt: "You are Hearth, the kitchen guardian. Check the kitchen status. \
                         1. Use kitchen_get_inventory to check what's in the pantry. \
                         2. Check for items expiring soon. \
                         3. Check your memories for meal patterns and preferences. \
                         Report in 2-3 sentences. Suggest a meal if items are expiring. \
                         If the kitchen is empty or no data, say 'Kitchen data will appear once you start logging meals and inventory.'".into(),
                tools: vec!["kitchen_get_inventory".into(), "kitchen_list_meals".into(), "time".into(), "memory_read".into(), "memory_write".into()],
                max_tokens: Some(400),
                timeout_secs: 60,
                schedule: Some(StepSchedule { frequency: "daily".into(), preferred_hours: vec![11, 17], interval_secs: 0 }),
                priority: "low".into(),
            },
            // ── Step 9: Echo wellness check-in ──
            ChainStep {
                agent: "echo".into(),
                action: "wellness_check".into(),
                delay_sec: 360,
                voice_id: Some("EST9Ui6982FZPSi7gCHi".into()),
                prompt: "You are Echo, the wellness companion. Do a gentle wellness check-in. \
                         1. Check your memories for recent conversation patterns and mood indicators. \
                         2. Note how long since the user last engaged. \
                         3. Offer a brief, warm check-in. \
                         If it's been a while: 'Hey — just checking in. How are you doing?' \
                         If recent activity: note something positive from the pattern. \
                         Keep it to 1-2 sentences. Never diagnose. Be genuine.".into(),
                tools: vec!["time".into(), "memory_read".into(), "memory_write".into()],
                max_tokens: Some(300),
                timeout_secs: 45,
                schedule: Some(StepSchedule { frequency: "daily".into(), preferred_hours: vec![20], interval_secs: 0 }),
                priority: "low".into(),
            },
            // ── Step 10: Conflux chain summary ──
            ChainStep {
                agent: "conflux".into(),
                action: "chain_summary".into(),
                delay_sec: 420,
                voice_id: Some("TvxTBL9RtGW6tVhl4NoI".into()),
                prompt: "You are Conflux, the team leader. The team has completed their heartbeat cycle. \
                         Read your memories to see what the team found this cycle. \
                         Compile a warm, concise summary (3-5 sentences): \
                         - Lead with anything that needs attention \
                         - Mention one positive thing \
                         - End with a forward-looking note \
                         This summary will be spoken via TTS, so write it naturally for speech. \
                         Store the summary using memory_write with category 'heartbeat-summary'.".into(),
                tools: vec!["memory_read".into(), "memory_write".into(), "time".into()],
                max_tokens: Some(400),
                timeout_secs: 60,
                schedule: Some(StepSchedule { frequency: "every".into(), preferred_hours: vec![], interval_secs: 0 }),
                priority: "critical".into(),
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

/// Merge an old config (v1/v2) with the new v3 defaults.
/// Preserves user customizations (delay_sec, voice_id, enabled state)
/// while adding new fields (prompt, tools, schedule, priority) and new agents.
fn merge_config_upgrade(old: &HeartbeatChainConfig) -> HeartbeatChainConfig {
    let defaults = default_chain();

    // Build a lookup of old steps by agent name for quick matching
    let old_steps: std::collections::HashMap<&str, &ChainStep> =
        old.chain.iter().map(|s| (s.agent.as_str(), s)).collect();

    let mut merged_chain: Vec<ChainStep> = Vec::new();

    // Walk the new default chain — merge with old where agent matches
    for default_step in &defaults.chain {
        if let Some(old_step) = old_steps.get(default_step.agent.as_str()) {
            // Merge: keep user's delay + voice, adopt new prompt/tools/schedule/priority
            let mut merged = default_step.clone();
            merged.delay_sec = old_step.delay_sec;
            if old_step.voice_id.is_some() {
                merged.voice_id = old_step.voice_id.clone();
            }
            // Preserve user's prompt customization if they changed it from a prior default
            // (v1/v2 had empty prompts, so only keep non-empty old prompts)
            if !old_step.prompt.is_empty() {
                merged.prompt = old_step.prompt.clone();
            }
            // Preserve user's tool list if they customized it
            if !old_step.tools.is_empty() {
                merged.tools = old_step.tools.clone();
            }
            merged_chain.push(merged);
        } else {
            // New agent in default chain — add it
            merged_chain.push(default_step.clone());
        }
    }

    // Preserve any old agents not in the new defaults (user-added custom agents)
    for old_step in &old.chain {
        if !defaults.chain.iter().any(|d| d.agent == old_step.agent) {
            merged_chain.push(old_step.clone());
        }
    }

    HeartbeatChainConfig {
        version: 3,
        chain: merged_chain,
        // Preserve user's global config settings
        config: ChainGlobalConfig {
            enabled: old.config.enabled,
            interrupt_on_app_close: old.config.interrupt_on_app_close,
        },
    }
}

/// Load the config file. Returns default chain if missing or invalid.
/// Auto-upgrades from v1/v2 to v3 — merges user customizations into new defaults.
pub fn load_config() -> HeartbeatChainConfig {
    let path = config_path();
    match std::fs::read_to_string(&path) {
        Ok(content) => {
            let config: HeartbeatChainConfig = serde_json::from_str(&content).unwrap_or_else(|e| {
                log::warn!("[HeartbeatChain] Config parse error {}: {e} — using defaults", path.display());
                default_chain()
            });
            // Version migration: v1 configs lack prompt/tools, v2 lacks scheduling
            if config.version < 3 {
                log::info!(
                    "[HeartbeatChain] Upgrading config from v{} to v3 — merging with new defaults",
                    config.version
                );
                let merged = merge_config_upgrade(&config);
                let _ = save_config(&merged);
                return merged;
            }
            config
        }
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

/// Resolve the effective interval in seconds for a step's schedule.
/// If `interval_secs` is set, use it. Otherwise derive from frequency.
pub fn resolve_interval_secs(schedule: &StepSchedule) -> u64 {
    if schedule.interval_secs > 0 {
        return schedule.interval_secs;
    }
    match schedule.frequency.as_str() {
        "every"          => 1_800,      // 30 min
        "twice_daily"    => 43_200,     // 12 hours
        "3x_daily"       => 28_800,     // 8 hours
        "daily"          => 86_400,     // 24 hours
        "market_hours"   => 14_400,     // 4 hours (during market hours)
        _                => 1_800,      // default: 30 min
    }
}

/// Check if a step should run based on its schedule and last-run time.
/// Returns (should_run, reason).
pub fn should_run_step(
    step: &ChainStep,
    last_run_ms: Option<i64>,
    now_ms: i64,
) -> (bool, String) {
    // Critical agents always run
    if step.priority == "critical" {
        return (true, "critical priority — always runs".into());
    }

    let schedule = match &step.schedule {
        Some(s) => s,
        None => return (true, "no schedule — always runs".into()),
    };

    // Check interval
    let interval_ms = (resolve_interval_secs(schedule) * 1000) as i64;
    if let Some(last) = last_run_ms {
        let elapsed = now_ms - last;
        if elapsed < interval_ms {
            let remaining_secs = ((interval_ms - elapsed) / 1000) as u64;
            return (false, format!(
                "ran {} ago, needs {}s more (interval: {}s)",
                format_duration_ms(elapsed),
                remaining_secs,
                resolve_interval_secs(schedule),
            ));
        }
    }

    // Check preferred hours (if set)
    if !schedule.preferred_hours.is_empty() {
        // Convert UTC ms to local hour (approximate — uses system local time)
        let local_now = chrono::Local::now();
        let current_hour = local_now.hour();
        if !schedule.preferred_hours.contains(&current_hour) {
            // Allow if we're within 1 hour of a preferred hour
            let near_preferred = schedule.preferred_hours.iter().any(|&h| {
                current_hour.abs_diff(h) <= 1 || current_hour.abs_diff(h) >= 23
            });
            if !near_preferred {
                return (false, format!(
                    "current hour {} not in preferred {:?}",
                    current_hour, schedule.preferred_hours
                ));
            }
        }
    }

    (true, "scheduled — interval elapsed".into())
}

/// Format a duration in ms as a human-readable string.
fn format_duration_ms(ms: i64) -> String {
    let secs = ms / 1000;
    if secs < 60 { return format!("{}s", secs); }
    let mins = secs / 60;
    if mins < 60 { return format!("{}m", mins); }
    let hours = mins / 60;
    format!("{}h {}m", hours, mins % 60)
}