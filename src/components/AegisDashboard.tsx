// Conflux Home — Aegis System Audit Dashboard
// Mission 1224 Phase 2: Blue Team Guardian

import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

// ── Types ──

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

// ── Category Icons ──

const CATEGORY_ICONS: Record<string, string> = {
  firewall: '🧱',
  ports: '🔌',
  ssh: '🔑',
  permissions: '📂',
  software: '📦',
  cron: '⏰',
  general: '🛡️',
};

const CATEGORY_COLORS: Record<string, string> = {
  firewall: '#f97316',
  ports: '#06b6d4',
  ssh: '#eab308',
  permissions: '#8b5cf6',
  software: '#22c55e',
  cron: '#ec4899',
  general: '#6366f1',
};

// ── Component ──

export default function AegisDashboard() {
  const [runs, setRuns] = useState<AuditRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<AuditRun | null>(null);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'findings' | 'history'>('overview');

  // Load audit runs
  const loadRuns = useCallback(async () => {
    try {
      const data = await invoke<AuditRun[]>('aegis_get_runs', { limit: 20 });
      setRuns(data);
      if (data.length > 0 && !selectedRun) {
        setSelectedRun(data[0]);
      }
    } catch (err) {
      console.error('[Aegis] Failed to load runs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedRun]);

  // Load findings for selected run
  const loadFindings = useCallback(async () => {
    if (!selectedRun) return;
    try {
      const data = await invoke<AuditFinding[]>('aegis_get_findings', {
        runId: selectedRun.id,
        category: filterCategory || undefined,
      });
      setFindings(data);
    } catch (err) {
      console.error('[Aegis] Failed to load findings:', err);
    }
  }, [selectedRun, filterCategory]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  useEffect(() => {
    loadFindings();
  }, [loadFindings]);

  // Run a new audit
  const handleRunAudit = async (runType: 'full' | 'quick') => {
    setScanning(true);
    try {
      const runId = await invoke<string>('aegis_run_audit', { runType });
      console.log('[Aegis] Audit complete:', runId);
      await loadRuns();
      // Select the new run
      const data = await invoke<AuditRun[]>('aegis_get_runs', { limit: 1 });
      if (data.length > 0) {
        setSelectedRun(data[0]);
      }
    } catch (err) {
      console.error('[Aegis] Audit failed:', err);
    } finally {
      setScanning(false);
    }
  };

  // Filter findings by severity
  const filteredFindings = filterSeverity
    ? findings.filter((f) => f.severity === filterSeverity)
    : findings;

  // Group findings by category
  const findingsByCategory = findings.reduce(
    (acc, f) => {
      if (!acc[f.category]) acc[f.category] = [];
      acc[f.category].push(f);
      return acc;
    },
    {} as Record<string, AuditFinding[]>
  );

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingSpinner}>🛡️</div>
        <div style={styles.loadingText}>Loading Aegis System Audit...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>🛡️</span>
          <div>
            <h1 style={styles.title}>Aegis — System Audit</h1>
            <p style={styles.subtitle}>Blue Team Guardian • Security Hardening</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <button
            style={{ ...styles.scanButton, opacity: scanning ? 0.5 : 1 }}
            onClick={() => handleRunAudit('quick')}
            disabled={scanning}
          >
            ⚡ Quick Scan
          </button>
          <button
            style={{
              ...styles.scanButton,
              backgroundColor: '#6366f1',
              borderColor: '#6366f1',
              opacity: scanning ? 0.5 : 1,
            }}
            onClick={() => handleRunAudit('full')}
            disabled={scanning}
          >
            {scanning ? '🔄 Scanning...' : '🔍 Full Audit'}
          </button>
        </div>
      </div>

      {/* Score Card */}
      {selectedRun && (
        <div style={styles.scoreSection}>
          <div style={styles.scoreCard}>
            <div
              style={{
                ...styles.scoreCircle,
                borderColor: scoreColor(selectedRun.overall_score),
              }}
            >
              <span style={{ ...styles.scoreValue, color: scoreColor(selectedRun.overall_score) }}>
                {selectedRun.overall_score ?? '—'}
              </span>
              <span style={styles.scoreLabel}>Score</span>
            </div>
            <div style={styles.scoreMeta}>
              <div style={styles.scoreMetaRow}>
                <span style={styles.metaLabel}>Run Type</span>
                <span style={styles.metaValue}>{selectedRun.run_type}</span>
              </div>
              <div style={styles.scoreMetaRow}>
                <span style={styles.metaLabel}>Status</span>
                <span style={styles.metaValue}>{selectedRun.status}</span>
              </div>
              <div style={styles.scoreMetaRow}>
                <span style={styles.metaLabel}>Started</span>
                <span style={styles.metaValue}>{formatTime(selectedRun.started_at)}</span>
              </div>
            </div>
          </div>

          <div style={styles.countCards}>
            <div style={{ ...styles.countCard, borderTopColor: '#22c55e' }}>
              <div style={{ ...styles.countValue, color: '#22c55e' }}>
                {selectedRun.pass_count}
              </div>
              <div style={styles.countLabel}>Passed</div>
            </div>
            <div style={{ ...styles.countCard, borderTopColor: '#f59e0b' }}>
              <div style={{ ...styles.countValue, color: '#f59e0b' }}>
                {selectedRun.warn_count}
              </div>
              <div style={styles.countLabel}>Warnings</div>
            </div>
            <div style={{ ...styles.countCard, borderTopColor: '#ef4444' }}>
              <div style={{ ...styles.countValue, color: '#ef4444' }}>
                {selectedRun.critical_count}
              </div>
              <div style={styles.countLabel}>Critical</div>
            </div>
            <div style={{ ...styles.countCard, borderTopColor: '#6366f1' }}>
              <div style={{ ...styles.countValue, color: '#94a3b8' }}>
                {selectedRun.total_checks}
              </div>
              <div style={styles.countLabel}>Total Checks</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        {(['overview', 'findings', 'history'] as const).map((tab) => (
          <button
            key={tab}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview' && '📊 Overview'}
            {tab === 'findings' && `🔍 Findings (${filteredFindings.length})`}
            {tab === 'history' && `📋 History (${runs.length})`}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={styles.tabContent}>
        {activeTab === 'overview' && (
          <OverviewTab findingsByCategory={findingsByCategory} />
        )}
        {activeTab === 'findings' && (
          <FindingsTab
            findings={filteredFindings}
            filterCategory={filterCategory}
            filterSeverity={filterSeverity}
            onFilterCategory={setFilterCategory}
            onFilterSeverity={setFilterSeverity}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab
            runs={runs}
            selectedRun={selectedRun}
            onSelect={setSelectedRun}
          />
        )}
      </div>
    </div>
  );
}

// ── Overview Tab ──

function OverviewTab({
  findingsByCategory,
}: {
  findingsByCategory: Record<string, AuditFinding[]>;
}) {
  const categories = Object.keys(findingsByCategory).sort();

  if (categories.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🛡️</div>
        <div>No audit data yet. Run a system audit to see results.</div>
      </div>
    );
  }

  return (
    <div>
      {categories.map((cat) => {
        const catFindings = findingsByCategory[cat];
        const critical = catFindings.filter((f) => f.severity === 'critical').length;
        const warnings = catFindings.filter((f) => f.severity === 'warning').length;
        const passes = catFindings.filter((f) => f.severity === 'pass').length;

        return (
          <div key={cat} style={styles.section}>
            <div style={styles.categoryHeader}>
              <span style={styles.categoryIcon}>{CATEGORY_ICONS[cat] || '📋'}</span>
              <h3 style={styles.sectionTitle}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</h3>
              <div style={styles.categoryCounts}>
                {passes > 0 && <span style={{ color: '#22c55e' }}>✓ {passes}</span>}
                {warnings > 0 && <span style={{ color: '#f59e0b' }}>⚠ {warnings}</span>}
                {critical > 0 && <span style={{ color: '#ef4444' }}>🔴 {critical}</span>}
              </div>
            </div>
            <div style={styles.findingList}>
              {catFindings.map((f) => (
                <FindingCard key={f.id} finding={f} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Findings Tab ──

function FindingsTab({
  findings,
  filterCategory,
  filterSeverity,
  onFilterCategory,
  onFilterSeverity,
}: {
  findings: AuditFinding[];
  filterCategory: string;
  filterSeverity: string;
  onFilterCategory: (v: string) => void;
  onFilterSeverity: (v: string) => void;
}) {
  const categories = [...new Set(findings.map((f) => f.category))];

  return (
    <div>
      {/* Filters */}
      <div style={styles.filters}>
        <select
          style={styles.filterSelect}
          value={filterCategory}
          onChange={(e) => onFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_ICONS[c] || '📋'} {c}
            </option>
          ))}
        </select>
        <select
          style={styles.filterSelect}
          value={filterSeverity}
          onChange={(e) => onFilterSeverity(e.target.value)}
        >
          <option value="">All Severities</option>
          <option value="critical">🔴 Critical</option>
          <option value="warning">🟡 Warning</option>
          <option value="info">ℹ️ Info</option>
          <option value="pass">✅ Pass</option>
        </select>
      </div>

      {/* Findings List */}
      <div style={styles.findingList}>
        {findings.map((f) => (
          <FindingCard key={f.id} finding={f} />
        ))}
        {findings.length === 0 && (
          <div style={styles.emptyState}>
            No findings match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}

// ── History Tab ──

function HistoryTab({
  runs,
  selectedRun,
  onSelect,
}: {
  runs: AuditRun[];
  selectedRun: AuditRun | null;
  onSelect: (run: AuditRun) => void;
}) {
  return (
    <div style={styles.historyList}>
      {runs.map((run) => (
        <div
          key={run.id}
          style={{
            ...styles.historyRow,
            ...(selectedRun?.id === run.id ? styles.historyRowActive : {}),
          }}
          onClick={() => onSelect(run)}
        >
          <div style={styles.historyInfo}>
            <div style={styles.historyType}>
              {run.run_type === 'full' ? '🔍' : '⚡'} {run.run_type} audit
            </div>
            <div style={styles.historyTime}>{formatTime(run.started_at)}</div>
          </div>
          <div style={styles.historyStats}>
            <span style={{ color: '#22c55e' }}>✓{run.pass_count}</span>
            <span style={{ color: '#f59e0b' }}>⚠{run.warn_count}</span>
            <span style={{ color: '#ef4444' }}>🔴{run.critical_count}</span>
          </div>
          <div
            style={{
              ...styles.historyScore,
              color: scoreColor(run.overall_score),
            }}
          >
            {run.overall_score ?? '—'}
          </div>
        </div>
      ))}
      {runs.length === 0 && (
        <div style={styles.emptyState}>
          No audit runs yet. Click "Full Audit" to start.
        </div>
      )}
    </div>
  );
}

// ── Finding Card ──

function FindingCard({ finding }: { finding: AuditFinding }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        ...styles.findingCard,
        borderLeftColor: severityColor(finding.severity),
      }}
    >
      <div style={styles.findingHeader} onClick={() => setExpanded(!expanded)}>
        <span style={styles.findingSeverity}>
          {severityIcon(finding.severity)}
        </span>
        <div style={styles.findingInfo}>
          <div style={styles.findingTitle}>{finding.title}</div>
          <div style={styles.findingCategory}>
            {CATEGORY_ICONS[finding.category] || '📋'} {finding.category}
          </div>
        </div>
        <span style={styles.expandIcon}>{expanded ? '▼' : '▶'}</span>
      </div>
      {expanded && (
        <div style={styles.findingDetails}>
          <div style={styles.findingDesc}>{finding.description}</div>
          {finding.recommendation && (
            <div style={styles.findingRec}>
              <strong>💡 Recommendation:</strong> {finding.recommendation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ──

function scoreColor(score: number | null): string {
  if (score === null) return '#64748b';
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return '#ef4444';
    case 'warning': return '#f59e0b';
    case 'info': return '#3b82f6';
    case 'pass': return '#22c55e';
    default: return '#64748b';
  }
}

function severityIcon(severity: string): string {
  switch (severity) {
    case 'critical': return '🔴';
    case 'warning': return '🟡';
    case 'info': return 'ℹ️';
    case 'pass': return '✅';
    default: return '📋';
  }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 24,
    maxWidth: 1200,
    margin: '0 auto',
    color: '#e2e8f0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
    color: '#94a3b8',
  },
  loadingSpinner: {
    fontSize: 48,
    animation: 'pulse 2s infinite',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: '1px solid #1e293b',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    fontSize: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
    color: '#f1f5f9',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    margin: 0,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  scanButton: {
    padding: '8px 16px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#e2e8f0',
    cursor: 'pointer',
    fontSize: 14,
  },
  scoreSection: {
    display: 'flex',
    gap: 24,
    marginBottom: 24,
  },
  scoreCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    padding: 24,
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 12,
    flex: 1,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    border: '4px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 700,
  },
  scoreLabel: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  scoreMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  scoreMetaRow: {
    display: 'flex',
    gap: 12,
  },
  metaLabel: {
    color: '#64748b',
    fontSize: 13,
    width: 80,
  },
  metaValue: {
    color: '#e2e8f0',
    fontSize: 13,
    textTransform: 'capitalize' as const,
  },
  countCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
    flex: 1,
  },
  countCard: {
    padding: 16,
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 12,
    textAlign: 'center' as const,
    borderTop: '3px solid',
  },
  countValue: {
    fontSize: 28,
    fontWeight: 700,
  },
  countLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  tabs: {
    display: 'flex',
    gap: 4,
    marginBottom: 20,
    borderBottom: '1px solid #1e293b',
  },
  tab: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  },
  tabActive: {
    color: '#f1f5f9',
    borderBottomColor: '#6366f1',
  },
  tabContent: {
    minHeight: 300,
  },
  section: {
    marginBottom: 24,
  },
  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categoryIcon: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#94a3b8',
    margin: 0,
  },
  categoryCounts: {
    display: 'flex',
    gap: 12,
    fontSize: 13,
    fontWeight: 600,
    marginLeft: 'auto',
  },
  findingList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  findingCard: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderLeft: '3px solid',
    overflow: 'hidden',
  },
  findingHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    cursor: 'pointer',
  },
  findingSeverity: {
    fontSize: 16,
    width: 24,
    textAlign: 'center' as const,
  },
  findingInfo: {
    flex: 1,
    minWidth: 0,
  },
  findingTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: '#e2e8f0',
  },
  findingCategory: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 10,
    color: '#475569',
    flexShrink: 0,
  },
  findingDetails: {
    padding: '0 14px 12px 48px',
  },
  findingDesc: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 1.5,
    marginBottom: 8,
  },
  findingRec: {
    fontSize: 13,
    color: '#a5b4fc',
    backgroundColor: '#1e293b',
    padding: '8px 12px',
    borderRadius: 6,
    lineHeight: 1.5,
  },
  filters: {
    display: 'flex',
    gap: 12,
    marginBottom: 16,
  },
  filterSelect: {
    padding: '6px 12px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 6,
    color: '#e2e8f0',
    fontSize: 13,
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  historyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '12px 16px',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    cursor: 'pointer',
    border: '1px solid transparent',
  },
  historyRowActive: {
    borderColor: '#6366f1',
    backgroundColor: '#1e1b4b',
  },
  historyInfo: {
    flex: 1,
  },
  historyType: {
    fontSize: 14,
    fontWeight: 500,
    textTransform: 'capitalize' as const,
  },
  historyTime: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  historyStats: {
    display: 'flex',
    gap: 12,
    fontSize: 13,
    fontWeight: 600,
  },
  historyScore: {
    fontSize: 24,
    fontWeight: 700,
    width: 50,
    textAlign: 'right' as const,
  },
  emptyState: {
    textAlign: 'center' as const,
    color: '#64748b',
    padding: 48,
    fontSize: 14,
  },
};
