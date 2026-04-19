// Conflux Engine — Local AI Layer
// Runs inference locally via llama.cpp sidecar for tool routing.
// Falls back to cloud API when local model fails or for complex reasoning.
//
// Architecture:
//   llama-server (sidecar) ← HTTP → local_ai.rs ← runtime.rs
//
// The sidecar is a llama-server binary that serves a GGUF model over HTTP.
// This module manages its lifecycle and provides tool-routing functions.

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::time::sleep;

use super::router::{ModelResponse, ToolCallRequest};

// ── Configuration ──

/// Default port for the llama-server sidecar.
const DEFAULT_PORT: u16 = 8177;

/// How long to wait for the server to become ready (seconds).
const SERVER_STARTUP_TIMEOUT_SECS: u64 = 30;

/// How often to poll during startup (milliseconds).
const SERVER_POLL_INTERVAL_MS: u64 = 500;

/// Default max tokens for tool routing calls.
const DEFAULT_MAX_TOKENS: i32 = 256;

/// Default temperature for tool routing (low = deterministic).
const DEFAULT_TEMPERATURE: f32 = 0.1;

// ── Types ──

/// Status of the local AI model.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalAiStatus {
    pub running: bool,
    pub model_path: Option<String>,
    pub model_name: Option<String>,
    pub port: u16,
    pub ram_mb: Option<u64>,
    pub is_ready: bool,
    pub tools_loaded: usize,
    pub error: Option<String>,
}

/// Configuration for starting the llama-server.
#[derive(Debug, Clone)]
pub struct ServerConfig {
    pub model_path: PathBuf,
    pub port: u16,
    pub ctx_size: u32,
    pub threads: u32,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            model_path: PathBuf::new(),
            port: DEFAULT_PORT,
            ctx_size: 8192,
            threads: std::thread::available_parallelism()
                .map(|n| n.get() as u32)
                .unwrap_or(4),
        }
    }
}

// ── Sidecar Manager ──

/// Manages the llama-server sidecar process.
pub struct LocalAiManager {
    process: Arc<Mutex<Option<Child>>>,
    config: ServerConfig,
    client: reqwest::Client,
}

impl LocalAiManager {
    pub fn new(config: ServerConfig) -> Self {
        Self {
            process: Arc::new(Mutex::new(None)),
            config,
            client: reqwest::Client::builder()
                .timeout(Duration::from_secs(30))
                .build()
                .expect("Failed to create HTTP client"),
        }
    }

    /// Start the llama-server sidecar.
    pub fn start(&self) -> Result<()> {
        // Kill any existing process
        self.stop()?;

        if !self.config.model_path.exists() {
            return Err(anyhow!(
                "Model file not found: {}",
                self.config.model_path.display()
            ));
        }

        // Find the llama-server binary
        let server_bin = find_llama_server()?;

        log::info!(
            "[LocalAI] Starting llama-server on port {} with model {}",
            self.config.port,
            self.config.model_path.display()
        );

        let child = Command::new(&server_bin)
            .arg("--model")
            .arg(&self.config.model_path)
            .arg("--port")
            .arg(self.config.port.to_string())
            .arg("--ctx-size")
            .arg(self.config.ctx_size.to_string())
            .arg("--threads")
            .arg(self.config.threads.to_string())
            .arg("--no-webui")
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()?;

        *self.process.lock().unwrap() = Some(child);

        log::info!("[LocalAI] llama-server started, waiting for ready...");
        Ok(())
    }

    /// Stop the llama-server sidecar.
    pub fn stop(&self) -> Result<()> {
        let mut proc = self.process.lock().unwrap();
        if let Some(mut child) = proc.take() {
            log::info!("[LocalAI] Stopping llama-server (PID {})", child.id());
            child.kill().ok();
            child.wait().ok();
        }
        Ok(())
    }

    /// Check if the server process is alive.
    pub fn is_process_alive(&self) -> bool {
        let mut proc = self.process.lock().unwrap();
        if let Some(ref mut child) = *proc {
            match child.try_wait() {
                Ok(Some(_)) => false, // Exited
                Ok(None) => true,     // Still running
                Err(_) => false,
            }
        } else {
            false
        }
    }

    /// Wait for the server to become ready (health check).
    pub async fn wait_for_ready(&self) -> Result<()> {
        let deadline = Instant::now() + Duration::from_secs(SERVER_STARTUP_TIMEOUT_SECS);

        while Instant::now() < deadline {
            if !self.is_process_alive() {
                return Err(anyhow!("llama-server process died during startup"));
            }

            match self.health_check().await {
                Ok(true) => {
                    log::info!("[LocalAI] Server ready on port {}", self.config.port);
                    return Ok(());
                }
                _ => sleep(Duration::from_millis(SERVER_POLL_INTERVAL_MS)).await,
            }
        }

        Err(anyhow!(
            "llama-server did not become ready within {}s",
            SERVER_STARTUP_TIMEOUT_SECS
        ))
    }

