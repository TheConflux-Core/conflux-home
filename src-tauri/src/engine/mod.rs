// Conflux Engine — Module Root
// The agent operating system. Everything ties together here.

pub mod db;
pub mod types;
pub mod router;
pub mod runtime;
pub mod tools;
pub mod memory;
pub mod google;
pub mod cron;

pub use db::EngineDb;

use anyhow::Result;
use std::path::Path;
use std::sync::OnceLock;

/// Global engine instance.
static ENGINE: OnceLock<ConfluxEngine> = OnceLock::new();

/// Get the global engine instance.
pub fn get_engine() -> &'static ConfluxEngine {
    ENGINE.get().expect("Conflux Engine not initialized")
}

/// Initialize the global engine. Call once during app setup.
pub fn init_engine(db_path: &Path) -> Result<()> {
    let engine = ConfluxEngine::new(db_path)?;

    // Load provider API keys from config
    // Free providers ship with built-in keys (already active)
    // Paid providers require user configuration
    match engine.db.get_config("openai_api_key") {
        Ok(Some(key)) if !key.is_empty() => {
            router::configure_provider("openai-gpt4o", &key).ok();
            router::configure_provider("openai-gpt4o-mini", &key).ok();
            log::info!("[Engine] OpenAI API key loaded");
        }
        _ => {}
    }
    match engine.db.get_config("anthropic_api_key") {
        Ok(Some(key)) if !key.is_empty() => {
            router::configure_provider("anthropic-claude-sonnet", &key).ok();
            router::configure_provider("anthropic-claude-opus", &key).ok();
            log::info!("[Engine] Anthropic API key loaded");
        }
        _ => {}
    }
    match engine.db.get_config("xiaomi_api_key") {
        Ok(Some(key)) if !key.is_empty() => {
            router::configure_provider("xiaomi-mimo-flash", &key).ok();
            router::configure_provider("xiaomi-mimo-pro", &key).ok();
            log::info!("[Engine] Xiaomi API key loaded");
        }
        _ => {
            log::info!("[Engine] No paid provider keys configured — Core tier only (free models)");
        }
    }

    ENGINE.set(engine)
        .map_err(|_| anyhow::anyhow!("Engine already initialized"))?;
    Ok(())
}

/// The Conflux Engine — manages all agent state and inference.
pub struct ConfluxEngine {
    db: EngineDb,
}

impl std::fmt::Debug for ConfluxEngine {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ConfluxEngine").finish()
    }
}

impl ConfluxEngine {
    /// Initialize the engine with a database file path.
    pub fn new(db_path: &Path) -> Result<Self> {
        let db = EngineDb::open(db_path)?;

        // Rebuild FTS index for existing memories (idempotent)
        match db.rebuild_memory_fts() {
            Ok(count) => log::info!("Memory FTS index: {} entries", count),
            Err(e) => log::warn!("Memory FTS rebuild failed: {}", e),
        }

        log::info!("Conflux Engine initialized at {:?}", db_path);
        Ok(ConfluxEngine { db })
    }

    /// Initialize with in-memory database (for testing).
    pub fn new_in_memory() -> Result<Self> {
        let db = EngineDb::open_in_memory()?;
        Ok(ConfluxEngine { db })
    }

    /// Get a reference to the database.
    pub fn db(&self) -> &EngineDb {
        &self.db
    }

    // ── Agents ──

    pub fn get_agents(&self) -> Result<Vec<types::Agent>> {
        self.db.get_active_agents()
    }

    pub fn update_agent(
        &self,
        id: &str,
        name: Option<&str>,
        emoji: Option<&str>,
        role: Option<&str>,
        soul: Option<&str>,
        instructions: Option<&str>,
        model_alias: Option<&str>,
    ) -> Result<()> {
        self.db.update_agent(id, name, emoji, role, soul, instructions, model_alias)
    }

    // ── Sessions ──

    pub fn create_session(&self, agent_id: &str, user_id: &str) -> Result<types::Session> {
        let session = self.db.create_session(agent_id, user_id)?;
        let _ = self.db.log_event("session_created", Some(agent_id), Some(&session.id), None);
        Ok(session)
    }

