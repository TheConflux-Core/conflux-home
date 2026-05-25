// Conflux Engine — Watchtower Continuous Monitoring
// Mission 1224 Phase 6: The Eye — 24/7 filesystem, process, network monitoring
//
// Sub-modules:
//   6.1 — File System Watcher (notify crate + SHA-256 baselines)
//   6.2 — Process Monitor (sysinfo snapshots)
//   6.3 — Network Connection Monitor (/proc/net/tcp parsing)
//
// Design: Background tasks emit events → SQLite → UI subscribes via Tauri commands

use anyhow::Result;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use sysinfo::{Pid, System};
use uuid::Uuid;
use walkdir::WalkDir;

use crate::engine::db::EngineDb;
use crate::engine::security::events::{self, EventCategory, EventType as SecEventType};

// ── Types ────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WatchtowerBaseline {
    pub id: String,
    pub file_path: String,
    pub file_hash: String,
    pub file_size: Option<i64>,
    pub file_mode: Option<i64>,
    pub owner_uid: Option<i64>,
    pub first_seen: String,
    pub last_checked: String,
    pub is_critical: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WatchtowerEvent {
    pub id: String,
    pub event_type: String,
    pub file_path: String,
    pub old_hash: Option<String>,
    pub new_hash: Option<String>,
    pub severity: String,
    pub description: Option<String>,
    pub was_expected: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WatchtowerProcess {
    pub id: String,
    pub pid: i64,
    pub ppid: Option<i64>,
    pub name: String,
    pub exe_path: Option<String>,
    pub cmdline: Option<String>,
    pub user_name: Option<String>,
    pub cpu_percent: Option<f64>,
    pub memory_mb: Option<f64>,
    pub first_seen: String,
    pub last_seen: String,
    pub is_baseline: bool,
    pub is_suspicious: bool,
    pub suspicion_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WatchtowerConnection {
    pub id: String,
    pub local_addr: String,
    pub local_port: i64,
    pub remote_addr: Option<String>,
    pub remote_port: Option<i64>,
    pub protocol: String,
    pub pid: Option<i64>,
    pub process_name: Option<String>,
    pub country: Option<String>,
    pub is_baseline: bool,
    pub is_suspicious: bool,
    pub suspicion_reason: Option<String>,
    pub first_seen: String,
    pub last_seen: String,
    pub bytes_sent: i64,
    pub bytes_recv: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WatchtowerStatus {
    pub running: bool,
    pub watched_paths: Vec<String>,
    pub event_count_24h: i64,
    pub baseline_count: i64,
    pub process_count: i64,
    pub connection_count: i64,
    pub threat_level: String,
}

// ── Default watch paths ──────────────────────────────────────

fn default_watch_paths() -> Vec<PathBuf> {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/root".to_string());
    vec![
        PathBuf::from("/etc"),
        PathBuf::from(format!("{}/.config", home)),
        PathBuf::from(format!("{}/.ssh", home)),
        PathBuf::from(format!("{}/Downloads", home)),
        PathBuf::from(format!("{}/.local/share/applications", home)),
    ]
}

fn ignore_patterns() -> Vec<&'static str> {
    vec![
        ".cache", "node_modules", ".git", "__pycache__", ".npm",
        ".cargo/registry", ".rustup", "target/debug", "target/release",
    ]
}

fn should_ignore(path: &str) -> bool {
    let patterns = ignore_patterns();
    patterns.iter().any(|p| path.contains(p))
}

// ── Critical file detection ──────────────────────────────────

fn is_critical_path(path: &str) -> bool {
    let critical_prefixes = [
        "/etc/ssh", "/etc/passwd", "/etc/shadow", "/etc/sudoers",
        "/etc/hosts", "/etc/resolv.conf", "/etc/crontab", "/etc/systemd",
        "/etc/pam.d", "/etc/security", "/etc/fstab",
    ];
    critical_prefixes.iter().any(|p| path.starts_with(p))
}

fn classify_event(event_type: &str, path: &str, is_critical: bool) -> (&'static str, String) {
    if is_critical && event_type == "deleted" {
        ("critical", format!("CRITICAL: System file deleted — {}", path))
    } else if is_critical && event_type == "modified" {
        ("warning", format!("System file modified — {}", path))
    } else if event_type == "permission_change" && path.contains("/etc") {
        ("critical", format!("Permission change on system config — {}", path))
    } else if event_type == "created" && (path.contains("/tmp") || path.contains("/var/tmp")) {
        ("info", format!("New file in temporary directory — {}", path))
    } else if is_critical {
        ("warning", format!("{} — {}", event_type.replace('_', " "), path))
    } else {
        ("info", format!("File {} — {}", event_type.replace('_', " "), path))
    }
}

// ── SHA-256 hashing ──────────────────────────────────────────

fn hash_file(path: &Path) -> Option<String> {
    let data = fs::read(path).ok()?;
    let mut hasher = Sha256::new();
    hasher.update(&data);
    Some(format!("{:x}", hasher.finalize()))
}

// ── Baseline scanning ────────────────────────────────────────

/// Perform a full baseline scan of watched directories.
/// Inserts new files, updates changed files, logs events for changes.
pub async fn scan_baselines(db: &EngineDb) -> Result<i64> {
    let paths = default_watch_paths();
    let mut count = 0i64;
    let conn = db.conn_async().await;

    for base_path in &paths {
        if !base_path.exists() {
            continue;
        }

        for entry in WalkDir::new(base_path)
            .follow_links(false)
            .max_depth(5)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let fpath = entry.path();
            if !fpath.is_file() {
                continue;
            }

            let path_str = fpath.to_string_lossy().to_string();
            if should_ignore(&path_str) {
                continue;
            }

            let hash = match hash_file(fpath) {
                Some(h) => h,
                None => continue,
            };

            let metadata = match fs::metadata(fpath) {
                Ok(m) => m,
                Err(_) => continue,
            };

            let file_size = metadata.len() as i64;
            #[cfg(unix)]
            let file_mode = {
                use std::os::unix::fs::PermissionsExt;
                metadata.permissions().mode() as i64
            };
            #[cfg(not(unix))]
            let file_mode: i64 = 0;

            #[cfg(unix)]
            let owner_uid = {
                use std::os::unix::fs::MetadataExt;
                metadata.uid() as i64
            };
            #[cfg(not(unix))]
            let owner_uid: i64 = 0;

            let critical = is_critical_path(&path_str);

            // Check if baseline exists
            let existing: Option<(String, String)> = conn
                .query_row(
                    "SELECT id, file_hash FROM watchtower_baselines WHERE file_path = ?",
                    rusqlite::params![path_str],
                    |row| Ok((row.get(0)?, row.get(1)?)),
                )
                .ok();

            if let Some((existing_id, old_hash)) = existing {
                // File exists in baseline — check for changes
                if old_hash != hash {
                    // Hash changed — log modification event
                    let (severity, desc) = classify_event("modified", &path_str, critical);
                    let event_id = Uuid::new_v4().to_string();
                    conn.execute(
                        "INSERT INTO watchtower_events (id, event_type, file_path, old_hash, new_hash, severity, description)
                         VALUES (?, 'modified', ?, ?, ?, ?, ?)",
                        rusqlite::params![event_id, path_str, old_hash, hash, severity, desc],
                    )?;

                    // Update baseline
                    conn.execute(
                        "UPDATE watchtower_baselines SET file_hash = ?, file_size = ?, file_mode = ?, owner_uid = ?, last_checked = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
                        rusqlite::params![hash, file_size, file_mode, owner_uid, existing_id],
                    )?;
                } else {
                    // Just update last_checked
                    conn.execute(
                        "UPDATE watchtower_baselines SET last_checked = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
                        rusqlite::params![existing_id],
                    )?;
                }
            } else {
                // New file — insert baseline + creation event
                let id = Uuid::new_v4().to_string();
                conn.execute(
                    "INSERT INTO watchtower_baselines (id, file_path, file_hash, file_size, file_mode, owner_uid, is_critical)
                     VALUES (?, ?, ?, ?, ?, ?, ?)",
                    rusqlite::params![id, path_str, hash, file_size, file_mode, owner_uid, if critical { 1 } else { 0 }],
                )?;

                let (severity, desc) = classify_event("created", &path_str, critical);
                let event_id = Uuid::new_v4().to_string();
                conn.execute(
                    "INSERT INTO watchtower_events (id, event_type, file_path, new_hash, severity, description)
                     VALUES (?, 'created', ?, ?, ?, ?)",
                    rusqlite::params![event_id, path_str, hash, severity, desc],
                )?;
            }

            count += 1;
        }
    }

    // Check for deleted files (in baseline but no longer on disk)
    let deleted: Vec<(String, String, i64)> = {
        let mut stmt = conn.prepare("SELECT id, file_path, is_critical FROM watchtower_baselines")?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, i64>(2)?))
        })?;
        rows.filter_map(|r| r.ok()).collect()
    };

    for (baseline_id, file_path, is_critical) in deleted {
        if !Path::new(&file_path).exists() {
            let critical = is_critical != 0;
            let (severity, desc) = classify_event("deleted", &file_path, critical);
            let event_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO watchtower_events (id, event_type, file_path, severity, description)
                 VALUES (?, 'deleted', ?, ?, ?)",
                rusqlite::params![event_id, file_path, severity, desc],
            )?;
            conn.execute(
                "DELETE FROM watchtower_baselines WHERE id = ?",
                rusqlite::params![baseline_id],
            )?;
        }
    }

    Ok(count)
}

