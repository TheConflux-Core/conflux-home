// Conflux Home — SIEM Dashboard
// Mission 1224 Phase 5: Security Information & Event Management
// Cross-agent correlation, risk scoring, alerting, weekly reports

import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

// ── Types ──

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

interface SiemCorrelation {
  id: string;
  correlation_type: string;
  severity: string;
  title: string;
  description: string;
  source_1_type: string;
  source_2_type: string | null;
  agent_ids: string[];
  risk_score: number;
  created_at: string;
}

interface WeeklyReport {
  id: string;
  week_start: string;
  week_end: string;
  risk_score: number;
  risk_trend: string;
  total_events: number;
  critical_events: number;
  alerts_generated: number;
  alerts_resolved: number;
  aegis_score: number | null;
  viper_score: number | null;
  agent_audit_score: number | null;
  summary: string;
  findings: string[];
  created_at: string;
}

interface TimelinePoint {
  date: string;
  event_count: number;
  critical_count: number;
  avg_risk: number;
}

// ── Helpers ──

function riskColor(score: number): string {
  if (score <= 30) return '#22c55e';
  if (score <= 60) return '#f59e0b';
  return '#ef4444';
}

function severityIcon(s: string): string {
  switch (s) {
    case 'critical': return '🔴';
    case 'warning': return '🟡';
    default: return '🔵';
  }
}

function trendIcon(t: string): string {
  switch (t) {
    case 'improving': return '📈';
    case 'degrading': return '📉';
    default: return '➡️';
  }
}

// ── Component ──