    pub fn get_sessions(&self, limit: i64) -> Result<Vec<types::Session>> {
        self.db.get_recent_sessions(limit)
    }

    pub fn get_messages(&self, session_id: &str, limit: i64) -> Result<Vec<types::Message>> {
        self.db.get_messages(session_id, limit)
    }

    // ── Chat ──

    pub async fn chat(
        &self,
        session_id: &str,
        agent_id: &str,
        message: &str,
        max_tokens: Option<i64>,
    ) -> Result<router::ModelResponse> {
        runtime::process_turn(&self.db, session_id, agent_id, message, max_tokens).await
    }

    pub async fn chat_stream(
        &self,
        session_id: &str,
        agent_id: &str,
        message: &str,
        max_tokens: Option<i64>,
        on_chunk: &mut dyn FnMut(&str) -> Result<()>,
    ) -> Result<router::ModelResponse> {
        runtime::process_turn_stream(&self.db, session_id, agent_id, message, max_tokens, on_chunk).await
    }

    // ── Memory ──

    pub fn store_memory(
        &self,
        agent_id: &str,
        memory_type: &str,
        key: Option<&str>,
        content: &str,
        source: Option<&str>,
    ) -> Result<String> {
        self.db.store_memory(agent_id, memory_type, key, content, source)
    }

    pub fn search_memory(&self, agent_id: &str, query: &str, limit: i64) -> Result<Vec<types::Memory>> {
        self.db.search_memory(agent_id, query, limit)
    }

    pub fn get_all_memories(&self, agent_id: &str, limit: i64) -> Result<Vec<types::Memory>> {
        self.db.get_all_memories(agent_id, limit)
    }

    pub fn delete_memory(&self, memory_id: &str) -> Result<()> {
        self.db.delete_memory(memory_id)
    }

    // ── Providers ──

    pub fn get_providers(&self) -> Result<Vec<types::ProviderConfig>> {
        self.db.get_providers()
    }

    pub fn update_provider(
        &self,
        id: &str,
        name: &str,
        base_url: &str,
        api_key: &str,
        model_id: &str,
        model_alias: &str,
        priority: i32,
        is_enabled: bool,
    ) -> Result<()> {
        self.db.upsert_provider(id, name, base_url, api_key, model_id, model_alias, priority, is_enabled)
    }

    pub fn delete_provider(&self, id: &str) -> Result<()> {
        self.db.delete_provider(id)
    }

    // ── Provider Templates ──

    pub fn get_provider_templates(&self) -> Result<Vec<types::ProviderTemplate>> {
        self.db.get_provider_templates()
    }

    pub fn install_provider_template(&self, template_id: &str, api_key: Option<&str>, model: Option<&str>) -> Result<String> {
        let template = self.db.get_provider_template(template_id)?
            .ok_or_else(|| anyhow::anyhow!("Template not found: {}", template_id))?;

        // Free tier doesn't need installation (already active)
        if template.is_free {
            return Ok("Free tier is already active.".to_string());
        }

        let key = api_key.unwrap_or("");
        if key.is_empty() {
            anyhow::bail!("API key is required for {}", template.name);
        }

        let model_id = model.unwrap_or(&template.default_model);
        let provider_id = format!("{}-user", template_id);

        self.db.upsert_provider(
            &provider_id,
            &template.name,
            &template.base_url,
            key,
            model_id,
            &template.model_alias,
            10, // lower priority than built-in providers
            true,
        )?;

        Ok(format!("{} connected with model {}", template.name, model_id))
    }

    pub fn is_template_installed(&self, template_id: &str) -> Result<bool> {
        self.db.check_template_installed(template_id)
    }

    // ── Provider API Keys ──

    /// Set the OpenAI API key. Stores in DB and configures the router.
    pub fn set_openai_key(&self, api_key: &str) -> Result<()> {
        self.db.set_config("openai_api_key", api_key)?;
        if !api_key.is_empty() {
            router::configure_provider("openai-gpt4o", api_key)?;
            router::configure_provider("openai-gpt4o-mini", api_key)?;
        }
        log::info!("[Engine] OpenAI API key updated");
        Ok(())
    }

