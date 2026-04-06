use anyhow::Result;
use rusqlite::params;
use uuid::Uuid;
use super::EngineDb;
use super::types::AgentMessage;

impl EngineDb {
    /// Create the agent_messages table if it doesn't exist.
    pub fn init_agent_comms_schema(&self) -> Result<()> {
        let conn = self.conn();
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS agent_messages (
                id TEXT PRIMARY KEY,
                sender_id TEXT NOT NULL,
                receiver_id TEXT NOT NULL,
                message_type TEXT NOT NULL,
                payload TEXT NOT NULL,
                read_at TEXT,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_agent_messages_receiver_unread 
            ON agent_messages (receiver_id) WHERE read_at IS NULL;
            ",
        )?;
        Ok(())
    }

    /// Send a message from one agent to another.
    pub fn send_agent_message(
        &self,
        sender_id: &str,
        receiver_id: &str,
        message_type: &str,
        payload: &serde_json::Value,
    ) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let created_at = chrono::Utc::now().to_rfc3339();
        let payload_str = payload.to_string();

        let conn = self.conn();
        conn.execute(
            "INSERT INTO agent_messages (id, sender_id, receiver_id, message_type, payload, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, sender_id, receiver_id, message_type, payload_str, created_at],
        )?;
        Ok(id)
    }

    /// Get unread messages for a specific agent.
    pub fn get_unread_messages(
        &self,
        receiver_id: &str,
        limit: Option<i64>,
    ) -> Result<Vec<AgentMessage>> {
        let lim = limit.unwrap_or(50);
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, sender_id, receiver_id, message_type, payload, read_at, created_at
             FROM agent_messages
             WHERE receiver_id = ?1 AND read_at IS NULL
             ORDER BY created_at ASC
             LIMIT ?2",
        )?;
        let messages: Vec<AgentMessage> = stmt.query_map(params![receiver_id, lim], |row| {
            let payload_str: String = row.get(4)?;
            let payload: serde_json::Value = serde_json::from_str(&payload_str).unwrap_or_default();
            Ok(AgentMessage {
                id: row.get(0)?,
                sender_id: row.get(1)?,
                receiver_id: row.get(2)?,
                message_type: row.get(3)?,
                payload,
                read_at: row.get(5)?,
                created_at: row.get(6)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        Ok(messages)
    }

    /// Mark a specific message as read.
    pub fn mark_message_read(&self, message_id: &str) -> Result<()> {
        let conn = self.conn();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE agent_messages SET read_at = ?1 WHERE id = ?2",
            params![now, message_id],
        )?;
        Ok(())
    }

    /// Get all communications for a specific agent (for the Team Chat UI).
    pub fn get_agent_communications(
        &self,
        agent_id: &str,
        limit: Option<i64>,
    ) -> Result<Vec<AgentMessage>> {
        let lim = limit.unwrap_or(50);
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, sender_id, receiver_id, message_type, payload, read_at, created_at
             FROM agent_messages
             WHERE sender_id = ?1 OR receiver_id = ?1
             ORDER BY created_at DESC
             LIMIT ?2",
        )?;
        let messages: Vec<AgentMessage> = stmt.query_map(params![agent_id, lim], |row| {
            let payload_str: String = row.get(4)?;
            let payload: serde_json::Value = serde_json::from_str(&payload_str).unwrap_or_default();
            Ok(AgentMessage {
                id: row.get(0)?,
                sender_id: row.get(1)?,
                receiver_id: row.get(2)?,
                message_type: row.get(3)?,
                payload,
                read_at: row.get(5)?,
                created_at: row.get(6)?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        Ok(messages)
    }
}
