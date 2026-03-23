// Conflux Engine — Tauri Commands
// All invoke() handlers live here. Lib.rs stays clean.

use tauri::{Manager, Emitter};
use serde::{Deserialize, Serialize};
use super::engine;

// ── Request/Response Types ──

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatRequest {
    pub session_id: String,
    pub agent_id: String,
    pub message: String,
    pub max_tokens: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct ChatResponse {
    pub content: String,
    pub model: String,
    pub provider_id: String,
    pub provider_name: String,
    pub tokens_used: i64,
    pub latency_ms: i64,
    pub calls_remaining: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub id: String,
    pub name: String,
    pub base_url: String,
    pub api_key: String,
    pub model_id: String,
    pub model_alias: String,
    pub priority: i32,
    pub is_enabled: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentUpdateRequest {
    pub id: String,
    pub name: Option<String>,
    pub emoji: Option<String>,
    pub role: Option<String>,
    pub soul: Option<String>,
    pub instructions: Option<String>,
    pub model_alias: Option<String>,
}

// ── Chat Commands ──

#[tauri::command]
pub async fn engine_chat(window: tauri::Window, req: ChatRequest) -> Result<ChatResponse, String> {
    let engine = engine::get_engine();

    if !engine.has_quota("default").map_err(|e| e.to_string())? {
        return Err("Daily free limit reached. Upgrade to Pro for unlimited calls.".to_string());
    }

    let _ = window.emit("engine:thinking", ());

    let response = engine.chat(
        &req.session_id,
        &req.agent_id,
        &req.message,
        req.max_tokens,
    ).await.map_err(|e| e.to_string())?;

    let calls = engine.increment_quota("default", response.tokens_used, &response.provider_id)
        .map_err(|e| e.to_string())?;

    let limit = get_daily_limit(engine);

    Ok(ChatResponse {
        content: response.content,
        model: response.model,
        provider_id: response.provider_id,
        provider_name: response.provider_name,
        tokens_used: response.tokens_used,
        latency_ms: response.latency_ms,
        calls_remaining: (limit - calls).max(0),
    })
}

#[tauri::command]
pub async fn engine_chat_stream(window: tauri::Window, req: ChatRequest) -> Result<(), String> {
    let engine = engine::get_engine();

    if !engine.has_quota("default").map_err(|e| e.to_string())? {
        window.emit("engine:error", "Daily free limit reached. Upgrade to Pro for unlimited calls.")
            .map_err(|e| e.to_string())?;
        return Err("Daily free limit reached.".to_string());
    }

    let _ = window.emit("engine:thinking", ());

    let result = engine.chat(
        &req.session_id,
        &req.agent_id,
        &req.message,
        req.max_tokens,
    ).await;

    match result {
        Ok(response) => {
            let calls = engine.increment_quota("default", response.tokens_used, &response.provider_id)
                .map_err(|e| e.to_string())?;

            let limit = get_daily_limit(engine);

            // Emit response in word-chunks for streaming feel
            let words: Vec<&str> = response.content.split_whitespace().collect();
            for chunk in words.chunks(4) {
                let chunk_text = chunk.join(" ") + " ";
                let _ = window.emit("engine:chunk", serde_json::json!({ "text": chunk_text }));
                tokio::time::sleep(std::time::Duration::from_millis(20)).await;
            }

            window.emit("engine:done", serde_json::json!({
                "content": response.content,
                "model": response.model,
                "provider_id": response.provider_id,
                "provider_name": response.provider_name,
                "tokens_used": response.tokens_used,
                "latency_ms": response.latency_ms,
                "calls_remaining": (limit - calls).max(0),
            })).map_err(|e| e.to_string())?;

            Ok(())
        }
        Err(e) => {
            let msg = e.to_string();
            window.emit("engine:error", &msg).map_err(|e| e.to_string())?;
            Err(msg)
        }
    }
}

// ── Session Commands ──

#[tauri::command]
pub fn engine_create_session(agent_id: String) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let session = engine.create_session(&agent_id, "default").map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(session).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn engine_get_sessions(limit: Option<i64>) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let sessions = engine.get_sessions(limit.unwrap_or(20)).map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(sessions).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn engine_get_messages(session_id: String, limit: Option<i64>) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let messages = engine.get_messages(&session_id, limit.unwrap_or(50)).map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(messages).map_err(|e| e.to_string())?)
}

