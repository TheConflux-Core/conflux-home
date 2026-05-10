// ElevenLabs Speech-to-Text (native Rust)
// Direct HTTP call to ElevenLabs Scribe API — no Node.js dependency.
// Replaces the old scripts/elevenlabs-stt.js approach.

use anyhow::{Context, Result};
use reqwest::Client;

/// Configuration for ElevenLabs STT.
#[derive(Debug, Clone)]
pub struct ElevenLabsSTTConfig {
    pub api_key: String,
    pub model_id: String, // "scribe_v2" (default)
}

impl Default for ElevenLabsSTTConfig {
    fn default() -> Self {
        Self {
            api_key: std::env::var("ELEVENLABS_API_KEY")
                .ok()
                .filter(|k| !k.is_empty())
                .or_else(|| option_env!("ELEVENLABS_API_KEY").map(|s| s.to_string()).filter(|k| !k.is_empty()))
                .unwrap_or_default(),
            model_id: "scribe_v2".to_string(),
        }
    }
}

/// Transcribe audio bytes (WAV) via ElevenLabs Scribe API.
/// Returns the transcribed text.
pub async fn transcribe(audio_data: Vec<u8>, config: ElevenLabsSTTConfig) -> Result<String> {
    if config.api_key.is_empty() {
        return Err(anyhow::anyhow!("ELEVENLABS_API_KEY is not set"));
    }

    let client = Client::new();
    let url = "https://api.elevenlabs.io/v1/speech-to-text";

    // Multipart form: file + model_id
    let part = reqwest::multipart::Part::bytes(audio_data)
        .file_name("audio.wav")
        .mime_str("audio/wav")?;

    let form = reqwest::multipart::Form::new()
        .text("model_id", config.model_id)
        .part("file", part);

    let response = client
        .post(url)
        .header("xi-api-key", &config.api_key)
        .multipart(form)
        .send()
        .await
        .context("Failed to send ElevenLabs STT request")?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(anyhow::anyhow!("ElevenLabs STT API Error {}: {}", status, body));
    }

    #[derive(serde::Deserialize)]
    struct ScribeResponse {
        text: String,
    }

    let result: ScribeResponse = response
        .json()
        .await
        .context("Failed to parse ElevenLabs STT response")?;

    Ok(result.text)
}