// ── Process monitoring ───────────────────────────────────────

/// Snapshot current processes and detect suspicious ones.
pub async fn snapshot_processes(db: &EngineDb) -> Result<i64> {
    let mut sys = System::new_all();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    std::thread::sleep(Duration::from_millis(200));
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    let conn = db.conn_async().await;
    let mut count = 0i64;

    // Get existing process PIDs for baseline comparison
    let existing_pids: std::collections::HashSet<i64> = {
        let mut stmt = conn.prepare("SELECT DISTINCT pid FROM watchtower_processes")?;
        let rows = stmt.query_map([], |row| Ok(row.get::<_, i64>(0)?))?;
        rows.filter_map(|r| r.ok()).collect()
    };

    for (pid, process) in sys.processes() {
        let pid_i64 = pid.as_u32() as i64;
        let name = process.name().to_string_lossy().to_string();
        let exe_path = process.exe().map(|p| p.to_string_lossy().to_string());
        let cmdline = Some(process.cmd().iter().map(|c| c.to_string_lossy()).collect::<Vec<_>>().join(" "));
        let ppid = process.parent().map(|p| p.as_u32() as i64);
        let cpu = process.cpu_usage() as f64;
        let mem_mb = process.memory() as f64 / 1024.0 / 1024.0;

        // Suspicious detection
        let (is_suspicious, reason) = detect_suspicious_process(
            &name,
            exe_path.as_deref(),
            cmdline.as_deref(),
            cpu,
            mem_mb,
        );

        let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

        if existing_pids.contains(&pid_i64) {
            // Update existing
            conn.execute(
                "UPDATE watchtower_processes SET name = ?, exe_path = ?, cmdline = ?, cpu_percent = ?, memory_mb = ?, last_seen = ?, is_suspicious = ?, suspicion_reason = ? WHERE pid = ?",
                rusqlite::params![name, exe_path, cmdline, cpu, mem_mb, now, if is_suspicious { 1 } else { 0 }, reason, pid_i64],
            )?;
        } else {
            // New process
            let id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO watchtower_processes (id, pid, ppid, name, exe_path, cmdline, user_name, cpu_percent, memory_mb, is_suspicious, suspicion_reason)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                rusqlite::params![id, pid_i64, ppid, name, exe_path, cmdline, None::<String>, cpu, mem_mb, if is_suspicious { 1 } else { 0 }, reason],
            )?;

            if is_suspicious {
                let _ = events::log_security_event(
                    db,
                    "watchtower",
                    None,
                    SecEventType::Anomaly,
                    EventCategory::Warning,
                    Some("process_monitor"),
                    exe_path.as_deref(),
                    Some(reason.as_deref().unwrap_or("suspicious process detected")),
                    60,
                    false,
                ).await;
            }
        }
        count += 1;
    }

    // Mark processes that have exited
    let current_pids: std::collections::HashSet<i64> = sys.processes()
        .keys()
        .map(|p| p.as_u32() as i64)
        .collect();

    let stale: Vec<i64> = {
        let mut stmt = conn.prepare("SELECT pid FROM watchtower_processes")?;
        let rows = stmt.query_map([], |row| Ok(row.get::<_, i64>(0)?))?;
        rows.filter_map(|r| r.ok()).filter(|pid| !current_pids.contains(pid)).collect()
    };

    for stale_pid in stale {
        conn.execute(
            "DELETE FROM watchtower_processes WHERE pid = ?",
            rusqlite::params![stale_pid],
        )?;
    }

    Ok(count)
}

