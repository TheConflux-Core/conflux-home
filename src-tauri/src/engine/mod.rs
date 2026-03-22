// Conflux Engine — Module Root
// The agent operating system. Everything ties together here.

pub mod db;
pub mod types;
pub mod router;
pub mod runtime;
pub mod tools;

use anyhow::Result;
use std::path::Path;

use db::EngineDb;

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

    // ── Convenience Methods ──

    /// Get all active agents.
    pub fn get_agents(&self) -> Result<Vec<types::Agent>> {
        self.db.get_active_agents()
    }

    /// Create a new session for an agent.
    pub fn create_session(&self, agent_id: &str, user_id: &str) -> Result<types::Session> {
        let session = self.db.create_session(agent_id, user_id)?;
        let _ = self.db.log_event("session_created", Some(agent_id), Some(&session.id), None);
        Ok(session)
    }

    /// Get recent sessions.
    pub fn get_sessions(&self, limit: i64) -> Result<Vec<types::Session>> {
        self.db.get_recent_sessions(limit)
    }

    /// Get messages for a session.
    pub fn get_messages(&self, session_id: &str, limit: i64) -> Result<Vec<types::Message>> {
        self.db.get_messages(session_id, limit)
    }

    /// Process a chat message (non-streaming).
    pub async fn chat(
        &self,
        session_id: &str,
        agent_id: &str,
        message: &str,
        max_tokens: Option<i64>,
    ) -> Result<router::ModelResponse> {
        runtime::process_turn(&self.db, session_id, agent_id, message, max_tokens).await
    }

    /// Process a chat message (streaming).
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

    /// Store a memory for an agent.
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

    /// Search agent memories.
    pub fn search_memory(&self, agent_id: &str, query: &str, limit: i64) -> Result<Vec<types::Memory>> {
        self.db.search_memory(agent_id, query, limit)
    }

    /// Get quota for a user today.
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

    /// Increment quota after a successful call.
    pub fn increment_quota(&self, user_id: &str, tokens: i64, provider_id: &str) -> Result<i64> {
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        self.db.increment_quota(user_id, &today, tokens, provider_id)
    }

    /// Check if user has remaining quota.
    pub fn has_quota(&self, user_id: &str) -> Result<bool> {
        let quota = self.get_quota(user_id)?;
        let limit: i64 = self.db.get_config("free_daily_limit")?
            .unwrap_or_else(|| "50".to_string())
            .parse()
            .unwrap_or(50);
        Ok(quota.calls_used < limit)
    }
}
