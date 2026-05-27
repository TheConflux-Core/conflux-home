# Conflux Home — Cross-Platform Security Engine Spec
## Mission 1224: Full Windows/Linux/macOS Parity

**Status:** Viper quick scan fixed. Full audit complete. All remaining gaps mapped below.
**Goal:** Every security scanner produces real findings on Windows. Zero silent failures. Zero all-zero scans.
**Branch:** Push upstream as PR after completion.

---

## Context

Conflux Home is a Tauri v2 desktop app with a Security Center featuring:
- **Aegis** — Blue team system audit (firewall, ports, SSH, permissions, software, scheduled tasks)
- **Viper** — Red team vulnerability scanner (misconfig, network, browser, passwords, code review)
- **Watchtower** — Continuous monitoring (file baselines, process snapshot, network connections)
- **Network Discovery** — LAN device scanning, ARP, device fingerprinting
- **Remediation Engine** — "Fix It" actions for findings

The `platform.rs` abstraction layer already provides cross-platform helpers:
- `current_os()` → `OsType::Linux | MacOS | Windows | Unknown`
- `get_firewall_status()` → ✅ All 3 platforms
- `get_listening_ports()` → ✅ All 3 platforms
- `get_users()` → ✅ All 3 platforms
- `get_platform_info()` → ✅ All 3 platforms
- `is_elevated()` → ✅ All 3 platforms
- `run_cmd(program, args)` → Cross-platform command runner

**Pattern:** Every scanner function should use `match current_os()` with `OsType::Linux`, `OsType::MacOS`, `OsType::Windows` branches. Linux checks that have no Windows equivalent (like `/proc` or `apt`) should have a Windows-native alternative, NOT just be skipped. Every check should produce a "pass" finding when healthy — silent successes produce dashboard zeros.

**Build:** `cd C:\Users\philm\Frank\conflux-home\src-tauri && cargo build`
**Test machine:** Windows 10/11, DESKTOP-7A6P8JQ
**Database:** `%APPDATA%\com.conflux.home\conflux.db` (126 tables, all security tables present)

---

## TIER 1 — Dashboard-Visible Scan Results

### 1.1 viper.rs — `scan_browser()` (Full Scan Only)
**Current:** Linux-only paths via `$HOME`.
**Fix:** Add `match current_os()` with Windows paths.

```
Firefox:  %APPDATA%\Mozilla\Firefox\Profiles\<profile>\logins.json
Chrome:   %LOCALAPPDATA%\Google\Chrome\User Data\Default\Login Data
Edge:     %LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Login Data
```

