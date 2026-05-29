# Heartbeat & Notifications — Post-Merge Regression Analysis

> **Created:** 2026-05-28 15:07 MDT
> **Status:** OPEN — needs fresh session with systematic approach
> **Severity:** Both heartbeat chain and notifications are completely non-functional

---

## The Core Question

Don reports: "On another machine, I had the heartbeat and notifications firing. Since we merged the PR, both are broken."

**Three possibilities:**
1. Not everything was pushed/merged from the working state
2. Something in the merge broke the functionality  
3. The running dev version differs from what was tested on the other machine

**Need to investigate:** Compare the PR diff, check what was on the other machine, verify we're looking at the right codebase.

---

## Symptom 1: Heartbeat Chain Never Auto-Fires

**Evidence:**
- `heartbeat_chain_state.json` does NOT exist on disk → chain has never successfully auto-started
- Log file (`~/.local/share/com.conflux.home/logs/Conflux Home.log`) shows ZERO `[CronScheduler]` messages — no init, no ticks, nothing
- BUT cron jobs DO fire (Viper ran at 19:22, budget-nudge ran, watchtower ran) — so `tick_cron()` IS being called
- The scheduler loop IS running (cron jobs prove it), but `trigger_chain()` either isn't being reached or silently fails

**Key code path (lib.rs ~line 200):**
```
tick_cron() → log tick → set_config(heartbeat_last_beat_ms) → emit(conflux:heartbeat-beat) → trigger_chain()
```

**What works:**
- Manual `heartbeat_chain_trigger_test` fires the chain successfully
- Steps 1-5 completed with real LLM calls (conflux, aegis, helix, pulse, viper)
- MiniMax responds with 200 OK, tools execute correctly

**What doesn't work:**
- Auto-trigger from scheduler tick never fires
- Frontend countdown timer is purely cosmetic — counts from `lastBeat + interval` but nothing triggers at 0

---

## Symptom 2: Notifications Not Working

**Not yet investigated in this session.** Need to check:
- `conflux:notification` Tauri event emission
- `useNotificationListener.ts` hook
- `NotificationSettings.tsx` state
- Whether notifications depend on the heartbeat chain

---

## Issues Found & Fixed This Session

### ✅ Fixed: Missing Agents in DB
- `horizon`, `orbit`, `hearth`, `echo` didn't exist in the `agents` table
- `create_session()` failed with `FOREIGN KEY constraint failed`
- **Fix:** INSERT OR IGNORE for all 4 agents

### ✅ Fixed: Stale Config on Disk
- `heartbeat_chain.json` was saved by `heartbeat_chain_update_config` BEFORE task messages were fixed
- Still had `aegis_run_audit`, `viper_run_scan` (nonexistent tools)
- `load_config()` read from file, ignoring `default_chain()`
- **Fix:** Deleted stale config, added version-based auto-upgrade (v3)

### ✅ Fixed: Task Messages Referencing Nonexistent Tools
- `aegis_run_audit`, `viper_run_scan`, `security_run_anomaly_scan` are NOT LLM-callable tools
- They're Tauri commands (frontend only)
- **Fix:** Rewrote task messages to use `exec` for security/vuln scans

### ✅ Fixed: Anti-Hallucination Preamble Too Aggressive
- Triggered MiniMax's safety filters → model thought it was prompt injection
- **Fix:** Simplified to: `"HEARTBEAT TASK (action): task. Be concise. 2-3 sentences max."`

### ⚠️ Partially Fixed: Settings Panel Freeze
- `saveConfig` had `useCallback([enabled])` → stale closure → rapid-fire config writes
- Fixed the React state loop, but Don reports it still freezes
- **Root cause likely deeper** — may be related to the same PR merge issue

### ❌ Not Fixed: Auto-Trigger
- The scheduler loop runs, cron jobs fire, but `trigger_chain()` never logs
- Added logging to `trigger_chain()` entry/exit but never saw it in logs
- **This is the critical unsolved mystery**

---

## What NOT to Do Next Session

1. **Don't patch symptoms** — understand the full scheduler → chain → frontend flow first
2. **Don't add more logging without understanding the control flow** — we added logging but never saw it, which means either:
   - The code path isn't reached (most likely)
   - The log is being swallowed
3. **Don't assume the frontend timer drives the backend** — it's purely cosmetic
4. **Don't keep rebuilding without verifying the running binary** — `cargo check` ≠ `cargo build`

---

## Recommended Next Steps

1. **Verify the PR diff** — what was merged? Is the scheduler code from the PR or pre-existing?
2. **Check if the other machine has a different branch/version** — compare commit hashes
3. **Read the scheduler loop end-to-end** — trace from `SCHEDULER_STARTED` through `tick_cron()` to `trigger_chain()` and find where the chain call is skipped
4. **Check if `trigger_chain` is actually in the compiled binary** — maybe it's dead code eliminated
5. **Test notifications separately** — don't conflate with heartbeat
6. **Consider reverting the PR** if the regression is too deep to fix incrementally

---

## Files Modified This Session

| File | Change |
|------|--------|
| `src-tauri/src/heartbeat_chain/config.rs` | Added `task_message` field, v3 auto-upgrade, fixed task messages |
| `src-tauri/src/heartbeat_chain/chain.rs` | Added `execute_step()`, `compile_chain_summary()`, real LLM calls, logging |
| `src-tauri/src/heartbeat_chain/mod.rs` | Added trigger logging, removed unused import |
| `src/components/settings/HeartbeatChainSettings.tsx` | Fixed save loop (ref-based enabled, dedup agents) |
| `~/.local/share/com.conflux.home/conflux.db` | Added horizon/orbit/hearth/echo agents |

**All changes are in the workspace repo at `/home/calo/.openclaw/workspace/conflux-home/`**