    /// HTTP health check to the server.
    async fn health_check(&self) -> Result<bool> {
        let url = format!("http://localhost:{}/health", self.config.port);
        let resp = self.client.get(&url).send().await?;
        Ok(resp.status().is_success())
    }

    /// Send a completion request to the server.
    pub async fn completion(&self, prompt: &str, max_tokens: i32, temperature: f32) -> Result<String> {
        let url = format!("http://localhost:{}/completion", self.config.port);

        let body = serde_json::json!({
            "prompt": prompt,
            "n_predict": max_tokens,
            "temperature": temperature,
            "stop": ["<end_of_turn>", "<start_of_turn>user"],
        });

        let resp = self.client.post(&url).json(&body).send().await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(anyhow!("llama-server returned {}: {}", status, text));
        }

        let result: serde_json::Value = resp.json().await?;
        let content = result["content"]
            .as_str()
            .ok_or_else(|| anyhow!("No 'content' in llama-server response"))?;

        Ok(content.to_string())
    }
}

impl Drop for LocalAiManager {
    fn drop(&mut self) {
        self.stop().ok();
    }
}

// ── Tool Routing ──

/// Format tool definitions for the Gemma chat template.
/// MUST match the format_example() from the training notebook exactly:
///   Tools:
///   [{full JSON function schemas}]
pub fn format_tools_for_local(tools: &[serde_json::Value]) -> String {
    // Training system message — must match verbatim
    let mut out = String::from(
        "You are a tool calling assistant. Given a user request, output a JSON function call with the tool name and arguments.\n\nTools:\n"
    );

    // Build JSON array of function definitions (matching training: [t["function"] for t in tools])
    let func_defs: Vec<&serde_json::Value> = tools
        .iter()
        .filter_map(|t| t.get("function"))
        .collect();

    out.push_str(&serde_json::to_string_pretty(&func_defs).unwrap_or_else(|_| "[]".to_string()));

    out
}

/// Format a message for the Gemma chat template.
/// MUST match format_example() from training notebook:
///   <start_of_turn>user
///   {system}
///
///   User: {user_message}<end_of_turn>
///   <start_of_turn>model
pub fn format_prompt(system: &str, user_message: &str) -> String {
    format!(
        "<start_of_turn>user\n{}\n\nUser: {}<end_of_turn>\n<start_of_turn>model\n",
        system, user_message
    )
}

