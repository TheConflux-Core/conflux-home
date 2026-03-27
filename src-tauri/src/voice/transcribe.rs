// Whisper transcription integration
// Uses whisper-rs for local STT inference.

use std::path::Path;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

/// Transcribe an audio buffer using the Whisper GGML model.
///
/// Arguments:
/// - `model_path`: path to the GGML model file (e.g., ggml-base.bin)
/// - `audio`: 16kHz mono f32 samples
///
/// Returns the transcribed text on success.
pub fn transcribe_audio(model_path: &Path, audio: &[f32]) -> Result<String, String> {
    if audio.is_empty() {
        return Err("Audio buffer is empty. Record something first.".to_string());
    }

    if !model_path.exists() {
        return Err(format!(
            "Whisper model not found at {}. Download a GGML model (e.g., ggml-base.bin) and place it in the models directory.",
            model_path.display()
        ));
    }

    // Load the model
    let ctx = WhisperContext::new_with_params(
        model_path.to_str().unwrap_or(""),
        WhisperContextParameters::default(),
    )
    .map_err(|e| format!("Failed to load Whisper model: {}", e))?;

    // Create a state for inference
    let mut state = ctx
        .create_state()
        .map_err(|e| format!("Failed to create Whisper state: {}", e))?;

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

    // Convert f32 to the format whisper-rs expects
    // whisper-rs expects &[f32] at 16kHz
    state
        .full(params, audio)
        .map_err(|e| format!("Whisper inference failed: {}", e))?;

    // Collect segments
    let num_segments = state
        .full_n_segments()
        .map_err(|e| format!("Failed to get segment count: {}", e))?;

    let mut text = String::new();
    for i in 0..num_segments {
        let segment = state
            .full_get_segment_text(i)
            .map_err(|e| format!("Failed to get segment {}: {}", i, e))?;
        text.push_str(&segment);
    }

    let result = text.trim().to_string();
    if result.is_empty() {
        return Err("No speech detected in the audio. Try speaking closer to the microphone.".to_string());
    }

    log::info!("Transcription complete: {} segments, {} chars", num_segments, result.len());
    Ok(result)
}
