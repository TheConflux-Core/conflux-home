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

// ── Provider API Key Config ──
// Direct API keys per provider — no middlemen.

#[tauri::command]
pub fn engine_set_openai_key(api_key: String) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.set_openai_key(&api_key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_get_openai_key_masked() -> Result<String, String> {
    let engine = engine::get_engine();
    engine.get_openai_key_masked().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_set_anthropic_key(api_key: String) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.set_anthropic_key(&api_key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_get_anthropic_key_masked() -> Result<String, String> {
    let engine = engine::get_engine();
    engine.get_anthropic_key_masked().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_set_xiaomi_key(api_key: String) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.set_xiaomi_key(&api_key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_get_xiaomi_key_masked() -> Result<String, String> {
    let engine = engine::get_engine();
    engine.get_xiaomi_key_masked().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_get_router_providers() -> Result<serde_json::Value, String> {
    let engine = engine::get_engine();
    let providers = engine.get_router_providers();
    Ok(serde_json::to_value(providers).map_err(|e| e.to_string())?)
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

// ── Family Members ──

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateFamilyMemberRequest {
    pub name: String,
    pub age: Option<i64>,
    pub age_group: String,
    pub avatar: Option<String>,
    pub color: Option<String>,
    pub default_agent_id: Option<String>,
    pub parent_id: Option<String>,
}

#[tauri::command]
pub fn family_list() -> Result<Vec<engine::types::FamilyMember>, String> {
    let engine = engine::get_engine();
    engine.db().get_family_members().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn family_create(req: CreateFamilyMemberRequest) -> Result<engine::types::FamilyMember, String> {
    let engine = engine::get_engine();
    let id = uuid::Uuid::new_v4().to_string();
    engine.db().create_family_member(
        &id, &req.name, req.age, &req.age_group,
        req.avatar.as_deref(), req.color.as_deref(),
        req.default_agent_id.as_deref(), req.parent_id.as_deref(),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn family_delete(id: String) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.db().delete_family_member(&id).map_err(|e| e.to_string())
}

// ── Agent Templates ──

#[tauri::command]
pub fn agent_templates_list(age_group: Option<String>) -> Result<Vec<engine::types::AgentTemplate>, String> {
    let engine = engine::get_engine();
    engine.db().get_agent_templates(age_group.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn agent_template_install(template_id: String, member_id: Option<String>) -> Result<Option<engine::types::Agent>, String> {
    let engine = engine::get_engine();
    engine.db().install_agent_from_template(&template_id, member_id.as_deref()).map_err(|e| e.to_string())
}

// ── Story Games ──

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateStoryGameRequest {
    pub member_id: Option<String>,
    pub title: String,
    pub genre: String,
    pub age_group: String,
    pub difficulty: Option<String>,
}

#[tauri::command]
pub fn story_games_list(member_id: Option<String>) -> Result<Vec<engine::types::StoryGame>, String> {
    let engine = engine::get_engine();
    engine.db().get_story_games(member_id.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn story_game_create(req: CreateStoryGameRequest) -> Result<engine::types::StoryGame, String> {
    let engine = engine::get_engine();
    let id = uuid::Uuid::new_v4().to_string();
    let difficulty = req.difficulty.unwrap_or_else(|| "normal".to_string());
    engine.db().create_story_game(
        &id, req.member_id.as_deref(), &req.title, &req.genre, &req.age_group, &difficulty, None,
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn story_game_get(id: String) -> Result<Option<engine::types::StoryGame>, String> {
    let engine = engine::get_engine();
    engine.db().get_story_game(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn story_chapters_list(game_id: String) -> Result<Vec<engine::types::StoryChapter>, String> {
    let engine = engine::get_engine();
    engine.db().get_story_chapters(&game_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn story_seeds_list(age_group: Option<String>, genre: Option<String>) -> Result<Vec<engine::types::StorySeed>, String> {
    let engine = engine::get_engine();
    engine.db().get_story_seeds(age_group.as_deref(), genre.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn story_choose_path(chapter_id: String, choice_id: String) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.db().choose_story_path(&chapter_id, &choice_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn story_solve_puzzle(chapter_id: String) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.db().solve_puzzle(&chapter_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn story_generate_next_chapter(game_id: String, choice_id: String) -> Result<engine::types::StoryChapter, String> {
    let engine = engine::get_engine();

    // Load game state
    let game = engine.db().get_story_game(&game_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Game not found".to_string())?;

    // Load all chapters so far
    let chapters = engine.db().get_story_chapters(&game_id)
        .map_err(|e| e.to_string())?;

    // Mark the last chapter's choice
    if let Some(last_chapter) = chapters.last() {
        engine.db().choose_story_path(&last_chapter.id, &choice_id)
            .map_err(|e| e.to_string())?;
    }

    // Build context for the AI
    let mut story_context = String::new();
    story_context.push_str(&format!(
        "You are a master storyteller writing an interactive adventure puzzle game.\n\n\
        Title: {}\nGenre: {}\nAge Group: {}\nDifficulty: {}\n\n",
        game.title, game.genre, game.age_group, game.difficulty
    ));

    // Add previous chapters for continuity
    for ch in &chapters {
        if let Some(title) = &ch.title {
            story_context.push_str(&format!("=== Chapter {}: {} ===\n", ch.chapter_number, title));
        } else {
            story_context.push_str(&format!("=== Chapter {} ===\n", ch.chapter_number));
        }
        story_context.push_str(&ch.narrative);
        story_context.push_str("\n\n");

        // Show what choice was made
        if let Some(chosen_id) = &ch.chosen_choice_id {
            let choices: Vec<engine::types::StoryChoice> = serde_json::from_str(&ch.choices)
                .unwrap_or_default();
            if let Some(chosen) = choices.iter().find(|c| &c.id == chosen_id) {
                story_context.push_str(&format!("→ The player chose: {}\n\n", chosen.text));
            }
        }
    }

    // Get the chosen choice text for this turn
    let last_chapter = chapters.last();
    let chosen_text = if let Some(ch) = last_chapter {
        let choices: Vec<engine::types::StoryChoice> = serde_json::from_str(&ch.choices)
            .unwrap_or_default();
        choices.iter().find(|c| c.id == choice_id)
            .map(|c| c.text.clone())
            .unwrap_or_default()
    } else {
        String::new()
    };

    // Build the AI prompt
    let puzzle_instruction = if chapters.len() % 3 == 2 {
        // Every 3rd chapter has a puzzle
        "\nIMPORTANT: This chapter MUST include a puzzle. Add a \"puzzle\" field with type (riddle/pattern/logic/word/code), question, answer, and hint. Make it age-appropriate and solvable but challenging."
    } else {
        ""
    };

    let age_instruction = match game.age_group.as_str() {
        "toddler" => "Use very simple words (1-2 syllables). Short sentences. Repetitive and encouraging. Keep it gentle and safe.",
        "preschool" => "Use simple language. Be imaginative and fun. Include counting or color references when natural.",
        "kid" => "Use age-appropriate language. Be adventurous and exciting. Include humor and wonder. Reference things kids love.",
        "teen" => "Use sophisticated language. Be thrilling and engaging. Include real stakes and emotional depth.",
        "young_adult" | "adult" => "Use rich, literary language. Complex characters. Moral ambiguity. Real consequences.",
        _ => "Use age-appropriate language for the target audience.",
    };

    let full_prompt = format!(
        "{story_context}\n\
        The player chose: \"{chosen_text}\"\n\n\
        Write the NEXT chapter of this story. {age_instruction}{puzzle_instruction}\n\n\
        Respond in this EXACT JSON format (no markdown, no code fences, just raw JSON):\n\
        {{\n  \"title\": \"Chapter title\",\n  \"narrative\": \"The story text for this chapter (2-4 paragraphs). Be vivid and immersive.\",\n  \"choices\": [\n    {{\"id\": \"a\", \"text\": \"First choice\", \"consequence_hint\": \"What might happen\"}},\n    {{\"id\": \"b\", \"text\": \"Second choice\", \"consequence_hint\": \"What might happen\"}},\n    {{\"id\": \"c\", \"text\": \"Third choice\", \"consequence_hint\": \"What might happen\"}}\n  ],\n  \"puzzle\": null,\n  \"image_prompt\": \"A vivid description for DALL-E to illustrate this scene\"\n}}\n\n\
        Make sure the narrative continues from the previous chapter naturally. The choices should lead to meaningfully different outcomes."
    );

    // Call the AI
    let messages = vec![engine::router::OpenAIMessage {
        role: "user".to_string(),
        content: Some(full_prompt),
        tool_call_id: None,
        tool_calls: None,
    }];

    let response = engine::router::chat("core", messages, Some(2000), None, None)
        .await
        .map_err(|e| format!("AI generation failed: {}", e))?;

    // Parse the AI response as JSON
    let content = response.content.trim();
    // Strip markdown code fences if present
    let json_str = content
        .strip_prefix("```json").unwrap_or(content)
        .strip_prefix("```").unwrap_or(content)
        .strip_suffix("```").unwrap_or(content)
        .trim();

    #[derive(serde::Deserialize)]
    struct ChapterGen {
        title: Option<String>,
        narrative: String,
        choices: Vec<engine::types::StoryChoice>,
        puzzle: Option<engine::types::StoryPuzzle>,
        image_prompt: Option<String>,
    }

    let generated: ChapterGen = serde_json::from_str(json_str)
        .map_err(|e| format!("Failed to parse AI response as JSON: {}. Response was: {}", e, json_str))?;

    let choices_json = serde_json::to_string(&generated.choices)
        .map_err(|e| e.to_string())?;
    let puzzle_json = generated.puzzle
        .and_then(|p| serde_json::to_string(&p).ok());

    let chapter_number = game.current_chapter + 1;
    let chapter_id = uuid::Uuid::new_v4().to_string();

    let chapter = engine.db().add_story_chapter(
        &chapter_id,
        &game_id,
        chapter_number,
        generated.title.as_deref(),
        &generated.narrative,
        &choices_json,
        puzzle_json.as_deref(),
        generated.image_prompt.as_deref(),
    ).map_err(|e| e.to_string())?;

    Ok(chapter)
}

// ── Learning Tracking ──

#[derive(Debug, Serialize, Deserialize)]
pub struct LogActivityRequest {
    pub member_id: String,
    pub agent_id: String,
    pub session_id: Option<String>,
    pub activity_type: String,
    pub topic: Option<String>,
    pub description: Option<String>,
    pub difficulty: Option<String>,
    pub score: Option<f64>,
    pub duration_sec: Option<i64>,
    pub metadata: Option<String>,
}

#[tauri::command]
pub fn learning_log_activity(req: LogActivityRequest) -> Result<(), String> {
    let engine = engine::get_engine();
    let id = uuid::Uuid::new_v4().to_string();
    engine.db().log_learning_activity(
        &id, &req.member_id, &req.agent_id, req.session_id.as_deref(),
        &req.activity_type, req.topic.as_deref(), req.description.as_deref(),
        req.difficulty.as_deref(), req.score, req.duration_sec, req.metadata.as_deref(),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn learning_get_activities(member_id: String, limit: Option<i64>) -> Result<Vec<engine::types::LearningActivity>, String> {
    let engine = engine::get_engine();
    engine.db().get_learning_activities(&member_id, limit.unwrap_or(50)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn learning_get_progress(member_id: String) -> Result<engine::types::LearningProgress, String> {
    let engine = engine::get_engine();
    engine.db().get_learning_progress(&member_id).map_err(|e| e.to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateGoalRequest {
    pub member_id: String,
    pub goal_type: String,
    pub activity_type: Option<String>,
    pub title: String,
    pub target_value: f64,
    pub unit: Option<String>,
    pub deadline: Option<String>,
}

#[tauri::command]
pub fn learning_create_goal(req: CreateGoalRequest) -> Result<(), String> {
    let engine = engine::get_engine();
    let id = uuid::Uuid::new_v4().to_string();
    engine.db().create_learning_goal(
        &id, &req.member_id, &req.goal_type, req.activity_type.as_deref(),
        &req.title, req.target_value, req.unit.as_deref(), req.deadline.as_deref(),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn learning_get_goals(member_id: String) -> Result<Vec<engine::types::LearningGoal>, String> {
    let engine = engine::get_engine();
    engine.db().get_learning_goals(&member_id).map_err(|e| e.to_string())
}

// ── Smart Kitchen — Meals ──

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateMealRequest {
    pub name: String,
    pub description: Option<String>,
    pub cuisine: Option<String>,
    pub category: Option<String>,
    pub photo_url: Option<String>,
    pub prep_time_min: Option<i64>,
    pub cook_time_min: Option<i64>,
    pub servings: Option<i64>,
    pub difficulty: Option<String>,
    pub instructions: Option<String>,
    pub tags: Option<String>,
}

#[tauri::command]
pub fn kitchen_create_meal(req: CreateMealRequest) -> Result<engine::types::Meal, String> {
    let engine = engine::get_engine();
    let id = uuid::Uuid::new_v4().to_string();
    engine.db().create_meal(
        &id, &req.name, req.description.as_deref(), req.cuisine.as_deref(),
        req.category.as_deref(), req.photo_url.as_deref(), req.prep_time_min,
        req.cook_time_min, req.servings.unwrap_or(4),
        req.difficulty.as_deref().unwrap_or("normal"),
        req.instructions.as_deref(), req.tags.as_deref(), "manual",
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn kitchen_get_meals(category: Option<String>, cuisine: Option<String>, favorites_only: bool) -> Result<Vec<engine::types::Meal>, String> {
    let engine = engine::get_engine();
    engine.db().get_meals(category.as_deref(), cuisine.as_deref(), favorites_only).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn kitchen_get_meal(id: String) -> Result<Option<engine::types::MealWithIngredients>, String> {
    let engine = engine::get_engine();
    engine.db().get_meal_with_ingredients(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn kitchen_toggle_favorite(id: String) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.db().toggle_favorite(&id).map_err(|e| e.to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddIngredientRequest {
    pub meal_id: String,
    pub name: String,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub estimated_cost: Option<f64>,
    pub category: Option<String>,
    pub is_optional: bool,
    pub notes: Option<String>,
}

#[tauri::command]
pub fn kitchen_add_ingredient(req: AddIngredientRequest) -> Result<(), String> {
    let engine = engine::get_engine();
    let id = uuid::Uuid::new_v4().to_string();
    engine.db().add_meal_ingredient(
        &id, &req.meal_id, &req.name, req.quantity,
        req.unit.as_deref(), req.estimated_cost, req.category.as_deref(),
        req.is_optional, req.notes.as_deref(),
    ).map_err(|e| e.to_string())
}

// ── Smart Kitchen — AI Meal Recognition ──

#[tauri::command]
pub async fn kitchen_recognize_meal(photo_base64: String) -> Result<engine::types::MealWithIngredients, String> {
    let engine = engine::get_engine();

    let prompt = "You are a culinary expert AI. Look at this photo of a meal and provide:

1. The name of the dish
2. A brief description
3. The cuisine type (italian, mexican, american, asian, indian, mediterranean, etc.)
4. The meal category (breakfast, lunch, dinner, snack, dessert)
5. Estimated prep time in minutes
6. Estimated cook time in minutes
7. Number of servings
8. Difficulty (easy, normal, hard)
9. A list of ALL ingredients you can identify, with estimated quantities, units, and estimated cost per ingredient in USD
10. Step-by-step cooking instructions
11. Tags (quick, healthy, kid-friendly, comfort-food, vegetarian, etc.)

Respond in this EXACT JSON format (no markdown, no code fences, just raw JSON):
{
  \"name\": \"Dish Name\",
  \"description\": \"Brief description\",
  \"cuisine\": \"cuisine_type\",
  \"category\": \"meal_category\",
  \"prep_time_min\": 15,
  \"cook_time_min\": 30,
  \"servings\": 4,
  \"difficulty\": \"normal\",
  \"instructions\": \"Step 1: ... Step 2: ...\",
  \"tags\": \"[\\\"healthy\\\", \\\"quick\\\"]\",
  \"ingredients\": [
    {\"name\": \"chicken breast\", \"quantity\": 2, \"unit\": \"pieces\", \"estimated_cost\": 5.99, \"category\": \"meat\", \"notes\": \"boneless, skinless\"},
    {\"name\": \"olive oil\", \"quantity\": 2, \"unit\": \"tbsp\", \"estimated_cost\": 0.30, \"category\": \"pantry\"}
  ]
}

Be accurate with costs. Use 2026 US grocery prices. List every ingredient.";

    // For now, use text-based recognition (photo support via vision API can be added later)
    let messages = vec![engine::router::OpenAIMessage {
        role: "user".to_string(),
        content: Some(format!("I'm describing a meal I want to add to my kitchen. Help me set it up with full details including ingredients and costs.\n\nDescribe what you see or tell me: what meal should we add?")),
        tool_call_id: None,
        tool_calls: None,
    }];

    // Actually, let's use a direct text approach since we can't pass images through the router yet
    // The user can describe the meal or we can use the photo as a trigger to ask them about it
    return Err("Photo recognition coming soon! For now, describe your meal and I'll help set it up.".to_string());
}

#[tauri::command]
pub async fn kitchen_ai_add_meal(description: String) -> Result<engine::types::MealWithIngredients, String> {
    let engine = engine::get_engine();

    let prompt = format!(
        "You are a culinary expert AI. The user describes a meal they want to add: \"{description}\"

Provide full details for this meal:
1. Name (clean, proper name)
2. Description (1-2 sentences)
3. Cuisine type
4. Category (breakfast/lunch/dinner/snack/dessert)
5. Prep time, cook time, servings, difficulty
6. Complete list of ingredients with quantities, units, estimated cost in USD (2026 prices), and category (produce/dairy/meat/pantry/spice/frozen)
7. Step-by-step cooking instructions
8. Tags array

Respond in this EXACT JSON format (no markdown, no code fences, just raw JSON):
{{
  \"name\": \"Proper Dish Name\",
  \"description\": \"Brief appetizing description\",
  \"cuisine\": \"cuisine_type\",
  \"category\": \"dinner\",
  \"prep_time_min\": 15,
  \"cook_time_min\": 30,
  \"servings\": 4,
  \"difficulty\": \"normal\",
  \"instructions\": \"Step 1: ...\\nStep 2: ...\\nStep 3: ...\",
  \"tags\": \"[\\\"healthy\\\", \\\"family-friendly\\\"]\",
  \"ingredients\": [
    {{\"name\": \"ingredient\", \"quantity\": 2.0, \"unit\": \"cups\", \"estimated_cost\": 1.50, \"category\": \"pantry\", \"notes\": \"optional note\"}}
  ]
}}",
        description = description
    );

    let messages = vec![engine::router::OpenAIMessage {
        role: "user".to_string(),
        content: Some(prompt),
        tool_call_id: None,
        tool_calls: None,
    }];

    let response = engine::router::chat("core", messages, Some(2000), None, None)
        .await
        .map_err(|e| format!("AI failed: {}", e))?;

    let content = response.content.trim();
    let json_str = content
        .strip_prefix("```json").unwrap_or(content)
        .strip_prefix("```").unwrap_or(content)
        .strip_suffix("```").unwrap_or(content)
        .trim();

    #[derive(serde::Deserialize)]
    struct AIMeal {
        name: String,
        description: Option<String>,
        cuisine: Option<String>,
        category: Option<String>,
        prep_time_min: Option<i64>,
        cook_time_min: Option<i64>,
        servings: Option<i64>,
        difficulty: Option<String>,
        instructions: Option<String>,
        tags: Option<String>,
        ingredients: Vec<AIIngredient>,
    }

    #[derive(serde::Deserialize)]
    struct AIIngredient {
        name: String,
        quantity: Option<f64>,
        unit: Option<String>,
        estimated_cost: Option<f64>,
        category: Option<String>,
        notes: Option<String>,
    }

    let ai_meal: AIMeal = serde_json::from_str(json_str)
        .map_err(|e| format!("Failed to parse AI response: {}. Raw: {}", e, json_str))?;

    let meal_id = uuid::Uuid::new_v4().to_string();
    let meal = engine.db().create_meal(
        &meal_id, &ai_meal.name, ai_meal.description.as_deref(), ai_meal.cuisine.as_deref(),
        ai_meal.category.as_deref(), None, ai_meal.prep_time_min, ai_meal.cook_time_min,
        ai_meal.servings.unwrap_or(4), &ai_meal.difficulty.unwrap_or("normal".to_string()),
        ai_meal.instructions.as_deref(), ai_meal.tags.as_deref(), "ai-generated",
    ).map_err(|e| e.to_string())?;

    // Add ingredients
    for ing in &ai_meal.ingredients {
        let ing_id = uuid::Uuid::new_v4().to_string();
        engine.db().add_meal_ingredient(
            &ing_id, &meal_id, &ing.name, ing.quantity, ing.unit.as_deref(),
            ing.estimated_cost, ing.category.as_deref(), false, ing.notes.as_deref(),
        ).map_err(|e| e.to_string())?;
    }

    // Get the full meal with ingredients
    engine.db().get_meal_with_ingredients(&meal_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Failed to load created meal".to_string())
}

// ── Smart Kitchen — Meal Plans ──

#[derive(Debug, Serialize, Deserialize)]
pub struct SetPlanEntryRequest {
    pub week_start: String,
    pub day_of_week: i64,
    pub meal_slot: String,
    pub meal_id: Option<String>,
    pub notes: Option<String>,
}

#[tauri::command]
pub fn kitchen_set_plan_entry(req: SetPlanEntryRequest) -> Result<(), String> {
    let engine = engine::get_engine();
    let id = uuid::Uuid::new_v4().to_string();
    engine.db().set_plan_entry(
        &id, &req.week_start, req.day_of_week, &req.meal_slot, req.meal_id.as_deref(), req.notes.as_deref(),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn kitchen_get_weekly_plan(week_start: String) -> Result<engine::types::WeeklyPlan, String> {
    let engine = engine::get_engine();
    engine.db().get_weekly_plan(&week_start).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn kitchen_clear_week_plan(week_start: String) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.db().clear_week_plan(&week_start).map_err(|e| e.to_string())
}

// ── Smart Kitchen — Grocery List ──

#[tauri::command]
pub fn kitchen_generate_grocery(week_start: String) -> Result<Vec<engine::types::GroceryItem>, String> {
    let engine = engine::get_engine();
    engine.db().generate_grocery_list(&week_start).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn kitchen_get_grocery(week_start: String) -> Result<Vec<engine::types::GroceryItem>, String> {
    let engine = engine::get_engine();
    engine.db().get_grocery_list(&week_start).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn kitchen_toggle_grocery_item(id: String) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.db().toggle_grocery_item(&id).map_err(|e| e.to_string())
}

// ── Smart Kitchen — Inventory ──

#[derive(Debug, Serialize, Deserialize)]
pub struct AddInventoryRequest {
    pub name: String,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub category: Option<String>,
    pub expiry_date: Option<String>,
    pub location: Option<String>,
}

#[tauri::command]
pub fn kitchen_add_inventory(req: AddInventoryRequest) -> Result<(), String> {
    let engine = engine::get_engine();
    let id = uuid::Uuid::new_v4().to_string();
    engine.db().add_inventory_item(
        &id, &req.name, req.quantity, req.unit.as_deref(),
        req.category.as_deref(), req.expiry_date.as_deref(), req.location.as_deref(),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn kitchen_get_inventory(location: Option<String>) -> Result<Vec<engine::types::KitchenInventoryItem>, String> {
    let engine = engine::get_engine();
    engine.db().get_inventory(location.as_deref()).map_err(|e| e.to_string())
}

// ── Budget Tracker ──

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateBudgetEntryRequest {
    pub member_id: Option<String>,
    pub entry_type: String,  // 'income' | 'expense' | 'savings' | 'goal'
    pub category: String,
    pub amount: f64,
    pub description: Option<String>,
    pub recurring: bool,
    pub frequency: Option<String>,
    pub date: String,
}

#[tauri::command]
pub fn budget_add_entry(req: CreateBudgetEntryRequest) -> Result<engine::types::BudgetEntry, String> {
    let engine = engine::get_engine();
    let id = uuid::Uuid::new_v4().to_string();
    let now = engine::db::EngineDb::now();
    let conn = engine.db().conn();
    conn.execute(
        "INSERT INTO budget_entries (id, member_id, entry_type, category, amount, description, recurring, frequency, date, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![id, req.member_id, req.entry_type, req.category, req.amount, req.description,
                          if req.recurring { 1i64 } else { 0 }, req.frequency, req.date, now],
    ).map_err(|e| e.to_string())?;
    Ok(engine::types::BudgetEntry {
        id, member_id: req.member_id, entry_type: req.entry_type, category: req.category,
        amount: req.amount, description: req.description, recurring: req.recurring,
        frequency: req.frequency, date: req.date, created_at: now,
    })
}

#[tauri::command]
pub fn budget_get_entries(member_id: Option<String>, month: Option<String>) -> Result<Vec<engine::types::BudgetEntry>, String> {
    let engine = engine::get_engine();
    let conn = engine.db().conn();
    let mut conditions = Vec::new();
    let mut params_vec: Vec<String> = Vec::new();

    if let Some(mid) = &member_id {
        conditions.push("member_id = ?");
        params_vec.push(mid.clone());
    }
    if let Some(m) = &month {
        conditions.push("strftime('%Y-%m', date) = ?");
        params_vec.push(m.clone());
    }

    let where_clause = if conditions.is_empty() { String::new() } else { format!("WHERE {}", conditions.join(" AND ")) };
    let query = format!(
        "SELECT id, member_id, entry_type, category, amount, description, recurring, frequency, date, created_at
         FROM budget_entries {} ORDER BY date DESC, created_at DESC", where_clause
    );

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p as &dyn rusqlite::ToSql).collect();
    let rows = stmt.query_map(&params_refs[..], |row| {
        Ok(engine::types::BudgetEntry {
            id: row.get(0)?, member_id: row.get(1)?, entry_type: row.get(2)?, category: row.get(3)?,
            amount: row.get(4)?, description: row.get(5)?, recurring: row.get::<_, i64>(6)? != 0,
            frequency: row.get(7)?, date: row.get(8)?, created_at: row.get(9)?,
        })
    }).map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for r in rows { result.push(r.map_err(|e| e.to_string())?); }
    Ok(result)
}

#[tauri::command]
pub fn budget_get_summary(month: String) -> Result<engine::types::BudgetSummary, String> {
    let engine = engine::get_engine();
    let conn = engine.db().conn();

    let total_income: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM budget_entries WHERE entry_type = 'income' AND strftime('%Y-%m', date) = ?1",
        rusqlite::params![month], |row| row.get(0)
    ).unwrap_or(0.0);

    let total_expenses: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM budget_entries WHERE entry_type = 'expense' AND strftime('%Y-%m', date) = ?1",
        rusqlite::params![month], |row| row.get(0)
    ).unwrap_or(0.0);

    let total_savings: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM budget_entries WHERE entry_type = 'savings' AND strftime('%Y-%m', date) = ?1",
        rusqlite::params![month], |row| row.get(0)
    ).unwrap_or(0.0);

    // Category breakdown for expenses
    let mut cat_stmt = conn.prepare(
        "SELECT category, SUM(amount) as total FROM budget_entries
         WHERE entry_type = 'expense' AND strftime('%Y-%m', date) = ?1
         GROUP BY category ORDER BY total DESC"
    ).map_err(|e| e.to_string())?;
    let cat_rows = cat_stmt.query_map(rusqlite::params![month], |row| {
        Ok(engine::types::CategoryTotal {
            category: row.get(0)?,
            total: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?;
    let mut categories = Vec::new();
    for r in cat_rows { categories.push(r.map_err(|e| e.to_string())?); }

    Ok(engine::types::BudgetSummary {
        month: month.clone(),
        total_income,
        total_expenses,
        total_savings,
        net: total_income - total_expenses - total_savings,
        categories,
    })
}

#[tauri::command]
pub fn budget_delete_entry(id: String) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.db().conn().execute("DELETE FROM budget_entries WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Content Feed ──

#[tauri::command]
pub fn feed_get_items(member_id: Option<String>, content_type: Option<String>, unread_only: bool) -> Result<Vec<engine::types::ContentFeedItem>, String> {
    let engine = engine::get_engine();
    let conn = engine.db().conn();
    let mut conditions = Vec::<String>::new();
    let mut params_vec: Vec<String> = Vec::new();

    if let Some(mid) = &member_id {
        conditions.push("(member_id = ? OR member_id IS NULL)".to_string());
        params_vec.push(mid.clone());
    }
    if let Some(ct) = &content_type {
        conditions.push("content_type = ?".to_string());
        params_vec.push(ct.clone());
    }
    if unread_only {
        conditions.push("is_read = 0".to_string());
    }

    let where_clause = if conditions.is_empty() { String::new() } else { format!("WHERE {}", conditions.join(" AND ")) };
    let query = format!(
        "SELECT id, member_id, content_type, title, body, source_url, category, is_read, is_bookmarked, created_at, expires_at
         FROM content_feed {} ORDER BY is_bookmarked DESC, is_read ASC, created_at DESC LIMIT 50", where_clause
    );

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p as &dyn rusqlite::ToSql).collect();
    let rows = stmt.query_map(&params_refs[..], |row| {
        Ok(engine::types::ContentFeedItem {
            id: row.get(0)?, member_id: row.get(1)?, content_type: row.get(2)?, title: row.get(3)?,
            body: row.get(4)?, source_url: row.get(5)?, category: row.get(6)?,
            is_read: row.get::<_, i64>(7)? != 0, is_bookmarked: row.get::<_, i64>(8)? != 0,
            created_at: row.get(9)?, expires_at: row.get(10)?,
        })
    }).map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for r in rows { result.push(r.map_err(|e| e.to_string())?); }
    Ok(result)
}

#[tauri::command]
pub fn feed_mark_read(id: String) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.db().conn().execute("UPDATE content_feed SET is_read = 1 WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn feed_toggle_bookmark(id: String) -> Result<(), String> {
    let engine = engine::get_engine();
    engine.db().conn().execute(
        "UPDATE content_feed SET is_bookmarked = CASE WHEN is_bookmarked = 1 THEN 0 ELSE 1 END WHERE id = ?1",
        rusqlite::params![id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn feed_add_item(member_id: Option<String>, content_type: String, title: String, body: String,
                      source_url: Option<String>, category: Option<String>) -> Result<engine::types::ContentFeedItem, String> {
    let engine = engine::get_engine();
    let conn = engine.db().conn();
    let id = uuid::Uuid::new_v4().to_string();
    let now = engine::db::EngineDb::now();
    conn.execute(
        "INSERT INTO content_feed (id, member_id, content_type, title, body, source_url, category, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![id, member_id, content_type, title, body, source_url, category, now],
    ).map_err(|e| e.to_string())?;
    Ok(engine::types::ContentFeedItem {
        id, member_id, content_type, title, body, source_url, category,
        is_read: false, is_bookmarked: false, created_at: now, expires_at: None,
    })
}

#[tauri::command]
pub async fn feed_generate(member_id: Option<String>, interests: Option<String>) -> Result<Vec<engine::types::ContentFeedItem>, String> {
    let engine = engine::get_engine();

    let interest_text = interests.unwrap_or_else(|| "general knowledge, technology, health, finance, fun facts".to_string());

    let prompt = format!(
        "Generate a personalized daily content feed for someone interested in: {interest_text}

Create 5 diverse items. Each item should be one of these types:
- news: A current event or trending topic (keep it timeless/general since I don't have live news)
- tip: A useful life hack, productivity tip, or practical advice
- challenge: A fun daily challenge or activity to try
- fun_fact: An interesting or surprising fact
- reminder: A seasonal or timely reminder

For each item provide:
1. content_type (one of: news, tip, challenge, fun_fact, reminder)
2. title (catchy, under 60 chars)
3. body (2-3 sentences, informative and engaging)
4. category (education, tech, health, fun, finance, lifestyle)
5. source_url (null is fine, or a real URL if applicable)

Respond in this EXACT JSON format (no markdown, no code fences, just raw JSON):
[
  {{
    \"content_type\": \"tip\",
    \"title\": \"Title here\",
    \"body\": \"Body text here. 2-3 sentences.\",
    \"category\": \"lifestyle\",
    \"source_url\": null
  }}
]

Make the content genuinely useful and interesting. Not generic filler."
    );

    let messages = vec![engine::router::OpenAIMessage {
        role: "user".to_string(),
        content: Some(prompt),
        tool_call_id: None,
        tool_calls: None,
    }];

    let response = engine::router::chat("core", messages, Some(1500), None, None)
        .await
        .map_err(|e| format!("AI failed: {}", e))?;

    let content = response.content.trim();
    let json_str = content
        .strip_prefix("```json").unwrap_or(content)
        .strip_prefix("```").unwrap_or(content)
        .strip_suffix("```").unwrap_or(content)
        .trim();

    #[derive(serde::Deserialize)]
    struct FeedItem {
        content_type: String,
        title: String,
        body: String,
        category: Option<String>,
        source_url: Option<String>,
    }

    let items: Vec<FeedItem> = serde_json::from_str(json_str)
        .map_err(|e| format!("Failed to parse AI response: {}. Raw: {}", e, json_str))?;

    let conn = engine.db().conn();
    let now = engine::db::EngineDb::now();
    let mut result = Vec::new();

    for item in &items {
        let id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO content_feed (id, member_id, content_type, title, body, source_url, category, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![id, member_id, item.content_type, item.title, item.body, item.source_url, item.category, now],
        ).map_err(|e| e.to_string())?;
        result.push(engine::types::ContentFeedItem {
            id, member_id: member_id.clone(), content_type: item.content_type.clone(),
            title: item.title.clone(), body: item.body.clone(),
            source_url: item.source_url.clone(), category: item.category.clone(),
            is_read: false, is_bookmarked: false, created_at: now.clone(), expires_at: None,
        });
    }

    Ok(result)
}
