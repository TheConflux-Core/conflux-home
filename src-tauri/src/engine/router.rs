// Conflux Engine — Model Router (Rust)
// Routes inference calls to free providers. Rust equivalent of conflux-router/providers.ts

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::time::Instant;

// ── Provider Config ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelProvider {
    pub id: String,
    pub name: String,
    pub base_url: String,
    pub api_key: String,
    pub model_id: String,      // provider's model name
    pub model_alias: String,   // our alias: "conflux-fast", "conflux-smart"
    pub priority: i32,         // lower = try first
}

/// Get all configured providers with real API keys.
pub fn get_providers() -> Vec<ModelProvider> {
    vec![
        ModelProvider {
            id: "cerebras".to_string(),
            name: "Cerebras".to_string(),
            base_url: "https://api.cerebras.ai/v1".to_string(),
            api_key: "csk-2kpn9eycky4ycj2dd82n6jvmhc4tjnm4ykt2vxjfvkvv9fcf".to_string(),
            model_id: "llama3.1-8b".to_string(),
            model_alias: "conflux-fast".to_string(),
            priority: 1,
        },
        ModelProvider {
            id: "groq".to_string(),
            name: "Groq".to_string(),
            base_url: "https://api.groq.com/openai/v1".to_string(),
            api_key: "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".to_string(),
            model_id: "llama-3.1-8b-instant".to_string(),
            model_alias: "conflux-fast".to_string(),
            priority: 2,
        },
        ModelProvider {
            id: "groq-smart".to_string(),
            name: "Groq (Smart)".to_string(),
            base_url: "https://api.groq.com/openai/v1".to_string(),
            api_key: "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".to_string(),
            model_id: "llama-3.3-70b-versatile".to_string(),
            model_alias: "conflux-smart".to_string(),
            priority: 1,
        },
        ModelProvider {
            id: "mistral".to_string(),
            name: "Mistral".to_string(),
            base_url: "https://api.mistral.ai/v1".to_string(),
            api_key: "H24a3cJs3bTsWkYiVgmrYPr8Xs8T4ERE".to_string(),
            model_id: "mistral-small-latest".to_string(),
            model_alias: "conflux-fast".to_string(),
            priority: 3,
        },
        ModelProvider {
            id: "cloudflare".to_string(),
            name: "Cloudflare Workers AI".to_string(),
            base_url: "https://api.cloudflare.com/client/v4/accounts/36d37d313aa8598b2735b28b4211862b/ai/v1".to_string(),
            api_key: "cfut_Ufhi1mcDzbLxwSNYZguzSlYsXy1GtAwzzo3mCir7fa5f5dab".to_string(),
            model_id: "@cf/meta/llama-3.1-8b-instruct".to_string(),
            model_alias: "conflux-fast".to_string(),
            priority: 4,
        },
        ModelProvider {
            id: "cerebras-smart".to_string(),
            name: "Cerebras (Smart)".to_string(),
            base_url: "https://api.cerebras.ai/v1".to_string(),
            api_key: "csk-2kpn9eycky4ycj2dd82n6jvmhc4tjnm4ykt2vxjfvkvv9fcf".to_string(),
            model_id: "qwen-3-235b-a22b-instruct-2507".to_string(),
            model_alias: "conflux-smart".to_string(),
            priority: 2,
        },
    ]
}

/// Get providers for a given model alias, sorted by priority.
pub fn get_providers_for_alias(alias: &str) -> Vec<ModelProvider> {
    let providers = get_providers();
    let mut filtered: Vec<ModelProvider> = providers
        .into_iter()
        .filter(|p| p.model_alias == alias)
        .collect();
    filtered.sort_by_key(|p| p.priority);
    filtered
}

// ── OpenAI-compatible request/response types ──

#[derive(Debug, Serialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f64>,
    stream: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAIMessage {
    pub role: String,
    pub content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<serde_json::Value>>,
}

#[derive(Debug, Deserialize)]
struct OpenAIResponse {
    id: Option<String>,
    model: Option<String>,
    choices: Vec<OpenAIChoice>,
    usage: Option<OpenAIUsage>,
}

