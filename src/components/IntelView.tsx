// IntelView — live agent activity monitor (INTEL section of desktop)
// Shows: agent activity indicators, live beat timeline, system stats
// Wired to BeatEventBus — every beat fires visibly
// Session 4: Expandable beat cards, severity colors, agent activity feed

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ConfluxPresence } from './conflux';
import { triggerFairyNudge } from '../lib/triggerFairyNudge';
import { AGENTS, useBeatTimeline, useAgentActivity, emitBeat, type BeatEvent } from '../lib/beatBus';
import ChainTimeline from './ChainTimeline';
import './IntelView.css';

interface AgentFromDB {
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

// ── Agent row ─────────────────────────────────────────────────────────────────
interface DisplayAgent {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

function AgentRow({ agent }: { agent: DisplayAgent }) {
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

// ── Agent last-activity row (replaces fake AGENT_LOG_LINES) ───────────────────
// Shows the most recent real beat event for each agent.
function AgentActivityRow({ agentId, emoji, color, events }: {
  agentId: string;
  emoji: string;
  color: string;
  events: BeatEvent[];
}) {
  const lastBeat = events.find(e => e.agentId === agentId);

  if (!lastBeat) {
    return (
      <div className="intel-agent-log-row visible" style={{ '--agent-color': color } as React.CSSProperties}>
        <span className="intel-log-emoji">{emoji}</span>
        <span className="intel-log-text" style={{ opacity: 0.4 }}>No activity yet</span>
      </div>
    );
  }

  const ago = timeAgo(lastBeat.timestamp);
  const summary = lastBeat.action;
  const detail = lastBeat.detail ? truncate(lastBeat.detail, 80) : '';

  return (
    <div className={`intel-agent-log-row visible intel-activity-${lastBeat.type}`}
      style={{ '--agent-color': color } as React.CSSProperties}>
      <span className="intel-log-emoji">{emoji}</span>
      <div className="intel-activity-content">
        <span className="intel-activity-action">{summary}</span>
        {detail && <span className="intel-activity-detail">{detail}</span>}
      </div>
      <span className="intel-activity-time">{ago}</span>
    </div>
  );
}

// ── Beat event row — EXPANDABLE with severity colors ──────────────────────────
function BeatRow({ event, index }: { event: BeatEvent; index: number }) {
  const agent = AGENTS.find(a => a.id === event.agentId);
  const ago = timeAgo(event.timestamp);
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handlePlay = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playing) return;
    const text = `${event.agentLabel}: ${event.action}. ${event.detail ?? ''}`;
    setPlaying(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('voice_synthesize', { text });
    } catch (err) {
      console.warn('[BeatRow] TTS failed:', err);
    } finally {
      setPlaying(false);
    }
  }, [playing, event]);

  const handleToggle = useCallback(() => {
    // Only expand if there's meaningful detail to show
    if (event.detail && event.detail.length > 80) {
      setExpanded(prev => !prev);
    }
  }, [event.detail]);

  const hasExpandableDetail = event.detail && event.detail.length > 80;

  // Severity badge
  const severityLabel = event.type === 'warn' ? '⚠️ Alert'
    : event.type === 'success' ? '✓ Clear'
    : '● Info';

