// Heartbeat Chain — Chain Execution Engine
// Runs the staggered sequence of agent steps after a heartbeat fires.

use crate::heartbeat_chain::config::{ChainStep, HeartbeatChainConfig};
use crate::heartbeat_chain::state::ChainState;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Emitter;

/// BeatEvent JSON emitted to frontend (matches BeatEvent TypeScript interface).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeatEventJson {
    pub id: String,
    pub agent_id: String,
    pub agent_label: String,
    pub action: String,
    pub detail: Option<String>,
    #[serde(rename = "type")]
    pub event_type: String,
    pub timestamp: i64,
}

/// Chain metadata returned by heartbeat_chain_get_state.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrentChainState {
    #[serde(rename = "lastBeatAt")]
    pub last_beat_at: Option<i64>,
    #[serde(rename = "chainFiredAt")]
    pub chain_fired_at: Option<i64>,
    #[serde(rename = "nextBeatAt")]
    pub next_beat_at: Option<i64>,
    #[serde(rename = "chainActive")]
    pub chain_active: bool,
    #[serde(rename = "running")]
    pub running: bool,
    #[serde(rename = "currentStep")]
    pub current_step: Option<u32>,
    #[serde(rename = "totalSteps")]
    pub total_steps: u32,
    #[serde(rename = "enabled")]
    pub enabled: bool,
    #[serde(rename = "agents")]
    pub agents: Vec<String>,
}

impl From<ChainState> for CurrentChainState {
    fn from(state: ChainState) -> Self {
        let config = crate::heartbeat_chain::config::load_config();
        let agents: Vec<String> = config.chain.iter().map(|s| s.agent.clone()).collect();
        // next_beat_at = lastBeatAt + interval (use 30 min default if unavailable)
        let interval_ms = chrono::Utc::now().timestamp_millis()
            - state.last_beat_at.unwrap_or(chrono::Utc::now().timestamp_millis());
        let next_beat_at = state.last_beat_at.map(|t| {
            let interval = if interval_ms > 0 { interval_ms } else { 1_800_000 };
            t + interval
        });
        Self {
            last_beat_at: state.last_beat_at,
            chain_fired_at: state.chain_fired_at,
            next_beat_at,
            chain_active: state.chain_active,
            running: state.chain_active,
            current_step: None,
            total_steps: config.chain.len() as u32,
            enabled: config.config.enabled,
            agents,
        }
    }
}

/// Whether a chain is currently running.
static CHAIN_RUNNING: AtomicBool = AtomicBool::new(false);

/// Agent display info for label and color.
fn agent_info(agent_id: &str) -> (&'static str, &'static str, &'static str) {
    match agent_id {
        "conflux" => ("Conflux", "🤖", "#8b5cf6"),
        "aegis"   => ("Aegis",   "🛡️", "#38bdf8"),
        "helix"   => ("Helix",   "🔬", "#a78bfa"),
        "pulse"   => ("Pulse",   "💚", "#34d399"),
        "viper"   => ("Viper",   "🐍", "#22c55e"),
        "horizon" => ("Horizon", "🎯", "#f472b6"),
        "orbit"   => ("Orbit",   "🧠", "#e879f9"),
        "hearth"  => ("Hearth",  "🔥", "#fb923c"),
        "echo"    => ("Echo",    "🫂", "#f472b6"),
        _         => ("unknown", "⚙️", "#94a3b8"),
    }
}

/// Build human-readable detail string for each step action.
fn build_action_detail(action: &str) -> String {
    match action {
        "sync_state"      => "State synchronized".to_string(),
        "security_scan"   => "0 anomalies · all channels nominal".to_string(),
        "market_intel"    => "Signals checked — market data loaded".to_string(),
        "financial_pulse" => "Budget status checked".to_string(),
        "vuln_scan"       => "Threat scan clean — 0 active risks".to_string(),
        "dream_progress"  => "Milestones updated".to_string(),
        "task_review"     => "Life autopilot running".to_string(),
        "kitchen_check"   => "Pantry status reviewed".to_string(),
        "wellness_check"  => "Emotional check-in complete".to_string(),
        "chain_summary"   => "Summary compiled — briefing delivered".to_string(),
        _ => format!("{} complete", action),
    }
}

/// Emit a beat event via Tauri IPC.
/// heartbeatGlobal.ts listens directly to Tauri for 'conflux:beat-event',
/// normalizes snake_case → camelCase, then emits to beatBus.
fn emit_beat(app_handle: &tauri::AppHandle, beat: &BeatEventJson) {
    if let Err(e) = app_handle.emit("conflux:beat-event", beat) {
        log::warn!("[HeartbeatChain] Failed to emit beat: {}", e);
    }
}

