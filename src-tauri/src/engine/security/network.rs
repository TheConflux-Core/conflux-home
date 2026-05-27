// Conflux Engine — Network Discovery (Phase 9)
// "Who's on my WiFi?" — ARP scan, mDNS discovery, device fingerprinting.

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::process::Command;
use uuid::Uuid;

use crate::engine::db::EngineDb;
use crate::engine::security::events::{self, EventCategory, EventType};
use crate::engine::security::platform::{current_os, OsType};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkDevice {
    pub id: String,
    pub ip_address: String,
    pub mac_address: Option<String>,
    pub hostname: Option<String>,
    pub manufacturer: Option<String>,
    pub device_type: String,
    pub is_known: bool,
    pub nickname: Option<String>,
    pub first_seen: String,
    pub last_seen: String,
    pub open_ports: Vec<u16>,
    pub is_online: bool,
    pub scan_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkEvent {
    pub id: String,
    pub event_type: String,
    pub device_id: String,
    pub description: Option<String>,
    pub severity: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkScanResult {
    pub devices_found: usize,
    pub devices_new: usize,
    pub devices_left: usize,
    pub total_known: usize,
    pub total_online: usize,
    pub unknown_online: usize,
    pub scan_duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkMapData {
    pub local_ip: String,
    pub gateway_ip: Option<String>,
    pub subnet: String,
    pub devices: Vec<NetworkDevice>,
    pub scan_result: Option<NetworkScanResult>,
}

// ── OUI Manufacturer Lookup ─────────────────────────────────────

static OUI_DATABASE: &[(&str, &str, &str)] = &[
    ("00:50:56", "VMware", "desktop"), ("00:0C:29", "VMware", "desktop"),
    ("00:1A:11", "Google", "iot"), ("A4:77:33", "Google", "iot"),
    ("54:60:09", "Google", "iot"), ("30:FD:38", "Google", "iot"),
    ("00:17:88", "Signify (Hue)", "iot"), ("EC:1A:59", "Belkin", "iot"),
    ("00:1B:11", "D-Link", "router"), ("28:10:7B", "D-Link", "router"),
    ("00:14:BF", "Linksys", "router"), ("00:18:F8", "Linksys", "router"),
    ("00:1C:10", "Cisco", "router"), ("00:24:C4", "Cisco", "router"),
    ("00:1E:8F", "Canon", "printer"), ("00:09:4F", "HP", "printer"),
    ("00:1B:78", "HP", "printer"), ("74:46:A0", "HP", "printer"),
    ("00:0D:56", "Dell", "desktop"), ("00:14:22", "Dell", "desktop"),
    ("B8:CA:3A", "Dell", "desktop"), ("00:50:B6", "Apple", "laptop"),
    ("00:03:93", "Apple", "laptop"), ("00:0A:95", "Apple", "laptop"),
    ("A8:20:66", "Apple", "phone"), ("3C:15:C2", "Apple", "phone"),
    ("D0:03:4B", "Apple", "phone"), ("F0:DB:F8", "Apple", "laptop"),
    ("8C:85:90", "Apple", "laptop"), ("AC:BC:32", "Apple", "phone"),
    ("DC:A9:04", "Apple", "phone"), ("00:1C:B3", "Apple", "laptop"),
    ("18:65:90", "Apple", "phone"), ("A4:5E:60", "Apple", "phone"),
    ("00:1E:C2", "Apple", "laptop"), ("CC:08:E0", "Apple", "phone"),
    ("88:66:A5", "Apple", "phone"), ("30:90:AB", "Samsung", "phone"),
    ("00:07:AB", "Samsung", "phone"), ("00:12:FB", "Samsung", "phone"),
    ("00:16:32", "Samsung", "phone"), ("00:1A:8A", "Samsung", "phone"),
    ("78:47:1D", "Samsung", "phone"), ("00:0E:07", "Sony", "iot"),
    ("00:13:A9", "Sony", "iot"), ("00:04:5F", "Netgear", "router"),
    ("00:09:5B", "Netgear", "router"), ("00:0F:B5", "Netgear", "router"),
    ("00:14:6C", "Netgear", "router"), ("20:4E:7F", "Netgear", "router"),
    ("00:1C:DF", "Intel", "laptop"), ("00:13:CE", "Intel", "laptop"),
    ("00:16:6F", "Intel", "laptop"), ("00:22:43", "Intel", "laptop"),
    ("00:24:D7", "Intel", "laptop"), ("00:E0:4C", "Realtek", "unknown"),
    ("52:54:00", "QEMU/KVM", "server"), ("00:15:5D", "Microsoft/Hyper-V", "server"),
    ("00:03:FF", "Microsoft/Xbox", "iot"), ("7C:ED:8D", "Microsoft/Xbox", "iot"),
    ("00:1D:D8", "Acer", "laptop"), ("00:02:2D", "Asus", "laptop"),
    ("00:0C:6E", "Asus", "laptop"), ("00:1A:92", "Asus", "router"),
    ("00:1B:FC", "Asus", "router"), ("5C:F5:DA", "Espressif (ESP32)", "iot"),
    ("30:AE:A4", "Espressif (ESP32)", "iot"), ("B4:E6:2D", "Espressif (ESP32)", "iot"),
    ("60:01:94", "Espressif (ESP32)", "iot"), ("A4:CF:12", "Espressif (ESP32)", "iot"),
    ("24:0A:C4", "Espressif (ESP32)", "iot"), ("F0:F0:A4", "Amazon/Echo", "iot"),
    ("74:C2:46", "Amazon/Echo", "iot"), ("44:65:0D", "Amazon/Echo", "iot"),
    ("84:D6:D0", "Amazon/Echo", "iot"), ("FC:A1:83", "Amazon/Echo", "iot"),
    ("B0:A7:37", "Roku", "iot"), ("CC:6D:A0", "Roku", "iot"),
    ("D0:76:50", "TP-Link", "router"), ("50:C7:BF", "TP-Link", "router"),
    ("60:E3:27", "TP-Link", "router"), ("18:A6:F7", "TP-Link", "router"),
    ("14:CC:20", "TP-Link", "router"), ("C0:25:E9", "TP-Link", "router"),
];

fn lookup_oui(mac: &str) -> Option<(&'static str, &'static str)> {
    let upper = mac.to_uppercase();
    let prefix = &upper[..std::cmp::min(8, upper.len())];
    OUI_DATABASE.iter().find(|(oui, _, _)| prefix == *oui).map(|(_, m, dt)| (*m, *dt))
}

fn guess_device_type(hostname: &str, manufacturer: &str) -> &'static str {
    let h = hostname.to_lowercase();
    let m = manufacturer.to_lowercase();
    if h.contains("iphone") || h.contains("android") || h.contains("pixel") || h.contains("galaxy") || h.contains("phone") { return "phone"; }
    if h.contains("macbook") || h.contains("laptop") || h.contains("thinkpad") { return "laptop"; }
    if h.contains("imac") || h.contains("desktop") || h.contains("pc") { return "desktop"; }
    if h.contains("printer") || h.contains("laserjet") || h.contains("print") { return "printer"; }
    if h.contains("router") || h.contains("ap") || h.contains("gateway") { return "router"; }
    if h.contains("echo") || h.contains("alexa") || h.contains("chromecast") || h.contains("roku") { return "iot"; }
    if h.contains("server") || h.contains("nas") { return "server"; }
    if m.contains("apple") { return "laptop"; }
    if m.contains("samsung") { return "phone"; }
    if m.contains("espressif") || m.contains("philips") || m.contains("belkin") { return "iot"; }
    if m.contains("canon") || m.contains("hp") || m.contains("epson") { return "printer"; }
    if m.contains("netgear") || m.contains("d-link") || m.contains("tp-link") || m.contains("linksys") { return "router"; }
    "unknown"
}

// ── Scanning (all synchronous, called from blocking context) ───

fn get_local_network() -> Result<(String, String)> {
    match current_os() {
        OsType::Linux => {
            let output = Command::new("ip").args(["route", "show", "default"]).output().context("Failed to run 'ip route'")?;
            let stdout = String::from_utf8_lossy(&output.stdout);
            let mut iface = String::new();
            for line in stdout.lines() {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 5 && parts[0] == "default" { iface = parts[4].to_string(); break; }
            }
            if iface.is_empty() { return Ok(("unknown".into(), "unknown/24".into())); }

            let output = Command::new("ip").args(["addr", "show", &iface]).output().context("Failed to run 'ip addr'")?;
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let line = line.trim();
                if line.starts_with("inet ") && !line.contains("127.0.0.1") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 2 {
                        let cidr = parts[1];
                        let ip_part = cidr.split('/').next().unwrap_or(cidr);
                        let prefix = cidr.split('/').nth(1).unwrap_or("24");
                        return Ok((ip_part.to_string(), format!("{}/{}", ip_part, prefix)));
                    }
                }
            }
            Ok(("unknown".into(), "unknown/24".into()))
        }
        OsType::Windows => {
            // Use PowerShell Get-NetIPAddress
            let output = Command::new("powershell")
                .args(["-Command", 
                    "Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Ethernet','Wi-Fi' | \
                     Where-Object {$_.IPAddress -ne '127.0.0.1'} | \
                     Select-Object IPAddress,PrefixLength -First 1 | ConvertTo-Json -Compress"])
                .output();
            
            if let Ok(output) = output {
                let stdout = String::from_utf8_lossy(&output.stdout);
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
                    let ip = json["IPAddress"].as_str().unwrap_or("unknown").to_string();
                    let prefix = json["PrefixLength"].as_i64().unwrap_or(24);
                    return Ok((ip.clone(), format!("{}/{}", ip, prefix)));
                }
            }
            Ok(("unknown".into(), "unknown/24".into()))
        }
        _ => Ok(("unknown".into(), "unknown/24".into())),
    }
}