fn detect_suspicious_process(
    name: &str,
    exe_path: Option<&str>,
    cmdline: Option<&str>,
    cpu: f64,
    mem_mb: f64,
) -> (bool, Option<String>) {
    // Running from /tmp or /var/tmp
    if let Some(exe) = exe_path {
        if exe.starts_with("/tmp/") || exe.starts_with("/var/tmp/") {
            return (true, Some(format!("Process running from temporary directory: {}", exe)));
        }
        // Hidden directory execution
        if exe.contains("/.") && !exe.contains("/.config") && !exe.contains("/.local") && !exe.contains("/.cache") {
            return (true, Some(format!("Process running from hidden directory: {}", exe)));
        }
    }

    // Known suspicious process names
    let suspicious_names = [
        "xmrig", "minerd", "cpuminer", "cgminer", "bfgminer", // crypto miners
        "nc", "ncat", "netcat", "socat", // potential reverse shells
        "nmap", "masscan", "zgrab", // scanners
    ];
    if suspicious_names.iter().any(|s| name.to_lowercase().contains(s)) {
        return (true, Some(format!("Known suspicious process name: {}", name)));
    }

    // Crypto mining patterns in cmdline
    if let Some(cmd) = cmdline {
        let cmd_lower = cmd.to_lowercase();
        if cmd_lower.contains("stratum+tcp://") || cmd_lower.contains("mining") || cmd_lower.contains("--donate-level") {
            return (true, Some("Command line suggests cryptocurrency mining".to_string()));
        }
        // Reverse shell patterns
        if (cmd_lower.contains("bash") && cmd_lower.contains("-i") && cmd_lower.contains("&")) ||
           cmd_lower.contains("/dev/tcp/") {
            return (true, Some("Command line suggests reverse shell".to_string()));
        }
    }

    // Unusually high resource usage (>80% CPU or >2GB memory)
    if cpu > 80.0 && !["cargo", "rustc", "node", "code", "chromium", "firefox", "chrome"].iter().any(|b| name.to_lowercase().contains(b)) {
        return (true, Some(format!("Abnormally high CPU usage: {:.1}%", cpu)));
    }

    (false, None)
}

