// Conflux Engine — Agent Quarantine (Sentinel)
// Phase 8: Agent isolation with 5 quarantine levels.
// This is the unique differentiator nobody else can do.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::engine::db::EngineDb;
use crate::engine::security::events::{self, EventCategory, EventType};

// ── Quarantine Levels ──

/// Quarantine severity levels — Normal (0) through Frozen (4).
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[repr(i64)]
pub enum QuarantineLevel {
    /// Full access per security profile.
    Normal = 0,
    /// Increased logging, lower anomaly threshold.
    Watched = 1,
    /// File access → read-only, no exec, no network.
    Restricted = 2,
    /// Agent stops responding to heartbeats and messages.
    Suspended = 3,
    /// Agent process paused, all resources held. Manual only.
    Frozen = 4,
}

impl QuarantineLevel {
    pub fn from_i64(v: i64) -> Self {
        match v {
            1 => QuarantineLevel::Watched,
            2 => QuarantineLevel::Restricted,
            3 => QuarantineLevel::Suspended,
            4 => QuarantineLevel::Frozen,
            _ => QuarantineLevel::Normal,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            QuarantineLevel::Normal => "normal",
            QuarantineLevel::Watched => "watched",
            QuarantineLevel::Restricted => "restricted",
            QuarantineLevel::Suspended => "suspended",
            QuarantineLevel::Frozen => "frozen",
        }
    }

    pub fn label(&self) -> &'static str {
        match self {
            QuarantineLevel::Normal => "Normal",
            QuarantineLevel::Watched => "Watched",
            QuarantineLevel::Restricted => "Restricted",
            QuarantineLevel::Suspended => "Suspended",
            QuarantineLevel::Frozen => "Frozen",
        }
    }

    pub fn emoji(&self) -> &'static str {
        match self {
            QuarantineLevel::Normal => "🟢",
            QuarantineLevel::Watched => "🟡",
            QuarantineLevel::Restricted => "🟠",
            QuarantineLevel::Suspended => "🔴",
            QuarantineLevel::Frozen => "⛔",
        }
    }

    pub fn description(&self) -> &'static str {
        match self {
            QuarantineLevel::Normal => "Full access per security profile",
            QuarantineLevel::Watched => "Increased logging, lower anomaly threshold",
            QuarantineLevel::Restricted => "Read-only file access, no exec, no network",
            QuarantineLevel::Suspended => "Agent not responding to messages",
            QuarantineLevel::Frozen => "Agent process paused, all resources held",
        }
    }
}

// ── Types ──

/// Current quarantine status for an agent.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuarantineStatus {
    pub agent_id: String,
    pub level: i64,
    pub level_name: String,
    pub level_emoji: String,
    pub reason: String,
    pub trigger_event_id: Option<String>,
    pub auto_escalated: bool,
    pub created_at: String,
}

/// A quarantine history entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuarantineEvent {
    pub id: String,
    pub agent_id: String,
    pub level: i64,
    pub level_name: String,
    pub level_emoji: String,
    pub reason: String,
    pub trigger_event_id: Option<String>,
    pub auto_escalated: bool,
    pub is_active: bool,
    pub released_at: Option<String>,
    pub released_by: Option<String>,
    pub created_at: String,
}

// ── Core Functions ──

/// Get the current quarantine level for an agent.
pub async fn get_quarantine_level(db: &EngineDb, agent_id: &str) -> Result<QuarantineLevel> {
    let conn = db.conn_async().await;
    let level: i64 = match conn.query_row(
        "SELECT level FROM agent_quarantine
         WHERE agent_id = ?1 AND is_active = 1
         ORDER BY created_at DESC LIMIT 1",
        rusqlite::params![agent_id],
        |row| row.get(0),
    ) {
        Ok(v) => v,
        Err(rusqlite::Error::QueryReturnedNoRows) => return Ok(QuarantineLevel::Normal),
        Err(e) => return Err(e.into()),
    };

    Ok(QuarantineLevel::from_i64(level))
}

