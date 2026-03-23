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

        // Try FTS5 search first (better relevance ranking)
        let fts_result = conn.prepare(
            "SELECT m.id, m.agent_id, m.memory_type, m.key, m.content, m.source, m.confidence,
                    m.access_count, m.last_accessed, m.created_at, m.updated_at, m.expires_at
             FROM memory_fts fts
             JOIN memory m ON m.id = fts.memory_id
             WHERE fts.agent_id = ?1 AND memory_fts MATCH ?2
             ORDER BY rank
             LIMIT ?3"
        );

        let memories = match fts_result {
            Ok(mut stmt) => {
                // Sanitize query for FTS5: escape special chars, add prefix matching
                let fts_query = query
                    .split_whitespace()
                    .filter(|w| !w.is_empty())
                    .map(|w| format!("\"{}\"", w.replace('"', "")))
                    .collect::<Vec<_>>()
                    .join(" OR ");

                if fts_query.is_empty() {
                    return Ok(Vec::new());
                }

                match stmt.query_map(params![agent_id, fts_query, limit], |row| {
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
                }) {
                    Ok(rows) => {
                        let mut result = Vec::new();
                        for row in rows {
                            if let Ok(mem) = row {
                                result.push(mem);
                            }
                        }
                        if !result.is_empty() {
                            // Update access counts
                            let now = Self::now();
                            for mem in &result {
                                let _ = conn.execute(
                                    "UPDATE memory SET access_count = access_count + 1, last_accessed = ?2 WHERE id = ?1",
                                    params![mem.id, now],
                                );
                            }
                            return Ok(result);
                        }
                        result
                    }
                    Err(_) => Vec::new(),
                }
            }
            Err(_) => Vec::new(),
        };

        // Fall back to LIKE search if FTS returned nothing
        if memories.is_empty() {
            let search_pattern = format!("%{}%", query);
            let mut stmt = conn.prepare(
                "SELECT id, agent_id, memory_type, key, content, source, confidence,
                        access_count, last_accessed, created_at, updated_at, expires_at
                 FROM memory
                 WHERE agent_id = ?1 AND (content LIKE ?2 OR key LIKE ?2)
                 ORDER BY confidence DESC, access_count DESC, created_at DESC
                 LIMIT ?3"
            )?;

            let fallback = stmt.query_map(params![agent_id, search_pattern, limit], |row| {
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
            for mem in fallback {
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

            return Ok(result);
        }

        Ok(memories)
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

    // ── Session Compaction ──

    /// Count messages in a session.
    pub fn count_messages(&self, session_id: &str) -> Result<i64> {
        let conn = self.conn();
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM messages WHERE session_id = ?1",
            params![session_id],
            |row| row.get(0),
        )?;
        Ok(count)
    }

    /// Get messages older than the most recent N (for compaction).
    pub fn get_old_messages(&self, session_id: &str, keep_recent: i64) -> Result<Vec<super::types::Message>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, session_id, role, content, tool_call_id, tool_name, tool_args, tool_result,
                    tokens_used, model, provider_id, latency_ms, created_at
             FROM messages WHERE session_id = ?1
             ORDER BY created_at ASC
             LIMIT (SELECT MAX(COUNT(*) - ?2, 0) FROM messages WHERE session_id = ?1)"
        )?;

        let messages = stmt.query_map(params![session_id, keep_recent], |row| {
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

        let mut result = Vec::new();
        for msg in messages {
            result.push(msg?);
        }
        Ok(result)
    }

    /// Delete messages by ID list.
    pub fn delete_messages(&self, message_ids: &[String]) -> Result<i64> {
        let conn = self.conn();
        let mut count = 0i64;
        for id in message_ids {
            count += conn.execute("DELETE FROM messages WHERE id = ?1", params![id])? as i64;
        }
        Ok(count)
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

    /// Rebuild FTS index from existing memories (for migration).
    pub fn rebuild_memory_fts(&self) -> Result<i64> {
        let conn = self.conn();

        // Clear existing FTS data
        let _ = conn.execute_batch("DELETE FROM memory_fts;");

        // Rebuild from memory table
        let count = conn.execute_batch(
            "INSERT INTO memory_fts(memory_id, agent_id, content, key, memory_type)
             SELECT id, agent_id, content, COALESCE(key, ''), memory_type FROM memory;"
        );

        match count {
            Ok(_) => {
                // Count entries
                let n: i64 = conn.query_row("SELECT COUNT(*) FROM memory_fts", [], |r| r.get(0))?;
                Ok(n)
            }
            Err(_) => Ok(0),
        }
    }

    // ── Agent Capabilities ──

    pub fn get_agent_capabilities(&self, agent_id: &str) -> Result<Vec<super::types::AgentCapability>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT agent_id, capability, proficiency FROM agent_capabilities WHERE agent_id = ?1"
        )?;

        let caps = stmt.query_map(params![agent_id], |row| {
            Ok(super::types::AgentCapability {
                agent_id: row.get(0)?,
                capability: row.get(1)?,
                proficiency: row.get(2)?,
            })
        })?;

        let mut result = Vec::new();
        for c in caps { result.push(c?); }
        Ok(result)
    }

    pub fn find_agents_by_capability(&self, capability: &str) -> Result<Vec<String>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT DISTINCT agent_id FROM agent_capabilities WHERE capability = ?1 ORDER BY proficiency DESC"
        )?;

        let agents = stmt.query_map(params![capability], |row| row.get::<_, String>(0))?;
        let mut result = Vec::new();
        for a in agents { result.push(a?); }
        Ok(result)
    }

    // ── Agent Permissions ──

    pub fn get_agent_permissions(&self, agent_id: &str) -> Result<Option<super::types::AgentPermission>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT agent_id, can_talk_to, max_delegation_depth, max_tokens_per_session,
                    can_create_tasks, can_delete_data, requires_verification, anti_hallucination
             FROM agent_permissions WHERE agent_id = ?1"
        )?;

        let result = stmt.query_row(params![agent_id], |row| {
            Ok(super::types::AgentPermission {
                agent_id: row.get(0)?,
                can_talk_to: row.get(1)?,
                max_delegation_depth: row.get(2)?,
                max_tokens_per_session: row.get(3)?,
                can_create_tasks: row.get::<_, i64>(4)? != 0,
                can_delete_data: row.get::<_, i64>(5)? != 0,
                requires_verification: row.get::<_, i64>(6)? != 0,
                anti_hallucination: row.get::<_, i64>(7)? != 0,
            })
        });

        match result {
            Ok(p) => Ok(Some(p)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn can_agent_talk_to(&self, from: &str, to: &str) -> Result<bool> {
        let perms = self.get_agent_permissions(from)?;
        match perms {
            Some(p) => {
                if p.can_talk_to == "*" {
                    return Ok(true);
                }
                let allowed: Vec<String> = serde_json::from_str(&p.can_talk_to).unwrap_or_default();
                Ok(allowed.contains(&to.to_string()))
            }
            None => Ok(true), // no permissions set = allow all
        }
    }

    // ── Agent Communications ──

    pub fn create_communication(&self, from: &str, to: &str, msg_type: &str, content: &str, session_id: Option<&str>) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let conn = self.conn();
        conn.execute(
            "INSERT INTO agent_communications (id, from_agent, to_agent, message_type, content, session_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, from, to, msg_type, content, session_id],
        )?;
        Ok(id)
    }

    pub fn complete_communication(&self, id: &str, response: &str, tokens_used: i64) -> Result<()> {
        let conn = self.conn();
        let now = Self::now();
        conn.execute(
            "UPDATE agent_communications SET response = ?2, status = 'responded', tokens_used = ?3, responded_at = ?4 WHERE id = ?1",
            params![id, response, tokens_used, now],
        )?;
        Ok(())
    }

    pub fn get_communications(&self, agent_id: &str, limit: i64) -> Result<Vec<super::types::AgentCommunication>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, from_agent, to_agent, message_type, content, response, status, session_id, tokens_used, created_at, responded_at
             FROM agent_communications
             WHERE from_agent = ?1 OR to_agent = ?1
             ORDER BY created_at DESC LIMIT ?2"
        )?;

        let comms = stmt.query_map(params![agent_id, limit], |row| {
            Ok(super::types::AgentCommunication {
                id: row.get(0)?,
                from_agent: row.get(1)?,
                to_agent: row.get(2)?,
                message_type: row.get(3)?,
                content: row.get(4)?,
                response: row.get(5)?,
                status: row.get(6)?,
                session_id: row.get(7)?,
                tokens_used: row.get(8)?,
                created_at: row.get(9)?,
                responded_at: row.get(10)?,
            })
        })?;

        let mut result = Vec::new();
        for c in comms { result.push(c?); }
        Ok(result)
    }

    // ── Tasks ──

    pub fn create_task(&self, title: &str, description: Option<&str>, agent_id: &str, created_by: &str, priority: &str, requires_verify: bool) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let conn = self.conn();
        let rv: i64 = if requires_verify { 1 } else { 0 };
        conn.execute(
            "INSERT INTO tasks (id, title, description, agent_id, created_by, priority, requires_verify)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![id, title, description, agent_id, created_by, priority, rv],
        )?;
        Ok(id)
    }

    pub fn update_task_status(&self, task_id: &str, status: &str, result: Option<&str>) -> Result<()> {
        let conn = self.conn();
        let now = Self::now();
        match status {
            "completed" | "failed" => {
                conn.execute(
                    "UPDATE tasks SET status = ?2, result = ?3, completed_at = ?4, updated_at = ?4 WHERE id = ?1",
                    params![task_id, status, result, now],
                )?;
            }
            _ => {
                conn.execute(
                    "UPDATE tasks SET status = ?2, updated_at = ?3 WHERE id = ?1",
                    params![task_id, status, now],
                )?;
            }
        }
        Ok(())
    }

    pub fn verify_task(&self, task_id: &str, verified: bool) -> Result<()> {
        let conn = self.conn();
        let v: i64 = if verified { 1 } else { 0 };
        conn.execute(
            "UPDATE tasks SET verified = ?2, updated_at = ?3 WHERE id = ?1",
            params![task_id, v, Self::now()],
        )?;
        Ok(())
    }

    pub fn get_task(&self, task_id: &str) -> Result<Option<super::types::Task>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, title, description, agent_id, status, result, parent_task_id, session_id,
                    created_by, priority, requires_verify, verified, created_at, updated_at, completed_at
             FROM tasks WHERE id = ?1"
        )?;

        let result = stmt.query_row(params![task_id], |row| {
            Ok(super::types::Task {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                agent_id: row.get(3)?,
                status: row.get(4)?,
                result: row.get(5)?,
                parent_task_id: row.get(6)?,
                session_id: row.get(7)?,
                created_by: row.get(8)?,
                priority: row.get(9)?,
                requires_verify: row.get::<_, i64>(10)? != 0,
                verified: row.get::<_, i64>(11)? != 0,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
                completed_at: row.get(14)?,
            })
        });

        match result {
            Ok(t) => Ok(Some(t)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn get_tasks_for_agent(&self, agent_id: &str, status_filter: Option<&str>) -> Result<Vec<super::types::Task>> {
        let conn = self.conn();
        let (query, params_vec): (String, Vec<String>) = match status_filter {
            Some(status) => (
                "SELECT id, title, description, agent_id, status, result, parent_task_id, session_id,
                        created_by, priority, requires_verify, verified, created_at, updated_at, completed_at
                 FROM tasks WHERE agent_id = ?1 AND status = ?2 ORDER BY created_at DESC".to_string(),
                vec![agent_id.to_string(), status.to_string()],
            ),
            None => (
                "SELECT id, title, description, agent_id, status, result, parent_task_id, session_id,
                        created_by, priority, requires_verify, verified, created_at, updated_at, completed_at
                 FROM tasks WHERE agent_id = ?1 ORDER BY created_at DESC".to_string(),
                vec![agent_id.to_string()],
            ),
        };

        let mut stmt = conn.prepare(&query)?;
        let params_ref: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|s| s as &dyn rusqlite::ToSql).collect();

        let tasks = stmt.query_map(rusqlite::params_from_iter(params_ref), |row| {
            Ok(super::types::Task {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                agent_id: row.get(3)?,
                status: row.get(4)?,
                result: row.get(5)?,
                parent_task_id: row.get(6)?,
                session_id: row.get(7)?,
                created_by: row.get(8)?,
                priority: row.get(9)?,
                requires_verify: row.get::<_, i64>(10)? != 0,
                verified: row.get::<_, i64>(11)? != 0,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
                completed_at: row.get(14)?,
            })
        })?;

        let mut result = Vec::new();
        for t in tasks { result.push(t?); }
        Ok(result)
    }

    // ── Verification Records ──

    pub fn create_verification(&self, agent_id: &str, session_id: Option<&str>, claim_type: &str, claim: &str) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let conn = self.conn();
        conn.execute(
            "INSERT INTO verification_records (id, agent_id, session_id, claim_type, claim, verification)
             VALUES (?1, ?2, ?3, ?4, ?5, 'unverified')",
            params![id, agent_id, session_id, claim_type, claim],
        )?;
        Ok(id)
    }

    pub fn complete_verification(&self, id: &str, verified_by: &str, result: &str, evidence: Option<&str>) -> Result<()> {
        let conn = self.conn();
        conn.execute(
            "UPDATE verification_records SET verified_by = ?2, verification = ?3, evidence = ?4 WHERE id = ?1",
            params![id, verified_by, result, evidence],
        )?;
        Ok(())
    }

    pub fn get_unverified_claims(&self, agent_id: Option<&str>) -> Result<Vec<super::types::VerificationRecord>> {
        let conn = self.conn();
        let mut result = Vec::new();

        match agent_id {
            Some(aid) => {
                let mut stmt = conn.prepare(
                    "SELECT id, agent_id, session_id, claim_type, claim, verified_by, verification, evidence, created_at
                     FROM verification_records WHERE agent_id = ?1 AND verification = 'unverified' ORDER BY created_at DESC"
                )?;
                let rows = stmt.query_map(params![aid], |row| {
                    Ok(super::types::VerificationRecord {
                        id: row.get(0)?, agent_id: row.get(1)?, session_id: row.get(2)?,
                        claim_type: row.get(3)?, claim: row.get(4)?, verified_by: row.get(5)?,
                        verification: row.get(6)?, evidence: row.get(7)?, created_at: row.get(8)?,
                    })
                })?;
                for r in rows { result.push(r?); }
            }
            None => {
                let mut stmt = conn.prepare(
                    "SELECT id, agent_id, session_id, claim_type, claim, verified_by, verification, evidence, created_at
                     FROM verification_records WHERE verification = 'unverified' ORDER BY created_at DESC"
                )?;
                let rows = stmt.query_map([], |row| {
                    Ok(super::types::VerificationRecord {
                        id: row.get(0)?, agent_id: row.get(1)?, session_id: row.get(2)?,
                        claim_type: row.get(3)?, claim: row.get(4)?, verified_by: row.get(5)?,
                        verification: row.get(6)?, evidence: row.get(7)?, created_at: row.get(8)?,
                    })
                })?;
                for r in rows { result.push(r?); }
            }
        };

        Ok(result)
    }

    // ── Lessons Learned ──

    pub fn add_lesson(&self, agent_id: Option<&str>, category: &str, lesson: &str, evidence: Option<&str>, action: Option<&str>) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let conn = self.conn();
        conn.execute(
            "INSERT INTO lessons_learned (id, agent_id, category, lesson, evidence, action_taken)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, agent_id, category, lesson, evidence, action],
        )?;
        Ok(id)
    }

    pub fn get_active_lessons(&self, category: Option<&str>) -> Result<Vec<super::types::LessonLearned>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, agent_id, category, lesson, evidence, action_taken, is_active, created_at
             FROM lessons_learned WHERE is_active = 1 AND (?1 IS NULL OR category = ?1)
             ORDER BY created_at DESC"
        )?;

        let lessons = stmt.query_map(params![category], |row| {
            Ok(super::types::LessonLearned {
                id: row.get(0)?, agent_id: row.get(1)?, category: row.get(2)?,
                lesson: row.get(3)?, evidence: row.get(4)?, action_taken: row.get(5)?,
                is_active: row.get::<_, i64>(6)? != 0, created_at: row.get(7)?,
            })
        })?;

        let mut result = Vec::new();
        for l in lessons { result.push(l?); }
        Ok(result)
    }

    // ── Cron Jobs ──

    pub fn create_cron_job(&self, name: &str, agent_id: &str, schedule: &str, timezone: &str, task_message: &str) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let conn = self.conn();
        conn.execute(
            "INSERT INTO cron_jobs (id, name, agent_id, schedule, timezone, task_message)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, name, agent_id, schedule, timezone, task_message],
        )?;
        Ok(id)
    }

    pub fn get_cron_jobs(&self, enabled_only: bool) -> Result<Vec<super::types::CronJob>> {
        let conn = self.conn();
        let query = if enabled_only {
            "SELECT id, name, agent_id, schedule, timezone, task_message, is_enabled, last_run_at, next_run_at, run_count, error_count, created_at, updated_at
             FROM cron_jobs WHERE is_enabled = 1 ORDER BY next_run_at ASC"
        } else {
            "SELECT id, name, agent_id, schedule, timezone, task_message, is_enabled, last_run_at, next_run_at, run_count, error_count, created_at, updated_at
             FROM cron_jobs ORDER BY created_at DESC"
        };
        let mut stmt = conn.prepare(query)?;
        let jobs = stmt.query_map([], |row| {
            Ok(super::types::CronJob {
                id: row.get(0)?, name: row.get(1)?, agent_id: row.get(2)?,
                schedule: row.get(3)?, timezone: row.get(4)?, task_message: row.get(5)?,
                is_enabled: row.get::<_, i64>(6)? != 0, last_run_at: row.get(7)?,
                next_run_at: row.get(8)?, run_count: row.get(9)?, error_count: row.get(10)?,
                created_at: row.get(11)?, updated_at: row.get(12)?,
            })
        })?;
        let mut result = Vec::new();
        for j in jobs { result.push(j?); }
        Ok(result)
    }

    pub fn get_due_cron_jobs(&self) -> Result<Vec<super::types::CronJob>> {
        let conn = self.conn();
        let now = Self::now();
        let mut stmt = conn.prepare(
            "SELECT id, name, agent_id, schedule, timezone, task_message, is_enabled, last_run_at, next_run_at, run_count, error_count, created_at, updated_at
             FROM cron_jobs
             WHERE is_enabled = 1 AND (next_run_at IS NULL OR next_run_at <= ?1)
             ORDER BY next_run_at ASC"
        )?;
        let jobs = stmt.query_map(params![now], |row| {
            Ok(super::types::CronJob {
                id: row.get(0)?, name: row.get(1)?, agent_id: row.get(2)?,
                schedule: row.get(3)?, timezone: row.get(4)?, task_message: row.get(5)?,
                is_enabled: row.get::<_, i64>(6)? != 0, last_run_at: row.get(7)?,
                next_run_at: row.get(8)?, run_count: row.get(9)?, error_count: row.get(10)?,
                created_at: row.get(11)?, updated_at: row.get(12)?,
            })
        })?;
        let mut result = Vec::new();
        for j in jobs { result.push(j?); }
        Ok(result)
    }

    pub fn update_cron_run(&self, id: &str, status: &str, tokens: i64, error: Option<&str>) -> Result<()> {
        let conn = self.conn();
        let now = Self::now();

        // Get the schedule to compute next run
        let schedule: String = conn.query_row(
            "SELECT schedule FROM cron_jobs WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )?;

        let next = super::cron::next_run(&schedule, chrono::Utc::now())
            .map(|dt| dt.format("%Y-%m-%dT%H:%M:%SZ").to_string());

        conn.execute(
            "UPDATE cron_jobs SET last_run_at = ?2, last_run_status = ?3, last_run_tokens = ?4, last_run_error = ?5,
             run_count = run_count + 1, error_count = error_count + (CASE WHEN ?3 = 'error' THEN 1 ELSE 0 END),
             next_run_at = ?6, updated_at = ?2
             WHERE id = ?1",
            params![id, now, status, tokens, error, next],
        )?;
        Ok(())
    }

    pub fn update_cron_next_run(&self, id: &str, next_run: &str) -> Result<()> {
        let conn = self.conn();
        conn.execute(
            "UPDATE cron_jobs SET next_run_at = ?2, updated_at = ?3 WHERE id = ?1",
            params![id, next_run, Self::now()],
        )?;
        Ok(())
    }

    pub fn toggle_cron_job(&self, id: &str, enabled: bool) -> Result<()> {
        let conn = self.conn();
        let e: i64 = if enabled { 1 } else { 0 };
        conn.execute(
            "UPDATE cron_jobs SET is_enabled = ?2, updated_at = ?3 WHERE id = ?1",
            params![id, e, Self::now()],
        )?;
        Ok(())
    }

    pub fn delete_cron_job(&self, id: &str) -> Result<()> {
        let conn = self.conn();
        conn.execute("DELETE FROM cron_jobs WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ── Webhooks ──

    pub fn create_webhook(&self, name: &str, agent_id: &str, path: &str, secret: Option<&str>, task_template: &str) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let conn = self.conn();
        conn.execute(
            "INSERT INTO webhooks (id, name, agent_id, path, secret, task_template)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, name, agent_id, path, secret, task_template],
        )?;
        Ok(id)
    }

    pub fn get_webhook_by_path(&self, path: &str) -> Result<Option<super::types::Webhook>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, name, agent_id, path, secret, task_template, is_enabled, call_count, last_called_at, created_at, updated_at
             FROM webhooks WHERE path = ?1 AND is_enabled = 1"
        )?;
        let result = stmt.query_row(params![path], |row| {
            Ok(super::types::Webhook {
                id: row.get(0)?, name: row.get(1)?, agent_id: row.get(2)?,
                path: row.get(3)?, secret: row.get(4)?, task_template: row.get(5)?,
                is_enabled: row.get::<_, i64>(6)? != 0, call_count: row.get(7)?,
                last_called_at: row.get(8)?, created_at: row.get(9)?, updated_at: row.get(10)?,
            })
        });
        match result {
            Ok(w) => Ok(Some(w)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn get_webhooks(&self) -> Result<Vec<super::types::Webhook>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, name, agent_id, path, secret, task_template, is_enabled, call_count, last_called_at, created_at, updated_at
             FROM webhooks ORDER BY created_at DESC"
        )?;
        let hooks = stmt.query_map([], |row| {
            Ok(super::types::Webhook {
                id: row.get(0)?, name: row.get(1)?, agent_id: row.get(2)?,
                path: row.get(3)?, secret: row.get(4)?, task_template: row.get(5)?,
                is_enabled: row.get::<_, i64>(6)? != 0, call_count: row.get(7)?,
                last_called_at: row.get(8)?, created_at: row.get(9)?, updated_at: row.get(10)?,
            })
        })?;
        let mut result = Vec::new();
        for h in hooks { result.push(h?); }
        Ok(result)
    }

    pub fn record_webhook_call(&self, path: &str) -> Result<()> {
        let conn = self.conn();
        let now = Self::now();
        conn.execute(
            "UPDATE webhooks SET call_count = call_count + 1, last_called_at = ?2 WHERE path = ?1",
            params![path, now],
        )?;
        Ok(())
    }

    pub fn delete_webhook(&self, id: &str) -> Result<()> {
        let conn = self.conn();
        conn.execute("DELETE FROM webhooks WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ── Events ──

    pub fn emit_event(&self, event_type: &str, source: Option<&str>, target: Option<&str>, payload: Option<&str>) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let conn = self.conn();
        conn.execute(
            "INSERT INTO events (id, event_type, source_agent, target_agent, payload)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, event_type, source, target, payload],
        )?;
        Ok(id)
    }

    pub fn get_unprocessed_events(&self, target_agent: Option<&str>) -> Result<Vec<super::types::Event>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, event_type, source_agent, target_agent, payload, processed, created_at
             FROM events WHERE processed = 0 AND (?1 IS NULL OR target_agent = ?1 OR target_agent IS NULL)
             ORDER BY created_at ASC LIMIT 50"
        )?;
        let events = stmt.query_map(params![target_agent], |row| {
            Ok(super::types::Event {
                id: row.get(0)?, event_type: row.get(1)?, source_agent: row.get(2)?,
                target_agent: row.get(3)?, payload: row.get(4)?,
                processed: row.get::<_, i64>(5)? != 0, created_at: row.get(6)?,
            })
        })?;
        let mut result = Vec::new();
        for e in events { result.push(e?); }
        Ok(result)
    }

    pub fn mark_event_processed(&self, id: &str) -> Result<()> {
        let conn = self.conn();
        conn.execute("UPDATE events SET processed = 1 WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn cleanup_old_events(&self, days: i64) -> Result<i64> {
        let conn = self.conn();
        let deleted = conn.execute(
            "DELETE FROM events WHERE processed = 1 AND created_at < datetime('now', ?1)",
            params![format!("-{} days", days)],
        )?;
        Ok(deleted as i64)
    }

    // ── Heartbeats ──

    pub fn record_heartbeat(&self, check_name: &str, status: &str, details: Option<&str>) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let conn = self.conn();
        conn.execute(
            "INSERT INTO heartbeats (id, check_name, status, details) VALUES (?1, ?2, ?3, ?4)",
            params![id, check_name, status, details],
        )?;
        Ok(id)
    }

    pub fn get_latest_heartbeats(&self) -> Result<Vec<super::types::HeartbeatRecord>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT h.id, h.check_name, h.status, h.details, h.checked_at
             FROM heartbeats h
             INNER JOIN (
                 SELECT check_name, MAX(checked_at) as latest
                 FROM heartbeats GROUP BY check_name
             ) latest ON h.check_name = latest.check_name AND h.checked_at = latest.latest
             ORDER BY h.check_name"
        )?;
        let records = stmt.query_map([], |row| {
            Ok(super::types::HeartbeatRecord {
                id: row.get(0)?, check_name: row.get(1)?, status: row.get(2)?,
                details: row.get(3)?, checked_at: row.get(4)?,
            })
        })?;
        let mut result = Vec::new();
        for r in records { result.push(r?); }
        Ok(result)
    }

    // ── Skills ──

    pub fn get_skills(&self, active_only: bool) -> Result<Vec<super::types::Skill>> {
        let conn = self.conn();
        let query = if active_only {
            "SELECT id, name, description, emoji, version, author, skill_type, instructions, triggers, agents, permissions, is_active, install_source, manifest_json, installed_at, updated_at
             FROM skills WHERE is_active = 1 ORDER BY name"
        } else {
            "SELECT id, name, description, emoji, version, author, skill_type, instructions, triggers, agents, permissions, is_active, install_source, manifest_json, installed_at, updated_at
             FROM skills ORDER BY name"
        };
        let mut stmt = conn.prepare(query)?;
        let skills = stmt.query_map([], |row| {
            Ok(super::types::Skill {
                id: row.get(0)?, name: row.get(1)?, description: row.get(2)?,
                emoji: row.get(3)?, version: row.get(4)?, author: row.get(5)?,
                skill_type: row.get(6)?, instructions: row.get(7)?, triggers: row.get(8)?,
                agents: row.get(9)?, permissions: row.get(10)?,
                is_active: row.get::<_, i64>(11)? != 0, install_source: row.get(12)?,
                manifest_json: row.get(13)?, installed_at: row.get(14)?, updated_at: row.get(15)?,
            })
        })?;
        let mut result = Vec::new();
        for s in skills { result.push(s?); }
        Ok(result)
    }

    pub fn get_skill(&self, id: &str) -> Result<Option<super::types::Skill>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, name, description, emoji, version, author, skill_type, instructions, triggers, agents, permissions, is_active, install_source, manifest_json, installed_at, updated_at
             FROM skills WHERE id = ?1"
        )?;
        let result = stmt.query_row(params![id], |row| {
            Ok(super::types::Skill {
                id: row.get(0)?, name: row.get(1)?, description: row.get(2)?,
                emoji: row.get(3)?, version: row.get(4)?, author: row.get(5)?,
                skill_type: row.get(6)?, instructions: row.get(7)?, triggers: row.get(8)?,
                agents: row.get(9)?, permissions: row.get(10)?,
                is_active: row.get::<_, i64>(11)? != 0, install_source: row.get(12)?,
                manifest_json: row.get(13)?, installed_at: row.get(14)?, updated_at: row.get(15)?,
            })
        });
        match result {
            Ok(s) => Ok(Some(s)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    /// Get skills applicable to a specific agent.
    pub fn get_skills_for_agent(&self, agent_id: &str) -> Result<Vec<super::types::Skill>> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, name, description, emoji, version, author, skill_type, instructions, triggers, agents, permissions, is_active, install_source, manifest_json, installed_at, updated_at
             FROM skills
             WHERE is_active = 1 AND (agents = '*' OR agents LIKE ?1)
             ORDER BY name"
        )?;
        let pattern = format!("%\"{}\"%", agent_id);
        let skills = stmt.query_map(params![pattern], |row| {
            Ok(super::types::Skill {
                id: row.get(0)?, name: row.get(1)?, description: row.get(2)?,
                emoji: row.get(3)?, version: row.get(4)?, author: row.get(5)?,
                skill_type: row.get(6)?, instructions: row.get(7)?, triggers: row.get(8)?,
                agents: row.get(9)?, permissions: row.get(10)?,
                is_active: row.get::<_, i64>(11)? != 0, install_source: row.get(12)?,
                manifest_json: row.get(13)?, installed_at: row.get(14)?, updated_at: row.get(15)?,
            })
        })?;
        let mut result = Vec::new();
        for s in skills { result.push(s?); }
        Ok(result)
    }

    pub fn install_skill(&self, id: &str, name: &str, description: Option<&str>, emoji: &str,
                         version: &str, author: Option<&str>, instructions: &str,
                         triggers: Option<&str>, agents: &str, permissions: Option<&str>,
                         source: &str, manifest: Option<&str>) -> Result<()> {
        let conn = self.conn();
        let now = Self::now();
        conn.execute(
            "INSERT INTO skills (id, name, description, emoji, version, author, instructions, triggers, agents, permissions, install_source, manifest_json, installed_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13)
             ON CONFLICT(id) DO UPDATE SET
                name = ?2, description = ?3, emoji = ?4, version = ?5, author = ?6,
                instructions = ?7, triggers = ?8, agents = ?9, permissions = ?10,
                install_source = ?11, manifest_json = ?12, is_active = 1, updated_at = ?13",
            params![id, name, description, emoji, version, author, instructions, triggers, agents, permissions, source, manifest, now],
        )?;
        Ok(())
    }

    pub fn toggle_skill(&self, id: &str, active: bool) -> Result<()> {
        let conn = self.conn();
        let a: i64 = if active { 1 } else { 0 };
        conn.execute(
            "UPDATE skills SET is_active = ?2, updated_at = ?3 WHERE id = ?1",
            params![id, a, Self::now()],
        )?;
        Ok(())
    }

    pub fn uninstall_skill(&self, id: &str) -> Result<()> {
        let conn = self.conn();
        conn.execute("DELETE FROM skills WHERE id = ?1", params![id])?;
        Ok(())
    }
}