// ── Agent Commands ──

#[tauri::command]
pub fn engine_get_agents() -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let agents = engine.get_agents().map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(agents).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn engine_update_agent(req: AgentUpdateRequest) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.update_agent(
        &req.id,
        req.name.as_deref(),
        req.emoji.as_deref(),
        req.role.as_deref(),
        req.soul.as_deref(),
        req.instructions.as_deref(),
        req.model_alias.as_deref(),
    ).map_err(|e| e.to_string())
}

// ── Quota Commands ──

#[tauri::command]
pub fn engine_get_quota() -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let quota = engine.get_quota("default").map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(quota).map_err(|e| e.to_string())?)
}

// ── Memory Commands ──

#[tauri::command]
pub fn engine_store_memory(
    agent_id: String,
    memory_type: String,
    key: Option<String>,
    content: String,
    source: Option<String>,
) -> Result<String, String> {
    let engine = engine::get_engine();
    engine.store_memory(
        &agent_id,
        &memory_type,
        key.as_deref(),
        &content,
        source.as_deref(),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_search_memory(agent_id: String, query: String, limit: Option<i64>) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let memories = engine.search_memory(&agent_id, &query, limit.unwrap_or(5)).map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(memories).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn engine_get_memories(agent_id: String, limit: Option<i64>) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let memories = engine.get_all_memories(&agent_id, limit.unwrap_or(50)).map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(memories).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn engine_delete_memory(memory_id: String) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.delete_memory(&memory_id).map_err(|e| e.to_string())
}

// ── Provider Commands ──

#[tauri::command]
pub fn engine_get_providers() -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let providers = engine.get_providers().map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(providers).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn engine_update_provider(req: ProviderConfig) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.update_provider(
        &req.id,
        &req.name,
        &req.base_url,
        &req.api_key,
        &req.model_id,
        &req.model_alias,
        req.priority,
        req.is_enabled,
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_delete_provider(id: String) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.delete_provider(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_test_provider(id: String) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let result = engine.test_provider(&id);
    match result {
        Ok(info) => Ok(serde_json::json!({
            "success": true,
            "model": info.model,
            "latency_ms": info.latency_ms,
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "error": e.to_string(),
        })),
    }
}

// ── Provider Template Commands ──

#[derive(Debug, Serialize, Deserialize)]
pub struct InstallTemplateRequest {
    pub template_id: String,
    pub api_key: Option<String>,
    pub model: Option<String>,
}

#[tauri::command]
pub fn engine_get_provider_templates() -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let templates = engine.get_provider_templates().map_err(|e| e.to_string())?;

    // Add installed status to each template
    let result: Vec<serde_json::Value> = templates.into_iter().map(|t| {
        let installed = engine.is_template_installed(&t.id).unwrap_or(false);
        serde_json::json!({
            "id": t.id,
            "name": t.name,
            "emoji": t.emoji,
            "description": t.description,
            "base_url": t.base_url,
            "models": t.models,
            "default_model": t.default_model,
            "model_alias": t.model_alias,
            "category": t.category,
            "docs_url": t.docs_url,
            "is_free": t.is_free,
            "is_installed": installed,
        })
    }).collect();

    Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn engine_install_template(req: InstallTemplateRequest) -> Result<String, String> {
    let engine = engine::get_engine();
    engine.install_provider_template(
        &req.template_id,
        req.api_key.as_deref(),
        req.model.as_deref(),
    ).map_err(|e| e.to_string())
}

// ── Agent Registry & Capabilities ──

#[tauri::command]
pub fn engine_get_agent_capabilities(agent_id: String) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let caps = engine.get_agent_capabilities(&agent_id).map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(caps).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn engine_find_agents_by_capability(capability: String) -> Result<Vec<String>, String> {
    let engine = engine::get_engine();
    engine.find_agents_by_capability(&capability).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_get_agent_permissions(agent_id: String) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let perms = engine.get_agent_permissions(&agent_id).map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(perms).map_err(|e| e.to_string())?)
}

// ── Inter-Agent Communication ──

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentAskRequest {
    pub from_agent: String,
    pub to_agent: String,
    pub question: String,
    pub session_id: Option<String>,
}

#[tauri::command]
pub async fn engine_agent_ask(req: AgentAskRequest) -> Result<String, String> {
    let engine = engine::get_engine();
    engine.agent_ask(
        &req.from_agent,
        &req.to_agent,
        &req.question,
        req.session_id.as_deref(),
    ).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_get_communications(agent_id: String, limit: Option<i64>) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let comms = engine.db().get_communications(&agent_id, limit.unwrap_or(20)).map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(comms).map_err(|e| e.to_string())?)
}