    /// Set the Anthropic API key. Stores in DB and configures the router.
    pub fn set_anthropic_key(&self, api_key: &str) -> Result<()> {
        self.db.set_config("anthropic_api_key", api_key)?;
        if !api_key.is_empty() {
            router::configure_provider("anthropic-claude-sonnet", api_key)?;
            router::configure_provider("anthropic-claude-opus", api_key)?;
        }
        log::info!("[Engine] Anthropic API key updated");
        Ok(())
    }

    /// Set the Xiaomi (MiMo) API key. Stores in DB and configures the router.
    pub fn set_xiaomi_key(&self, api_key: &str) -> Result<()> {
        self.db.set_config("xiaomi_api_key", api_key)?;
        if !api_key.is_empty() {
            router::configure_provider("xiaomi-mimo-flash", api_key)?;
            router::configure_provider("xiaomi-mimo-pro", api_key)?;
        }
        log::info!("[Engine] Xiaomi API key updated");
        Ok(())
    }

    /// Get a masked API key for display.
    fn get_key_masked(&self, config_key: &str) -> Result<String> {
        match self.db.get_config(config_key)? {
            Some(key) if key.len() > 8 => Ok(format!("{}...{}", &key[..4], &key[key.len()-4..])),
            Some(_) => Ok("••••".to_string()),
            None => Ok(String::new()),
        }
    }

    pub fn get_openai_key_masked(&self) -> Result<String> {
        self.get_key_masked("openai_api_key")
    }

    pub fn get_anthropic_key_masked(&self) -> Result<String> {
        self.get_key_masked("anthropic_api_key")
    }

    pub fn get_xiaomi_key_masked(&self) -> Result<String> {
        self.get_key_masked("xiaomi_api_key")
    }

    /// Get the list of all router providers (for display in settings).
    pub fn get_router_providers(&self) -> Vec<router::ModelProvider> {
        router::get_all_providers()
    }

    // ── Agent Capabilities & Permissions ──

    pub fn get_agent_capabilities(&self, agent_id: &str) -> Result<Vec<types::AgentCapability>> {
        self.db.get_agent_capabilities(agent_id)
    }

    pub fn find_agents_by_capability(&self, capability: &str) -> Result<Vec<String>> {
        self.db.find_agents_by_capability(capability)
    }

    pub fn get_agent_permissions(&self, agent_id: &str) -> Result<Option<types::AgentPermission>> {
        self.db.get_agent_permissions(agent_id)
    }

    pub fn can_agent_talk_to(&self, from: &str, to: &str) -> Result<bool> {
        self.db.can_agent_talk_to(from, to)
    }

    // ── Inter-Agent Communication ──

    pub async fn agent_ask(&self, from_agent: &str, to_agent: &str, question: &str, session_id: Option<&str>) -> Result<String> {
        // Check permissions
        if !self.can_agent_talk_to(from_agent, to_agent)? {
            anyhow::bail!("{} does not have permission to talk to {}", from_agent, to_agent);
        }

        // Log the communication
        let comm_id = self.db.create_communication(from_agent, to_agent, "ask", question, session_id)?;

        // Create a temporary session for the target agent
        let temp_session = self.db.create_session(to_agent, "system")?;

        // Build anti-hallucination preamble for the target agent
        let verified_question = format!(
            "You have been asked a question by {} (communication ID: {}).\n\
             ANTI-HALLUCINATION RULES:\n\
             - Read actual data before answering. Never invent information.\n\
             - If you cannot verify something, say 'I cannot verify this.'\n\
             - If you use tools, report the actual tool results, not summaries.\n\
             - State your confidence level (high/medium/low) for factual claims.\n\n\
             Question from {}:\n{}",
            from_agent, comm_id, from_agent, question
        );

        // Process through the runtime's async process_turn
        let response = runtime::process_turn(&self.db, &temp_session.id, to_agent, &verified_question, None).await?;

        // Complete the communication
        self.db.complete_communication(&comm_id, &response.content, response.tokens_used)?;

        Ok(response.content)
    }

