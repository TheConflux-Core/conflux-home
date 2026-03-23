// Conflux Home — Webhook Manager Panel
// Register, list, and delete webhooks.

import { useState } from 'react';
import { useWebhooks, type CreateWebhookReq } from '../../hooks/useWebhooks';

const AUTH_TYPES = [
  { key: 'hmac', label: 'HMAC', color: '#0071e3' },
  { key: 'bearer', label: 'Bearer', color: '#7b2fff' },
  { key: 'none', label: 'None', color: '#888888' },
];

const EVENT_OPTIONS = [
  { key: 'task_completed', label: 'Task Completed' },
  { key: 'agent_error', label: 'Agent Error' },
  { key: 'cron_fired', label: 'Cron Fired' },
  { key: 'webhook_received', label: 'Webhook Received' },
  { key: 'health_alert', label: 'Health Alert' },
];

export default function WebhookManager() {
  const { webhooks, loading, create, remove } = useWebhooks();
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formUrl, setFormUrl] = useState('');
  const [formAuthType, setFormAuthType] = useState('none');
  const [formAuthSecret, setFormAuthSecret] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [urlError, setUrlError] = useState('');

  const toggleEvent = (evt: string) => {
    setFormEvents(prev =>
      prev.includes(evt) ? prev.filter(e => e !== evt) : [...prev, evt]
    );
  };

  const validateUrl = (url: string): boolean => {
    if (!url.startsWith('https://')) {
      setUrlError('URL must start with https://');
      return false;
    }
    setUrlError('');
    return true;
  };

  const handleCreate = async () => {
    if (!formUrl.trim() || !validateUrl(formUrl.trim())) return;
    if (formEvents.length === 0) {
      window.dispatchEvent(new CustomEvent('conflux:toast', {
        detail: { message: 'Select at least one event', type: 'error' },
      }));
      return;
    }

    setCreating(true);
    try {
      const req: CreateWebhookReq = {
        url: formUrl.trim(),
        auth_type: formAuthType,
        events: formEvents,
      };
      if (formAuthType !== 'none' && formAuthSecret.trim()) {
        req.auth_secret = formAuthSecret.trim();
      }
      await create(req);
      setShowModal(false);
      setFormUrl('');
      setFormAuthType('none');
      setFormAuthSecret('');
      setFormEvents([]);
    } catch (err) {
      window.dispatchEvent(new CustomEvent('conflux:toast', {
        detail: { message: `Failed to create webhook: ${err}`, type: 'error' },
      }));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      setDeleteConfirm(null);
    } catch (err) {
      window.dispatchEvent(new CustomEvent('conflux:toast', {
        detail: { message: `Failed to delete webhook: ${err}`, type: 'error' },
      }));
    }
  };

  const truncateUrl = (url: string): string => {
    if (url.length <= 40) return url;
    return url.slice(0, 37) + '...';
  };

  if (loading) {
    return (
      <div className="settings-section">
        <div className="settings-section-title">🔗 Webhooks</div>
        <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>Loading webhooks...</div>
      </div>
    );
  }

  return (
    <div className="settings-section">
      <div className="settings-section-title">
        🔗 Webhooks
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

      {/* Register Modal */}
      {showModal && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
            Register Webhook
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                URL (must be https://)
              </label>
              <input
                className="settings-input"
                value={formUrl}
                onChange={e => {
                  setFormUrl(e.target.value);
                  if (urlError) validateUrl(e.target.value);
                }}
                onBlur={() => formUrl.trim() && validateUrl(formUrl.trim())}
                placeholder="https://example.com/webhook"
              />
              {urlError && (
                <div style={{ fontSize: 11, color: '#ff6666', marginTop: 4 }}>{urlError}</div>
              )}
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Auth Type
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {AUTH_TYPES.map(at => (
                  <button
                    key={at.key}
                    onClick={() => setFormAuthType(at.key)}
                    style={{
                      background: formAuthType === at.key ? `${at.color}22` : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${formAuthType === at.key ? at.color : 'var(--border)'}`,
                      borderRadius: 6,
                      padding: '5px 12px',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: formAuthType === at.key ? at.color : 'var(--text-muted)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {at.label}
                  </button>
                ))}
              </div>
            </div>

            {formAuthType !== 'none' && (
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Secret
                </label>
                <input
                  className="settings-input"
                  type="password"
                  value={formAuthSecret}
                  onChange={e => setFormAuthSecret(e.target.value)}
                  placeholder={formAuthType === 'hmac' ? 'HMAC shared secret...' : 'Bearer token...'}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Events
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {EVENT_OPTIONS.map(evt => (
                  <label
                    key={evt.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 11,
                      color: formEvents.includes(evt.key) ? 'var(--text-primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      background: formEvents.includes(evt.key) ? 'rgba(var(--accent-rgb, 0,113,227), 0.08)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${formEvents.includes(evt.key) ? 'var(--accent-primary)' : 'var(--border)'}`,
                      borderRadius: 6,
                      padding: '4px 8px',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formEvents.includes(evt.key)}
                      onChange={() => toggleEvent(evt.key)}
                      style={{ display: 'none' }}
                    />
                    {evt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              className="settings-button primary"
              onClick={handleCreate}
              disabled={!formUrl.trim() || creating}
            >
              {creating ? 'Registering...' : '🔗 Register'}
            </button>
            <button
              className="settings-button"
              onClick={() => {
                setShowModal(false);
                setUrlError('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Webhook List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {webhooks.map((wh) => {
          const authType = AUTH_TYPES.find(a => a.key === wh.auth_type) || AUTH_TYPES[2];

          return (
            <div
              key={wh.id}
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${wh.enabled ? 'var(--border)' : 'rgba(150,150,150,0.2)'}`,
                borderRadius: 10,
                padding: '12px 16px',
                opacity: wh.enabled ? 1 : 0.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div
                    style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'monospace' }}
                    title={wh.url}
                  >
                    {truncateUrl(wh.url)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: authType.color,
                      background: `${authType.color}15`,
                      borderRadius: 4,
                      padding: '1px 5px',
                    }}>
                      {authType.label}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {wh.events.length} event{wh.events.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {deleteConfirm === wh.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => handleDelete(wh.id)}
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
                      onClick={() => setDeleteConfirm(wh.id)}
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
          );
        })}
      </div>

      {webhooks.length === 0 && (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
          No webhooks registered. Click + to add one.
        </div>
      )}
    </div>
  );
}