// ── Tasks ──

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTaskRequest {
    pub title: String,
    pub description: Option<String>,
    pub agent_id: String,
    pub created_by: String,
    pub priority: Option<String>,
    pub requires_verify: Option<bool>,
}

#[tauri::command]
pub fn engine_create_task(req: CreateTaskRequest) -> Result<String, String> {
    let engine = engine::get_engine();
    engine.create_task(
        &req.title,
        req.description.as_deref(),
        &req.agent_id,
        &req.created_by,
        &req.priority.unwrap_or_else(|| "normal".to_string()),
        req.requires_verify.unwrap_or(false),
    ).map_err(|e| e.to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateTaskRequest {
    pub task_id: String,
    pub status: String,
    pub result: Option<String>,
}

#[tauri::command]
pub fn engine_update_task(req: UpdateTaskRequest) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.update_task_status(&req.task_id, &req.status, req.result.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_get_task(task_id: String) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let task = engine.get_task(&task_id).map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(task).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn engine_get_tasks_for_agent(agent_id: String, status: Option<String>) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let tasks = engine.get_tasks_for_agent(&agent_id, status.as_deref()).map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(tasks).map_err(|e| e.to_string())?)
}

// ── Verification (Anti-Hallucination) ──

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateVerificationRequest {
    pub agent_id: String,
    pub session_id: Option<String>,
    pub claim_type: String,
    pub claim: String,
}

#[tauri::command]
pub fn engine_create_verification(req: CreateVerificationRequest) -> Result<String, String> {
    let engine = engine::get_engine();
    engine.create_verification_claim(&req.agent_id, req.session_id.as_deref(), &req.claim_type, &req.claim)
        .map_err(|e| e.to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompleteVerificationRequest {
    pub id: String,
    pub verified_by: String,
    pub result: String,
    pub evidence: Option<String>,
}

#[tauri::command]
pub fn engine_complete_verification(req: CompleteVerificationRequest) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.complete_verification_claim(&req.id, &req.verified_by, &req.result, req.evidence.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_get_unverified_claims(agent_id: Option<String>) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let claims = engine.get_unverified_claims(agent_id.as_deref()).map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(claims).map_err(|e| e.to_string())?)
}

// ── Lessons Learned ──

#[derive(Debug, Serialize, Deserialize)]
pub struct AddLessonRequest {
    pub agent_id: Option<String>,
    pub category: String,
    pub lesson: String,
    pub evidence: Option<String>,
    pub action: Option<String>,
}

#[tauri::command]
pub fn engine_add_lesson(req: AddLessonRequest) -> Result<String, String> {
    let engine = engine::get_engine();
    engine.add_lesson(req.agent_id.as_deref(), &req.category, &req.lesson, req.evidence.as_deref(), req.action.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_get_lessons(category: Option<String>) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let lessons = engine.get_active_lessons(category.as_deref()).map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(lessons).map_err(|e| e.to_string())?)
}

// ── Cron Jobs ──

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCronRequest {
    pub name: String,
    pub agent_id: String,
    pub schedule: String,
    pub timezone: Option<String>,
    pub task_message: String,
}

#[tauri::command]
pub fn engine_create_cron(req: CreateCronRequest) -> Result<String, String> {
    let engine = engine::get_engine();
    engine.create_cron_job(
        &req.name, &req.agent_id, &req.schedule,
        &req.timezone.unwrap_or_else(|| "UTC".to_string()),
        &req.task_message,
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_get_crons(enabled_only: Option<bool>) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let jobs = engine.get_cron_jobs(enabled_only.unwrap_or(false)).map_err(|e| e.to_string())?;

    // Enrich with human-readable schedule descriptions
    let enriched: Vec<serde_json::Value> = jobs.into_iter().map(|j| {
        serde_json::json!({
            "id": j.id, "name": j.name, "agent_id": j.agent_id,
            "schedule": j.schedule,
            "schedule_description": engine::cron::describe(&j.schedule),
            "timezone": j.timezone, "task_message": j.task_message,
            "is_enabled": j.is_enabled,
            "last_run_at": j.last_run_at, "next_run_at": j.next_run_at,
            "run_count": j.run_count, "error_count": j.error_count,
            "created_at": j.created_at, "updated_at": j.updated_at,
        })
    }).collect();

    Ok(serde_json::to_value(enriched).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn engine_toggle_cron(id: String, enabled: bool) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.toggle_cron_job(&id, enabled).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_delete_cron(id: String) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.delete_cron_job(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn engine_tick_cron() -> Result<i64, String> {
    let engine = engine::get_engine();
    engine.tick_cron().await.map_err(|e| e.to_string())
}

// ── Webhooks ──

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateWebhookRequest {
    pub name: String,
    pub agent_id: String,
    pub path: String,
    pub secret: Option<String>,
    pub task_template: String,
}

#[tauri::command]
pub fn engine_create_webhook(req: CreateWebhookRequest) -> Result<String, String> {
    let engine = engine::get_engine();
    engine.create_webhook(
        &req.name, &req.agent_id, &req.path,
        req.secret.as_deref(), &req.task_template,
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_get_webhooks() -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let hooks = engine.get_webhooks().map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(hooks).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn engine_delete_webhook(id: String) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.delete_webhook(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn engine_handle_webhook(path: String, body: String, auth: Option<String>) -> Result<String, String> {
    let engine = engine::get_engine();
    engine.handle_webhook(&path, &body, auth.as_deref()).await.map_err(|e| e.to_string())
}

// ── Events ──

#[tauri::command]
pub fn engine_get_events(target_agent: Option<String>) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let events = engine.get_unprocessed_events(target_agent.as_deref()).map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(events).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn engine_mark_event_processed(id: String) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.mark_event_processed(&id).map_err(|e| e.to_string())
}

// ── Heartbeats ──

#[tauri::command]
pub fn engine_run_health_checks() -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    engine.run_health_checks().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_get_heartbeats() -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let records = engine.get_latest_heartbeats().map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(records).map_err(|e| e.to_string())?)
}

// ── Skills ──

#[tauri::command]
pub fn engine_get_skills(active_only: Option<bool>) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let skills = engine.get_skills(active_only.unwrap_or(false)).map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(skills).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn engine_get_skill(id: String) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let skill = engine.get_skill(&id).map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(skill).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn engine_get_skills_for_agent(agent_id: String) -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let skills = engine.get_skills_for_agent(&agent_id).map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(skills).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub fn engine_install_skill(manifest_json: String) -> Result<String, String> {
    let engine = engine::get_engine();
    engine.install_skill_from_json(&manifest_json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_toggle_skill(id: String, active: bool) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.toggle_skill(&id, active).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_uninstall_skill(id: String) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.uninstall_skill(&id).map_err(|e| e.to_string())
}

// ── Notifications ──

#[derive(Debug, Serialize, Deserialize)]
pub struct NotificationRequest {
    pub title: String,
    pub body: String,
}

#[tauri::command]
pub fn engine_send_notification(req: NotificationRequest) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.db().emit_event("agent_notification", None, None,
        Some(&serde_json::json!({"title": req.title, "body": req.body}).to_string()))
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Email Config ──

#[tauri::command]
pub fn engine_set_email_config(
    smtp_host: Option<String>,
    smtp_user: Option<String>,
    smtp_pass: Option<String>,
    smtp_from: Option<String>,
    imap_host: Option<String>,
    imap_port: Option<String>,
    imap_user: Option<String>,
    imap_pass: Option<String>,
) -> Result<(), String> {
    let engine = engine::get_engine();
    if let Some(v) = smtp_host { engine.db().set_config("smtp_host", &v).map_err(|e| e.to_string())?; }
    if let Some(v) = smtp_user { engine.db().set_config("smtp_user", &v).map_err(|e| e.to_string())?; }
    if let Some(v) = smtp_pass { engine.db().set_config("smtp_pass", &v).map_err(|e| e.to_string())?; }
    if let Some(v) = smtp_from { engine.db().set_config("smtp_from", &v).map_err(|e| e.to_string())?; }
    if let Some(v) = imap_host { engine.db().set_config("imap_host", &v).map_err(|e| e.to_string())?; }
    if let Some(v) = imap_port { engine.db().set_config("imap_port", &v).map_err(|e| e.to_string())?; }
    if let Some(v) = imap_user { engine.db().set_config("imap_user", &v).map_err(|e| e.to_string())?; }
    if let Some(v) = imap_pass { engine.db().set_config("imap_pass", &v).map_err(|e| e.to_string())?; }
    Ok(())
}

#[tauri::command]
pub fn engine_get_email_config() -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    Ok(serde_json::json!({
        "smtp_host": engine.db().get_config("smtp_host").unwrap_or(None),
        "smtp_user": engine.db().get_config("smtp_user").unwrap_or(None),
        "smtp_from": engine.db().get_config("smtp_from").unwrap_or(None),
        "imap_host": engine.db().get_config("imap_host").unwrap_or(None),
        "imap_port": engine.db().get_config("imap_port").unwrap_or(None),
        "imap_user": engine.db().get_config("imap_user").unwrap_or(None),
        "is_configured": engine.db().get_config("smtp_host").unwrap_or(None).is_some(),
    }))
}

// ── Google Commands ──

#[tauri::command]
pub fn engine_google_is_connected() -> Result<bool, String> {
    let engine = engine::get_engine();
    engine::google::is_connected(engine.db()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_google_get_email() -> Result<String, String> {
    let engine = engine::get_engine();
    engine.db().get_config("google_email")
        .map_err(|e| e.to_string())
        .map(|v| v.unwrap_or_default())
}

#[tauri::command]
pub fn engine_google_auth_url() -> Result<String, String> {
    let engine = engine::get_engine();
    engine::google::get_auth_url(engine.db()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_google_connect() -> Result<String, String> {
    let engine = engine::get_engine();
    // Open browser
    let url = engine::google::get_auth_url(engine.db()).map_err(|e| e.to_string())?;
    let _ = open::that(&url);

    // Block waiting for callback
    let tokens = engine::google::handle_oauth_callback(engine.db()).map_err(|e| e.to_string())?;

    Ok(tokens.email.unwrap_or_else(|| "Connected".to_string()))
}

#[tauri::command]
pub fn engine_google_disconnect() -> Result<(), String> {
    let engine = engine::get_engine();
    engine::google::disconnect(engine.db()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_google_set_credentials(client_id: String, client_secret: String) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.db().set_config("google_client_id", &client_id).map_err(|e| e.to_string())?;
    engine.db().set_config("google_client_secret", &client_secret).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn engine_google_get_credentials() -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let client_id = engine.db().get_config("google_client_id").map_err(|e| e.to_string())?.unwrap_or_default();
    let client_secret = engine.db().get_config("google_client_secret").map_err(|e| e.to_string())?.unwrap_or_default();
    Ok(serde_json::json!({
        "client_id": client_id,
        "client_secret": client_secret,
        "has_credentials": !client_id.is_empty() && !client_secret.is_empty(),
    }))
}

// ── Health ──

#[tauri::command]
pub fn engine_health() -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let agents = engine.get_agents().map_err(|e| e.to_string())?;
    let quota = engine.get_quota("default").map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "status": "healthy",
        "version": "1.0.0",
        "agents_count": agents.len(),
        "calls_today": quota.calls_used,
    }))
}

// ── Helpers ──

fn get_daily_limit(engine: &engine::ConfluxEngine) -> i64 {
    engine.db().get_config("free_daily_limit")
        .ok()
        .flatten()
        .unwrap_or_else(|| "50".to_string())
        .parse()
        .unwrap_or(50)
}
