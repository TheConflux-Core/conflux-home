// Conflux Home — Provider Settings
// Full CRUD for AI model providers. Reads from engine DB, not hardcoded.

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

interface TestResult {
  success: boolean;
  model?: string;
  latency_ms?: number;
  error?: string;
}

const MODEL_ALIASES = ['conflux-fast', 'conflux-smart'];
const PROVIDER_EMOJIS: Record<string, string> = {
  cerebras: '🧠',
  groq: '⚡',
  mistral: '🌪️',
  cloudflare: '☁️',
  'groq-smart': '⚡',
  'cerebras-smart': '🧠',
};

export default function ProviderSettings() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});

  // Edit form state
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

  const loadProviders = useCallback(async () => {
    try {
      const data = await invoke<Provider[]>('engine_get_providers');
      setProviders(data);
    } catch (err) {
      console.error('[ProviderSettings] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

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
      await loadProviders();
      cancelEdit();
    } catch (err) {
      console.error('[ProviderSettings] Failed to save:', err);
    }
  }

  async function deleteProvider(id: string) {
    if (!confirm(`Delete provider "${id}"?`)) return;
    try {
      await invoke('engine_delete_provider', { id });
      await loadProviders();
    } catch (err) {
      console.error('[ProviderSettings] Failed to delete:', err);
    }
  }

  async function toggleProvider(p: Provider) {
    try {
      await invoke('engine_update_provider', {
        req: { ...p, is_enabled: !p.is_enabled },
      });
      await loadProviders();
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

  return (
    <div className="settings-section">
      <div className="settings-section-title">
        🤖 AI Providers
        <button
          onClick={startAdd}
          style={{
            marginLeft: 12,
            background: showAdd ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            color: showAdd ? '#000' : 'var(--text-muted)',
          }}
        >
          + Add
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
            {editingId ? 'Edit Provider' : 'Add Provider'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>ID</label>
              <input
                className="settings-input"
                value={form.id}
                onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
                placeholder="e.g., groq"
                disabled={!!editingId}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Name</label>
              <input
                className="settings-input"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Groq"
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Base URL</label>
              <input
                className="settings-input"
                value={form.base_url}
                onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))}
                placeholder="https://api.groq.com/openai/v1"
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
                placeholder="llama-3.1-8b-instant"
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
          const emoji = PROVIDER_EMOJIS[p.id] || '🔌';
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
                  <span style={{ fontSize: 20 }}>{emoji}</span>
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
                  {/* Test button */}
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

                  {/* Edit */}
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

                  {/* Toggle */}
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

                  {/* Delete */}
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

              {/* Test result display */}
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
          No providers configured. Click "+ Add" to get started.
        </div>
      )}
    </div>
  );
}
