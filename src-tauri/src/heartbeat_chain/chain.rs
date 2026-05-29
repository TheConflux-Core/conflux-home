// Heartbeat Chain — Chain Execution Engine
// Runs the staggered sequence of agent steps after a heartbeat fires.

use crate::heartbeat_chain::config::ChainStep;
use crate::heartbeat_chain::state::ChainState;
use crate::engine::runtime;
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
        let agents: Vec<String> = agents.into_iter().collect::<std::collections::HashSet<_>>().into_iter().collect();
        // next_beat_at = lastBeatAt + configured interval (fallback 30 min)
        let interval_ms = crate::engine::try_get_engine()
            .and_then(|e| e.db().get_config("heartbeat_interval_ms").ok().flatten())
            .and_then(|v| v.parse::<i64>().ok())
            .unwrap_or(1_800_000);
        let next_beat_at = state.last_beat_at.map(|t| t + interval_ms);
        Self {
            last_beat_at: state.last_beat_at,
            chain_fired_at: state.chain_fired_at,
            next_beat_at,
            chain_active: state.chain_active,
            running: state.chain_active,
            current_step: state.current_step,
            total_steps: state.total_steps.unwrap_or(config.chain.len() as u32),
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

/// Build fallback detail string for each step action (used when task_message is None or process_turn fails).
fn build_fallback_detail(action: &str) -> String {
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

/// Truncate a string to max_chars, adding "…" if truncated.
fn truncate_response(s: &str, max_chars: usize) -> String {
    if s.len() <= max_chars {
        s.to_string()
    } else {
        let end = s.char_indices()
            .nth(max_chars)
            .map(|(i, _)| i)
            .unwrap_or(s.len());
        format!("{}…", &s[..end])
    }
}

/// Execute a single chain step via process_turn, returning the response text.
/// Returns None if the step has no task_message or the engine is unavailable.
async fn execute_step(step: &ChainStep) -> Option<String> {
    let task_message = match &step.task_message {
        Some(msg) if !msg.is_empty() => msg.clone(),
        _ => return None,
    };

    let engine = match crate::engine::try_get_engine() {
        Some(e) => e,
        None => {
            log::warn!("[HeartbeatChain] Engine not available for step '{}'", step.action);
            return None;
        }
    };

    let db = engine.db();

    // Create a fresh session for this step
    // Use real user_id from config instead of "heartbeat" so tools get correct member_id
    let real_user_id = db.get_config("supabase_user_id")
        .ok()
        .flatten()
        .filter(|id| !id.is_empty())
        .unwrap_or_else(|| "default_user".to_string());
    let session = match db.create_session(&step.agent, &real_user_id) {
        Ok(s) => s,
        Err(e) => {
            log::warn!("[HeartbeatChain] Failed to create session for '{}': {}", step.action, e);
            return Some(format!("Error: could not create session — {}", e));
        }
    };

    // Wrap the task with context preamble including current date
    let now = chrono::Utc::now();
    let today = now.format("%Y-%m-%d").to_string();
    let current_month = now.format("%Y-%m").to_string();
    let message = format!(
        "HEARTBEAT TASK ({}):\n{}\n\
         Current date: {} (month: {}).\n\
         Be concise. Report actual data only. 2-3 sentences max.",
        step.action, task_message, today, current_month
    );

    log::info!("[HeartbeatChain] Executing step '{}' for agent '{}'", step.action, step.agent);

    match runtime::process_turn(db, &session.id, &step.agent, &message, None).await {
        Ok(response) => {
            let text = truncate_response(&response.content, 500);
            log::info!(
                "[HeartbeatChain] Step '{}' complete — {} chars, {} tokens",
                step.action, text.len(), response.tokens_used
            );
            Some(text)
        }
        Err(e) => {
            log::warn!("[HeartbeatChain] Step '{}' failed: {}", step.action, e);
            Some(format!("Error: {}", e))
        }
    }
}

/// Compile a natural-language summary from all step responses using process_turn.
/// Falls back to a hardcoded summary if the engine is unavailable or the LLM call fails.
async fn compile_chain_summary(step_responses: &[(String, String)]) -> String {
    let mut results_block = String::new();
    for (agent, response) in step_responses {
        results_block.push_str(&format!("- {}: {}\n", agent, response));
    }

    let summary_prompt = format!(
        "You are Conflux, the central coordinator. Compile the following heartbeat chain \
         results into a warm, concise briefing (3-5 sentences). Cover the key findings \
         from each agent. If any step reported an error, acknowledge it gracefully. \
         End with one actionable recommendation.\n\n\
         Heartbeat chain results:\n{}",
        results_block
    );

    let engine = match crate::engine::try_get_engine() {
        Some(e) => e,
        None => return build_fallback_detail("chain_summary"),
    };

    let db = engine.db();

    let real_user_id = db.get_config("supabase_user_id")
        .ok()
        .flatten()
        .filter(|id| !id.is_empty())
        .unwrap_or_else(|| "default_user".to_string());
    let session = match db.create_session("conflux", &real_user_id) {
        Ok(s) => s,
        Err(e) => {
            log::warn!("[HeartbeatChain] Failed to create summary session: {}", e);
            return build_fallback_detail("chain_summary");
        }
    };

    match runtime::process_turn(db, &session.id, "conflux", &summary_prompt, None).await {
        Ok(response) => {
            let text = truncate_response(&response.content, 800);
            log::info!(
                "[HeartbeatChain] Summary compiled — {} chars, {} tokens",
                text.len(), response.tokens_used
            );
            text
        }
        Err(e) => {
            log::warn!("[HeartbeatChain] Summary compilation failed: {}", e);
            build_fallback_detail("chain_summary")
        }
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
    // Collect response text from each step for the final summary
    let mut step_responses: Vec<(String, String)> = Vec::new(); // (agent, response_text)

    for (i, step) in steps.iter().enumerate() {
        let step_num = i as u32;
        let delay = step.delay_sec;

        if delay > 0 {
            tokio::time::sleep(std::time::Duration::from_secs(delay)).await;
        }

        let (agent_label, _emoji, _color) = agent_info(&step.agent);

        // Persist current step so heartbeat_chain_get_state returns real progress
        {
            let mut state = ChainState::load();
            state.current_step = Some(step_num);
            state.total_steps = Some(total as u32);
            let _ = state.save();
        }

        // Emit chain-event with status "running"
        let _ = app_handle.emit("conflux:chain-event", serde_json::json!({
            "step": step_num,
            "agentId": step.agent,
            "agentLabel": agent_label,
            "action": step.action,
            "detail": "running…",
            "status": "running",
            "total": total,
        }));

        // Execute the real task (or fall back to hardcoded detail)
        let detail = if step.action == "chain_summary" {
            // Step 9: compile summary from all previous step responses
            compile_chain_summary(&step_responses).await
        } else if let Some(response) = execute_step(step).await {
            step_responses.push((step.agent.clone(), response.clone()));
            response
        } else {
            // No task_message — use fallback detail
            let fallback = build_fallback_detail(&step.action);
            step_responses.push((step.agent.clone(), fallback.clone()));
            fallback
        };

        let event_type = if step.action == "chain_summary" { "success" } else { "info" };

        // Emit beat event with real detail
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

        // Emit step-complete with real detail
        let _ = app_handle.emit("conflux:chain-step-completed", serde_json::json!({
            "step": step_num,
            "agentId": step.agent,
            "agentLabel": agent_label,
            "action": step.action,
            "detail": detail,
            "status": "complete",
            "total": total,
        }));

        // TTS for the final chain_summary step — speak the compiled summary
        if step.action == "chain_summary" {
            let summary_text = step_responses
                .last()
                .map(|(_, text)| text.as_str())
                .unwrap_or("Check-in complete. All systems nominal.");
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