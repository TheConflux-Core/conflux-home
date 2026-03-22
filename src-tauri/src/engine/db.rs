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
        let id = uuid::Uuid::new_v4().to_string();
        let now = Self::now();
        let conn = self.conn();

        conn.execute(
            "INSERT INTO messages (id, session_id, role, content, tokens_used, model, provider_id, latency_ms)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![id, session_id, role, content, tokens_used, model, provider_id, latency_ms],
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
            tool_call_id: None,
            tool_name: None,
            tool_args: None,
            tool_result: None,
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
}