    // ── Verification (Anti-Hallucination Enforcement) ──

    pub fn create_verification_claim(&self, agent_id: &str, session_id: Option<&str>, claim_type: &str, claim: &str) -> Result<String> {
        self.db.create_verification(agent_id, session_id, claim_type, claim)
    }

    pub fn complete_verification_claim(&self, id: &str, verified_by: &str, result: &str, evidence: Option<&str>) -> Result<()> {
        self.db.complete_verification(id, verified_by, result, evidence)
    }

    pub fn get_unverified_claims(&self, agent_id: Option<&str>) -> Result<Vec<types::VerificationRecord>> {
        self.db.get_unverified_claims(agent_id)
    }

    // ── Tasks ──

    pub fn create_task(&self, title: &str, description: Option<&str>, agent_id: &str, created_by: &str, priority: &str, requires_verify: bool) -> Result<String> {
        // Check if creator can create tasks
        let perms = self.db.get_agent_permissions(created_by)?;
        if let Some(p) = perms {
            if !p.can_create_tasks {
                anyhow::bail!("{} does not have permission to create tasks", created_by);
            }
        }
        self.db.create_task(title, description, agent_id, created_by, priority, requires_verify)
    }

    pub fn update_task_status(&self, task_id: &str, status: &str, result: Option<&str>) -> Result<()> {
        self.db.update_task_status(task_id, status, result)
    }

    pub fn get_task(&self, task_id: &str) -> Result<Option<types::Task>> {
        self.db.get_task(task_id)
    }

    pub fn get_tasks_for_agent(&self, agent_id: &str, status_filter: Option<&str>) -> Result<Vec<types::Task>> {
        self.db.get_tasks_for_agent(agent_id, status_filter)
    }

    // ── Lessons Learned ──

    pub fn add_lesson(&self, agent_id: Option<&str>, category: &str, lesson: &str, evidence: Option<&str>, action: Option<&str>) -> Result<String> {
        self.db.add_lesson(agent_id, category, lesson, evidence, action)
    }

    pub fn get_active_lessons(&self, category: Option<&str>) -> Result<Vec<types::LessonLearned>> {
        self.db.get_active_lessons(category)
    }

    // ── Cron Jobs ──

    pub fn create_cron_job(&self, name: &str, agent_id: &str, schedule: &str, timezone: &str, task_message: &str) -> Result<String> {
        let id = self.db.create_cron_job(name, agent_id, schedule, timezone, task_message)?;

        // Compute initial next run time
        if let Some(next) = cron::next_run(schedule, chrono::Utc::now()) {
            let next_str = next.format("%Y-%m-%dT%H:%M:%SZ").to_string();
            self.db.update_cron_next_run(&id, &next_str)?;
        }

        // Emit event
        self.db.emit_event("cron_created", Some("system"), None, Some(&serde_json::json!({"id": id, "name": name}).to_string()))?;

        Ok(id)
    }

    pub fn get_cron_jobs(&self, enabled_only: bool) -> Result<Vec<types::CronJob>> {
        self.db.get_cron_jobs(enabled_only)
    }

    pub fn toggle_cron_job(&self, id: &str, enabled: bool) -> Result<()> {
        self.db.toggle_cron_job(id, enabled)
    }

    pub fn delete_cron_job(&self, id: &str) -> Result<()> {
        self.db.delete_cron_job(id)
    }