  return (
    <div
      className={`intel-beat intel-beat-${event.type} ${expanded ? 'intel-beat-expanded' : ''} ${hasExpandableDetail ? 'intel-beat-expandable' : ''}`}
      style={{ animationDelay: `${index * 0.04}s` }}
      onClick={handleToggle}
    >
      {/* Severity accent bar (left side) */}
      <div className={`intel-beat-accent intel-accent-${event.type}`} />

      <div className="intel-beat-agent-icon" style={{ color: agent?.color ?? '#fff' }}>
        {agent?.emoji ?? '⚡'}
      </div>
      <div className="intel-beat-body">
        <div className="intel-beat-header">
          <span className="intel-beat-action">
            <strong>{event.agentLabel}</strong> {event.action}
          </span>
          <span className={`intel-beat-severity intel-severity-${event.type}`}>
            {severityLabel}
          </span>
        </div>
        {event.detail && (
          <span className={`intel-beat-detail ${expanded ? 'intel-beat-detail-full' : ''}`}>
            {expanded ? event.detail : truncate(event.detail, 80)}
          </span>
        )}
        {/* Tool usage indicators (Session 6) */}
        {event.toolsUsed && event.toolsUsed.length > 0 && (
          <div className="intel-beat-tools">
            {event.toolsUsed.map((tool, i) => (
              <span key={i} className="intel-beat-tool-tag">{tool}</span>
            ))}
          </div>
        )}
        {hasExpandableDetail && (
          <span className="intel-beat-expand-hint">
            {expanded ? '▲ less' : '▼ more'}
          </span>
        )}
      </div>
      <div className="intel-beat-actions">
        <button
          className={`intel-beat-play ${playing ? 'playing' : ''}`}
          onClick={handlePlay}
          title="Hear this beat"
        >
          {playing ? '🔊' : '🔈'}
        </button>
        <span className="intel-beat-time">{ago}</span>
      </div>
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

  const warnCount = todayEvents.filter(e => e.type === 'warn').length;

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
      {warnCount > 0 && (
        <>
          <div className="intel-stat-divider" />
          <div className="intel-stat">
            <span className="intel-stat-value" style={{ color: '#fbbf24' }}>{warnCount}</span>
            <span className="intel-stat-label">alerts</span>
          </div>
        </>
      )}
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

// Default active agents (must match AgentsView)
const DEFAULT_ACTIVE_AGENTS = ['conflux', 'helix', 'pulse', 'hearth', 'echo', 'aegis', 'viper'];

// ── Main IntelView ─────────────────────────────────────────────────────────────
export default function IntelView() {
  const events = useBeatTimeline();
  // Load from localStorage synchronously
  const [activeAgents, setActiveAgents] = useState<AgentFromDB[]>(() => {
    try {
      const stored = localStorage.getItem('conflux-selected-agents');
      const selectedIds: string[] = stored ? JSON.parse(stored) : DEFAULT_ACTIVE_AGENTS;
      return AGENTS.filter(a => selectedIds.includes(a.id)).map(a => ({
        id: a.id,
        name: a.label,
        emoji: a.emoji,
        role: a.id,
        soul: null,
        instructions: null,
        model_alias: 'conflux-core',
        tier: 'free',
        is_active: true,
        created_at: '',
        updated_at: '',
      }));
    } catch {
      return AGENTS.filter(a => DEFAULT_ACTIVE_AGENTS.includes(a.id)).map(a => ({
        id: a.id,
        name: a.label,
        emoji: a.emoji,
        role: a.id,
        soul: null,
        instructions: null,
        model_alias: 'conflux-core',
        tier: 'free',
        is_active: true,
        created_at: '',
        updated_at: '',
      }));
    }
  });
  const [loading, setLoading] = useState(false);

  // Agent filter for the feed — null = show all
  const [agentFilter, setAgentFilter] = useState<string | null>(null);

  // Sync with AgentsView toggle events
  useEffect(() => {
    const handler = () => {
      try {
        const stored = localStorage.getItem('conflux-selected-agents');
        if (!stored) return;
        const selectedIds: string[] = JSON.parse(stored);
        setActiveAgents(AGENTS.filter(a => selectedIds.includes(a.id)).map(a => ({
          id: a.id,
          name: a.label,
          emoji: a.emoji,
          role: a.id,
          soul: null,
          instructions: null,
          model_alias: 'conflux-core',
          tier: 'free',
          is_active: true,
          created_at: '',
          updated_at: '',
        })));
      } catch (_e) {}
    };
    window.addEventListener('conflux:agents-selected', handler);
    return () => window.removeEventListener('conflux:agents-selected', handler);
  }, []);

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

  // Filtered events for the feed
  const filteredEvents = useMemo(() => {
    if (!agentFilter) return events;
    return events.filter(e => e.agentId === agentFilter);
  }, [events, agentFilter]);

  // Agents that have at least one beat event (for filter pills)
  const agentsWithActivity = useMemo(() => {
    const ids = new Set(events.map(e => e.agentId));
    return AGENTS.filter(a => ids.has(a.id));
  }, [events]);

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

      {/* NeuralBrain + Stats + ChainTimeline */}
      <div className="intel-brain-section">
        <BrainPulseRing beatCount={beatPulse} />
        <StatsBar events={events} />
      </div>

      {/* Chain Timeline */}
      <ChainTimeline />

      {/* Agent status grid — THE FAMILY */}
      <div className="intel-section-label">THE FAMILY</div>
      <div className="intel-agents">
        {loading ? (
          <div className="intel-empty">Loading agents...</div>
        ) : activeAgents.length === 0 ? (
          <div className="intel-empty">No active agents. Enable agents in Settings.</div>
        ) : (
          activeAgents.map(agent => {
            const meta = AGENTS.find(a => a.id === agent.id);
            if (!meta) return null;
            const rowAgent: DisplayAgent = {
              id: agent.id,
              label: agent.name,
              emoji: meta.emoji,
              color: meta.color,
            };
            return (
              <AgentRow
                key={agent.id}
                agent={rowAgent}
              />
            );
          })
        )}
      </div>

      {/* Per-agent activity — real last-activity from beat events */}
      <div className="intel-section-label">SHIFT LOG</div>
      <div className="intel-shift-log">
        {activeAgents.slice(0, 6).map(agent => {
          const meta = AGENTS.find(a => a.id === agent.id);
          if (!meta) return null;
          return (
            <AgentActivityRow
              key={agent.id}
              agentId={agent.id}
              emoji={meta.emoji}
              color={meta.color}
              events={events}
            />
          );
        })}
      </div>

      {/* Beat timeline — with agent filter pills */}
      <div className="intel-section-label">HEARTBEAT</div>

      {/* Agent filter pills */}
      {agentsWithActivity.length > 1 && (
        <div className="intel-filter-pills">
          <button
            className={`intel-filter-pill ${agentFilter === null ? 'intel-filter-active' : ''}`}
            onClick={() => setAgentFilter(null)}
          >
            All
          </button>
          {agentsWithActivity.map(agent => (
            <button
              key={agent.id}
              className={`intel-filter-pill ${agentFilter === agent.id ? 'intel-filter-active' : ''}`}
              style={{ '--pill-color': agent.color } as React.CSSProperties}
              onClick={() => setAgentFilter(agentFilter === agent.id ? null : agent.id)}
            >
              {agent.emoji} {agent.label}
            </button>
          ))}
        </div>
      )}

      <div className="intel-feed">
        {filteredEvents.length === 0 ? (
          <div className="intel-empty">
            <span className="intel-empty-spinner" />
            {agentFilter
              ? `No activity from ${AGENTS.find(a => a.id === agentFilter)?.label ?? 'this agent'} yet...`
              : 'Waiting for agent activity...'
            }
          </div>
        ) : (
          filteredEvents.slice(0, 12).map((event, i) => (
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
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  // Try to break at word boundary
  const truncated = text.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > maxLen * 0.7 ? truncated.slice(0, lastSpace) : truncated) + '…';
}
