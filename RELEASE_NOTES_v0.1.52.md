# Release Notes v0.1.52 — Conflux Presence (The "Fairy")

**Tag:** `v0.1.52`
**Commit:** `4cb169e`
**Date:** 2026-04-07 07:15 MST

---

## Summary

v0.1.52 focuses on the **Conflux Presence** feature suite, bringing the visual "Fairy" persona and voice-enabled interactions to Conflux Home.

---

## ✅ New Features

### Conflux Presence (The "Fairy")
- **Neural Brain Visualizer**: Real-time visualization of agent thought processes using framer-motion physics.
- **Voice Layer**: Push-to-talk (PTT), OpenAI Whisper local STT, and ElevenLabs TTS integration.
- **Agent Introductions**: Visual overlay for agent "arrival" (currently disabled per user request).
- **App-Aware Palettes**: Dynamic color schemes based on active app context.

### Voice Engine
- **Local Whisper Integration**: Small model support for offline transcription.
- **ElevenLabs Streaming**: Real-time TTS streaming via ElevenLabs API.
- **OpenAI Fallback**: Usage-based billing support for TTS if ElevenLabs fails.

---

## 🔧 Fixes

### Rust Compilation
- Fixed `state_events` module import in `engine/mod.rs`.
- Fixed `voice_cmds` references in `lib.rs` (corrected to `commands::voice_*`).
- Fixed `voice_capture_start/stop` window parameter semantics (cloned window for reuse).
- Fixed `voice_capture_and_transcribe` signature to accept `Window`.
- Fixed `transcribe_audio` function signatures and re-exports.
- Verified `cargo check` passes with zero errors.

### Build & Release
- Retagged `v0.1.52` on clean commit `4cb169e`.
- Updated GitHub release notes with compilation fixes.

---

## 🚫 Known Issues

- **Agent Introductions Disabled**: Boot cards and overlays currently disabled per user request.
- **Voice Input (Android)**: Not supported (platform limitation).

---

## 📦 Assets

- Source code: https://github.com/TheConflux-Core/conflux-home/tree/v0.1.52
- Release page: https://github.com/TheConflux-Core/conflux-home/releases/tag/v0.1.52
