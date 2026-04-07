// Piper TTS Synthesis
// Uses piper-rs for local text-to-speech with ONNX voice models.
//
// Voice models are expected at:
//   <resource_dir>/models/voice/<voice_name>.onnx
//   <resource_dir>/models/voice/<voice_name>.onnx.json
//
// Default voice: en_US-lessac-medium
// Download from: https://huggingface.co/rhasspy/piper-voices

use std::path::{Path, PathBuf};
use std::sync::Mutex;
use once_cell::sync::Lazy;
use piper_rs::Piper;

/// Default voice name (Rhasspy Lessac — clear, natural American English).
const DEFAULT_VOICE: &str = "en_US-lessac-medium";

/// Cached Piper instance — reuses the loaded model across calls.
static PIPER: Lazy<Mutex<Option<Piper>>> = Lazy::new(|| Mutex::new(None));

/// Resolve the onnx + json paths for a voice name.
/// Checks resource_dir first, then app_data_dir.
fn resolve_voice_paths(
    resource_dir: &PathBuf,
    app_data_dir: &PathBuf,
    voice: &str,
) -> Result<(PathBuf, PathBuf), String> {
    let onnx_name = format!("{}.onnx", voice);
    let json_name = format!("{}.onnx.json", voice);

    // Check resource_dir (bundled) first
    let bundled_onnx = resource_dir.join("models/voice").join(&onnx_name);
    let bundled_json = resource_dir.join("models/voice").join(&json_name);
    if bundled_onnx.exists() && bundled_json.exists() {
        return Ok((bundled_onnx, bundled_json));
    }

    // Check app_data_dir
    let user_onnx = app_data_dir.join("models/voice").join(&onnx_name);
    let user_json = app_data_dir.join("models/voice").join(&json_name);
    if user_onnx.exists() && user_json.exists() {
        return Ok((user_onnx, user_json));
    }

    Err(format!(
        "Voice '{}' not found. Expected files:\n  {}\n  {}\nDownload from https://huggingface.co/rhasspy/piper-voices",
        voice,
        bundled_onnx.display(),
        bundled_json.display(),
    ))
}

/// Ensure the user voice model directory exists.
pub fn ensure_voice_dir(app_data_dir: &PathBuf) -> Result<PathBuf, String> {
    let dir = app_data_dir.join("models/voice");
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create voice models directory: {}", e))?;
    Ok(dir)
}

/// Get the default voice name.
pub fn default_voice() -> &'static str {
    DEFAULT_VOICE
}

/// Initialize (or re-initialize) the Piper engine with the given voice.
///
/// This is called automatically by `synthesize_to_pcm` on first use,
/// but can be called explicitly to pre-load the model at startup.
pub fn init_piper(resource_dir: &PathBuf, app_data_dir: &PathBuf, voice: &str) -> Result<(), String> {
    let (onnx_path, json_path) = resolve_voice_paths(resource_dir, app_data_dir, voice)?;

    log::info!("[Voice] Loading Piper voice '{}' from {}", voice, onnx_path.display());

    let piper = Piper::new(Path::new(&onnx_path), Path::new(&json_path))
        .map_err(|e| format!("Failed to initialize Piper TTS: {}", e))?;

    let mut cached = PIPER.lock().map_err(|e: std::sync::PoisonError<_>| e.to_string())?;
    *cached = Some(piper);

    log::info!("[Voice] Piper TTS ready with voice '{}'", voice);
    Ok(())
}

/// Check if a voice model exists on disk.
pub fn voice_exists(resource_dir: &PathBuf, app_data_dir: &PathBuf, voice: &str) -> bool {
    resolve_voice_paths(resource_dir, app_data_dir, voice).is_ok()
}

/// Get voice info as JSON.
pub fn voice_info(resource_dir: &PathBuf, app_data_dir: &PathBuf, voice: &str) -> serde_json::Value {
    let exists = voice_exists(resource_dir, app_data_dir, voice);
    let (onnx_path, _) = resolve_voice_paths(resource_dir, app_data_dir, voice)
        .unwrap_or_else(|_| (
            resource_dir.join("models/voice").join(format!("{}.onnx", voice)),
            resource_dir.join("models/voice").join(format!("{}.onnx.json", voice)),
        ));

    let size_bytes = if exists {
        std::fs::metadata(&onnx_path).map(|m| m.len()).unwrap_or(0)
    } else {
        0
    };

    serde_json::json!({
        "name": voice,
        "path": onnx_path.to_string_lossy(),
        "exists": exists,
        "size_mb": ((size_bytes as f64) / (1024.0 * 1024.0) * 100.0).round() / 100.0,
    })
}

