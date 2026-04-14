// Conflux Home — Agent Audit Dashboard
// Mission 1224 Phase 4: Agent-vs-Agent Security
// Viper attacks other agents, scores defense, generates report

import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

// ── Types ──

interface AuditRun {
  id: string;
  run_type: string;
  status: string;
  overall_score: number | null;
  total_agents: number;
  agents_passed: number;
  agents_warning: number;
  agents_failed: number;
  started_at: string;
  completed_at: string | null;
}

interface AgentResult {
  id: string;
  run_id: string;
  agent_id: string;
  agent_name: string;
  agent_emoji: string;
  defense_score: number;
  total_attacks: number;
  blocked_count: number;
  partial_count: number;
  breached_count: number;
}

interface AuditFinding {
  id: string;
  result_id: string;
  attack_type: string;
  attack_name: string;
  severity: 'pass' | 'partial' | 'breach';
  attack_prompt: string;
  agent_response: string | null;
  indicator: string | null;
  description: string;
  remediation: string | null;
  raw_data: unknown;
}

// ── Constants ──

const ATTACK_TYPE_ICONS: Record<string, string> = {
  prompt_injection: '💉',
  data_exfil: '📤',
  priv_escalation: '⬆️',
  instruction_override: '🔄',
  social_engineering: '🎭',
};

const ATTACK_TYPE_LABELS: Record<string, string> = {
  prompt_injection: 'Prompt Injection',
  data_exfil: 'Data Exfiltration',
  priv_escalation: 'Privilege Escalation',
  instruction_override: 'Instruction Override',
  social_engineering: 'Social Engineering',
};

function scoreColor(score: number): string {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function scoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 40) return 'Vulnerable';
  return 'Critical';
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'pass': return '#22c55e';
    case 'partial': return '#f59e0b';
    case 'breach': return '#ef4444';
    default: return '#6b7280';
  }
}

function severityIcon(severity: string): string {
  switch (severity) {
    case 'pass': return '✅';
    case 'partial': return '⚠️';
    case 'breach': return '🔴';
    default: return '❓';
  }
}

// ── Component ──

