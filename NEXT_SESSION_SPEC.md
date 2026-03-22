# Conflux Engine — Session Progress

**Last Updated:** 2026-03-22 (Sunday evening, 4:33 PM MST)
**Previous State:** Engine compiled but disconnected from frontend
**Current State:** Frontend fully wired to engine, tool calling active

---

## ✅ Completed This Session

### 1. Frontend → Engine Bridge ✅
- `src/hooks/useEngineChat.ts` — new hook that calls `invoke('engine_chat_stream')`
- `src/components/ChatPanel.tsx` — switched from `useConfluxChat` to `useEngineChat`
- Tauri events: `engine:thinking`, `engine:chunk`, `engine:done`, `engine:error`
- Quota tracked server-side in SQLite (not just localStorage)

### 2. Tool Calling Loop ✅
- `src-tauri/src/engine/runtime.rs` — full tool calling loop with max 3 iterations
- Model receives tool definitions → detects tool_calls → executes → feeds back → final response
- 8 tools available: web_search, file_read, file_write, exec, calc, time, memory_read, memory_write
- Tool calls + results stored in DB with `tool_call_id`, `tool_name`, `tool_args`, `tool_result`
- Router updated to pass `tools` field and parse `tool_calls` from response

### 3. Conversation Persistence ✅
- SQLite already had schema; now frontend actually uses it
- Session auto-created on first message for each agent
- Messages loaded from DB on chat panel open
- `src/components/SessionSidebar.tsx` — browse and resume past conversations
- History button (🕐) in chat header toggles sidebar

### 4. Streaming via Tauri Events ✅
- `engine_chat_stream` command in `src-tauri/src/lib.rs`
- Engine processes turn, then emits word-chunks for streaming feel
- Frontend listens on `engine:chunk` events and appends to message
- Thinking indicator shown during processing

## Build Status
- Rust: ✅ compiles clean (25 warnings, all non-critical)
- TypeScript: ✅ compiles clean
- Binary: 20MB release
- Commit: `c995e41` — 8 files changed, 919 insertions

---

## 🔲 Remaining (Next Session)

### 5. Memory Extraction (MEDIUM)
- After each conversation turn, analyze exchange and extract facts/preferences
- Send second LLM call with "extract memories" prompt
- Parse structured JSON into memory entries
- Store in SQLite with confidence scores

### 6. Provider Settings UI (LOW)
- Let users add/edit/remove API keys through the UI
- Store in engine's config table (single source of truth)
- Remove hardcoded keys from router.rs

### 7. Agent Persona Editor (LOW)
- Edit agent soul/instructions from the UI
- Store in agents table

### 8. Error Recovery (MEDIUM)
- Retry failed providers with exponential backoff
- Graceful degradation when all providers fail
- User-friendly error messages

---

## Architecture Notes

### Dual Router Strategy
- TypeScript ConfluxRouter still exists as code but is no longer used by ChatPanel
- Can be removed after 1-2 sessions of engine stability
- `useConfluxChat.ts` kept as fallback reference

### Streaming Strategy
- Currently: non-streaming + chunked emit (reliable, supports tool calls)
- Future: true SSE streaming through Tauri events when no tools needed
- `process_turn_stream` exists but unused — ready for future true-streaming path

### API Keys
- Currently hardcoded in `router.rs`
- Engine has config table for future migration
- Providers: Cerebras, Groq, Mistral, Cloudflare (all tested, all working)
