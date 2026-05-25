// Conflux Home — Security Dashboard
// 🛡️ Aegis (Blue Team) + 🐍 Viper (Red Team) + 👁️ Watchtower (SIEM) + Activity + Permissions + Pending
// Design: Cinematic tactical ops center — shield icon, radar sweep, grid overlay, glowing rings

import React, { useState, useEffect, useCallback, useRef } from 'react';

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import '../styles/security.css';
import SecurityWelcome from './SecurityWelcome';
import SecurityTour from './SecurityTour';
import { hasCompletedSecurityWelcome } from './SecurityWelcome';
import { hasCompletedSecurityTour } from './SecurityTour';
import type { QuarantineStatus, QuarantineEvent } from '../gateway-client/security';
import { getAllQuarantined, getQuarantineHistory, quarantineEscalate, quarantineRelease, networkScan, networkGetDevices, networkGetMap, networkRenameDevice, networkMarkKnown, networkDeleteDevice, networkGetEvents } from '../gateway-client/security';
import type { NetworkDevice, NetworkScanResult, NetworkMapData, NetworkEvent } from '../gateway-client/security';

// ── Timeout wrapper ──────────────────────────────────────────────
function invokeTimeout<T>(cmd: string, args?: Record<string, unknown>, ms = 6000): Promise<T> {
  return Promise.race([
    invoke<T>(cmd, args),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Command '${cmd}' timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// ── Types ───────────────────────────────────────────────────────
interface RiskOverview {
  overall_score: number;
  trend: string;
  active_alerts: number;
  critical_alerts: number;
  correlations_24h: number;
  events_24h: number;
  aegis_score: number | null;
  viper_risk: number | null;
  agent_defense: number | null;
  top_risks: string[];
}

interface AuditRun {
  id: string;
  run_type: string;
  status: string;
  overall_score: number | null;
  total_checks: number;
  pass_count: number;
  warn_count: number;
  critical_count: number;
  started_at: string;
  completed_at: string | null;
}

interface AuditFinding {
  id: string;
  run_id: string;
  category: string;
  check_name: string;
  severity: 'pass' | 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  recommendation: string | null;
  raw_data: unknown;
}

interface VulnScan {
  id: string;
  scan_type: string;
  status: string;
  risk_score: number | null;
  total_checks: number;
  pass_count: number;
  info_count: number;
  warn_count: number;
  critical_count: number;
  started_at: string;
  completed_at: string | null;
}

interface VulnFinding {
  id: string;
  scan_id: string;
  category: string;
  check_name: string;
  severity: 'pass' | 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  remediation: string | null;
  cve_ids: string[] | null;
  raw_data: unknown;
}

interface SecurityEvent {
  id: string;
  agent_id: string;
  event_type: string;
  category: 'info' | 'warning' | 'critical';
  tool_name: string | null;
  target: string | null;
  risk_score: number;
  was_allowed: boolean;
  created_at: string;
}

interface PermissionPrompt {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_emoji: string;
  request_type: string;
  target: string;
  tool_name: string | null;
  created_at: string;
}

interface AgentProfile {
  agent_id: string;
  sandbox_enabled: boolean;
  file_access_mode: string;
  network_mode: string;
  exec_mode: string;
  anomaly_threshold: number;
}

interface SiemAlert {
  id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  source: string;
  agent_id: string | null;
  correlation_id: string | null;
  status: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

// ── Category Metadata ─────────────────────────────────────────────
const AEGIS_META: Record<string, { icon: string; label: string; color: string; tagline: string }> = {
  firewall: { icon: '🧱', label: 'Firewall', color: '#f97316', tagline: 'Your first line of defense — blocks unauthorized access' },
  ports: { icon: '🔌', label: 'Open Ports', color: '#06b6d4', tagline: 'Doorways into your system from the network' },
  ssh: { icon: '🔑', label: 'Remote Access', color: '#eab308', tagline: 'How you connect to this machine remotely' },
  permissions: { icon: '📂', label: 'File Permissions', color: '#8b5cf6', tagline: 'Who can read, write, or run files on your system' },
  software: { icon: '📦', label: 'Software Updates', color: '#22c55e', tagline: 'Keeping your programs up to date closes security holes' },
  cron: { icon: '⏰', label: 'Scheduled Tasks', color: '#ec4899', tagline: 'Automatic jobs running in the background' },
  general: { icon: '🛡️', label: 'System Health', color: '#6366f1', tagline: 'General hardening and best practices' },
};

const VIPER_META: Record<string, { icon: string; label: string; color: string; tagline: string }> = {
  misconfig: { icon: '⚙️', label: 'System Weaknesses', color: '#f97316', tagline: 'Risky settings that could let attackers in' },
  network: { icon: '🌐', label: 'Network Exposure', color: '#06b6d4', tagline: 'How visible your system is on the network' },
  browser: { icon: '🌍', label: 'Browser Security', color: '#8b5cf6', tagline: 'Saved passwords and data in your browser' },
  passwords: { icon: '🔐', label: 'Password Safety', color: '#ec4899', tagline: 'System password strength and policies' },
  code: { icon: '📝', label: 'Secrets & Config', color: '#eab308', tagline: 'Accidentally exposed API keys, tokens, or private data' },
  general: { icon: '🐍', label: 'General Hardening', color: '#22c55e', tagline: 'Overall security posture and best practices' },
};

// ── Helpers ──────────────────────────────────────────────────────
function scoreColor(score: number | null): string {
  if (score === null) return '#475569';
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#84cc16';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function riskColor(score: number | null): string {
  if (score === null) return '#475569';
  if (score <= 15) return '#22c55e';
  if (score <= 40) return '#f59e0b';
  return '#ef4444';
}

function severityMeta(sev: string) {
  switch (sev) {
    case 'critical': return { icon: '🚨', color: '#ef4444', bg: '#ef444418' };
    case 'warning': return { icon: '⚠️', color: '#f59e0b', bg: '#f59e0b18' };
    case 'info': return { icon: 'ℹ️', color: '#3b82f6', bg: '#3b82f618' };
    case 'pass': return { icon: '✅', color: '#22c55e', bg: '#22c55e18' };
    default: return { icon: '📋', color: '#64748b', bg: '#64748b18' };
  }
}

function formatAge(iso: string): string {
  try {
    const d = new Date(iso);
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString();
  } catch { return iso; }
}

function truncate(str: string, len: number): string {
  if (!str) return '—';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

function scoreLabel(score: number | null): string {
  if (score === null) return 'No scan yet';
  if (score >= 90) return 'Excellent — well hardened';
  if (score >= 75) return 'Good — minor improvements possible';
  if (score >= 50) return 'Fair — some issues need attention';
  return 'At Risk — action recommended';
}

function riskLabel(score: number | null): string {
  if (score === null) return 'No scan yet';
  if (score <= 15) return 'Low Risk — looks good';
  if (score <= 40) return 'Moderate Risk — some concerns';
  if (score <= 70) return 'High Risk — needs attention';
  return 'Critical Risk — act now';
}

function eventIcon(type: string): string {
  const m: Record<string, string> = {
    file_access: '📁', network_request: '🌐', exec_command: '💻',
    api_call: '🔌', browser_action: '🌍', permission_denied: '🚫', anomaly: '⚠️',
  };
  return m[type] ?? '📋';
}

function eventLabel(type: string): string {
  const m: Record<string, string> = {
    file_access: 'tried to read a file', network_request: 'made a network request',
    exec_command: 'ran a command', api_call: 'called an API',
    browser_action: 'opened something in browser', permission_denied: 'was denied access',
    anomaly: 'triggered anomaly detection',
  };
  return m[type] ?? type;
}

// ── SVG Score Ring ────────────────────────────────────────────────
function ScoreRing({ score, size = 100, strokeWidth = 8, color, label, icon }: {
  score: number | null;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
  icon: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = score !== null ? score / 100 : 0;
  const dashLen = pct * circ;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ '--ring-color': color } as React.CSSProperties}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} />
          <circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${dashLen} ${circ}`}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
          <text x={size/2} y={size/2 - 4} textAnchor="middle" fill="white" fontSize={size > 80 ? 28 : 20} fontWeight="bold">
            {score !== null ? score : '—'}
          </text>
          {size > 80 && (
            <text x={size/2} y={size/2 + 14} textAnchor="middle" fill="#64748b" fontSize="10">
              /100
            </text>
          )}
        </svg>
      </div>
      <div className="sec-ring-label">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
    </div>
  );
}

// ── Mini Ring ────────────────────────────────────────────────────
function MiniRing({ score, size = 60, color, label }: {
  score: number | null; size?: number; color: string; label: string;
}) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dashLen = score !== null ? (score / 100) * circ : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={3} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round"
          strokeDasharray={`${dashLen} ${circ}`} transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dasharray 1s ease' }} />
        <text x={size/2} y={size/2 + 3} textAnchor="middle" fill={color} fontSize={size > 50 ? 16 : 13} fontWeight="bold">
          {score ?? '—'}
        </text>
      </svg>
      <div className="sec-ring-label" style={{ fontSize: 10 }}>
        <span>{label}</span>
      </div>
    </div>
  );
}

// ── Tab Type ─────────────────────────────────────────────────────
type TabKey = 'overview' | 'aegis' | 'viper' | 'watchtower' | 'sentinel' | 'network' | 'activity' | 'permissions' | 'pending';

// ── Main Component ───────────────────────────────────────────────
export default function SecurityDashboard() {
  // ── State ──
  const [showWelcome, setShowWelcome] = useState(!hasCompletedSecurityWelcome());
  const [showTour, setShowTour] = useState(false);

  // When welcome finishes, kick off the tour if it hasn't been taken yet.
  // Using an effect (not initial state) because welcome completes asynchronously.
  useEffect(() => {
    if (!showWelcome && !hasCompletedSecurityTour() && hasCompletedSecurityWelcome()) {
      setShowTour(true);
    }
  }, [showWelcome]);
  const [overview, setOverview] = useState<RiskOverview | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [prompts, setPrompts] = useState<PermissionPrompt[]>([]);
  const [profiles, setProfiles] = useState<Record<string, AgentProfile>>({});
  const [aegisRuns, setAegisRuns] = useState<AuditRun[]>([]);
  const [aegisFindings, setAegisFindings] = useState<AuditFinding[]>([]);
  const [viperScans, setViperScans] = useState<VulnScan[]>([]);
  const [viperFindings, setViperFindings] = useState<VulnFinding[]>([]);
  const [alerts, setAlerts] = useState<SiemAlert[]>([]);
  const [quarantined, setQuarantined] = useState<QuarantineStatus[]>([]);
  const [quarantineHistory, setQuarantineHistory] = useState<QuarantineEvent[]>([]);

  // ── Network Discovery (Phase 9) ──
  const [networkDevices, setNetworkDevices] = useState<NetworkDevice[]>([]);
  const [networkMap, setNetworkMap] = useState<NetworkMapData | null>(null);
  const [networkEvents, setNetworkEvents] = useState<NetworkEvent[]>([]);
  const [networkScanning, setNetworkScanning] = useState(false);
  const [networkEditing, setNetworkEditing] = useState<string | null>(null);
  const [networkNickname, setNetworkNickname] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [scanning, setScanning] = useState<'aegis' | 'viper' | null>(null);
  const [aegisCategory, setAegisCategory] = useState('');
  const [aegisSeverity, setAegisSeverity] = useState('');
  const [viperCategory, setViperCategory] = useState('');
  const [viperSeverity, setViperSeverity] = useState('');
  const [toasts, setToasts] = useState<Array<{ id: string; title: string; body: string; key: string }>>([]);

  // Selected scan/run
  const [selectedAegisRun, setSelectedAegisRun] = useState<AuditRun | null>(null);
  const [selectedViperScan, setSelectedViperScan] = useState<VulnScan | null>(null);

  // ── Load All Data ──
  const load = useCallback(async () => {
    try {
      const [ev, pr, ov, aRuns, vScans, aAlerts, qAll, qHistory, netDevices, netMap, netEvents] = await Promise.all([
        invokeTimeout<SecurityEvent[]>('security_get_events', { limit: 30 }).catch(() => [] as SecurityEvent[]),
        invokeTimeout<PermissionPrompt[]>('security_get_pending_prompts', {}).catch(() => [] as PermissionPrompt[]),
        invokeTimeout<RiskOverview>('siem_get_risk_overview').catch(() => null as RiskOverview | null),
        invokeTimeout<AuditRun[]>('aegis_get_runs', { limit: 10 }).catch(() => [] as AuditRun[]),
        invokeTimeout<VulnScan[]>('viper_get_scans', { limit: 10 }).catch(() => [] as VulnScan[]),
        invokeTimeout<SiemAlert[]>('siem_get_alerts', { status: null, limit: 30 }).catch(() => [] as SiemAlert[]),
        getAllQuarantined().catch(() => [] as QuarantineStatus[]),
        getQuarantineHistory(undefined, 50).catch(() => [] as QuarantineEvent[]),
        networkGetDevices().catch(() => [] as NetworkDevice[]),
        networkGetMap().catch(() => null as NetworkMapData | null),
        networkGetEvents(30).catch(() => [] as NetworkEvent[]),
      ]);

      setEvents(ev);
      setPrompts(pr);
      setOverview(ov);
      setAegisRuns(aRuns);
      setViperScans(vScans);
      setAlerts(aAlerts);
      setQuarantined(qAll);
      setQuarantineHistory(qHistory);
      setNetworkDevices(netDevices);
      setNetworkMap(netMap);
      setNetworkEvents(netEvents);

      // Auto-select latest run/scan
      if (aRuns.length > 0 && !selectedAegisRun) setSelectedAegisRun(aRuns[0]);
      if (vScans.length > 0 && !selectedViperScan) setSelectedViperScan(vScans[0]);

      // Load Aegis findings for selected run
      if (aRuns.length > 0) {
        const run = selectedAegisRun ?? aRuns[0];
        const findings = await invokeTimeout<AuditFinding[]>('aegis_get_findings', { runId: run.id, category: null }).catch(() => [] as AuditFinding[]);
        setAegisFindings(findings);
        setSelectedAegisRun(run);
      }

      // Load Viper findings for selected scan
      if (vScans.length > 0) {
        const scan = selectedViperScan ?? vScans[0];
        const findings = await invokeTimeout<VulnFinding[]>('viper_get_findings', { scanId: scan.id, category: null }).catch(() => [] as VulnFinding[]);
        setViperFindings(findings);
        setSelectedViperScan(scan);
      }

      // Load agent profiles
      const agentIds = [...new Set([...ev.map(e => e.agent_id), ...pr.map(p => p.agent_id)])];
      const profilesMap: Record<string, AgentProfile> = {};
      for (const id of agentIds) {
        try {
          const profile = await invokeTimeout<AgentProfile>('security_get_profile', { agentId: id });
          profilesMap[id] = profile;
        } catch { /* skip */ }
      }
      setProfiles(profilesMap);
    } catch (err: any) {
      console.error('[Security] Load failed:', err);
      setLoadError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }, [selectedAegisRun, selectedViperScan]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  // Real-time events
  useEffect(() => {
    const unlisten = listen('security:event', (event) => {
      const newEvent = event.payload as SecurityEvent;
      setEvents(prev => [newEvent, ...prev.slice(0, 49)]);
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  // Real-time permission prompts
  useEffect(() => {
    const unlisten = listen<{ title: string; body: string; timestamp: string }>(
      'security:permission_prompt',
      (event) => {
        const toast = { id: Date.now().toString(), title: event.payload.title, body: event.payload.body, key: event.payload.timestamp };
        setToasts(prev => {
          if (prev.some(t => t.key === toast.key)) return prev;
          return [...prev, toast];
        });
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toast.id)), 10000);
        setActiveTab('pending');
        load();
      }
    );
    return () => { unlisten.then(fn => fn()); };
  }, [load]);

  // ── Handlers ──
  const handlePrompt = async (id: string, decision: 'allow_once' | 'allow_always' | 'deny_once' | 'deny_always') => {
    try {
      await invokeTimeout('security_resolve_prompt', { promptId: id, decision });
      setPrompts(prev => prev.filter(p => p.id !== id));
    } catch (err) { console.error('[Security] Prompt resolution failed:', err); }
  };

  const handleAlertAction = async (alertId: string, action: 'acknowledge' | 'resolve' | 'dismiss') => {
    try {
      const cmd = 'siem_' + action + '_alert';
      await invokeTimeout(cmd, { alertId });
      setAlerts(prev => prev.map(a =>
        a.id === alertId
          ? { ...a, status: action === 'acknowledge' ? 'acknowledged' : action === 'resolve' ? 'resolved' : 'dismissed' }
          : a
      ));
    } catch (err) { console.error('[Security] Alert action failed:', err); }
  };

  const handleRunScan = async (type: 'aegis' | 'viper', scanType: 'full' | 'quick') => {
    setScanning(type);
    try {
      if (type === 'aegis') {
        await invokeTimeout('aegis_run_audit', { runType: scanType });
        const runs = await invokeTimeout<AuditRun[]>('aegis_get_runs', { limit: 1 });
        if (runs.length > 0) {
          setSelectedAegisRun(runs[0]);
          const findings = await invokeTimeout<AuditFinding[]>('aegis_get_findings', { runId: runs[0].id, category: null });
          setAegisFindings(findings);
        }
        const allRuns = await invokeTimeout<AuditRun[]>('aegis_get_runs', { limit: 10 });
        setAegisRuns(allRuns);
      } else {
        await invokeTimeout('viper_run_scan', { scanType });
        const scans = await invokeTimeout<VulnScan[]>('viper_get_scans', { limit: 1 });
        if (scans.length > 0) {
          setSelectedViperScan(scans[0]);
          const findings = await invokeTimeout<VulnFinding[]>('viper_get_findings', { scanId: scans[0].id, category: null });
          setViperFindings(findings);
        }
        const allScans = await invokeTimeout<VulnScan[]>('viper_get_scans', { limit: 10 });
        setViperScans(allScans);
      }
      const ov = await invokeTimeout<RiskOverview>('siem_get_risk_overview').catch(() => null);
      if (ov) setOverview(ov);
    } catch (err) { console.error('[Security] Scan failed:', err); }
    finally { setScanning(null); }
  };

  // ── Derived ──
  const pendingCount = prompts.length;
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const latestAegis = selectedAegisRun ?? aegisRuns[0] ?? null;
  const latestViper = selectedViperScan ?? viperScans[0] ?? null;

  const filteredAegisFindings = aegisFindings
    .filter(f => !aegisCategory || f.category === aegisCategory)
    .filter(f => !aegisSeverity || f.severity === aegisSeverity);

  const filteredViperFindings = viperFindings
    .filter(f => !viperCategory || f.category === viperCategory)
    .filter(f => !viperSeverity || f.severity === viperSeverity);

  const aegisByCategory = aegisFindings.reduce((acc, f) => {
    if (!acc[f.category]) acc[f.category] = { pass: 0, warn: 0, critical: 0, total: 0 };
    acc[f.category].total++;
    if (f.severity === 'pass') acc[f.category].pass++;
    else if (f.severity === 'warning') acc[f.category].warn++;
    else if (f.severity === 'critical') acc[f.category].critical++;
    return acc;
  }, {} as Record<string, { pass: number; warn: number; critical: number; total: number }>);

  const viperByCategory = viperFindings.reduce((acc, f) => {
    if (!acc[f.category]) acc[f.category] = { pass: 0, warn: 0, critical: 0, total: 0 };
    acc[f.category].total++;
    if (f.severity === 'pass') acc[f.category].pass++;
    else if (f.severity === 'warning') acc[f.category].warn++;
    else if (f.severity === 'critical') acc[f.category].critical++;
    return acc;
  }, {} as Record<string, { pass: number; warn: number; critical: number; total: number }>);

  // ── Welcome + Tour ──
  if (showWelcome) {
    return (
      <SecurityWelcome onComplete={() => setShowWelcome(false)} />
    );
  }
  if (showTour) {
    return (
      <SecurityTour onComplete={() => setShowTour(false)} />
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="sec-app">
        <div className="sec-bg" />
        <div className="sec-grid" />
        <div className="sec-loading">
          <span className="sec-loading-icon">🛡️</span>
          <span className="sec-loading-text">Initializing security systems…</span>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (loadError && !overview) {
    return (
      <div className="sec-app">
        <div className="sec-bg" />
        <div className="sec-grid" />
        <div className="sec-content">
          <div className="sec-error">
            <span style={{ fontSize: 52 }}>⚠️</span>
            <h3 className="sec-error-title">Security Hub Unavailable</h3>
            <p className="sec-error-text">{loadError}</p>
            <p className="sec-error-hint">Make sure the Conflux engine is running with the latest build.</p>
            <button className="sec-btn sec-btn--primary" onClick={() => { setLoadError(null); setLoading(true); load(); }}>
              🔄 Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const ovScore = overview?.overall_score ?? (latestAegis?.overall_score ?? null);
  const aegisScore = overview?.aegis_score ?? (latestAegis?.overall_score ?? null);
  const viperRisk = overview?.viper_risk ?? (latestViper?.risk_score ?? null);
  const agentDefense = overview?.agent_defense ?? null;
  const alertCount = overview?.active_alerts ?? activeAlerts.length;

  return (
    <div className="sec-app">
      <div className="sec-bg" />
      <div className="sec-grid" />

      {/* Toast Notifications */}
      {toasts.map(toast => (
        <div key={toast.id} className="sec-toast">
          <div className="sec-toast-title">🔔 {toast.title}</div>
          <div className="sec-toast-body">{toast.body}</div>
          <div className="sec-toast-actions">
            <button className="sec-toast-btn" style={{ background: '#22c55e' }}
              onClick={() => { setActiveTab('pending'); setToasts(prev => prev.filter(t => t.id !== toast.id)); }}>
              Review Now
            </button>
            <button className="sec-toast-btn" style={{ background: '#1e293b' }}
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}>
              Later
            </button>
          </div>
        </div>
      ))}

      <div className="sec-content">

        {/* ── Header ── */}
        <div className="sec-header">
          <div className="sec-header-left">
            <div className="sec-header-icon">🛡️</div>
            <div>
              <h1 className="sec-title">Security</h1>
              <p className="sec-subtitle">Aegis · Viper · Watchtower — your complete defense system</p>
            </div>
          </div>
          <div className="sec-header-right">
            <div className="sec-status-badge sec-status-badge--active">
              <div className="sec-status-dot" />
              Monitoring
            </div>
            {pendingCount > 0 && (
              <button className="sec-alert-badge" onClick={() => setActiveTab('pending')}>
                🔔 {pendingCount} request{pendingCount !== 1 ? 's' : ''} pending
              </button>
            )}
          </div>
        </div>

        {/* ── Hero Section ── */}
        <div className="sec-hero">
          <div className="sec-hero-bg">
            <div className="sec-radar-sweep" />
            <div className="sec-hero-grid" />
          </div>
          <div className="sec-hero-content">
            {/* Main score */}
            <ScoreRing
              score={ovScore}
              size={130}
              strokeWidth={10}
              color={scoreColor(ovScore)}
              label="Overall Score"
              icon="🔒"
            />

            {/* Satellite rings */}
            <div className="sec-satellite-stats">
              <MiniRing score={aegisScore} size={70} color="#22c55e" label="Aegis" />
              <MiniRing score={viperRisk !== null ? 100 - viperRisk : null} size={70} color="#ef4444" label="Viper" />
              <MiniRing score={agentDefense} size={70} color="#8b5cf6" label="Agents" />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 70, height: 70, borderRadius: '50%',
                  background: alertCount > 0 ? '#ef444414' : '#020617',
                  border: `4px solid ${alertCount > 0 ? '#ef4444' : '#1e293b'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 26, fontWeight: 800, color: alertCount > 0 ? '#ef4444' : '#475569' }}>
                    {alertCount}
                  </span>
                </div>
                <div className="sec-ring-label" style={{ fontSize: 10 }}>🔔 Alerts</div>
              </div>
            </div>

            {/* Score info */}
            <div className="sec-score-info">
              <div className="sec-score-label" style={{ color: scoreColor(ovScore) }}>
                {ovScore !== null ? scoreLabel(ovScore) : 'Analyzing security posture…'}
              </div>
              {overview && (
                <div className="sec-score-meta">
                  {overview.events_24h} events · {overview.correlations_24h} correlations · last 24h
                </div>
              )}
              {ovScore !== null && ovScore >= 75 && (
                <div className="sec-score-good">✨ System is well protected</div>
              )}
              {(overview?.critical_alerts ?? 0) > 0 && (
                <div className="sec-score-alert">
                  🚨 {overview!.critical_alerts} critical alert{overview!.critical_alerts !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Trend */}
            {overview && (
              <div
                className="sec-trend-badge"
                style={{
                  background: overview.trend === 'improving' ? '#22c55e14' : overview.trend === 'declining' ? '#ef444414' : '#3b82f618',
                  color: overview.trend === 'improving' ? '#22c55e' : overview.trend === 'declining' ? '#ef4444' : '#3b82f6',
                }}
              >
                {overview.trend === 'improving' ? '📈' : overview.trend === 'declining' ? '📉' : '➡️'} {overview.trend}
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="sec-tabs">
          {([
            { key: 'overview', label: '📊 Overview', count: null },
            { key: 'aegis', label: '🛡️ Aegis', count: latestAegis?.overall_score ?? null },
            { key: 'viper', label: '🐍 Viper', count: latestViper?.risk_score ?? null },
            { key: 'watchtower', label: '👁️ Watchtower', count: activeAlerts.length },
            { key: 'sentinel', label: '⚔️ Sentinel', count: quarantined.length },
            { key: 'network', label: '🌐 Network', count: networkDevices.filter(d => d.is_online).length },
            { key: 'activity', label: '📋 Activity', count: events.length },
            { key: 'permissions', label: '🔐 Permissions', count: Object.keys(profiles).length },
            { key: 'pending', label: '🔔 Pending', count: pendingCount },
          ] as Array<{ key: TabKey; label: string; count: number | null }>).map(tab => (
            <button
              key={tab.key}
              className={`sec-tab ${activeTab === tab.key ? 'sec-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className="sec-tab-count">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div style={{ animation: 'secSlideIn 0.3s ease-out' }}>

          {/* ══ Overview Tab ══ */}
          {activeTab === 'overview' && <OverviewTab overview={overview} events={events} />}

          {/* ══ Aegis Tab ══ */}
          {activeTab === 'aegis' && (
            <AegisTab
              runs={aegisRuns}
              selectedRun={selectedAegisRun}
              findings={aegisFindings}
              filteredFindings={filteredAegisFindings}
              scanning={scanning === 'aegis'}
              aegisByCategory={aegisByCategory}
              aegisCategory={aegisCategory}
              aegisSeverity={aegisSeverity}
              onSelectRun={(run) => {
                setSelectedAegisRun(run);
                invokeTimeout<AuditFinding[]>('aegis_get_findings', { runId: run.id, category: null })
                  .then(setAegisFindings).catch(() => setAegisFindings([]));
              }}
              onFilterCategory={setAegisCategory}
              onFilterSeverity={setAegisSeverity}
              onRunScan={handleRunScan}
            />
          )}

          {/* ══ Viper Tab ══ */}
          {activeTab === 'viper' && (
            <ViperTab
              scans={viperScans}
              selectedScan={selectedViperScan}
              findings={viperFindings}
              filteredFindings={filteredViperFindings}
              scanning={scanning === 'viper'}
              viperByCategory={viperByCategory}
              viperCategory={viperCategory}
              viperSeverity={viperSeverity}
              onSelectScan={(scan) => {
                setSelectedViperScan(scan);
                invokeTimeout<VulnFinding[]>('viper_get_findings', { scanId: scan.id, category: null })
                  .then(setViperFindings).catch(() => setViperFindings([]));
              }}
              onFilterCategory={setViperCategory}
              onFilterSeverity={setViperSeverity}
              onRunScan={handleRunScan}
            />
          )}

          {/* ══ Watchtower Tab ══ */}
          {activeTab === 'watchtower' && (
            <WatchtowerTab
              alerts={alerts}
              onAlertAction={handleAlertAction}
              onRunCorrelation={async () => {
                try {
                  await invokeTimeout('siem_run_correlation');
                  const freshAlerts = await invokeTimeout<SiemAlert[]>('siem_get_alerts', { status: null, limit: 30 });
                  setAlerts(freshAlerts);
                } catch (err) { console.error('[SIEM] Correlation failed:', err); }
              }}
            />
          )}

          {/* ══ Sentinel Tab ══ */}
          {activeTab === 'sentinel' && (
            <SentinelTab
              quarantined={quarantined}
              history={quarantineHistory}
              onEscalate={async (agentId, level, reason) => {
                await quarantineEscalate(agentId, level, reason);
                const [qAll, qHist] = await Promise.all([
                  getAllQuarantined().catch(() => []),
                  getQuarantineHistory(undefined, 50).catch(() => []),
                ]);
                setQuarantined(qAll);
                setQuarantineHistory(qHist);
              }}
              onRelease={async (agentId) => {
                await quarantineRelease(agentId);
                const [qAll, qHist] = await Promise.all([
                  getAllQuarantined().catch(() => []),
                  getQuarantineHistory(undefined, 50).catch(() => []),
                ]);
                setQuarantined(qAll);
                setQuarantineHistory(qHist);
              }}
              onRunAutoEscalation={async () => {
                await invokeTimeout('quarantine_run_auto_escalation');
                const [qAll, qHist] = await Promise.all([
                  getAllQuarantined().catch(() => []),
                  getQuarantineHistory(undefined, 50).catch(() => []),
                ]);
                setQuarantined(qAll);
                setQuarantineHistory(qHist);
              }}
            />
          )}

          {/* ══ Network Map Tab ══ */}
          {activeTab === 'network' && (
            <NetworkMapTab
              devices={networkDevices}
              networkMap={networkMap}
              events={networkEvents}
              scanning={networkScanning}
              editingId={networkEditing}
              nickname={networkNickname}
              onScan={async () => {
                setNetworkScanning(true);
                try {
                  const [result, devs, nMap, nEv] = await Promise.all([
                    networkScan().catch(() => null),
                    networkGetDevices().catch(() => [] as NetworkDevice[]),
                    networkGetMap().catch(() => null),
                    networkGetEvents(30).catch(() => [] as NetworkEvent[]),
                  ]);
                  setNetworkDevices(devs);
                  setNetworkMap(nMap);
                  setNetworkEvents(nEv);
                } finally {
                  setNetworkScanning(false);
                }
              }}
              onRename={(deviceId: string) => {
                setNetworkEditing(deviceId);
                const dev = networkDevices.find(d => d.id === deviceId);
                setNetworkNickname(dev?.nickname || '');
              }}
              onRenameSave={async (deviceId: string) => {
                await networkRenameDevice(deviceId, networkNickname);
                const devs = await networkGetDevices().catch(() => [] as NetworkDevice[]);
                setNetworkDevices(devs);
                setNetworkEditing(null);
                setNetworkNickname('');
              }}
              onRenameCancel={() => {
                setNetworkEditing(null);
                setNetworkNickname('');
              }}
              onNicknameChange={setNetworkNickname}
              onMarkKnown={async (deviceId: string) => {
                await networkMarkKnown(deviceId);
                const devs = await networkGetDevices().catch(() => [] as NetworkDevice[]);
                setNetworkDevices(devs);
              }}
              onDelete={async (deviceId: string) => {
                await networkDeleteDevice(deviceId);
                const devs = await networkGetDevices().catch(() => [] as NetworkDevice[]);
                setNetworkDevices(devs);
              }}
            />
          )}

          {/* ══ Activity Tab ══ */}
          {activeTab === 'activity' && <ActivityTab events={events} />}

          {/* ══ Permissions Tab ══ */}
          {activeTab === 'permissions' && <PermissionsTab profiles={profiles} />}

          {/* ══ Pending Tab ══ */}
          {activeTab === 'pending' && (
            <PendingTab prompts={prompts} onPrompt={handlePrompt} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────────
function OverviewTab({ overview, events }: { overview: RiskOverview | null; events: SecurityEvent[] }) {
  return (
    <div>
      {/* Top Risks */}
      {overview && overview.top_risks.length > 0 && (
        <div className="sec-section">
          <h3 className="sec-section-title">⚡ Top Risks</h3>
          <div className="sec-risk-list">
            {overview.top_risks.map((risk, i) => (
              <div key={i} className="sec-risk-item">
                <span className="sec-risk-num">{i + 1}.</span>
                <span className="sec-risk-text">{risk}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {overview && (
        <div className="sec-section">
          <h3 className="sec-section-title">📈 Last 24 Hours</h3>
          <div className="sec-stats-grid">
            <div className="sec-stat-card">
              <div className="sec-stat-card-num" style={{ color: '#3b82f6' }}>{overview.events_24h}</div>
              <div className="sec-stat-card-label">Events</div>
            </div>
            <div className="sec-stat-card">
              <div className="sec-stat-card-num" style={{ color: '#8b5cf6' }}>{overview.correlations_24h}</div>
              <div className="sec-stat-card-label">Correlations</div>
            </div>
            <div className="sec-stat-card">
              <div className="sec-stat-card-num" style={{ color: '#ef4444' }}>{overview.critical_alerts}</div>
              <div className="sec-stat-card-label">Critical</div>
            </div>
            <div className="sec-stat-card">
              <div className="sec-stat-card-num" style={{ color: '#f59e0b' }}>{overview.active_alerts}</div>
              <div className="sec-stat-card-label">Active Alerts</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Critical Events */}
      {events.filter(e => e.category === 'critical').length > 0 && (
        <div className="sec-section">
          <h3 className="sec-section-title">🚨 Recent Critical Events</h3>
          <div className="sec-event-list">
            {events.filter(e => e.category === 'critical').slice(0, 5).map(e => (
              <div key={e.id} className="sec-event-row" style={{ borderLeft: '3px solid #ef4444' }}>
                <span className="sec-event-icon">{eventIcon(e.event_type)}</span>
                <div className="sec-event-body">
                  <div>
                    <span className="sec-event-agent">{e.agent_id}</span>
                    <span className="sec-event-action">{eventLabel(e.event_type)}</span>
                  </div>
                  {e.target && <div className="sec-event-target">{truncate(e.target, 60)}</div>}
                </div>
                <span className="sec-event-time">{formatAge(e.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!overview && events.filter(e => e.category === 'critical').length === 0 && (
        <div className="sec-section">
          <div className="sec-empty">
            <span className="sec-empty-icon">✨</span>
            <h3 className="sec-empty-title">All Clear</h3>
            <p className="sec-empty-text">No critical issues detected. Your security posture looks solid.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Aegis Tab ────────────────────────────────────────────────────
function AegisTab({ runs, selectedRun, findings, filteredFindings, scanning, aegisByCategory, aegisCategory, aegisSeverity, onSelectRun, onFilterCategory, onFilterSeverity, onRunScan }: {
  runs: AuditRun[]; selectedRun: AuditRun | null; findings: AuditFinding[];
  filteredFindings: AuditFinding[]; scanning: boolean;
  aegisByCategory: Record<string, { pass: number; warn: number; critical: number; total: number }>;
  aegisCategory: string; aegisSeverity: string;
  onSelectRun: (run: AuditRun) => void;
  onFilterCategory: (v: string) => void;
  onFilterSeverity: (v: string) => void;
  onRunScan: (type: 'aegis' | 'viper', scanType: 'full' | 'quick') => void;
}) {
  const score = selectedRun?.overall_score ?? null;

  return (
    <div>
      {/* Controls */}
      <div className="sec-section" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 className="sec-section-title" style={{ marginBottom: 2 }}>🛡️ Aegis — System Audit</h3>
            <p className="sec-section-sub">Blue Team Guardian — checks for unlocked doors and weak settings</p>
          </div>
          <div className="sec-scan-types">
            <button className="sec-btn" onClick={() => onRunScan('aegis', 'quick')} disabled={scanning}>
              ⚡ Quick Scan
            </button>
            <button className="sec-btn sec-btn--primary" onClick={() => onRunScan('aegis', 'full')} disabled={scanning}>
              {scanning ? '🔄 Scanning…' : '🔍 Full System Check'}
            </button>
          </div>
        </div>
        {scanning && (
          <div className="sec-scanning-bar" style={{ marginTop: 14 }}>
            <div className="sec-scanning-line" />
          </div>
        )}
      </div>

      {!selectedRun ? (
        <div className="sec-no-scan">
          <span className="sec-no-scan-icon">🛡️</span>
          <h3 className="sec-no-scan-title">No Scans Yet</h3>
          <p className="sec-no-scan-text">Aegis checks your system for security gaps — firewall settings, open ports, outdated software, and more.</p>
          <button className="sec-btn sec-btn--primary" onClick={() => onRunScan('aegis', 'quick')}>
            🔍 Run Your First Scan
          </button>
        </div>
      ) : (
        <>
          {/* Score + Stats Row */}
          <div className="sec-section" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
              <ScoreRing score={score} size={100} strokeWidth={8} color={scoreColor(score)} label="Score" icon="🛡️" />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                  <span className="sec-mini-stat" style={{ color: '#22c55e' }}>✓ {selectedRun.pass_count}</span>
                  {selectedRun.warn_count > 0 && <span className="sec-mini-stat" style={{ color: '#f59e0b' }}>⚠ {selectedRun.warn_count}</span>}
                  {selectedRun.critical_count > 0 && <span className="sec-mini-stat" style={{ color: '#ef4444' }}>🚨 {selectedRun.critical_count}</span>}
                </div>
                <div className="sec-score-meta">
                  {selectedRun.total_checks} checks · {selectedRun.run_type} · {formatAge(selectedRun.started_at)}
                </div>
              </div>
            </div>

            {/* Category bars */}
            <div style={{ marginTop: 16 }}>
              {Object.entries(AEGIS_META).map(([key, meta]) => {
                const stats = aegisByCategory[key];
                if (!stats) return null;
                const pPct = stats.total > 0 ? (stats.pass / stats.total) * 100 : 0;
                const wPct = stats.total > 0 ? (stats.warn / stats.total) * 100 : 0;
                const cPct = stats.total > 0 ? (stats.critical / stats.total) * 100 : 0;
                return (
                  <div key={key} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13 }}>{meta.icon}</span>
                      <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>{meta.label}</span>
                      <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>
                        {stats.pass}✓ {stats.warn > 0 && <span style={{ color: '#f59e0b' }}>{stats.warn}⚠</span>} {stats.critical > 0 && <span style={{ color: '#ef4444' }}>{stats.critical}🚨</span>}
                      </span>
                    </div>
                    <div style={{ height: 5, background: '#1e293b', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                      {pPct > 0 && <div style={{ width: pPct + '%', background: '#22c55e', transition: 'width 0.6s ease' }} />}
                      {wPct > 0 && <div style={{ width: wPct + '%', background: '#f59e0b', transition: 'width 0.6s ease' }} />}
                      {cPct > 0 && <div style={{ width: cPct + '%', background: '#ef4444', transition: 'width 0.6s ease' }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Findings */}
          {filteredFindings.length > 0 && (
            <div className="sec-section">
              <div className="sec-filter-row">
                <select className="sec-filter-select" value={aegisCategory} onChange={e => onFilterCategory(e.target.value)}>
                  <option value="">All categories</option>
                  {Object.entries(AEGIS_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
                <select className="sec-filter-select" value={aegisSeverity} onChange={e => onFilterSeverity(e.target.value)}>
                  <option value="">All severities</option>
                  <option value="critical">🚨 Critical</option>
                  <option value="warning">⚠️ Warning</option>
                  <option value="info">ℹ️ Info</option>
                  <option value="pass">✅ Pass</option>
                </select>
              </div>
              <div className="sec-finding-list">
                {filteredFindings.map(f => <AegisFindingCard key={f.id} finding={f} />)}
              </div>
            </div>
          )}

          {/* History */}
          <div className="sec-section">
            <h3 className="sec-section-title">📜 Scan History</h3>
            <div className="sec-history-list">
              {runs.map(run => (
                <div
                  key={run.id}
                  className={`sec-history-row ${selectedRun?.id === run.id ? 'sec-history-row--active' : ''}`}
                  onClick={() => onSelectRun(run)}
                >
                  <div className="sec-history-left">
                    <span className="sec-history-icon">{run.run_type === 'full' ? '🔍' : '⚡'}</span>
                    <div>
                      <div className="sec-history-type">{run.run_type === 'full' ? 'Full System Check' : 'Quick Scan'}</div>
                      <div className="sec-history-time">{formatAge(run.started_at)}</div>
                    </div>
                  </div>
                  <div className="sec-history-stats">
                    <span style={{ color: '#22c55e' }}>✓{run.pass_count}</span>
                    {run.warn_count > 0 && <span style={{ color: '#f59e0b' }}>⚠{run.warn_count}</span>}
                    {run.critical_count > 0 && <span style={{ color: '#ef4444' }}>🚨{run.critical_count}</span>}
                  </div>
                  <div className="sec-history-score" style={{ color: scoreColor(run.overall_score) }}>
                    {run.overall_score ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Aegis Finding Card ───────────────────────────────────────────
function AegisFindingCard({ finding }: { finding: AuditFinding }) {
  const [expanded, setExpanded] = useState(false);
  const sm = severityMeta(finding.severity);
  const catMeta = AEGIS_META[finding.category] ?? { icon: '📋', label: finding.category };

  return (
    <div className="sec-finding-card" style={{ borderLeft: `3px solid ${sm.color}` }}>
      <div className="sec-finding-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="sec-finding-card-left">
          <span className="sec-finding-card-icon">{sm.icon}</span>
          <div>
            <div className="sec-finding-card-title">{finding.title}</div>
            <div className="sec-finding-card-meta">{catMeta.icon} {catMeta.label} · <span style={{ color: sm.color }}>{sm.icon}</span></div>
          </div>
        </div>
        <span className="sec-expand-icon">{expanded ? '▼' : '▶'}</span>
      </div>
      {expanded && (
        <div className="sec-finding-card-body">
          <p className="sec-finding-desc"><strong style={{ color: '#94a3b8' }}>What this means:</strong><br />{finding.description}</p>
          {finding.recommendation && (
            <div className="sec-finding-rec">
              <div style={{ fontWeight: 600, marginBottom: 4 }}>💡 What to do:</div>
              {finding.recommendation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Viper Tab ────────────────────────────────────────────────────
function ViperTab({ scans, selectedScan, findings, filteredFindings, scanning, viperByCategory, viperCategory, viperSeverity, onSelectScan, onFilterCategory, onFilterSeverity, onRunScan }: {
  scans: VulnScan[]; selectedScan: VulnScan | null; findings: VulnFinding[];
  filteredFindings: VulnFinding[]; scanning: boolean;
  viperByCategory: Record<string, { pass: number; warn: number; critical: number; total: number }>;
  viperCategory: string; viperSeverity: string;
  onSelectScan: (scan: VulnScan) => void;
  onFilterCategory: (v: string) => void;
  onFilterSeverity: (v: string) => void;
  onRunScan: (type: 'aegis' | 'viper', scanType: 'full' | 'quick') => void;
}) {
  const risk = selectedScan?.risk_score ?? null;

  return (
    <div>
      {/* Controls */}
      <div className="sec-section" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 className="sec-section-title" style={{ marginBottom: 2 }}>🐍 Viper — Vulnerability Scan</h3>
            <p className="sec-section-sub">Red Team Operator — hunts for weaknesses before attackers do</p>
          </div>
          <div className="sec-scan-types">
            <button className="sec-btn" onClick={() => onRunScan('viper', 'quick')} disabled={scanning}>
              ⚡ Quick Scan
            </button>
            <button className="sec-btn sec-btn--danger" onClick={() => onRunScan('viper', 'full')} disabled={scanning}>
              {scanning ? '🔄 Scanning…' : '🐍 Full Vulnerability Scan'}
            </button>
          </div>
        </div>
        {scanning && (
          <div className="sec-scanning-bar" style={{ marginTop: 14 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '40%', height: '100%', background: 'linear-gradient(90deg, transparent, #ef4444, transparent)', animation: 'secScanLine 1.5s ease-in-out infinite' }} />
          </div>
        )}
      </div>

      {!selectedScan ? (
        <div className="sec-no-scan">
          <span className="sec-no-scan-icon">🐍</span>
          <h3 className="sec-no-scan-title">No Scans Yet</h3>
          <p className="sec-no-scan-text">Viper hunts for weaknesses attackers could exploit — browser passwords, risky settings, exposed secrets, and more.</p>
          <button className="sec-btn sec-btn--danger" onClick={() => onRunScan('viper', 'quick')}>
            🐍 Run Your First Scan
          </button>
        </div>
      ) : (
        <>
          {/* Score + Stats Row */}
          <div className="sec-section" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
              <ScoreRing score={risk} size={100} strokeWidth={8} color={riskColor(risk)} label="Risk Score" icon="🐍" />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                  <span className="sec-mini-stat" style={{ color: '#22c55e' }}>✓ {selectedScan.pass_count}</span>
                  <span className="sec-mini-stat" style={{ color: '#3b82f6' }}>ℹ {selectedScan.info_count}</span>
                  {selectedScan.warn_count > 0 && <span className="sec-mini-stat" style={{ color: '#f59e0b' }}>⚠ {selectedScan.warn_count}</span>}
                  {selectedScan.critical_count > 0 && <span className="sec-mini-stat" style={{ color: '#ef4444' }}>🚨 {selectedScan.critical_count}</span>}
                </div>
                <div className="sec-score-meta">
                  {selectedScan.total_checks} checks · {selectedScan.scan_type} · {formatAge(selectedScan.started_at)}
                </div>
              </div>
            </div>

            {/* Category bars */}
            <div style={{ marginTop: 16 }}>
              {Object.entries(VIPER_META).map(([key, meta]) => {
                const stats = viperByCategory[key];
                if (!stats) return null;
                const pPct = stats.total > 0 ? (stats.pass / stats.total) * 100 : 0;
                const wPct = stats.total > 0 ? (stats.warn / stats.total) * 100 : 0;
                const cPct = stats.total > 0 ? (stats.critical / stats.total) * 100 : 0;
                return (
                  <div key={key} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13 }}>{meta.icon}</span>
                      <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>{meta.label}</span>
                      <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>
                        {stats.pass}✓ {stats.warn > 0 && <span style={{ color: '#f59e0b' }}>{stats.warn}⚠</span>} {stats.critical > 0 && <span style={{ color: '#ef4444' }}>{stats.critical}🚨</span>}
                      </span>
                    </div>
                    <div style={{ height: 5, background: '#1e293b', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                      {pPct > 0 && <div style={{ width: pPct + '%', background: '#22c55e', transition: 'width 0.6s ease' }} />}
                      {wPct > 0 && <div style={{ width: wPct + '%', background: '#f59e0b', transition: 'width 0.6s ease' }} />}
                      {cPct > 0 && <div style={{ width: cPct + '%', background: '#ef4444', transition: 'width 0.6s ease' }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Findings */}
          {filteredFindings.length > 0 && (
            <div className="sec-section">
              <div className="sec-filter-row">
                <select className="sec-filter-select" value={viperCategory} onChange={e => onFilterCategory(e.target.value)}>
                  <option value="">All categories</option>
                  {Object.entries(VIPER_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
                <select className="sec-filter-select" value={viperSeverity} onChange={e => onFilterSeverity(e.target.value)}>
                  <option value="">All severities</option>
                  <option value="critical">🚨 Critical</option>
                  <option value="warning">⚠️ Warning</option>
                  <option value="info">ℹ️ Info</option>
                  <option value="pass">✅ Pass</option>
                </select>
              </div>
              <div className="sec-finding-list">
                {filteredFindings.map(f => <ViperFindingCard key={f.id} finding={f} />)}
              </div>
            </div>
          )}

          {/* History */}
          <div className="sec-section">
            <h3 className="sec-section-title">📜 Scan History</h3>
            <div className="sec-history-list">
              {scans.map(scan => (
                <div
                  key={scan.id}
                  className={`sec-history-row ${selectedScan?.id === scan.id ? 'sec-history-row--active' : ''}`}
                  onClick={() => onSelectScan(scan)}
                >
                  <div className="sec-history-left">
                    <span className="sec-history-icon">{scan.scan_type === 'full' ? '🐍' : '⚡'}</span>
                    <div>
                      <div className="sec-history-type">{scan.scan_type === 'full' ? 'Full Vulnerability Scan' : 'Quick Scan'}</div>
                      <div className="sec-history-time">{formatAge(scan.started_at)}</div>
                    </div>
                  </div>
                  <div className="sec-history-stats">
                    <span style={{ color: '#22c55e' }}>✓{scan.pass_count}</span>
                    {scan.warn_count > 0 && <span style={{ color: '#f59e0b' }}>⚠{scan.warn_count}</span>}
                    {scan.critical_count > 0 && <span style={{ color: '#ef4444' }}>🚨{scan.critical_count}</span>}
                  </div>
                  <div className="sec-history-score" style={{ color: riskColor(scan.risk_score) }}>
                    {scan.risk_score ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Viper Finding Card ───────────────────────────────────────────
function ViperFindingCard({ finding }: { finding: VulnFinding }) {
  const [expanded, setExpanded] = useState(false);
  const sm = severityMeta(finding.severity);
  const catMeta = VIPER_META[finding.category] ?? { icon: '📋', label: finding.category };

  return (
    <div className="sec-finding-card" style={{ borderLeft: `3px solid ${sm.color}` }}>
      <div className="sec-finding-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="sec-finding-card-left">
          <span className="sec-finding-card-icon">{sm.icon}</span>
          <div>
            <div className="sec-finding-card-title">{finding.title}</div>
            <div className="sec-finding-card-meta">{catMeta.icon} {catMeta.label} · <span style={{ color: sm.color }}>{sm.icon}</span></div>
          </div>
        </div>
        <span className="sec-expand-icon">{expanded ? '▼' : '▶'}</span>
      </div>
      {expanded && (
        <div className="sec-finding-card-body">
          <p className="sec-finding-desc"><strong style={{ color: '#94a3b8' }}>What this means:</strong><br />{finding.description}</p>
          {finding.remediation && (
            <div className="sec-finding-rec">
              <div style={{ fontWeight: 600, marginBottom: 4 }}>🔧 How to fix it:</div>
              {finding.remediation}
            </div>
          )}
          {finding.cve_ids && finding.cve_ids.length > 0 && (
            <div className="sec-finding-cve">
              <span style={{ fontWeight: 600 }}>Related CVEs:</span>
              {finding.cve_ids.map(cve => (
                <a key={cve} href={`https://nvd.nist.gov/vuln/detail/${cve}`} target="_blank" rel="noopener noreferrer"
                  className="sec-cve-chip">{cve}</a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Watchtower Tab ───────────────────────────────────────────────
function WatchtowerTab({ alerts, onAlertAction, onRunCorrelation }: {
  alerts: SiemAlert[];
  onAlertAction: (id: string, action: 'acknowledge' | 'resolve' | 'dismiss') => void;
  onRunCorrelation: () => void;
}) {
  const [status, setStatus] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [panel, setPanel] = useState<'files' | 'processes' | 'network'>('files');
  const [filterSuspicious, setFilterSuspicious] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const s = await invokeTimeout<any>('watchtower_get_status');
      setStatus(s);
    } catch (err) { console.error('[Watchtower] status failed:', err); }
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const evts = await invokeTimeout<any[]>('watchtower_get_events', { severity: null, limit: 50, offset: 0 });
      setEvents(evts);
    } catch (err) { console.error('[Watchtower] events failed:', err); }
  }, []);

  const loadProcesses = useCallback(async () => {
    try {
      const procs = await invokeTimeout<any[]>('watchtower_get_processes', { suspicious_only: filterSuspicious });
      setProcesses(procs);
    } catch (err) { console.error('[Watchtower] processes failed:', err); }
  }, [filterSuspicious]);

  const loadConnections = useCallback(async () => {
    try {
      const conns = await invokeTimeout<any[]>('watchtower_get_connections', { suspicious_only: filterSuspicious });
      setConnections(conns);
    } catch (err) { console.error('[Watchtower] connections failed:', err); }
  }, [filterSuspicious]);

  useEffect(() => {
    loadStatus();
    loadEvents();
    loadProcesses();
    loadConnections();
  }, [loadStatus, loadEvents, loadProcesses, loadConnections]);

  const handleFullScan = async () => {
    setLoading(true);
    setScanResult(null);
    try {
      const result = await invokeTimeout<any>('watchtower_scan');
      setScanResult(`Scanned ${result.files_scanned} files, ${result.processes_snapshotted} processes, ${result.connections_tracked} connections`);
      await loadStatus();
      await loadEvents();
      await loadProcesses();
      await loadConnections();
    } catch (err) {
      setScanResult(`Scan failed: ${err}`);
    }
    setLoading(false);
  };

  const handleKillProcess = async (pid: number, name: string) => {
    if (!confirm(`Kill process "${name}" (PID ${pid})? This cannot be undone.`)) return;
    try {
      await invokeTimeout<boolean>('watchtower_kill_process', { pid });
      await loadProcesses();
    } catch (err) { console.error('[Watchtower] kill failed:', err); }
  };

  const threatColor = status?.threat_level === 'critical' ? '#ef4444'
    : status?.threat_level === 'warning' ? '#f59e0b'
    : status?.threat_level === 'elevated' ? '#3b82f6' : '#22c55e';

  return (
    <div>
      {/* ── Hero Status Bar ── */}
      <div className="sec-section" style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #0f1d32 100%)',
        border: `1px solid ${threatColor}30`,
        padding: 20,
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Live Pulse Indicator */}
            <div style={{ position: 'relative', width: 14, height: 14 }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: threatColor,
                animation: 'pulse 2s ease-in-out infinite',
              }} />
              <div style={{
                position: 'absolute', inset: -4, borderRadius: '50%',
                background: `${threatColor}30`,
                animation: 'pulse 2s ease-in-out infinite',
              }} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', letterSpacing: '0.02em' }}>
                👁️ Watchtower — Continuous Monitoring
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                Threat Level: <span style={{ color: threatColor, fontWeight: 700, textTransform: 'uppercase' }}>
                  {status?.threat_level || 'unknown'}
                </span>
                {status && (
                  <span style={{ marginLeft: 16 }}>
                    {status.event_count_24h} events (24h) · {status.baseline_count} baselines · {status.process_count} processes · {status.connection_count} connections
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="sec-btn" onClick={handleFullScan} disabled={loading} style={{
              background: loading ? '#1e293b' : '#3b82f620',
              border: `1px solid ${loading ? '#334155' : '#3b82f640'}`,
              color: loading ? '#64748b' : '#3b82f6',
            }}>
              {loading ? '⏳ Scanning...' : '🔄 Full Scan'}
            </button>
            <button className="sec-btn" onClick={onRunCorrelation} style={{
              background: '#6366f120',
              border: '1px solid #6366f140',
              color: '#6366f1',
            }}>
              🔗 Correlate
            </button>
          </div>
        </div>
        {scanResult && (
          <div style={{
            marginTop: 12, padding: '8px 12px', borderRadius: 6,
            background: '#22c55e10', border: '1px solid #22c55e30',
            fontSize: 12, color: '#22c55e',
          }}>
            ✅ {scanResult}
          </div>
        )}
      </div>

      {/* ── Panel Selector ── */}
      <div className="sec-section" style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #1e293b' }}>
          {[
            { key: 'files' as const, label: '📁 File System', count: events.length },
            { key: 'processes' as const, label: '⚡ Processes', count: processes.length },
            { key: 'network' as const, label: '🌐 Network', count: connections.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setPanel(tab.key)}
              style={{
                flex: 1, padding: '12px 16px', border: 'none', cursor: 'pointer',
                background: panel === tab.key ? '#1e293b' : 'transparent',
                borderBottom: panel === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
                color: panel === tab.key ? '#f1f5f9' : '#64748b',
                fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
              }}
            >
              {tab.label}
              <span style={{
                marginLeft: 8, fontSize: 11, padding: '1px 6px', borderRadius: 10,
                background: panel === tab.key ? '#3b82f620' : '#1e293b',
                color: panel === tab.key ? '#3b82f6' : '#64748b',
              }}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Suspicious filter toggle */}
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#94a3b8' }}>
            <input type="checkbox" checked={filterSuspicious}
              onChange={(e) => {
                setFilterSuspicious(e.target.checked);
                if (panel === 'processes') loadProcesses();
                if (panel === 'network') loadConnections();
              }}
              style={{ accentColor: '#ef4444' }}
            />
            ⚠️ Suspicious only
          </label>
        </div>

        {/* ── File System Panel ── */}
        {panel === 'files' && (
          <div style={{ padding: 16 }}>
            {events.length === 0 ? (
              <div className="sec-empty">
                <span className="sec-empty-icon">📁</span>
                <h3 className="sec-empty-title">No File Events</h3>
                <p className="sec-empty-text">Run a scan to build baselines and detect file changes.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {events.map(evt => {
                  const sevColor = evt.severity === 'critical' ? '#ef4444' : evt.severity === 'warning' ? '#f59e0b' : '#3b82f6';
                  const sevBg = evt.severity === 'critical' ? '#ef444415' : evt.severity === 'warning' ? '#f59e0b15' : '#3b82f615';
                  const typeIcon = evt.event_type === 'created' ? '📄' : evt.event_type === 'modified' ? '✏️' : evt.event_type === 'deleted' ? '🗑️' : '🔧';
                  return (
                    <div key={evt.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                      borderRadius: 6, background: sevBg, border: `1px solid ${sevColor}20`,
                      fontSize: 12,
                    }}>
                      <span style={{ fontSize: 14 }}>{typeIcon}</span>
                      <span style={{
                        padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                        background: `${sevColor}20`, color: sevColor, textTransform: 'uppercase',
                      }}>{evt.severity}</span>
                      <span style={{ color: '#f1f5f9', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                        {evt.file_path}
                      </span>
                      <span style={{ color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' as const }}>
                        {formatAge(evt.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Processes Panel ── */}
        {panel === 'processes' && (
          <div style={{ padding: 16 }}>
            {processes.length === 0 ? (
              <div className="sec-empty">
                <span className="sec-empty-icon">⚡</span>
                <h3 className="sec-empty-title">No Process Data</h3>
                <p className="sec-empty-text">Run a scan to snapshot your running processes.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e293b' }}>
                      <th style={{ textAlign: 'left', padding: '8px 6px', color: '#64748b', fontWeight: 600 }}>Process</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px', color: '#64748b', fontWeight: 600 }}>PID</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', color: '#64748b', fontWeight: 600 }}>CPU %</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', color: '#64748b', fontWeight: 600 }}>Mem MB</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px', color: '#64748b', fontWeight: 600 }}>Path</th>
                      <th style={{ textAlign: 'center', padding: '8px 6px', color: '#64748b', fontWeight: 600 }}>Risk</th>
                      <th style={{ padding: '8px 6px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {processes.map(proc => (
                      <tr key={proc.id} style={{
                        borderBottom: '1px solid #1e293b',
                        background: proc.is_suspicious ? '#ef444410' : 'transparent',
                      }}>
                        <td style={{ padding: '6px', color: '#f1f5f9', fontWeight: 600 }}>{proc.name}</td>
                        <td style={{ padding: '6px', color: '#94a3b8', fontFamily: 'monospace' }}>{proc.pid}</td>
                        <td style={{ padding: '6px', textAlign: 'right', color: proc.cpu_percent > 50 ? '#f59e0b' : '#94a3b8', fontFamily: 'monospace' }}>
                          {proc.cpu_percent?.toFixed(1)}
                        </td>
                        <td style={{ padding: '6px', textAlign: 'right', color: '#94a3b8', fontFamily: 'monospace' }}>
                          {proc.memory_mb?.toFixed(1)}
                        </td>
                        <td style={{ padding: '6px', color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                          {proc.exe_path || '—'}
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          {proc.is_suspicious ? (
                            <span style={{
                              padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                              background: '#ef444420', color: '#ef4444',
                            }} title={proc.suspicion_reason}>⚠️ SUS</span>
                          ) : (
                            <span style={{ color: '#22c55e', fontSize: 14 }}>✓</span>
                          )}
                        </td>
                        <td style={{ padding: '6px' }}>
                          {proc.is_suspicious && (
                            <button
                              onClick={() => handleKillProcess(proc.pid, proc.name)}
                              style={{
                                padding: '2px 8px', borderRadius: 4, border: '1px solid #ef444440',
                                background: '#ef444415', color: '#ef4444', fontSize: 11,
                                cursor: 'pointer', fontWeight: 600,
                              }}
                            >
                              Kill
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Network Panel ── */}
        {panel === 'network' && (
          <div style={{ padding: 16 }}>
            {connections.length === 0 ? (
              <div className="sec-empty">
                <span className="sec-empty-icon">🌐</span>
                <h3 className="sec-empty-title">No Connection Data</h3>
                <p className="sec-empty-text">Run a scan to snapshot active network connections.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e293b' }}>
                      <th style={{ textAlign: 'left', padding: '8px 6px', color: '#64748b', fontWeight: 600 }}>Local</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px', color: '#64748b', fontWeight: 600 }}>Remote</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px', color: '#64748b', fontWeight: 600 }}>Protocol</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px', color: '#64748b', fontWeight: 600 }}>Process</th>
                      <th style={{ textAlign: 'center', padding: '8px 6px', color: '#64748b', fontWeight: 600 }}>Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {connections.map(conn => (
                      <tr key={conn.id} style={{
                        borderBottom: '1px solid #1e293b',
                        background: conn.is_suspicious ? '#ef444410' : 'transparent',
                      }}>
                        <td style={{ padding: '6px', color: '#94a3b8', fontFamily: 'monospace' }}>
                          {conn.local_addr}:{conn.local_port}
                        </td>
                        <td style={{ padding: '6px', color: '#f1f5f9', fontFamily: 'monospace' }}>
                          {conn.remote_addr && conn.remote_addr !== '0.0.0.0'
                            ? `${conn.remote_addr}:${conn.remote_port}`
                            : '— (listening)'}
                        </td>
                        <td style={{ padding: '6px', color: '#94a3b8', textTransform: 'uppercase' as const, fontSize: 11 }}>
                          {conn.protocol}
                        </td>
                        <td style={{ padding: '6px', color: '#94a3b8' }}>
                          {conn.process_name || `PID ${conn.pid || '?'}`}
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          {conn.is_suspicious ? (
                            <span style={{
                              padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                              background: '#ef444420', color: '#ef4444',
                            }} title={conn.suspicion_reason}>⚠️ SUS</span>
                          ) : (
                            <span style={{ color: '#22c55e', fontSize: 14 }}>✓</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SIEM Alerts (existing) ── */}
      <div className="sec-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 className="sec-section-title" style={{ marginBottom: 2 }}>🔗 SIEM Correlated Alerts</h3>
            <p className="sec-section-sub">Cross-system pattern detection</p>
          </div>
        </div>
        {alerts.filter(a => a.status !== 'dismissed' && a.status !== 'resolved').length === 0 ? (
          <div className="sec-empty">
            <span className="sec-empty-icon">✨</span>
            <h3 className="sec-empty-title">No Active Alerts</h3>
            <p className="sec-empty-text">Correlation engine is watching. Alerts appear when cross-system patterns are detected.</p>
          </div>
        ) : (
          <div>
            {alerts.filter(a => a.status !== 'dismissed' && a.status !== 'resolved').map(alert => {
              const sm = severityMeta(alert.severity);
              return (
                <div key={alert.id} className="sec-alert-card" style={{ borderLeftColor: sm.color, opacity: alert.status === 'acknowledged' ? 0.7 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{sm.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' as const }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{alert.title}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: sm.bg, color: sm.color, textTransform: 'uppercase' }}>
                          {alert.severity}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6, lineHeight: 1.5 }}>
                        {truncate(alert.description, 200)}
                      </div>
                    </div>
                    <div className="sec-alert-actions">
                      {alert.status === 'active' && (
                        <button className="sec-alert-btn" onClick={() => onAlertAction(alert.id, 'acknowledge')}>👁️ Ack</button>
                      )}
                      <button className="sec-alert-btn sec-alert-btn--resolve" onClick={() => onAlertAction(alert.id, 'resolve')}>✅ Resolve</button>
                      <button className="sec-alert-btn sec-alert-btn--dismiss" onClick={() => onAlertAction(alert.id, 'dismiss')}>✕</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Security Cron Jobs ── */}
      <SecurityCronsSection />
    </div>
  );
}

// ── Security Crons Section ──────────────────────────────────────
function SecurityCronsSection() {
  const [crons, setCrons] = useState<any[]>([]);
  const [running, setRunning] = useState<string | null>(null);

  const loadCrons = useCallback(async () => {
    try {
      const all = await invokeTimeout<any[]>('engine_get_crons', { enabled_only: false });
      setCrons(all.filter((c: any) => c.name.startsWith('sec-')));
    } catch (err) { console.error('[SecurityCrons] load failed:', err); }
  }, []);

  useEffect(() => { loadCrons(); }, [loadCrons]);

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await invokeTimeout('engine_toggle_cron', { id, enabled });
      await loadCrons();
    } catch (err) { console.error('[SecurityCrons] toggle failed:', err); }
  };

  const handleRunNow = async (id: string, name: string) => {
    setRunning(id);
    try {
      await invokeTimeout('engine_run_cron_now', { id });
      await invokeTimeout('engine_tick_cron');
      await loadCrons();
    } catch (err) { console.error('[SecurityCrons] run now failed:', err); }
    setRunning(null);
  };

  const cronMeta: Record<string, { icon: string; label: string; color: string }> = {
    'sec-quick-aegis': { icon: '🛡️', label: 'Quick Aegis Audit', color: '#22c55e' },
    'sec-full-aegis': { icon: '🛡️', label: 'Full Aegis Audit', color: '#22c55e' },
    'sec-viper-scan': { icon: '🐍', label: 'Viper Vuln Scan', color: '#ef4444' },
    'sec-watchtower': { icon: '👁️', label: 'Watchtower Check', color: '#3b82f6' },
    'sec-siem-correlate': { icon: '🔗', label: 'SIEM Correlation', color: '#6366f1' },
    'sec-agent-audit': { icon: '🤖', label: 'Agent Security Audit', color: '#f59e0b' },
    'sec-weekly-report': { icon: '📊', label: 'Weekly Report', color: '#8b5cf6' },
    'sec-baseline-refresh': { icon: '📁', label: 'Baseline Refresh', color: '#06b6d4' },
  };

  if (crons.length === 0) return null;

  return (
    <div className="sec-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 className="sec-section-title" style={{ marginBottom: 2 }}>⏰ Scheduled Security Scans</h3>
          <p className="sec-section-sub">Automated scans run on schedule via agent heartbeats</p>
        </div>
        <button className="sec-btn" onClick={loadCrons} style={{
          background: '#1e293b', border: '1px solid #334155', color: '#94a3b8',
        }}>
          🔄 Refresh
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {crons.map(cron => {
          const meta = cronMeta[cron.name] || { icon: '⚙️', label: cron.name, color: '#64748b' };
          const isRunning = running === cron.id;
          return (
            <div key={cron.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              borderRadius: 8, background: cron.is_enabled ? '#0f1d3200' : '#0f1d3250',
              border: `1px solid ${cron.is_enabled ? '#1e293b' : '#1e293b80'}`,
              opacity: cron.is_enabled ? 1 : 0.5,
            }}>
              <span style={{ fontSize: 18 }}>{meta.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{meta.label}</span>
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 4,
                    background: `${meta.color}15`, color: meta.color, fontWeight: 600,
                  }}>
                    {cron.schedule_description || cron.schedule}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                  {cron.last_run_at
                    ? `Last run: ${formatAge(cron.last_run_at)} · ${cron.run_count} total runs`
                    : 'Never run'}
                  {cron.next_run_at && (
                    <span style={{ marginLeft: 12 }}>Next: {formatAge(cron.next_run_at)}</span>
                  )}
                  {cron.error_count > 0 && (
                    <span style={{ marginLeft: 12, color: '#ef4444' }}>{cron.error_count} errors</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  onClick={() => handleRunNow(cron.id, cron.name)}
                  disabled={isRunning}
                  style={{
                    padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                    border: `1px solid ${isRunning ? '#334155' : '#3b82f640'}`,
                    background: isRunning ? '#1e293b' : '#3b82f615',
                    color: isRunning ? '#64748b' : '#3b82f6',
                    cursor: isRunning ? 'wait' : 'pointer',
                  }}
                >
                  {isRunning ? '⏳ Running...' : '▶️ Run Now'}
                </button>
                <label style={{ position: 'relative', display: 'inline-block', width: 36, height: 20, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cron.is_enabled}
                    onChange={(e) => handleToggle(cron.id, e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', inset: 0, borderRadius: 10,
                    background: cron.is_enabled ? '#3b82f6' : '#334155',
                    transition: 'background 0.2s',
                  }}>
                    <span style={{
                      position: 'absolute', top: 2, left: cron.is_enabled ? 18 : 2,
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s',
                    }} />
                  </span>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Activity Tab ─────────────────────────────────────────────────
function ActivityTab({ events }: { events: SecurityEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="sec-section">
        <div className="sec-empty">
          <span className="sec-empty-icon">🛡️</span>
          <h3 className="sec-empty-title">No Activity Yet</h3>
          <p className="sec-empty-text">Agent actions will appear here as they happen. Run a scan to generate your first security events.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sec-section">
      <div className="sec-event-list">
        {events.map(event => (
          <div
            key={event.id}
            className="sec-event-row"
            style={{ borderLeft: `3px solid ${event.category === 'critical' ? '#ef4444' : event.category === 'warning' ? '#f59e0b' : '#22c55e'}` }}
          >
            <span className="sec-event-icon">{eventIcon(event.event_type)}</span>
            <div className="sec-event-body">
              <div>
                <span className="sec-event-agent">{event.agent_id}</span>
                <span className="sec-event-action">{eventLabel(event.event_type)}</span>
                {!event.was_allowed && (
                  <span style={{ background: '#ef444422', color: '#ef4444', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, marginLeft: 6 }}>Denied</span>
                )}
              </div>
              {event.target && <div className="sec-event-target">{truncate(event.target, 80)}</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                {event.tool_name && (
                  <span style={{ background: '#1e293b', color: '#94a3b8', fontSize: 11, padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>{event.tool_name}</span>
                )}
                <span style={{ color: event.category === 'critical' ? '#ef4444' : event.category === 'warning' ? '#f59e0b' : '#22c55e', fontSize: 11, fontWeight: 700 }}>
                  {event.category.toUpperCase()}
                </span>
                <span style={{ fontSize: 11, color: '#475569' }}>{formatAge(event.created_at)}</span>
              </div>
            </div>
            {event.risk_score > 0 && (
              <span className="sec-event-risk" style={{ color: event.risk_score >= 70 ? '#ef4444' : event.risk_score >= 40 ? '#f59e0b' : '#22c55e' }}>
                {event.risk_score}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Permissions Tab ──────────────────────────────────────────────
function PermissionsTab({ profiles }: { profiles: Record<string, AgentProfile> }) {
  const entries = Object.entries(profiles);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
          Each agent has its own security profile — controls what it can access on your system.
        </p>
      </div>
      <div className="sec-profile-grid">
        {entries.map(([agentId, profile]) => (
          <div key={agentId} className="sec-profile-card">
            <div className="sec-profile-header">
              <span className="sec-profile-name">{agentId}</span>
              <span className={`sec-profile-status ${profile.sandbox_enabled ? 'sec-profile-status--sandboxed' : 'sec-profile-status--unrestricted'}`}>
                {profile.sandbox_enabled ? '🛡️ Sandboxed' : '⚠️ Unrestricted'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              <PermChip label="Files" value={profile.file_access_mode} icon="📁" />
              <PermChip label="Network" value={profile.network_mode} icon="🌐" />
              <PermChip label="Commands" value={profile.exec_mode} icon="💻" />
            </div>
            <div style={{ fontSize: 11, color: '#475569' }}>Anomaly threshold: {profile.anomaly_threshold}/100</div>
          </div>
        ))}
      </div>
      {entries.length === 0 && (
        <div className="sec-section">
          <div className="sec-empty">
            <span className="sec-empty-icon">🤖</span>
            <h3 className="sec-empty-title">No Agents Configured</h3>
            <p className="sec-empty-text">Add agents through the Agents app and their security profiles will appear here.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function PermChip({ label, value, icon }: { label: string; value: string; icon: string }) {
  const color = value === 'open' || value === 'prompt_all' ? '#f59e0b' : '#22c55e';
  const label2 = value === 'open' ? 'Full Access' : value === 'prompt_all' ? 'Ask First' : value === 'allowlist' ? 'Restricted' : value;
  return (
    <div className="sec-perm-row">
      <span className="sec-perm-row-icon">{icon}</span>
      <span className="sec-perm-row-label">{label}</span>
      <span className="sec-perm-row-value" style={{ color }}>{label2}</span>
    </div>
  );
}

// ── Pending Tab ──────────────────────────────────────────────────
function PendingTab({ prompts, onPrompt }: {
  prompts: PermissionPrompt[];
  onPrompt: (id: string, decision: 'allow_once' | 'allow_always' | 'deny_once' | 'deny_always') => void;
}) {
  if (prompts.length === 0) {
    return (
      <div className="sec-section">
        <div className="sec-empty">
          <span className="sec-empty-icon">✅</span>
          <h3 className="sec-empty-title">All Clear</h3>
          <p className="sec-empty-text">No pending permission requests. Your agents are operating within their allowed boundaries.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {prompts.map(prompt => (
        <div key={prompt.id} className="sec-prompt-card">
          <div className="sec-prompt-agent">
            <span className="sec-prompt-emoji">{prompt.agent_emoji}</span>
            <div>
              <span className="sec-prompt-name">{prompt.agent_name}</span>
              <span className="sec-prompt-id">ID: {prompt.agent_id}</span>
            </div>
            <span style={{ fontSize: 11, color: '#475569', marginLeft: 'auto' }}>{formatAge(prompt.created_at)}</span>
          </div>
          <div className="sec-prompt-wants">
            <span>wants to</span>
            <code className="sec-prompt-code">{prompt.tool_name || prompt.request_type}</code>
            <span>this:</span>
          </div>
          <div className="sec-prompt-target">"{truncate(prompt.target, 100)}"</div>
          <div className="sec-prompt-btns">
            <button className="sec-prompt-btn" style={{ background: '#22c55e' }} onClick={() => onPrompt(prompt.id, 'allow_once')}>✓ Allow Once</button>
            <button className="sec-prompt-btn" style={{ background: '#3b82f6' }} onClick={() => onPrompt(prompt.id, 'allow_always')}>✓ Always Allow</button>
            <button className="sec-prompt-btn" style={{ background: '#f59e0b' }} onClick={() => onPrompt(prompt.id, 'deny_once')}>✕ Deny Once</button>
            <button className="sec-prompt-btn" style={{ background: '#ef4444' }} onClick={() => onPrompt(prompt.id, 'deny_always')}>✕ Always Block</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Sentinel Tab (Quarantine) ─────────────────────────────────────
const QUARANTINE_LEVELS = [
  { level: 0, name: 'Normal', emoji: '🟢', color: '#22c55e', desc: 'Full access per security profile' },
  { level: 1, name: 'Watched', emoji: '🟡', color: '#f59e0b', desc: 'Increased logging, lower anomaly threshold' },
  { level: 2, name: 'Restricted', emoji: '🟠', color: '#f97316', desc: 'Read-only files, no exec, no network' },
  { level: 3, name: 'Suspended', emoji: '🔴', color: '#ef4444', desc: 'Agent not responding to messages' },
  { level: 4, name: 'Frozen', emoji: '⛔', color: '#dc2626', desc: 'Agent process paused, all resources held' },
];

// ── Device Type Icons ──────────────────────────────────────────
function deviceTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    phone: '📱', laptop: '💻', desktop: '🖥️', tablet: '📱',
    printer: '🖨️', router: '📡', server: '🖥️', iot: '🔌',
    tv: '📺', camera: '📷', unknown: '❓',
  };
  return icons[type] || '❓';
}

function deviceTypeColor(type: string): string {
  const colors: Record<string, string> = {
    phone: '#3b82f6', laptop: '#8b5cf6', desktop: '#6366f1',
    printer: '#f59e0b', router: '#22c55e', server: '#06b6d4',
    iot: '#ec4899', tv: '#8b5cf6', camera: '#f97316', unknown: '#64748b',
  };
  return colors[type] || '#64748b';
}

function portLabel(port: number): string {
  const labels: Record<number, string> = {
    22: 'SSH', 80: 'HTTP', 443: 'HTTPS', 445: 'SMB',
    515: 'LPD', 631: 'IPP', 8080: 'HTTP-Alt', 8443: 'HTTPS-Alt',
    9100: 'Print', 5353: 'mDNS', 548: 'AFP', 5900: 'VNC',
    3389: 'RDP', 139: 'NetBIOS', 1883: 'MQTT',
  };
  return labels[port] || String(port);
}

// ── Network Map Tab ────────────────────────────────────────────
function NetworkMapTab({ devices, networkMap, events, scanning, editingId, nickname,
  onScan, onRename, onRenameSave, onRenameCancel, onNicknameChange, onMarkKnown, onDelete }: {
  devices: NetworkDevice[];
  networkMap: NetworkMapData | null;
  events: NetworkEvent[];
  scanning: boolean;
  editingId: string | null;
  nickname: string;
  onScan: () => void;
  onRename: (id: string) => void;
  onRenameSave: (id: string) => void;
  onRenameCancel: () => void;
  onNicknameChange: (v: string) => void;
  onMarkKnown: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const onlineDevices = devices.filter(d => d.is_online);
  const offlineDevices = devices.filter(d => !d.is_online);
  const unknownDevices = devices.filter(d => d.is_online && !d.is_known);

  // Group by type for the visual map
  const byType: Record<string, NetworkDevice[]> = {};
  onlineDevices.forEach(d => {
    const t = d.device_type || 'unknown';
    if (!byType[t]) byType[t] = [];
    byType[t].push(d);
  });

  const deviceTypes = Object.entries(byType).sort((a, b) => b[1].length - a[1].length);

  return (
    <div style={{ padding: 16 }}>
      {/* ── Hero: Network Map ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #0f172a 50%, #1e1b4b 100%)',
        borderRadius: 16, padding: 24, marginBottom: 16,
        border: '1px solid #1e293b', position: 'relative', overflow: 'hidden',
        minHeight: 200,
      }}>
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.05,
          backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Network Info Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, position: 'relative' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 28 }}>🌐</span>
              Home Network Map
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              {networkMap ? `Your computer: ${networkMap.local_ip} · Subnet: ${networkMap.subnet}` : 'Network info unavailable'}
            </div>
          </div>
          <button
            onClick={onScan}
            disabled={scanning}
            style={{
              background: scanning ? '#475569' : '#3b82f6',
              color: 'white', border: 'none', borderRadius: 8,
              padding: '10px 20px', fontSize: 14, fontWeight: 600,
              cursor: scanning ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s',
            }}
          >
            {scanning ? (
              <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>🔄</span> Scanning...</>
            ) : (
              <><span>🔍</span> Scan Network</>
            )}
          </button>
        </div>

        {/* Device Type Rings */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', position: 'relative' }}>
          {deviceTypes.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 14, padding: 40 }}>
              {scanning ? 'Scanning your network...' : 'Click "Scan Network" to discover devices on your WiFi'}
            </div>
          ) : (
            deviceTypes.map(([type, devs]) => {
              const color = deviceTypeColor(type);
              return (
                <div key={type} style={{
                  background: '#0f172a', borderRadius: 12, padding: '12px 16px',
                  border: `1px solid ${color}33`, textAlign: 'center', minWidth: 80,
                }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{deviceTypeIcon(type)}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color }}>{devs.length}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'capitalize' }}>{type}</div>
                </div>
              );
            })
          )}
        </div>

        {/* Scan Results */}
        {networkMap?.scan_result && (
          <div style={{
            marginTop: 16, padding: '8px 16px', borderRadius: 8,
            background: '#1e293b', fontSize: 12, color: '#94a3b8',
            display: 'flex', gap: 20, justifyContent: 'center', position: 'relative',
          }}>
            <span>{onlineDevices.length} devices online</span>
            {unknownDevices.length > 0 && <span style={{ color: '#f59e0b' }}>⚠️ {unknownDevices.length} unknown</span>}
            <span>Scan: {networkMap.scan_result.scan_duration_ms}ms</span>
          </div>
        )}
      </div>

      {/* ── Unknown Devices Alert ── */}
      {unknownDevices.length > 0 && (
        <div style={{
          background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: 12,
          padding: 16, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#fecaca' }}>
              {unknownDevices.length} Unknown Device{unknownDevices.length > 1 ? 's' : ''} Detected
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {unknownDevices.map(d => (
              <div key={d.id} style={{
                background: '#450a0a', borderRadius: 8, padding: '8px 12px',
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
              }}>
                <span>{deviceTypeIcon(d.device_type)}</span>
                <span style={{ color: '#fca5a5' }}>{d.hostname || d.ip_address}</span>
                <span style={{ color: '#7f1d1d' }}>|</span>
                <span style={{ color: '#94a3b8' }}>{d.manufacturer || 'Unknown'}</span>
                <button
                  onClick={() => onMarkKnown(d.id)}
                  style={{
                    background: '#16a34a', color: 'white', border: 'none',
                    borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer',
                  }}
                >
                  ✓ Trust
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Device Cards Grid ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 12, marginBottom: 16,
      }}>
        {onlineDevices.map(d => {
          const color = deviceTypeColor(d.device_type);
          const displayName = d.nickname || d.hostname || d.ip_address;
          const isEditing = editingId === d.id;

          return (
            <div key={d.id} style={{
              background: '#0f172a', borderRadius: 12, padding: 16,
              border: `1px solid ${d.is_known ? '#1e293b' : '#7f1d1d'}`,
              transition: 'border-color 0.2s',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: `${color}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                  }}>
                    {deviceTypeIcon(d.device_type)}
                  </div>
                  <div>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <input
                          type="text"
                          value={nickname}
                          onChange={e => onNicknameChange(e.target.value)}
                          placeholder="Enter nickname..."
                          style={{
                            background: '#1e293b', border: '1px solid #3b82f6',
                            borderRadius: 4, padding: '2px 6px', fontSize: 13, color: 'white', width: 120,
                          }}
                          autoFocus
                        />
                        <button onClick={() => onRenameSave(d.id)} style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: 4, padding: '2px 6px', fontSize: 11, cursor: 'pointer' }}>Save</button>
                        <button onClick={onRenameCancel} style={{ background: '#475569', color: 'white', border: 'none', borderRadius: 4, padding: '2px 6px', fontSize: 11, cursor: 'pointer' }}>✕</button>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{displayName}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          {d.manufacturer || 'Unknown manufacturer'}
                          {d.is_known && <span style={{ color: '#22c55e', marginLeft: 6 }}>✓ Known</span>}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => onRename(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 2 }} title="Rename">✏️</button>
                  {!d.is_known && (
                    <button onClick={() => onMarkKnown(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 2 }} title="Mark as known">✅</button>
                  )}
                  <button onClick={() => onDelete(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 2 }} title="Remove">🗑️</button>
                </div>
              </div>

              {/* Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 12 }}>
                <div>
                  <span style={{ color: '#64748b' }}>IP</span>
                  <div style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{d.ip_address}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>MAC</span>
                  <div style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 }}>{d.mac_address || '—'}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Type</span>
                  <div style={{ color, textTransform: 'capitalize' }}>{d.device_type}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Last seen</span>
                  <div style={{ color: '#e2e8f0' }}>{formatAge(d.last_seen)}</div>
                </div>
              </div>

              {/* Open Ports */}
              {d.open_ports.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #1e293b' }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Open Ports</span>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                    {d.open_ports.map(p => (
                      <span key={p} style={{
                        background: '#1e293b', borderRadius: 4, padding: '2px 6px',
                        fontSize: 11, color: '#94a3b8', fontFamily: 'monospace',
                      }}>
                        {p} <span style={{ color: '#475569' }}>({portLabel(p)})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Offline Devices ── */}
      {offlineDevices.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>
            📴 Offline ({offlineDevices.length})
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {offlineDevices.map(d => (
              <div key={d.id} style={{
                background: '#0f172a', borderRadius: 8, padding: '8px 12px',
                border: '1px solid #1e293b', fontSize: 12, opacity: 0.6,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>{deviceTypeIcon(d.device_type)}</span>
                <span style={{ color: '#94a3b8' }}>{d.nickname || d.hostname || d.ip_address}</span>
                <span style={{ color: '#475569' }}>{formatAge(d.last_seen)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Network Events ── */}
      {events.length > 0 && (
        <div style={{
          background: '#0f172a', borderRadius: 12, padding: 16, border: '1px solid #1e293b',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }}>
            📋 Recent Network Events
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {events.slice(0, 15).map(ev => {
              const icon = ev.event_type === 'device_joined' ? '🟢' :
                ev.event_type === 'device_left' ? '🔴' :
                ev.event_type === 'ip_changed' ? '🔄' : '📋';
              return (
                <div key={ev.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 0', borderBottom: '1px solid #1e293b',
                  fontSize: 12,
                }}>
                  <span>{icon}</span>
                  <span style={{ color: '#e2e8f0' }}>{ev.description}</span>
                  <span style={{ color: '#475569', marginLeft: 'auto' }}>{formatAge(ev.created_at)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SentinelTab({ quarantined, history, onEscalate, onRelease, onRunAutoEscalation }: {
  quarantined: QuarantineStatus[];
  history: QuarantineEvent[];
  onEscalate: (agentId: string, level: number, reason: string) => Promise<void>;
  onRelease: (agentId: string) => Promise<void>;
  onRunAutoEscalation: () => Promise<void>;
}) {
  const [escalateAgent, setEscalateAgent] = useState<string | null>(null);
  const [escalateLevel, setEscalateLevel] = useState(2);
  const [escalateReason, setEscalateReason] = useState('');
  const [releasing, setReleasing] = useState<string | null>(null);
  const [autoRunning, setAutoRunning] = useState(false);

  const handleEscalate = async () => {
    if (!escalateAgent || !escalateReason.trim()) return;
    await onEscalate(escalateAgent, escalateLevel, escalateReason.trim());
    setEscalateAgent(null);
    setEscalateReason('');
  };

  const handleRelease = async (agentId: string) => {
    setReleasing(agentId);
    try {
      await onRelease(agentId);
    } finally {
      setReleasing(null);
    }
  };

  const handleAutoEscalation = async () => {
    setAutoRunning(true);
    try {
      await onRunAutoEscalation();
    } finally {
      setAutoRunning(false);
    }
  };

  return (
    <div>
      {/* Header + Auto-Escalation Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
            Agent isolation and quarantine — the unique differentiator. When an agent misbehaves, Sentinel isolates it.
          </p>
        </div>
        <button
          className="sec-scan-btn"
          onClick={handleAutoEscalation}
          disabled={autoRunning}
          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', flexShrink: 0 }}
        >
          {autoRunning ? '⏳ Scanning...' : '⚡ Run Auto-Escalation'}
        </button>
      </div>

      {/* Quarantine Levels Legend */}
      <div className="sec-section" style={{ marginBottom: 16 }}>
        <h3 className="sec-section-title">🎖️ Quarantine Levels</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {QUARANTINE_LEVELS.map(lvl => (
            <div key={lvl.level} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
              background: `${lvl.color}15`, borderRadius: 8, border: `1px solid ${lvl.color}30`,
              fontSize: 12, color: '#e2e8f0'
            }}>
              <span>{lvl.emoji}</span>
              <span style={{ fontWeight: 600 }}>{lvl.name}</span>
              <span style={{ color: '#94a3b8' }}>— {lvl.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Currently Quarantined Agents */}
      <div className="sec-section">
        <h3 className="sec-section-title">
          🚨 Quarantined Agents
          {quarantined.length > 0 && <span className="sec-tab-count" style={{ marginLeft: 8 }}>{quarantined.length}</span>}
        </h3>
        {quarantined.length === 0 ? (
          <div className="sec-empty">
            <span className="sec-empty-icon">✅</span>
            <h3 className="sec-empty-title">All Clear</h3>
            <p className="sec-empty-text">No agents are currently quarantined. All agents are operating normally.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quarantined.map(q => {
              const lvl = QUARANTINE_LEVELS[q.level] ?? QUARANTINE_LEVELS[0];
              return (
                <div key={q.agent_id} className="sec-event-row" style={{
                  borderLeft: `3px solid ${lvl.color}`,
                  background: `${lvl.color}08`,
                  padding: 12, borderRadius: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                    <span style={{ fontSize: 24 }}>{lvl.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{q.agent_id}</span>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                          background: `${lvl.color}20`, color: lvl.color, border: `1px solid ${lvl.color}40`,
                        }}>{lvl.name}</span>
                        {q.auto_escalated && (
                          <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 500 }}>⚡ AUTO</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{q.reason}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{formatAge(q.created_at)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {q.level < 4 && (
                        <button
                          className="sec-prompt-btn"
                          style={{ background: '#f59e0b', fontSize: 11, padding: '4px 10px' }}
                          onClick={() => {
                            setEscalateAgent(q.agent_id);
                            setEscalateLevel(Math.min(q.level + 1, 4));
                          }}
                        >⬆️ Escalate</button>
                      )}
                      <button
                        className="sec-prompt-btn"
                        style={{ background: '#22c55e', fontSize: 11, padding: '4px 10px' }}
                        onClick={() => handleRelease(q.agent_id)}
                        disabled={releasing === q.agent_id}
                      >{releasing === q.agent_id ? '⏳' : '🔓 Release'}</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Escalate Modal */}
      {escalateAgent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setEscalateAgent(null)}>
          <div style={{
            background: '#1e1e2e', borderRadius: 12, padding: 24, maxWidth: 420, width: '90%',
            border: '1px solid #f59e0b40',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', color: '#f59e0b' }}>⬆️ Escalate Quarantine</h3>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 12px' }}>Agent: <strong style={{ color: '#e2e8f0' }}>{escalateAgent}</strong></p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Target Level</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {QUARANTINE_LEVELS.slice(1).map(lvl => (
                  <button key={lvl.level} onClick={() => setEscalateLevel(lvl.level)} style={{
                    padding: '6px 10px', borderRadius: 6, border: `1px solid ${escalateLevel === lvl.level ? lvl.color : '#334155'}`,
                    background: escalateLevel === lvl.level ? `${lvl.color}20` : 'transparent',
                    color: escalateLevel === lvl.level ? lvl.color : '#94a3b8',
                    cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  }}>
                    {lvl.emoji} {lvl.name}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Reason</label>
              <input
                type="text"
                value={escalateReason}
                onChange={e => setEscalateReason(e.target.value)}
                placeholder="Why is this agent being escalated?"
                style={{
                  width: '100%', padding: '8px 12px', background: '#0f0f1a', border: '1px solid #334155',
                  borderRadius: 6, color: '#e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="sec-prompt-btn" style={{ background: '#475569' }} onClick={() => setEscalateAgent(null)}>Cancel</button>
              <button
                className="sec-prompt-btn"
                style={{ background: '#f59e0b' }}
                onClick={handleEscalate}
                disabled={!escalateReason.trim()}
              >⬆️ Escalate to {QUARANTINE_LEVELS[escalateLevel]?.name}</button>
            </div>
          </div>
        </div>
      )}

      {/* Quarantine History */}
      <div className="sec-section" style={{ marginTop: 16 }}>
        <h3 className="sec-section-title">📜 Quarantine History</h3>
        {history.length === 0 ? (
          <div className="sec-empty">
            <span className="sec-empty-icon">📋</span>
            <h3 className="sec-empty-title">No History</h3>
            <p className="sec-empty-text">Quarantine events will appear here as they occur.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {history.map(h => {
              const lvl = QUARANTINE_LEVELS[h.level] ?? QUARANTINE_LEVELS[0];
              return (
                <div key={h.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  background: h.is_active ? `${lvl.color}08` : 'transparent',
                  borderRadius: 6, fontSize: 12, borderBottom: '1px solid #1e293b',
                }}>
                  <span>{lvl.emoji}</span>
                  <span style={{ fontWeight: 600, color: '#e2e8f0', minWidth: 80 }}>{lvl.name}</span>
                  <span style={{ color: '#94a3b8', flex: 1 }}>{h.reason}</span>
                  {h.auto_escalated && <span style={{ fontSize: 10, color: '#f59e0b' }}>AUTO</span>}
                  {h.released_by && <span style={{ fontSize: 10, color: '#22c55e' }}>🔓 {h.released_by}</span>}
                  <span style={{ color: '#64748b', minWidth: 60, textAlign: 'right' }}>{formatAge(h.created_at)}</span>
                  {h.is_active && (
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: `${lvl.color}30`, color: lvl.color }}>ACTIVE</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}