export default function AgentAuditDashboard() {
  const [runs, setRuns] = useState<AuditRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<AuditRun | null>(null);
  const [results, setResults] = useState<AgentResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<AgentResult | null>(null);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [filterType, setFilterType] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'findings' | 'history'>('overview');

  const loadRuns = useCallback(async () => {
    try {
      const data = await invoke<AuditRun[]>('agent_audit_get_runs', { limit: 20 });
      setRuns(data);
      if (data.length > 0 && !selectedRun) setSelectedRun(data[0]);
    } catch (err) {
      console.error('[AgentAudit] Failed to load runs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedRun]);

  const loadResults = useCallback(async () => {
    if (!selectedRun) return;
    try {
      const data = await invoke<AgentResult[]>('agent_audit_get_results', { runId: selectedRun.id });
      setResults(data);
      if (data.length > 0 && !selectedResult) setSelectedResult(data[0]);
    } catch (err) {
      console.error('[AgentAudit] Failed to load results:', err);
    }
  }, [selectedRun, selectedResult]);

  const loadFindings = useCallback(async () => {
    if (!selectedResult) return;
    try {
      const args: Record<string, string> = { resultId: selectedResult.id };
      if (filterType) args.attackType = filterType;
      const data = await invoke<AuditFinding[]>('agent_audit_get_findings', args);
      setFindings(filterSeverity ? data.filter(f => f.severity === filterSeverity) : data);
    } catch (err) {
      console.error('[AgentAudit] Failed to load findings:', err);
    }
  }, [selectedResult, filterType, filterSeverity]);

  useEffect(() => { loadRuns(); }, [loadRuns]);
  useEffect(() => { loadResults(); }, [loadResults]);
  useEffect(() => { loadFindings(); }, [loadFindings]);

  const runAudit = async () => {
    setAuditing(true);
    try {
      const runId = await invoke<string>('agent_audit_run_full');
      console.log('[AgentAudit] Audit complete:', runId);
      await loadRuns();
    } catch (err) {
      console.error('[AgentAudit] Audit failed:', err);
    } finally {
      setAuditing(false);
    }
  };

  const deleteRun = async (runId: string) => {
    try {
      await invoke('agent_audit_delete_run', { runId });
      if (selectedRun?.id === runId) setSelectedRun(null);
      await loadRuns();
    } catch (err) {
      console.error('[AgentAudit] Delete failed:', err);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading agent audit data...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>⚔️</span>
          <div>
            <h1 style={styles.title}>Agent Audit</h1>
            <p style={styles.subtitle}>Agent-vs-Agent Security — Viper Red Team</p>
          </div>
        </div>
        <button
          style={{ ...styles.runButton, ...(auditing ? styles.runButtonDisabled : {}) }}
          onClick={runAudit}
          disabled={auditing}
        >
          {auditing ? '🔄 Running Audit...' : '🐍 Run Agent Audit'}
        </button>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {(['overview', 'agents', 'findings', 'history'] as const).map(tab => (
          <button
            key={tab}
            style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview' ? '📊 Overview' :
             tab === 'agents' ? '🤖 Agents' :
             tab === 'findings' ? '🔍 Findings' : '📜 History'}
          </button>
        ))}
      </div>

      {/* No data state */}
      {!selectedRun && runs.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>⚔️</div>
          <h2 style={styles.emptyTitle}>No Agent Audits Yet</h2>
          <p style={styles.emptyText}>
            Run your first agent audit to test how well your AI agents resist
            prompt injection, data exfiltration, and social engineering attacks.
          </p>
          <button style={styles.runButton} onClick={runAudit}>
            🐍 Run First Audit
          </button>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && selectedRun && (
        <div style={styles.overview}>
          {/* Overall Score Card */}
          <div style={styles.scoreCard}>
            <div style={styles.scoreCircle}>
              <svg width="180" height="180" viewBox="0 0 180 180">
                <circle cx="90" cy="90" r="80" fill="none" stroke="#1e293b" strokeWidth="12" />
                <circle
                  cx="90" cy="90" r="80" fill="none"
                  stroke={scoreColor(selectedRun.overall_score ?? 0)}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${((selectedRun.overall_score ?? 0) / 100) * 502.65} 502.65`}
                  transform="rotate(-90 90 90)"
                />
                <text x="90" y="82" textAnchor="middle" fill="white" fontSize="42" fontWeight="bold">
                  {selectedRun.overall_score ?? '—'}
                </text>
                <text x="90" y="105" textAnchor="middle" fill="#94a3b8" fontSize="13">
                  DEFENSE SCORE
                </text>
              </svg>
            </div>
            <div style={styles.scoreDetails}>
              <div style={styles.scoreLabel}>
                {scoreLabel(selectedRun.overall_score ?? 0)} Defense
              </div>
              <div style={styles.scoreMeta}>
                {selectedRun.total_agents} agents tested • {selectedRun.run_type} scan
              </div>
              <div style={styles.statusRow}>
                <span style={{ ...styles.statusBadge, background: '#22c55e22', color: '#22c55e' }}>
                  ✅ {selectedRun.agents_passed} passed
                </span>
                <span style={{ ...styles.statusBadge, background: '#f59e0b22', color: '#f59e0b' }}>
                  ⚠️ {selectedRun.agents_warning} warning
                </span>
                <span style={{ ...styles.statusBadge, background: '#ef444422', color: '#ef4444' }}>
                  🔴 {selectedRun.agents_failed} failed
                </span>
              </div>
            </div>
          </div>

          {/* Agent Score Cards */}
          <div style={styles.agentGrid}>
            {results.map(r => (
              <div
                key={r.id}
                style={{
                  ...styles.agentCard,
                  borderColor: selectedResult?.id === r.id ? scoreColor(r.defense_score) : '#1e293b',
                }}
                onClick={() => setSelectedResult(r)}
              >
                <div style={styles.agentCardHeader}>
                  <span style={styles.agentEmoji}>{r.agent_emoji}</span>
                  <span style={styles.agentName}>{r.agent_name}</span>
                </div>
                <div style={styles.agentScore}>
                  <span style={{ color: scoreColor(r.defense_score), fontSize: '28px', fontWeight: 'bold' }}>
                    {r.defense_score}
                  </span>
                  <span style={styles.agentScoreLabel}>/100</span>
                </div>
                <div style={styles.agentStats}>
                  <span style={{ color: '#22c55e' }}>✅ {r.blocked_count}</span>
                  <span style={{ color: '#f59e0b' }}>⚠️ {r.partial_count}</span>
                  <span style={{ color: '#ef4444' }}>🔴 {r.breached_count}</span>
                </div>
                <div style={styles.agentBar}>
                  <div style={{ ...styles.agentBarFill, background: '#22c55e', width: `${(r.blocked_count / r.total_attacks) * 100}%` }} />
                  <div style={{ ...styles.agentBarFill, background: '#f59e0b', width: `${(r.partial_count / r.total_attacks) * 100}%` }} />
                  <div style={{ ...styles.agentBarFill, background: '#ef4444', width: `${(r.breached_count / r.total_attacks) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agents Tab */}
      {activeTab === 'agents' && selectedRun && (
        <div style={styles.agentsTab}>
          {results.map(r => (
            <div
              key={r.id}
              style={{
                ...styles.agentDetailCard,
                borderColor: selectedResult?.id === r.id ? scoreColor(r.defense_score) : '#1e293b',
              }}
              onClick={() => { setSelectedResult(r); setActiveTab('findings'); }}
            >
              <div style={styles.agentDetailHeader}>
                <span style={styles.agentEmoji}>{r.agent_emoji}</span>
                <div>
                  <div style={styles.agentName}>{r.agent_name}</div>
                  <div style={styles.agentId}>ID: {r.agent_id}</div>
                </div>
                <div style={{ ...styles.agentDetailScore, color: scoreColor(r.defense_score) }}>
                  {r.defense_score}
                </div>
              </div>
              <div style={styles.agentDetailBar}>
                <div style={{ ...styles.agentBarSegment, background: '#22c55e', flex: r.blocked_count }}>
                  {r.blocked_count > 0 && `${r.blocked_count} blocked`}
                </div>
                <div style={{ ...styles.agentBarSegment, background: '#f59e0b', flex: r.partial_count }}>
                  {r.partial_count > 0 && `${r.partial_count} partial`}
                </div>
                <div style={{ ...styles.agentBarSegment, background: '#ef4444', flex: r.breached_count }}>
                  {r.breached_count > 0 && `${r.breached_count} breached`}
                </div>
              </div>
              <div style={styles.agentDetailMeta}>
                {r.total_attacks} attacks • {scoreLabel(r.defense_score)} defense
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Findings Tab */}
      {activeTab === 'findings' && selectedResult && (
        <div style={styles.findingsTab}>
          <div style={styles.findingsHeader}>
            <span style={styles.agentEmoji}>{selectedResult.agent_emoji}</span>
            <h3 style={styles.findingsTitle}>
              {selectedResult.agent_name} — Defense Score: {selectedResult.defense_score}/100
            </h3>
          </div>

          {/* Filters */}
          <div style={styles.filters}>
            <select
              style={styles.filterSelect}
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="">All Attack Types</option>
              {Object.entries(ATTACK_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{ATTACK_TYPE_ICONS[key]} {label}</option>
              ))}
            </select>
            <select
              style={styles.filterSelect}
              value={filterSeverity}
              onChange={e => setFilterSeverity(e.target.value)}
            >
              <option value="">All Severities</option>
              <option value="breach">🔴 Breached</option>
              <option value="partial">⚠️ Partial</option>
              <option value="pass">✅ Passed</option>
            </select>
          </div>

          {/* Findings list */}
          <div style={styles.findingsList}>
            {findings.map(f => (
              <FindingCard key={f.id} finding={f} />
            ))}
            {findings.length === 0 && (
              <div style={styles.noFindings}>
                No findings match the current filters.
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div style={styles.historyTab}>
          {runs.map(run => (
            <div
              key={run.id}
              style={{
                ...styles.historyCard,
                borderColor: selectedRun?.id === run.id ? '#3b82f6' : '#1e293b',
              }}
              onClick={() => setSelectedRun(run)}
            >
              <div style={styles.historyHeader}>
                <div>
                  <div style={styles.historyDate}>
                    {new Date(run.started_at).toLocaleDateString()} {' '}
                    {new Date(run.started_at).toLocaleTimeString()}
                  </div>
                  <div style={styles.historyMeta}>
                    {run.run_type} • {run.total_agents} agents • {run.status}
                  </div>
                </div>
                <div style={{ ...styles.historyScore, color: scoreColor(run.overall_score ?? 0) }}>
                  {run.overall_score ?? '—'}
                </div>
              </div>
              <div style={styles.historyStats}>
                <span style={{ color: '#22c55e' }}>✅ {run.agents_passed}</span>
                <span style={{ color: '#f59e0b' }}>⚠️ {run.agents_warning}</span>
                <span style={{ color: '#ef4444' }}>🔴 {run.agents_failed}</span>
              </div>
              <button
                style={styles.deleteButton}
                onClick={e => { e.stopPropagation(); deleteRun(run.id); }}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Finding Card (expandable) ──

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
        <span style={styles.findingSeverity}>{severityIcon(finding.severity)}</span>
        <span style={styles.findingIcon}>
          {ATTACK_TYPE_ICONS[finding.attack_type] || '🔍'}
        </span>
        <div style={styles.findingInfo}>
          <div style={styles.findingName}>{finding.attack_name.replace(/_/g, ' ')}</div>
          <div style={styles.findingType}>
            {ATTACK_TYPE_LABELS[finding.attack_type] || finding.attack_type}
          </div>
        </div>
        <span style={{ ...styles.findingSeverityBadge, background: severityColor(finding.severity) + '22', color: severityColor(finding.severity) }}>
          {finding.severity.toUpperCase()}
        </span>
        <span style={styles.expandIcon}>{expanded ? '▼' : '▶'}</span>
      </div>

      <div style={styles.findingDescription}>{finding.description}</div>

      {expanded && (
        <div style={styles.findingExpanded}>
          <div style={styles.findingSection}>
            <div style={styles.findingSectionTitle}>🎯 Attack Prompt</div>
            <pre style={styles.findingCode}>{finding.attack_prompt}</pre>
          </div>

          {finding.agent_response && (
            <div style={styles.findingSection}>
              <div style={styles.findingSectionTitle}>🤖 Agent Response</div>
              <pre style={styles.findingCode}>{finding.agent_response}</pre>
            </div>
          )}

          {finding.indicator && (
            <div style={styles.findingSection}>
              <div style={styles.findingSectionTitle}>🔍 Detection Indicator</div>
              <div style={styles.findingIndicator}>{finding.indicator}</div>
            </div>
          )}

          {finding.remediation && (
            <div style={styles.findingSection}>
              <div style={styles.findingSectionTitle}>🔧 Remediation</div>
              <div style={styles.findingRemediation}>{finding.remediation}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    color: '#e2e8f0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loading: {
    textAlign: 'center',
    padding: '48px',
    color: '#94a3b8',
    fontSize: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerIcon: {
    fontSize: '32px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
    color: '#f1f5f9',
  },
  subtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0,
  },
  runButton: {
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  runButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '24px',
    borderBottom: '1px solid #1e293b',
    paddingBottom: '12px',
  },
  tab: {
    background: 'transparent',
    color: '#94a3b8',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  tabActive: {
    background: '#1e293b',
    color: '#f1f5f9',
  },

  // Overview
  overview: {},
  scoreCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
  },
  scoreCircle: {},
  scoreDetails: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: '8px',
  },
  scoreMeta: {
    fontSize: '14px',
    color: '#94a3b8',
    marginBottom: '16px',
  },
  statusRow: {
    display: 'flex',
    gap: '12px',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
  },

  // Agent Grid
  agentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '16px',
  },
  agentCard: {
    background: '#0f172a',
    border: '2px solid #1e293b',
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  agentCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  agentEmoji: {
    fontSize: '24px',
  },
  agentName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#f1f5f9',
  },
  agentScore: {
    marginBottom: '8px',
  },
  agentScoreLabel: {
    fontSize: '14px',
    color: '#64748b',
    marginLeft: '4px',
  },
  agentStats: {
    display: 'flex',
    gap: '12px',
    fontSize: '13px',
    marginBottom: '8px',
  },
  agentBar: {
    display: 'flex',
    height: '6px',
    borderRadius: '3px',
    overflow: 'hidden',
    background: '#1e293b',
  },
  agentBarFill: {
    height: '100%',
    transition: 'width 0.3s',
  },

  // Agents Tab
  agentsTab: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  agentDetailCard: {
    background: '#0f172a',
    border: '2px solid #1e293b',
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  agentDetailHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  agentDetailScore: {
    marginLeft: 'auto',
    fontSize: '32px',
    fontWeight: 'bold',
  },
  agentId: {
    fontSize: '12px',
    color: '#64748b',
  },
  agentDetailBar: {
    display: 'flex',
    height: '24px',
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  agentBarSegment: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 600,
    color: 'white',
    minWidth: '0',
    transition: 'flex 0.3s',
  },
  agentDetailMeta: {
    fontSize: '13px',
    color: '#94a3b8',
    textAlign: 'center',
  },

  // Findings Tab
  findingsTab: {},
  findingsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  findingsTitle: {
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
    color: '#f1f5f9',
  },
  filters: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  filterSelect: {
    background: '#0f172a',
    color: '#e2e8f0',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
  },
  findingsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  noFindings: {
    textAlign: 'center',
    padding: '32px',
    color: '#64748b',
  },
  findingCard: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderLeft: '4px solid',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  findingHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    cursor: 'pointer',
  },
  findingSeverity: {
    fontSize: '16px',
  },
  findingIcon: {
    fontSize: '18px',
  },
  findingInfo: {
    flex: 1,
  },
  findingName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#f1f5f9',
    textTransform: 'capitalize',
  },
  findingType: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  findingSeverityBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 700,
  },
  expandIcon: {
    color: '#64748b',
    fontSize: '12px',
  },
  findingDescription: {
    padding: '0 16px 12px',
    fontSize: '13px',
    color: '#94a3b8',
    lineHeight: 1.5,
  },
  findingExpanded: {
    borderTop: '1px solid #1e293b',
    padding: '16px',
  },
  findingSection: {
    marginBottom: '16px',
  },
  findingSectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: '8px',
  },
  findingCode: {
    background: '#020617',
    border: '1px solid #1e293b',
    borderRadius: '6px',
    padding: '12px',
    fontSize: '13px',
    color: '#e2e8f0',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word' as const,
    maxHeight: '200px',
    overflow: 'auto',
    fontFamily: '"SF Mono", Monaco, Consolas, monospace',
    lineHeight: 1.5,
  },
  findingIndicator: {
    background: '#1e293b',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '13px',
    color: '#fbbf24',
  },
  findingRemediation: {
    background: '#0f2922',
    border: '1px solid #134e4a',
    borderRadius: '6px',
    padding: '12px',
    fontSize: '13px',
    color: '#6ee7b7',
    lineHeight: 1.5,
  },

  // History Tab
  historyTab: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  historyCard: {
    background: '#0f172a',
    border: '2px solid #1e293b',
    borderRadius: '10px',
    padding: '16px',
    cursor: 'pointer',
    position: 'relative',
    transition: 'border-color 0.2s',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  historyDate: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#f1f5f9',
  },
  historyMeta: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  historyScore: {
    fontSize: '28px',
    fontWeight: 'bold',
  },
  historyStats: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
  },
  deleteButton: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    opacity: 0.5,
    transition: 'opacity 0.2s',
  },

  // Empty State
  emptyState: {
    textAlign: 'center',
    padding: '64px 24px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '22px',
    fontWeight: 600,
    color: '#f1f5f9',
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '15px',
    color: '#94a3b8',
    maxWidth: '500px',
    margin: '0 auto 24px',
    lineHeight: 1.6,
  },
};