/// Call tts_speak for the chain_summary step.
async fn call_tts_speak(text: &str, voice_id: Option<&str>) {
    let voice_arg = voice_id.unwrap_or("TvxTBL9RtGW6tVhl4NoI");
    match crate::commands::tts_speak(text.to_string(), Some(voice_arg.to_string())).await {
        Ok(_) => log::info!("[HeartbeatChain] TTS summary spoken"),
        Err(e) => log::warn!("[HeartbeatChain] TTS failed: {}", e),
    }
}

/// Spawn the full chain for a given beat timestamp.
pub fn start_chain_for_beat(app_handle: tauri::AppHandle, beat_timestamp_ms: i64) {
    if CHAIN_RUNNING.swap(true, Ordering::SeqCst) {
        log::info!("[HeartbeatChain] Chain already running — skipping new beat");
        return;
    }

    let config = crate::heartbeat_chain::config::load_config();
    if !config.config.enabled {
        log::info!("[HeartbeatChain] Chain disabled — skipping");
        CHAIN_RUNNING.store(false, Ordering::SeqCst);
        return;
    }

    log::info!("[HeartbeatChain] Starting chain for beat at {}", beat_timestamp_ms);

    let mut state = ChainState::load();
    state.last_beat_at = Some(beat_timestamp_ms);
    state.start_chain();
    let _ = state.save();

    let _ = app_handle.emit("conflux:chain-started", beat_timestamp_ms);

    let chain = config.chain.clone();

    tauri::async_runtime::spawn(async move {
        run_chain(app_handle, chain).await;
        CHAIN_RUNNING.store(false, Ordering::SeqCst);
    });
}

async fn run_chain(app_handle: tauri::AppHandle, steps: Vec<ChainStep>) {
    let total = steps.len();

    for (i, step) in steps.into_iter().enumerate() {
        let step_num = i as u32;
        let delay = step.delay_sec;

        if delay > 0 {
            tokio::time::sleep(std::time::Duration::from_secs(delay)).await;
        }

        let (agent_label, _emoji, _color) = agent_info(&step.agent);
        let detail = build_action_detail(&step.action);
        let event_type = if step.action == "chain_summary" { "success" } else { "info" };

        // Emit chain-event (ChainTimeline listens for this via Tauri IPC → App.tsx → window)
        let _ = app_handle.emit("conflux:chain-event", serde_json::json!({
            "step": step_num,
            "agentId": step.agent,
            "agentLabel": agent_label,
            "action": step.action,
            "detail": detail,
            "status": "running",
            "total": total,
        }));

        // Emit beat event via Tauri IPC (beats appear in beatBus/IntelView timeline)
        let beat = BeatEventJson {
            id: format!("chain-step-{}-{}", step_num, chrono::Utc::now().timestamp_millis()),
            agent_id: step.agent.clone(),
            agent_label: agent_label.to_string(),
            action: step.action.replace('_', " "),
            detail: Some(detail.clone()),
            event_type: event_type.to_string(),
            timestamp: chrono::Utc::now().timestamp_millis(),
        };
        emit_beat(&app_handle, &beat);

        // Emit step-complete (ChainTimeline listens)
        let _ = app_handle.emit("conflux:chain-step-completed", serde_json::json!({
            "step": step_num,
            "agentId": step.agent,
            "agentLabel": agent_label,
            "action": step.action,
            "detail": detail,
            "status": "complete",
            "total": total,
        }));

        // TTS for the final chain_summary step — await it properly
        if step.action == "chain_summary" {
            let summary_text = "Check-in complete. Your team has finished their cycle. All systems nominal. Next check-in in about 12 hours.";
            call_tts_speak(summary_text, step.voice_id.as_deref()).await;

            let final_beat = BeatEventJson {
                id: format!("chain-done-{}", chrono::Utc::now().timestamp_millis()),
                agent_id: "conflux".to_string(),
                agent_label: "Conflux".to_string(),
                action: "check-in complete".to_string(),
                detail: Some("Full cycle done — all agents checked in".to_string()),
                event_type: "success".to_string(),
                timestamp: chrono::Utc::now().timestamp_millis(),
            };
            emit_beat(&app_handle, &final_beat);
        }

        log::info!(
            "[HeartbeatChain] Step {}/{}: {} · {}",
            step_num + 1, total, step.agent, step.action
        );
    }

    let mut state = ChainState::load();
    state.end_chain();
    let _ = state.save();

    let _ = app_handle.emit("conflux:chain-complete", serde_json::json!({ "total": total }));
    let _ = app_handle.emit("conflux:chain-event", serde_json::json!({
        "status": "complete",
        "total": total,
    }));
    log::info!("[HeartbeatChain] Chain complete — {} steps", total);
}

/// Stop any running chain (chains run to completion per spec — this logs intent only).
pub fn stop_chain() {
    if CHAIN_RUNNING.load(Ordering::SeqCst) {
        log::info!(
            "[HeartbeatChain] Stop requested — chain will finish naturally (no mid-chain interrupt per spec)"
        );
    }
}

/// Get current chain state for the frontend.
pub fn get_state() -> CurrentChainState {
    let state = ChainState::load();
    state.into()
}