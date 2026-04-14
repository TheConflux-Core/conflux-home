// Conflux Engine — Aegis System Audit
// Mission 1224 Phase 2: Blue Team Guardian
// Scans the local system for security issues and produces findings.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::process::Command;
use uuid::Uuid;

use crate::engine::db::EngineDb;
use crate::engine::security::events::{self, EventCategory, EventType};

/// A single audit finding
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditFinding {
    pub id: String,
    pub run_id: String,
    pub category: String,
    pub check_name: String,
    pub severity: String, // 'pass' | 'info' | 'warning' | 'critical'
    pub title: String,
    pub description: String,
    pub recommendation: Option<String>,
    pub raw_data: Option<serde_json::Value>,
}

/// An audit run summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditRun {
    pub id: String,
    pub run_type: String,
    pub status: String,
    pub overall_score: Option<i64>,
    pub total_checks: i64,
    pub pass_count: i64,
    pub warn_count: i64,
    pub critical_count: i64,
    pub started_at: String,
    pub completed_at: Option<String>,
}

/// Category scan result
#[derive(Debug, Clone)]
struct CategoryResult {
    findings: Vec<FindingInput>,
}

/// Raw finding before DB insert
#[derive(Debug, Clone)]
struct FindingInput {
    category: String,
    check_name: String,
    severity: String,
    title: String,
    description: String,
    recommendation: Option<String>,
    raw_data: Option<serde_json::Value>,
}

// ── Public API ──────────────────────────────────────────────

/// Run a full system audit. Returns the run ID.
pub fn run_full_audit(db: &EngineDb) -> Result<String> {
    run_audit(db, "full")
}

/// Run a quick audit (firewall + ports only). Returns the run ID.
pub fn run_quick_audit(db: &EngineDb) -> Result<String> {
    run_audit(db, "quick")
}

