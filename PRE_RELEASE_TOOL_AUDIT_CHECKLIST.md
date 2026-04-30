# Conflux Home — Pre-Release Tool Layer Audit Checklist

> Start every new session with this to catch bugs before they hit testing.
> Based on real bugs found during v0.1.73 testing cycle (2026-04-30).

---

## CONTEXT

This is a Tauri v2 Rust app. The tool layer lives in `src-tauri/src/engine/tools.rs`.
Execute functions are called synchronously inside `tokio::task::block_in_place` threads.
DB layer is in `src-tauri/src/engine/db.rs`.

---

## PATTERNS TO LOOK FOR (root causes of real bugs already fixed)

### 🔴 PATTERN 1: `~` not expanded before filesystem access

**Symptom:** `file_read` / `file_write` denies `~/Documents/...` paths
**Root cause:** `Path::new("~/...").canonicalize()` fails — Unix doesn't resolve `~` automatically
**Find:**
```bash
grep -n 'canonicalize\|is_path_allowed\|Path::new.*args' src/engine/tools.rs | grep -v expand_tilde
```
**Fix rule:** Any path from user/LLM args must call `expand_tilde()` before `canonicalize()`:
```rust
fn expand_tilde(path: &str) -> String {
    if path.starts_with("~") {
        if let Ok(home) = std::env::var("HOME") {
            return format!("{}{}", home, &path[1..]);
        }
    }
    path.to_string()
}
```

---

### 🔴 PATTERN 2: Literal string `"NULL"` passed as foreign key argument

**Symptom:** FOREIGN KEY constraint failed — model says "null" but SQLite gets "NULL" string
**Root cause:** `engine.db().some_sync_fn(..., "NULL", ...)` passes literal string, not SQL NULL
**Find:**
```bash
grep -rn '"NULL"' src/engine/tools.rs | grep -E 'execute|INSERT|UPDATE|params!'
```
**Fix rule:** For absent FK values (member_id, etc.), use `""` (empty string), NOT `"NULL"`
**Affected tools:** life_add_task, life_add_habit, life_log_habit, life_complete_task, life_delete_task

---

### 🔴 PATTERN 3: `reqwest::blocking::Client` inside an async fn

**Symptom:** Panic — "Cannot drop a runtime in a context where blocking is not allowed"
**Root cause:** Blocking HTTP client created inside Tokio async context → runtime shutdown conflict
**Find:**
```bash
grep -rn 'reqwest::blocking' src/engine/ --include="*.rs" | grep -v 'std::thread::spawn\|fn main'
```
**Fix rule:** In async functions, only use `reqwest::Client` (async). `reqwest::blocking::Client`
is ONLY safe in dedicated `std::thread::spawn` wrappers with their own runtime.

---

### 🔴 PATTERN 4: No routing for intent-specific queries to specialized APIs

**Symptom:** Weather queries return "No results found" — general search can't parse weather data
**Root cause:** `execute_web_search` only calls DuckDuckGo HTML + Wikipedia for all query types
**Find:**
```bash
grep -n 'is_weather_query\|fetch_weather\|wttr.in' src/engine/tools.rs
```
**Fix rule:** Detect intent types before falling back to general search:
- Weather → `wttr.in` (free, no API key)
- News → news API
- Stock prices → free finance API

---

### 🔴 PATTERN 5: Required fields missing explicit empty validation

**Symptom:** Tool returns `success: false` with generic message — no specific field flagged
**Root cause:** `.unwrap_or("")` on required fields without checking if the result is empty
**Find:** Manual review of each `execute_*` function — look for `.unwrap_or("")` on fields
not marked `"required": false` in the schema

---

## AUDIT CHECKLIST — run in order

### CHECK 1: PATH EXPANSION
Search all execute_* functions that accept path args.
```bash
grep -n 'args.get.*path\|file_read\|file_write' src/engine/tools.rs | head -20
```
Verify `expand_tilde()` is called BEFORE any `canonicalize()` or `fs::` operation.
**Status:** ✅ FIXED in commit `ef50a3b`

---

### CHECK 2: FK "NULL" STRINGS
```bash
grep -rn '"NULL"' src/engine/tools.rs | grep -E 'INSERT|UPDATE|execute_sync'
```
If any results, they need to be `""` not `"NULL"`. Check life_*, dream_*, budget_* especially.
**Status:** ✅ FIXED in commit `7aaa335` (life tools)

---

### CHECK 3: BLOCKING HTTP IN ASYNC
```bash
grep -rn 'reqwest::blocking' src/engine/ --include="*.rs" | grep -v 'std::thread::spawn\|fn main'
```
Any async fn using blocking client = bug.
**Status:** ✅ FIXED in commit `8a085a3` (fetch_weather made async)

---

### CHECK 4: WEATHER ROUTING
```bash
grep -n 'is_weather_query\|fetch_weather\|wttr.in' src/engine/tools.rs
```
Verify `execute_web_search` has intent detection routing weather to `wttr.in`.
**Status:** ✅ FIXED in commit `8a085a3`

---

### CHECK 5: SCHEMA / PARAMETER ALIGNMENT
For every tool in the dispatch table:
- Schema `properties` keys must match what `args.get()` reads
- Required fields in schema must have explicit empty-check in execute fn
Run: compare dispatch table keys against each execute function's `args.get()` calls.

---

### CHECK 6: WINDOWS SAFETY
```bash
grep -rn 'Handle::current().block_on' src/engine/
```
Should return zero results in execute functions.
Safe pattern (verified in security/events.rs and security/permissions.rs):
```rust
std::thread::spawn(move || {
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async_fn(...))
});
```
**Status:** ✅ VERIFIED CLEAN

---

### CHECK 7: LIFE DOMAIN member_id HANDLING
```bash
grep -n '"NULL"' src/engine/tools.rs | grep -E 'life_|habit|task|reminder'
```
All life_* tools must pass `""` for member_id, not `"NULL"`.
**Status:** ✅ FIXED in commit `7aaa335`

---

### CHECK 8: VENDOR / API CREDENTIALS
Verify every external API has its key in the correct place:
- Brave Search: not used (DDG Lite is free) ✅
- wttr.in: no key needed ✅
- Wikipedia: no key needed ✅
- Google APIs: check `.env` / secrets manager

---

## SUMMARY STATUS

| Check | Status | Commit |
|-------|--------|--------|
| 1. Path expansion | ✅ FIXED | `ef50a3b` |
| 2. FK "NULL" strings | ✅ FIXED | `7aaa335` |
| 3. Blocking HTTP in async | ✅ FIXED | `8a085a3` |
| 4. Weather routing | ✅ FIXED | `8a085a3` |
| 5. Schema/param alignment | ✅ VERIFIED | audit_report.md |
| 6. Windows safety | ✅ VERIFIED | independent audit |
| 7. Life domain member_id | ✅ FIXED | `7aaa335` |
| 8. API credentials | ✅ VERIFIED | no Brave key needed |

---

## NEXT ACTIONS before Windows release

1. Re-run full Phase 2-10 test checklist after these fixes
2. Verify vault_create_project actually persists (step 46)
3. Check dream_* and budget_* tools for same "NULL" FK pattern
4. Add the pattern checks to CI / pre-commit hook

---

*Last updated: 2026-04-30 — after v0.1.73 tool layer audit and fixes*