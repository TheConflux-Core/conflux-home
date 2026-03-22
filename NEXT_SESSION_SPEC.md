# Conflux Engine — Next Session Spec

**Date:** 2026-03-22 (Sunday evening)
**Current State:** Foundation complete — engine compiles, schema designed, router works, Tauri commands exposed
**Goal:** Wire the frontend to the engine. Make it actually work end-to-end through the Rust backend.

---

## What We Have (Verified)

### Conflux Router (TypeScript — live in app)
- 4 providers: Groq, Cerebras, Mistral, Cloudflare
- Frontend calls provider APIs DIRECTLY via `useConfluxChat` hook
- Streaming works, quota works, failover works
- 90 tests passing

### Conflux Engine (Rust — compiled, not yet connected)
- SQLite database with 13 tables
- Agent runtime (reasoning loop with memory injection)
- Rust-native model router (same 4 providers)
- Tool system (8 tools defined)
- 9 Tauri commands exposed to frontend
- Binary: 48MB (engine adds ~6MB)

### The Gap
**The frontend doesn't know the engine exists.** It calls provider APIs directly. The engine has Tauri commands but nothing invokes them.

---

## Session Goals (Priority Order)

### 1. Frontend → Engine Bridge (CRITICAL)

Replace direct API calls with Tauri command invocations.

**Current flow:**
```
ChatPanel → useConfluxChat → ConfluxRouter (TypeScript) → Provider API
```

**Target flow:**
```
ChatPanel → useEngineChat → Tauri invoke('engine_chat') → Conflux Engine (Rust) → Provider API
```

**Files to change:**
- `src/hooks/useEngineChat.ts` — NEW hook that calls `invoke('engine_chat')` instead of using TypeScript router
- `src/hooks/useConfluxChat.ts` — keep as fallback, but new hook is primary
- `src/components/ChatPanel.tsx` — switch to `useEngineChat`
- `src/App.tsx` — detect engine availability

**What this unlocks:**
- Conversations persist in SQLite (survive app restart)
- Agent memory loads from database
- Quota tracked server-side (not just localStorage)
- Tool calling happens in Rust (faster, more reliable)

### 2. Tool Calling Loop (HIGH)

The engine has tools but the reasoning loop doesn't detect or execute them.

**Current behavior:**
- Agent responds with text only
- Tools defined but never triggered

**Target behavior:**
- Model response includes `tool_calls` array
- Engine detects tool calls, executes them
- Results fed back to model for a second reasoning pass
- Final response includes both the tool results and the model's interpretation

**Implementation:**
```
User message
  → Build prompt with tool definitions
  → Send to model
  → Response has tool_calls?
    YES → Execute each tool
         → Build tool result messages
         → Send back to model (loop, max 3 iterations)
         → Final text response
    NO  → Return text response
```

**Tools to implement first:**
- `web_search` — needs Brave API key or fallback
- `calc` — basic math (already coded, needs wiring)
- `time` — already coded
- `memory_read/write` — needs database integration

### 3. Conversation Persistence (MEDIUM)

Right now, chat history lives in React state (lost on refresh).

**Target:**
- Engine creates session on first message
- All messages stored in SQLite
- On app restart, load recent sessions
- Click a session to resume conversation
- History survives app updates

**Files to add:**
- Session sidebar component (list recent conversations)
- Session loading on app start
- Message history display from database

### 4. Memory Extraction (MEDIUM)

Memory injection works (search_memory feeds context). But we never STORE new memories automatically.

**Target behavior:**
- After each conversation turn, engine analyzes the exchange
- Extracts facts: "User's name is Don", "Project is called Conflux Home"
- Extracts preferences: "Prefers direct answers", "Works late at night"
- Stores in memory table for future recall

**Implementation:**
- After assistant responds, send a second LLM call with a "extract memories" prompt
- Parse structured output (JSON) into memory entries
- Store in SQLite with confidence scores

---

## Architecture Decisions Needed

### A. Dual Router Strategy
Keep TypeScript Conflux Router as fallback?
- **Pro:** Works today, tested, proven
- **Con:** Two codebases doing the same thing
- **Recommendation:** Keep TypeScript router for now. Engine router takes over once frontend is wired. Remove TypeScript router after 1-2 sessions of stability.

### B. Streaming Through Engine
Can we stream through Tauri commands?
- Tauri commands return single values, not streams
- **Option 1:** Use Tauri events — engine emits chunk events, frontend listens
- **Option 2:** Use HTTP server inside engine — frontend connects to localhost:PORT
- **Recommendation:** Option 1 (Tauri events) for now. Simpler, no port management.

### C. API Key Management
Where do provider API keys live?
- **Current:** Hardcoded in TypeScript router AND Rust router (duplicated)
- **Target:** Single source of truth in engine's database (config table)
- **Migration:** Engine reads keys from DB, falls back to defaults

---

## File Map

### New Files
```
src/hooks/useEngineChat.ts          — Frontend hook for engine Tauri commands
src/components/SessionSidebar.ts    — Recent conversations list
src-tauri/src/engine/streaming.rs   — Tauri event-based streaming
```

### Modified Files
```
src/components/ChatPanel.tsx         — Use engine hook, show session history
src/App.tsx                          — Engine initialization, session loading
src-tauri/src/engine/runtime.rs      — Add tool calling loop
src-tauri/src/engine/router.rs       — Add streaming via Tauri events
src-tauri/src/lib.rs                 — Add streaming commands, session list command
```

---

## Success Criteria

At the end of next session:
1. ✅ Chat goes through Rust engine (not TypeScript router)
2. ✅ Conversations persist in SQLite (restart app, history still there)
3. ✅ Tool calling works (agent can search web, do math, tell time)
4. ✅ Quota tracked in database (not just localStorage)
5. ✅ Streaming works through Tauri events
6. ✅ All 90+ tests still pass
7. ✅ Binary still builds clean

---

## Estimated Time
- Frontend → Engine bridge: 1-2 hours
- Tool calling loop: 1-2 hours
- Conversation persistence: 1 hour
- Streaming via Tauri events: 1 hour
- Testing + fixes: 1 hour
- **Total: 5-7 hours**

## Risk Areas
- Tauri event streaming may have latency issues (test early)
- Tool calling loop may need prompt engineering per provider
- SQLite in Tauri may need write permissions configured
- Some providers may not support function calling (fallback to text-only)
