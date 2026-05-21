// Conflux Home - Hearth Nutritionist Backend
// Session management, nutrition AI companion. Completely separate from Echo Counselor.

use crate::engine::router::OpenAIMessage;
use crate::engine::{get_engine, try_get_engine, router};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

fn to_string(err: rusqlite::Error) -> String {
    err.to_string()
}

// Hearth Nutritionist system prompt
pub const HEARTH_SYSTEM_PROMPT: &str = r#"You are Hearth, a warm, evidence-based nutritionist AI companion in the Conflux Home app. You are NOT a licensed doctor. You are a knowledgeable, approachable guide who helps people eat well, feel great, and build sustainable food habits.

## Your Identity
- Name: Hearth
- Tone: Warm but scientific. Practical but thorough. You sound like a trusted friend who happens to have deep nutrition knowledge.
- You reference real science -- macro balancing, gut health research, anti-inflammatory eating, glycemic index, micronutrient density.
- You personalize based on what the user shares about their goals, restrictions, lifestyle, and preferences.
- You do NOT push trends, fads, or quick fixes. You focus on sustainable, evidence-based habits.

## What You Do
- Help with macro balancing (protein, carbs, fats) and understanding individual needs
- Meal planning for specific goals: weight loss, muscle gain, energy optimization, longevity, gut health
- Reading food labels and evaluating ingredient quality
- Nutrition timing (pre/post workout, around sleep, during stress)
- Supplement guidance -- what is worth it, what is marketing, what is essential
- Gut health and microbiome education
- Anti-inflammatory eating patterns
- Building sustainable habits around food -- no guilt, no shame
- Helping users understand their body's signals around hunger, fullness, energy

## What You DON'T Do
- Diagnose medical conditions or claim to treat diseases
- Prescribe medication or suggest supplements as treatment
- Push restrictive diets, extreme deficits, or "clean eating" ideology
- Use fear-based nutrition messaging
- Replace professional medical or dietetic advice
- Promise quick fixes or dramatic transformations

## Session Flow
1. Open warmly. Acknowledge what the user shared previously if resuming a session.
2. Ask a focused question about their goals, current eating patterns, or a specific nutrition question.
3. Provide clear, actionable advice with brief science explanation.
4. Offer a concrete next step -- a meal idea, a swap, a timing adjustment, a habit to try.

## Disordered Eating Protocol
If someone expresses signs of disordered eating, extreme restriction, or unhealthy patterns:
- Respond with immediate warmth and care
- Say something like: "I hear you, and I want to be really careful here. What you're describing sounds like it might be worth talking through with someone who can give you real support -- a registered dietitian or someone on your care team."
- Do NOT lecture or moralize. Be gentle and direct.
- Stay present in the conversation without enabling unhealthy patterns.

## Format
- Keep responses conversational (2-4 paragraphs, usually shorter)
- Use line breaks between distinct thoughts
- Ask one focused question at a time
- Give concrete examples -- meal ideas, specific food swaps, actual portion guidance
"#;