    /// Run any due cron jobs. Call this from the background scheduler.
    pub async fn tick_cron(&self) -> Result<i64> {
        let due_jobs = self.db.get_due_cron_jobs()?;
        let mut executed = 0i64;

        for job in due_jobs {
            log::info!("[Cron] Running job '{}' ({}) → agent {}", job.name, job.id, job.agent_id);

            // Create a temp session for this cron run
            let session = match self.db.create_session(&job.agent_id, "cron") {
                Ok(s) => s,
                Err(e) => {
                    log::error!("[Cron] Failed to create session for {}: {}", job.id, e);
                    let _ = self.db.update_cron_run(&job.id, "error", 0, Some(&e.to_string()));
                    continue;
                }
            };

            // Inject anti-hallucination preamble
            let message = format!(
                "SCHEDULED TASK (cron: {}):\n{}\n\n\
                 ANTI-HALLUCINATION RULES:\n\
                 - This is a scheduled autonomous task.\n\
                 - Read actual data before reporting results.\n\
                 - If the task cannot be completed, explain why honestly.\n\
                 - Log what you did in the session for audit purposes.",
                job.schedule, job.task_message
            );

            // Execute through the runtime
            match runtime::process_turn(&self.db, &session.id, &job.agent_id, &message, None).await {
                Ok(response) => {
                    let tokens = response.tokens_used;
                    let _ = self.db.update_cron_run(&job.id, "success", tokens, None);
                    self.db.emit_event("cron_fired", Some(&job.agent_id), None,
                        Some(&serde_json::json!({"job_id": job.id, "tokens": tokens}).to_string()))?;
                }
                Err(e) => {
                    log::error!("[Cron] Job {} failed: {}", job.id, e);
                    let _ = self.db.update_cron_run(&job.id, "error", 0, Some(&e.to_string()));
                    self.db.emit_event("cron_error", Some(&job.agent_id), None,
                        Some(&serde_json::json!({"job_id": job.id, "error": e.to_string()}).to_string()))?;
                }
            }

            executed += 1;
        }

        Ok(executed)
    }

    // ── Webhooks ──

    pub fn create_webhook(&self, name: &str, agent_id: &str, path: &str, secret: Option<&str>, task_template: &str) -> Result<String> {
        self.db.create_webhook(name, agent_id, path, secret, task_template)
    }

    pub fn get_webhooks(&self) -> Result<Vec<types::Webhook>> {
        self.db.get_webhooks()
    }

    pub fn delete_webhook(&self, id: &str) -> Result<()> {
        self.db.delete_webhook(id)
    }

    /// Process an incoming webhook request. Returns the agent's response.
    pub async fn handle_webhook(&self, path: &str, body: &str, auth_header: Option<&str>) -> Result<String> {
        let webhook = self.db.get_webhook_by_path(path)?
            .ok_or_else(|| anyhow::anyhow!("No webhook registered for path: {}", path))?;

        // Verify secret if set
        if let Some(ref secret) = webhook.secret {
            let provided = auth_header.unwrap_or("");
            if provided != secret {
                anyhow::bail!("Webhook auth failed for path: {}", path);
            }
        }

        // Record the call
        self.db.record_webhook_call(path)?;

        // Build message from template
        let message = webhook.task_template
            .replace("{{body}}", body)
            .replace("{{path}}", path);

        // Add anti-hallucination preamble
        let full_message = format!(
            "WEBHOOK TRIGGER ({}):\n{}\n\n\
             ANTI-HALLUCINATION RULES:\n\
             - This was triggered by an external webhook.\n\
             - Process the payload data accurately.\n\
             - If you take any actions, report them with evidence.",
            webhook.name, message
        );

        // Execute through the runtime
        let session = self.db.create_session(&webhook.agent_id, "webhook")?;
        let response = runtime::process_turn(&self.db, &session.id, &webhook.agent_id, &full_message, None).await?;

        // Emit event
        self.db.emit_event("webhook_fired", Some(&webhook.agent_id), None,
            Some(&serde_json::json!({"path": path, "tokens": response.tokens_used}).to_string()))?;

        Ok(response.content)
    }

    // ── Events ──

    pub fn emit_event(&self, event_type: &str, source: Option<&str>, target: Option<&str>, payload: Option<&str>) -> Result<String> {
        self.db.emit_event(event_type, source, target, payload)
    }

    pub fn get_unprocessed_events(&self, target_agent: Option<&str>) -> Result<Vec<types::Event>> {
        self.db.get_unprocessed_events(target_agent)
    }

    pub fn mark_event_processed(&self, id: &str) -> Result<()> {
        self.db.mark_event_processed(id)
    }

    pub fn cleanup_old_events(&self, days: i64) -> Result<i64> {
        self.db.cleanup_old_events(days)
    }

