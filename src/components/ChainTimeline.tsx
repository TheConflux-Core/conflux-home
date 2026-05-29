// ChainTimeline — visual display of Heartbeat Cascade Chain execution
// Shows 10 step dots with agent colors, current step label, chain active/complete states

import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { AGENTS } from '../lib/beatBus';
import './ChainTimeline.css';

// Chain step definitions (matches spec)
const CHAIN_STEPS = [
  { agent: 'conflux',  label: 'State reconciliation', delay: 0,   step: 1 },
  { agent: 'aegis',    label: 'Security scan',         delay: 20,  step: 2 },
  { agent: 'helix',    label: 'Market intel',           delay: 60,  step: 3 },
  { agent: 'pulse',    label: 'Financial pulse',       delay: 120, step: 4 },
  { agent: 'viper',    label: 'Vulnerability scan',    delay: 180, step: 5 },
  { agent: 'horizon',  label: 'Dream progress',       delay: 300, step: 6 },
  { agent: 'orbit',    label: 'Task review',           delay: 420, step: 7 },
  { agent: 'hearth',   label: 'Kitchen check',         delay: 540, step: 8 },
  { agent: 'echo',     label: 'Wellness check',        delay: 660, step: 9 },
  { agent: 'conflux',  label: 'Chain summary',         delay: 780, step: 10 },
];

// Agent colors from beatBus AGENTS
const AGENT_COLORS: Record<string, string> = {
  conflux:  '#8b5cf6',
  helix:    '#a78bfa',
  pulse:    '#34d399',
  hearth:   '#fb923c',
  echo:     '#f472b6',
  aegis:    '#38bdf8',
  viper:    '#22c55e',
  forge:    '#f97316',
  orbit:    '#e879f9',
  horizon:  '#f472b6',
};

export interface ChainState {
  running: boolean;
  currentStep: number;
  totalSteps: number;
  startedAt: number | null;
  nextBeatAt: number | null;
  agents: string[];
}

export interface ChainEvent {
  step: number;
  agentId: string;
  agentLabel: string;
  action: string;
  detail: string;
  status: 'running' | 'complete';
}

const DEFAULT_CHAIN_STATE: ChainState = {
  running: false,
  currentStep: 0,
  totalSteps: 10,
  startedAt: null,
  nextBeatAt: null,
  agents: ['conflux', 'aegis', 'helix', 'pulse', 'viper', 'horizon', 'orbit', 'hearth', 'echo'],
};

