// Conflux Engine — Remediation Engine
// Mission 1224 Phase 7: "Fix It" actions for Aegis and Viper findings
//
// Provides auto-remediation for security findings:
// - Maps finding check_name → remediation command
// - Executes with user confirmation
// - Logs all actions to remediation_log
// - Supports undo for reversible fixes
// - Dry-run mode to preview without executing

use anyhow::Result;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::engine::db::EngineDb;

// ── Types ────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemediationAction {
    pub id: String,
    pub finding_id: String,
    pub finding_source: String, // 'aegis' or 'viper'
    pub action_type: String,
    pub command_executed: String,
    pub stdout: Option<String>,
    pub stderr: Option<String>,
    pub exit_code: Option<i64>,
    pub success: bool,
    pub undo_command: Option<String>,
    pub undone: bool,
    pub executed_by: String,
    pub created_at: String,
}

/// Describes what a remediation will do before executing it.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemediationPreview {
    pub finding_id: String,
    pub action_type: String,
    pub description: String,
    pub command: String,
    pub undo_command: Option<String>,
    pub risk_level: String, // 'low', 'medium', 'high'
    pub requires_root: bool,
}

// ── Remediation Map ──────────────────────────────────────────
// Maps (check_name) → (action_type, description, command, undo_command, risk, requires_root)

struct FixDef {
    action_type: &'static str,
    description: &'static str,
    command: &'static str,
    undo_command: Option<&'static str>,
    risk_level: &'static str,
    requires_root: bool,
}

fn get_fix_for_aegis(check_name: &str) -> Option<FixDef> {
    match check_name {
        "firewall_status" | "firewall_enabled" | "ufw_active" => Some(FixDef {
            action_type: "firewall_enable",
            description: "Enable the system firewall (UFW) to block unauthorized connections",
            command: "ufw --force enable",
            undo_command: Some("ufw disable"),
            risk_level: "medium",
            requires_root: true,
        }),
        "ssh_root_login" | "permit_root_login" => Some(FixDef {
            action_type: "ssh_disable_root",
            description: "Disable SSH root login to prevent direct remote root access",
            command: "sed -i 's/^#\\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config && systemctl restart sshd",
            undo_command: Some("sed -i 's/^PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config && systemctl restart sshd"),
            risk_level: "medium",
            requires_root: true,
        }),
        "ssh_password_auth" | "password_authentication" => Some(FixDef {
            action_type: "ssh_key_only",
            description: "Enforce SSH key-only authentication (disable password login)",
            command: "sed -i 's/^#\\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config && systemctl restart sshd",
            undo_command: Some("sed -i 's/^PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config && systemctl restart sshd"),
            risk_level: "high",
            requires_root: true,
        }),
        "world_writable" | "world_writable_etc" => Some(FixDef {
            action_type: "permission_fix",
            description: "Remove world-writable permission from files in /etc",
            command: "find /etc -maxdepth 2 -type f -perm -o+w -exec chmod o-w {} \\;",
            undo_command: None, // Can't reliably undo
            risk_level: "low",
            requires_root: true,
        }),
        "auto_updates" | "unattended_upgrades" => Some(FixDef {
            action_type: "enable_auto_updates",
            description: "Enable automatic security updates via unattended-upgrades",
            command: "dpkg-reconfigure -plow unattended-upgrades",
            undo_command: None,
            risk_level: "low",
            requires_root: true,
        }),
        "core_dumps" | "core_dump_enabled" => Some(FixDef {
            action_type: "disable_core_dumps",
            description: "Disable core dumps to prevent sensitive data leakage",
            command: "echo '* hard core 0' >> /etc/security/limits.conf",
            undo_command: Some("sed -i '/^\\* hard core 0$/d' /etc/security/limits.conf"),
            risk_level: "low",
            requires_root: true,
        }),
        "suid_audit" | "unexpected_suid" => Some(FixDef {
            action_type: "suid_review",
            description: "Review and remove unnecessary SUID/SGID bits from binaries",
            command: "find / -type f \\( -perm -4000 -o -perm -2000 \\) -exec ls -la {} \\; 2>/dev/null",
            undo_command: None,
            risk_level: "low",
            requires_root: false,
        }),
        _ => None,
    }
}