    // ── Heartbeats ──

    pub fn record_heartbeat(&self, check_name: &str, status: &str, details: Option<&str>) -> Result<String> {
        self.db.record_heartbeat(check_name, status, details)
    }

    pub fn get_latest_heartbeats(&self) -> Result<Vec<types::HeartbeatRecord>> {
        self.db.get_latest_heartbeats()
    }

    /// Run all health checks and record results.
    pub fn run_health_checks(&self) -> Result<serde_json::Value> {
        let mut results = serde_json::Map::new();

        // 1. Database health
        match self.db.conn().execute("SELECT 1", []) {
            Ok(_) => {
                self.db.record_heartbeat("database", "ok", None)?;
                results.insert("database".into(), serde_json::json!("ok"));
            }
            Err(e) => {
                self.db.record_heartbeat("database", "error", Some(&e.to_string()))?;
                results.insert("database".into(), serde_json::json!({"error": e.to_string()}));
            }
        }

        // 2. Provider health (check if any providers are configured)
        match self.db.get_providers() {
            Ok(providers) if !providers.is_empty() => {
                let enabled = providers.iter().filter(|p| p.is_enabled).count();
                self.db.record_heartbeat("providers", "ok", Some(&serde_json::json!({
                    "total": providers.len(),
                    "enabled": enabled
                }).to_string()))?;
                results.insert("providers".into(), serde_json::json!({"total": providers.len(), "enabled": enabled}));
            }
            Ok(_) => {
                self.db.record_heartbeat("providers", "warning", Some("No providers configured"))?;
                results.insert("providers".into(), serde_json::json!("warning: no providers"));
            }
            Err(e) => {
                self.db.record_heartbeat("providers", "error", Some(&e.to_string()))?;
                results.insert("providers".into(), serde_json::json!({"error": e.to_string()}));
            }
        }

        // 3. Scheduler health (count active cron jobs)
        match self.db.get_cron_jobs(true) {
            Ok(jobs) => {
                self.db.record_heartbeat("scheduler", "ok", Some(&serde_json::json!({"active_jobs": jobs.len()}).to_string()))?;
                results.insert("scheduler".into(), serde_json::json!({"active_jobs": jobs.len()}));
            }
            Err(e) => {
                self.db.record_heartbeat("scheduler", "error", Some(&e.to_string()))?;
                results.insert("scheduler".into(), serde_json::json!({"error": e.to_string()}));
            }
        }

        // 4. Agent health (count active agents)
        match self.db.get_active_agents() {
            Ok(agents) => {
                self.db.record_heartbeat("agents", "ok", Some(&serde_json::json!({"active": agents.len()}).to_string()))?;
                results.insert("agents".into(), serde_json::json!({"active": agents.len()}));
            }
            Err(e) => {
                self.db.record_heartbeat("agents", "error", Some(&e.to_string()))?;
                results.insert("agents".into(), serde_json::json!({"error": e.to_string()}));
            }
        }

        Ok(serde_json::Value::Object(results))
    }

    // ── Skills ──

    pub fn get_skills(&self, active_only: bool) -> Result<Vec<types::Skill>> {
        self.db.get_skills(active_only)
    }

    pub fn get_skill(&self, id: &str) -> Result<Option<types::Skill>> {
        self.db.get_skill(id)
    }

    pub fn get_skills_for_agent(&self, agent_id: &str) -> Result<Vec<types::Skill>> {
        self.db.get_skills_for_agent(agent_id)
    }

