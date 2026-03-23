// Conflux Engine — Module Root
// The agent operating system. Everything ties together here.

pub mod db;
pub mod types;
pub mod router;
pub mod runtime;
pub mod tools;
pub mod memory;
pub mod google;

use anyhow::Result;
use std::path::Path;
use std::sync::OnceLock;

use db::EngineDb;

/// Global engine instance.
static ENGINE: OnceLock<ConfluxEngine> = OnceLock::new();

/// Get the global engine instance.
pub fn get_engine() -> &'static ConfluxEngine {
    ENGINE.get().expect("Conflux Engine not initialized")
}

/// Initialize the global engine. Call once during app setup.
pub fn init_engine(db_path: &Path) -> Result<()> {
    let engine = ConfluxEngine::new(db_path)?;
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

    pub fn test_provider(&self, id: &str) -> Result<router::ModelResponse> {
        // Run a synchronous test call through the provider
        let rt = tokio::runtime::Runtime::new()?;
        rt.block_on(async {
            let messages = vec![router::OpenAIMessage {
                role: "user".to_string(),
                content: Some("Say 'hello' in one word.".to_string()),
                tool_call_id: None,
                tool_calls: None,
            }];

            // Get the provider directly
            let provider = self.db.get_provider(id)?
                .ok_or_else(|| anyhow::anyhow!("Provider not found: {}", id))?;

            // Make a direct request
            router::chat_with_provider(&provider, messages, Some(50)).await
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