fn get_fix_for_viper(check_name: &str) -> Option<FixDef> {
    match check_name {
        "shadow_perms" | "shadow_readable" => Some(FixDef {
            action_type: "shadow_permissions",
            description: "Fix /etc/shadow file permissions to prevent unauthorized reads",
            command: "chmod 640 /etc/shadow && chown root:shadow /etc/shadow",
            undo_command: None,
            risk_level: "medium",
            requires_root: true,
        }),
        "git_exposed" | "exposed_git" => Some(FixDef {
            action_type: "git_restrict",
            description: "Restrict access to exposed .git directories",
            command: "find /home /var/www -name '.git' -type d -exec chmod 700 {} \\; 2>/dev/null",
            undo_command: None,
            risk_level: "low",
            requires_root: true,
        }),
        "no_password" | "empty_password" => Some(FixDef {
            action_type: "lock_empty_password",
            description: "Lock accounts with empty passwords",
            command: "awk -F: '($2 == \"\") {print $1}' /etc/shadow | xargs -I{} passwd -l {}",
            undo_command: None,
            risk_level: "high",
            requires_root: true,
        }),
        "weak_ssh_key" | "ssh_rsa1024" | "ssh_dsa" => Some(FixDef {
            action_type: "ssh_key_upgrade",
            description: "Generate a strong Ed25519 SSH key pair (does not replace existing)",
            command: "ssh-keygen -t ed25519 -C 'conflux-security-upgrade' -f ~/.ssh/id_ed25519_conflux -N ''",
            undo_command: None,
            risk_level: "low",
            requires_root: false,
        }),
        "ip_forwarding" | "ip_forward_enabled" => Some(FixDef {
            action_type: "disable_ip_forward",
            description: "Disable IP forwarding to prevent the machine from acting as a router",
            command: "sysctl -w net.ipv4.ip_forward=0 && sed -i 's/^net.ipv4.ip_forward=.*/net.ipv4.ip_forward=0/' /etc/sysctl.conf",
            undo_command: Some("sysctl -w net.ipv4.ip_forward=1"),
            risk_level: "medium",
            requires_root: true,
        }),
        "promiscuous_mode" => Some(FixDef {
            action_type: "disable_promiscuous",
            description: "Disable promiscuous mode on network interfaces",
            command: "ip link | grep PROMISC | awk '{print $2}' | tr -d ':' | xargs -I{} ip link set {} promisc off",
            undo_command: None,
            risk_level: "low",
            requires_root: true,
        }),
        _ => None,
    }
}

/// Get a remediation preview for a finding.
pub async fn dry_run(
    db: &EngineDb,
    finding_id: &str,
    source: &str,
) -> Result<Option<RemediationPreview>> {
    let conn = db.conn_async().await;

    // Look up the finding's check_name
    let check_name: Option<String> = if source == "aegis" {
        conn.query_row(
            "SELECT check_name FROM aegis_findings WHERE id = ?",
            rusqlite::params![finding_id],
            |row| row.get(0),
        ).ok()
    } else {
        conn.query_row(
            "SELECT check_name FROM viper_findings WHERE id = ?",
            rusqlite::params![finding_id],
            |row| row.get(0),
        ).ok()
    };

    let check_name = match check_name {
        Some(c) => c,
        None => return Ok(None),
    };

    let fix = if source == "aegis" {
        get_fix_for_aegis(&check_name)
    } else {
        get_fix_for_viper(&check_name)
    };

    match fix {
        Some(f) => Ok(Some(RemediationPreview {
            finding_id: finding_id.to_string(),
            action_type: f.action_type.to_string(),
            description: f.description.to_string(),
            command: f.command.to_string(),
            undo_command: f.undo_command.map(|s| s.to_string()),
            risk_level: f.risk_level.to_string(),
            requires_root: f.requires_root,
        })),
        None => Ok(None),
    }
}