fn arp_scan(_subnet: &str) -> Result<Vec<(String, Option<String>)>> {
    match current_os() {
        OsType::Linux => {
            match Command::new("arp-scan").args(["--localnet", "--quiet", "--retry=2"]).output() {
                Ok(out) if out.status.success() => {
                    let stdout = String::from_utf8_lossy(&out.stdout);
                    Ok(stdout.lines().filter_map(|line| {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if parts.len() >= 2 {
                            let ip = parts[0].to_string();
                            let mac = parts[1].to_string();
                            if !ip.ends_with(".255") && !ip.ends_with(".0") { return Some((ip, Some(mac))); }
                        }
                        None
                    }).collect())
                }
                _ => {
                    log::warn!("arp-scan not available, falling back to ARP cache");
                    let content = std::fs::read_to_string("/proc/net/arp").context("Failed to read /proc/net/arp")?;
                    Ok(content.lines().skip(1).filter_map(|line| {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if parts.len() >= 4 && parts[3] != "00:00:00:00:00:00" && !parts[0].ends_with(".255") {
                            return Some((parts[0].to_string(), Some(parts[3].to_string())));
                        }
                        None
                    }).collect())
                }
            }
        }
        OsType::Windows => {
            // Use Windows arp -a command
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

fn resolve_hostname(ip: &str) -> Option<String> {
    match current_os() {
        OsType::Linux => {
            Command::new("getent").args(["hosts", ip]).output().ok().and_then(|out| {
                if out.status.success() {
                    String::from_utf8_lossy(&out.stdout).split_whitespace().nth(1).map(|s| s.to_string())
                } else { None }
            })
        }
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

const TOP_PORTS: &[u16] = &[22, 80, 443, 445, 3389]; // 5 critical ports only
const MAX_DEVICES_TO_PORT_SCAN: usize = 5;

/// Fast port scan: parse `netstat -an` once instead of N Test-NetConnection calls.
/// Returns set of (ip, port) pairs that are LISTENING.
fn parse_netstat_listening() -> std::collections::HashSet<(String, u16)> {
    let mut listening = std::collections::HashSet::new();
    let output = match current_os() {
        OsType::Windows => Command::new("powershell")
            .args(["-Command", "netstat -an"])
            .output(),
        _ => Command::new("netstat").args(["-an"]).output(),
    };
    if let Ok(out) = output {
        let stdout = String::from_utf8_lossy(&out.stdout);
        for line in stdout.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 4 && parts[0].starts_with("tcp") {
                let state = parts[3];
                if state == "LISTENING" || state == "LISTEN" {
                    if let Some((addr, port_str)) = parts[1].rsplit_once(':') {
                        if let Ok(port) = port_str.parse::<u16>() {
                            // Normalize addr — strip IPv6 prefix if present
                            let ip = if addr.starts_with('[') && addr.ends_with(']') {
                                &addr[1..addr.len()-1]
                            } else {
                                addr
                            };
                            listening.insert((ip.to_string(), port));
                        }
                    }
                }
            }
        }
    }
    listening
}

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

/// Fast port scan using pre-parsed netstat output.
/// Falls back to nc for ports not found in netstat.
fn scan_ports_fast(ip: &str, netstat: &std::collections::HashSet<(String, u16)>) -> Vec<u16> {
    let mut open_ports = Vec::new();
    // Check netstat first for all critical ports
    for &port in TOP_PORTS {
        if netstat.contains(&(ip.to_string(), port)) {
            open_ports.push(port);
            continue;
        }
        // Also check 0.0.0.0 and [::] wildcard listeners
        if netstat.contains(&("0.0.0.0".to_string(), port))
            || netstat.contains(&("[::]".to_string(), port))
            || netstat.contains(&("*".to_string(), port))
        {
            open_ports.push(port);
            continue;
        }
        // For remote devices, netstat won't show their listening ports.
        // Only do the slow probe for the critical 5 ports (not 15).
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
        if success {
            open_ports.push(port);
        }
    }
    open_ports
}

// ── DB Operations (all synchronous within conn scope) ───────────

fn map_device_row(row: &rusqlite::Row) -> std::result::Result<NetworkDevice, rusqlite::Error> {
    let ports_json: String = row.get(10)?;
    let ports: Vec<u16> = serde_json::from_str(&ports_json).unwrap_or_default();
    Ok(NetworkDevice {
        id: row.get(0)?, ip_address: row.get(1)?, mac_address: row.get(2)?,
        hostname: row.get(3)?, manufacturer: row.get(4)?, device_type: row.get(5)?,
        is_known: row.get::<_, i64>(6)? != 0, nickname: row.get(7)?,
        first_seen: row.get(8)?, last_seen: row.get(9)?,
        open_ports: ports, is_online: row.get::<_, i64>(11)? != 0, scan_count: row.get(12)?,
    })
}

fn map_event_row(row: &rusqlite::Row) -> std::result::Result<NetworkEvent, rusqlite::Error> {
    Ok(NetworkEvent {
        id: row.get(0)?, event_type: row.get(1)?, device_id: row.get(2)?,
        description: row.get(3)?, severity: row.get(4)?, created_at: row.get(5)?,
    })
}

/// Run the full scan synchronously on the given connection.
fn run_scan(conn: &rusqlite::Connection) -> Result<NetworkScanResult> {
    let start = std::time::Instant::now();
    let (_local_ip, subnet) = get_local_network()?;
    let arp_results = arp_scan(&subnet)?;

    // Parse netstat once for all devices (avoids N*15 PowerShell calls)
    let netstat = parse_netstat_listening();

    conn.execute("UPDATE network_devices SET is_online = 0", [])?;

    let mut devices_found = 0usize;
    let mut devices_new = 0usize;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

    for (ip, mac) in &arp_results {
        let hostname = resolve_hostname(ip);
        // Only port-scan first N devices, use fast netstat-based scan
        let ports = if devices_found < MAX_DEVICES_TO_PORT_SCAN {
            scan_ports_fast(ip, &netstat)
        } else {
            Vec::new()
        };
        let ports_json = serde_json::to_string(&ports)?;

        // Check existing by MAC
        if let Some(mac_addr) = mac.as_deref() {
            if let Ok((id, old_ip)) = conn.query_row(
                "SELECT id, ip_address FROM network_devices WHERE mac_address = ?1",
                [mac_addr], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
            ) {
                let ip_changed = old_ip != *ip;
                conn.execute(
                    "UPDATE network_devices SET ip_address=?1, hostname=COALESCE(?2,hostname), last_seen=?3, open_ports=?4, is_online=1, scan_count=scan_count+1 WHERE id=?5",
                    rusqlite::params![ip, hostname, now, ports_json, id],
                )?;
                if ip_changed {
                    conn.execute(
                        "INSERT INTO network_events (id,event_type,device_id,description,severity) VALUES (?1,'ip_changed',?2,?3,'info')",
                        rusqlite::params![Uuid::new_v4().to_string(), id, format!("IP changed from {} to {}", old_ip, ip)],
                    )?;
                }
                devices_found += 1;
                continue;
            }
        }

        // New device
        let id = Uuid::new_v4().to_string();
        let (mfr, dtype) = mac.as_deref().and_then(lookup_oui).map(|(m, d)| (Some(m), d)).unwrap_or((None, "unknown"));
        let final_type = hostname.as_deref()
            .map(|h| { let g = guess_device_type(h, mfr.unwrap_or("")); if g != "unknown" { g } else { dtype } })
            .unwrap_or(dtype);

        conn.execute(
            "INSERT INTO network_devices (id,ip_address,mac_address,hostname,manufacturer,device_type,open_ports,is_online,last_seen) VALUES (?1,?2,?3,?4,?5,?6,?7,1,?8)",
            rusqlite::params![id, ip, mac, hostname, mfr, final_type, ports_json, now],
        )?;

        conn.execute(
            "INSERT INTO network_events (id,event_type,device_id,description,severity) VALUES (?1,'device_joined',?2,?3,'info')",
            rusqlite::params![Uuid::new_v4().to_string(), id, format!("New device: {} ({})", hostname.as_deref().unwrap_or(ip), mfr.unwrap_or("Unknown"))],
        )?;

        devices_found += 1;
        devices_new += 1;
    }

    // Devices that left
    let mut stmt = conn.prepare("SELECT id, ip_address, hostname FROM network_devices WHERE is_online = 0")?;
    let left: Vec<(String, String, Option<String>)> = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?
        .collect::<std::result::Result<Vec<_>, _>>()?;
    drop(stmt);

    let mut devices_left = 0usize;
    for (id, ip, hostname) in &left {
        let name = hostname.as_deref().unwrap_or(ip);
        conn.execute(
            "INSERT INTO network_events (id,event_type,device_id,description,severity) VALUES (?1,'device_left',?2,?3,'info')",
            rusqlite::params![Uuid::new_v4().to_string(), id, format!("{} ({}) went offline", name, ip)],
        )?;
        devices_left += 1;
    }

    let total_known: i64 = conn.query_row("SELECT COUNT(*) FROM network_devices", [], |r| r.get(0))?;
    let total_online: i64 = conn.query_row("SELECT COUNT(*) FROM network_devices WHERE is_online=1", [], |r| r.get(0))?;
    let unknown_online: i64 = conn.query_row("SELECT COUNT(*) FROM network_devices WHERE is_online=1 AND is_known=0", [], |r| r.get(0))?;

    Ok(NetworkScanResult {
        devices_found, devices_new, devices_left,
        total_known: total_known as usize, total_online: total_online as usize,
        unknown_online: unknown_online as usize,
        scan_duration_ms: start.elapsed().as_millis() as u64,
    })
}

// ── Public Async API ────────────────────────────────────────────

pub async fn get_devices(db: &EngineDb) -> Result<Vec<NetworkDevice>> {
    let conn = db.conn_async().await;
    let mut stmt = conn.prepare(
        "SELECT id,ip_address,mac_address,hostname,manufacturer,device_type,is_known,nickname,first_seen,last_seen,open_ports,is_online,scan_count FROM network_devices ORDER BY is_online DESC,last_seen DESC"
    )?;
    let devices: Vec<NetworkDevice> = stmt.query_map([], map_device_row)?.collect::<std::result::Result<Vec<_>, _>>()?;
    Ok(devices)
}

pub async fn get_events(db: &EngineDb, limit: i64) -> Result<Vec<NetworkEvent>> {
    let conn = db.conn_async().await;
    let mut stmt = conn.prepare(
        "SELECT id,event_type,device_id,description,severity,created_at FROM network_events ORDER BY created_at DESC LIMIT ?1"
    )?;
    let events: Vec<NetworkEvent> = stmt.query_map([limit], map_event_row)?.collect::<std::result::Result<Vec<_>, _>>()?;
    Ok(events)
}

pub async fn scan_network(db: &EngineDb) -> Result<NetworkScanResult> {
    // Get conn, run scan, log event — all within one scope so conn is dropped before the await
    let result = {
        let conn = db.conn_async().await;
        run_scan(&conn)?
    };
    // Log event after DB work is done
    events::log_event(db, EventCategory::Info, EventType::NetworkRequest,
        &format!("Network scan: {} devices ({} new, {} left)", result.devices_found, result.devices_new, result.devices_left),
        None,
    ).await?;
    Ok(result)
}

pub async fn get_network_map(db: &EngineDb) -> Result<NetworkMapData> {
    let (local_ip, subnet) = get_local_network().unwrap_or_else(|_| ("unknown".into(), "unknown/24".into()));
    let gateway = match current_os() {
        OsType::Windows => {
            Command::new("powershell")
                .args(["-Command", "(Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Select-Object -First 1).NextHop"])
                .output().ok()
                .and_then(|o| String::from_utf8_lossy(&o.stdout).trim().to_string().into())
        }
        _ => {
            Command::new("ip").args(["route", "show", "default"]).output().ok()
                .and_then(|o| String::from_utf8_lossy(&o.stdout).split_whitespace().nth(2).map(|s| s.to_string()))
        }
    };
    let devices = get_devices(db).await?;
    Ok(NetworkMapData { local_ip, gateway_ip: gateway, subnet, devices, scan_result: None })
}

pub async fn rename_device(db: &EngineDb, device_id: &str, nickname: &str) -> Result<()> {
    let conn = db.conn_async().await;
    conn.execute("UPDATE network_devices SET nickname=?1 WHERE id=?2", rusqlite::params![nickname, device_id])?;
    Ok(())
}

pub async fn mark_known(db: &EngineDb, device_id: &str) -> Result<()> {
    let conn = db.conn_async().await;
    conn.execute("UPDATE network_devices SET is_known=1 WHERE id=?1", [device_id])?;
    Ok(())
}

pub async fn delete_device(db: &EngineDb, device_id: &str) -> Result<()> {
    let conn = db.conn_async().await;
    conn.execute("DELETE FROM network_events WHERE device_id=?1", [device_id])?;
    conn.execute("DELETE FROM network_devices WHERE id=?1", [device_id])?;
    Ok(())
}

// ── Synchronous wrapper (for spawn_blocking) ─────────────────

/// Synchronous network scan using conn_blocking().
/// Called from spawn_blocking in commands.rs — no nested async.
pub fn scan_network_sync(db: &EngineDb) -> Result<NetworkScanResult> {
    let conn = db.conn_blocking();
    let result = run_scan(&conn)?;
    // Log event directly to DB (matching security_events schema)
    let _ = conn.execute(
        "INSERT INTO security_events (id, agent_id, session_id, event_type, category, tool_name, target, details, risk_score, was_allowed)
         VALUES (?1, 'system', NULL, 'network_scan', 'info', NULL, NULL, ?2, 0, 1)",
        rusqlite::params![
            Uuid::new_v4().to_string(),
            format!("Network scan: {} devices ({} new, {} left)", result.devices_found, result.devices_new, result.devices_left)
        ],
    );
    Ok(result)
}
