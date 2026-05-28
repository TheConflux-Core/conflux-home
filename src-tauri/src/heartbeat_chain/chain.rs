// Heartbeat Chain — Chain Execution Engine
// Runs the staggered sequence of agent steps after a heartbeat fires.
// Session 2: Each step now makes REAL LLM calls with tool execution.

use crate::heartbeat_chain::config::ChainStep;
use crate::heartbeat_chain::state::ChainState;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Emitter;

/// BeatEvent JSON emitted to frontend (matches BeatEvent TypeScript interface).
/// Session 6: Added tools_used and had_findings fields.
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
    /// Which tools the agent called during this step (Session 6)
    #[serde(rename = "toolsUsed", default)]
    pub tools_used: Vec<String>,
    /// Whether the agent found something noteworthy (Session 6)
    #[serde(rename = "hadFindings", default)]
    pub had_findings: bool,
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
/// Uses step prompt context when available, falls back to action name.
fn build_action_detail(step: &ChainStep) -> String {
    // If the step has a prompt, it's a real agent — return a dynamic placeholder
    // that will be replaced by the actual LLM response
    if !step.prompt.is_empty() {
        return format!("{} starting...", step.action.replace('_', " "));
    }
    // Legacy fallback for steps without prompts
    match step.action.as_str() {
        "sync_state"      => "State synchronized".to_string(),
        "security_scan"   => "Security scan running...".to_string(),
        "market_intel"    => "Checking market signals...".to_string(),
        "financial_pulse" => "Checking budget status...".to_string(),
        "vuln_scan"       => "Vulnerability scan running...".to_string(),
        "dream_progress"  => "Checking dream progress...".to_string(),
        "task_review"     => "Reviewing life autopilot...".to_string(),
        "kitchen_check"   => "Checking kitchen status...".to_string(),
        "wellness_check"  => "Wellness check-in...".to_string(),
        "chain_summary"   => "Compiling team summary...".to_string(),
        _ => format!("{} running...", step.action.replace('_', " ")),
    }
}

/// Detect the beat event type from LLM response text.
/// "warn" if contains warning keywords, "success" if positive, else "info".
fn detect_beat_type(response: &str) -> String {
    let lower = response.to_lowercase();

    // Warning signals
    let warn_keywords = [
        "⚠️", "alert", "attention", "at risk", "overdue", "expiring",
        "warning", "critical", "danger", "urgent", "concern", "issue",
        "vulnerability", "threat", "breach", "suspicious", "anomal",
        "needs attention", "behind", "falling behind", "over budget",
        "exceeding", "missing", "failed", "declined",
    ];
    for kw in &warn_keywords {
        if lower.contains(kw) {
            return "warn".to_string();
        }
    }

    // Success signals
    let success_keywords = [
        "all clear", "on track", "all good", "everything is good",
        "no issues", "no concerns", "no new", "nominal", "healthy",
        "doing well", "looking good", "on schedule", "within budget",
        "under budget", "no vulnerabilities", "defenses holding",
    ];
    for kw in &success_keywords {
        if lower.contains(kw) {
            return "success".to_string();
        }
    }

    "info".to_string()
}

/// Check if a response contains warning signals that warrant a notification.
fn has_warning_signal(response: &str) -> bool {
    let lower = response.to_lowercase();
    let signals = [
        "⚠️", "alert", "attention", "at risk", "overdue", "expiring",
        "warning", "critical", "urgent", "needs attention", "behind",
        "falling behind", "over budget", "exceeding",
    ];
    signals.iter().any(|s| lower.contains(s))
}

/// Extract the first sentence from a response for notification body.
fn first_sentence(text: &str) -> String {
    // Try to find the first sentence ending
    for (i, c) in text.char_indices() {
        if c == '.' || c == '!' || c == '?' || c == '\n' {
            let sentence = text[..=i].trim();
            if !sentence.is_empty() && sentence.len() <= 200 {
                return sentence.to_string();
            }
        }
    }
    // Fallback: first 200 chars
    let end = text.char_indices().nth(200).map(|(i, _)| i).unwrap_or(text.len());
    text[..end].trim().to_string()
}

