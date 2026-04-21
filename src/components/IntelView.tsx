// IntelView — live agent activity monitor (INTEL section of desktop)
// Shows: agent activity indicators, live beat timeline, system stats
// Wired to BeatEventBus — every beat fires visibly

import { useState, useEffect, useRef } from 'react';
import { ConfluxPresence } from './conflux';
import { triggerFairyNudge } from '../lib/triggerFairyNudge';
import { AGENTS, useBeatTimeline, useAgentActivity, emitBeat, startDemoBeats, type BeatEvent } from '../lib/beatBus';
import './IntelView.css';

// ── Agent row ─────────────────────────────────────────────────────────────────
function AgentRow({ agent }: { agent: typeof AGENTS[number] }) {
  const { lastActive, isActive } = useAgentActivity(agent.id);
  const ago = lastActive ? timeAgo(lastActive) : '—';

  return (
    <div className={`intel-agent ${isActive ? 'intel-agent-active' : ''}`}>
      <div className="intel-agent-dot" style={{ '--agent-color': agent.color } as React.CSSProperties} />
      <span className="intel-agent-emoji">{agent.emoji}</span>
      <span className="intel-agent-name">{agent.label}</span>
      <span className="intel-agent-status">
        {isActive ? (
          <span className="intel-status-working">
            <span className="intel-working-dot" />
            Working
          </span>
        ) : (
          <span className="intel-status-idle">Active {ago}</span>
        )}
      </span>
    </div>
  );
}

// ── Beat event row ─────────────────────────────────────────────────────────────
function BeatRow({ event, index }: { event: BeatEvent; index: number }) {
  const agent = AGENTS.find(a => a.id === event.agentId);
  const ago = timeAgo(event.timestamp);

  return (
    <div
      className={`intel-beat intel-beat-${event.type}`}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <div className="intel-beat-agent-icon" style={{ color: agent?.color ?? '#fff' }}>
        {agent?.emoji ?? '⚡'}
      </div>
      <div className="intel-beat-body">
        <span className="intel-beat-action">
          <strong>{event.agentLabel}</strong> {event.action}
        </span>
        {event.detail && (
          <span className="intel-beat-detail">{event.detail}</span>
        )}
      </div>
      <div className="intel-beat-time">{ago}</div>
    </div>
  );
}

// ── Live pulse ring around NeuralBrain ─────────────────────────────────────────
function BrainPulseRing({ beatCount }: { beatCount: number }) {
  return (
    <div className="intel-brain-ring">
      <div className="intel-ring-inner">
        <ConfluxPresence
          command={{
            mode: 'idle',
            label: 'INTEL',
            scale: 1,
            turbulence: 0.3,
            driftAxis: [0, 0, 0] as [number, number, number],
            wobble: 0.4,
            lobeSpread: 0.8,
            speechRingIntensity: 0.6,
            activeLobes: ['memory', 'reasoning'] as const,
            glowBoost: 1.4,
            pulseRate: 1.2,
            palette: {
              node: '#3a2a6b',
              hot: '#7c5aad',
              line: '#9d7ac7',
              glow: '#c4a3f0',
              aura: '#1a1040',
            },
          }}
          pulseImpulse={beatCount}
          fairyExpression="idle"
          style={{ width: 160, height: 160 }}
        />
      </div>
      {/* Outer pulse ring */}
      <div className="intel-ring-outer" />
    </div>
  );
}

// ── Stats bar ──────────────────────────────────────────────────────────────────
function StatsBar({ events }: { events: BeatEvent[] }) {
  const today = new Date().toDateString();
  const todayEvents = events.filter(e => new Date(e.timestamp).toDateString() === today);

  const agentCounts = todayEvents.reduce<Record<string, number>>((acc, e) => {
    acc[e.agentId] = (acc[e.agentId] ?? 0) + 1;
    return acc;
  }, {});

  const topAgent = Object.entries(agentCounts).sort((a, b) => b[1] - a[1])[0];
  const topAgentDef = AGENTS.find(a => a.id === topAgent?.[0]);

  return (
    <div className="intel-stats">
      <div className="intel-stat">
        <span className="intel-stat-value">{todayEvents.length}</span>
        <span className="intel-stat-label">beats today</span>
      </div>
      <div className="intel-stat-divider" />
      <div className="intel-stat">
        <span className="intel-stat-value">{events.length > 0 ? timeAgo(events[0].timestamp) : '—'}</span>
        <span className="intel-stat-label">last beat</span>
      </div>
      <div className="intel-stat-divider" />
      <div className="intel-stat">
        <span className="intel-stat-value" style={{ color: topAgentDef?.color }}>
          {topAgentDef ? `${topAgentDef.emoji} ${topAgent[1]}` : '—'}
        </span>
        <span className="intel-stat-label">most active</span>
      </div>
    </div>
  );
}

// ── Main IntelView ─────────────────────────────────────────────────────────────
export default function IntelView() {
  const events = useBeatTimeline();
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) {
      setStarted(true);
      startDemoBeats(45000);
    }
  }, [started]);

  // Pulse counter for NeuralBrain
  const beatCountRef = useRef(0);
  const [beatPulse, setBeatPulse] = useState(0);

  useEffect(() => {
    if (events.length === 0) return;
    beatCountRef.current += 1;
    setBeatPulse(beatCountRef.current);
    // Also emit a fairy nudge for interesting beats
    const latest = events[0];
    if (latest.type === 'success') {
      triggerFairyNudge({
        id: `beat-${latest.id}`,
        text: `${latest.agentLabel}: ${latest.action}`,
        app: latest.agentId,
        priority: 'info',
      });
    }
  }, [events.length]);

  return (
    <div className="intel-view">
      {/* Header */}
      <div className="intel-header">
        <div className="intel-title">INTEL</div>
        <div className="intel-live-indicator">
          <span className="intel-live-dot" />
          Live
        </div>
      </div>

      {/* NeuralBrain + Stats */}
      <div className="intel-brain-section">
        <BrainPulseRing beatCount={beatPulse} />
        <StatsBar events={events} />
      </div>

      {/* Agent status grid */}
      <div className="intel-section-label">AGENT STATUS</div>
      <div className="intel-agents">
        {AGENTS.map(agent => (
          <AgentRow key={agent.id} agent={agent} />
        ))}
      </div>

      {/* Beat timeline */}
      <div className="intel-section-label">ACTIVITY FEED</div>
      <div className="intel-feed">
        {events.length === 0 ? (
          <div className="intel-empty">
            <span className="intel-empty-spinner" />
            Waiting for agent activity...
          </div>
        ) : (
          events.slice(0, 12).map((event, i) => (
            <BeatRow key={event.id} event={event} index={i} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}
