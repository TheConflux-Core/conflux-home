// ElevenLabs WebSocket streaming STT
// Replaces the blocking local Whisper inference with a real-time streaming transcription.

use anyhow::{Context, Result};
use base64::Engine as _;
use futures_util::{SinkExt, StreamExt};
use log;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{Emitter, Window};
use tokio::sync::mpsc;
use tokio_tungstenite::{
    connect_async, tungstenite::client::IntoClientRequest, tungstenite::protocol::Message,
};

/// Holds the final transcript from the current streaming session.
/// Accessed from both the async WebSocket task (write) and the sync Tauri command (read).
pub static STREAMING_TRANSCRIPT: Lazy<Mutex<Option<String>>> =
    Lazy::new(|| Mutex::new(None));

/// Response from POST /v1/single-use-token/{token_type}
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SingleUseTokenResponse {
    token: String,
}

/// Configuration for the ElevenLabs streaming session.
#[derive(Debug, Clone)]
pub struct StreamConfig {
    pub api_key: String,
    pub sample_rate: u32,
    pub model_id: Option<String>,
    pub include_interim: bool,
}

impl Default for StreamConfig {
    fn default() -> Self {
        Self {
            api_key: {
                let engine = crate::engine::get_engine();
                engine
                    .db()
                    .get_config("elevenlabs_key")
                    .ok()
                    .flatten()
                    .filter(|k| !k.is_empty())
                    .or_else(|| {
                        engine
                            .db()
                            .get_config("studio_elevenlabs_key")
                            .ok()
                            .flatten()
                            .filter(|k| !k.is_empty())
                    })
                    .or_else(|| {
                        std::env::var("ELEVENLABS_API_KEY")
                            .ok()
                            .filter(|k| !k.is_empty())
                    })
                    .or_else(|| {
                        option_env!("ELEVENLABS_API_KEY")
                            .map(|s| s.to_string())
                            .filter(|k| !k.is_empty())
                    })
                    .unwrap_or_default()
            },
            sample_rate: 16000,
            model_id: Some("scribe_v2_realtime".to_string()),
            include_interim: true,
        }
    }
}

/// Represents a partial (interim) or final transcript from the stream.
#[derive(Debug, Serialize, Clone)]
pub struct TranscriptChunk {
    pub text: String,
    pub is_final: bool,
}

/// Internal message passed from the audio capture thread to the WebSocket sender.
pub enum StreamMessage {
    Audio(Vec<i16>), // PCM 16-bit LE mono samples (decoded from bytes)
    StreamStop,
}

/// Encode raw PCM 16-bit mono audio as base64.
/// ElevenLabs with audio_format=pcm_16000 expects raw PCM sample bytes,
/// NOT a WAV RIFF container. The batch API (scribe_v2) accepts WAV, but the
/// realtime WebSocket API (scribe_v2_realtime) expects raw PCM samples.
fn encode_audio_raw(pcm_samples: &[i16]) -> String {
    use base64::engine::general_purpose::STANDARD as BASE64;
    // Cast [i16] to [u8] for base64 encoding — safe since both are 2 bytes
    let bytes = unsafe { std::slice::from_raw_parts(pcm_samples.as_ptr() as *const u8, pcm_samples.len() * 2) };
    BASE64.encode(bytes)
}

/// Obtain a short-lived single-use token for WSS authentication.
/// This is the required two-step auth flow: REST → token → WSS.
async fn get_single_use_token(api_key: &str) -> Result<String> {
    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.elevenlabs.io/v1/single-use-token/realtime_scribe")
        .header("xi-api-key", api_key)
        .header("Content-Length", "0")
        .send()
        .await
        .context("Failed to request single-use token")?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(anyhow::anyhow!(
            "Single-use token request failed ({}): {}",
            status,
            body
        ));
    }

    let token_resp: SingleUseTokenResponse =
        resp.json().await.context("Failed to parse token response")?;

    Ok(token_resp.token)
}

