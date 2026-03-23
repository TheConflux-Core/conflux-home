// Conflux Engine — Database Layer
// SQLite-backed persistent storage. Single source of truth.

use anyhow::{Context, Result};
use rusqlite::{Connection, params};
use std::path::Path;
use std::sync::{Arc, Mutex};

/// The embedded database. Thread-safe via Mutex.
pub struct EngineDb {
    conn: Arc<Mutex<Connection>>,
}

impl EngineDb {
    /// Open or create the database at the given path.
    /// Runs migrations automatically.
    pub fn open(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)
            .context("Failed to open database")?;

        // Enable WAL mode for better concurrent read performance
        conn.pragma_update(None, "journal_mode", "WAL")
            .context("Failed to set WAL mode")?;

        // Enable foreign keys
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;

        let db = EngineDb {
            conn: Arc::new(Mutex::new(conn)),
        };

        db.migrate()?;
        Ok(db)
    }

    /// Open an in-memory database (for testing).
    pub fn open_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()
            .context("Failed to open in-memory database")?;

        conn.execute_batch("PRAGMA foreign_keys = ON;")?;

        let db = EngineDb {
            conn: Arc::new(Mutex::new(conn)),
        };

        db.migrate()?;
        Ok(db)
    }

    /// Run the schema migration.
    fn migrate(&self) -> Result<()> {
        let schema = include_str!("../../schema.sql");
        let conn = self.conn.lock().map_err(|_| anyhow::anyhow!("Database lock poisoned"))?;
        conn.execute_batch(schema)
            .context("Failed to run schema migration")?;
        Ok(())
    }

    /// Get a reference to the underlying connection.
    /// Holds the lock — use briefly.
    pub fn conn(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.conn.lock().expect("Database lock poisoned")
    }

    // ── Agent Queries ──

    pub fn get_agent(&self, id: &str) -> Result<Option<super::types::Agent>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, name, emoji, role, soul, instructions, model_alias, tier, is_active, created_at, updated_at
             FROM agents WHERE id = ?1"
        )?;

        let result = stmt.query_row(params![id], |row| {
            Ok(super::types::Agent {
                id: row.get(0)?,
                name: row.get(1)?,
                emoji: row.get(2)?,
                role: row.get(3)?,
                soul: row.get(4)?,
                instructions: row.get(5)?,
                model_alias: row.get(6)?,
                tier: row.get(7)?,
                is_active: row.get::<_, i64>(8)? != 0,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        });

        match result {
            Ok(agent) => Ok(Some(agent)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn get_active_agents(&self) -> Result<Vec<super::types::Agent>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, name, emoji, role, soul, instructions, model_alias, tier, is_active, created_at, updated_at
             FROM agents WHERE is_active = 1 ORDER BY name"
        )?;

        let agents = stmt.query_map([], |row| {
            Ok(super::types::Agent {
                id: row.get(0)?,
                name: row.get(1)?,
                emoji: row.get(2)?,
                role: row.get(3)?,
                soul: row.get(4)?,
                instructions: row.get(5)?,
                model_alias: row.get(6)?,
                tier: row.get(7)?,
                is_active: row.get::<_, i64>(8)? != 0,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })?;

        let mut result = Vec::new();
        for agent in agents {
            result.push(agent?);
        }
        Ok(result)
    }

    // ── Session Queries ──

    pub fn create_session(&self, agent_id: &str, user_id: &str) -> Result<super::types::Session> {
        let id = uuid::Uuid::new_v4().to_string();
        let conn = self.conn();
        conn.execute(
            "INSERT INTO sessions (id, agent_id, user_id) VALUES (?1, ?2, ?3)",
            params![id, agent_id, user_id],
        )?;

        Ok(super::types::Session {
            id: id.clone(),
            agent_id: agent_id.to_string(),
            user_id: user_id.to_string(),
            title: None,
            status: "active".to_string(),
            message_count: 0,
            total_tokens: 0,
            created_at: Self::now(),
            updated_at: Self::now(),
        })
    }

    pub fn get_session(&self, id: &str) -> Result<Option<super::types::Session>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, agent_id, user_id, title, status, message_count, total_tokens, created_at, updated_at
             FROM sessions WHERE id = ?1"
        )?;

        let result = stmt.query_row(params![id], |row| {
            Ok(super::types::Session {
                id: row.get(0)?,
                agent_id: row.get(1)?,
                user_id: row.get(2)?,
                title: row.get(3)?,
                status: row.get(4)?,
                message_count: row.get(5)?,
                total_tokens: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        });

        match result {
            Ok(session) => Ok(Some(session)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn get_recent_sessions(&self, limit: i64) -> Result<Vec<super::types::Session>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, agent_id, user_id, title, status, message_count, total_tokens, created_at, updated_at
             FROM sessions WHERE status = 'active' ORDER BY updated_at DESC LIMIT ?1"
        )?;

        let sessions = stmt.query_map(params![limit], |row| {
            Ok(super::types::Session {
                id: row.get(0)?,
                agent_id: row.get(1)?,
                user_id: row.get(2)?,
                title: row.get(3)?,
                status: row.get(4)?,
                message_count: row.get(5)?,
                total_tokens: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })?;

        let mut result = Vec::new();
        for session in sessions {
            result.push(session?);
        }
        Ok(result)
    }

    // ── Message Queries ──

    pub fn add_message(
        &self,
        session_id: &str,
        role: &str,
        content: &str,
        tokens_used: i64,
        model: Option<&str>,
        provider_id: Option<&str>,
        latency_ms: Option<i64>,
    ) -> Result<super::types::Message> {
        self.add_message_with_tools(session_id, role, content, tokens_used, model, provider_id, latency_ms, None, None, None, None)
    }

    pub fn add_message_with_tools(
        &self,
        session_id: &str,
        role: &str,
        content: &str,
        tokens_used: i64,
        model: Option<&str>,
        provider_id: Option<&str>,
        latency_ms: Option<i64>,
        tool_call_id: Option<&str>,
        tool_name: Option<&str>,
        tool_args: Option<&str>,
        tool_result: Option<&str>,
    ) -> Result<super::types::Message> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = Self::now();
        let conn = self.conn();

        conn.execute(
            "INSERT INTO messages (id, session_id, role, content, tokens_used, model, provider_id, latency_ms, tool_call_id, tool_name, tool_args, tool_result)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![id, session_id, role, content, tokens_used, model, provider_id, latency_ms, tool_call_id, tool_name, tool_args, tool_result],
        )?;

        // Update session counters
        conn.execute(
            "UPDATE sessions SET message_count = message_count + 1, total_tokens = total_tokens + ?2, updated_at = ?3 WHERE id = ?1",
            params![session_id, tokens_used, now],
        )?;

        Ok(super::types::Message {
            id,
            session_id: session_id.to_string(),
            role: role.to_string(),
            content: content.to_string(),
            tool_call_id: tool_call_id.map(String::from),
            tool_name: tool_name.map(String::from),
            tool_args: tool_args.map(String::from),
            tool_result: tool_result.map(String::from),
            tokens_used,
            model: model.map(String::from),
            provider_id: provider_id.map(String::from),
            latency_ms,
            created_at: now,
        })
    }

    pub fn get_messages(&self, session_id: &str, limit: i64) -> Result<Vec<super::types::Message>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, session_id, role, content, tool_call_id, tool_name, tool_args, tool_result,
                    tokens_used, model, provider_id, latency_ms, created_at
             FROM messages WHERE session_id = ?1 ORDER BY created_at DESC LIMIT ?2"
        )?;

        let messages = stmt.query_map(params![session_id, limit], |row| {
            Ok(super::types::Message {
                id: row.get(0)?,
                session_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                tool_call_id: row.get(4)?,
                tool_name: row.get(5)?,
                tool_args: row.get(6)?,
                tool_result: row.get(7)?,
                tokens_used: row.get(8)?,
                model: row.get(9)?,
                provider_id: row.get(10)?,
                latency_ms: row.get(11)?,
                created_at: row.get(12)?,
            })
        })?;

        let mut result: Vec<super::types::Message> = Vec::new();
        for msg in messages {
            result.push(msg?);
        }
        result.reverse(); // Return in chronological order
        Ok(result)
    }

    // ── Memory Queries ──

    pub fn store_memory(
        &self,
        agent_id: &str,
        memory_type: &str,
        key: Option<&str>,
        content: &str,
        source: Option<&str>,
    ) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let conn = self.conn();

        conn.execute(
            "INSERT INTO memory (id, agent_id, memory_type, key, content, source)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, agent_id, memory_type, key, content, source],
        )?;

        Ok(id)
    }

    pub fn search_memory(&self, agent_id: &str, query: &str, limit: i64) -> Result<Vec<super::types::Memory>> {
        let conn = self.conn();
        let search_pattern = format!("%{}%", query);
        let mut stmt = conn.prepare(
            "SELECT id, agent_id, memory_type, key, content, source, confidence,
                    access_count, last_accessed, created_at, updated_at, expires_at
             FROM memory
             WHERE agent_id = ?1 AND (content LIKE ?2 OR key LIKE ?2)
             ORDER BY confidence DESC, access_count DESC, created_at DESC
             LIMIT ?3"
        )?;

        let memories = stmt.query_map(params![agent_id, search_pattern, limit], |row| {
            Ok(super::types::Memory {
                id: row.get(0)?,
                agent_id: row.get(1)?,
                memory_type: row.get(2)?,
                key: row.get(3)?,
                content: row.get(4)?,
                source: row.get(5)?,
                confidence: row.get(6)?,
                access_count: row.get(7)?,
                last_accessed: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
                expires_at: row.get(11)?,
            })
        })?;

        let mut result = Vec::new();
        for mem in memories {
            result.push(mem?);
        }

        // Update access counts
        let now = Self::now();
        for mem in &result {
            let _ = conn.execute(
                "UPDATE memory SET access_count = access_count + 1, last_accessed = ?2 WHERE id = ?1",
                params![mem.id, now],
            );
        }

        Ok(result)
    }

    pub fn get_memory_by_key(&self, agent_id: &str, key: &str) -> Result<Option<super::types::Memory>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, agent_id, memory_type, key, content, source, confidence,
                    access_count, last_accessed, created_at, updated_at, expires_at
             FROM memory WHERE agent_id = ?1 AND key = ?2
             ORDER BY updated_at DESC LIMIT 1"
        )?;

        let result = stmt.query_row(params![agent_id, key], |row| {
            Ok(super::types::Memory {
                id: row.get(0)?,
                agent_id: row.get(1)?,
                memory_type: row.get(2)?,
                key: row.get(3)?,
                content: row.get(4)?,
                source: row.get(5)?,
                confidence: row.get(6)?,
                access_count: row.get(7)?,
                last_accessed: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
                expires_at: row.get(11)?,
            })
        });

        match result {
            Ok(mem) => Ok(Some(mem)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    // ── Quota Queries ──

    pub fn get_quota(&self, user_id: &str, date: &str) -> Result<Option<super::types::QuotaRecord>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT user_id, date, calls_used, tokens_used, providers_used
             FROM quota WHERE user_id = ?1 AND date = ?2"
        )?;

        let result = stmt.query_row(params![user_id, date], |row| {
            Ok(super::types::QuotaRecord {
                user_id: row.get(0)?,
                date: row.get(1)?,
                calls_used: row.get(2)?,
                tokens_used: row.get(3)?,
                providers_used: row.get(4)?,
            })
        });

        match result {
            Ok(q) => Ok(Some(q)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn increment_quota(&self, user_id: &str, date: &str, tokens: i64, provider_id: &str) -> Result<i64> {
        let conn = self.conn();

        // Upsert quota record
        conn.execute(
            "INSERT INTO quota (user_id, date, calls_used, tokens_used, providers_used)
             VALUES (?1, ?2, 1, ?3, ?4)
             ON CONFLICT(user_id, date) DO UPDATE SET
                calls_used = calls_used + 1,
                tokens_used = tokens_used + ?3",
            params![user_id, date, tokens, format!("{{\"{}\": 1}}", provider_id)],
        )?;

        // Return new call count
        let count: i64 = conn.query_row(
            "SELECT calls_used FROM quota WHERE user_id = ?1 AND date = ?2",
            params![user_id, date],
            |row| row.get(0),
        )?;

        Ok(count)
    }

    // ── Config ──

    pub fn get_config(&self, key: &str) -> Result<Option<String>> {
        let conn = self.conn();
        let result: std::result::Result<String, _> = conn.query_row(
            "SELECT value FROM config WHERE key = ?1",
            params![key],
            |row| row.get(0),
        );

        match result {
            Ok(v) => Ok(Some(v)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn set_config(&self, key: &str, value: &str) -> Result<()> {
        let conn = self.conn();
        conn.execute(
            "INSERT INTO config (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
            params![key, value],
        )?;
        Ok(())
    }

    // ── Telemetry ──

    pub fn log_event(&self, event_type: &str, agent_id: Option<&str>, session_id: Option<&str>, data: Option<&str>) -> Result<()> {
        let id = uuid::Uuid::new_v4().to_string();
        let conn = self.conn();
        conn.execute(
            "INSERT INTO telemetry_events (id, event_type, agent_id, session_id, data) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, event_type, agent_id, session_id, data],
        )?;
        Ok(())
    }

    // ── Helpers ──

    fn now() -> String {
        chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string()
    }

    // ── Agent Updates ──

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
        let conn = self.conn();
        let now = Self::now();

        // Build dynamic update query
        let mut sets: Vec<String> = Vec::new();
        let mut params_vec: Vec<(String, String)> = Vec::new();

        if let Some(v) = name { sets.push("name = ?".to_string()); params_vec.push(("name".to_string(), v.to_string())); }
        if let Some(v) = emoji { sets.push("emoji = ?".to_string()); params_vec.push(("emoji".to_string(), v.to_string())); }
        if let Some(v) = role { sets.push("role = ?".to_string()); params_vec.push(("role".to_string(), v.to_string())); }
        if let Some(v) = soul { sets.push("soul = ?".to_string()); params_vec.push(("soul".to_string(), v.to_string())); }
        if let Some(v) = instructions { sets.push("instructions = ?".to_string()); params_vec.push(("instructions".to_string(), v.to_string())); }
        if let Some(v) = model_alias { sets.push("model_alias = ?".to_string()); params_vec.push(("model_alias".to_string(), v.to_string())); }

        if sets.is_empty() {
            return Ok(());
        }

        sets.push("updated_at = ?".to_string());

        let query = format!(
            "UPDATE agents SET {} WHERE id = ?",
            sets.join(", ")
        );

        let now = Self::now();
        let id_owned = id.to_string();

        let mut all_params: Vec<&dyn rusqlite::ToSql> = Vec::new();
        for (_, v) in &params_vec {
            all_params.push(v);
        }
        all_params.push(&now);
        all_params.push(&id_owned);

        conn.execute(&query, rusqlite::params_from_iter(all_params))?;
        Ok(())
    }

    // ── Memory Extended ──

    pub fn get_all_memories(&self, agent_id: &str, limit: i64) -> Result<Vec<super::types::Memory>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, agent_id, memory_type, key, content, source, confidence,
                    access_count, last_accessed, created_at, updated_at, expires_at
             FROM memory WHERE agent_id = ?1
             ORDER BY updated_at DESC LIMIT ?2"
        )?;

        let memories = stmt.query_map(params![agent_id, limit], |row| {
            Ok(super::types::Memory {
                id: row.get(0)?,
                agent_id: row.get(1)?,
                memory_type: row.get(2)?,
                key: row.get(3)?,
                content: row.get(4)?,
                source: row.get(5)?,
                confidence: row.get(6)?,
                access_count: row.get(7)?,
                last_accessed: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
                expires_at: row.get(11)?,
            })
        })?;

        let mut result = Vec::new();
        for mem in memories {
            result.push(mem?);
        }
        Ok(result)
    }

    pub fn delete_memory(&self, memory_id: &str) -> Result<()> {
        let conn = self.conn();
        conn.execute("DELETE FROM memory WHERE id = ?1", params![memory_id])?;
        Ok(())
    }

    pub fn set_memory_confidence(&self, memory_id: &str, confidence: f64) -> Result<()> {
        let conn = self.conn();
        conn.execute(
            "UPDATE memory SET confidence = ?2, updated_at = ?3 WHERE id = ?1",
            params![memory_id, confidence, Self::now()],
        )?;
        Ok(())
    }

    // ── Provider CRUD ──

    pub fn get_providers(&self) -> Result<Vec<super::types::ProviderConfig>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, name, base_url, api_key, model_id, model_alias, priority, is_enabled, created_at, updated_at
             FROM providers ORDER BY priority ASC"
        )?;

        let providers = stmt.query_map([], |row| {
            Ok(super::types::ProviderConfig {
                id: row.get(0)?,
                name: row.get(1)?,
                base_url: row.get(2)?,
                api_key: row.get(3)?,
                model_id: row.get(4)?,
                model_alias: row.get(5)?,
                priority: row.get(6)?,
                is_enabled: row.get::<_, i64>(7)? != 0,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?;

        let mut result = Vec::new();
        for p in providers {
            result.push(p?);
        }
        Ok(result)
    }

    pub fn get_provider(&self, id: &str) -> Result<Option<super::types::ProviderConfig>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, name, base_url, api_key, model_id, model_alias, priority, is_enabled, created_at, updated_at
             FROM providers WHERE id = ?1"
        )?;

        let result = stmt.query_row(params![id], |row| {
            Ok(super::types::ProviderConfig {
                id: row.get(0)?,
                name: row.get(1)?,
                base_url: row.get(2)?,
                api_key: row.get(3)?,
                model_id: row.get(4)?,
                model_alias: row.get(5)?,
                priority: row.get(6)?,
                is_enabled: row.get::<_, i64>(7)? != 0,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        });

        match result {
            Ok(p) => Ok(Some(p)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn upsert_provider(
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
        let conn = self.conn();
        let enabled: i64 = if is_enabled { 1 } else { 0 };
        conn.execute(
            "INSERT INTO providers (id, name, base_url, api_key, model_id, model_alias, priority, is_enabled)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(id) DO UPDATE SET
                name = ?2, base_url = ?3, api_key = ?4, model_id = ?5,
                model_alias = ?6, priority = ?7, is_enabled = ?8,
                updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
            params![id, name, base_url, api_key, model_id, model_alias, priority, enabled],
        )?;
        Ok(())
    }

    pub fn delete_provider(&self, id: &str) -> Result<()> {
        let conn = self.conn();
        conn.execute("DELETE FROM providers WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ── Provider Templates ──

    pub fn get_provider_templates(&self) -> Result<Vec<super::types::ProviderTemplate>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, name, emoji, description, base_url, models, default_model, model_alias, category, docs_url, is_free, sort_order
             FROM provider_templates ORDER BY sort_order ASC"
        )?;

        let templates = stmt.query_map([], |row| {
            let models_json: String = row.get(5)?;
            let models: Vec<String> = serde_json::from_str(&models_json).unwrap_or_default();
            Ok(super::types::ProviderTemplate {
                id: row.get(0)?,
                name: row.get(1)?,
                emoji: row.get(2)?,
                description: row.get(3)?,
                base_url: row.get(4)?,
                models,
                default_model: row.get(6)?,
                model_alias: row.get(7)?,
                category: row.get(8)?,
                docs_url: row.get(9)?,
                is_free: row.get::<_, i64>(10)? != 0,
                sort_order: row.get(11)?,
            })
        })?;

        let mut result = Vec::new();
        for t in templates {
            result.push(t?);
        }
        Ok(result)
    }

    pub fn get_provider_template(&self, id: &str) -> Result<Option<super::types::ProviderTemplate>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, name, emoji, description, base_url, models, default_model, model_alias, category, docs_url, is_free, sort_order
             FROM provider_templates WHERE id = ?1"
        )?;

        let result = stmt.query_row(params![id], |row| {
            let models_json: String = row.get(5)?;
            let models: Vec<String> = serde_json::from_str(&models_json).unwrap_or_default();
            Ok(super::types::ProviderTemplate {
                id: row.get(0)?,
                name: row.get(1)?,
                emoji: row.get(2)?,
                description: row.get(3)?,
                base_url: row.get(4)?,
                models,
                default_model: row.get(6)?,
                model_alias: row.get(7)?,
                category: row.get(8)?,
                docs_url: row.get(9)?,
                is_free: row.get::<_, i64>(10)? != 0,
                sort_order: row.get(11)?,
            })
        });

        match result {
            Ok(t) => Ok(Some(t)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn check_template_installed(&self, template_id: &str) -> Result<bool> {
        let conn = self.conn();
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM providers WHERE id LIKE ?1",
            params![format!("{}%", template_id)],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }
}
