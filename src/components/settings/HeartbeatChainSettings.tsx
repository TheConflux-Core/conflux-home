// HeartbeatChainSettings — Settings panel section for Heartbeat Cascade Chain
// Allows enable/disable, agent toggle, and test chain trigger

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { playToggleOn, playToggleOff } from '../../lib/sound';
import { AGENTS } from '../../lib/beatBus';

// Chain agent list (from spec)
const CHAIN_AGENTS = [
  { id: 'conflux', label: 'Conflux' },
  { id: 'aegis',   label: 'Aegis' },
  { id: 'helix',   label: 'Helix' },
  { id: 'pulse',   label: 'Pulse' },
  { id: 'viper',   label: 'Viper' },
  { id: 'horizon', label: 'Horizon' },
  { id: 'orbit',   label: 'Orbit' },
  { id: 'hearth',  label: 'Hearth' },
  { id: 'echo',    label: 'Echo' },
];

interface ChainState {
  running: boolean;
  currentStep: number;
  totalSteps: number;
  startedAt: number | null;
  nextBeatAt: number | null;
  agents: string[];
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className={`toggle-switch ${checked ? 'on' : ''}`}
      onClick={() => { checked ? playToggleOff() : playToggleOn(); onChange(!checked); }}
      aria-label={checked ? 'Disable' : 'Enable'}
      type="button"
    />
  );
}

function formatNextBeat(ts: number | null): string {
  if (!ts) return '—';
  const diff = ts - Date.now();
  if (diff <= 0) return 'Now';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function HeartbeatChainSettings() {
  const [enabled, setEnabled] = useState(true);
  const [activeAgents, setActiveAgents] = useState<string[]>(CHAIN_AGENTS.map(a => a.id));
  const [chainState, setChainState] = useState<ChainState | null>(null);
  const [testing, setTesting] = useState(false);
  const [testFeedback, setTestFeedback] = useState<string>('');

  // Load chain state
  useEffect(() => {
    const load = async () => {
      try {
        const state = await invoke<ChainState>('heartbeat_chain_get_state');
        setChainState(state);
        // Load enabled agents from config (stored in the state)
        if (state.agents) {
          setActiveAgents(state.agents);
        }
      } catch (_e) {}
    };
    load();

    // Listen for chain state changes
    const unlisten = listen<ChainState>('conflux:chain-state-updated', (event) => {
      setChainState(event.payload);
    });

    return () => { unlisten.then(fn => fn()); };
  }, []);

  // Toggle agent in chain
  const toggleAgent = (agentId: string) => {
    setActiveAgents(prev => {
      if (prev.includes(agentId)) {
        return prev.filter(id => id !== agentId);
      } else {
        return [...prev, agentId];
      }
    });
  };

  // Save config when agents change
  const saveConfig = useCallback(async (agents: string[]) => {
    try {
      await invoke('heartbeat_chain_update_config', {
        config: { enabled, agents },
      });
    } catch (_e) {}
  }, [enabled]);

  useEffect(() => {
    const t = setTimeout(() => saveConfig(activeAgents), 500);
    return () => clearTimeout(t);
  }, [activeAgents, saveConfig]);

  const handleEnabledChange = (v: boolean) => {
    setEnabled(v);
    invoke('heartbeat_chain_update_config', {
      config: { enabled: v, agents: activeAgents },
    }).catch(() => {});
  };

  const handleTestChain = async () => {
    if (testing) return;
    setTesting(true);
    setTestFeedback('');
    try {
      await invoke('heartbeat_chain_trigger_test');
      setTestFeedback('Chain fired! Check Intel for progress.');
      setTimeout(() => setTestFeedback(''), 4000);
    } catch (err) {
      setTestFeedback('Test failed — check console for errors.');
      setTimeout(() => setTestFeedback(''), 4000);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="settings-section">
      <div className="settings-section-title">💓 Heartbeat Cascade</div>

      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
        Transform every heartbeat into a coordinated cascade of agent activity. Each check-in triggers a 10-step chain across your agent family.
      </p>

      {/* Enable/disable toggle */}
      <div className="settings-row">
        <span className="settings-label">Enable Chain</span>
        <ToggleSwitch checked={enabled} onChange={handleEnabledChange} />
      </div>

      {/* Current status */}
      <div className="settings-row">
        <span className="settings-label">Status</span>
        <span className="settings-value" style={{ color: chainState?.running ? '#34d399' : 'inherit' }}>
          {chainState?.running
            ? `Running · ${chainState.currentStep}/${chainState.totalSteps} complete`
            : chainState?.nextBeatAt
            ? `Next check-in in ${formatNextBeat(chainState.nextBeatAt)}`
            : 'Idle'}
        </span>
      </div>

      {/* Agent toggles */}
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(140, 120, 180, 0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'Inter, sans-serif' }}>
          Active Agents
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {CHAIN_AGENTS.map(agent => {
            const meta = AGENTS.find(a => a.id === agent.id);
            const isActive = activeAgents.includes(agent.id);
            return (
              <div
                key={agent.id}
                className="settings-row"
                style={{ cursor: 'pointer' }}
                onClick={() => toggleAgent(agent.id)}
              >
                <span className="settings-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{meta?.emoji ?? '⚡'}</span>
                  {agent.label}
                </span>
                <ToggleSwitch checked={isActive} onChange={() => toggleAgent(agent.id)} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Test chain button */}
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          className="settings-button"
          onClick={handleTestChain}
          disabled={testing}
        >
          {testing ? '⏳ Firing...' : '🧪 Test Chain'}
        </button>
        {testFeedback && (
          <span style={{ fontSize: 12, color: 'rgba(167, 243, 208, 0.8)' }}>{testFeedback}</span>
        )}
      </div>
    </div>
  );
}