/// Execute a remediation for a finding. Returns the remediation log entry.
pub async fn execute(
    db: &EngineDb,
    finding_id: &str,
    source: &str,
) -> Result<RemediationAction> {
    let preview = dry_run(db, finding_id, source).await?
        .ok_or_else(|| anyhow::anyhow!("No remediation available for this finding"))?;

    let id = Uuid::new_v4().to_string();

    // Execute the command
    let output = std::process::Command::new("sh")
        .arg("-c")
        .arg(&preview.command)
        .output()?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let exit_code = output.status.code().unwrap_or(-1);
    let success = output.status.success();

    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

    let action = RemediationAction {
        id: id.clone(),
        finding_id: finding_id.to_string(),
        finding_source: source.to_string(),
        action_type: preview.action_type.clone(),
        command_executed: preview.command.clone(),
        stdout: if stdout.is_empty() { None } else { Some(stdout) },
        stderr: if stderr.is_empty() { None } else { Some(stderr) },
        exit_code: Some(exit_code as i64),
        success,
        undo_command: preview.undo_command.clone(),
        undone: false,
        executed_by: "user".to_string(),
        created_at: now,
    };

    // Log to database
    let conn = db.conn_async().await;
    conn.execute(
        "INSERT INTO remediation_log (id, finding_id, finding_source, action_type, command_executed, stdout, stderr, exit_code, success, undo_command, undone, executed_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'user')",
        rusqlite::params![
            id,
            finding_id,
            source,
            action.action_type,
            action.command_executed,
            action.stdout,
            action.stderr,
            action.exit_code,
            if action.success { 1 } else { 0 },
            action.undo_command,
        ],
    )?;

    // Log to security events
    let _ = super::events::log_security_event(
        db,
        "remediation",
        None,
        super::events::EventType::SecurityAudit,
        if success { super::events::EventCategory::Info } else { super::events::EventCategory::Warning },
        Some("remediation_engine"),
        Some(finding_id),
        Some(&format!("{}: {} (exit {})", preview.action_type, if success { "success" } else { "failed" }, exit_code)),
        if success { 10 } else { 50 },
        true,
    ).await;

    Ok(action)
}

/// Undo a previously executed remediation.
pub async fn undo(db: &EngineDb, remediation_id: &str) -> Result<bool> {
    let conn = db.conn_async().await;

    // Get the remediation record
    let (undo_cmd, success, already_undone): (Option<String>, i64, i64) = conn.query_row(
        "SELECT undo_command, success, undone FROM remediation_log WHERE id = ?",
        rusqlite::params![remediation_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    )?;

    if already_undone != 0 {
        return Err(anyhow::anyhow!("Remediation has already been undone"));
    }

    if success == 0 {
        return Err(anyhow::anyhow!("Cannot undo a failed remediation"));
    }

    let undo_cmd = undo_cmd
        .ok_or_else(|| anyhow::anyhow!("No undo command available for this remediation"))?;

    // Execute the undo command
    let output = std::process::Command::new("sh")
        .arg("-c")
        .arg(&undo_cmd)
        .output()?;

    let undo_success = output.status.success();

    if undo_success {
        conn.execute(
            "UPDATE remediation_log SET undone = 1 WHERE id = ?",
            rusqlite::params![remediation_id],
        )?;
    }

    Ok(undo_success)
}

/// Get remediation log entries.
pub async fn get_log(db: &EngineDb, limit: i64) -> Result<Vec<RemediationAction>> {
    let conn = db.conn_async().await;
    let mut stmt = conn.prepare(
        "SELECT id, finding_id, finding_source, action_type, command_executed, stdout, stderr, exit_code, success, undo_command, undone, executed_by, created_at
         FROM remediation_log ORDER BY created_at DESC LIMIT ?"
    )?;
    let actions = stmt.query_map(rusqlite::params![limit], |row| {
        Ok(RemediationAction {
            id: row.get(0)?,
            finding_id: row.get(1)?,
            finding_source: row.get(2)?,
            action_type: row.get(3)?,
            command_executed: row.get(4)?,
            stdout: row.get(5)?,
            stderr: row.get(6)?,
            exit_code: row.get(7)?,
            success: row.get::<_, i64>(8)? != 0,
            undo_command: row.get(9)?,
            undone: row.get::<_, i64>(10)? != 0,
            executed_by: row.get(11)?,
            created_at: row.get(12)?,
        })
    })?;

    Ok(actions.filter_map(|r| r.ok()).collect())
}

/// Check if a finding has a known remediation available.
pub fn has_fix(check_name: &str, source: &str) -> bool {
    if source == "aegis" {
        get_fix_for_aegis(check_name).is_some()
    } else {
        get_fix_for_viper(check_name).is_some()
    }
}