/// Get full quarantine status for an agent.
pub async fn get_quarantine_status(db: &EngineDb, agent_id: &str) -> Result<QuarantineStatus> {
    let conn = db.conn_async().await;
    let status = conn.query_row(
        "SELECT agent_id, level, reason, trigger_event_id, auto_escalated, created_at
         FROM agent_quarantine
         WHERE agent_id = ?1 AND is_active = 1
         ORDER BY created_at DESC LIMIT 1",
        rusqlite::params![agent_id],
        |row| {
            let level: i64 = row.get(1)?;
            let ql = QuarantineLevel::from_i64(level);
            Ok(QuarantineStatus {
                agent_id: row.get(0)?,
                level,
                level_name: ql.label().to_string(),
                level_emoji: ql.emoji().to_string(),
                reason: row.get(2)?,
                trigger_event_id: row.get(3)?,
                auto_escalated: row.get::<_, i64>(4)? != 0,
                created_at: row.get(5)?,
            })
        },
    );

    match status {
        Ok(s) => Ok(s),
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            let ql = QuarantineLevel::Normal;
            Ok(QuarantineStatus {
                agent_id: agent_id.to_string(),
                level: 0,
                level_name: ql.label().to_string(),
                level_emoji: ql.emoji().to_string(),
                reason: "No quarantine active".to_string(),
                trigger_event_id: None,
                auto_escalated: false,
                created_at: String::new(),
            })
        }
        Err(e) => Err(e.into()),
    }
}

/// Escalate an agent's quarantine level.
/// If the agent already has an active quarantine, releases it first.
pub async fn escalate_quarantine(
    db: &EngineDb,
    agent_id: &str,
    level: QuarantineLevel,
    reason: &str,
    trigger_event_id: Option<&str>,
    auto_escalated: bool,
) -> Result<String> {
    let conn = db.conn_async().await;

    // Release any existing active quarantine
    conn.execute(
        "UPDATE agent_quarantine SET is_active = 0, released_at = datetime('now'), released_by = ?1
         WHERE agent_id = ?2 AND is_active = 1",
        rusqlite::params![if auto_escalated { "auto" } else { "user" }, agent_id],
    )?;

    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO agent_quarantine (id, agent_id, level, reason, trigger_event_id, auto_escalated)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            id,
            agent_id,
            level as i64,
            reason,
            trigger_event_id,
            if auto_escalated { 1_i64 } else { 0_i64 },
        ],
    )?;

    // Log security event
    let event_type = match level {
        QuarantineLevel::Watched => EventType::Anomaly,
        QuarantineLevel::Restricted => EventType::PermissionDenied,
        QuarantineLevel::Suspended => EventType::PermissionDenied,
        QuarantineLevel::Frozen => EventType::Anomaly,
        _ => EventType::Anomaly,
    };

    let category = match level {
        QuarantineLevel::Normal | QuarantineLevel::Watched => EventCategory::Warning,
        QuarantineLevel::Restricted => EventCategory::Warning,
        QuarantineLevel::Suspended | QuarantineLevel::Frozen => EventCategory::Critical,
    };

    let risk = match level {
        QuarantineLevel::Normal => 0,
        QuarantineLevel::Watched => 30,
        QuarantineLevel::Restricted => 60,
        QuarantineLevel::Suspended => 85,
        QuarantineLevel::Frozen => 95,
    };

    let _ = events::log_security_event(
        db,
        agent_id,
        None,
        event_type,
        category,
        Some("quarantine"),
        Some(level.as_str()),
        Some(&format!(
            "{{\"level\":{},\"level_name\":\"{}\",\"reason\":\"{}\",\"auto_escalated\":{}}}",
            level as i64,
            level.label(),
            reason,
            auto_escalated,
        )),
        risk,
        false,
    );

    log::info!(
        "[Sentinel] Agent '{}' quarantine escalated to {} ({}): {}",
        agent_id,
        level.label(),
        level.emoji(),
        reason
    );

    Ok(id)
}

/// Release an agent from quarantine.
pub async fn release_quarantine(
    db: &EngineDb,
    agent_id: &str,
    released_by: &str,
) -> Result<bool> {
    let conn = db.conn_async().await;
    let rows = conn.execute(
        "UPDATE agent_quarantine SET is_active = 0, released_at = datetime('now'), released_by = ?1
         WHERE agent_id = ?2 AND is_active = 1",
        rusqlite::params![released_by, agent_id],
    )?;

    if rows > 0 {
        let _ = events::log_security_event(
            db,
            agent_id,
            None,
            EventType::Anomaly,
            EventCategory::Info,
            Some("quarantine"),
            Some("released"),
            Some(&format!("{{\"released_by\":\"{}\"}}", released_by)),
            10,
            true,
        );

        log::info!(
            "[Sentinel] Agent '{}' released from quarantine by {}",
            agent_id,
            released_by
        );
        Ok(true)
    } else {
        Ok(false)
    }
}

