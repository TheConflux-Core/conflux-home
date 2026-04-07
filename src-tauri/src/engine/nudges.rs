//! Nudge Engine — Phase 1.3
//!
//! Provides backend logic for managing nudges, preferences, and nudge timing.
//! Frontend handles idle monitoring; backend stores preferences and nudge history.
//!
//! # Features
//! - Persistent nudge preferences (per-type enable/disable)
//! - Nudge history tracking (for cooldown management)
//! - Time-based nudge validation
//! - Configurable nudge settings

use rusqlite::{params, Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum NudgeType {
    BudgetUncategorized,
    KitchenExpiry,
    DreamOverdue,
    HabitStreak,
}

// Implement rusqlite::ToSql for NudgeType
impl rusqlite::ToSql for NudgeType {
    fn to_sql(&self) -> rusqlite::Result<rusqlite::types::ToSqlOutput<'_>> {
        let s = match self {
            NudgeType::BudgetUncategorized => "budget_uncategorized",
            NudgeType::KitchenExpiry => "kitchen_expiry",
            NudgeType::DreamOverdue => "dream_overdue",
            NudgeType::HabitStreak => "habit_streak",
        };
        Ok(rusqlite::types::ToSqlOutput::Owned(
            rusqlite::types::Value::Text(s.to_string()),
        ))
    }
}