#[derive(Debug, Deserialize)]
struct OpenAIChoice {
    index: Option<i64>,
    message: Option<OpenAIMessage>,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAIUsage {
    prompt_tokens: Option<i64>,
    completion_tokens: Option<i64>,
    total_tokens: Option<i64>,
}

/// The result of a model call.
#[derive(Debug, Clone)]
pub struct ModelResponse {
    pub content: String,
    pub model: String,
    pub provider_id: String,
    pub provider_name: String,
    pub tokens_used: i64,
    pub latency_ms: i64,
}

/// Send a chat completion request with automatic failover across providers.
pub async fn chat(
    alias: &str,
    messages: Vec<OpenAIMessage>,
    max_tokens: Option<i64>,
    temperature: Option<f64>,
) -> Result<ModelResponse> {
    let providers = get_providers_for_alias(alias);

    if providers.is_empty() {
        anyhow::bail!("No providers configured for alias: {}", alias);
    }

    let mut last_error: Option<anyhow::Error> = None;

    for provider in &providers {
        let start = Instant::now();

        let request = OpenAIRequest {
            model: provider.model_id.clone(),
            messages: messages.clone(),
            max_tokens,
            temperature,
            stream: false,
        };

        let url = format!("{}/chat/completions", provider.base_url);

        match send_request(&url, &provider.api_key, &request).await {
            Ok(response) => {
                let latency_ms = start.elapsed().as_millis() as i64;

                let content = response
                    .choices
                    .first()
                    .and_then(|c| c.message.as_ref())
                    .and_then(|m| m.content.clone())
                    .unwrap_or_default();

                let tokens_used = response
                    .usage
                    .map(|u| u.total_tokens.unwrap_or(0))
                    .unwrap_or(0);

                return Ok(ModelResponse {
                    content,
                    model: response.model.unwrap_or_else(|| provider.model_id.clone()),
                    provider_id: provider.id.clone(),
                    provider_name: provider.name.clone(),
                    tokens_used,
                    latency_ms,
                });
            }
            Err(e) => {
                log::warn!("[ConfluxRouter] Provider {} failed: {}", provider.id, e);
                last_error = Some(e);
                continue;
            }
        }
    }

    Err(last_error.unwrap_or_else(|| anyhow::anyhow!("All providers failed")))
}

/// Send a streaming chat completion. Calls on_chunk for each text fragment.
pub async fn chat_stream(
    alias: &str,
    messages: Vec<OpenAIMessage>,
    max_tokens: Option<i64>,
    on_chunk: &mut dyn FnMut(&str) -> Result<()>,
) -> Result<ModelResponse> {
    let providers = get_providers_for_alias(alias);

    if providers.is_empty() {
        anyhow::bail!("No providers configured for alias: {}", alias);
    }

    let mut last_error: Option<anyhow::Error> = None;

    for provider in &providers {
        let start = Instant::now();

        let request = OpenAIRequest {
            model: provider.model_id.clone(),
            messages: messages.clone(),
            max_tokens,
            temperature: None,
            stream: true,
        };

        let url = format!("{}/chat/completions", provider.base_url);

        match send_stream_request(&url, &provider.api_key, &request, on_chunk).await {
            Ok(full_text) => {
                let latency_ms = start.elapsed().as_millis() as i64;
                let tokens_used = (full_text.len() as f64 / 4.0).ceil() as i64; // estimate

                return Ok(ModelResponse {
                    content: full_text,
                    model: provider.model_id.clone(),
                    provider_id: provider.id.clone(),
                    provider_name: provider.name.clone(),
                    tokens_used,
                    latency_ms,
                });
            }
            Err(e) => {
                log::warn!("[ConfluxRouter] Stream provider {} failed: {}", provider.id, e);
                last_error = Some(e);
                continue;
            }
        }
    }

    Err(last_error.unwrap_or_else(|| anyhow::anyhow!("All streaming providers failed")))
}

// ── HTTP helpers ──

async fn send_request(
    url: &str,
    api_key: &str,
    request: &OpenAIRequest,
) -> Result<OpenAIResponse> {
    let client = reqwest::Client::new();
    let response = client
        .post(url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(request)
        .send()
        .await
        .context("Failed to send request")?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        anyhow::bail!("Provider returned {}: {}", status, body);
    }

    let parsed: OpenAIResponse = response
        .json()
        .await
        .context("Failed to parse response")?;

    Ok(parsed)
}

async fn send_stream_request(
    url: &str,
    api_key: &str,
    request: &OpenAIRequest,
    on_chunk: &mut dyn FnMut(&str) -> Result<()>,
) -> Result<String> {
    let client = reqwest::Client::new();
    let response = client
        .post(url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(request)
        .send()
        .await
        .context("Failed to send stream request")?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        anyhow::bail!("Stream provider returned {}: {}", status, body);
    }

    let mut full_text = String::new();
    let mut buffer = String::new();
    let mut stream = response.bytes_stream();

    use futures_util::StreamExt;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.context("Failed to read stream chunk")?;
        let text = String::from_utf8_lossy(&chunk);
        buffer.push_str(&text);

        // Process complete SSE lines
        while let Some(newline_pos) = buffer.find('\n') {
            let line = buffer[..newline_pos].trim().to_string();
            buffer = buffer[newline_pos + 1..].to_string();

            if line.is_empty() || line.starts_with(':') {
                continue;
            }

            if line == "data: [DONE]" {
                return Ok(full_text);
            }

            if let Some(data) = line.strip_prefix("data: ") {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(content) = parsed
                        .get("choices")
                        .and_then(|c| c.get(0))
                        .and_then(|c| c.get("delta"))
                        .and_then(|d| d.get("content"))
                        .and_then(|c| c.as_str())
                    {
                        full_text.push_str(content);
                        on_chunk(content)?;
                    }
                }
            }
        }
    }

    Ok(full_text)
}