function nextBeatLabel(ts: number): string {
  const diff = ts - Date.now();
  if (diff <= 0) return 'now';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function ChainTimeline() {
  const [chainState, setChainState] = useState<ChainState>(DEFAULT_CHAIN_STATE);
  const [lastEvent, setLastEvent] = useState<ChainEvent | null>(null);
  const [completeTimeout, setCompleteTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Listen for chain events from Rust backend
  useEffect(() => {
    let active = true;

    const setup = async () => {
      const unlistenEvent = await listen<ChainEvent>('conflux:chain-event', (event) => {
        if (!active) return;
        const data = event.payload;
        console.log('[ChainTimeline] conflux:chain-event received:', JSON.stringify(data));
        setLastEvent(data);
        // step from Rust is 0-indexed; convert to 1-indexed for display
        setChainState(prev => ({
          ...prev,
          running: data.status === 'running',
          currentStep: data.step + 1,
        }));
      });

      const unlistenComplete = await listen('conflux:chain-complete', () => {
        if (!active) return;
        setChainState(prev => ({
          ...prev,
          running: false,
          currentStep: 10,
        }));
        if (completeTimeout) clearTimeout(completeTimeout);
        const t = setTimeout(() => {
          setChainState(DEFAULT_CHAIN_STATE);
          setLastEvent(null);
        }, 120000);
        setCompleteTimeout(t);
      });

      return () => { unlistenEvent(); unlistenComplete(); };
    };

    const promise = setup();
    return () => {
      active = false;
      promise.then(fn => fn());
    };
  }, []);

  // Fetch initial chain state from Rust
  useEffect(() => {
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke<ChainState>('heartbeat_chain_get_state').then(setChainState).catch(() => {});
    });
  }, []);

  // No polling — chain-event and chain-complete listeners above handle all updates

  // step is 0-indexed from Rust; all display logic uses 1-indexed
  const getStepStatus = (stepIdx: number) => {
    if (!chainState.running && chainState.currentStep === 0) return 'pending';
    if (lastEvent?.step === stepIdx && lastEvent.status === 'running') return 'running';
    if (lastEvent && lastEvent.step > stepIdx) return 'complete';
    if (lastEvent?.step === stepIdx && lastEvent.status === 'complete') return 'complete';
    return 'pending';
  };

  const getStepColor = (stepIdx: number) => {
    const agentId = CHAIN_STEPS[stepIdx]?.agent;
    return AGENT_COLORS[agentId] ?? '#8b5cf6';
  };

  const getStepAgentEmoji = (stepIdx: number) => {
    const agentId = CHAIN_STEPS[stepIdx]?.agent;
    const agent = AGENTS.find(a => a.id === agentId);
    return agent?.emoji ?? '⚡';
  };

  const isComplete = !chainState.running && chainState.currentStep === 10;

  // Always render — shows idle state when nothing active
  // Never return null (heartbeat section needs visible UI)
  return (
    <div className={`chain-timeline ${chainState.running ? 'chain-active' : ''} ${isComplete ? 'chain-complete' : ''}`}>
      {chainState.running && (
        <div className="chain-active-indicator">
          <div className="chain-active-ring" />
          <span className="chain-active-text">Cascade running</span>
        </div>
      )}
      {!chainState.running && !isComplete && (
        <div className="chain-idle-indicator">
          <span className="chain-idle-text">Cascade idle · next heartbeat {chainState.nextBeatAt ? `in ${nextBeatLabel(chainState.nextBeatAt)}` : '—'}</span>
        </div>
      )}

      {/* Row 1: steps 1-5 */}
      <div className="chain-dots">
        {CHAIN_STEPS.slice(0, 5).map((stepDef) => {
          const status = getStepStatus(stepDef.step - 1);
          const color = getStepColor(stepDef.step - 1);
          return (
            <div key={stepDef.step} className="chain-dot-wrapper" title={stepDef.label}>
              <span className="chain-dot-emoji">{getStepAgentEmoji(stepDef.step - 1)}</span>
              <div
                className={`chain-dot chain-dot-${status}`}
                style={status !== 'pending' ? { '--dot-color': color } as React.CSSProperties : undefined}
              >
                {status === 'running' && <div className="chain-dot-pulse" style={{ background: color }} />}
                {status === 'complete' && <span className="chain-dot-check">✓</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 2: steps 6-10 */}
      <div className="chain-dots">
        {CHAIN_STEPS.slice(5).map((stepDef) => {
          const status = getStepStatus(stepDef.step - 1);
          const color = getStepColor(stepDef.step - 1);
          return (
            <div key={stepDef.step} className="chain-dot-wrapper" title={stepDef.label}>
              <span className="chain-dot-emoji">{getStepAgentEmoji(stepDef.step - 1)}</span>
              <div
                className={`chain-dot chain-dot-${status}`}
                style={status !== 'pending' ? { '--dot-color': color } as React.CSSProperties : undefined}
              >
                {status === 'running' && <div className="chain-dot-pulse" style={{ background: color }} />}
                {status === 'complete' && <span className="chain-dot-check">✓</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Current step label */}
      {lastEvent && (
        <div className="chain-step-label">
          <span className="chain-step-agent" style={{ color: getStepColor(lastEvent.step) }}>
            {lastEvent.agentLabel}
          </span>
          <span className="chain-step-action">— {lastEvent.action}</span>
          <span className="chain-step-detail">{lastEvent.detail}</span>
        </div>
      )}

      {/* Chain complete state */}
      {isComplete && (
        <div className="chain-complete-label">
          <span>✓ Cascade complete — all 10 agents checked in</span>
        </div>
      )}

      {/* Progress line */}
      {chainState.running && lastEvent && (
        <div className="chain-status">
          Step {lastEvent.step + 1}/{chainState.totalSteps} — {lastEvent.detail}
        </div>
      )}
    </div>
  );
}