/// Get quarantine history for an agent.
pub async fn get_quarantine_history(
    db: &EngineDb,
    agent_id: Option<&str>,
    limit: i64,
) -> Result<Vec<QuarantineEvent>> {
    let conn = db.conn_async().await;

    let query = if agent_id.is_some() {
        "SELECT id, agent_id, level, reason, trigger_event_id, auto_escalated, is_active,
                released_at, released_by, created_at
         FROM agent_quarantine
         WHERE agent_id = ?1
         ORDER BY created_at DESC LIMIT ?2"
    } else {
        "SELECT id, agent_id, level, reason, trigger_event_id, auto_escalated, is_active,
                released_at, released_by, created_at
         FROM agent_quarantine
         ORDER BY created_at DESC LIMIT ?1"
    };

    let mut stmt = conn.prepare(query)?;

    let rows = if let Some(aid) = agent_id {
        stmt.query_map(rusqlite::params![aid, limit], map_quarantine_row)?
    } else {
        stmt.query_map(rusqlite::params![limit], map_quarantine_row)?
    };

    let mut events = Vec::new();
    for row in rows {
        events.push(row?);
    }
    Ok(events)
}

fn map_quarantine_row(row: &rusqlite::Row) -> rusqlite::Result<QuarantineEvent> {
    let level: i64 = row.get(2)?;
    let ql = QuarantineLevel::from_i64(level);
    Ok(QuarantineEvent {
        id: row.get(0)?,
        agent_id: row.get(1)?,
        level,
        level_name: ql.label().to_string(),
        level_emoji: ql.emoji().to_string(),
        reason: row.get(3)?,
        trigger_event_id: row.get(4)?,
        auto_escalated: row.get::<_, i64>(5)? != 0,
        is_active: row.get::<_, i64>(6)? != 0,
        released_at: row.get(7)?,
        released_by: row.get(8)?,
        created_at: row.get(9)?,
    })
}

/// Get all currently quarantined agents.
pub async fn get_all_quarantined(db: &EngineDb) -> Result<Vec<QuarantineStatus>> {
    let conn = db.conn_async().await;
    let mut stmt = conn.prepare(
        "SELECT q.agent_id, q.level, q.reason, q.trigger_event_id, q.auto_escalated, q.created_at,
                COALESCE(a.name, q.agent_id) as agent_name, COALESCE(a.emoji, '🤖') as agent_emoji
         FROM agent_quarantine q
         LEFT JOIN agents a ON a.id = q.agent_id
         WHERE q.is_active = 1
         ORDER BY q.level DESC, q.created_at DESC",
    )?;

    let rows = stmt.query_map([], |row| {
        let level: i64 = row.get(1)?;
        let ql = QuarantineLevel::from_i64(level);
        Ok(QuarantineStatus {
            agent_id: row.get(0)?,
            level,
            level_name: ql.label().to_string(),
            level_emoji: ql.emoji().to_string(),
            reason: row.get(2)?,
            trigger_event_id: row.get(3)?,
            auto_escalated: row.get::<_, i64>(4)? != 0,
            created_at: row.get(5)?,
        })
    })?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row?);
    }
    Ok(results)
}

// ── Enforcement Helpers ──

/// Check if a tool call should be blocked due to quarantine level.
/// Returns Some(reason) if blocked, None if allowed.
pub fn should_block_tool(
    level: QuarantineLevel,
    tool_name: &str,
) -> Option<String> {
    match level {
        QuarantineLevel::Normal => None,
        QuarantineLevel::Watched => None, // Watched just increases logging
        QuarantineLevel::Restricted => {
            // Block writes, exec, and network
            match tool_name {
                "file_write" => Some("File writes are blocked — agent is quarantined (Restricted)".to_string()),
                "exec" => Some("Command execution is blocked — agent is quarantined (Restricted)".to_string()),
                "web_search" | "web_fetch" | "web_post" => {
                    Some("Network access is blocked — agent is quarantined (Restricted)".to_string())
                }
                "email_send" | "gmail_send" => {
                    Some("Email sending is blocked — agent is quarantined (Restricted)".to_string())
                }
                _ => None, // Read-only operations allowed at Restricted
            }
        }
        QuarantineLevel::Suspended => {
            // Block everything — agent is suspended
            Some(format!(
                "Agent is suspended and cannot use tools. Reason: quarantined at level {}",
                level.label()
            ))
        }
        QuarantineLevel::Frozen => {
            // Block everything — agent is frozen
            Some(format!(
                "Agent is frozen and cannot use tools. Reason: quarantined at level {}",
                level.label()
            ))
        }
    }
}

