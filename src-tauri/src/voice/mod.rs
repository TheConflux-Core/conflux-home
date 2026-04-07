// Voice Engine — Speech capture and transcription
// Uses cpal for audio capture.
// Supports ElevenLabs and OpenAI for cloud STT/TTS.

pub mod capture;
pub mod model;
pub mod stream;
pub mod synth;
pub mod openai;
pub mod transcribe {
    pub fn transcribe_audio(_audio: Vec<f32>, _config: super::openai::OpenAIConfig) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<String, anyhow::Error>> + Send>> {
        Box::pin(async move { Ok("Transcription unavailable".to_string()) })
    }
}