// TYPES

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HearthNutritionistMessage {
    pub id: String,
    pub session_id: String,
    pub role: String, // "user" | "counselor" | "system"
    pub content: String,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HearthNutritionistSession {
    pub id: String,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub status: String, // "active" | "paused" | "completed"
    pub message_count: i64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HearthStartSessionRequest {
    pub opening: Option<String>,
}

// DATABASE SETUP

pub fn init_tables() -> Result<(), String> {
    let engine = match try_get_engine() {
        Some(e) => e,
        None => {
            log::warn!("[HearthNutritionist] Engine not available, skipping table init");
            return Ok(());
        }
    };
    let conn = engine.db.conn_blocking();

    conn.execute_batch(
        "
        -- Hearth Nutritionist Sessions
        CREATE TABLE IF NOT EXISTS hearth_nutritionist_sessions (
            id TEXT PRIMARY KEY,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            message_count INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );

        -- Hearth Nutritionist Messages
        CREATE TABLE IF NOT EXISTS hearth_nutritionist_messages (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES hearth_nutritionist_sessions(id) ON DELETE CASCADE
        );
        ",
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

// SESSION MANAGEMENT

pub fn start_session(_req: HearthStartSessionRequest) -> Result<HearthNutritionistSession, String> {
    let engine = get_engine();
    let conn = engine.db.conn_blocking();

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let status = "active";

    conn.execute(
        "INSERT INTO hearth_nutritionist_sessions (id, started_at, status, created_at) VALUES (?, ?, ?, ?)",
        [&id, &now, status, &now],
    )
    .map_err(|e| e.to_string())?;

    // Add Hearth's opening message
    let msg_id = Uuid::new_v4().to_string();
    let opening = "Hi! I'm Hearth, your nutrition companion. I'm here to help you eat well, feel great, and build sustainable habits around food.\n\nWhat are you working on right now? Are you trying to lose weight, gain muscle, have more energy, or just eat better overall?".to_string();
    conn.execute(
        "INSERT INTO hearth_nutritionist_messages (id, session_id, role, content, timestamp) VALUES (?, ?, 'counselor', ?, ?)",
        [&msg_id, &id, &opening, &now],
    )
    .map_err(|e| e.to_string())?;

    Ok(HearthNutritionistSession {
        id,
        started_at: now.clone(),
        ended_at: None,
        status: status.to_string(),
        message_count: 1,
        created_at: now,
    })
}

pub fn get_messages(session_id: &str) -> Result<Vec<HearthNutritionistMessage>, String> {
    let engine = get_engine();
    let conn = engine.db.conn_blocking();

    let messages: Vec<HearthNutritionistMessage> = conn
        .prepare(
            "SELECT id, session_id, role, content, timestamp FROM hearth_nutritionist_messages WHERE session_id = ? ORDER BY timestamp ASC",
        )
        .map_err(to_string)?
        .query_map([session_id], |row| {
            Ok(HearthNutritionistMessage {
                id: row.get(0)?,
                session_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                timestamp: row.get(4)?,
            })
        })
        .map_err(to_string)?
        .filter_map(|r| r.ok())
        .collect();

    Ok(messages)
}

pub async fn send_message(session_id: &str, content: &str) -> Result<HearthNutritionistMessage, String> {
    use tokio::task;

    let session_id_str = session_id.to_string();
    let content_str = content.to_string();

    // Phase 1: Insert user message (blocking)
    let _ = task::spawn_blocking({
        let sid = session_id_str.clone();
        let txt = content_str.clone();
        move || -> Result<(), String> {
            let engine = get_engine();
            let conn = engine.db.conn_blocking();
            let now = Utc::now().to_rfc3339();
            let uid = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO hearth_nutritionist_messages (id, session_id, role, content, timestamp) VALUES (?, ?, 'user', ?, ?)",
                [&uid, &sid, &txt, &now],
            )
            .map_err(to_string)?;
            conn.execute(
                "UPDATE hearth_nutritionist_sessions SET message_count = message_count + 1 WHERE id = ?",
                [&sid],
            )
            .map_err(to_string)?;
            Ok(())
        }
    })
    .await
    .map_err(|e| e.to_string())??;

    // Phase 2: Get conversation history (blocking)
    let messages = task::spawn_blocking({
        let sid = session_id_str.clone();
        move || -> Result<Vec<HearthNutritionistMessage>, String> {
            get_messages(&sid)
        }
    })
    .await
    .map_err(|e| e.to_string())??;

    // Build OpenAI messages with Hearth's system prompt
    let mut openai_messages: Vec<OpenAIMessage> = vec![OpenAIMessage {
        role: "system".to_string(),
        content: Some(HEARTH_SYSTEM_PROMPT.to_string()),
        tool_call_id: None,
        tool_calls: None,
    }];

    // Inject user's name into context if available
    let user_name: Option<String> = {
        let engine = get_engine();
        engine.db.blocking_readonly(|conn| {
            let mut stmt = match conn.prepare("SELECT value FROM config WHERE key = 'user_name'") {
                Ok(s) => s,
                Err(_) => return Ok(None::<String>),
            };
            Ok(stmt.query_row([], |row| row.get::<_, String>(0)).ok())
        })
    };
    if let Some(name) = user_name {
        if !name.is_empty() {
            openai_messages.push(OpenAIMessage {
                role: "system".to_string(),
                content: Some(format!("The user's name is {}. Always address them by name when appropriate.", name)),
                tool_call_id: None,
                tool_calls: None,
            });
        }
    }

    for msg in &messages {
        let role = match msg.role.as_str() {
            "counselor" => "assistant",
            _ => &msg.role,
        };
        openai_messages.push(OpenAIMessage {
            role: role.to_string(),
            content: Some(msg.content.clone()),
            tool_call_id: None,
            tool_calls: None,
        });
    }

    openai_messages.push(OpenAIMessage {
        role: "user".to_string(),
        content: Some(content_str.clone()),
        tool_call_id: None,
        tool_calls: None,
    });

    // Phase 3: Call LLM (async)
    let response = router::chat("hearth", openai_messages, None, None, None)
        .await
        .map_err(|e| e.to_string())?;

    // Phase 4: Insert counselor response (blocking)
    let response_content = response.content.clone();
    let response_timestamp = Utc::now().to_rfc3339();
    let counselor_msg_id = Uuid::new_v4().to_string();

    let _ = task::spawn_blocking({
        let sid = session_id_str.clone();
        let txt = response_content.clone();
        let ts = response_timestamp.clone();
        let cid = counselor_msg_id.clone();
        move || -> Result<(), String> {
            let engine = get_engine();
            let conn = engine.db.conn_blocking();
            conn.execute(
                "INSERT INTO hearth_nutritionist_messages (id, session_id, role, content, timestamp) VALUES (?, ?, 'counselor', ?, ?)",
                [&cid, &sid, &txt, &ts],
            )
            .map_err(to_string)?;
            conn.execute(
                "UPDATE hearth_nutritionist_sessions SET message_count = message_count + 1 WHERE id = ?",
                [&sid],
            )
            .map_err(to_string)?;
            Ok(())
        }
    })
    .await
    .map_err(|e| e.to_string())??;

    Ok(HearthNutritionistMessage {
        id: counselor_msg_id,
        session_id: session_id_str,
        role: "counselor".to_string(),
        content: response.content,
        timestamp: response_timestamp,
    })
}

pub fn end_session(session_id: &str) -> Result<(), String> {
    let engine = get_engine();
    let conn = engine.db.conn_blocking();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE hearth_nutritionist_sessions SET status = 'completed', ended_at = ? WHERE id = ?",
        [&now, session_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

// INIT

pub fn init() -> Result<(), String> {
    init_tables()
}