/// Start an ElevenLabs streaming transcription session.
///
/// Returns an `UnboundedSender` that accepts raw PCM audio bytes.
/// The caller should feed audio into this sender while PTT is active.
pub async fn start_stream(
    config: StreamConfig,
    window: Window,
) -> Result<mpsc::UnboundedSender<StreamMessage>> {
    // Clear any stale transcript from a previous session
    STREAMING_TRANSCRIPT.lock().unwrap().take();

    let api_key = &config.api_key;
    if api_key.is_empty() {
        return Err(anyhow::anyhow!(
            "ELEVENLABS_API_KEY is not set or is empty. Check your .env file."
        ));
    }

    // Step 1: Get a short-lived single-use token via REST (required auth for WSS)
    log::info!("[ElevenLabs STT] Obtaining single-use token...");
    let session_token = get_single_use_token(api_key).await?;
    log::info!("[ElevenLabs STT] Token received: {}...", &session_token[..session_token.len().min(12)]);

    let mut model_id = config.model_id.unwrap_or_else(|| "scribe_v2_realtime".into());
    if model_id == "scribe_v1" || model_id == "scribe_v2" {
        model_id = "scribe_v2_realtime".to_string();
    }

    // Step 2: Connect to WSS using the session token as URL param
    // Use commit_strategy=vad so ElevenLabs auto-commits when VAD detects silence —
    // this is more reliable than manual commit with empty-audio-chunk trick.
    let url = format!(
        "wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id={}&audio_format=pcm_16000&commit_strategy=vad&token={}",
        model_id, session_token
    );

    log::info!("[ElevenLabs STT] Connecting to WSS...");

    let request = url
        .into_client_request()
        .map_err(|e| anyhow::anyhow!("Failed to create client request: {}", e))?;

    let (socket, response) = connect_async(request).await.map_err(|e| {
        log::warn!("[ElevenLabs STT] Connection failed: {}", e);
        anyhow::anyhow!("WebSocket connection failed: {}", e)
    })?;

    log::info!("[ElevenLabs STT] Connected. Status: {}", response.status());

    let (mut ws_sender, mut ws_receiver) = socket.split();

    let (audio_tx, mut audio_rx) = mpsc::unbounded_channel::<StreamMessage>();

    // ── Incoming Messages (Transcripts) ───────────────────────────────────
    let window_clone = window.clone();
    let recv_task = tokio::spawn(async move {
        while let Some(msg) = ws_receiver.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    log::info!("[ElevenLabs STT]Received text message: {}", text);
                    // Parse JSON response from ElevenLabs
                    // Protocol: { "message_type": "partial_transcript" | "committed_transcript" | "session_started", "text": "..." }
                    if let Ok(transcript) = serde_json::from_str::<serde_json::Value>(&text) {
                        let message_type = transcript.get("message_type").and_then(|v| v.as_str());

                        match message_type {
                            Some("session_started") => {
                                log::info!("[ElevenLabs STT] Session started OK");
                            }
                            Some("partial_transcript") | Some("committed_transcript") | Some("committed_transcript_with_timestamps") => {
                                let is_final = message_type != Some("partial_transcript");
                                let text_val = transcript.get("text").and_then(|v| v.as_str());

                                if let Some(text_val) = text_val {
                                    let chunk = TranscriptChunk { text: text_val.to_string(), is_final };

                                    log::debug!(
                                        "[ElevenLabs STT] Chunk: {:?} (final: {}, type: {:?})",
                                        chunk.text, chunk.is_final, message_type
                                    );

                                    let event_payload = serde_json::json!({
                                        "listeningCadence": {
                                            "tokens": chunk.text.split_whitespace().collect::<Vec<_>>(),
                                            "intervalMs": 90,
                                            "strength": 9,
                                            "burstsPerToken": 2,
                                            "route": ["perception", "reasoning"],
                                        },
                                        "mode": "listen",
                                        "status": if is_final { "Transcript finalized" } else { "Receiving speech..." },
                                    });
                                    let _ = window_clone.emit("conflux:state", event_payload);

                                    if is_final {
                                        let trimmed = chunk.text.trim().to_string();
                                        if !trimmed.is_empty() {
                                            let mut transcript_guard = STREAMING_TRANSCRIPT.lock().unwrap();
                                            *transcript_guard = Some(trimmed.clone());
                                            let _ = window_clone.emit(
                                                "conflux:transcription",
                                                serde_json::json!({ "text": trimmed, "is_final": true }),
                                            );
                                        }
                                    }
                                }
                            }
                            Some("error") | Some("auth_error") | Some("quota_exceeded") => {
                                let err = transcript.get("error").and_then(|v| v.as_str()).unwrap_or("unknown");
                                log::error!("[ElevenLabs STT] Server error: {}", err);
                            }
                            _ => {
                                // Ignorable: rate_limited, throttled, etc.
                                log::debug!("[ElevenLabs STT] Unhandled message type: {:?}", message_type);
                            }
                        }
                    }
                }
                Ok(Message::Binary(data)) => {
                    log::info!("[ElevenLabs STT]Received binary message: {} bytes", data.len());
                }
                Ok(Message::Ping(data)) => {
                    log::info!("[ElevenLabs STT]Received ping: {} bytes", data.len());
                }
                Ok(Message::Pong(_)) | Ok(Message::Ping(_)) => {}
                Ok(Message::Close(_)) | Err(_) => {
                    log::info!("[ElevenLabs STT]Stream closed / error");
                    break;
                }
                _ => {
                    log::debug!("[ElevenLabs STT]Unhandled message type: {:?}", msg);
                }
            }
        }
        log::info!("[ElevenLabs STT] Stream closed.");
    });

    // ── Outgoing Messages (Audio) ────────────────────────────────────────
    let send_task = tokio::spawn(async move {
        while let Some(msg) = audio_rx.recv().await {
            match msg {
                StreamMessage::Audio(samples) => {
                    // TEMP DEBUG: log every chunk size to diagnose release binary audio flow
                    log::info("[ElevenLabs STT] [DEBUG] Sending chunk: {} samples ({} bytes), is_final={}",
                        samples.len(), samples.len() * 2, "N/A");
                    let audio_b64 = encode_audio_raw(&samples);
                    // NOTE: previous_text is NOT part of the ElevenLabs input_audio_chunk spec.
                    // Do NOT add it back — unspecced fields cause silent rejection of audio chunks.
                    let payload = serde_json::json!({
                        "message_type": "input_audio_chunk",
                        "audio_base_64": audio_b64
                    });
                    if let Err(e) = ws_sender.send(Message::Text(payload.to_string())).await {
                        log::warn!("[ElevenLabs STT] Audio send failed: {}", e);
                    } else {
                        // Flush to ensure audio actually reaches ElevenLabs before we close
                        if let Err(e) = ws_sender.flush().await {
                            log::warn!("[ElevenLabs STT] Audio flush failed: {}", e);
                        }
                    }
                }
                StreamMessage::StreamStop => {
                    log::info!("[ElevenLabs STT] Closing stream.");
                    // With commit_strategy=vad, ElevenLabs auto-commits on VAD silence detection.
                    // No explicit commit message needed — just close the WebSocket.
                    // Give the server a moment to send any final partial transcript.
                    tokio::time::sleep(Duration::from_millis(500)).await;
                    let _ = ws_sender.close().await;
                    break;
                }
            }
        }
    });

    // Cleanup
    tokio::spawn(async {
        let _ = tokio::join!(recv_task, send_task);
    });

    Ok(audio_tx)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_stream_config_default() {
        let config = StreamConfig::default();
        assert!(!config.api_key.is_empty());
    }
}