// ── Auto-Escalation ──

/// Evaluate auto-escalation triggers based on recent anomaly data.
/// Called after anomaly scans. Returns Some(new_level) if escalation is needed.
pub async fn evaluate_auto_escalation(
    db: &EngineDb,
    agent_id: &str,
) -> Result<Option<(QuarantineLevel, String)>> {
    let current_level = get_quarantine_level(db, agent_id).await?;

    // Don't escalate beyond Suspended automatically — Frozen requires manual confirmation
    if current_level >= QuarantineLevel::Suspended {
        return Ok(None);
    }

    // Count anomaly triggers in the last hour
    let conn = db.conn_async().await;
    let anomaly_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM security_events
         WHERE agent_id = ?1 AND event_type = 'anomaly'
         AND created_at >= datetime('now', '-1 hour')",
        rusqlite::params![agent_id],
        |row| row.get(0),
    )?;

    // Count permission denials in the last 10 minutes
    let denial_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM security_events
         WHERE agent_id = ?1 AND event_type = 'permission_denied'
         AND created_at >= datetime('now', '-10 minutes')",
        rusqlite::params![agent_id],
        |row| row.get(0),
    )?;

    // Check for critical SIEM alerts for this agent
    let has_critical_alert: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM siem_alerts
         WHERE agent_id = ?1 AND status = 'active' AND severity = 'critical'",
        rusqlite::params![agent_id],
        |row| row.get(0),
    )
    .unwrap_or(false);

    // Auto-escalation rules:
    // Level 0 → 1: 3+ anomaly triggers in 1 hour
    // Level 1 → 2: Critical finding from agent_audit (breach detected)
    // Level 2 → 3: 5+ permission denials in 10 minutes + critical SIEM alert

    if current_level == QuarantineLevel::Normal && anomaly_count >= 3 {
        return Ok(Some((
            QuarantineLevel::Watched,
            format!(
                "Auto-escalated: {} anomalies detected in the last hour (threshold: 3)",
                anomaly_count
            ),
        )));
    }

    if current_level == QuarantineLevel::Watched && has_critical_alert {
        return Ok(Some((
            QuarantineLevel::Restricted,
            "Auto-escalated: Critical security alert detected — restricting agent access".to_string(),
        )));
    }

    if current_level == QuarantineLevel::Restricted && denial_count >= 5 && has_critical_alert {
        return Ok(Some((
            QuarantineLevel::Suspended,
            format!(
                "Auto-escalated: {} permission denials in 10 minutes + critical alert — suspending agent",
                denial_count
            ),
        )));
    }

    Ok(None)
}

/// Run auto-escalation check across all active agents.
/// Called periodically (from anomaly scan or cron).
pub async fn run_auto_escalation(db: &EngineDb) -> Result<Vec<(String, QuarantineLevel)>> {
    // Collect agent IDs using blocking_readonly (avoids MutexGuard borrow issues)
    let agents: Vec<String> = db.blocking_readonly(|conn| {
        let mut stmt = conn.prepare("SELECT id FROM agents WHERE is_active = 1")?;
        let mut results = Vec::new();
        for row in stmt.query_map([], |row| row.get(0))? {
            results.push(row?);
        }
        Ok(results)
    });

    let mut escalations = Vec::new();

    for agent_id in &agents {
        if let Some((new_level, reason)) = evaluate_auto_escalation(db, agent_id).await? {
            let _ = escalate_quarantine(
                db,
                agent_id,
                new_level,
                &reason,
                None,
                true, // auto_escalated
            )
            .await;
            escalations.push((agent_id.clone(), new_level));
        }
    }

    if !escalations.is_empty() {
        log::warn!(
            "[Sentinel] Auto-escalated {} agents: {:?}",
            escalations.len(),
            escalations.iter().map(|(id, l)| format!("{}→{}", id, l.label())).collect::<Vec<_>>()
        );
    }

    Ok(escalations)
}

/// Check if an agent can receive messages (for runtime dispatch).
/// Returns false if agent is Suspended or Frozen.
pub async fn can_agent_respond(db: &EngineDb, agent_id: &str) -> Result<bool> {
    let level = get_quarantine_level(db, agent_id).await?;
    Ok(level < QuarantineLevel::Suspended)
}