    /// Build the skill instructions block for an agent's system prompt.
    /// This is called by the runtime when assembling context.
    pub fn build_skill_context(&self, agent_id: &str) -> Result<String> {
        let skills = self.db.get_skills_for_agent(agent_id)?;
        if skills.is_empty() {
            return Ok(String::new());
        }

        let mut ctx = String::from("\n## ACTIVE SKILLS\n\n");
        for skill in &skills {
            ctx.push_str(&format!("### {} {} (v{})\n", skill.emoji, skill.name, skill.version));
            ctx.push_str(&skill.instructions);
            ctx.push_str("\n\n");
        }

        // Add required permissions check
        let mut needed_tools: Vec<String> = Vec::new();
        for skill in &skills {
            if let Some(ref perms) = skill.permissions {
                if let Ok(tools) = serde_json::from_str::<Vec<String>>(perms) {
                    for tool in tools {
                        if !needed_tools.contains(&tool) {
                            needed_tools.push(tool);
                        }
                    }
                }
            }
        }

        if !needed_tools.is_empty() {
            ctx.push_str(&format!("Skills require tools: {}\n\n", needed_tools.join(", ")));
        }

        Ok(ctx)
    }

    pub fn install_skill_from_json(&self, json: &str) -> Result<String> {
        let manifest: serde_json::Value = serde_json::from_str(json)?;

        let id = manifest["id"].as_str().ok_or_else(|| anyhow::anyhow!("Missing 'id' in skill manifest"))?;
        let name = manifest["name"].as_str().ok_or_else(|| anyhow::anyhow!("Missing 'name'"))?;
        let instructions = manifest["instructions"].as_str()
            .ok_or_else(|| anyhow::anyhow!("Missing 'instructions'"))?;

        let emoji = manifest["emoji"].as_str().unwrap_or("🔌");
        let version = manifest["version"].as_str().unwrap_or("1.0.0");
        let description = manifest["description"].as_str();
        let author = manifest["author"].as_str();
        let triggers = manifest["triggers"].as_str().map(|s| s.to_string())
            .or_else(|| if manifest["triggers"].is_null() { None } else { Some(manifest["triggers"].to_string()) });
        let agents = manifest["agents"].as_str().map(|s| s.to_string())
            .unwrap_or_else(|| if manifest["agents"].is_null() { "*".to_string() } else { manifest["agents"].to_string() });
        let permissions = manifest["permissions"].as_str().map(|s| s.to_string())
            .or_else(|| if manifest["permissions"].is_null() { None } else { Some(manifest["permissions"].to_string()) });

        self.db.install_skill(id, name, description, emoji, version, author, instructions, triggers.as_deref(), &agents, permissions.as_deref(), "local", Some(json))?;

        // Emit event
        self.db.emit_event("skill_installed", Some("system"), None,
            Some(&serde_json::json!({"id": id, "name": name}).to_string()))?;

        Ok(id.to_string())
    }

    pub fn toggle_skill(&self, id: &str, active: bool) -> Result<()> {
        self.db.toggle_skill(id, active)
    }

    pub fn uninstall_skill(&self, id: &str) -> Result<()> {
        self.db.uninstall_skill(id)
    }

    pub fn test_provider(&self, id: &str) -> Result<router::ModelResponse> {
        // Run a test call using the tier-based router
        let rt = tokio::runtime::Runtime::new()?;
        rt.block_on(async {
            let messages = vec![router::OpenAIMessage {
                role: "user".to_string(),
                content: Some("Say 'hello' in one word.".to_string()),
                tool_call_id: None,
                tool_calls: None,
            }];

            // Test by calling through the core tier
            router::chat("core", messages, Some(50), None, None).await
        })
    }

    // ── Quota ──

    pub fn get_quota(&self, user_id: &str) -> Result<types::QuotaRecord> {
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        match self.db.get_quota(user_id, &today)? {
            Some(q) => Ok(q),
            None => Ok(types::QuotaRecord {
                user_id: user_id.to_string(),
                date: today,
                calls_used: 0,
                tokens_used: 0,
                providers_used: None,
            }),
        }
    }

    pub fn increment_quota(&self, user_id: &str, tokens: i64, provider_id: &str) -> Result<i64> {
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        self.db.increment_quota(user_id, &today, tokens, provider_id)
    }

    pub fn has_quota(&self, user_id: &str) -> Result<bool> {
        let quota = self.get_quota(user_id)?;
        let limit: i64 = self.db.get_config("free_daily_limit")?
            .unwrap_or_else(|| "50".to_string())
            .parse()
            .unwrap_or(50);
        Ok(quota.calls_used < limit)
    }
}