// ── Network connection monitoring ────────────────────────────

/// Parse /proc/net/tcp and /proc/net/tcp6 for current connections.
pub async fn snapshot_connections(db: &EngineDb) -> Result<i64> {
    let conn = db.conn_async().await;
    let mut count = 0i64;

    // Build PID → process name map
    let mut sys = System::new_all();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    std::thread::sleep(Duration::from_millis(100));
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    let pid_names: HashMap<u32, String> = sys.processes()
        .iter()
        .map(|(pid, proc)| (pid.as_u32(), proc.name().to_string_lossy().to_string()))
        .collect();

    // Parse /proc/net/tcp (IPv4) and /proc/net/tcp6 (IPv6)
    for proto_file in &["/proc/net/tcp", "/proc/net/tcp6"] {
        let content = match fs::read_to_string(proto_file) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let protocol = if proto_file.ends_with("6") { "tcp6" } else { "tcp" };

        for line in content.lines().skip(1) {
            let fields: Vec<&str> = line.split_whitespace().collect();
            if fields.len() < 10 {
                continue;
            }

            let local_addr = parse_hex_addr(fields[1]);
            let remote_addr = parse_hex_addr(fields[2]);
            let state = fields[3];
            let uid = fields[7].parse::<i64>().unwrap_or(0);

            // Parse inode → PID mapping (field 9 is inode)
            let inode = fields[9].parse::<u64>().unwrap_or(0);
            let proc_pid = find_pid_by_inode(inode, &pid_names);
            let proc_name = proc_pid.and_then(|p| pid_names.get(&p).cloned());

            // Only track established connections (state 01) and LISTEN (state 0A)
            let (local_ip, local_port) = parse_addr_port(&local_addr);
            let (remote_ip, remote_port) = parse_addr_port(&remote_addr);

            if remote_ip == "0.0.0.0" || remote_ip == "::" || remote_ip.is_empty() {
                // Listening socket — still track for port monitoring
                if state != "0A" {
                    continue;
                }
            }

            let is_suspicious = detect_suspicious_connection(
                &remote_ip,
                remote_port,
                proc_name.as_deref(),
            );
            let reason = if is_suspicious.0 { is_suspicious.1 } else { None };

            let conn_id = format!("{}:{}-{}:{}", local_ip, local_port, remote_ip, remote_port);

            // Check existing
            let existing: Option<String> = conn
                .query_row(
                    "SELECT id FROM watchtower_connections WHERE local_addr = ? AND local_port = ? AND remote_addr = ? AND remote_port = ?",
                    rusqlite::params![local_ip, local_port, remote_ip, remote_port],
                    |row| Ok(row.get::<_, String>(0)?),
                )
                .ok();

            if let Some(existing_id) = existing {
                conn.execute(
                    "UPDATE watchtower_connections SET last_seen = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), is_suspicious = ?, suspicion_reason = ? WHERE id = ?",
                    rusqlite::params![if is_suspicious.0 { 1 } else { 0 }, reason, existing_id],
                )?;
            } else {
                let id = Uuid::new_v4().to_string();
                conn.execute(
                    "INSERT INTO watchtower_connections (id, local_addr, local_port, remote_addr, remote_port, protocol, pid, process_name, is_suspicious, suspicion_reason)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    rusqlite::params![id, local_ip, local_port, remote_ip, remote_port, protocol, proc_pid.map(|p| p as i64), proc_name, if is_suspicious.0 { 1 } else { 0 }, reason],
                )?;
            }
            count += 1;
        }
    }

    // Clean up connections that no longer exist
    conn.execute(
        "DELETE FROM watchtower_connections WHERE last_seen < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 minutes')",
        [],
    )?;

    Ok(count)
}