/// Parse tool calls from model output.
/// Tries to extract JSON tool call objects from the response.
pub fn parse_tool_calls(content: &str) -> Vec<ToolCallRequest> {
    let mut calls = Vec::new();
    let trimmed = content.trim();

    // Strip markdown code blocks if present
    let cleaned = trimmed
        .strip_prefix("```json").unwrap_or(trimmed)
        .strip_prefix("```").unwrap_or(trimmed)
        .strip_suffix("```").unwrap_or(trimmed)
        .trim();

    // Clean SentencePiece artifacts from fine-tuned models (UNK bytes, ▁ tokens)
    let cleaned = regex::Regex::new(r#"\[UNK_BYTE_[^\]]*\]"#)
        .unwrap()
        .replace_all(cleaned, "")
        .replace('▁', "")
        .trim()
        .to_string();

    // Try to find JSON objects in the output
    // Strategy: look for {"name"/"tool": ..., "arguments"/"args"/"parameters": ...} patterns

    // Direct parse first (if the whole response is a single tool call)
    if let Ok(obj) = serde_json::from_str::<serde_json::Value>(&cleaned) {
        let name = obj["name"].as_str().or(obj["tool"].as_str());
        let args = obj.get("arguments").or(obj.get("args")).or(obj.get("parameters"));
        if let (Some(name), Some(args)) = (name, args) {
            calls.push(ToolCallRequest {
                id: format!("local_{}", uuid::Uuid::new_v4().simple()),
                name: name.to_string(),
                arguments: serde_json::to_string(args).unwrap_or_else(|_| "{}".to_string()),
            });
            return calls;
        }

        // Fallback: name might be nested inside arguments (common with fine-tuned models)
        // e.g., {"role":"user","arguments":{"name":"time",...}}
        if let Some(args_obj) = obj.get("arguments").and_then(|a| a.as_object()) {
            if let Some(name_val) = args_obj.get("name").or(args_obj.get("tool")) {
                if let Some(name_str) = name_val.as_str() {
                    // Filter out the name from the args object
                    let mut filtered_args = args_obj.clone();
                    filtered_args.remove("name");
                    filtered_args.remove("tool");
                    // Remove known example fields the model hallucinates
                    filtered_args.remove("body");
                    filtered_args.remove("title");
                    filtered_args.remove("example_body");
                    filtered_args.remove("example_title");
                    filtered_args.remove("role");
                    calls.push(ToolCallRequest {
                        id: format!("local_{}", uuid::Uuid::new_v4().simple()),
                        name: name_str.to_string(),
                        arguments: serde_json::to_string(&filtered_args).unwrap_or_else(|_| "{}".to_string()),
                    });
                    return calls;
                }
            }
        }
    }

    // Regex scan for embedded JSON objects
    let re = regex::Regex::new(r#"\{\s*"(?:name|tool)"\s*:\s*"[^"]+"\s*,\s*"(?:arguments|args|parameters)"\s*:\s*\{[^}]*\}\s*\}"#)
        .unwrap();
    for cap in re.captures_iter(&cleaned) {
        if let Ok(obj) = serde_json::from_str::<serde_json::Value>(&cap[0]) {
            let name = obj["name"].as_str().or(obj["tool"].as_str());
            if let Some(name) = name {
                let args = obj.get("arguments").or(obj.get("args")).or(obj.get("parameters"));
                calls.push(ToolCallRequest {
                    id: format!("local_{}", uuid::Uuid::new_v4().simple()),
                    name: name.to_string(),
                    arguments: serde_json::to_string(args.unwrap_or(&serde_json::json!({})))
                        .unwrap_or_else(|_| "{}".to_string()),
                });
            }
        }
    }

    calls
}

/// Route a user message through the local model for tool calling.
/// Returns a ModelResponse with tool calls if the model decides tools are needed.
pub async fn local_tool_route(
    manager: &LocalAiManager,
    user_message: &str,
    tools: &[serde_json::Value],
) -> Result<ModelResponse> {
    let tools_text = format_tools_for_local(tools);
    let prompt = format_prompt(&tools_text, user_message);

    let start = Instant::now();

    let content = manager
        .completion(&prompt, DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE)
        .await?;

    let latency_ms = start.elapsed().as_millis() as i64;

    log::info!("[LocalAI] Raw output ({} chars): {}", content.len(), &content[..content.len().min(400)]);

    let tool_calls = parse_tool_calls(&content);

    log::info!(
        "[LocalAI] Routed in {}ms — {} tool calls, response len={}",
        latency_ms,
        tool_calls.len(),
        content.len()
    );

    Ok(ModelResponse {
        content,
        model: "local-gemma3-1b".to_string(),
        provider_id: "local".to_string(),
        provider_name: "Local AI".to_string(),
        tokens_used: 0, // Local inference, no token counting yet
        latency_ms,
        tool_calls,
    })
}

// ── Helpers ──

/// Find the llama-server binary on the system.
pub fn find_llama_server() -> Result<PathBuf> {
    // Check common locations
    let home = std::env::var("HOME").unwrap_or_default();
    let candidates: Vec<PathBuf> = vec![
        PathBuf::from("llama-server"), // In PATH (checked via which below)
        PathBuf::from("/usr/local/bin/llama-server"),
        PathBuf::from("/opt/llama.cpp/bin/llama-server"),
        PathBuf::from(format!("{}/llama.cpp/build/bin/llama-server", home)),
        PathBuf::from(format!("{}/.local/bin/llama-server", home)),
    ];

    for path in &candidates {
        if path.exists() && path.is_file() {
            return Ok(path.clone());
        }
    }

    // Try `which` via shell as last resort
    if let Ok(output) = std::process::Command::new("which").arg("llama-server").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Ok(PathBuf::from(path));
            }
        }
    }

    Err(anyhow!(
        "llama-server binary not found. Install llama.cpp:\n\
         git clone https://github.com/ggerganov/llama.cpp ~/llama.cpp\n\
         cd ~/llama.cpp && cmake -B build && cmake --build build --config Release -j"
    ))
}

// ── Tauri Commands ──

/// Tauri command: Start local AI with a model file.
#[tauri::command]
pub async fn local_ai_start(
    model_path: String,
) -> Result<LocalAiStatus, String> {
    let full_path = if Path::new(&model_path).is_absolute() {
        PathBuf::from(&model_path)
    } else {
        // Default: look in the app's models directory
        let home = std::env::var("HOME").unwrap_or_default();
        PathBuf::from(format!("{}/.openclaw/workspace/conflux-home/src-tauri/models/{}", home, model_path))
    };

    let config = ServerConfig {
        model_path: full_path,
        ..Default::default()
    };

    let manager = LocalAiManager::new(config);
    manager.start().map_err(|e| e.to_string())?;

    // Store manager in app state (you'll need to add this to your state)
    // For now, just return status
    Ok(LocalAiStatus {
        running: true,
        model_path: Some(model_path),
        model_name: Some("local-model".to_string()),
        port: DEFAULT_PORT,
        ram_mb: None,
        is_ready: false,
        tools_loaded: 0,
        error: None,
    })
}

/// Tauri command: Stop local AI.
#[tauri::command]
pub async fn local_ai_stop() -> Result<(), String> {
    // TODO: Get manager from app state and stop it
    log::info!("[LocalAI] Stop requested");
    Ok(())
}

/// Tauri command: Get local AI status.
#[tauri::command]
pub async fn local_ai_status() -> Result<LocalAiStatus, String> {
    // TODO: Get real status from app state
    Ok(LocalAiStatus {
        running: false,
        model_path: None,
        model_name: None,
        port: DEFAULT_PORT,
        ram_mb: None,
        is_ready: false,
        tools_loaded: 0,
        error: None,
    })
}
