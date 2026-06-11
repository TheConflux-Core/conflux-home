// Conflux Home — Cron Manager Panel
// Shows scheduled tasks, allows create/toggle/delete.
// Features a human-readable schedule builder instead of raw cron expressions.

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useCron, type CreateCronReq } from '../../hooks/useCron';

// ── Cron → Human-Readable ──

function cronToHuman(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return expr;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  if (minute.startsWith('*/') && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Every ${minute.slice(2)} minutes`;
  }
  if (hour.startsWith('*/') && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return minute === '0' ? `Every ${hour.slice(2)} hours` : `Every ${hour.slice(2)} hours at :${minute.padStart(2, '0')}`;
  }
  if (minute !== '*' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    return `Every day at ${h > 12 ? h - 12 : h || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }
  if (minute !== '*' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    const time = `${h > 12 ? h - 12 : h || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    if (dayOfWeek === '1-5' || dayOfWeek === '1,2,3,4,5') return `Weekdays at ${time}`;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const d = parseInt(dayOfWeek, 10);
    return `Every ${days[d] ?? dayOfWeek} at ${time}`;
  }
  if (minute !== '*' && hour !== '*' && dayOfMonth !== '*' && month === '*') {
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    return `Day ${dayOfMonth} of every month at ${h > 12 ? h - 12 : h || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }
  return expr;
}

// ── Schedule Builder Types ──

type Frequency = 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'every_hours' | 'every_minutes';

interface ScheduleConfig {
  frequency: Frequency;
  hour: number;    // 0-23
  minute: number;  // 0-59
  dayOfWeek: number; // 0-6 (Sun-Sat), for weekly
  dayOfMonth: number; // 1-31, for monthly
  interval: number; // for every_hours / every_minutes
}

function configToCron(config: ScheduleConfig): string {
  const { frequency, hour, minute, dayOfWeek, dayOfMonth, interval } = config;
  switch (frequency) {
    case 'daily':
      return `${minute} ${hour} * * *`;
    case 'weekdays':
      return `${minute} ${hour} * * 1-5`;
    case 'weekly':
      return `${minute} ${hour} * * ${dayOfWeek}`;
    case 'monthly':
      return `${minute} ${hour} ${dayOfMonth} * *`;
    case 'every_hours':
      return `0 */${interval} * * *`;
    case 'every_minutes':
      return `*/${interval} * * * *`;
  }
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Toggle Switch ──

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className={`toggle-switch ${checked ? 'on' : ''}`}
      onClick={() => onChange(!checked)}
      aria-label={checked ? 'Disable' : 'Enable'}
      type="button"
    >
      <span className="toggle-knob" />
    </button>
  );
}

// ── Schedule Builder Component ──

function ScheduleBuilder({ value, onChange }: { value: string; onChange: (cron: string) => void }) {
  const [config, setConfig] = useState<ScheduleConfig>({
    frequency: 'daily',
    hour: 9,
    minute: 0,
    dayOfWeek: 1,
    dayOfMonth: 1,
    interval: 1,
  });

  // Sync config → cron string
  const update = (patch: Partial<ScheduleConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    onChange(configToCron(next));
  };

  const needsTime = config.frequency !== 'every_minutes';
  const is12h = config.hour === 0 ? 12 : config.hour > 12 ? config.hour - 12 : config.hour;
  const ampm = config.hour >= 12 ? 'PM' : 'AM';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Frequency */}
      <div>
        <label style={labelStyle}>Frequency</label>
        <select
          className="settings-input"
          style={{ width: '100%' }}
          value={config.frequency}
          onChange={e => update({ frequency: e.target.value as Frequency })}
        >
          <option value="daily">Every day</option>
          <option value="weekdays">Weekdays (Mon–Fri)</option>
          <option value="weekly">Every week</option>
          <option value="monthly">Every month</option>
          <option value="every_hours">Every N hours</option>
          <option value="every_minutes">Every N minutes</option>
        </select>
      </div>

      {/* Interval for every_hours / every_minutes */}
      {(config.frequency === 'every_hours' || config.frequency === 'every_minutes') && (
        <div>
          <label style={labelStyle}>
            Every {config.frequency === 'every_hours' ? 'hours' : 'minutes'}
          </label>
          <input
            className="settings-input"
            type="number"
            min={1}
            max={config.frequency === 'every_hours' ? 23 : 59}
            value={config.interval}
            onChange={e => update({ interval: Math.max(1, parseInt(e.target.value) || 1) })}
            style={{ width: '100%' }}
          />
        </div>
      )}

      {/* Day of week (weekly) */}
      {config.frequency === 'weekly' && (
        <div>
          <label style={labelStyle}>Day</label>
          <select
            className="settings-input"
            style={{ width: '100%' }}
            value={config.dayOfWeek}
            onChange={e => update({ dayOfWeek: parseInt(e.target.value) })}
          >
            {DAY_NAMES.map((name, i) => (
              <option key={i} value={i}>{name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Day of month (monthly) */}
      {config.frequency === 'monthly' && (
        <div>
          <label style={labelStyle}>Day of month</label>
          <select
            className="settings-input"
            style={{ width: '100%' }}
            value={config.dayOfMonth}
            onChange={e => update({ dayOfMonth: parseInt(e.target.value) })}
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      )}

      {/* Time picker */}
      {needsTime && (
        <div>
          <label style={labelStyle}>Time</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              className="settings-input"
              style={{ flex: 1 }}
              value={is12h}
              onChange={e => {
                const h12 = parseInt(e.target.value);
                const h24 = ampm === 'PM' ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12);
                update({ hour: h24 });
              }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>:</span>
            <select
              className="settings-input"
              style={{ flex: 1 }}
              value={config.minute}
              onChange={e => update({ minute: parseInt(e.target.value) })}
            >
              {Array.from({ length: 12 }, (_, i) => i * 5).map(m => (
                <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
              ))}
            </select>
            <select
              className="settings-input"
              style={{ flex: 0.6 }}
              value={ampm}
              onChange={e => {
                const newAmpm = e.target.value;
                if (newAmpm === 'PM' && config.hour < 12) update({ hour: config.hour + 12 });
                else if (newAmpm === 'AM' && config.hour >= 12) update({ hour: config.hour - 12 });
              }}
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>
      )}

      {/* Preview */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Schedule:</span>
        <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
          {configToCron(config)}
        </span>
        <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
          — {cronToHuman(configToCron(config))}
        </span>
      </div>
    </div>
  );
}

// ── Styles ──

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-muted)',
  display: 'block',
  marginBottom: 4,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

// ── Main Component ──

interface AgentInfo {
  id: string;
  name: string;
}

export default function CronManager() {
  const { jobs, loading, toggle, remove, create } = useCron();
  const [showModal, setShowModal] = useState(false);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formAgent, setFormAgent] = useState('');
  const [formSchedule, setFormSchedule] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    invoke<AgentInfo[]>('engine_get_agents')
      .then(setAgents)
      .catch((err) => console.error('[CronManager] Failed to load agents:', err));
  }, []);

  const handleCreate = async () => {
    if (!formAgent || !formSchedule.trim() || !formMessage.trim()) return;
    setCreating(true);
    try {
      await create({
        name: formName.trim() || `${formAgent} task`,
        agent_id: formAgent,
        schedule: formSchedule.trim(),
        task_message: formMessage.trim(),
        enabled: true,
      });
      setShowModal(false);
      setFormName('');
      setFormAgent('');
      setFormSchedule('');
      setFormMessage('');
    } catch {
      // Toast dispatched by useCron
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      setDeleteConfirm(null);
    } catch {
      // Toast dispatched by useCron
    }
  };

  if (loading) {
    return (
      <div className="settings-section">
        <div className="settings-section-title">🕐 Scheduled Tasks</div>
        <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>Loading cron jobs...</div>
      </div>
    );
  }

  return (
    <div className="settings-section">
      <div className="settings-section-title">
        🕐 Scheduled Tasks
        <button
          onClick={() => setShowModal(!showModal)}
          style={{
            background: showModal ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 13,
            cursor: 'pointer',
            color: showModal ? '#000' : 'var(--text-muted)',
            fontWeight: 600,
          }}
        >
          +
        </button>
      </div>

      {/* Create Form */}
      {showModal && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>
            New Scheduled Task
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Name */}
            <div>
              <label style={labelStyle}>Name</label>
              <input
                className="settings-input"
                style={{ width: '100%' }}
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g. Morning Briefing, Security Scan"
              />
            </div>

            {/* Agent */}
            <div>
              <label style={labelStyle}>Agent</label>
              <select
                className="settings-input"
                style={{ width: '100%' }}
                value={formAgent}
                onChange={e => setFormAgent(e.target.value)}
              >
                <option value="">Select agent...</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            {/* Schedule Builder */}
            <div>
              <label style={labelStyle}>Schedule</label>
              <ScheduleBuilder
                value={formSchedule}
                onChange={cron => setFormSchedule(cron)}
              />
            </div>

            {/* Message */}
            <div>
              <label style={labelStyle}>Prompt / Instructions</label>
              <textarea
                className="settings-input"
                style={{ width: '100%', resize: 'vertical', minHeight: 80 }}
                value={formMessage}
                onChange={e => setFormMessage(e.target.value)}
                placeholder="What should this agent do when this task runs?"
                rows={4}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              className="settings-button primary"
              onClick={handleCreate}
              disabled={!formAgent || !formSchedule.trim() || !formMessage.trim() || creating}
            >
              {creating ? 'Creating...' : '➕ Create'}
            </button>
            <button
              className="settings-button"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Jobs List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {jobs.map((job) => {
          const isExpanded = expandedId === job.id;
          return (
            <div
              key={job.id}
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${job.enabled ? 'var(--border)' : 'rgba(150,150,150,0.2)'}`,
                borderRadius: 10,
                padding: '12px 16px',
                opacity: job.enabled ? 1 : 0.5,
              }}
            >
              {/* Header row — clickable to expand */}
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => setExpandedId(isExpanded ? null : job.id)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      transition: 'transform 0.15s',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      flexShrink: 0,
                      width: 12,
                      textAlign: 'center',
                    }}>
                      ▶
                    </span>
                    {job.name && (
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {job.name}
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
                      {cronToHuman(job.schedule)}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, marginLeft: 20 }}>
                    Agent: <span style={{ color: 'var(--accent-primary)' }}>{job.agent_id}</span>
                    {job.next_run && (
                      <span> · Next: {new Date(job.next_run).toLocaleString()}</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <ToggleSwitch
                    checked={job.enabled}
                    onChange={(enabled) => toggle(job.id, enabled)}
                  />

                  {deleteConfirm === job.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => handleDelete(job.id)}
                        style={{
                          background: 'rgba(255,68,68,0.12)',
                          border: 'none',
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: 11,
                          cursor: 'pointer',
                          color: '#ff6666',
                          fontWeight: 600,
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        style={{
                          background: 'none',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: 11,
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(job.id)}
                      style={{
                        background: 'none',
                        border: '1px solid rgba(255,68,68,0.2)',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 11,
                        cursor: 'pointer',
                        color: '#ff6666',
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div style={{ marginTop: 10, marginLeft: 20, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <div style={{ ...labelStyle, marginBottom: 4 }}>Schedule</div>
                      <div style={{
                        fontSize: 11,
                        fontFamily: 'monospace',
                        color: 'var(--text-secondary)',
                        background: 'rgba(255,255,255,0.03)',
                        padding: '4px 8px',
                        borderRadius: 4,
                      }}>
                        {job.schedule}
                      </div>
                    </div>
                    <div>
                      <div style={{ ...labelStyle, marginBottom: 4 }}>Prompt</div>
                      <pre style={{
                        fontSize: 11,
                        color: 'var(--text-secondary)',
                        background: 'rgba(255,255,255,0.03)',
                        padding: '10px 12px',
                        borderRadius: 6,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        maxHeight: 260,
                        overflowY: 'auto',
                        margin: 0,
                        fontFamily: 'inherit',
                        lineHeight: 1.6,
                        border: '1px solid rgba(255,255,255,0.04)',
                      }}>
                        {job.message || 'No prompt available'}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {jobs.length === 0 && (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
          No scheduled tasks. Click <strong>+</strong> to create one.
        </div>
      )}
    </div>
  );
}