fn parse_hex_addr(hex: &str) -> String {
    hex.to_string()
}

fn parse_addr_port(hex: &str) -> (String, i64) {
    if let Some((ip_hex, port_hex)) = hex.rsplit_once(':') {
        let port = i64::from_str_radix(port_hex, 16).unwrap_or(0);

        // Parse IP (little-endian hex)
        let ip = if ip_hex.len() == 8 {
            // IPv4
            if let (Ok(b0), Ok(b1), Ok(b2), Ok(b3)) = (
                u8::from_str_radix(&ip_hex[0..2], 16),
                u8::from_str_radix(&ip_hex[2..4], 16),
                u8::from_str_radix(&ip_hex[4..6], 16),
                u8::from_str_radix(&ip_hex[6..8], 16),
            ) {
                format!("{}.{}.{}.{}", b0, b1, b2, b3)
            } else {
                "0.0.0.0".to_string()
            }
        } else if ip_hex.len() == 32 {
            // IPv6 — parse groups
            let mut parts = Vec::new();
            for i in (0..32).step_by(4) {
                if i + 4 <= ip_hex.len() {
                    if let Ok(v) = u16::from_str_radix(&ip_hex[i..i + 4], 16) {
                        parts.push(format!("{:x}", v));
                    }
                }
            }
            parts.join(":")
        } else {
            "0.0.0.0".to_string()
        };

        (ip, port)
    } else {
        ("0.0.0.0".to_string(), 0)
    }
}

fn find_pid_by_inode(inode: u64, pid_names: &HashMap<u32, String>) -> Option<u32> {
    if inode == 0 {
        return None;
    }
    // Scan /proc/*/fd/* to find which PID owns this socket inode
    let proc_dir = Path::new("/proc");
    if let Ok(entries) = fs::read_dir(proc_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let pid_str = entry.file_name().to_string_lossy().to_string();
            if let Ok(pid) = pid_str.parse::<u32>() {
                let fd_dir = entry.path().join("fd");
                if let Ok(fds) = fs::read_dir(&fd_dir) {
                    for fd in fds.filter_map(|e| e.ok()) {
                        if let Ok(link) = fs::read_link(fd.path()) {
                            let link_str = link.to_string_lossy();
                            if link_str.contains(&format!("socket:[{}]", inode)) {
                                return Some(pid);
                            }
                        }
                    }
                }
            }
        }
    }
    None
}

