#[cfg(not(target_os = "android"))]
use crate::voice::{capture, openai, stream, synth};
use tauri::{AppHandle, Emitter, Manager, Window};
#[cfg(not(target_os = "android"))]
use tokio::fs::File;
#[cfg(not(target_os = "android"))]
use tokio::io::AsyncWriteExt;

#[tauri::command]
#[cfg(not(target_os = "android"))]
pub async fn voice_start_stream(window: Window) -> Result<String, String> {
    let config = stream::StreamConfig::default();
    let _tx = stream::start_stream(config, window)
        .await
        .map_err(|e| format!("Failed to start ElevenLabs stream: {}", e))?;
    Ok("Stream started".to_string())
}

#[tauri::command]
#[cfg(not(target_os = "android"))]
pub async fn voice_synthesize(app: AppHandle, text: String) -> Result<String, String> {
    println!("[TTS] voice_synthesize called with text: {}", text);

    // Try ElevenLabs first (George / Conflux voice — the male voice from onboarding)
    let config = synth::TTSConfig::default();
    match synth::stream_tts(&text, config, app.clone()).await {
        Ok(_) => return Ok("Speech synthesized via ElevenLabs".to_string()),
        Err(e) => println!("[TTS] ElevenLabs failed: {}. Falling back to OpenAI...", e),
    }

    // Fallback to OpenAI TTS
    let openai_config = openai::OpenAIConfig::default();
    if !openai_config.api_key.is_empty() {
        match openai::stream_tts(&text, openai_config, app.clone()).await {
            Ok(_) => return Ok("Speech synthesized via OpenAI".to_string()),
            Err(e) => {
                let _ = app.emit(
                    "conflux:state",
                    serde_json::json!({
                        "state": "Idle",
                        "source": "backend",
                        "message": "TTS unavailable"
                    }),
                );
                return Err(format!("All TTS providers failed: {}", e));
            }
        }
    }

    Err("No TTS provider available".to_string())
}

// ── Android TTS: ElevenLabs API call + emit conflux:tts-audio event ──
// Desktop uses synth::stream_tts which depends on cpal/voice modules not available on Android.
// This version calls ElevenLabs directly (same as tts_speak) and emits the event for ConfluxOrbit.
#[tauri::command]
#[cfg(target_os = "android")]
pub async fn voice_synthesize(app: AppHandle, text: String) -> Result<String, String> {
    println!("[TTS] voice_synthesize (Android) called with text: {} chars", text.len());

    // Emit Speaking state
    let _ = app.emit(
        "conflux:state",
        serde_json::json!({
            "state": "Speaking",
            "timestamp": chrono::Utc::now().to_rfc3339(),
        }),
    );

    // Get ElevenLabs API key
    let engine = crate::engine::get_engine();
    let api_key = engine
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
        .unwrap_or_default();

    if api_key.is_empty() {
        let _ = app.emit(
            "conflux:state",
            serde_json::json!({ "state": "Idle", "source": "backend", "message": "No TTS key" }),
        );
        return Err("ElevenLabs API key not configured".to_string());
    }

    // Get voice ID (default: Conflux voice)
    let voice_id = engine
        .db()
        .get_config("elevenlabs_voice_id")
        .ok()
        .flatten()
        .filter(|v| !v.is_empty())
        .or_else(|| std::env::var("ELEVENLABS_VOICE_ID").ok().filter(|v| !v.is_empty()))
        .unwrap_or_else(|| "TvxTBL9RtGW6tVhl4NoI".to_string());

    // Call ElevenLabs TTS API
    let client = reqwest::Client::new();
    let resp = client
        .post(&format!(
            "https://api.elevenlabs.io/v1/text-to-speech/{}",
            voice_id
        ))
        .header("xi-api-key", &api_key)
        .header("Content-Type", "application/json")
        .header("accept", "audio/mpeg")
        .json(&serde_json::json!({
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": { "stability": 0.5, "similarity_boost": 0.75, "use_speaker_boost": true }
        }))
        .send()
        .await
        .map_err(|e| format!("ElevenLabs request failed: {e}"))?;

    if !resp.status().is_success() {
        let s = resp.status();
        let b = resp.text().await.unwrap_or_default();
        let _ = app.emit(
            "conflux:state",
            serde_json::json!({ "state": "Idle", "source": "backend", "message": "TTS error" }),
        );
        return Err(format!("ElevenLabs error ({s}): {b}"));
    }

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Read audio failed: {e}"))?;

    use base64::Engine;
    let audio_base64 = base64::engine::general_purpose::STANDARD.encode(&bytes);

    // Emit TTS audio event — ConfluxOrbit.tsx listens for this and plays via AudioContext
    let _ = app.emit(
        "conflux:tts-audio",
        serde_json::json!({
            "audio_base64": audio_base64,
            "sample_rate": 24000,
        }),
    );

    println!("[TTS] Android: emitted conflux:tts-audio event ({} bytes)", bytes.len());
    Ok("Speech synthesized via ElevenLabs (Android)".to_string())
}