/// Get the most recent audit runs.
pub fn get_audit_runs(db: &EngineDb, limit: i64) -> Result<Vec<AuditRun>> {
    let conn = db.conn();
    let mut stmt = conn.prepare(
        "SELECT id, run_type, status, overall_score, total_checks, pass_count, warn_count, critical_count, started_at, completed_at
         FROM aegis_audit_runs ORDER BY started_at DESC LIMIT ?"
    )?;
    let runs = stmt
        .query_map(rusqlite::params![limit], |row| {
            Ok(AuditRun {
                id: row.get(0)?,
                run_type: row.get(1)?,
                status: row.get(2)?,
                overall_score: row.get(3)?,
                total_checks: row.get(4)?,
                pass_count: row.get(5)?,
                warn_count: row.get(6)?,
                critical_count: row.get(7)?,
                started_at: row.get(8)?,
                completed_at: row.get(9)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;
    Ok(runs)
}

/// Get findings for a specific audit run.
pub fn get_findings(db: &EngineDb, run_id: &str) -> Result<Vec<AuditFinding>> {
    let conn = db.conn();
    let mut stmt = conn.prepare(
        "SELECT id, run_id, category, check_name, severity, title, description, recommendation, raw_data
         FROM aegis_findings WHERE run_id = ? ORDER BY
         CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 WHEN 'info' THEN 2 ELSE 3 END,
         category, check_name"
    )?;
    let findings = stmt
        .query_map(rusqlite::params![run_id], |row| {
            let raw: Option<String> = row.get(8)?;
            Ok(AuditFinding {
                id: row.get(0)?,
                run_id: row.get(1)?,
                category: row.get(2)?,
                check_name: row.get(3)?,
                severity: row.get(4)?,
                title: row.get(5)?,
                description: row.get(6)?,
                recommendation: row.get(7)?,
                raw_data: raw.and_then(|s| serde_json::from_str(&s).ok()),
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;
    Ok(findings)
}

/// Get findings filtered by category.
pub fn get_findings_by_category(
    db: &EngineDb,
    run_id: &str,
    category: &str,
) -> Result<Vec<AuditFinding>> {
    let conn = db.conn();
    let mut stmt = conn.prepare(
        "SELECT id, run_id, category, check_name, severity, title, description, recommendation, raw_data
         FROM aegis_findings WHERE run_id = ? AND category = ?
         ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 WHEN 'info' THEN 2 ELSE 3 END"
    )?;
    let findings = stmt
        .query_map(rusqlite::params![run_id, category], |row| {
            let raw: Option<String> = row.get(8)?;
            Ok(AuditFinding {
                id: row.get(0)?,
                run_id: row.get(1)?,
                category: row.get(2)?,
                check_name: row.get(3)?,
                severity: row.get(4)?,
                title: row.get(5)?,
                description: row.get(6)?,
                recommendation: row.get(7)?,
                raw_data: raw.and_then(|s| serde_json::from_str(&s).ok()),
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;
    Ok(findings)
}

/// Get the latest audit run with full findings summary.
pub fn get_latest_audit_summary(db: &EngineDb) -> Result<Option<serde_json::Value>> {
    let conn = db.conn();
    let row = conn.query_row(
        "SELECT id, run_type, status, overall_score, total_checks, pass_count, warn_count, critical_count, started_at, completed_at
         FROM aegis_audit_runs ORDER BY started_at DESC LIMIT 1",
        [],
        |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "run_type": row.get::<_, String>(1)?,
                "status": row.get::<_, String>(2)?,
                "overall_score": row.get::<_, Option<i64>>(3)?,
                "total_checks": row.get::<_, i64>(4)?,
                "pass_count": row.get::<_, i64>(5)?,
                "warn_count": row.get::<_, i64>(6)?,
                "critical_count": row.get::<_, i64>(7)?,
                "started_at": row.get::<_, String>(8)?,
                "completed_at": row.get::<_, Option<String>>(9)?,
            }))
        },
    );

    match row {
        Ok(summary) => Ok(Some(summary)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

/// Delete an audit run and its findings.
pub fn delete_audit_run(db: &EngineDb, run_id: &str) -> Result<bool> {
    let conn = db.conn();
    // findings cascade-delete via FK
    let deleted = conn.execute(
        "DELETE FROM aegis_audit_runs WHERE id = ?",
        rusqlite::params![run_id],
    )?;
    Ok(deleted > 0)
}

// ── Internal: Audit Runner ──────────────────────────────────

fn run_audit(db: &EngineDb, run_type: &str) -> Result<String> {
    let run_id = Uuid::new_v4().to_string();
    let conn = db.conn();

    // Create audit run
    conn.execute(
        "INSERT INTO aegis_audit_runs (id, run_type, status) VALUES (?1, ?2, 'running')",
        rusqlite::params![&run_id, run_type],
    )?;

    log::info!("[Aegis] Starting {} audit run: {}", run_type, run_id);

    let mut all_findings: Vec<FindingInput> = Vec::new();

    // ── Firewall scan ──
    match scan_firewall() {
        Ok(mut findings) => all_findings.append(&mut findings),
        Err(e) => log::warn!("[Aegis] Firewall scan failed: {}", e),
    }

    // ── Port scan ──
    match scan_ports() {
        Ok(mut findings) => all_findings.append(&mut findings),
        Err(e) => log::warn!("[Aegis] Port scan failed: {}", e),
    }

    // ── SSH config audit ──
    match scan_ssh() {
        Ok(mut findings) => all_findings.append(&mut findings),
        Err(e) => log::warn!("[Aegis] SSH scan failed: {}", e),
    }

    // ── File permissions scan ──
    match scan_permissions() {
        Ok(mut findings) => all_findings.append(&mut findings),
        Err(e) => log::warn!("[Aegis] Permission scan failed: {}", e),
    }

    if run_type == "full" {
        // ── Software versions ──
        match scan_software_versions() {
            Ok(mut findings) => all_findings.append(&mut findings),
            Err(e) => log::warn!("[Aegis] Software version scan failed: {}", e),
        }

        // ── Cron job audit ──
        match scan_cron_jobs() {
            Ok(mut findings) => all_findings.append(&mut findings),
            Err(e) => log::warn!("[Aegis] Cron scan failed: {}", e),
        }

        // ── General security checks ──
        match scan_general() {
            Ok(mut findings) => all_findings.append(&mut findings),
            Err(e) => log::warn!("[Aegis] General scan failed: {}", e),
        }
    }

    // ── Persist findings ──
    let mut pass_count = 0i64;
    let mut warn_count = 0i64;
    let mut critical_count = 0i64;

    for f in &all_findings {
        let finding_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO aegis_findings (id, run_id, category, check_name, severity, title, description, recommendation, raw_data)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![
                finding_id,
                &run_id,
                &f.category,
                &f.check_name,
                &f.severity,
                &f.title,
                &f.description,
                &f.recommendation,
                f.raw_data.as_ref().map(|v| v.to_string()),
            ],
        )?;

        match f.severity.as_str() {
            "pass" => pass_count += 1,
            "warning" | "info" => warn_count += 1,
            "critical" => critical_count += 1,
            _ => {}
        }
    }

    let total = all_findings.len() as i64;
    let score = calculate_score(pass_count, warn_count, critical_count);

    // Update run record
    let now = crate::engine::db::EngineDb::now();
    conn.execute(
        "UPDATE aegis_audit_runs SET status = 'completed', overall_score = ?1, total_checks = ?2,
         pass_count = ?3, warn_count = ?4, critical_count = ?5, completed_at = ?6
         WHERE id = ?7",
        rusqlite::params![
            score,
            total,
            pass_count,
            warn_count,
            critical_count,
            now,
            &run_id
        ],
    )?;

    // Log to SIEM
    let severity = if critical_count > 0 {
        EventCategory::Critical
    } else if warn_count > 0 {
        EventCategory::Warning
    } else {
        EventCategory::Info
    };

    let _ = events::log_security_event(
        db,
        "aegis",
        None,
        EventType::Anomaly,
        severity,
        Some("aegis_audit"),
        Some(&format!("{} audit", run_type)),
        Some(&format!(
            "{{\"run_id\":\"{}\",\"score\":{},\"pass\":{},\"warn\":{},\"critical\":{}}}",
            run_id, score, pass_count, warn_count, critical_count
        )),
        if critical_count > 0 {
            80
        } else if warn_count > 0 {
            40
        } else {
            0
        },
        true,
    );

    log::info!(
        "[Aegis] Audit {} complete: score={}, pass={}, warn={}, critical={}",
        run_id,
        score,
        pass_count,
        warn_count,
        critical_count
    );

    Ok(run_id)
}

// ── Scanners ────────────────────────────────────────────────

fn scan_firewall() -> Result<Vec<FindingInput>> {
    let mut findings = Vec::new();

    // Check UFW status
    if let Ok(output) = Command::new("ufw").arg("status").output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if stdout.contains("Status: inactive") {
            findings.push(FindingInput {
                category: "firewall".into(),
                check_name: "ufw_status".into(),
                severity: "critical".into(),
                title: "UFW Firewall is Inactive".into(),
                description: "The Uncomplicated Firewall (UFW) is installed but not active. This leaves all network ports exposed.".into(),
                recommendation: Some("Enable UFW with: sudo ufw enable. Start with default deny incoming and allow outgoing.".into()),
                raw_data: Some(serde_json::json!({"status": "inactive", "output": stdout.to_string()})),
            });
        } else if stdout.contains("Status: active") {
            findings.push(FindingInput {
                category: "firewall".into(),
                check_name: "ufw_status".into(),
                severity: "pass".into(),
                title: "UFW Firewall is Active".into(),
                description: "UFW is active and filtering traffic.".into(),
                recommendation: None,
                raw_data: Some(serde_json::json!({"status": "active"})),
            });
        }
    } else {
        // Check iptables as fallback
        if let Ok(output) = Command::new("iptables").arg("-L").arg("-n").output() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let rules: Vec<&str> = stdout
                .lines()
                .filter(|l| {
                    !l.trim().is_empty() && !l.starts_with("Chain") && !l.starts_with("target")
                })
                .collect();
            if rules.is_empty() {
                findings.push(FindingInput {
                    category: "firewall".into(),
                    check_name: "iptables_rules".into(),
                    severity: "warning".into(),
                    title: "No iptables Rules Found".into(),
                    description:
                        "iptables has no active filtering rules. All traffic is allowed by default."
                            .into(),
                    recommendation: Some("Configure firewall rules or install/enable UFW.".into()),
                    raw_data: Some(serde_json::json!({"rule_count": 0})),
                });
            } else {
                findings.push(FindingInput {
                    category: "firewall".into(),
                    check_name: "iptables_rules".into(),
                    severity: "pass".into(),
                    title: format!("iptables Has {} Active Rules", rules.len()),
                    description: "iptables has filtering rules configured.".into(),
                    recommendation: None,
                    raw_data: Some(serde_json::json!({"rule_count": rules.len()})),
                });
            }
        } else {
            findings.push(FindingInput {
                category: "firewall".into(),
                check_name: "firewall_available".into(),
                severity: "info".into(),
                title: "No Firewall Tool Detected".into(),
                description: "Neither UFW nor iptables commands are available. This may be a containerized environment.".into(),
                recommendation: Some("If running on bare metal, install UFW: sudo apt install ufw".into()),
                raw_data: None,
            });
        }
    }

    // Check if firewalld is running
    if let Ok(output) = Command::new("systemctl")
        .args(["is-active", "firewalld"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if stdout == "active" {
            findings.push(FindingInput {
                category: "firewall".into(),
                check_name: "firewalld_status".into(),
                severity: "pass".into(),
                title: "firewalld is Running".into(),
                description: "firewalld daemon is active.".into(),
                recommendation: None,
                raw_data: Some(serde_json::json!({"status": "active"})),
            });
        }
    }

    Ok(findings)
}

fn scan_ports() -> Result<Vec<FindingInput>> {
    let mut findings = Vec::new();

    // Use ss to check listening ports
    let output = Command::new("ss").args(["-tlnp"]).output();

    let stdout = match output {
        Ok(o) => String::from_utf8_lossy(&o.stdout).to_string(),
        Err(_) => {
            // Fallback to netstat
            match Command::new("netstat").args(["-tlnp"]).output() {
                Ok(o) => String::from_utf8_lossy(&o.stdout).to_string(),
                Err(_) => {
                    findings.push(FindingInput {
                        category: "ports".into(),
                        check_name: "port_scan_tool".into(),
                        severity: "info".into(),
                        title: "No Port Scanning Tool Available".into(),
                        description: "Neither ss nor netstat found. Cannot scan listening ports."
                            .into(),
                        recommendation: Some(
                            "Install iproute2 (ss) or net-tools (netstat).".into(),
                        ),
                        raw_data: None,
                    });
                    return Ok(findings);
                }
            }
        }
    };

    let listening_lines: Vec<&str> = stdout.lines().filter(|l| l.contains("LISTEN")).collect();

    // Check for common risky ports
    let risky_ports: Vec<(&str, &str, &str)> = vec![
        ("23", "Telnet", "critical"),
        ("21", "FTP", "warning"),
        ("3306", "MySQL", "warning"),
        ("5432", "PostgreSQL", "warning"),
        ("6379", "Redis", "warning"),
        ("27017", "MongoDB", "warning"),
        ("11211", "Memcached", "warning"),
        ("2375", "Docker API (unencrypted)", "critical"),
        ("9200", "Elasticsearch", "warning"),
    ];

    for (port, service, severity) in &risky_ports {
        let port_pattern = format!(":{}", port);
        for line in &listening_lines {
            if line.contains(&port_pattern)
                && (line.contains("0.0.0.0") || line.contains("*") || line.contains("::"))
            {
                findings.push(FindingInput {
                    category: "ports".into(),
                    check_name: format!("port_{}", port),
                    severity: severity.to_string(),
                    title: format!("{} Listening on All Interfaces (port {})", service, port),
                    description: format!("{} is bound to all network interfaces, making it accessible from any network.", service),
                    recommendation: Some(format!("Bind {} to 127.0.0.1 if only local access is needed, or add firewall rules.", service)),
                    raw_data: Some(serde_json::json!({"port": port, "service": service, "line": line.trim()})),
                });
            }
        }
    }

    // Count total listening ports
    findings.push(FindingInput {
        category: "ports".into(),
        check_name: "listening_ports_summary".into(),
        severity: "info".into(),
        title: format!("{} Listening Ports Detected", listening_lines.len()),
        description: format!(
            "System has {} ports in LISTEN state.",
            listening_lines.len()
        ),
        recommendation: None,
        raw_data: Some(serde_json::json!({
            "count": listening_lines.len(),
            "ports": listening_lines.iter().map(|l| l.trim().to_string()).collect::<Vec<_>>(),
        })),
    });

    Ok(findings)
}

fn scan_ssh() -> Result<Vec<FindingInput>> {
    let mut findings = Vec::new();

    let sshd_config_paths = ["/etc/ssh/sshd_config", "/etc/sshd_config"];
    let mut config_content = String::new();
    let mut config_found = false;

    for path in &sshd_config_paths {
        if let Ok(content) = std::fs::read_to_string(path) {
            config_content = content;
            config_found = true;
            break;
        }
    }

    if !config_found {
        findings.push(FindingInput {
            category: "ssh".into(),
            check_name: "sshd_config".into(),
            severity: "info".into(),
            title: "SSH Server Not Configured".into(),
            description: "No sshd_config found. SSH server may not be installed.".into(),
            recommendation: None,
            raw_data: None,
        });
        return Ok(findings);
    }

    // Check root login
    let root_login = get_ssh_config_value(&config_content, "PermitRootLogin");
    match root_login.as_deref() {
        Some("yes") | Some("without-password") | Some("prohibit-password") => {
            let val = root_login.clone().unwrap_or_default();
            findings.push(FindingInput {
                category: "ssh".into(),
                check_name: "ssh_root_login".into(),
                severity: "warning".into(),
                title: "SSH Root Login Permitted".into(),
                description: format!(
                    "PermitRootLogin is set to '{}'. Direct root login increases attack surface.",
                    val
                ),
                recommendation: Some(
                    "Set PermitRootLogin to 'no' and use sudo from a regular account.".into(),
                ),
                raw_data: Some(serde_json::json!({"value": val})),
            });
        }
        Some("no") => {
            findings.push(FindingInput {
                category: "ssh".into(),
                check_name: "ssh_root_login".into(),
                severity: "pass".into(),
                title: "SSH Root Login Disabled".into(),
                description: "PermitRootLogin is set to 'no'.".into(),
                recommendation: None,
                raw_data: None,
            });
        }
        _ => {
            // Default is often 'prohibit-password' which is a warning
            findings.push(FindingInput {
                category: "ssh".into(),
                check_name: "ssh_root_login".into(),
                severity: "info".into(),
                title: "SSH Root Login Setting Not Explicit".into(),
                description: "PermitRootLogin is not explicitly set. Default behavior depends on SSH version.".into(),
                recommendation: Some("Explicitly set PermitRootLogin 'no' in /etc/ssh/sshd_config.".into()),
                raw_data: None,
            });
        }
    }

    // Check password authentication
    let pw_auth = get_ssh_config_value(&config_content, "PasswordAuthentication");
    match pw_auth.as_deref() {
        Some("yes") => {
            findings.push(FindingInput {
                category: "ssh".into(),
                check_name: "ssh_password_auth".into(),
                severity: "warning".into(),
                title: "SSH Password Authentication Enabled".into(),
                description: "PasswordAuthentication is set to 'yes'. This is vulnerable to brute-force attacks.".into(),
                recommendation: Some("Switch to key-based auth: set PasswordAuthentication 'no' and use SSH keys.".into()),
                raw_data: Some(serde_json::json!({"value": "yes"})),
            });
        }
        Some("no") => {
            findings.push(FindingInput {
                category: "ssh".into(),
                check_name: "ssh_password_auth".into(),
                severity: "pass".into(),
                title: "SSH Password Authentication Disabled".into(),
                description: "Key-based authentication is enforced.".into(),
                recommendation: None,
                raw_data: None,
            });
        }
        _ => {
            findings.push(FindingInput {
                category: "ssh".into(),
                check_name: "ssh_password_auth".into(),
                severity: "info".into(),
                title: "SSH Password Auth Setting Not Explicit".into(),
                description: "PasswordAuthentication is not explicitly set in sshd_config.".into(),
                recommendation: Some(
                    "Explicitly set PasswordAuthentication to 'no' for key-only auth.".into(),
                ),
                raw_data: None,
            });
        }
    }

    // Check port
    let port = get_ssh_config_value(&config_content, "Port");
    if port.as_deref() == Some("22") || port.is_none() {
        findings.push(FindingInput {
            category: "ssh".into(),
            check_name: "ssh_default_port".into(),
            severity: "info".into(),
            title: "SSH on Default Port 22".into(),
            description: "SSH is running on the default port 22, which receives the most automated attacks.".into(),
            recommendation: Some("Consider changing to a non-standard port to reduce log noise (does not improve real security).".into()),
            raw_data: None,
        });
    }

    // Check MaxAuthTries
    let max_auth = get_ssh_config_value(&config_content, "MaxAuthTries");
    if let Some(val) = &max_auth {
        if let Ok(n) = val.parse::<i64>() {
            if n > 6 {
                findings.push(FindingInput {
                    category: "ssh".into(),
                    check_name: "ssh_max_auth_tries".into(),
                    severity: "warning".into(),
                    title: format!("SSH MaxAuthTries Too High ({})", n),
                    description: "High MaxAuthTries gives attackers more guesses per connection."
                        .into(),
                    recommendation: Some("Set MaxAuthTries to 3-6.".into()),
                    raw_data: Some(serde_json::json!({"value": n})),
                });
            }
        }
    }

    // Check for authorized_keys permissions
    if let Ok(home) = std::env::var("HOME") {
        let ak_path = format!("{}/.ssh/authorized_keys", home);
        if let Ok(metadata) = std::fs::metadata(&ak_path) {
            use std::os::unix::fs::PermissionsExt;
            let mode = metadata.permissions().mode();
            if mode & 0o077 != 0 {
                findings.push(FindingInput {
                    category: "ssh".into(),
                    check_name: "ssh_authorized_keys_perms".into(),
                    severity: "warning".into(),
                    title: "authorized_keys Has Loose Permissions".into(),
                    description: format!(
                        "~/.ssh/authorized_keys has mode {:o} — group/other can read it.",
                        mode & 0o777
                    ),
                    recommendation: Some("chmod 600 ~/.ssh/authorized_keys".into()),
                    raw_data: Some(
                        serde_json::json!({"path": ak_path, "mode": format!("{:o}", mode & 0o777)}),
                    ),
                });
            } else {
                findings.push(FindingInput {
                    category: "ssh".into(),
                    check_name: "ssh_authorized_keys_perms".into(),
                    severity: "pass".into(),
                    title: "authorized_keys Permissions Correct".into(),
                    description: "authorized_keys has secure 600 permissions.".into(),
                    recommendation: None,
                    raw_data: None,
                });
            }
        }
    }

    Ok(findings)
}

fn scan_permissions() -> Result<Vec<FindingInput>> {
    let mut findings = Vec::new();

    // Check for world-writable files in sensitive locations
    let check_dirs: Vec<(&str, &str)> = vec![
        ("/etc", "System config"),
        ("/usr/bin", "System binaries"),
        ("/usr/local/bin", "Local binaries"),
    ];

    for (dir, label) in &check_dirs {
        if let Ok(output) = Command::new("find")
            .args([dir, "-maxdepth", "2", "-perm", "-0002", "-type", "f"])
            .output()
        {
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let files: Vec<&str> = stdout.lines().filter(|l| !l.trim().is_empty()).collect();

            if !files.is_empty() {
                findings.push(FindingInput {
                    category: "permissions".into(),
                    check_name: format!("world_writable_{}", dir.replace('/', "_")),
                    severity: "critical".into(),
                    title: format!("{} World-Writable Files in {}", files.len(), label),
                    description: format!("Found {} world-writable files in {}. Any user can modify these.", files.len(), dir),
                    recommendation: Some("Remove world-write permission: chmod o-w <file>. Investigate why they're writable.".into()),
                    raw_data: Some(serde_json::json!({"dir": dir, "files": files.iter().take(20).map(|f| f.to_string()).collect::<Vec<_>>(), "total": files.len()})),
                });
            } else {
                findings.push(FindingInput {
                    category: "permissions".into(),
                    check_name: format!("world_writable_{}", dir.replace('/', "_")),
                    severity: "pass".into(),
                    title: format!("No World-Writable Files in {}", label),
                    description: format!("{} has no world-writable files.", dir),
                    recommendation: None,
                    raw_data: None,
                });
            }
        }
    }

    // Check for SUID/SGID binaries
    if let Ok(output) = Command::new("find")
        .args(["/usr/bin", "/usr/sbin", "-perm", "/4000", "-type", "f"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let suid_files: Vec<&str> = stdout.lines().filter(|l| !l.trim().is_empty()).collect();

        let known_suid: Vec<&str> = vec![
            "/usr/bin/sudo",
            "/usr/bin/passwd",
            "/usr/bin/su",
            "/usr/bin/chsh",
            "/usr/bin/chfn",
            "/usr/bin/newgrp",
            "/usr/bin/gpasswd",
            "/usr/bin/mount",
            "/usr/bin/umount",
            "/usr/bin/pkexec",
            "/usr/bin/crontab",
        ];

        let unexpected: Vec<&&str> = suid_files
            .iter()
            .filter(|f| !known_suid.iter().any(|k| f.ends_with(k)))
            .collect();

        if !unexpected.is_empty() {
            findings.push(FindingInput {
                category: "permissions".into(),
                check_name: "suid_binaries".into(),
                severity: "warning".into(),
                title: format!("{} Unexpected SUID Binaries", unexpected.len()),
                description: format!("Found {} SUID binaries not in the known-safe list. SUID binaries run with owner privileges and are common attack targets.", unexpected.len()),
                recommendation: Some("Review each SUID binary. Remove SUID bit with chmod u-s if not needed.".into()),
                raw_data: Some(serde_json::json!({
                    "total_suid": suid_files.len(),
                    "unexpected": unexpected.iter().take(20).map(|f| f.to_string()).collect::<Vec<_>>(),
                })),
            });
        }

        findings.push(FindingInput {
            category: "permissions".into(),
            check_name: "suid_binaries_summary".into(),
            severity: "info".into(),
            title: format!("{} Total SUID Binaries", suid_files.len()),
            description: format!("System has {} SUID binaries.", suid_files.len()),
            recommendation: None,
            raw_data: Some(serde_json::json!({"count": suid_files.len()})),
        });
    }

    // Check /tmp permissions
    if let Ok(metadata) = std::fs::metadata("/tmp") {
        use std::os::unix::fs::PermissionsExt;
        let mode = metadata.permissions().mode();
        if mode & 0o1000 == 0 {
            findings.push(FindingInput {
                category: "permissions".into(),
                check_name: "tmp_sticky_bit".into(),
                severity: "warning".into(),
                title: "/tmp Missing Sticky Bit".into(),
                description: format!("/tmp has mode {:o} — the sticky bit (1000) is not set. Users can delete each other's files.", mode & 0o777),
                recommendation: Some("chmod +t /tmp".into()),
                raw_data: Some(serde_json::json!({"mode": format!("{:o}", mode & 0o777)})),
            });
        } else {
            findings.push(FindingInput {
                category: "permissions".into(),
                check_name: "tmp_sticky_bit".into(),
                severity: "pass".into(),
                title: "/tmp Has Sticky Bit".into(),
                description: "/tmp has the sticky bit set correctly.".into(),
                recommendation: None,
                raw_data: None,
            });
        }
    }

    Ok(findings)
}

fn scan_software_versions() -> Result<Vec<FindingInput>> {
    let mut findings = Vec::new();

    // Check for available security updates (apt-based systems)
    if let Ok(output) = Command::new("apt")
        .args(["list", "--upgradable"])
        .env("LANG", "C")
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let upgrades: Vec<&str> = stdout
            .lines()
            .filter(|l| l.contains('/') && !l.starts_with("Listing"))
            .collect();

        if !upgrades.is_empty() {
            findings.push(FindingInput {
                category: "software".into(),
                check_name: "apt_upgrades_available".into(),
                severity: "warning".into(),
                title: format!("{} Package Updates Available", upgrades.len()),
                description: format!("{} packages have pending upgrades. Unpatched software is a common attack vector.", upgrades.len()),
                recommendation: Some("Run: sudo apt update && sudo apt upgrade".into()),
                raw_data: Some(serde_json::json!({
                    "count": upgrades.len(),
                    "packages": upgrades.iter().take(30).map(|l| l.trim().to_string()).collect::<Vec<_>>(),
                })),
            });
        } else {
            findings.push(FindingInput {
                category: "software".into(),
                check_name: "apt_upgrades_available".into(),
                severity: "pass".into(),
                title: "System Packages Up to Date".into(),
                description: "No pending package upgrades.".into(),
                recommendation: None,
                raw_data: None,
            });
        }
    }

    // Check key software versions
    let check_bins: Vec<(&str, &str)> = vec![
        ("openssl", "OpenSSL"),
        ("bash", "Bash"),
        ("ssh", "OpenSSH"),
        ("python3", "Python"),
        ("node", "Node.js"),
        ("docker", "Docker"),
        ("git", "Git"),
    ];

    for (bin, label) in &check_bins {
        if let Ok(output) = Command::new(bin).arg("--version").output() {
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let version_line = stdout.lines().next().unwrap_or("").to_string();
            findings.push(FindingInput {
                category: "software".into(),
                check_name: format!("version_{}", bin),
                severity: "info".into(),
                title: format!("{} Version", label),
                description: version_line.clone(),
                recommendation: None,
                raw_data: Some(serde_json::json!({"binary": bin, "version": version_line})),
            });
        }
    }

    Ok(findings)
}

fn scan_cron_jobs() -> Result<Vec<FindingInput>> {
    let mut findings = Vec::new();

    // Check current user's crontab
    if let Ok(output) = Command::new("crontab").arg("-l").output() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !stdout.is_empty() && !stdout.contains("no crontab") {
            let lines: Vec<&str> = stdout
                .lines()
                .filter(|l| !l.trim().is_empty() && !l.starts_with('#'))
                .collect();

            // Check for suspicious patterns
            for line in &lines {
                let lower = line.to_lowercase();
                if lower.contains("curl") || lower.contains("wget") {
                    findings.push(FindingInput {
                        category: "cron".into(),
                        check_name: "cron_download_command".into(),
                        severity: "warning".into(),
                        title: "Cron Job Contains Download Command".into(),
                        description: format!("Cron entry uses curl/wget: {}", line.trim()),
                        recommendation: Some("Verify this downloads from a trusted source. Could be used for persistence.".into()),
                        raw_data: Some(serde_json::json!({"line": line.trim()})),
                    });
                }
                if lower.contains("nc ") || lower.contains("ncat") || lower.contains("socat") {
                    findings.push(FindingInput {
                        category: "cron".into(),
                        check_name: "cron_network_tool".into(),
                        severity: "critical".into(),
                        title: "Cron Job Uses Network Tool".into(),
                        description: format!("Cron entry uses netcat/socat: {}", line.trim()),
                        recommendation: Some("Investigate immediately. Network tools in cron can indicate a reverse shell.".into()),
                        raw_data: Some(serde_json::json!({"line": line.trim()})),
                    });
                }
            }

            findings.push(FindingInput {
                category: "cron".into(),
                check_name: "cron_user_jobs".into(),
                severity: "info".into(),
                title: format!("{} User Cron Jobs", lines.len()),
                description: format!("Current user has {} active cron job entries.", lines.len()),
                recommendation: None,
                raw_data: Some(serde_json::json!({"count": lines.len(), "jobs": lines.iter().take(10).map(|l| l.to_string()).collect::<Vec<_>>()})),
            });
        }
    }

    // Check /etc/cron.d for system cron jobs
    if let Ok(output) = Command::new("ls").args(["-la", "/etc/cron.d/"]).output() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let entries: Vec<&str> = stdout
            .lines()
            .filter(|l| !l.contains("total") && !l.trim().is_empty())
            .collect();

        findings.push(FindingInput {
            category: "cron".into(),
            check_name: "cron_system_jobs".into(),
            severity: "info".into(),
            title: format!("{} System Cron Directories", entries.len()),
            description: format!("/etc/cron.d/ has {} entries.", entries.len()),
            recommendation: None,
            raw_data: Some(serde_json::json!({"entries": entries.iter().take(10).map(|l| l.to_string()).collect::<Vec<_>>()})),
        });
    }

    Ok(findings)
}

fn scan_general() -> Result<Vec<FindingInput>> {
    let mut findings = Vec::new();

    // Check if running as root
    if let Ok(output) = Command::new("id").arg("-u").output() {
        let uid = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if uid == "0" {
            findings.push(FindingInput {
                category: "general".into(),
                check_name: "running_as_root".into(),
                severity: "warning".into(),
                title: "Running as Root".into(),
                description: "This application is running with root privileges (UID 0). Any vulnerability gives full system access.".into(),
                recommendation: Some("Run as a dedicated non-root user with minimal privileges.".into()),
                raw_data: Some(serde_json::json!({"uid": 0})),
            });
        } else {
            findings.push(FindingInput {
                category: "general".into(),
                check_name: "running_as_root".into(),
                severity: "pass".into(),
                title: "Not Running as Root".into(),
                description: format!("Running as UID {} (non-root).", uid),
                recommendation: None,
                raw_data: Some(serde_json::json!({"uid": uid})),
            });
        }
    }

    // Check for kernel security features
    if let Ok(output) = Command::new("cat")
        .arg("/proc/sys/kernel/randomize_va_space")
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        match stdout.as_str() {
            "2" => {
                findings.push(FindingInput {
                    category: "general".into(),
                    check_name: "aslr_enabled".into(),
                    severity: "pass".into(),
                    title: "ASLR Fully Enabled".into(),
                    description: "Address Space Layout Randomization is set to full (2).".into(),
                    recommendation: None,
                    raw_data: Some(serde_json::json!({"value": 2})),
                });
            }
            "0" => {
                findings.push(FindingInput {
                    category: "general".into(),
                    check_name: "aslr_enabled".into(),
                    severity: "critical".into(),
                    title: "ASLR Disabled".into(),
                    description: "Address Space Layout Randomization is disabled. This makes exploitation of memory bugs trivial.".into(),
                    recommendation: Some("Enable ASLR: echo 2 | sudo tee /proc/sys/kernel/randomize_va_space".into()),
                    raw_data: Some(serde_json::json!({"value": 0})),
                });
            }
            _ => {
                findings.push(FindingInput {
                    category: "general".into(),
                    check_name: "aslr_enabled".into(),
                    severity: "warning".into(),
                    title: format!("ASLR Partially Enabled ({})", stdout),
                    description: "ASLR is not set to full randomization.".into(),
                    recommendation: Some("Set kernel.randomize_va_space = 2".into()),
                    raw_data: Some(serde_json::json!({"value": stdout})),
                });
            }
        }
    }

    // Check for automatic updates
    if let Ok(output) = Command::new("systemctl")
        .args(["is-enabled", "unattended-upgrades"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if stdout == "enabled" {
            findings.push(FindingInput {
                category: "general".into(),
                check_name: "auto_updates".into(),
                severity: "pass".into(),
                title: "Automatic Updates Enabled".into(),
                description: "unattended-upgrades service is enabled.".into(),
                recommendation: None,
                raw_data: None,
            });
        } else {
            findings.push(FindingInput {
                category: "general".into(),
                check_name: "auto_updates".into(),
                severity: "info".into(),
                title: "Automatic Updates Not Enabled".into(),
                description: "unattended-upgrades service is not enabled. Security patches require manual installation.".into(),
                recommendation: Some("Enable with: sudo dpkg-reconfigure -plow unattended-upgrades".into()),
                raw_data: None,
            });
        }
    }

    Ok(findings)
}

// ── Helpers ─────────────────────────────────────────────────

/// Extract a config value from sshd_config content.
fn get_ssh_config_value(config: &str, key: &str) -> Option<String> {
    for line in config.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with('#') {
            continue;
        }
        let parts: Vec<&str> = trimmed.splitn(2, |c: char| c == ' ' || c == '\t').collect();
        if parts.len() == 2 && parts[0].eq_ignore_ascii_case(key) {
            return Some(parts[1].trim().to_string());
        }
    }
    None
}

/// Calculate security score (0-100).
fn calculate_score(pass: i64, warn: i64, critical: i64) -> i64 {
    let total = pass + warn + critical;
    if total == 0 {
        return 100;
    }
    // Start at 100, deduct for issues
    let score = 100 - (warn * 5) - (critical * 20);
    score.max(0).min(100)
}