fn detect_suspicious_connection(
    remote_ip: &str,
    remote_port: i64,
    proc_name: Option<&str>,
) -> (bool, Option<String>) {
    // Non-standard high ports used for C2
    if remote_port > 49151 && remote_ip != "0.0.0.0" && remote_ip != "::" {
        if let Some(proc) = proc_name {
            let known_apps = ["chrome", "firefox", "code", "spotify", "slack", "discord",
                "node", "cargo", "git", "ssh", "apt", "dpkg", "curl", "wget"];
            if !known_apps.iter().any(|k| proc.to_lowercase().contains(k)) {
                return (true, Some(format!("Non-standard port {} by {}", remote_port, proc)));
            }
        }
    }

    // Known suspicious ports
    let suspicious_ports = [4444, 5555, 6666, 6667, 31337, 12345, 54321];
    if suspicious_ports.contains(&remote_port) {
        return (true, Some(format!("Connection on known suspicious port {}", remote_port)));
    }

    (false, None)
}

// ── Query functions ──────────────────────────────────────────

/// Get watchtower events with pagination and severity filter.
pub async fn get_events(
    db: &EngineDb,
    severity: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<Vec<WatchtowerEvent>> {
    let conn = db.conn_async().await;
    let mut query = String::from(
        "SELECT id, event_type, file_path, old_hash, new_hash, severity, description, was_expected, created_at
         FROM watchtower_events WHERE 1=1"
    );
    let mut params: Vec<String> = Vec::new();

    if let Some(sev) = severity {
        query.push_str(" AND severity = ?");
        params.push(sev.to_string());
    }

    query.push_str(" ORDER BY created_at DESC LIMIT ? OFFSET ?");
    params.push(limit.to_string());
    params.push(offset.to_string());

    let mut stmt = conn.prepare(&query)?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|s| s as &dyn rusqlite::ToSql).collect();
    let events = stmt.query_map(&param_refs[..], |row| {
        Ok(WatchtowerEvent {
            id: row.get(0)?,
            event_type: row.get(1)?,
            file_path: row.get(2)?,
            old_hash: row.get(3)?,
            new_hash: row.get(4)?,
            severity: row.get(5)?,
            description: row.get(6)?,
            was_expected: row.get::<_, i64>(7)? != 0,
            created_at: row.get(8)?,
        })
    })?;

    Ok(events.filter_map(|r| r.ok()).collect())
}

/// Get baselines with optional limit.
pub async fn get_baselines(db: &EngineDb, limit: i64) -> Result<Vec<WatchtowerBaseline>> {
    let conn = db.conn_async().await;
    let mut stmt = conn.prepare(
        "SELECT id, file_path, file_hash, file_size, file_mode, owner_uid, first_seen, last_checked, is_critical
         FROM watchtower_baselines ORDER BY last_checked DESC LIMIT ?"
    )?;
    let baselines = stmt.query_map(rusqlite::params![limit], |row| {
        Ok(WatchtowerBaseline {
            id: row.get(0)?,
            file_path: row.get(1)?,
            file_hash: row.get(2)?,
            file_size: row.get(3)?,
            file_mode: row.get(4)?,
            owner_uid: row.get(5)?,
            first_seen: row.get(6)?,
            last_checked: row.get(7)?,
            is_critical: row.get::<_, i64>(8)? != 0,
        })
    })?;

    Ok(baselines.filter_map(|r| r.ok()).collect())
}

