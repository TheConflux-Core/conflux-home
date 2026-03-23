// Conflux Home — Cron Manager Panel
// Shows scheduled tasks, allows create/toggle/delete.

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useCron, type CreateCronReq } from '../../hooks/useCron';

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
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

interface AgentInfo {
  id: string;
  name: string;
}

export default function CronManager() {
  const { jobs, loading, toggle, remove, create } = useCron();
  const [showModal, setShowModal] = useState(false);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formAgent, setFormAgent] = useState('');
  const [formSchedule, setFormSchedule] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [creating, setCreating] = useState(false);

  // Fetch agents for dropdown
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
        agent_id: formAgent,
        schedule: formSchedule.trim(),
        message: formMessage.trim(),
        enabled: true,
      });
      setShowModal(false);
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

      {/* Create Modal */}
      {showModal && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
            New Scheduled Task
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Agent
              </label>
              <select
                className="settings-input"
                value={formAgent}
                onChange={e => setFormAgent(e.target.value)}
              >
                <option value="">Select agent...</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Schedule (cron expression)
              </label>
              <input
                className="settings-input"
                value={formSchedule}
                onChange={e => setFormSchedule(e.target.value)}
                placeholder="e.g. 0 9 * * *"
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Message
              </label>
              <textarea
                className="settings-input"
                value={formMessage}
                onChange={e => setFormMessage(e.target.value)}
                placeholder="What should this agent do on schedule?"
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
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
        {jobs.map((job) => (
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {job.schedule}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Agent: <span style={{ color: 'var(--accent-primary)' }}>{job.agent_id}</span>
                  {job.next_run && (
                    <span> · Next: {new Date(job.next_run).toLocaleString()}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {job.message}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          </div>
        ))}
      </div>

      {jobs.length === 0 && (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
          No scheduled tasks. Click + to create one.
        </div>
      )}
    </div>
  );
}
