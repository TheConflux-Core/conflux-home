// Conflux Home — Agent Persona Editor
// Edit agent soul, instructions, model, and emoji from the UI.

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface Agent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  soul: string | null;
  instructions: string | null;
  model_alias: string;
  tier: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const MODEL_OPTIONS = [
  { value: 'conflux-fast', label: 'Fast (Llama 3.1 8B)', desc: 'Quick responses, good for chat' },
  { value: 'conflux-smart', label: 'Smart (Llama 3.3 70B / Qwen 235B)', desc: 'Deeper reasoning, slower' },
];

export default function AgentEditor() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Edit state
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [role, setRole] = useState('');
  const [soul, setSoul] = useState('');
  const [instructions, setInstructions] = useState('');
  const [modelAlias, setModelAlias] = useState('conflux-fast');

  const loadAgents = useCallback(async () => {
    try {
      const data = await invoke<Agent[]>('engine_get_agents');
      setAgents(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (err) {
      console.error('[AgentEditor] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // Populate form when selection changes
  useEffect(() => {
    const agent = agents.find(a => a.id === selectedId);
    if (agent) {
      setName(agent.name);
      setEmoji(agent.emoji);
      setRole(agent.role);
      setSoul(agent.soul || '');
      setInstructions(agent.instructions || '');
      setModelAlias(agent.model_alias);
      setSaved(false);
    }
  }, [selectedId, agents]);

  async function saveAgent() {
    if (!selectedId) return;
    setSaving(true);
    try {
      await invoke('engine_update_agent', {
        req: {
          id: selectedId,
          name,
          emoji,
          role,
          soul: soul || null,
          instructions: instructions || null,
          model_alias: modelAlias,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await loadAgents();
    } catch (err) {
      console.error('[AgentEditor] Failed to save:', err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="settings-section">
        <div className="settings-section-title">🧠 Agent Personas</div>
        <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>Loading agents...</div>
      </div>
    );
  }

  const selectedAgent = agents.find(a => a.id === selectedId);

  return (
    <div className="settings-section">
      <div className="settings-section-title">🧠 Agent Personas</div>

      {/* Agent Selector */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {agents.map(a => (
          <button
            key={a.id}
            onClick={() => setSelectedId(a.id)}
            style={{
              background: selectedId === a.id ? 'var(--accent-primary)' : 'var(--bg-card)',
              border: `1px solid ${selectedId === a.id ? 'var(--accent-primary)' : 'var(--border)'}`,
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              color: selectedId === a.id ? '#000' : 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>{a.emoji}</span>
            <span>{a.name}</span>
          </button>
        ))}
      </div>

      {selectedAgent && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 16,
        }}>
          {/* Basic Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Emoji</label>
              <input
                className="settings-input"
                value={emoji}
                onChange={e => setEmoji(e.target.value)}
                style={{ textAlign: 'center', fontSize: 20 }}
                maxLength={2}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Name</label>
              <input
                className="settings-input"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Role</label>
              <input
                className="settings-input"
                value={role}
                onChange={e => setRole(e.target.value)}
              />
            </div>
          </div>

          {/* Model Selection */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Model</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {MODEL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setModelAlias(opt.value)}
                  style={{
                    flex: 1,
                    background: modelAlias === opt.value ? 'rgba(0,212,255,0.1)' : 'transparent',
                    border: `1px solid ${modelAlias === opt.value ? 'var(--accent-primary)' : 'var(--border)'}`,
                    borderRadius: 8,
                    padding: '8px 12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{opt.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Soul */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Soul (personality & voice)
            </label>
            <textarea
              className="settings-input"
              value={soul}
              onChange={e => setSoul(e.target.value)}
              rows={4}
              placeholder="Who is this agent? What's their personality, voice, and values?"
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          {/* Instructions */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Instructions (behavior rules)
            </label>
            <textarea
              className="settings-input"
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={4}
              placeholder="What should this agent do? What rules should they follow?"
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          {/* Agent ID (read-only) */}
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 12, fontFamily: 'monospace' }}>
            Agent ID: {selectedAgent.id} · Tier: {selectedAgent.tier} · Created: {new Date(selectedAgent.created_at).toLocaleDateString()}
          </div>

          {/* Save Button */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="settings-button primary"
              onClick={saveAgent}
              disabled={saving}
              style={{
                background: saved ? '#34c759' : undefined,
              }}
            >
              {saving ? 'Saving...' : saved ? '✓ Saved!' : '💾 Save Changes'}
            </button>
            {saved && (
              <span style={{ fontSize: 11, color: '#34c759' }}>
                Agent persona updated
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