// Implement rusqlite::types::FromSql for NudgeType
impl rusqlite::types::FromSql for NudgeType {
    fn column_result(value: rusqlite::types::ValueRef<'_>) -> rusqlite::types::FromSqlResult<Self> {
        let s = value.as_str()?;
        match s {
            "budget_uncategorized" => Ok(NudgeType::BudgetUncategorized),
            "kitchen_expiry" => Ok(NudgeType::KitchenExpiry),
            "dream_overdue" => Ok(NudgeType::DreamOverdue),
            "habit_streak" => Ok(NudgeType::HabitStreak),
            _ => Err(rusqlite::types::FromSqlError::InvalidType),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NudgeData {
    pub id: String,
    pub nudge_type: NudgeType,
    pub message: String,
    pub timestamp: String,
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NudgePreference {
    pub id: String,
    pub user_id: String,
    pub nudge_type: NudgeType,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NudgeHistory {
    pub id: String,
    pub user_id: String,
    pub nudge_type: NudgeType,
    pub shown_at: String,
    pub dismissed_at: Option<String>,
    pub action_taken: bool,
    pub permanent_dismissal: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NudgeSettings {
    pub max_nudges_per_hour: i32,
    pub cooldown_minutes: i32,
    pub idle_threshold_minutes: i32,
    pub auto_dismiss_seconds: i32,
}

// Default settings
impl Default for NudgeSettings {
    fn default() -> Self {
        Self {
            max_nudges_per_hour: 2,
            cooldown_minutes: 30,
            idle_threshold_minutes: 5,
            auto_dismiss_seconds: 10,
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

fn get_current_timestamp() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards");
    let seconds = now.as_secs();
    let dt = chrono::NaiveDateTime::from_timestamp_opt(seconds as i64, 0)
        .unwrap_or_else(|| chrono::NaiveDateTime::from_timestamp_opt(0, 0).unwrap());
    dt.format("%Y-%m-%d %H:%M:%S").to_string()
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Operations
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug)]
pub struct NudgeEngine {
    pub conn: Connection,
    pub settings: NudgeSettings,
}

impl NudgeEngine {
    pub fn new(conn: Connection) -> Self {
        Self {
            conn,
            settings: NudgeSettings::default(),
        }
    }

    pub fn with_settings(mut self, settings: NudgeSettings) -> Self {
        self.settings = settings;
        self
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Preferences
    // ─────────────────────────────────────────────────────────────────────────

    pub fn get_preferences(&self, user_id: &str) -> SqliteResult<Vec<NudgePreference>> {
        let mut stmt = self
            .conn
            .prepare("SELECT * FROM nudge_preferences WHERE user_id = ? ORDER BY nudge_type")?;
        let prefs = stmt
            .query_map(params![user_id], |row| {
                Ok(NudgePreference {
                    id: row.get("id")?,
                    user_id: row.get("user_id")?,
                    nudge_type: row.get("nudge_type")?,
                    enabled: row.get::<_, i32>("enabled")? == 1,
                    created_at: row.get("created_at")?,
                    updated_at: row.get("updated_at")?,
                })
            })?
            .collect::<SqliteResult<Vec<_>>>()?;

        Ok(prefs)
    }

    pub fn get_preference(
        &self,
        user_id: &str,
        nudge_type: NudgeType,
    ) -> SqliteResult<Option<NudgePreference>> {
        let mut stmt = self
            .conn
            .prepare("SELECT * FROM nudge_preferences WHERE user_id = ? AND nudge_type = ?")?;
        let result = stmt
            .query_map(params![user_id, nudge_type], |row| {
                Ok(NudgePreference {
                    id: row.get("id")?,
                    user_id: row.get("user_id")?,
                    nudge_type: row.get("nudge_type")?,
                    enabled: row.get::<_, i32>("enabled")? == 1,
                    created_at: row.get("created_at")?,
                    updated_at: row.get("updated_at")?,
                })
            })?
            .next();

        match result {
            Some(Ok(pref)) => Ok(Some(pref)),
            Some(Err(e)) => Err(e),
            None => Ok(None),
        }
    }

    pub fn set_preference(
        &mut self,
        user_id: &str,
        nudge_type: NudgeType,
        enabled: bool,
    ) -> SqliteResult<()> {
        let timestamp = get_current_timestamp();

        self.conn.execute(
            r#"
            INSERT INTO nudge_preferences (id, user_id, nudge_type, enabled, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, nudge_type) 
            DO UPDATE SET enabled = ?, updated_at = ?
            "#,
            params![
                uuid::Uuid::new_v4().to_string(),
                user_id,
                nudge_type,
                if enabled { 1 } else { 0 },
                &timestamp,
                &timestamp,
                if enabled { 1 } else { 0 },
                &timestamp,
            ],
        )?;

        Ok(())
    }

    pub fn disable_nudge_type(
        &mut self,
        user_id: &str,
        nudge_type: NudgeType,
    ) -> SqliteResult<()> {
        self.set_preference(user_id, nudge_type, false)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // History
    // ─────────────────────────────────────────────────────────────────────────

    pub fn get_nudge_history(
        &self,
        user_id: &str,
        limit: Option<i64>,
    ) -> SqliteResult<Vec<NudgeHistory>> {
        let query = format!(
            "SELECT * FROM nudge_history WHERE user_id = ? ORDER BY shown_at DESC{}",
            limit.map(|n| format!(" LIMIT {}", n)).unwrap_or_default()
        );

        let mut stmt = self.conn.prepare(&query)?;
        let history = stmt
            .query_map(params![user_id], |row| {
                Ok(NudgeHistory {
                    id: row.get("id")?,
                    user_id: row.get("user_id")?,
                    nudge_type: row.get("nudge_type")?,
                    shown_at: row.get("shown_at")?,
                    dismissed_at: row.get("dismissed_at")?,
                    action_taken: row.get::<_, i32>("action_taken")? == 1,
                    permanent_dismissal: row.get::<_, i32>("permanent_dismissal")? == 1,
                })
            })?
            .collect::<SqliteResult<Vec<_>>>()?;

        Ok(history)
    }

    pub fn get_recent_nudges(
        &self,
        user_id: &str,
        nudge_type: NudgeType,
        since_minutes: i64,
    ) -> SqliteResult<Vec<NudgeHistory>> {
        let since_time = chrono::Utc::now() - chrono::Duration::minutes(since_minutes);
        let since_str = since_time.format("%Y-%m-%d %H:%M:%S").to_string();

        let mut stmt = self.conn.prepare(
            "SELECT * FROM nudge_history WHERE user_id = ? AND nudge_type = ? AND shown_at >= ? ORDER BY shown_at DESC",
        )?;
        let history = stmt
            .query_map(params![user_id, nudge_type, since_str], |row| {
                Ok(NudgeHistory {
                    id: row.get("id")?,
                    user_id: row.get("user_id")?,
                    nudge_type: row.get("nudge_type")?,
                    shown_at: row.get("shown_at")?,
                    dismissed_at: row.get("dismissed_at")?,
                    action_taken: row.get::<_, i32>("action_taken")? == 1,
                    permanent_dismissal: row.get::<_, i32>("permanent_dismissal")? == 1,
                })
            })?
            .collect::<SqliteResult<Vec<_>>>()?;

        Ok(history)
    }

    pub fn record_nudge_shown(
        &mut self,
        user_id: &str,
        nudge_type: NudgeType,
    ) -> SqliteResult<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let timestamp = get_current_timestamp();

        self.conn.execute(
            "INSERT INTO nudge_history (id, user_id, nudge_type, shown_at, dismissed_at, action_taken, permanent_dismissal) VALUES (?, ?, ?, ?, NULL, FALSE, FALSE)",
            params![&id, user_id, nudge_type, &timestamp],
        )?;

        Ok(id)
    }

    pub fn record_nudge_dismissed(
        &mut self,
        history_id: &str,
        permanent: bool,
    ) -> SqliteResult<()> {
        let timestamp = get_current_timestamp();

        self.conn.execute(
            "UPDATE nudge_history SET dismissed_at = ?, permanent_dismissal = ? WHERE id = ?",
            params![&timestamp, if permanent { 1 } else { 0 }, history_id],
        )?;

        Ok(())
    }

    pub fn record_nudge_action(&mut self, history_id: &str) -> SqliteResult<()> {
        self.conn.execute(
            "UPDATE nudge_history SET action_taken = TRUE WHERE id = ?",
            params![history_id],
        )?;

        Ok(())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Validation
    // ─────────────────────────────────────────────────────────────────────────

    pub fn can_show_nudge(&self, user_id: &str, nudge_type: NudgeType) -> SqliteResult<bool> {
        // Check if nudge type is enabled
        let pref = self.get_preference(user_id, nudge_type)?;
        if let Some(p) = pref {
            if !p.enabled {
                return Ok(false);
            }
        } else {
            // Default to enabled if no preference exists
            // Note: This can't mutate self, so we rely on frontend to handle defaults
        }

        // Check cooldown
        let recent = self.get_recent_nudges(user_id, nudge_type, self.settings.cooldown_minutes as i64)?;

        if !recent.is_empty() {
            return Ok(false);
        }

        // Check hourly limit
        let recent_hourly = self.get_recent_nudges(user_id, nudge_type, 60)?;

        if recent_hourly.len() >= self.settings.max_nudges_per_hour as usize {
            return Ok(false);
        }

        Ok(true)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Settings
    // ─────────────────────────────────────────────────────────────────────────

    pub fn get_settings(&self, _user_id: &str) -> SqliteResult<NudgeSettings> {
        // For now, return global settings
        // In future, could be per-user settings from database
        Ok(self.settings.clone())
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_nudge_preferences() -> SqliteResult<()> {
        let conn = Connection::open_in_memory()?;

        // Create table schema
        conn.execute(
            r#"
            CREATE TABLE nudge_preferences (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                nudge_type TEXT NOT NULL,
                enabled INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(user_id, nudge_type)
            )
            "#,
            [],
        )?;

        let mut engine = NudgeEngine::new(conn);

        // Test setting a preference
        engine.set_preference("user1", NudgeType::BudgetUncategorized, false)?;

        let pref = engine.get_preference("user1", NudgeType::BudgetUncategorized)?;

        assert!(pref.is_some());
        assert!(!pref.unwrap().enabled);

        Ok(())
    }
}
