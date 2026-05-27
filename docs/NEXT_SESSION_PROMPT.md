# Session Summary: Security Scanner Investigation
## Date: 2026-05-26

## Issues Identified

### 1. Watchtower Scan Crashing App
**Root Cause:** `scan_baselines()` in watchtower.rs does synchronous file I/O (WalkDir + SHA-256 hashing) inside an async function. This blocks the main thread.

**Specific Problems:**
- `WalkDir` traverses directories synchronously
- `hash_file()` reads entire file contents to compute SHA-256
- On Windows, Downloads folder can have large files (GB+) that take forever to hash
- Even with `spawn_blocking`, the nested `rt.block_on()` approach may cause deadlocks

**Files to Fix:**
- `src-tauri/src/engine/security/watchtower.rs` - `scan_baselines()` function
- `src-tauri/src/engine/security/watchtower.rs` - `snapshot_connections()` function (uses `/proc/net/tcp` or PowerShell)
- `src-tauri/src/commands.rs` - `watchtower_scan()` command

### 2. Network Scan Crashing App
**Root Cause:** Port scanning uses `Test-NetConnection` PowerShell cmdlet for EACH port.

**Specific Problems:**
- `scan_ports()` calls PowerShell `Test-NetConnection` 15 times per device
- Scans up to 10 devices = 150 PowerShell invocations
- Each `Test-NetConnection` takes 1-2 seconds = 2.5+ minutes total
- `spawn_blocking` with nested `rt.block_on()` may cause runtime issues

**Files to Fix:**
- `src-tauri/src/engine/security/network.rs` - `scan_ports()` function
- `src-tauri/src/engine/security/network.rs` - `run_scan()` function (line 305: `scan_ports(ip)` for first 10 devices)
- `src-tauri/src/commands.rs` - `network_scan()` command

### 3. spawn_blocking Implementation Issue
The current implementation uses nested runtimes:
```rust
tokio::task::spawn_blocking(move || {
    let rt = tokio::runtime::Handle::current();
    rt.block_on(async_function(&db))
})
```

This can cause deadlocks. Better approaches:
1. Make the inner functions truly synchronous (remove async)
2. Or use `tokio::task::spawn` instead of `spawn_blocking`
3. Or restructure to avoid nested async

## Recommended Fixes for Next Session

### Priority 1: Fix spawn_blocking Pattern
Replace nested `rt.block_on()` with proper synchronous wrappers:

```rust
// In watchtower.rs - add sync wrapper
pub fn full_scan_sync(db: &EngineDb) -> Result<(i64, i64, i64)> {
    let rt = tokio::runtime::Handle::current();
    rt.block_on(full_scan(db))
}

// In commands.rs - use sync wrapper
pub async fn watchtower_scan() -> Result<serde_json::Value, String> {
    let engine = super::engine::get_engine();
    let db = engine.db().clone();
    
    tokio::task::spawn_blocking(move || {
        super::engine::security::watchtower::full_scan_sync(&db)
    })
    .await
    .map_err(|e| format!("Join error: {}", e))?
    .map_err(|e| e.to_string())
}
```

### Priority 2: Optimize Watchtower Scanning
1. Limit file size for hashing (skip files > 10MB)
2. Add progress callbacks to prevent timeout
3. Consider not hashing on first scan (just record metadata)

### Priority 3: Optimize Network Port Scanning
1. Reduce ports scanned (only critical: 22, 80, 443, 445, 3389)
2. Use `netstat -an` once instead of multiple `Test-NetConnection`
3. Or use Rust's `std::net::TcpStream` with timeout for faster scanning
4. Only scan first 5 devices instead of 10

### Priority 4: Add Scan Limits
```rust
// In watchtower.rs
const MAX_FILES_TO_SCAN: usize = 1000;
const MAX_FILE_SIZE_FOR_HASH: u64 = 10 * 1024 * 1024; // 10MB

// In network.rs
const MAX_DEVICES_TO_PORT_SCAN: usize = 5;
const PORTS_TO_SCAN: &[u16] = &[22, 80, 443, 445, 3389]; // Only critical
```

## Testing After Fixes
1. Delete DB: `del "$env:APPDATA\com.conflux.home\conflux.db*"`
2. Build: `cargo build`
3. Test Watchtower Full Scan - should complete in < 30 seconds
4. Test Network Scan - should complete in < 30 seconds
5. Verify UI stays responsive during scans

## Current State
- Cross-platform security fixes implemented ✅
- Timeout increased to 30s default ✅
- spawn_blocking added (but incorrectly) ⚠️
- Scans still crashing app ❌
- UI freezing during scans ❌