/// Synthesize text into raw f32 PCM samples.
///
/// Returns `(samples, sample_rate)` where samples are mono f32 at the
/// voice's native sample rate (typically 22050 Hz).
///
/// This is the primary integration point for Conflux `pulseImpulse` —
/// the PCM data can be analyzed for amplitude envelopes to drive
/// the neural brain visualization.
pub fn synthesize_to_pcm(
    resource_dir: &PathBuf,
    app_data_dir: &PathBuf,
    text: &str,
    voice: Option<&str>,
) -> Result<(Vec<f32>, u32), String> {
    if text.trim().is_empty() {
        return Err("Cannot synthesize empty text".to_string());
    }

    let voice_name = voice.unwrap_or(DEFAULT_VOICE);

    // Lazy-init: load model on first call
    {
        let cached = PIPER.lock().map_err(|e: std::sync::PoisonError<_>| e.to_string())?;
        if cached.is_none() {
            drop(cached);
            init_piper(resource_dir, app_data_dir, voice_name)?;
        }
    }

    let mut cached = PIPER.lock().map_err(|e: std::sync::PoisonError<_>| e.to_string())?;
    let piper = cached.as_mut().ok_or_else(|| "Piper not initialized".to_string())?;

    log::info!("[Voice] Synthesizing {} chars with voice '{}'", text.len(), voice_name);

    let (samples, sample_rate) = piper
        .create(text, false, None, None, None, None)
        .map_err(|e| format!("Piper synthesis failed: {}", e))?;

    log::info!(
        "[Voice] Synthesized {} samples at {} Hz ({:.1}s)",
        samples.len(),
        sample_rate,
        samples.len() as f64 / sample_rate as f64
    );

    Ok((samples, sample_rate))
}

/// Synthesize text and return the PCM data as base64-encoded bytes.
///
/// Convenience for Tauri commands that need to send audio to the frontend.
/// Returns a JSON-serializable structure with sample rate and base64 PCM.
pub fn synthesize_to_base64(
    resource_dir: &PathBuf,
    app_data_dir: &PathBuf,
    text: &str,
    voice: Option<&str>,
) -> Result<serde_json::Value, String> {
    let (samples, sample_rate) = synthesize_to_pcm(resource_dir, app_data_dir, text, voice)?;

    // Convert f32 samples to i16 PCM bytes
    let pcm_bytes: Vec<u8> = samples
        .iter()
        .flat_map(|&s| {
            let clamped = s.max(-1.0).min(1.0);
            let i16_val = (clamped * i16::MAX as f32) as i16;
            i16_val.to_le_bytes()
        })
        .collect();

    let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &pcm_bytes);

    Ok(serde_json::json!({
        "sample_rate": sample_rate,
        "channels": 1,
        "format": "pcm_i16le",
        "samples_count": samples.len(),
        "duration_ms": (samples.len() as f64 / sample_rate as f64 * 1000.0) as u64,
        "data": encoded,
    }))
}

/// Compute a simple amplitude envelope from PCM samples.
///
/// Returns a Vec of normalized (0.0–1.0) amplitude values, one per `window_size` samples.
/// This can drive Conflux `pulseImpulse` values for real-time visualization.
pub fn compute_envelope(samples: &[f32], window_size: usize) -> Vec<f32> {
    if samples.is_empty() || window_size == 0 {
        return Vec::new();
    }

    let num_windows = (samples.len() + window_size - 1) / window_size;
    let mut envelope = Vec::with_capacity(num_windows);

    for chunk in samples.chunks(window_size) {
        let rms: f32 = chunk.iter().map(|&s| s * s).sum::<f32>() / chunk.len() as f32;
        envelope.push(rms.sqrt());
    }

    // Normalize to 0.0–1.0
    let max_val = envelope.iter().cloned().fold(0.0f32, f32::max);
    if max_val > 0.0 {
        for v in envelope.iter_mut() {
            *v /= max_val;
        }
    }

    envelope
}
