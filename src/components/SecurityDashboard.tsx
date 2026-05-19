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
type TabKey = 'overview' | 'aegis' | 'viper' | 'watchtower' | 'activity' | 'permissions' | 'pending';

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
      const [ev, pr, ov, aRuns, vScans, aAlerts] = await Promise.all([
        invokeTimeout<SecurityEvent[]>('security_get_events', { limit: 30 }).catch(() => [] as SecurityEvent[]),
        invokeTimeout<PermissionPrompt[]>('security_get_pending_prompts', {}).catch(() => [] as PermissionPrompt[]),
        invokeTimeout<RiskOverview>('siem_get_risk_overview').catch(() => null as RiskOverview | null),
        invokeTimeout<AuditRun[]>('aegis_get_runs', { limit: 10 }).catch(() => [] as AuditRun[]),
        invokeTimeout<VulnScan[]>('viper_get_scans', { limit: 10 }).catch(() => [] as VulnScan[]),
        invokeTimeout<SiemAlert[]>('siem_get_alerts', { status: null, limit: 30 }).catch(() => [] as SiemAlert[]),
      ]);

      setEvents(ev);
      setPrompts(pr);
      setOverview(ov);
      setAegisRuns(aRuns);
      setViperScans(vScans);
      setAlerts(aAlerts);

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
  const activeAlerts = alerts.filter(a => a.status !== 'dismissed' && a.status !== 'resolved');

  return (
    <div className="sec-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 className="sec-section-title" style={{ marginBottom: 2 }}>👁️ Watchtower — SIEM Alerts</h3>
          <p className="sec-section-sub">Cross-correlation engine — detects patterns across all security systems</p>
        </div>
        <button className="sec-btn" onClick={onRunCorrelation}>
          🔗 Run Correlation
        </button>
      </div>

      {activeAlerts.length === 0 ? (
        <div className="sec-empty">
          <span className="sec-empty-icon">✨</span>
          <h3 className="sec-empty-title">No Active Alerts</h3>
          <p className="sec-empty-text">Watchtower is monitoring. Alerts will appear here when cross-system patterns are detected.</p>
        </div>
      ) : (
        <div>
          {activeAlerts.map(alert => {
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
                      {alert.status === 'acknowledged' && (
                        <span style={{ fontSize: 10, color: '#3b82f6', fontWeight: 600 }}>ACKNOWLEDGED</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6, lineHeight: 1.5 }}>
                      {truncate(alert.description, 200)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
                      <span style={{ fontSize: 11, color: '#475569' }}>Source: {alert.source}</span>
                      {alert.agent_id && <span style={{ fontSize: 11, color: '#6366f1' }}>Agent: {alert.agent_id}</span>}
                      <span style={{ fontSize: 11, color: '#475569' }}>{formatAge(alert.created_at)}</span>
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