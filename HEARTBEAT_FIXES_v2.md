# Heartbeat Chain Fixes — 2026-05-29

## Problem
The first heartbeat chain run returned false zeros across 4 out of 9 agent steps.
Budget showed $0 when 6 buckets + $6,666 income existed. Dreams showed "none" when
"Build a startup" with 5 milestones existed. Echo showed "no entries" when 3 counselor
sessions with 23 messages existed.

## Root Causes Fixed

### 1. Budget Query — Wrong Table + Wrong User + Wrong Month
**File:** `src-tauri/src/engine/db.rs` — `get_budget_summary_sync()`

**Before:** Queried only `budget_entries` (0 rows). Real data in `budget_buckets` (6 rows)
and `budget_settings` (income $6,666).

**After:** Queries in priority order:
1. `budget_settings.income_amount` → configured income
2. `budget_entries` income entries → manual income (overrides settings if present)
3. `budget_entries` expenses → actual spending
4. `budget_buckets` → planned spending (bucket allocations)

### 2. Budget Tool — Wrong User ID
**File:** `src-tauri/src/engine/tools.rs` — `execute_budget_get_summary()`

**Before:** Used `user_id` parameter from session (was "heartbeat" in chain context).

**After:** Uses `get_member_id()` helper → `supabase_user_id` from config.

### 3. Echo Tool — Wrong Table
**File:** `heartbeat_chain.json` — wellness_check step

**Before:** Called `echo_get_entries` → queries `echo_entries` table (0 rows).
Real data in `echo_counselor_sessions` (3 sessions) + `echo_counselor_messages` (23 msgs).

**After:** Calls `echo_counselor_get_state` → returns counselor session count, streak,
pending exercises, crisis flags, unread reflections.

### 4. User ID Pipeline — "heartbeat" vs Real User
**File:** `src-tauri/src/heartbeat_chain/chain.rs` — `execute_step()` + `compile_chain_summary()`

**Before:** Created sessions with `user_id = "heartbeat"`. All tools received "heartbeat"
as the user_id parameter.

**After:** Reads `supabase_user_id` from config. Sessions created with real user ID.

### 5. Date Not Injected
**File:** `src-tauri/src/heartbeat_chain/chain.rs`

**Before:** Task messages had no date context. Agent called `budget_get_summary("2026-01")`
because it didn't know the current month.

**After:** Injects `Current date: YYYY-MM-DD (month: YYYY-MM)` into every task message.

### 6. Weekly Summary — Didn't Show Buckets
**File:** `src-tauri/src/engine/tools.rs` — `execute_weekly_summary()`

**Before:** Only showed "Spent $0 | Income $0 | Net $0".

**After:** Shows "Income $X | Spent $Y | N buckets planned $Z | Net $W".

### 7. Debug Logging Added
- `dream_list` — logs member_id and result count
- `budget_get_summary` — logs member_id, month, and result values
- `echo_counselor_get_state` — logs query execution

## Config Changes
**File:** `~/.config/.conflux/heartbeat_chain.json` — version bumped 4 → 5

- **Pulse:** Updated to reference bucket allocations from budget_get_summary
- **Horizon:** Updated dream_list instructions (try with/without status filter)
- **Echo:** Switched from echo_get_entries to echo_counselor_get_state
- **Orbit:** Fixed tool name (life_get_habits, not life_list_habits)

## Additional Fixes (Phase 2)

### 8. Helix Web Search — DuckDuckGo Dead
**File:** `src-tauri/src/engine/tools.rs`

**Problem:** DuckDuckGo Instant Answer API returns empty for real-time queries.
No market data, no search results.

**Fix:** Added `fetch_market_data()` function:
- Yahoo Finance API for stock indices (S&P 500, NASDAQ, Dow) — no key needed
- CoinGecko API for crypto (BTC, ETH) — no key needed
- Auto-detects market queries via `is_market_query()` helper
- Falls back to DDG HTML scraping for general queries

### 9. Memory Extractor — Safety Filter + JSON Parsing
**File:** `src-tauri/src/engine/memory.rs`

**Problem:** Memory extractor refused to process security-related conversations
(called them "prompt injection"). JSON extraction failed on markdown code blocks.

**Fix:**
- Strengthened EXTRACTION_PROMPT with heartbeat context preamble
- Added "This is an INTERNAL SYSTEM HEARTBEAT" framing
- Increased max_tokens 1000→1500 for longer extractions
- Added `<think>` tag stripping (MiniMax variant)
- Added refusal detection — logs safety filter hits instead of silent failure

### 10. MiniMax XML Tool Call Fallback
**File:** `src-tauri/src/engine/runtime.rs`

**Problem:** When MiniMax fails function calling, it outputs XML tool call syntax
as text. Engine treated this as a normal response.

**Fix:** Added detection for `<minimax:tool_call>`, `<invoke name=`,
`<parameter name=` patterns in response content. Logs warning when detected.

## Compile Status
- `cargo check` — ✅ clean (102 pre-existing warnings, 0 new)
- `npx tsc --noEmit` — ✅ clean

## Files Modified
1. `src-tauri/src/engine/db.rs` — get_budget_summary_sync rewrite
2. `src-tauri/src/engine/tools.rs` — budget tool + debug logging + weekly summary + market data + DDG HTML
3. `src-tauri/src/heartbeat_chain/chain.rs` — user_id + date injection
4. `src-tauri/src/engine/memory.rs` — extraction prompt + max_tokens + refusal detection
5. `src-tauri/src/engine/runtime.rs` — XML tool call detection
6. `~/.config/.conflux/heartbeat_chain.json` — task messages + version bump (v5)
