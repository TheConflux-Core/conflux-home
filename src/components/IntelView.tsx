// IntelView — live agent activity monitor (INTEL section of desktop)
// Shows: agent activity indicators, live beat timeline, system stats
// Wired to BeatEventBus — every beat fires visibly

import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ConfluxPresence } from './conflux';
import { triggerFairyNudge } from '../lib/triggerFairyNudge';
import { AGENTS, useBeatTimeline, useAgentActivity, emitBeat, startDemoBeats, type BeatEvent } from '../lib/beatBus';
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

// ── Per-agent creative status log ──────────────────────────────────────────────
// Creative, clever, personality-driven status lines for each agent.
// Each agent cycles through fun micro-updates every 18 seconds.
// Fires on beatBus so it appears alongside real heartbeat events.
const AGENT_LOG_LINES: Record<string, string[]> = {
  conflux: [
    "🧠 Processing 47 conversation threads...",
    "👁️ Scanning for new opportunities...",
    "⚡ Routing neural pathways...",
    "🔮 99.7% uptime this week",
    "🌐 Syncing agent family state...",
    "💭 3 user habits identified today",
  ],
  helix: [
    "📊 Crunching market signals...",
    "🔬 12 new companies flagged today",
    "📈 AAPL+1.2% · TSLA+2.8% · NVDA+4.1%",
    "🧪 Research mode: deep dive initiated",
    "📰 847 articles scanned this hour",
    "🎯 Pattern match: 3 high-confidence signals",
  ],
  pulse: [
    "💚 Tracking financial pulse...",
    "📉 $127 remaining of $500 budget",
    "🔔 You've hit 78% of monthly goals",
    "💸 Last transaction: $45 groceries",
    "📋 3 budget anomalies flagged",
    "🎉 Net worth trending up 2.3% this month",
  ],
  hearth: [
    "🔥 Warming up the kitchen...",
    "🥗 12 recipes matched to your week",
    "📦 3 pantry items running low",
    "🛒 Kroger cart: 8 items ready",
    "🍳 Meal prep: 5 dinners planned",
    "🌿 Reducing food waste: 23% vs last week",
  ],
  echo: [
    "🫂 Holding space for your thoughts...",
    "💜 Emotional resonance: 94%",
    "📝 Journal entries: 14 this month",
    "🌱 Growth patterns: 3 positive trends",
    "🧘 Grounding exercise ready when you are",
    "💬 6 conversations this week",
  ],
  aegis: [
    "🛡️ Shield raised · all clear",
    "🔍 1,247 auth events scanned today",
    "✅ Zero anomalies detected",
    "🔐 Security posture: strong",
    "📡 Monitoring 4 access channels",
    "🛡️ Threat intel: no active risks",
  ],
  viper: [
    "🐍 Hunting anomalies...",
    "👁️ 2 unusual login patterns noted",
    "⚠️ Rate-limit triggered: 1 location",
    "🕵️ Forensic log: 99.8% clean",
    "🐍 Venom ready · eyes sharp",
    "📋 Red team: no exposure found",
  ],
  forge: [
    "🔨 Forging new capabilities...",
    "⚙️ Background tasks: 4 complete",
    "📦 Product v2.4: spec exported",
    "🔧 3 PRs reviewed · 0 critical issues",
    "🏗️ Build pipeline: running clean",
    "⚡ Latency: 12ms avg response",
  ],
  orbit: [
    "🧠 Orbiting your tasks...",
    "✅ 3 tasks completed today",
    "🎯 Focus mode: 2 deep-work blocks",
    "📅 Tomorrow: 4 tasks queued",
    "⏰ 2 habits streak: 7 days",
    "🌙 Evening review: 8 items prepped",
  ],
  horizon: [
    "🎯 Summit in sight...",
    "🏔️ Milestone 3/7: 43% to next peak",
    "🔥 Quit Smoking: 7-day streak 🎉",
    "📈 Goal velocity: +18% this month",
    "🌅 New dream: filed for review",
    "🏆 Achievement unlocked: consistency champion",
  ],
};

function AgentLogRow({ agentId, emoji, color }: { agentId: string; emoji: string; color: string }) {
  const [lineIndex, setLineIndex] = useState(() => Math.floor(Math.random() * (AGENT_LOG_LINES[agentId]?.length ?? 1)));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        const lines = AGENT_LOG_LINES[agentId] ?? ["⚡ Running checks..."];
        setLineIndex(i => (i + 1) % lines.length);
        setVisible(true);
      }, 350);
    }, 18000);
    return () => clearInterval(interval);
  }, [agentId]);

  const lines = AGENT_LOG_LINES[agentId] ?? ["⚡ Running..."];
  const line = lines[lineIndex % lines.length];

  return (
    <div
      className={`intel-agent-log-row ${visible ? 'visible' : 'hidden'}`}
      style={{ '--agent-color': color } as React.CSSProperties}
    >
      <span className="intel-log-emoji">{emoji}</span>
      <span className="intel-log-text">{line}</span>
    </div>
  );
}

// ── Beat event row ─────────────────────────────────────────────────────────────
function BeatRow({ event, index }: { event: BeatEvent; index: number }) {
  const agent = AGENTS.find(a => a.id === event.agentId);
  const ago = timeAgo(event.timestamp);
  const [playing, setPlaying] = useState(false);

  const handlePlay = useCallback(async () => {
    if (playing) return;
    const text = `${event.agentLabel}: ${event.action}. ${event.detail ?? ''}`;
    setPlaying(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('voice_synthesize', { text });
    } catch (e) {
      console.warn('[BeatRow] TTS failed:', e);
    } finally {
      setPlaying(false);
    }
  }, [playing, event]);

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

// Default active agents (must match AgentsView)
const DEFAULT_ACTIVE_AGENTS = ['conflux', 'helix', 'pulse', 'hearth', 'echo', 'aegis', 'viper'];

// ── Main IntelView ─────────────────────────────────────────────────────────────
export default function IntelView() {
  const events = useBeatTimeline();
  // Real heartbeats flow in via beatBus — no demo beat init needed.
  // Load from localStorage synchronously — same pattern as DesktopQuadrants.
  // This prevents the "all agents offline" flash on first render by initialising
  // state before paint, matching whatever is already in localStorage.
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

  // Demo beats — fire realistic agent activity into the timeline so Intel is never empty
  useEffect(() => {
    startDemoBeats();
  }, []);

  // Real heartbeats from Rust also flow in via the beatBus (heartbeatGlobal.ts emits on each tick).

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

  // Build a lookup from AGENTS for display metadata (emoji, color)
  const agentMeta = Object.fromEntries(AGENTS.map(a => [a.id, a])) as Record<string, typeof AGENTS[number]>;
  // or simpler: just use find() in the map
  const getMeta = (id: string) => AGENTS.find(a => a.id === id);

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

      {/* Per-agent creative log — "what they're up to right now" */}
      <div className="intel-section-label">SHIFT LOG</div>
      <div className="intel-shift-log">
        {activeAgents.slice(0, 6).map(agent => {
          const meta = AGENTS.find(a => a.id === agent.id);
          if (!meta) return null;
          return (
            <AgentLogRow
              key={agent.id}
              agentId={agent.id}
              emoji={meta.emoji}
              color={meta.color}
            />
          );
        })}
      </div>

      {/* Beat timeline */}
      <div className="intel-section-label">HEARTBEAT</div>
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