export default function SIEMDashboard() {
  const [overview, setOverview] = useState<RiskOverview | null>(null);
  const [alerts, setAlerts] = useState<SiemAlert[]>([]);
  const [correlations, setCorrelations] = useState<SiemCorrelation[]>([]);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [correlating, setCorrelating] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'correlations' | 'reports'>('overview');

  const load = useCallback(async () => {
    try {
      const [ov, al, co, re, tl] = await Promise.all([
        invoke<RiskOverview>('siem_get_risk_overview'),
        invoke<SiemAlert[]>('siem_get_alerts', { limit: 50 }),
        invoke<SiemCorrelation[]>('siem_get_correlations', { limit: 30 }),
        invoke<WeeklyReport[]>('siem_get_weekly_reports', { limit: 12 }),
        invoke<TimelinePoint[]>('siem_get_risk_timeline'),
      ]);
      setOverview(ov);
      setAlerts(al);
      setCorrelations(co);
      setReports(re);
      setTimeline(tl);
    } catch (err) {
      console.error('[SIEM] Load failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runCorrelation = async () => {
    setCorrelating(true);
    try {
      const count = await invoke<number>('siem_run_correlation');
      console.log('[SIEM] Correlation generated', count, 'alerts');
      await load();
    } catch (err) {
      console.error('[SIEM] Correlation failed:', err);
    } finally {
      setCorrelating(false);
    }
  };

  const generateReport = async () => {
    setReporting(true);
    try {
      const id = await invoke<string>('siem_generate_weekly_report');
      console.log('[SIEM] Report generated:', id);
      await load();
    } catch (err) {
      console.error('[SIEM] Report failed:', err);
    } finally {
      setReporting(false);
    }
  };

  const handleAlert = async (id: string, action: 'acknowledge' | 'resolve' | 'dismiss') => {
    try {
      await invoke(`siem_${action}_alert`, { alertId: id });
      await load();
    } catch (err) {
      console.error('[SIEM] Alert action failed:', err);
    }
  };

  if (loading) return <div style={s.container}><div style={s.loading}>Loading SIEM data...</div></div>;

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.headerIcon}>🛡️</span>
          <div>
            <h1 style={s.title}>SIEM Command Center</h1>
            <p style={s.subtitle}>Security Intelligence & Event Management</p>
          </div>
        </div>
        <div style={s.headerActions}>
          <button style={s.actionBtn} onClick={runCorrelation} disabled={correlating}>
            {correlating ? '🔄 Analyzing...' : '🔗 Run Correlation'}
          </button>
          <button style={{...s.actionBtn, background: 'linear-gradient(135deg, #3b82f6, #2563eb)'}} onClick={generateReport} disabled={reporting}>
            {reporting ? '📝 Generating...' : '📊 Generate Report'}
          </button>
        </div>
      </div>

      {/* Risk Overview Strip */}
      {overview && (
        <div style={s.riskStrip}>
          <div style={s.riskMain}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#1e293b" strokeWidth="10" />
              <circle cx="60" cy="60" r="52" fill="none" stroke={riskColor(overview.overall_score)} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(overview.overall_score / 100) * 326.73} 326.73`} transform="rotate(-90 60 60)" />
              <text x="60" y="55" textAnchor="middle" fill="white" fontSize="30" fontWeight="bold">{overview.overall_score}</text>
              <text x="60" y="72" textAnchor="middle" fill="#94a3b8" fontSize="10">RISK</text>
            </svg>
            <div style={s.riskTrend}>{trendIcon(overview.trend)} {overview.trend}</div>
          </div>
          <div style={s.riskMetrics}>
            <div style={s.metric}>
              <div style={{...s.metricValue, color: '#ef4444'}}>{overview.critical_alerts}</div>
              <div style={s.metricLabel}>Critical Alerts</div>
            </div>
            <div style={s.metric}>
              <div style={{...s.metricValue, color: '#f59e0b'}}>{overview.active_alerts}</div>
              <div style={s.metricLabel}>Active Alerts</div>
            </div>
            <div style={s.metric}>
              <div style={s.metricValue}>{overview.correlations_24h}</div>
              <div style={s.metricLabel}>Correlations (24h)</div>
            </div>
            <div style={s.metric}>
              <div style={s.metricValue}>{overview.events_24h}</div>
              <div style={s.metricLabel}>Events (24h)</div>
            </div>
          </div>
          <div style={s.riskSources}>
            {overview.aegis_score != null && (
              <div style={s.sourceChip}>
                <span>🛡️</span>
                <span>System Health: <b>{overview.aegis_score}/100</b></span>
              </div>
            )}
            {overview.viper_risk != null && (
              <div style={s.sourceChip}>
                <span>🐍</span>
                <span>Vuln Risk: <b>{overview.viper_risk}/100</b></span>
              </div>
            )}
            {overview.agent_defense != null && (
              <div style={s.sourceChip}>
                <span>⚔️</span>
                <span>Agent Defense: <b>{overview.agent_defense}/100</b></span>
              </div>
            )}
          </div>
          {overview.top_risks.length > 0 && (
            <div style={s.topRisks}>
              {overview.top_risks.map((r, i) => (
                <div key={i} style={s.riskItem}>⚠️ {r}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mini Timeline */}
      {timeline.length > 0 && (
        <div style={s.timelineBar}>
          {timeline.map((p, i) => {
            const maxEvents = Math.max(...timeline.map(t => t.event_count), 1);
            const height = Math.max(4, (p.event_count / maxEvents) * 40);
            return (
              <div key={i} style={s.timelineBar} title={`${p.date}: ${p.event_count} events`}>
                <div style={{...s.timelineCol, height: `${height}px`, background: p.critical_count > 0 ? '#ef4444' : '#3b82f6'}} />
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div style={s.tabs}>
        {(['overview', 'alerts', 'correlations', 'reports'] as const).map(tab => (
          <button key={tab} style={{...s.tab, ...(activeTab === tab ? s.tabActive : {})}} onClick={() => setActiveTab(tab)}>
            {tab === 'overview' ? '📊 Overview' : tab === 'alerts' ? `🔔 Alerts (${alerts.length})` : tab === 'correlations' ? '🔗 Correlations' : '📋 Reports'}
          </button>
        ))}
      </div>

      {/* Overview: Score Sources */}
      {activeTab === 'overview' && (
        <div style={s.overviewGrid}>
          <div style={s.scoreCard}>
            <div style={s.scoreHeader}>🛡️ Aegis — System Health</div>
            <div style={{...s.scoreVal, color: riskColor(100 - (overview?.aegis_score ?? 50))}}>{overview?.aegis_score ?? '—'}</div>
            <div style={s.scoreDesc}>Higher = healthier system configuration</div>
          </div>
          <div style={s.scoreCard}>
            <div style={s.scoreHeader}>🐍 Viper — Vulnerability Risk</div>
            <div style={{...s.scoreVal, color: riskColor(overview?.viper_risk ?? 50)}}>{overview?.viper_risk ?? '—'}</div>
            <div style={s.scoreDesc}>Lower = fewer exploitable vulnerabilities</div>
          </div>
          <div style={s.scoreCard}>
            <div style={s.scoreHeader}>⚔️ Agent Audit — Defense Score</div>
            <div style={{...s.scoreVal, color: riskColor(100 - (overview?.agent_defense ?? 50))}}>{overview?.agent_defense ?? '—'}</div>
            <div style={s.scoreDesc}>Higher = agents resist attacks better</div>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div style={s.list}>
          {alerts.map(a => (
            <div key={a.id} style={{...s.alertCard, borderLeftColor: a.severity === 'critical' ? '#ef4444' : a.severity === 'warning' ? '#f59e0b' : '#3b82f6'}}>
              <div style={s.alertHeader}>
                <span>{severityIcon(a.severity)}</span>
                <div style={s.alertInfo}>
                  <div style={s.alertTitle}>{a.title}</div>
                  <div style={s.alertMeta}>{a.alert_type} • {a.source} • {new Date(a.created_at).toLocaleString()}</div>
                </div>
                <span style={{...s.statusBadge, background: a.status === 'active' ? '#ef444422' : '#22c55e22', color: a.status === 'active' ? '#ef4444' : '#22c55e'}}>{a.status}</span>
              </div>
              <div style={s.alertDesc}>{a.description}</div>
              {a.status === 'active' && (
                <div style={s.alertActions}>
                  <button style={s.alertBtn} onClick={() => handleAlert(a.id, 'acknowledge')}>👁️ Acknowledge</button>
                  <button style={s.alertBtn} onClick={() => handleAlert(a.id, 'resolve')}>✅ Resolve</button>
                  <button style={s.alertBtn} onClick={() => handleAlert(a.id, 'dismiss')}>🗑️ Dismiss</button>
                </div>
              )}
            </div>
          ))}
          {alerts.length === 0 && <div style={s.empty}>No alerts. Run a correlation to generate alerts from security data.</div>}
        </div>
      )}

      {/* Correlations Tab */}
      {activeTab === 'correlations' && (
        <div style={s.list}>
          {correlations.map(c => (
            <div key={c.id} style={{...s.corrCard, borderLeftColor: c.severity === 'critical' ? '#ef4444' : c.severity === 'warning' ? '#f59e0b' : '#3b82f6'}}>
              <div style={s.alertHeader}>
                <span>{severityIcon(c.severity)}</span>
                <div style={s.alertInfo}>
                  <div style={s.alertTitle}>{c.title}</div>
                  <div style={s.alertMeta}>{c.correlation_type} • Risk: {c.risk_score}/100 • {new Date(c.created_at).toLocaleString()}</div>
                </div>
              </div>
              <div style={s.alertDesc}>{c.description}</div>
              <div style={s.corrSources}>
                <span style={s.sourceTag}>📌 {c.source_1_type}</span>
                {c.source_2_type && <span style={s.sourceTag}>📌 {c.source_2_type}</span>}
                {c.agent_ids.map(id => <span key={id} style={s.agentTag}>🤖 {id}</span>)}
              </div>
            </div>
          ))}
          {correlations.length === 0 && <div style={s.empty}>No correlations yet. Click "Run Correlation" to analyze cross-source patterns.</div>}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div style={s.list}>
          {reports.map(r => (
            <div key={r.id} style={s.reportCard}>
              <div style={s.reportHeader}>
                <div>
                  <div style={s.reportTitle}>Week of {r.week_start}</div>
                  <div style={s.reportMeta}>{r.week_start} — {r.week_end}</div>
                </div>
                <div style={{...s.reportScore, color: riskColor(r.risk_score)}}>{r.risk_score}/100</div>
              </div>
              <div style={s.reportSummary}>{r.summary}</div>
              <div style={s.reportStats}>
                <span>📊 {r.total_events} events</span>
                <span>🔴 {r.critical_events} critical</span>
                <span>🔔 {r.alerts_generated} alerts ({r.alerts_resolved} resolved)</span>
                <span>{trendIcon(r.risk_trend)} {r.risk_trend}</span>
              </div>
              {r.findings.length > 0 && (
                <div style={s.reportFindings}>
                  {r.findings.map((f, i) => <div key={i} style={s.findingItem}>• {f}</div>)}
                </div>
              )}
            </div>
          ))}
          {reports.length === 0 && <div style={s.empty}>No weekly reports yet. Click "Generate Report" to create your first security digest.</div>}
        </div>
      )}
    </div>
  );
}

// ── Styles ──

const s: Record<string, React.CSSProperties> = {
  container: { padding: '24px', maxWidth: '1200px', margin: '0 auto', color: '#e2e8f0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  loading: { textAlign: 'center', padding: '48px', color: '#94a3b8' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  headerIcon: { fontSize: '32px' },
  title: { fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#f1f5f9' },
  subtitle: { fontSize: '14px', color: '#94a3b8', margin: 0 },
  headerActions: { display: 'flex', gap: '8px' },
  actionBtn: { background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },

  riskStrip: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' },
  riskMain: { textAlign: 'center' },
  riskTrend: { fontSize: '13px', color: '#94a3b8', marginTop: '4px' },
  riskMetrics: { display: 'flex', gap: '24px' },
  metric: { textAlign: 'center' },
  metricValue: { fontSize: '28px', fontWeight: 'bold', color: '#f1f5f9' },
  metricLabel: { fontSize: '12px', color: '#64748b' },
  riskSources: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  sourceChip: { display: 'flex', alignItems: 'center', gap: '6px', background: '#1e293b', borderRadius: '6px', padding: '6px 12px', fontSize: '13px' },
  topRisks: { flex: '1 1 100%', display: 'flex', flexDirection: 'column', gap: '4px' },
  riskItem: { fontSize: '13px', color: '#fbbf24' },

  timelineBar: { display: 'flex', alignItems: 'flex-end', gap: '2px', height: '48px', background: '#0f172a', borderRadius: '8px', padding: '4px 8px', marginBottom: '20px' },
  timelineCol: { width: '8px', borderRadius: '2px', minHeight: '4px' },

  tabs: { display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #1e293b', paddingBottom: '12px' },
  tab: { background: 'transparent', color: '#94a3b8', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  tabActive: { background: '#1e293b', color: '#f1f5f9' },

  overviewGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' },
  scoreCard: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px', textAlign: 'center' },
  scoreHeader: { fontSize: '14px', color: '#94a3b8', marginBottom: '8px' },
  scoreVal: { fontSize: '36px', fontWeight: 'bold' },
  scoreDesc: { fontSize: '12px', color: '#64748b', marginTop: '8px' },

  list: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  empty: { textAlign: 'center', padding: '32px', color: '#64748b' },

  alertCard: { background: '#0f172a', border: '1px solid #1e293b', borderLeft: '4px solid', borderRadius: '8px', padding: '16px' },
  corrCard: { background: '#0f172a', border: '1px solid #1e293b', borderLeft: '4px solid', borderRadius: '8px', padding: '16px' },
  alertHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' },
  alertInfo: { flex: 1 },
  alertTitle: { fontSize: '14px', fontWeight: 600, color: '#f1f5f9' },
  alertMeta: { fontSize: '12px', color: '#64748b' },
  alertDesc: { fontSize: '13px', color: '#94a3b8', lineHeight: 1.5, marginBottom: '8px' },
  statusBadge: { padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 },
  alertActions: { display: 'flex', gap: '8px' },
  alertBtn: { background: '#1e293b', color: '#94a3b8', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' },
  corrSources: { display: 'flex', gap: '6px', flexWrap: 'wrap' as const, marginTop: '8px' },
  sourceTag: { background: '#1e293b', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', color: '#94a3b8' },
  agentTag: { background: '#1e3a5f', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', color: '#60a5fa' },

  reportCard: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' },
  reportHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  reportTitle: { fontSize: '16px', fontWeight: 600, color: '#f1f5f9' },
  reportMeta: { fontSize: '12px', color: '#64748b' },
  reportScore: { fontSize: '28px', fontWeight: 'bold' },
  reportSummary: { fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '12px' },
  reportStats: { display: 'flex', gap: '16px', fontSize: '13px', color: '#94a3b8', marginBottom: '12px', flexWrap: 'wrap' as const },
  reportFindings: { borderTop: '1px solid #1e293b', paddingTop: '12px' },
  findingItem: { fontSize: '13px', color: '#94a3b8', marginBottom: '4px' },
};
