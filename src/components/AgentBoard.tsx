// Conflux Home — Agent Board (Orbit)
// Shows what the agent team is working on: engine tasks from the tasks table.
// This is the shared taskboard — agents create tasks for each other, user can observe.

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Task } from '../hooks/useTasks';

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  pending:     { label: 'Queued',       emoji: '📋', color: '#94a3b8' },
  in_progress: { label: 'Working',      emoji: '🔨', color: '#3b82f6' },
  review:      { label: 'Review',       emoji: '🔍', color: '#f59e0b' },
  completed:   { label: 'Done',         emoji: '✅', color: '#10b981' },
  failed:      { label: 'Failed',       emoji: '❌', color: '#ef4444' },
  blocked:     { label: 'Blocked',      emoji: '🚧', color: '#f97316' },
};

const PRIORITY_CONFIG: Record<string, { emoji: string; color: string }> = {
  critical: { emoji: '🔴', color: '#ef4444' },
  high:     { emoji: '🟠', color: '#f97316' },
  normal:   { emoji: '🟡', color: '#eab308' },
  low:      { emoji: '🟢', color: '#22c55e' },
};

const AGENT_COLORS: Record<string, string> = {
  conflux: '#8b5cf6', aegis: '#38bdf8', helix: '#a78bfa', pulse: '#34d399',
  viper: '#22c55e', horizon: '#f472b6', orbit: '#e879f9', hearth: '#fb923c',
  echo: '#f472b6', quanta: '#06b6d4', forge: '#f97316', spectra: '#818cf8',
  luma: '#fbbf24', prism: '#c084fc',
};

function agentColor(id: string): string {
  return AGENT_COLORS[id] ?? '#94a3b8';
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Agent Pill ──────────────────────────────────────────────────────

function AgentPill({ agentId }: { agentId: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '10px', fontWeight: 600, color: agentColor(agentId),
      background: `${agentColor(agentId)}18`, borderRadius: '4px',
      padding: '1px 6px', textTransform: 'capitalize',
    }}>
      <span style={{
        width: '5px', height: '5px', borderRadius: '50%',
        background: agentColor(agentId),
      }} />
      {agentId}
    </span>
  );
}

// ── Task Card ────────────────────────────────────────────────────────

function AgentTaskCard({ task }: { task: Task }) {
  const pri = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.normal;
  const st = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;

  return (
    <div style={{
      background: 'var(--bg-card, #111827)',
      border: '1px solid var(--border, #1f2937)',
      borderRadius: '8px',
      padding: '10px 12px',
      transition: 'all 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ fontSize: '14px', lineHeight: 1 }}>{st.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '12px', fontWeight: 600, color: 'var(--text-primary, #e5e7eb)',
            marginBottom: '4px', lineHeight: 1.3,
          }}>
            {task.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <AgentPill agentId={task.agent_id} />
            {task.created_by !== task.agent_id && (
              <span style={{ fontSize: '9px', color: '#6b7280' }}>
                by {task.created_by}
              </span>
            )}
            <span style={{
              fontSize: '10px', fontWeight: 600, color: pri.color,
              background: `${pri.color}15`, borderRadius: '4px',
              padding: '1px 5px',
            }}>
              {pri.emoji} {task.priority}
            </span>
            <span style={{ fontSize: '10px', color: '#6b7280' }}>
              {relativeTime(task.created_at)}
            </span>
            {task.requires_verify && !task.verified && (
              <span style={{
                fontSize: '9px', color: '#f59e0b',
                background: '#f59e0b18', borderRadius: '3px',
                padding: '1px 5px',
              }}>
                needs verify
              </span>
            )}
            {task.verified && (
              <span style={{
                fontSize: '9px', color: '#10b981',
                background: '#10b98118', borderRadius: '3px',
                padding: '1px 5px',
              }}>
                ✓ verified
              </span>
            )}
          </div>
          {task.result && (
            <div style={{
              fontSize: '11px', color: '#9ca3af', marginTop: '6px',
              padding: '6px 8px', background: 'rgba(255,255,255,0.03)',
              borderRadius: '6px', lineHeight: 1.4,
              maxHeight: '60px', overflow: 'hidden',
            }}>
              {task.result.length > 150 ? task.result.slice(0, 150) + '…' : task.result}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Status Column ────────────────────────────────────────────────────

function StatusColumn({ status, tasks }: { status: string; tasks: Task[] }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  if (tasks.length === 0) return null;

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        marginBottom: '8px', padding: '0 2px',
      }}>
        <span style={{ fontSize: '13px' }}>{cfg.emoji}</span>
        <span style={{
          fontSize: '11px', fontWeight: 700, color: cfg.color,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          {cfg.label}
        </span>
        <span style={{
          fontSize: '10px', color: '#6b7280',
          background: 'rgba(255,255,255,0.06)', borderRadius: '8px',
          padding: '1px 6px',
        }}>
          {tasks.length}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {tasks.map(t => <AgentTaskCard key={t.id} task={t} />)}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export function AgentBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  const refresh = useCallback(async () => {
    try {
      const result = await invoke<Task[]>('engine_get_all_tasks');
      setTasks(result);
    } catch (err) {
      console.error('[AgentBoard] Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  const filtered = filter === 'active'
    ? tasks.filter(t => t.status !== 'completed' && t.status !== 'failed')
    : tasks;

  // Group by status
  const grouped: Record<string, Task[]> = {};
  for (const t of filtered) {
    const s = t.status || 'pending';
    if (!grouped[s]) grouped[s] = [];
    grouped[s].push(t);
  }

  // Status order
  const statusOrder = ['in_progress', 'review', 'pending', 'blocked', 'completed', 'failed'];
  const orderedStatuses = statusOrder.filter(s => grouped[s]?.length);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: '12px' }}>
        Loading agent board...
      </div>
    );
  }

  return (
    <div className="mc-panel" style={{ marginBottom: '20px' }}>
      <div className="mc-panel-header">
        <h3 className="mc-panel-title">🤖 Agent Board</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="mc-panel-count">
            {tasks.filter(t => t.status !== 'completed' && t.status !== 'failed').length} active
          </span>
          <div style={{
            display: 'flex', background: 'rgba(255,255,255,0.04)',
            borderRadius: '6px', overflow: 'hidden',
          }}>
            <button
              onClick={() => setFilter('active')}
              style={{
                padding: '3px 10px', fontSize: '10px', fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: filter === 'active' ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: filter === 'active' ? '#e5e7eb' : '#6b7280',
                transition: 'all 0.15s',
              }}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '3px 10px', fontSize: '10px', fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: filter === 'all' ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: filter === 'all' ? '#e5e7eb' : '#6b7280',
                transition: 'all 0.15s',
              }}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{
          padding: '32px', textAlign: 'center',
          color: '#6b7280', fontSize: '12px',
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🤖</div>
          <div>No agent tasks yet. Your agents will create tasks as they work.</div>
        </div>
      ) : (
        <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '2px' }}>
          {orderedStatuses.map(status => (
            <StatusColumn
              key={status}
              status={status}
              tasks={grouped[status]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
