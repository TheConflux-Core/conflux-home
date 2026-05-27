# Master Security Build Spec — Conflux Home

**Mission ID:** mission-1224  
**Product:** Conflux Home (product-1223)  
**Created:** 2026-05-25  
**Status:** Phases 1–10 Complete ✅  
**Last Updated:** 2026-05-25  

---

## Vision

**Conflux Security is not antivirus. It's a Security Operations Center (SOC) in a box, staffed by AI agents that think.**

Traditional security software protects against *known threats* with signature databases. It's reactive, ugly, and people hate it. We have AI agents that already live on the machine, have context, know what's normal, and can reason about what's suspicious. That's not a virus scanner — that's a security team.

**Category Positioning:** "Desktop Agent Security" — $3.6B enterprise market, $0 consumer. We are first mover. Enterprise vendors are 12-18 months from going downmarket.

**Pricing:** $19.99–29.99/month premium add-on to Conflux Home Pro. 91%+ blended margins.

---

## The Cyber Agents

| Agent | Role | Identity | Color |
|-------|------|----------|-------|
| **Aegis** | Blue Team Guardian | Passive defense — system hardening, config auditing, best practices | Emerald (#22c55e) |
| **Viper** | Red Team Operator | Offensive testing — vuln scanning, attack simulation, code review | Crimson (#ef4444) |
| **Watchtower** | The Eye | 24/7 continuous monitoring — process, file, network, behavioral baselines | Electric Blue (#3b82f6) |
| **Sentinel** | The Enforcer | Active response — auto-remediation, quarantine, kill switches, blocking | Gold (#f59e0b) |

---

## Completed Phases (✅ SHIPPED)

### Phase 1: Permission Gates + SIEM Foundation
**Status:** ✅ Complete (2026-04-14)

- Per-agent sandbox profiles (file/network/exec modes: open/allowlist/prompt_all/deny)
- Permission rules engine (allow/deny/prompt per resource)
- Permission prompt UI (toast notifications + Pending tab)
- Rate limits per agent (file_reads/min, file_writes/min, exec/min, network/min)
- Security event logging pipeline (every tool call → security_events table)
- Security settings UI (profiles, rules, anomaly rules)

**Key files:**
- `src-tauri/src/engine/security/permissions.rs`
- `src-tauri/src/engine/security/events.rs`
- `src/components/settings/SecuritySettings.tsx`
- `src/gateway-client/security.ts`

### Phase 2: Aegis — System Audit (Blue Team)
**Status:** ✅ Complete (2026-04-14)

7 scanner categories producing structured findings with severity, description, and hardening recommendations:

| Scanner | Checks |
|---------|--------|
| Firewall | iptables/ufw/nftables rules, default policies, logging |
| Open Ports | Listening services, unexpected ports, binding analysis |
| SSH | Root login, password auth, key-only, crypto strength, agent forwarding |
| File Permissions | World-writable dirs, SUID binaries, /etc perms, home dir |
| Software Updates | Outdated packages, kernel versions, security patches |
| Cron Jobs | Suspicious entries, root crons, writable scripts, PATH manipulation |
| General | Kernel hardening (ASLR, kptr_restrict), core dumps, UID0 accounts |

- 0–100 security score computed from pass/warn/critical counts
- All results persisted to SQLite (aegis_audit_runs + aegis_findings)
- Full UI: score card, category breakdowns, expandable findings, audit history

**Key files:**
- `src-tauri/src/engine/security/aegis.rs` (~1,050 lines)
- `src/components/AegisDashboard.tsx`

### Phase 3: Viper — Vulnerability Scanner (Red Team)
**Status:** ✅ Complete (2026-04-14)

6 scanner categories:

| Scanner | Checks |
|---------|--------|
| System Misconfig | Shadow perms, weak SSH crypto, auto-updates, SUID audit, kernel pointer leaks |
| Network Exposure | Exposed services, promiscuous mode, suspicious /etc/hosts, IP forwarding, mDNS |
| Browser Security | Firefox/Chrome saved passwords, extension count audit |
| Password Safety | No-password accounts, hash reuse detection, aging policies |
| Secrets & Config | Plaintext secrets in .env/.aws/.npmrc, exposed .git dirs, Docker config, private key perms |
| General Hardening | Security updates, core dumps, UID 0 accounts, unowned files, writable systemd services |

- 0–100 risk score (higher = more vulnerable)
- Results with remediation advice + CVE IDs
- Full UI: risk score card, category breakdowns, findings with remediation

**Key files:**
- `src-tauri/src/engine/security/viper.rs` (~1,200 lines)
- `src/components/ViperDashboard.tsx` (or inline in SecurityDashboard.tsx)

### Phase 4: Agent-vs-Agent Security
**Status:** ✅ Complete (2026-04-14)

14 attack templates across 5 categories:

| Category | Attacks |
|----------|---------|
| Prompt Injection (3) | system_override_direct, role_switch, hidden_instruction |
| Data Exfiltration (3) | env_dump, file_read_escalation, conversation_leak |
| Privilege Escalation (2) | sudo_request, permission_escalation |
| Instruction Override (2) | developer_mode, system_prompt_leak |
| Social Engineering (3) | urgency_authority, sympathy_exploit, fake_test |

- Sends crafted prompts through router::chat with target agent's system prompt
- Response analysis: breach indicators, partial indicators, refusal detection
- Defense scoring: 0–100 per agent (blocked=100%, partial=50%, breach=0%)
- Full UI: defense score ring, per-agent cards, attack findings with prompts/responses

**Key files:**
- `src-tauri/src/engine/security/agent_audit.rs` (~900 lines)
- `src/components/AgentAuditDashboard.tsx` (~700 lines)

### Phase 5: SIEM — Correlation & Alerting
**Status:** ✅ Complete (2026-04-14)

5 correlation rules:
1. Agent breach + system vulnerability → critical cross-source detection
2. Repeated permission denials (3+/hour same agent) → suspicious pattern
3. Critical vuln + anomalous behavior → active exploitation indicators
4. Defense degradation across audit runs → declining posture
5. Multi-agent risk (2+ agents with defense <50) → systemic vulnerability

- Aggregate risk scoring (Aegis + Viper + Agent Defense + alerts + critical events)
- Trend detection (current vs. previous week)
- Alert lifecycle: active → acknowledged → resolved → dismissed
- Weekly report generation with narrative summary
- Risk timeline: 30-day daily aggregates

**Key files:**
- `src-tauri/src/engine/security/siem.rs` (~1,000 lines)
- `src/components/SIEMDashboard.tsx` (~550 lines)
- `src/components/SecurityDashboard.tsx` (~1,500 lines — unified hub)

---

## Pending Phases

### Phase 6: Watchtower — Continuous Monitoring 🎯 NEXT
**Priority:** HIGHEST — Foundation for everything else  
**Estimated:** 2–3 sessions  
**Why first:** Everything downstream (auto-remediation, quarantine, behavioral baselines) needs a real-time data stream. Without Watchtower, security is a snapshot. With it, security is a movie.

#### 6.1 — File System Watcher (Backend)
Add `notify` crate to Cargo.toml for cross-platform filesystem events.

**Rust module:** `src-tauri/src/engine/security/watchtower.rs`

```
Capabilities:
- Watch configurable directories (home, /etc, startup dirs, Downloads)
- Detect: file creation, modification, deletion, permission changes, ownership changes
- Baseline hashing: SHA-256 of watched files on first scan, detect changes
- Event classification: info (new file), warning (modified system file), critical (deleted critical file)
- Configurable ignore patterns (.cache, node_modules, .git)
- Rate limiting: batch events to avoid flood on bulk operations (e.g., npm install)
```

**DB tables:**
```sql
CREATE TABLE watchtower_baselines (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL UNIQUE,
    file_hash TEXT NOT NULL,
    file_size INTEGER,
    file_mode INTEGER,
    owner_uid INTEGER,
    first_seen TEXT NOT NULL DEFAULT (datetime('now')),
    last_checked TEXT NOT NULL DEFAULT (datetime('now')),
    is_critical INTEGER NOT NULL DEFAULT 0  -- system files, configs
);

CREATE TABLE watchtower_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,  -- created, modified, deleted, permission_change, ownership_change
    file_path TEXT NOT NULL,
    old_hash TEXT,
    new_hash TEXT,
    severity TEXT NOT NULL DEFAULT 'info',
    description TEXT,
    was_expected INTEGER NOT NULL DEFAULT 0,  -- linked to known install/update
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_watchtower_events_time ON watchtower_events(created_at DESC);
CREATE INDEX idx_watchtower_events_severity ON watchtower_events(severity);
```

**Tauri commands:**
- `watchtower_start` — Start filesystem monitoring (background task)
- `watchtower_stop` — Stop monitoring
- `watchtower_status` — Is it running? What dirs? How many events?
- `watchtower_get_events` — Paginated event feed with filters
- `watchtower_get_baselines` — Current file baselines
- `watchtower_rescan` — Full baseline rebuild
- `watchtower_add_watch(path)` — Add a custom watch path
- `watchtower_remove_watch(path)` — Remove a watch path

#### 6.2 — Process Monitor (Backend)
**Rust module:** Extension to `watchtower.rs`

```
Capabilities:
- Periodic process snapshot (every 30s) via /proc (Linux) or sysinfo crate
- Detect: new processes, terminated processes, parent-child changes
- Suspicious indicators: unsigned binaries, running from /tmp, hidden dirs, high CPU
- Baseline: learn normal process tree on first run
- Alert on: processes not in baseline, unexpected parent chains, crypto miners, reverse shells
```

**DB table:**
```sql
CREATE TABLE watchtower_processes (
    id TEXT PRIMARY KEY,
    pid INTEGER NOT NULL,
    ppid INTEGER,
    name TEXT NOT NULL,
    exe_path TEXT,
    cmdline TEXT,
    user_name TEXT,
    cpu_percent REAL,
    memory_mb REAL,
    first_seen TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen TEXT NOT NULL DEFAULT (datetime('now')),
    is_baseline INTEGER NOT NULL DEFAULT 0,
    is_suspicious INTEGER NOT NULL DEFAULT 0,
    suspicion_reason TEXT
);
```

**Tauri commands:**
- `watchtower_get_processes` — Current process list with risk flags
- `watchtower_get_process_tree` — Parent-child hierarchy
- `watchtower_kill_process(pid)` — Kill a suspicious process (with confirmation prompt)

#### 6.3 — Network Connection Monitor (Backend)
```
Capabilities:
- Periodic netstat snapshot (every 30s)
- Detect: new connections, closed connections, listening ports change
- GeoIP lookup for remote IPs (lightweight local DB or free API)
- Suspicious indicators: connections to known-bad IPs, unusual ports, data exfil patterns
- Baseline: learn normal connections on first run
- Track: bytes sent/received per connection (if available)
```

**DB table:**
```sql
CREATE TABLE watchtower_connections (
    id TEXT PRIMARY KEY,
    local_addr TEXT NOT NULL,
    local_port INTEGER NOT NULL,
    remote_addr TEXT,
    remote_port INTEGER,
    protocol TEXT NOT NULL,
    pid INTEGER,
    process_name TEXT,
    country TEXT,
    is_baseline INTEGER NOT NULL DEFAULT 0,
    is_suspicious INTEGER NOT NULL DEFAULT 0,
    suspicion_reason TEXT,
    first_seen TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen TEXT NOT NULL DEFAULT (datetime('now')),
    bytes_sent INTEGER DEFAULT 0,
    bytes_recv INTEGER DEFAULT 0
);
```

**Tauri commands:**
- `watchtower_get_connections` — Current connections with risk flags
- `watchtower_get_network_map` — Visualization data (local → remote graph)
- `watchtower_block_connection(remote_addr)` — Firewall rule injection (requires Sentinel Phase 8)

#### 6.4 — Watchtower Dashboard (Frontend)
**Component:** `src/components/WatchtowerDashboard.tsx` (or integrated into SecurityDashboard Watchtower tab)

**Hero section:**
- Live status indicator (green pulse = monitoring, red = stopped)
- Event counter (last 24h): files changed, new processes, new connections
- Threat level indicator (derived from severity of recent events)

**Three-panel layout:**

**Panel 1: File System**
- Timeline of file events (color-coded by severity)
- "Critical Changes" highlight strip (system files modified/deleted)
- Baseline status (% of watched files hashed)
- Quick actions: Rescan baseline, View all, Add watch path

**Panel 2: Processes**
- Live process table (name, PID, CPU, memory, risk flag)
- Process tree visualization (collapsible)
- "New since baseline" filter
- "Suspicious" filter with reasons
- Kill button (with confirmation modal)

**Panel 3: Network**
- Active connections table (local → remote, process, bytes)
- World map visualization of remote IPs (optional, nice-to-have)
- "Not in baseline" filter
- Connection sparkline (connections over time)
- Block button (future, with Sentinel)

**Design language:**
- Background: Deep navy (#0a1628) with electric blue (#3b82f6) accents
- Pulse animations for live data
- Streaming data feel (events slide in from top)
- Radar/scan line aesthetic matching existing SecurityDashboard

---

### Phase 7: Auto-Remediation — "Fix It" Actions
**Priority:** HIGH — Transforms reporting into protection  
**Estimated:** 2–3 sessions  
**Depends on:** Phase 6 (Watchtower) for real-time triggers, but Aegis/Viper remediation can start immediately

#### 7.1 — Aegis Fix-It Actions
Each Aegis finding gets an optional "Fix It" button that executes a remediation:

| Finding | Fix Action | Command |
|---------|-----------|---------|
| Firewall disabled | Enable firewall | `ufw enable` / `netsh advfirewall set allprofiles state on` |
| SSH root login allowed | Disable root login | Patch `/etc/ssh/sshd_config` → `PermitRootLogin no` |
| Password auth enabled (SSH) | Enforce key-only | Patch `PasswordAuthentication no` |
| World-writable file in /etc | Fix permissions | `chmod o-w <file>` |
| Auto-updates disabled | Enable unattended-upgrades | `dpkg-reconfigure -plow unattended-upgrades` |
| Outdated package with CVE | Update package | `apt upgrade <package>` |
| Core dumps enabled | Disable | Set `* hard core 0` in `/etc/security/limits.conf` |

**UX:** Each finding card gets a "🔧 Fix It" button (only for findings with known remediation). Click → confirmation modal showing what will happen → executes → re-checks → updates finding to ✅.

**Safety:** All fixes require user confirmation. Show exact command that will run. Offer "Undo" for reversible fixes (stores inverse operation).

#### 7.2 — Viper Fix-It Actions
| Finding | Fix Action |
|---------|-----------|
| Plaintext API key in .env | Offer to move to encrypted vault |
| Exposed .git directory | Add to .gitignore, suggest access restriction |
| Weak SSH key type (DSA/RSA-1024) | Generate Ed25519 key, offer to replace |
| No-password account | Prompt to set password |
| Shadow file world-readable | `chmod 640 /etc/shadow` |

#### 7.3 — Remediation Engine (Backend)
**Rust module:** `src-tauri/src/engine/security/remediation.rs`

```sql
CREATE TABLE remediation_log (
    id TEXT PRIMARY KEY,
    finding_id TEXT NOT NULL,
    finding_source TEXT NOT NULL,  -- 'aegis' or 'viper'
    action_type TEXT NOT NULL,     -- 'firewall_enable', 'permission_fix', etc.
    command_executed TEXT NOT NULL,
    stdout TEXT,
    stderr TEXT,
    exit_code INTEGER,
    success INTEGER NOT NULL,
    undo_command TEXT,             -- inverse operation if available
    undone INTEGER NOT NULL DEFAULT 0,
    executed_by TEXT NOT NULL DEFAULT 'user',  -- 'user' or 'auto'
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Tauri commands:**
- `remediation_execute(findingId, source)` — Run the fix
- `remediation_undo(remediationId)` — Undo a fix
- `remediation_get_log(limit)` — History of all fixes
- `remediation_dry_run(findingId, source)` — Show what would happen without executing

---

### Phase 8: Agent Quarantine + Sentinel
**Priority:** HIGH — This is the unique differentiator nobody else can do  
**Estimated:** 2 sessions  
**Depends on:** Phase 6 (Watchtower anomaly data) + existing anomaly detection

#### 8.1 — Quarantine System
When an agent triggers enough anomalies, the system can isolate it.

**Quarantine levels:**
| Level | Name | Effect |
|-------|------|--------|
| 0 | Normal | Full access per security profile |
| 1 | Watched | Increased logging, lower anomaly threshold |
| 2 | Restricted | File access → read-only, no exec, no network |
| 3 | Suspended | Agent stops responding to heartbeats and messages |
| 4 | Frozen | Agent process paused, all resources held |

**Auto-escalation triggers:**
- Level 1: 3+ anomaly triggers in 1 hour
- Level 2: Critical finding from agent_audit (breach detected)
- Level 3: 5+ permission denials in 10 minutes + critical SIEM alert
- Level 4: Manual only (user must confirm)

**DB table:**
```sql
CREATE TABLE agent_quarantine (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    trigger_event_id TEXT,
    auto_escalated INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    released_at TEXT,
    released_by TEXT,  -- 'user' or 'auto'
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Tauri commands:**
- `quarantine_get_status(agentId)` — Current quarantine level
- `quarantine_escalate(agentId, level, reason)` — Manual escalation
- `quarantine_release(agentId)` — Release from quarantine
- `quarantine_get_history(agentId)` — Past quarantine events

**Integration points:**
- `engine/tools.rs` — Before executing any tool, check quarantine level. If level ≥ 2 and tool is write/exec/network → deny.
- `engine/runtime.rs` — Before dispatching to agent, check quarantine. Level 3 → skip. Level 4 → agent not available.
- SIEM correlation rule → auto-escalate on correlated critical events.

#### 8.2 — Sentinel Dashboard (Frontend)
Integrated into SecurityDashboard as enhanced Permissions/Activity tabs.

**New UI elements:**
- Agent status cards with quarantine level badges (🟢🟡🟠🔴⛔)
- "Quarantine" button on agent detail views
- Quarantine history timeline
- Auto-escalation rules editor (user can customize triggers)
- "Release" confirmation with risk acknowledgment

---

### Phase 9: Network & Device Discovery
**Priority:** MEDIUM — High consumer appeal ("who's on my WiFi?")  
**Estimated:** 1–2 sessions
**Status:** ✅ Complete (2026-05-25)

#### 9.1 — Local Network Scanner
```
Capabilities:
- ARP scan of local subnet (arp-scan or raw socket)
- mDNS/Zeroconf discovery (Bonjour/Avahi)
- Port scan discovered devices (lightweight, top 20 ports)
- Device fingerprinting (manufacturer from MAC OUI, device type guessing)
- Baseline: learn known devices on first scan
- Alert on: new devices, devices that left, IP changes
```

**DB tables:**
```sql
CREATE TABLE network_devices (
    id TEXT PRIMARY KEY,
    ip_address TEXT NOT NULL,
    mac_address TEXT,
    hostname TEXT,
    manufacturer TEXT,
    device_type TEXT,  -- phone, laptop, IoT, printer, unknown
    is_known INTEGER NOT NULL DEFAULT 0,
    nickname TEXT,     -- user-assigned name
    first_seen TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen TEXT NOT NULL DEFAULT (datetime('now')),
    open_ports TEXT,   -- JSON array
    is_online INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE network_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,  -- device_joined, device_left, ip_changed, port_opened
    device_id TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL DEFAULT 'info',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Tauri commands:**
- `network_scan` — Trigger ARP + mDNS scan
- `network_get_devices` — Known devices list
- `network_get_events` — Device join/leave events
- `network_rename_device(deviceId, nickname)` — User labels a device
- `network_mark_known(deviceId)` — Mark as trusted
- `network_alert_on_unknown` — Toggle alert for unknown devices

#### 9.2 — Network Dashboard (Frontend)
**Design:** "Home Network Map" — visual topology

- Central node = your computer
- Connected nodes = discovered devices (colored by type)
- Lines = active connections
- Unknown devices pulse red
- Known devices show nickname + last seen
- Click a device → detail card (IP, MAC, manufacturer, open ports, connection history)

---

### Phase 10: Scheduled Security Heartbeats
**Priority:** HIGH — Automates everything  
**Estimated:** 1 session  
**Depends on:** Existing cron infrastructure + Phases 6–9

Leverage the existing `cron_jobs` table and `check_and_run_cron()` loop to schedule security tasks as agent heartbeats.

#### 10.1 — Default Security Crons

| Schedule | Task | Agent | Description |
|----------|------|-------|-------------|
| `0 */6 * * *` | Quick Aegis scan | Aegis | Every 6 hours: firewall + ports check |
| `0 3 * * *` | Full Aegis scan | Aegis | Daily 3am: full system audit |
| `0 4 * * 1` | Full Viper scan | Viper | Weekly Monday 4am: full vuln scan |
| `*/5 * * * *` | Watchtower check | Watchtower | Every 5 minutes: process + connection snapshot |
| `0 0 * * *` | SIEM correlation | Watchtower | Daily midnight: run all correlation rules |
| `0 6 * * 1` | Agent audit | Viper | Weekly Monday 6am: agent-vs-agent security test |
| `0 8 * * 1` | Weekly report | Watchtower | Weekly Monday 8am: generate SIEM weekly report |
| `0 2 * * *` | Baseline refresh | Watchtower | Daily 2am: rebuild file baselines for changed files |

#### 10.2 — Cron Integration (Backend)
The existing cron system already supports:
- `create_cron_job()` — persist to DB
- `get_due_cron_jobs()` — find jobs past next_run_at
- `update_cron_run()` — log execution, compute next run
- `check_and_run_cron()` — main loop tick

**New work:**
- Seed default security crons on first run (migration in schema.sql)
- Security crons dispatch to the agent's chat pipeline with a task-specific prompt
- Example: Aegis quick scan cron → `agent_id: 'aegis'`, `task_message: 'Run a quick system audit. Focus on firewall and open ports. Report findings.'`
- Results log to security_events for SIEM correlation

#### 10.3 — Cron UX (Frontend)
- Security crons visible in the existing Cron/Settings UI
- Toggle each on/off
- Adjust schedule
- View last run result + next run time
- "Run Now" button for any cron

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    SecurityDashboard.tsx                        │
│         (Unified Hub — Overview, Aegis, Viper, Watchtower,      │
│          Activity, Permissions, Pending)                        │
└────────────┬──────────────┬──────────────┬──────────────┬───────┘
             │              │              │              │
     ┌───────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐ ┌────▼──────┐
     │   Aegis UI   │ │ Viper UI │ │Watchtower UI│ │Sentinel UI│
     │ (Phase 2 ✅) │ │(Phase 3✅)│ │ (Phase 6)   │ │ (Phase 8) │
     └───────┬──────┘ └────┬─────┘ └──────┬──────┘ └────┬──────┘
             │              │              │              │
     ┌───────▼──────────────▼──────────────▼──────────────▼───────┐
     │                   Tauri Commands Layer                      │
     │   aegis_*  |  viper_*  |  watchtower_*  |  quarantine_*    │
     │   siem_*   |  security_*  |  remediation_*  |  network_*   │
     └───────┬──────────────┬──────────────┬──────────────┬───────┘
             │              │              │              │
     ┌───────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐ ┌────▼──────┐
     │  aegis.rs    │ │viper.rs  │ │watchtower.rs│ │remediation│
     │  (scanners)  │ │(scanners)│ │(fs/proc/net)│ │   .rs     │
     └───────┬──────┘ └────┬─────┘ └──────┬──────┘ └────┬──────┘
             │              │              │              │
     ┌───────▼──────────────▼──────────────▼──────────────▼───────┐
     │                    SIEM Layer (siem.rs)                     │
     │        Correlation → Risk Scoring → Alerts → Reports       │
     └───────────────────────────┬────────────────────────────────┘
                                 │
     ┌───────────────────────────▼────────────────────────────────┐
     │                    SQLite Database                          │
     │  security_events | aegis_* | viper_* | watchtower_* |      │
     │  siem_* | agent_audit_* | anomaly_rules | quarantine |     │
     │  remediation_log | network_* | cron_jobs                   │
     └────────────────────────────────────────────────────────────┘
                                 │
     ┌───────────────────────────▼────────────────────────────────┐
     │                   Cron Scheduler                            │
     │   Heartbeat loop → check_due_cron → dispatch to agent     │
     │   Security crons: quick scan (6h), full scan (daily),      │
     │   vuln scan (weekly), watchtower (5min), SIEM (daily)     │
     └────────────────────────────────────────────────────────────┘
```

---

## Dependency Additions (Cargo.toml)

| Crate | Purpose | Phase |
|-------|---------|-------|
| `notify` | Cross-platform filesystem watcher (inotify/FSEvents/ReadDirectoryChanges) | 6 |
| `sysinfo` | Process listing, CPU/memory per process, system info | 6 |
| `netstat2` or raw `/proc/net/tcp` parsing | Network connection enumeration | 6 |
| `sha2` | SHA-256 file hashing for baselines | 6 |
| `mac_oui_lookup` or bundled OUI CSV | MAC address → manufacturer lookup | 9 |

---

## UX Principles (Security-Specific)

1. **No jargon in consumer-facing UI.** "Open Ports" → "Doorways into your system." "SSH config" → "Remote access settings." Every finding has a "What this means" and "What to do" section.

2. **Score ring is the anchor.** Every major view has a score ring (0–100). Color = status. User always knows "am I okay?" at a glance.

3. **Proactive, not reactive.** Don't wait for the user to scan. Cron-scheduled scans run silently. When something is found, it surfaces as a notification — not buried in a dashboard.

4. **Fix It, not just "FYI."** Every actionable finding gets a remediation button. We don't just tell you the door is unlocked — we offer to lock it.

5. **Agent personality.** Aegis speaks in protective tones ("I've secured your system"). Viper speaks in tactical tones ("Found 3 exploitable weaknesses"). Watchtower speaks in observational tones ("Something changed in your system files at 2am").

6. **The "magic moment":** User opens Security for the first time, sees the scan animate in real-time, watches the score ring populate, gets a finding with a "Fix It" button, clicks it, sees the finding resolve to ✅. That's the moment they need this app.

---

## Implementation Order (Final)

| Phase | Name | Sessions | Depends On | Impact |
|-------|------|----------|------------|--------|
| 6 | **Watchtower** (continuous monitoring) | 2–3 | Nothing | Foundation for all real-time features |
| 10 | **Security Crons** (automated scans) | 1 | Phase 6 | Makes everything run on its own |
| 7 | **Auto-Remediation** (Fix It) | 2–3 | Aegis/Viper (done) | Transforms reporting → protection |
| 8 | **Agent Quarantine + Sentinel** | 2 | Phase 6 | Unique differentiator |
| 9 | **Network Discovery** | 1–2 | Phase 6 | Consumer appeal ("who's on my WiFi?") |

**Total estimated:** 8–11 sessions for the complete security platform.

---

## What the Old Documents Added

The PLAN.md and mission-1224.json confirmed the vision and added these ideas not in my initial brainstorm:

1. **Attack simulation beyond agents** — Phishing scenarios, social engineering resistance testing (partially covered by agent_audit's social_engineering category, but could expand to test the *user*)
2. **Code & config review as a standalone feature** — Viper's code scanner exists but could be expanded into a "Security Code Review" tool that scans any project directory
3. **The pricing/positioning context** — $96B M&A, $3.6B enterprise funding, zero consumer competitors. This validates the urgency.
4. **Heartbeat integration** — The PLAN explicitly calls out that agents have heartbeats and crons will be the scheduling mechanism. This aligned perfectly with Phase 10.
5. **Defense scoring for entire agent family** — Already implemented in Phase 4 (agent_audit).

The old documents don't contradict anything — they validate the architecture and add market context. The main addition is emphasizing that **cron-based scheduling via agent heartbeats** is the intended automation mechanism, which I've incorporated into Phase 10.

---

*This spec is the blueprint. Phases 1–5 are shipped. Phases 6–10 are the roadmap. Let's build.*
