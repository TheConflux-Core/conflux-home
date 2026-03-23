// Conflux Home — Provider Settings
// Template-first design: one-click provider setup, then advanced CRUD below.

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface Provider {
  id: string;
  name: string;
  base_url: string;
  api_key: string;
  model_id: string;
  model_alias: string;
  priority: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface ProviderTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  base_url: string;
  models: string[];
  default_model: string;
  model_alias: string;
  category: string;
  docs_url: string | null;
  is_free: boolean;
  is_installed: boolean;
}

interface TestResult {
  success: boolean;
  model?: string;
  latency_ms?: number;
  error?: string;
}

const MODEL_ALIASES = ['conflux-fast', 'conflux-smart'];

export default function ProviderSettings() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [templates, setTemplates] = useState<ProviderTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [installing, setInstalling] = useState<Record<string, boolean>>({});
  const [installMsg, setInstallMsg] = useState<Record<string, string>>({});

  // Install form state (for templates that need API key)
  const [installForm, setInstallForm] = useState<{
    templateId: string;
    apiKey: string;
    model: string;
  } | null>(null);

  // Advanced edit form state
  const [form, setForm] = useState({
    id: '',
    name: '',
    base_url: '',
    api_key: '',
    model_id: '',
    model_alias: 'conflux-fast',
    priority: 5,
    is_enabled: true,
  });

  const loadData = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([
        invoke<Provider[]>('engine_get_providers'),
        invoke<ProviderTemplate[]>('engine_get_provider_templates'),
      ]);
      setProviders(p);
      setTemplates(t);
    } catch (err) {
      console.error('[ProviderSettings] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Template Install ──

  async function installTemplate(template: ProviderTemplate) {
    if (template.is_free) {
      // Free tier — just show confirmation
      setInstallMsg(prev => ({ ...prev, [template.id]: '⚡ Free tier is already active!' }));
      setTimeout(() => setInstallMsg(prev => ({ ...prev, [template.id]: '' })), 3000);
      return;
    }

    // Show API key form
    setInstallForm({
      templateId: template.id,
      apiKey: '',
      model: template.default_model,
    });
  }

  async function confirmInstall() {
    if (!installForm || !installForm.apiKey.trim()) return;

    const templateId = installForm.templateId;
    setInstalling(prev => ({ ...prev, [templateId]: true }));

    try {
      const msg = await invoke<string>('engine_install_template', {
        req: {
          template_id: templateId,
          api_key: installForm.apiKey,
          model: installForm.model,
        },
      });
      setInstallMsg(prev => ({ ...prev, [templateId]: `✅ ${msg}` }));
      setInstallForm(null);
      await loadData();
    } catch (err) {
      setInstallMsg(prev => ({ ...prev, [templateId]: `❌ ${err}` }));
    } finally {
      setInstalling(prev => ({ ...prev, [templateId]: false }));
      setTimeout(() => setInstallMsg(prev => ({ ...prev, [templateId]: '' })), 5000);
    }
  }

  // ── Advanced CRUD ──

  function startEdit(p: Provider) {
    setEditingId(p.id);
    setForm({
      id: p.id,
      name: p.name,
      base_url: p.base_url,
      api_key: p.api_key,
      model_id: p.model_id,
      model_alias: p.model_alias,
      priority: p.priority,
      is_enabled: p.is_enabled,
    });
    setShowAdd(false);
  }

  function startAdd() {
    setEditingId(null);
    setForm({
      id: '',
      name: '',
      base_url: '',
      api_key: '',
      model_id: '',
      model_alias: 'conflux-fast',
      priority: 5,
      is_enabled: true,
    });
    setShowAdd(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setShowAdd(false);
  }

  async function saveProvider() {
    if (!form.id || !form.name || !form.base_url || !form.api_key || !form.model_id) return;

    try {
      await invoke('engine_update_provider', {
        req: {
          id: form.id,
          name: form.name,
          base_url: form.base_url,
          api_key: form.api_key,
          model_id: form.model_id,
          model_alias: form.model_alias,
          priority: form.priority,
          is_enabled: form.is_enabled,
        },
      });
      await loadData();
      cancelEdit();
    } catch (err) {
      console.error('[ProviderSettings] Failed to save:', err);
    }
  }

  async function deleteProvider(id: string) {
    if (!confirm(`Delete provider "${id}"?`)) return;
    try {
      await invoke('engine_delete_provider', { id });
      await loadData();
    } catch (err) {
      console.error('[ProviderSettings] Failed to delete:', err);
    }
  }

  async function toggleProvider(p: Provider) {
    try {
      await invoke('engine_update_provider', {
        req: { ...p, is_enabled: !p.is_enabled },
      });
      await loadData();
    } catch (err) {
      console.error('[ProviderSettings] Failed to toggle:', err);
    }
  }

  async function testProvider(id: string) {
    setTesting(prev => ({ ...prev, [id]: true }));
    try {
      const result = await invoke<TestResult>('engine_test_provider', { id });
      setTestResults(prev => ({ ...prev, [id]: result }));
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        [id]: { success: false, error: String(err) },
      }));
    } finally {
      setTesting(prev => ({ ...prev, [id]: false }));
    }
  }

  function maskKey(key: string): string {
    if (key.length <= 8) return '••••';
    return key.slice(0, 4) + '••••' + key.slice(-4);
  }

  if (loading) {
    return (
      <div className="settings-section">
        <div className="settings-section-title">🤖 AI Providers</div>
        <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>Loading providers...</div>
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="settings-section">
      <div className="settings-section-title">🤖 AI Providers</div>

      {/* ── Template Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 10,
        marginBottom: 20,
      }}>
        {templates.map((t) => {
          const isInstalling = installing[t.id];
          const msg = installMsg[t.id];
          const isActive = t.is_free && t.is_installed;

          return (
            <div
              key={t.id}
              style={{
                background: isActive
                  ? 'linear-gradient(135deg, rgba(52,199,89,0.08), rgba(52,199,89,0.02))'
                  : 'var(--bg-card)',
                border: `1px solid ${isActive ? 'rgba(52,199,89,0.3)' : 'var(--border)'}`,
                borderRadius: 12,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>{t.emoji}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {t.name}
                  </div>
                  {isActive && (
                    <span style={{
                      fontSize: 10,
                      color: '#34c759',
                      fontWeight: 600,
                      letterSpacing: 0.5,
                    }}>
                      ● ACTIVE
                    </span>
                  )}
                </div>
              </div>

              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {t.description}
              </div>

              {/* Status message */}
              {msg && (
                <div style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: msg.startsWith('✅') || msg.startsWith('⚡')
                    ? 'rgba(52,199,89,0.08)'
                    : 'rgba(255,68,68,0.08)',
                  color: msg.startsWith('✅') || msg.startsWith('⚡') ? '#34c759' : '#ff6666',
                }}>
                  {msg}
                </div>
              )}

              {/* Install button or active badge */}
              {!msg && (
                <button
                  onClick={() => installTemplate(t)}
                  disabled={isInstalling || isActive}
                  style={{
                    marginTop: 'auto',
                    background: isActive
                      ? 'rgba(52,199,89,0.12)'
                      : 'rgba(255,255,255,0.06)',
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: isActive ? 'default' : 'pointer',
                    color: isActive ? '#34c759' : 'var(--text-secondary)',
                    transition: 'all 0.15s',
                  }}
                >
                  {isInstalling ? 'Connecting...' : isActive ? '✓ Active' : t.is_free ? '⚡ Included' : '+ Connect'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Install Form Modal ── */}
      {installForm && (() => {
        const template = templates.find(t => t.id === installForm.templateId);
        if (!template) return null;

        return (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>{template.emoji}</span>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                Connect {template.name}
              </div>
            </div>

            {template.docs_url && (
              <div style={{ marginBottom: 12, fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>Get your API key: </span>
                <a
                  href={template.docs_url}
                  onClick={(e) => {
                    e.preventDefault();
                    invoke('plugin:shell|open', { path: template.docs_url });
                  }}
                  style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}
                >
                  {template.docs_url.replace('https://', '').split('/')[0]} →
                </a>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  API Key
                </label>
                <input
                  className="settings-input"
                  type="password"
                  value={installForm.apiKey}
                  onChange={e => setInstallForm(f => f ? { ...f, apiKey: e.target.value } : null)}
                  placeholder="Paste your API key..."
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Model
                </label>
                <select
                  className="settings-input"
                  value={installForm.model}
                  onChange={e => setInstallForm(f => f ? { ...f, model: e.target.value } : null)}
                >
                  {template.models.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                className="settings-button primary"
                onClick={confirmInstall}
                disabled={!installForm.apiKey.trim()}
              >
                🔌 Connect
              </button>
              <button
                className="settings-button"
                onClick={() => setInstallForm(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── Advanced Section Toggle ── */}
      <button
        onClick={() => setShowAdvanced(s => !s)}
        style={{
          width: '100%',
          background: 'none',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: showAdvanced ? 12 : 0,
        }}
      >
        <span>⚙️ Advanced: Custom Providers</span>
        <span>{showAdvanced ? '▲' : '▼'}</span>
      </button>

      {/* ── Advanced: Provider List ── */}
      {showAdvanced && (
        <>
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={startAdd}
              style={{
                background: showAdd ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                color: showAdd ? '#000' : 'var(--text-muted)',
              }}
            >
              + Add Custom Provider
            </button>
          </div>

          {/* Add/Edit Form */}
          {(showAdd || editingId) && (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
                {editingId ? 'Edit Provider' : 'Add Custom Provider'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>ID</label>
                  <input
                    className="settings-input"
                    value={form.id}
                    onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
                    placeholder="e.g., my-provider"
                    disabled={!!editingId}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Name</label>
                  <input
                    className="settings-input"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g., My Provider"
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Base URL</label>
                  <input
                    className="settings-input"
                    value={form.base_url}
                    onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))}
                    placeholder="https://api.example.com/v1"
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>API Key</label>
                  <input
                    className="settings-input"
                    type="password"
                    value={form.api_key}
                    onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
                    placeholder="sk-..."
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Model ID</label>
                  <input
                    className="settings-input"
                    value={form.model_id}
                    onChange={e => setForm(f => ({ ...f, model_id: e.target.value }))}
                    placeholder="model-name"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Model Alias</label>
                  <select
                    className="settings-input"
                    value={form.model_alias}
                    onChange={e => setForm(f => ({ ...f, model_alias: e.target.value }))}
                  >
                    {MODEL_ALIASES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Priority</label>
                  <input
                    className="settings-input"
                    type="number"
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 5 }))}
                    min={1}
                    max={99}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={form.is_enabled}
                      onChange={e => setForm(f => ({ ...f, is_enabled: e.target.checked }))}
                    />
                    Enabled
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="settings-button primary" onClick={saveProvider}>
                  💾 Save
                </button>
                <button className="settings-button" onClick={cancelEdit}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Provider List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {providers.map((p) => {
              const testResult = testResults[p.id];
              const isTesting = testing[p.id];

              return (
                <div
                  key={p.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: `1px solid ${p.is_enabled ? 'var(--border)' : 'rgba(150,150,150,0.2)'}`,
                    borderRadius: 10,
                    padding: '12px 16px',
                    opacity: p.is_enabled ? 1 : 0.5,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {p.model_id} → <span style={{ color: 'var(--accent-primary)' }}>{p.model_alias}</span>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {maskKey(p.api_key)} · priority {p.priority}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={() => testProvider(p.id)}
                        disabled={isTesting}
                        style={{
                          background: 'none',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: 11,
                          cursor: 'pointer',
                          color: testResult?.success ? '#34c759' : testResult?.error ? '#ff6666' : 'var(--text-muted)',
                        }}
                        title="Test connection"
                      >
                        {isTesting ? '...' : testResult?.success ? `✓ ${testResult.latency_ms}ms` : testResult?.error ? '✗' : '🧪'}
                      </button>

                      <button
                        onClick={() => startEdit(p)}
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
                        ✏️
                      </button>

                      <button
                        onClick={() => toggleProvider(p)}
                        style={{
                          background: p.is_enabled ? 'rgba(52,199,89,0.12)' : 'rgba(150,150,150,0.12)',
                          border: 'none',
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: p.is_enabled ? '#34c759' : 'var(--text-muted)',
                        }}
                      >
                        {p.is_enabled ? 'ON' : 'OFF'}
                      </button>

                      <button
                        onClick={() => deleteProvider(p.id)}
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
                    </div>
                  </div>

                  {testResult && !testResult.success && testResult.error && (
                    <div style={{
                      marginTop: 8,
                      padding: '6px 10px',
                      background: 'rgba(255,68,68,0.08)',
                      borderRadius: 6,
                      fontSize: 11,
                      color: '#ff6666',
                    }}>
                      {testResult.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {providers.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              No custom providers configured.
            </div>
          )}
        </>
      )}
    </div>
  );
}