/// Get current process list.
pub async fn get_processes(db: &EngineDb, suspicious_only: bool) -> Result<Vec<WatchtowerProcess>> {
    let conn = db.conn_async().await;
    let mut query = String::from(
        "SELECT id, pid, ppid, name, exe_path, cmdline, user_name, cpu_percent, memory_mb, first_seen, last_seen, is_baseline, is_suspicious, suspicion_reason
         FROM watchtower_processes WHERE 1=1"
    );

    if suspicious_only {
        query.push_str(" AND is_suspicious = 1");
    }

    query.push_str(" ORDER BY cpu_percent DESC");

    let mut stmt = conn.prepare(&query)?;
    let procs = stmt.query_map([], |row| {
        Ok(WatchtowerProcess {
            id: row.get(0)?,
            pid: row.get(1)?,
            ppid: row.get(2)?,
            name: row.get(3)?,
            exe_path: row.get(4)?,
            cmdline: row.get(5)?,
            user_name: row.get(6)?,
            cpu_percent: row.get(7)?,
            memory_mb: row.get(8)?,
            first_seen: row.get(9)?,
            last_seen: row.get(10)?,
            is_baseline: row.get::<_, i64>(11)? != 0,
            is_suspicious: row.get::<_, i64>(12)? != 0,
            suspicion_reason: row.get(13)?,
        })
    })?;

    Ok(procs.filter_map(|r| r.ok()).collect())
}

/// Get current network connections.
pub async fn get_connections(db: &EngineDb, suspicious_only: bool) -> Result<Vec<WatchtowerConnection>> {
    let conn = db.conn_async().await;
    let mut query = String::from(
        "SELECT id, local_addr, local_port, remote_addr, remote_port, protocol, pid, process_name, country, is_baseline, is_suspicious, suspicion_reason, first_seen, last_seen, bytes_sent, bytes_recv
         FROM watchtower_connections WHERE 1=1"
    );

    if suspicious_only {
        query.push_str(" AND is_suspicious = 1");
    }

    query.push_str(" ORDER BY last_seen DESC");

    let mut stmt = conn.prepare(&query)?;
    let conns = stmt.query_map([], |row| {
        Ok(WatchtowerConnection {
            id: row.get(0)?,
            local_addr: row.get(1)?,
            local_port: row.get(2)?,
            remote_addr: row.get(3)?,
            remote_port: row.get(4)?,
            protocol: row.get(5)?,
            pid: row.get(6)?,
            process_name: row.get(7)?,
            country: row.get(8)?,
            is_baseline: row.get::<_, i64>(9)? != 0,
            is_suspicious: row.get::<_, i64>(10)? != 0,
            suspicion_reason: row.get(11)?,
            first_seen: row.get(12)?,
            last_seen: row.get(13)?,
            bytes_sent: row.get(14)?,
            bytes_recv: row.get(15)?,
        })
    })?;

    Ok(conns.filter_map(|r| r.ok()).collect())
}

/// Get watchtower status summary.
pub async fn get_status(db: &EngineDb) -> Result<WatchtowerStatus> {
    let conn = db.conn_async().await;

    let event_count_24h: i64 = conn.query_row(
        "SELECT COUNT(*) FROM watchtower_events WHERE created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-24 hours')",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    let baseline_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM watchtower_baselines",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    let process_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM watchtower_processes",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    let connection_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM watchtower_connections",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    let critical_events: i64 = conn.query_row(
        "SELECT COUNT(*) FROM watchtower_events WHERE severity = 'critical' AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-24 hours')",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    let warning_events: i64 = conn.query_row(
        "SELECT COUNT(*) FROM watchtower_events WHERE severity = 'warning' AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-24 hours')",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    let threat_level = if critical_events > 0 {
        "critical".to_string()
    } else if warning_events > 3 {
        "warning".to_string()
    } else if warning_events > 0 {
        "elevated".to_string()
    } else {
        "normal".to_string()
    };

    let paths = default_watch_paths();
    let watched_paths: Vec<String> = paths.iter().map(|p| p.to_string_lossy().to_string()).collect();

    Ok(WatchtowerStatus {
        running: true, // Always true in current implementation (manual trigger model)
        watched_paths,
        event_count_24h,
        baseline_count,
        process_count,
        connection_count,
        threat_level,
    })
}

/// Full scan: baselines + processes + connections in one call.
pub async fn full_scan(db: &EngineDb) -> Result<(i64, i64, i64)> {
    let files = scan_baselines(db).await?;
    let procs = snapshot_processes(db).await?;
    let conns = snapshot_connections(db).await?;
    Ok((files, procs, conns))
}
