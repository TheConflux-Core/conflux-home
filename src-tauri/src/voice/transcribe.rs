// Whisper transcription integration
// Uses whisper-rs for local STT inference with real-time streaming support.

use std::path::Path;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};
use tauri::{Window, Emitter};
use serde_json::json;

/// Number of audio samples per chunk (16kHz * 1.5s = 24000 samples per chunk).
/// Each chunk is ~1.5 seconds of audio, giving near-real-time feedback.
const CHUNK_SAMPLES: usize = 24000;

/// Transcribe an audio buffer using the Whisper GGML model with real-time streaming.
///
/// Processes audio in ~1.5s chunks, calling `state.full()` on each chunk.
/// After each chunk, new segments are detected and emitted immediately via
/// `conflux:state` with `listeningCadence`, so the Fairy pulses as you speak.
///
/// Arguments:
/// - `model_path`: path to the GGML model file (e.g., ggml-small.bin)
/// - `audio`: 16kHz mono f32 samples
/// - `window`: Tauri window for emitting real-time events
///
/// Returns the full transcribed text on success.
pub fn transcribe_audio(model_path: &Path, audio: &[f32], window: &Window) -> Result<String, String> {
    println!("[STT] transcribe_audio called with buffer size: {} samples ({:.2}s)", audio.len(), audio.len() as f64 / 16000.0);
    if audio.is_empty() {
        println!("[STT] Audio buffer is EMPTY - microphone likely not recording");
        return Err("Audio buffer is empty. Record something first.".to_string());
    }
    println!("[STT] Audio buffer looks GOOD - proceeding with Whisper inference");

    if !model_path.exists() {
        return Err(format!(
            "Whisper model not found at {}. Download a GGML model (e.g., ggml-small.bin) and place it in the models directory.",
            model_path.display()
        ));
    }

    // Load the model
    let ctx = WhisperContext::new_with_params(
        model_path.to_str().unwrap_or(""),
        WhisperContextParameters::default(),
    )
    .map_err(|e| format!("Failed to load Whisper model: {}", e))?;

    // Configure parameters — use greedy sampling for speed
    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    let threads = std::thread::available_parallelism()
        .map(|n| n.get() as i32)
        .unwrap_or(2)
        .max(2);
    params.set_n_threads(threads);
    params.set_language(Some("en"));
    params.set_print_special(false);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);

    // ── Real-time streaming: process audio in small chunks ──────────────
    // Each chunk is ~1.5s. We run `state.full()` on each chunk and emit
    // new segments immediately so the UI pulses as speech arrives.

    // Create a reusable state for inference
    let mut state = ctx
        .create_state()
        .map_err(|e| format!("Failed to create Whisper state: {}", e))?;

    let total_samples = audio.len();
    let mut full_text = String::new();
    let mut total_segments_seen: i32 = 0;
    let mut offset: usize = 0;

    log::info!(
        "Streaming STT: {} total samples ({:.1}s), chunk size {} samples ({:.1}s)",
        total_samples,
        total_samples as f64 / 16000.0,
        CHUNK_SAMPLES,
        CHUNK_SAMPLES as f64 / 16000.0,
    );

    while offset < total_samples {
        let end = (offset + CHUNK_SAMPLES).min(total_samples);
        let chunk = &audio[offset..end];
        let chunk_secs = chunk.len() as f64 / 16000.0;

        // Skip very short trailing chunks (< 0.5s) — not enough for Whisper
        if chunk.len() < 8000 {
            log::debug!("Skipping trailing chunk of {} samples (< 0.5s)", chunk.len());
            break;
        }

        log::debug!(
            "Processing chunk: offset={}, len={} samples ({:.1}s)",
            offset,
            chunk.len(),
            chunk_secs,
        );

        // Run Whisper inference on this chunk
        state
            .full(params.clone(), chunk)
            .map_err(|e| format!("Whisper inference failed at offset {}: {}", offset, e))?;

        // Check for new segments
        let n_segments = state
            .full_n_segments()
            .map_err(|e| format!("Failed to get segment count: {}", e))?;

        // Collect any new segments and emit them immediately
        if n_segments > total_segments_seen {
            for i in total_segments_seen..n_segments {
                let segment_text = state
                    .full_get_segment_text(i)
                    .map_err(|e| format!("Failed to get segment {}: {}", i, e))?;

                let trimmed = segment_text.trim();
                if !trimmed.is_empty() {
                    // Split into tokens for the Fairy cadence animation
                    let tokens: Vec<String> =
                        trimmed.split_whitespace().map(|s| s.to_string()).collect();

                    log::info!(
                        "New segment [{}]: \"{}\" ({} tokens)",
                        i,
                        trimmed,
                        tokens.len(),
                    );

                    // Emit conflux:state with listeningCadence so the Fairy pulses NOW
                    let event_payload = json!({
                        "listeningCadence": {
                            "tokens": tokens,
                            "intervalMs": 90,
                            "strength": 9,
                            "burstsPerToken": 2,
                            "route": ["perception", "reasoning"],
                        },
                        "mode": "listen",
                        "status": "Receiving speech",
                    });
                    println!("[STT] Emitting conflux:state event: {}", event_payload);
                    let _ = window.emit("conflux:state", event_payload);
                }

                full_text.push_str(&segment_text);
            }
            total_segments_seen = n_segments;
        }

        offset = end;
    }

    let result = full_text.trim().to_string();
    if result.is_empty() {
        return Err("No speech detected in the audio. Try speaking closer to the microphone.".to_string());
    }

    log::info!(
        "Streaming transcription complete: {} chunks processed, {} total segments, {} chars",
        (total_samples + CHUNK_SAMPLES - 1) / CHUNK_SAMPLES,
        total_segments_seen,
        result.len(),
    );

    Ok(result)
}
