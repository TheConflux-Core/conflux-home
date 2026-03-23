// Conflux Engine — Shared Types
// All core data structures for the agent runtime.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// ── Agent ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    pub id: String,
    pub name: String,
    pub emoji: String,
    pub role: String,
    pub soul: Option<String>,
    pub instructions: Option<String>,
    pub model_alias: String,
    pub tier: String,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

// ── Session ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub agent_id: String,
    pub user_id: String,
    pub title: Option<String>,
    pub status: String, // 'active' | 'archived' | 'paused'
    pub message_count: i64,
    pub total_tokens: i64,
    pub created_at: String,
    pub updated_at: String,
}

// ── Message ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub session_id: String,
    pub role: String, // 'system' | 'user' | 'assistant' | 'tool'
    pub content: String,
    pub tool_call_id: Option<String>,
    pub tool_name: Option<String>,
    pub tool_args: Option<String>,
    pub tool_result: Option<String>,
    pub tokens_used: i64,
    pub model: Option<String>,
    pub provider_id: Option<String>,
    pub latency_ms: Option<i64>,
    pub created_at: String,
}

// ── Memory ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Memory {
    pub id: String,
    pub agent_id: String,
    pub memory_type: String, // 'fact' | 'preference' | 'skill' | 'knowledge' | 'correction'
    pub key: Option<String>,
    pub content: String,
    pub source: Option<String>,
    pub confidence: f64,
    pub access_count: i64,
    pub last_accessed: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub expires_at: Option<String>,
}

// ── Tool ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tool {
    pub id: String,
    pub name: String,
    pub description: String,
    pub parameters: String, // JSON Schema
    pub category: String,
    pub permissions: String, // JSON array
    pub is_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolExecution {
    pub id: String,
    pub session_id: String,
    pub message_id: String,
    pub tool_id: String,
    pub agent_id: String,
    pub arguments: String,
    pub result: Option<String>,
    pub status: String, // 'pending' | 'running' | 'success' | 'error'
    pub error: Option<String>,
    pub duration_ms: Option<i64>,
}

// ── Chat Request / Response (OpenAI-compatible) ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub stream: Option<bool>,
    pub max_tokens: Option<i64>,
    pub temperature: Option<f64>,
    #[serde(default)]
    pub tools: Option<Vec<ChatTool>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<ToolCall>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatTool {
    #[serde(rename = "type")]
    pub tool_type: String, // always "function"
    pub function: ChatToolFunction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatToolFunction {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    #[serde(rename = "type")]
    pub call_type: String, // always "function"
    pub function: ToolCallFunction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCallFunction {
    pub name: String,
    pub arguments: String, // JSON string
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub id: String,
    pub object: String,
    pub created: i64,
    pub model: String,
    pub choices: Vec<ChatChoice>,
    pub usage: Option<Usage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatChoice {
    pub index: i64,
    pub message: ChatMessage,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usage {
    pub prompt_tokens: i64,
    pub completion_tokens: i64,
    pub total_tokens: i64,
}

// ── Engine Response (internal) ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineResponse {
    pub content: String,
    pub model: String,
    pub provider_id: String,
    pub provider_name: String,
    pub tokens_used: i64,
    pub latency_ms: i64,
    pub calls_remaining: i64,
}

// ── Provider Config ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub id: String,
    pub name: String,
    pub base_url: String,
    pub api_key: String,
    pub model_id: String,
    pub model_alias: String,
    pub priority: i32,
    pub is_enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

// ── Provider Template ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderTemplate {
    pub id: String,
    pub name: String,
    pub emoji: String,
    pub description: String,
    pub base_url: String,
    pub models: Vec<String>, // parsed from JSON array
    pub default_model: String,
    pub model_alias: String,
    pub category: String, // 'free' | 'cloud' | 'local'
    pub docs_url: Option<String>,
    pub is_free: bool,
    pub sort_order: i64,
}

// ── Agent Capability ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentCapability {
    pub agent_id: String,
    pub capability: String,
    pub proficiency: String,
}

// ── Agent Permissions ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentPermission {
    pub agent_id: String,
    pub can_talk_to: String, // JSON array or '*'
    pub max_delegation_depth: i64,
    pub max_tokens_per_session: i64,
    pub can_create_tasks: bool,
    pub can_delete_data: bool,
    pub requires_verification: bool,
    pub anti_hallucination: bool,
}

// ── Verification Record ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerificationRecord {
    pub id: String,
    pub agent_id: String,
    pub session_id: Option<String>,
    pub claim_type: String,
    pub claim: String,
    pub verified_by: Option<String>,
    pub verification: String,
    pub evidence: Option<String>,
    pub created_at: String,
}

// ── Agent Communication ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentCommunication {
    pub id: String,
    pub from_agent: String,
    pub to_agent: String,
    pub message_type: String,
    pub content: String,
    pub response: Option<String>,
    pub status: String,
    pub session_id: Option<String>,
    pub tokens_used: i64,
    pub created_at: String,
    pub responded_at: Option<String>,
}

// ── Task ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub agent_id: String,
    pub status: String,
    pub result: Option<String>,
    pub parent_task_id: Option<String>,
    pub session_id: Option<String>,
    pub created_by: String,
    pub priority: String,
    pub requires_verify: bool,
    pub verified: bool,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

// ── Lesson Learned ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LessonLearned {
    pub id: String,
    pub agent_id: Option<String>,
    pub category: String,
    pub lesson: String,
    pub evidence: Option<String>,
    pub action_taken: Option<String>,
    pub is_active: bool,
    pub created_at: String,
}

// ── Webhook ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Webhook {
    pub id: String,
    pub name: String,
    pub agent_id: String,
    pub path: String,
    pub secret: Option<String>,
    pub task_template: String,
    pub is_enabled: bool,
    pub call_count: i64,
    pub last_called_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

// ── Event ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: String,
    pub event_type: String,
    pub source_agent: Option<String>,
    pub target_agent: Option<String>,
    pub payload: Option<String>,
    pub processed: bool,
    pub created_at: String,
}

// ── Heartbeat ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeartbeatRecord {
    pub id: String,
    pub check_name: String,
    pub status: String,
    pub details: Option<String>,
    pub checked_at: String,
}

// ── Quota ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuotaRecord {
    pub user_id: String,
    pub date: String,
    pub calls_used: i64,
    pub tokens_used: i64,
    pub providers_used: Option<String>, // JSON
}

// ── Cron Job ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CronJob {
    pub id: String,
    pub name: String,
    pub agent_id: String,
    pub schedule: String,
    pub timezone: String,
    pub task_message: String,
    pub is_enabled: bool,
    pub last_run_at: Option<String>,
    pub next_run_at: Option<String>,
    pub run_count: i64,
    pub error_count: i64,
    pub created_at: String,
    pub updated_at: String,
}

// ── Mission ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Mission {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub owner_agent_id: Option<String>,
    pub parent_id: Option<String>,
    pub data: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

// ── Skill ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    pub author: Option<String>,
    pub instructions: String,
    pub triggers: Option<String>,
    pub tools_used: Option<String>,
    pub is_installed: bool,
}

// ── Telemetry ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelemetryEvent {
    pub id: String,
    pub event_type: String,
    pub agent_id: Option<String>,
    pub session_id: Option<String>,
    pub data: Option<String>,
    pub created_at: String,
}