/// Emit a beat event via Tauri IPC.
/// heartbeatGlobal.ts listens directly to Tauri for 'conflux:beat-event',
/// normalizes snake_case → camelCase, then emits to beatBus.
fn emit_beat(app_handle: &tauri::AppHandle, beat: &BeatEventJson) {
    if let Err(e) = app_handle.emit("conflux:beat-event", beat) {
        log::warn!("[HeartbeatChain] Failed to emit beat: {}", e);
    }
}

/// Emit a notification event via Tauri IPC.
/// The frontend listens for 'conflux:agent-notification' to show OS notifications.
fn emit_notification(app_handle: &tauri::AppHandle, title: &str, body: &str, agent_id: &str) {
    let payload = serde_json::json!({
        "title": title,
        "body": body,
        "agentId": agent_id,
        "timestamp": chrono::Utc::now().timestamp_millis(),
    });
    if let Err(e) = app_handle.emit("conflux:agent-notification", &payload) {
        log::warn!("[HeartbeatChain] Failed to emit notification: {}", e);
    }

    // OS notification is handled by the frontend via useNotificationListener
    // which catches 'conflux:agent-notification' — no direct call here to avoid doubles.
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

    // Get DB reference from the engine
    let db = match crate::engine::try_get_engine() {
        Some(engine) => engine.db().clone(),
        None => {
            log::error!("[HeartbeatChain] Engine not initialized — cannot run chain");
            return;
        }
    };

    // Collect summaries for the final notification
    let mut step_summaries: Vec<(String, String, String)> = Vec::new(); // (agent_id, emoji+name, first_sentence)
    let mut chain_has_warnings = false;

    // Load chain state for per-agent scheduling (Session 5)
    let mut chain_state = ChainState::load();
    let now_ms = chrono::Utc::now().timestamp_millis();

    // Clean up expired heartbeat memories (fire and forget)
    let _ = db.cleanup_expired_heartbeat_memories();

    let mut skipped_count: u32 = 0;
    let mut ran_count: u32 = 0;

    for (i, step) in steps.into_iter().enumerate() {
        let step_num = i as u32;
        let delay = step.delay_sec;

        if delay > 0 {
            tokio::time::sleep(std::time::Duration::from_secs(delay)).await;
        }

        let (agent_label, emoji, _color) = agent_info(&step.agent);

        // ── Smart scheduling: check if this step should run (Session 5) ──
        let last_run = chain_state.get_agent_last_run(&step.agent);
        let (should_run, skip_reason) = crate::heartbeat_chain::config::should_run_step(
            &step, last_run, now_ms,
        );

        if !should_run {
            log::info!(
                "[HeartbeatChain] Step {}/{}: {} — SKIP ({})",
                step_num + 1, total, step.agent, skip_reason
            );
            skipped_count += 1;

            // Emit a lightweight "skipped" beat event so the UI shows the agent was considered
            let skip_beat = BeatEventJson {
                id: format!("chain-skip-{}-{}", step_num, chrono::Utc::now().timestamp_millis()),
                agent_id: step.agent.clone(),
                agent_label: agent_label.to_string(),
                action: format!("{} — skipped", step.action.replace('_', " ")),
                detail: Some(skip_reason.clone()),
                event_type: "info".to_string(),
                timestamp: chrono::Utc::now().timestamp_millis(),
                tools_used: vec![],
                had_findings: false,
            };
            emit_beat(&app_handle, &skip_beat);

            // Emit step-complete for the chain timeline
            let _ = app_handle.emit("conflux:chain-step-completed", serde_json::json!({
                "step": step_num,
                "agentId": step.agent,
                "agentLabel": agent_label,
                "action": step.action,
                "detail": format!("Skipped — {}", skip_reason),
                "status": "complete",
                "total": total,
            }));
            continue;
        }

        let placeholder_detail = build_action_detail(&step);

        // Emit chain-event: step starting
        let _ = app_handle.emit("conflux:chain-event", serde_json::json!({
            "step": step_num,
            "agentId": step.agent,
            "agentLabel": agent_label,
            "action": step.action,
            "detail": placeholder_detail,
            "status": "running",
            "total": total,
        }));

        // ── Real LLM call if step has a prompt ──
        let (detail, event_type, tools_used, had_findings) = if !step.prompt.is_empty() {
            log::info!(
                "[HeartbeatChain] Step {}/{}: {} — calling LLM (timeout {}s)",
                step_num + 1, total, step.agent, step.timeout_secs
            );

            // For the chain_summary step, build cross-agent context from this cycle's findings
            let effective_prompt = if step.action == "chain_summary" && !step_summaries.is_empty() {
                let mut cycle_context = String::from("TEAM FINDINGS THIS CYCLE:\n");
                for (agent_id, name, summary) in &step_summaries {
                    if agent_id != "conflux" {
                        cycle_context.push_str(&format!("- {}: {}\n", name, summary));
                    }
                }
                // Also inject recent cross-agent memories for deeper context
                if let Ok(recent_memories) = db.get_recent_heartbeat_memories(20) {
                    if !recent_memories.is_empty() {
                        cycle_context.push_str("\nRECENT HEARTBEAT HISTORY:\n");
                        for mem in recent_memories.iter().take(10) {
                            let agent_display = agent_info(&mem.agent_id).0;
                            cycle_context.push_str(&format!(
                                "- [{}] {}: {}\n",
                                &mem.created_at[..10.min(mem.created_at.len())],
                                agent_display,
                                &mem.content[..mem.content.len().min(150)]
                            ));
                        }
                    }
                }
                format!("{}\n\n{}", cycle_context, step.prompt)
            } else {
                step.prompt.clone()
            };

            // Run the LLM turn with timeout
            let turn_result = tokio::time::timeout(
                std::time::Duration::from_secs(step.timeout_secs),
                crate::engine::runtime::process_heartbeat_turn(
                    &db,
                    &step.agent,
                    &effective_prompt,
                    &step.tools,
                    step.max_tokens,
                ),
            )
            .await;

            match turn_result {
                Ok(result) => {
                    let beat_type = detect_beat_type(&result.response);
                    let display_response = if result.response.len() > 500 {
                        format!("{}...", &result.response[..result.response.char_indices().nth(500).map(|(i, _)| i).unwrap_or(result.response.len())])
                    } else {
                        result.response.clone()
                    };

                    let tools_used = result.tool_calls_made.clone();
                    let had_findings = has_warning_signal(&result.response)
                        || crate::engine::memory::extract_heartbeat_finding(
                            &db,
                            &step.agent,
                            &step.action,
                            &result.response,
                            &result.tool_calls_made,
                        );

                    log::info!(
                        "[HeartbeatChain] Step {}/{}: {} — {} (type={}, tools={:?}, findings={})",
                        step_num + 1, total, step.agent,
                        if result.success { "OK" } else { "fallback" },
                        beat_type,
                        tools_used,
                        had_findings
                    );

                    // Check for warning signals → emit notification
                    if has_warning_signal(&result.response) {
                        chain_has_warnings = true;
                        let title = format!("{} {}", emoji, agent_label);
                        let body = first_sentence(&result.response);
                        emit_notification(&app_handle, &title, &body, &step.agent);
                    }

                    // Store for summary notification
                    step_summaries.push((
                        step.agent.clone(),
                        format!("{} {}", emoji, agent_label),
                        first_sentence(&result.response),
                    ));

                    (display_response, beat_type, tools_used, had_findings)
                }
                Err(_) => {
                    // Timeout
                    log::warn!(
                        "[HeartbeatChain] Step {}/{}: {} — TIMEOUT after {}s",
                        step_num + 1, total, step.agent, step.timeout_secs
                    );
                    let fallback = format!(
                        "{} timed out after {}s — will try again next cycle.",
                        agent_label, step.timeout_secs
                    );
                    step_summaries.push((
                        step.agent.clone(),
                        format!("{} {}", emoji, agent_label),
                        "Timed out".to_string(),
                    ));
                    (fallback, "info".to_string(), vec![], false)
                }
            }
        } else {
            // No prompt — legacy step, use placeholder
            (placeholder_detail.clone(), if step.action == "chain_summary" { "success".to_string() } else { "info".to_string() }, vec![], false)
        };

        // Emit beat event with REAL response (Session 6: includes tools_used + had_findings)
        let beat = BeatEventJson {
            id: format!("chain-step-{}-{}", step_num, chrono::Utc::now().timestamp_millis()),
            agent_id: step.agent.clone(),
            agent_label: agent_label.to_string(),
            action: step.action.replace('_', " "),
            detail: Some(detail.clone()),
            event_type: event_type.clone(),
            timestamp: chrono::Utc::now().timestamp_millis(),
            tools_used: tools_used.clone(),
            had_findings,
        };
        emit_beat(&app_handle, &beat);

        // Record that this agent ran (Session 5 — smart scheduling)
        chain_state.record_agent_run(&step.agent);
        ran_count += 1;

        // Emit step-complete
        let _ = app_handle.emit("conflux:chain-step-completed", serde_json::json!({
            "step": step_num,
            "agentId": step.agent,
            "agentLabel": agent_label,
            "action": step.action,
            "detail": detail,
            "status": "complete",
            "total": total,
        }));

        // TTS for the final chain_summary step
        if step.action == "chain_summary" {
            // Use the actual LLM response for TTS, not a hardcoded string
            let tts_text = if !step.prompt.is_empty() && !detail.contains("starting...") {
                detail.clone()
            } else {
                "Check-in complete. Your team has finished their cycle. All systems nominal.".to_string()
            };
            call_tts_speak(&tts_text, step.voice_id.as_deref()).await;

            let final_beat = BeatEventJson {
                id: format!("chain-done-{}", chrono::Utc::now().timestamp_millis()),
                agent_id: "conflux".to_string(),
                agent_label: "Conflux".to_string(),
                action: "check-in complete".to_string(),
                detail: Some("Full cycle done — all agents checked in".to_string()),
                event_type: "success".to_string(),
                timestamp: chrono::Utc::now().timestamp_millis(),
                tools_used: vec![],
                had_findings: false,
            };
            emit_beat(&app_handle, &final_beat);
        }

        log::info!(
            "[HeartbeatChain] Step {}/{}: {} · {}",
            step_num + 1, total, step.agent, step.action
        );
    }

    // ── Summary notification ──
    if !step_summaries.is_empty() {
        let (title, body) = if chain_has_warnings {
            // Summarize warnings
            let warning_agents: Vec<&str> = step_summaries
                .iter()
                .filter(|(_, _, s)| s != "Timed out" && (s.to_lowercase().contains("attention") || s.to_lowercase().contains("alert") || s.to_lowercase().contains("overdue") || s.to_lowercase().contains("at risk") || s.to_lowercase().contains("warning")))
                .map(|(_, name, _)| name.as_str())
                .collect();
            if warning_agents.is_empty() {
                ("🤖 Team Check-in Complete".to_string(), format!("{} agents reported in.", step_summaries.len()))
            } else {
                ("⚠️ Team Alert".to_string(), format!("{} need attention: {}", warning_agents.len(), warning_agents.join(", ")))
            }
        } else {
            ("🤖 Team Check-in Complete".to_string(), format!("{} agents reported in — all clear.", step_summaries.len()))
        };
        emit_notification(&app_handle, &title, &body, "conflux");
    }

    // Save chain state — merge the legacy ChainState fields with our per-agent tracking
    // into a single save to avoid clobbering agent_last_run data
    let mut legacy_state = ChainState::load();
    legacy_state.end_chain();
    // Transfer per-agent tracking from our working copy into the legacy state
    legacy_state.agent_last_run = chain_state.agent_last_run;
    legacy_state.last_cycle_tokens = chain_state.last_cycle_tokens;
    let _ = legacy_state.save();

    let _ = app_handle.emit("conflux:chain-complete", serde_json::json!({ "total": total }));
    let _ = app_handle.emit("conflux:chain-event", serde_json::json!({
        "status": "complete",
        "total": total,
    }));
    log::info!(
        "[HeartbeatChain] Chain complete — {} ran, {} skipped ({} total)",
        ran_count, skipped_count, total
    );
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
