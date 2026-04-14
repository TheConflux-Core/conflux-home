// Conflux Home — Security Command Center (SIEM Dashboard)
// Mission 1224: Agent Security & Monitoring

import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// ── Types ──

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

interface SecuritySummary {
  total_events: number;
  last_24h: number;
  blocked: number;
  high_risk: number;
  by_category: Record<string, number>;
  by_type: Record<string, number>;
  recent_anomalies: Array<{
    id: string;
    agent_id: string;
    target: string | null;
    risk_score: number;
    created_at: string;
  }>;
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

// ── Agent Colors ──

const AGENT_COLORS: Record<string, string> = {
  conflux: '#8b5cf6',
  helix: '#06b6d4',
  forge: '#f97316',
  quanta: '#22c55e',
  prism: '#3b82f6',
  pulse: '#ec4899',
  vector: '#eab308',
  spectra: '#a855f7',
  luma: '#14b8a6',
  catalyst: '#ef4444',
  aegis: '#6366f1',
  viper: '#22c55e',
};

// ── Component ──

export default function SecurityDashboard() {
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [prompts, setPrompts] = useState<PermissionPrompt[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'prompts'>('overview');
  const [filterAgent, setFilterAgent] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [summaryData, eventsData, promptsData] = await Promise.all([
        invoke<SecuritySummary>('security_get_summary'),
        invoke<SecurityEvent[]>('security_get_events', {
          agentId: filterAgent || undefined,
          eventType: filterType || undefined,
          limit: 50,
          offset: 0,
        }),
        invoke<PermissionPrompt[]>('security_get_pending_prompts', {
          agentId: undefined,
        }),
      ]);
      setSummary(summaryData);
      setEvents(eventsData);
      setPrompts(promptsData);
    } catch (err) {
      console.error('[Security] Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [filterAgent, filterType]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [loadData]);

  // Listen for real-time security events
  useEffect(() => {
    const unlisten = listen('security:event', (event) => {
      const newEvent = event.payload as SecurityEvent;
      setEvents((prev) => [newEvent, ...prev.slice(0, 49)]);
      // Refresh summary when new event comes in
      invoke<SecuritySummary>('security_get_summary').then(setSummary);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // Resolve a permission prompt
  const handleResolvePrompt = async (
    promptId: string,
    decision: 'allow_once' | 'allow_always' | 'deny_once' | 'deny_always'
  ) => {
    try {
      await invoke('security_resolve_prompt', { promptId, decision });
      setPrompts((prev) => prev.filter((p) => p.id !== promptId));
    } catch (err) {
      console.error('[Security] Failed to resolve prompt:', err);
    }
  };

  // Run anomaly scan
  const handleRunScan = async () => {
    try {
      const anomalies = await invoke('security_run_anomaly_scan');
      console.log('[Security] Scan complete:', anomalies);
      loadData();
    } catch (err) {
      console.error('[Security] Scan failed:', err);
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingSpinner}>🛡️</div>
        <div style={styles.loadingText}>Loading Security Command Center...</div>
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
            <h1 style={styles.title}>Security Command Center</h1>
            <p style={styles.subtitle}>Agent Security & SIEM Dashboard</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.scanButton} onClick={handleRunScan}>
            🔍 Run Anomaly Scan
          </button>
          {prompts.length > 0 && (
            <div style={styles.promptBadge}>
              {prompts.length} pending
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryValue}>{summary.total_events}</div>
            <div style={styles.summaryLabel}>Total Events</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryValue}>{summary.last_24h}</div>
            <div style={styles.summaryLabel}>Last 24h</div>
          </div>
          <div style={{ ...styles.summaryCard, borderColor: '#ef4444' }}>
            <div style={{ ...styles.summaryValue, color: '#ef4444' }}>{summary.blocked}</div>
            <div style={styles.summaryLabel}>Blocked</div>
          </div>
          <div style={{ ...styles.summaryCard, borderColor: '#f59e0b' }}>
            <div style={{ ...styles.summaryValue, color: '#f59e0b' }}>{summary.high_risk}</div>
            <div style={styles.summaryLabel}>High Risk</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        {(['overview', 'events', 'prompts'] as const).map((tab) => (
          <button
            key={tab}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview' && '📊 Overview'}
            {tab === 'events' && `📋 Events (${events.length})`}
            {tab === 'prompts' && `🔔 Prompts (${prompts.length})`}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={styles.tabContent}>
        {activeTab === 'overview' && summary && (
          <OverviewTab summary={summary} />
        )}
        {activeTab === 'events' && (
          <EventsTab
            events={events}
            filterAgent={filterAgent}
            filterType={filterType}
            onFilterAgent={setFilterAgent}
            onFilterType={setFilterType}
          />
        )}
        {activeTab === 'prompts' && (
          <PromptsTab prompts={prompts} onResolve={handleResolvePrompt} />
        )}
      </div>
    </div>
  );
}

// ── Overview Tab ──

function OverviewTab({ summary }: { summary: SecuritySummary }) {
  return (
    <div>
      {/* Events by Category */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Events by Category</h3>
        <div style={styles.barChart}>
          {Object.entries(summary.by_category).map(([cat, count]) => (
            <div key={cat} style={styles.barRow}>
              <span style={styles.barLabel}>
                {cat === 'critical' ? '🔴' : cat === 'warning' ? '🟡' : '🟢'} {cat}
              </span>
              <div style={styles.barTrack}>
                <div
                  style={{
                    ...styles.barFill,
                    width: `${Math.min(100, (count / Math.max(...Object.values(summary.by_category))) * 100)}%`,
                    backgroundColor:
                      cat === 'critical' ? '#ef4444' : cat === 'warning' ? '#f59e0b' : '#22c55e',
                  }}
                />
              </div>
              <span style={styles.barValue}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Events by Type */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Events by Type</h3>
        <div style={styles.barChart}>
          {Object.entries(summary.by_type).map(([type, count]) => (
            <div key={type} style={styles.barRow}>
              <span style={styles.barLabel}>
                {typeIcon(type)} {type.replace(/_/g, ' ')}
              </span>
              <div style={styles.barTrack}>
                <div
                  style={{
                    ...styles.barFill,
                    width: `${Math.min(100, (count / Math.max(...Object.values(summary.by_type))) * 100)}%`,
                    backgroundColor: '#6366f1',
                  }}
                />
              </div>
              <span style={styles.barValue}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Anomalies */}
      {summary.recent_anomalies.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>⚠️ Recent Anomalies</h3>
          {summary.recent_anomalies.map((a) => (
            <div key={a.id} style={styles.anomalyCard}>
              <div style={styles.anomalyHeader}>
                <span style={styles.anomalyAgent}>{a.agent_id}</span>
                <span
                  style={{
                    ...styles.anomalyRisk,
                    color: a.risk_score >= 70 ? '#ef4444' : '#f59e0b',
                  }}
                >
                  Risk: {a.risk_score}
                </span>
              </div>
              <div style={styles.anomalyTarget}>{a.target}</div>
              <div style={styles.anomalyTime}>{formatTime(a.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Events Tab ──

function EventsTab({
  events,
  filterAgent,
  filterType,
  onFilterAgent,
  onFilterType,
}: {
  events: SecurityEvent[];
  filterAgent: string;
  filterType: string;
  onFilterAgent: (v: string) => void;
  onFilterType: (v: string) => void;
}) {
  const agents = [...new Set(events.map((e) => e.agent_id))];
  const types = [...new Set(events.map((e) => e.event_type))];

  return (
    <div>
      {/* Filters */}
      <div style={styles.filters}>
        <select
          style={styles.filterSelect}
          value={filterAgent}
          onChange={(e) => onFilterAgent(e.target.value)}
        >
          <option value="">All Agents</option>
          {agents.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select
          style={styles.filterSelect}
          value={filterType}
          onChange={(e) => onFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Event List */}
      <div style={styles.eventList}>
        {events.map((event) => (
          <div
            key={event.id}
            style={{
              ...styles.eventRow,
              borderLeft: `3px solid ${categoryColor(event.category)}`,
            }}
          >
            <div style={styles.eventIcon}>{typeIcon(event.event_type)}</div>
            <div style={styles.eventInfo}>
              <div style={styles.eventHeader}>
                <span
                  style={{
                    ...styles.eventAgent,
                    color: AGENT_COLORS[event.agent_id] || '#8b5cf6',
                  }}
                >
                  {event.agent_id}
                </span>
                <span style={styles.eventType}>{event.event_type.replace(/_/g, ' ')}</span>
                {event.tool_name && (
                  <span style={styles.eventTool}>{event.tool_name}</span>
                )}
              </div>
              <div style={styles.eventTarget}>{event.target || '—'}</div>
            </div>
            <div style={styles.eventMeta}>
              {event.risk_score > 0 && (
                <span
                  style={{
                    ...styles.eventRisk,
                    color: event.risk_score >= 70 ? '#ef4444' : event.risk_score >= 40 ? '#f59e0b' : '#22c55e',
                  }}
                >
                  {event.risk_score}
                </span>
              )}
              {!event.was_allowed && (
                <span style={styles.eventBlocked}>🚫</span>
              )}
              <span style={styles.eventTime}>{formatTime(event.created_at)}</span>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div style={styles.emptyState}>No security events yet. Events will appear as agents perform actions.</div>
        )}
      </div>
    </div>
  );
}

// ── Prompts Tab ──

function PromptsTab({
  prompts,
  onResolve,
}: {
  prompts: PermissionPrompt[];
  onResolve: (id: string, decision: 'allow_once' | 'allow_always' | 'deny_once' | 'deny_always') => void;
}) {
  if (prompts.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div>No pending permission requests. Your agents are operating within their allowed boundaries.</div>
      </div>
    );
  }

  return (
    <div>
      {prompts.map((prompt) => (
        <div key={prompt.id} style={styles.promptCard}>
          <div style={styles.promptHeader}>
            <span style={styles.promptAgent}>
              {prompt.agent_emoji} {prompt.agent_name}
            </span>
            <span style={styles.promptType}>{prompt.request_type.replace(/_/g, ' ')}</span>
          </div>
          <div style={styles.promptTarget}>
            wants to access: <strong>{prompt.target}</strong>
            {prompt.tool_name && <> via <code>{prompt.tool_name}</code></>}
          </div>
          <div style={styles.promptActions}>
            <button
              style={{ ...styles.promptBtn, backgroundColor: '#22c55e' }}
              onClick={() => onResolve(prompt.id, 'allow_once')}
            >
              ✓ Allow Once
            </button>
            <button
              style={{ ...styles.promptBtn, backgroundColor: '#3b82f6' }}
              onClick={() => onResolve(prompt.id, 'allow_always')}
            >
              ✓ Always Allow
            </button>
            <button
              style={{ ...styles.promptBtn, backgroundColor: '#f59e0b' }}
              onClick={() => onResolve(prompt.id, 'deny_once')}
            >
              ✗ Deny Once
            </button>
            <button
              style={{ ...styles.promptBtn, backgroundColor: '#ef4444' }}
              onClick={() => onResolve(prompt.id, 'deny_always')}
            >
              ✗ Always Deny
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Helpers ──

function typeIcon(type: string): string {
  const icons: Record<string, string> = {
    file_access: '📁',
    network_request: '🌐',
    exec_command: '💻',
    api_call: '🔌',
    browser_action: '🌍',
    permission_denied: '🚫',
    anomaly: '⚠️',
  };
  return icons[type] || '📋';
}

function categoryColor(cat: string): string {
  return cat === 'critical' ? '#ef4444' : cat === 'warning' ? '#f59e0b' : '#22c55e';
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
  promptBadge: {
    padding: '4px 10px',
    backgroundColor: '#ef4444',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
    marginBottom: 24,
  },
  summaryCard: {
    padding: 20,
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 12,
    textAlign: 'center' as const,
    borderTop: '3px solid #6366f1',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 700,
    color: '#f1f5f9',
  },
  summaryLabel: {
    fontSize: 12,
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
    paddingBottom: 0,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: 12,
  },
  barChart: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  barLabel: {
    width: 180,
    fontSize: 13,
    color: '#94a3b8',
    textTransform: 'capitalize' as const,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    overflow: 'hidden' as const,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  barValue: {
    width: 40,
    textAlign: 'right' as const,
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: 600,
  },
  anomalyCard: {
    padding: 12,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    marginBottom: 8,
    borderLeft: '3px solid #ef4444',
  },
  anomalyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  anomalyAgent: {
    fontWeight: 600,
    textTransform: 'capitalize' as const,
  },
  anomalyRisk: {
    fontWeight: 700,
    fontSize: 13,
  },
  anomalyTarget: {
    fontSize: 13,
    color: '#94a3b8',
  },
  anomalyTime: {
    fontSize: 11,
    color: '#475569',
    marginTop: 4,
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
  eventList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  eventRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 12px',
    backgroundColor: '#0f172a',
    borderRadius: 6,
  },
  eventIcon: {
    fontSize: 18,
    width: 28,
    textAlign: 'center' as const,
  },
  eventInfo: {
    flex: 1,
    minWidth: 0,
  },
  eventHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
  },
  eventAgent: {
    fontWeight: 600,
    textTransform: 'capitalize' as const,
  },
  eventType: {
    color: '#64748b',
    textTransform: 'capitalize' as const,
  },
  eventTool: {
    padding: '1px 6px',
    backgroundColor: '#1e293b',
    borderRadius: 4,
    fontSize: 11,
    color: '#94a3b8',
  },
  eventTarget: {
    fontSize: 12,
    color: '#475569',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    maxWidth: 500,
  },
  eventMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  eventRisk: {
    fontWeight: 700,
    fontSize: 13,
    width: 24,
    textAlign: 'right' as const,
  },
  eventBlocked: {
    fontSize: 14,
  },
  eventTime: {
    fontSize: 11,
    color: '#475569',
    width: 60,
    textAlign: 'right' as const,
  },
  emptyState: {
    textAlign: 'center' as const,
    color: '#64748b',
    padding: 48,
    fontSize: 14,
  },
  promptCard: {
    padding: 16,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    marginBottom: 12,
    borderLeft: '3px solid #f59e0b',
  },
  promptHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  promptAgent: {
    fontWeight: 600,
    fontSize: 15,
  },
  promptType: {
    fontSize: 12,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  promptTarget: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
  },
  promptActions: {
    display: 'flex',
    gap: 8,
  },
  promptBtn: {
    padding: '6px 14px',
    border: 'none',
    borderRadius: 6,
    color: '#fff',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
  },
};
