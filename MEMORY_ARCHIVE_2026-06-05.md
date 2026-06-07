# Memory Archive — 2026-06-05 (Pre-Compaction)

Archive of all MEMORY.md entries before the compaction on 2026-06-05. All old memory entries were 1-3 weeks stale at compaction time. Don confirmed that the work they referenced has been completed/updated since.

---

## Conflux Home Identity
- Path: `/home/calo/.openclaw/workspace/conflux-home`
- Stack: Tauri v2 + React 19 + Rust + SQLite + Supabase
- Don works 12-6AM MST
- Anti-hallucination: never simulate tool results
- Supabase user changed from `67f48118` to `3a31cfee` (user removed + re-added)
- Prod DB: `/home/calo/.local/share/com.conflux.home/conflux.db`
- Project is a git repo. Don runs `cargo build`/`cargo run` from `src-tauri/` subdirectory.
- GitHub org: `TheConflux-Core`
- CRITICAL: always verify project path before touching code — use `/home/calo/.openclaw/workspace/conflux-home`, never `~/workspace/repos`

## Build Commands
- `cargo build` = Rust only
- `cargo tauri build` = full Tauri build (Rust + frontend bundle)

## Supabase Auth (Tauri)
- Deep link `conflux://auth/callback#token=` must parse fragment + `setSession()` in `App.tsx` top level (before auth gate)
- NOT auto-handled by SDK in Tauri webview
- Related skill: `conflux-cloud-routing-resilience`

## Voice / STT / TTS
- `faster-whisper` on disk = CTranslate2, NOT whisper-rs compatible (needs GGML)
- TTS: LuxTTS (ZipVoice) REPLACES Kokoro — voice cloning from reference WAVs, 48kHz, 1.2x RTF on CPU
- Script: `models/luxtts/luxtts_tts.py`, venv: `clone-venv`
- Rust `tts.rs` auto-detects LuxTTS, falls back to Kokoro
- `VoiceSettings.tsx` in Settings (Cloud/Offline/Hybrid modes)
- Related skill: `conflux-offline-voice-pipeline`

## MiniMax API
- API key: `[REDACTED — stored in .env]`
- Model: `image-01`
- Endpoint: `https://api.minimax.io/v1/image_generation`

## Next.js Dev Server Quirk
- Does NOT hot-reload `globals.css` changes in development
- After editing `src/app/globals.css` (especially `z-index` fixes), MUST kill dev server and restart
- Turbopack cache keeps old CSS in memory
- Server was running on `localhost:3001` before compaction

## Capital Strategy (Phase 3 Done)
- Phase 3 data package done at `/home/calo/.openclaw/shared/finance/`
- Known discrepancy: UI shows 10K/30K credits, Stripe webhook assigns 1.5K/3K
- Next planned session: re-examine Conflux Router ecosystem together

---

## Compaction Notes

This archive preserves all old MEMORY.md entries verbatim. New compacted MEMORY.md (2026-06-05) contains:
1. Critical path/project pointers (no project details — those are in skills + projects directory)
2. Project location index (full list of paths/names — Don wanted to never forget)
3. Persistent user preferences and key conventions

Removed because stale or task-specific:
- "Don raised capital strategy 2026-05-22..." (dated)
- "Capital strategy in progress..." (stale)
- MiniMax API key (rotation/secret — should live in `.env` not memory)
- Supabase user UUID (transient; verified in DB when needed)
- Specific stack version numbers (Tauri v2 + React 19 + Rust) — discoverable from code
- Offline mode 5.5-min issue context — that work was completed/updated

Compaction: ~1,973 chars → ~1,400 chars (saving ~30% of the 2,200 char budget).