**Checks to port:**
- Firefox saved passwords → check `logins.json` for `"encryptedPassword"` (same logic, different path)
- Chrome/Chromium login data → check if `Login Data` file exists
- Browser extensions → count extension directories under Chrome/Edge `Extensions\` folder
- Excessive extensions warning (>15)

**Windows path resolution:** Use `std::env::var("LOCALAPPDATA")` and `std::env::var("APPDATA")` which work natively on Windows. Fall back gracefully if env vars are missing.

### 1.2 viper.rs — `scan_passwords()` (Full Scan Only)
**Current:** Reads `/etc/shadow`, `/etc/login.defs`, `~/.ssh/config` — all Linux.
**Fix:** Add Windows branch with equivalent checks.

**Windows checks:**
- Password policy: `powershell -Command "net accounts"` → parse `Minimum password length`, `Maximum password age`, `Lockout threshold`
- Accounts with no password: `powershell -Command "Get-LocalUser | Where-Object {$_.PasswordRequired -eq $false} | Select-Object Name"`
- Password never expires: `powershell -Command "Get-LocalUser | Where-Object {$_.PasswordNeverExpires -eq $true} | Select-Object Name"`
- SSH config check → skip on Windows (covered by Aegis `scan_ssh` if OpenSSH is installed)

### 1.3 viper.rs — `scan_code_config()` (Full Scan Only)
**Current:** Checks `$HOME/.env`, `$HOME/.aws/credentials`, etc. + Linux-only dirs `/var/www`, `/srv`, `/opt` + `/etc/docker/daemon.json`.
**Fix:** The `$HOME`-based checks already work cross-platform. Add Windows-specific paths and guard the Linux-only ones.

**Windows additions:**
- Check `%USERPROFILE%\.env`, `%USERPROFILE%\.aws\credentials`, `%APPDATA%\npm\.npmrc`
- Docker on Windows: check `%USERPROFILE%\.docker\daemon.json` (Docker Desktop)
- Guard Linux-only checks (`/var/www`, `/srv`, `/opt`) behind `if current_os() == OsType::Linux`

### 1.4 viper.rs — `scan_general()` (Full Scan Only)
**Current:** `apt list --upgradable`, `/proc/sys/kernel/core_pattern`, `/etc/passwd` UID 0 check, `find` for unowned files, `find` for writable systemd services — all Linux.
**Fix:** Add Windows branch.

**Windows checks:**
- Pending updates: `powershell -Command "(New-Object -ComObject Microsoft.Update.Session).CreateUpdateSearcher().SearchUpdates('IsInstalled=0').Count"` (same as misconfig check — reuse or deduplicate)
- Core dumps: Check `HKLM:\SOFTWARE\Microsoft\Windows\Windows Error Reporting\LocalDumps` — if configured, dumps may contain sensitive data
- Admin accounts: `powershell -Command "Get-LocalGroupMember -Group Administrators | Select-Object Name"` — flag if more than expected
- Guard Linux-only checks behind platform match

### 1.5 watchtower.rs — `default_watch_paths()`
**Current:** Returns Linux paths only.
**Fix:** Add platform match.

```rust
fn default_watch_paths() -> Vec<PathBuf> {
    match current_os() {
        OsType::Linux | OsType::MacOS => {
            let home = std::env::var("HOME").unwrap_or_else(|_| "/root".to_string());
            vec![
                PathBuf::from("/etc"),
                PathBuf::from(format!("{}/.config", home)),
                PathBuf::from(format!("{}/.ssh", home)),
                PathBuf::from(format!("{}/Downloads", home)),
                PathBuf::from(format!("{}/.local/share/applications", home)),
            ]
        }
        OsType::Windows => {
            let system_root = std::env::var("SystemRoot").unwrap_or_else(|_| r"C:\Windows".to_string());
            let program_data = std::env::var("ProgramData").unwrap_or_else(|_| r"C:\ProgramData".to_string());
            let user_profile = std::env::var("USERPROFILE").unwrap_or_default();
            let app_data = std::env::var("APPDATA").unwrap_or_default();
            vec![
                PathBuf::from(format!(r"{}\System32\drivers\etc", system_root)),
                PathBuf::from(format!(r"{}\ssh", program_data)),
                PathBuf::from(format!(r"{}\.ssh", user_profile)),
                PathBuf::from(format!(r"{}\Microsoft\Windows\Start Menu\Programs\Startup", app_data)),
                PathBuf::from(format!(r"{}\Downloads", user_profile)),
            ]
        }
        _ => vec![PathBuf::from("/etc")],
    }
}
```

### 1.6 watchtower.rs — `is_critical_path()`
**Current:** Only checks Linux critical paths.
**Fix:** Add Windows critical paths.

```rust
fn is_critical_path(path: &str) -> bool {
    let critical_prefixes_linux = [
        "/etc/ssh", "/etc/passwd", "/etc/shadow", "/etc/sudoers",
        "/etc/hosts", "/etc/resolv.conf", "/etc/crontab", "/etc/systemd",
        "/etc/pam.d", "/etc/security", "/etc/fstab",
    ];
    let critical_prefixes_windows = [
        r"C:\Windows\System32\drivers\etc\hosts",
        r"C:\Windows\System32\config",
        r"C:\ProgramData\ssh",
        r"C:\Windows\System32\GroupPolicy",
    ];
    critical_prefixes_linux.iter().any(|p| path.starts_with(p))
        || critical_prefixes_windows.iter().any(|p| path.starts_with(p))
}
```

### 1.7 watchtower.rs — `classify_event()`
**Current:** References `/tmp`, `/var/tmp`.
**Fix:** Add Windows temp paths.

```rust
// In classify_event(), change:
//   path.contains("/tmp") || path.contains("/var/tmp")
// To:
//   path.contains("/tmp") || path.contains("/var/tmp")
//   || path.to_lowercase().contains("temp") || path.to_lowercase().contains("tmp")
```

### 1.8 watchtower.rs — `snapshot_connections()`
**Current:** Reads `/proc/net/tcp` and `/proc/net/tcp6` — Linux only. On Windows this returns 0 connections.
**Fix:** Add Windows branch using PowerShell `Get-NetTCPConnection`.

```rust
pub async fn snapshot_connections(db: &EngineDb) -> Result<i64> {
    // ... existing setup ...
    
    match current_os() {
        OsType::Linux => {
            // Existing /proc/net/tcp parsing logic (keep as-is)
        }
        OsType::Windows => {
            // Use PowerShell Get-NetTCPConnection
            let output = Command::new("powershell")
                .args(["-Command", 
                    "Get-NetTCPConnection -ErrorAction SilentlyContinue | \
                     Select-Object LocalAddress,LocalPort,RemoteAddress,RemotePort,State,OwningProcess | \
                     ConvertTo-Json -Compress"])
                .output();
            // Parse JSON array, map to WatchtowerConnection entries
            // Use OwningProcess (PID) directly instead of inode lookup
        }
        _ => { /* existing /proc fallback or skip */ }
    }
}
```

### 1.9 watchtower.rs — `detect_suspicious_process()`
**Current:** Checks `exe_path.starts_with("/tmp/")` and `exe.starts_with("/var/tmp/")`.
**Fix:** Add Windows temp path checks.

```rust
// Add after existing /tmp checks:
if let Some(exe) = exe_path {
    let exe_lower = exe.to_lowercase();
    if exe_lower.contains(r"\temp\") || exe_lower.contains(r"\tmp\") 
        || exe_lower.contains(r"\appdata\local\temp\") {
        return (true, Some(format!("Process running from temporary directory: {}", exe)));
    }
}
```

### 1.10 aegis.rs — `scan_permissions()`
**Current:** `find` command + SUID check — Linux only. Uses `get_users()` (cross-platform) for user accounts but world-writable/SUID checks are Linux-only.
**Fix:** Add Windows branch.

**Windows checks:**
- Skip SUID check (Windows doesn't have SUID)
- Check for world-writable files in system dirs: `powershell -Command "Get-ChildItem 'C:\Windows\System32' -File -ErrorAction SilentlyContinue | Where-Object {($_.Attributes -band [IO.FileAttributes]::ReadOnly) -eq 0 -and (Get-Acl $_.FullName).Access | Where-Object {$_.FileSystemRights -match 'Write' -and $_.IdentityReference -match 'Everyone'}}"`
- Or simpler: just produce a "pass" finding saying "Windows ACL model differs — use icacls for detailed analysis"

### 1.11 aegis.rs — `scan_software_versions()`
**Current:** `apt list --upgradable` — Linux only. Software version checks (`openssl --version`, etc.) are cross-platform since they just try to run binaries.
**Fix:** Add Windows branch for update checking.

**Windows:**
- Try `winget upgrade` first (Windows Package Manager)
- Fall back to PowerShell: `powershell -Command "(New-Object -ComObject Microsoft.Update.Session).CreateUpdateSearcher().SearchUpdates('IsInstalled=0').Count"`
- The individual binary version checks (`openssl --version`, `git --version`, etc.) already work cross-platform — keep as-is

---

## TIER 2 — Infrastructure (Fix-It, Network Discovery)

### 2.1 remediation.rs — Windows Fix Commands
**Current:** All `FixDef` commands use `sh -c` with Linux utilities.
**Fix:** Add `get_fix_for_aegis_windows()` and `get_fix_for_viper_windows()` functions, selected via `current_os()`. Update `execute()` to use `cmd /c` or `powershell -Command` on Windows.

**Windows fix mappings:**

| Check Name | Windows Command |
|---|---|
| `windows_firewall` (off) | `netsh advfirewall set allprofiles state on` |
| `rdp_enabled` | `reg add "HKLM\System\CurrentControlSet\Control\Terminal Server" /v fDenyTSConnections /t REG_DWORD /d 1 /f` |
| `uac_disabled` | `reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" /v EnableLUA /t REG_DWORD /d 1 /f` |
| `defender_realtime` (off) | `powershell -Command "Set-MpPreference -DisableRealtimeMonitoring $false"` |
| `guest_account_enabled` | `net user Guest /active:no` |
| `pending_windows_updates` | `powershell -Command "Install-Module PSWindowsUpdate -Force; Get-WindowsUpdate -Install"` (or just prompt user) |

**Update `execute()` function:**
```rust
let output = if cfg!(target_os = "windows") {
    std::process::Command::new("powershell")
        .args(["-Command", &preview.command])
        .output()?
} else {
    std::process::Command::new("sh")
        .arg("-c")
        .arg(&preview.command)
        .output()?
};
```

### 2.2 network.rs — Windows Network Discovery
**Current:** Entirely Linux (`ip route`, `arp-scan`, `/proc/net/arp`, `getent`, `nc`).
**Fix:** Add Windows branches to each function.

**`get_local_network()` — Windows:**
```rust
fn get_local_network() -> Result<(String, String)> {
    match current_os() {
        OsType::Linux => { /* existing ip route logic */ }
        OsType::Windows => {
            let output = Command::new("powershell")
                .args(["-Command", 
                    "Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Ethernet','Wi-Fi' | \
                     Where-Object {$_.IPAddress -ne '127.0.0.1'} | \
                     Select-Object IPAddress,PrefixLength | ConvertTo-Json -Compress"])
                .output()?;
            // Parse JSON → return (ip, subnet)
        }
        _ => Ok(("unknown".into(), "unknown/24".into())),
    }
}
```

**`arp_scan()` — Windows:**
```rust
fn arp_scan(_subnet: &str) -> Result<Vec<(String, Option<String>)>> {
    match current_os() {
        OsType::Linux => { /* existing arp-scan / /proc/net/arp logic */ }
        OsType::Windows => {
            let output = Command::new("arp").args(["-a"]).output()?;
            let stdout = String::from_utf8_lossy(&output.stdout);
            Ok(stdout.lines().filter_map(|line| {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 3 && parts[0].contains('.') && parts[1] != "ff-ff-ff-ff-ff-ff" {
                    let mac = parts[1].replace('-', ":").to_uppercase();
                    Some((parts[0].to_string(), Some(mac)))
                } else { None }
            }).collect())
        }
        _ => Ok(vec![]),
    }
}
```

**`resolve_hostname()` — Windows:**
```rust
fn resolve_hostname(ip: &str) -> Option<String> {
    match current_os() {
        OsType::Linux => { /* existing getent logic */ }
        OsType::Windows => {
            Command::new("nslookup").arg(ip).output().ok().and_then(|out| {
                String::from_utf8_lossy(&out.stdout).lines()
                    .find(|l| l.contains("Name:"))
                    .and_then(|l| l.split(':').nth(1))
                    .map(|s| s.trim().to_string())
            })
        }
        _ => None,
    }
}
```

**`scan_ports()` — Windows:**
```rust
fn scan_ports(ip: &str) -> Vec<u16> {
    TOP_PORTS.iter().filter_map(|&port| {
        let success = match current_os() {
            OsType::Windows => {
                Command::new("powershell")
                    .args(["-Command", &format!("Test-NetConnection -ComputerName {} -Port {} -InformationLevel Quiet", ip, port)])
                    .output().ok()
                    .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "True")
                    .unwrap_or(false)
            }
            _ => Command::new("nc")
                .args(["-z", "-w1", ip, &port.to_string()])
                .output().ok().map(|o| o.status.success()).unwrap_or(false),
        };
        if success { Some(port) } else { None }
    }).collect()
}
```

**`get_network_map()` — Windows:**
```rust
// Replace ip route call with:
let gateway = match current_os() {
    OsType::Windows => {
        Command::new("powershell")
            .args(["-Command", "(Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Select-Object -First 1).NextHop"])
            .output().ok()
            .and_then(|o| String::from_utf8_lossy(&o.stdout).trim().to_string().into())
    }
    _ => { /* existing ip route logic */ }
};
```

---

## Implementation Order

1. **watchtower.rs** — `default_watch_paths()`, `is_critical_path()`, `classify_event()`, `detect_suspicious_process()` (simple path additions)
2. **watchtower.rs** — `snapshot_connections()` (PowerShell Get-NetTCPConnection — most impactful)
3. **viper.rs** — `scan_browser()` (Windows browser paths)
4. **viper.rs** — `scan_passwords()` (Windows password policy)
5. **viper.rs** — `scan_code_config()` (guard Linux paths + add Windows paths)
6. **viper.rs** — `scan_general()` (Windows admin accounts, update check)
7. **aegis.rs** — `scan_software_versions()` (winget/fallback)
8. **aegis.rs** — `scan_permissions()` (Windows ACL summary or skip gracefully)
9. **remediation.rs** — Windows fix commands + PowerShell execution
10. **network.rs** — Full Windows network discovery stack

## Verification Checklist

After build, delete DB and relaunch. Then:

- [ ] **Aegis Quick Scan** — Should show 8+ findings with mix of pass/warn/critical
- [ ] **Aegis Full Scan** — Software versions should show installed app versions
- [ ] **Viper Quick Scan** — Should show 10+ findings (exposed services, hosts file, DNS, promiscuous mode, firewall, RDP, UAC, Defender, updates, guest)
- [ ] **Viper Full Scan** — Browser checks should find Firefox/Chrome/Edge profiles; password checks should show policy info; code scan should check Windows config paths
- [ ] **Watchtower Baseline Scan** — Should find files in `C:\Windows\System32\drivers\etc`, `%USERPROFILE%\.ssh`, etc.
- [ ] **Watchtower Process Snapshot** — Should list running processes with CPU/memory (already works — sysinfo crate is cross-platform)
- [ ] **Watchtower Connection Snapshot** — Should show active TCP connections from PowerShell Get-NetTCPConnection (NOT zeros!)
- [ ] **Network Discovery** — Should detect local IP, subnet, and scan ARP table for devices
- [ ] **Fix It buttons** — Remediation commands should execute via PowerShell on Windows
- [ ] **No zeros** — Every scan should produce findings. If a check is platform-specific and doesn't apply, produce an "info" finding explaining why.

## Build & Test Commands

```powershell
# Clean build
cd C:\Users\philm\Frank\conflux-home\src-tauri
cargo clean
cargo build

# Delete stale database (fresh schema)
# Close the app first, then:
del "$env:APPDATA\com.conflux.home\conflux.db*"

# Launch
.\target\debug\conflux-home.exe

# Watch logs while testing
# The app logs to stdout — run from terminal to see [Aegis], [Viper], [Watchtower] messages
```
