import { useMemo } from 'react';
import type { Agent } from '../types';

interface ControlRoomProps {
  agents: Agent[];
  onNavigate: (appId: string) => void;
  onOpenChat: (agentId: string) => void;
}

const AGENT_COLORS: Record<string, string> = {
  conflux: '#e2e8f0',
  helix: '#8b5cf6',
  forge: '#f97316',
  prism: '#3b82f6',
  spectra: '#ec4899',
  luma: '#eab308',
  pulse: '#10b981',
  hearth: '#f59e0b',
  orbit: '#8b5cf6',
  horizon: '#3b82f6',
  current: '#f1f5f9',
  story: '#991b1b',
  mirror: '#14b8a6',
  foundation: '#6b7280',
  catalyst: '#a855f7',
  vector: '#ef4444',
  zigbot: '#22d3ee',
  quanta: '#22c55e',
};

const DEFAULT_COLOR = '#60a5fa';

const AGENT_APP_MAP: Record<string, string> = {
  pulse: 'budget',
  hearth: 'kitchen',
  orbit: 'life',
  horizon: 'dreams',
  current: 'feed',
  story: 'games',
  mirror: 'diary',
  foundation: 'home',
};

const ORB_POSITIONS: Record<string, { x: number; y: number }> = {
  conflux:  { x: 50, y: 45 },
  helix:    { x: 25, y: 30 },
  forge:    { x: 75, y: 30 },
  prism:    { x: 35, y: 60 },
  spectra:  { x: 65, y: 60 },
  luma:     { x: 20, y: 55 },
  pulse:    { x: 80, y: 50 },
  hearth:   { x: 30, y: 20 },
  orbit:    { x: 70, y: 75 },
  horizon:  { x: 15, y: 75 },
  current:  { x: 85, y: 20 },
  catalyst: { x: 50, y: 75 },
  vector:   { x: 50, y: 15 },
  zigbot:   { x: 50, y: 30 },
  quanta:   { x: 40, y: 45 },
};

function getOrbPosition(agent: Agent): { x: number; y: number } {
  if (ORB_POSITIONS[agent.id]) return ORB_POSITIONS[agent.id];
  let hash = 0;
  for (const ch of agent.id) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  return {
    x: 15 + (Math.abs(hash) % 70),
    y: 15 + (Math.abs(hash >> 8) % 70),
  };
}

function getOrbSize(agent: Agent): string {
  if (agent.id === 'conflux' || agent.id === 'vector') return 'orb-hub';
  if (agent.status === 'working') return 'orb-large';
  if (agent.status === 'thinking') return 'orb-medium';
  return 'orb-small';
}

export default function ControlRoom({ agents, onNavigate, onOpenChat }: ControlRoomProps) {
  const connections = useMemo(() => {
    const conns: [Agent, Agent][] = [];
    const hub = agents.find(a => a.id === 'conflux');
    if (!hub) return conns;

    for (const agent of agents) {
      if (agent.id !== 'conflux' && agent.status !== 'offline') {
        conns.push([hub, agent]);
      }
    }

    const workAgents = agents.filter(a =>
      ['helix', 'forge', 'prism', 'spectra', 'luma', 'quanta'].includes(a.id)
    );
    for (let i = 0; i < workAgents.length - 1; i++) {
      conns.push([workAgents[i], workAgents[i + 1]]);
    }

    return conns;
  }, [agents]);

  function handleOrbClick(agent: Agent) {
    const appId = AGENT_APP_MAP[agent.id];
    if (appId) {
      onNavigate(appId);
    } else {
      onOpenChat(agent.id);
    }
  }

  return (
    <div className="neural-mesh mesh-breathe">
      <svg className="mesh-connections" viewBox="0 0 100 100" preserveAspectRatio="none">
        {connections.map(([from, to], i) => (
          <line
            key={i}
            className={`mesh-connection ${
              from.status === 'working' || to.status === 'working' ? 'active' : ''
            }`}
            x1={`${getOrbPosition(from).x}%`}
            y1={`${getOrbPosition(from).y}%`}
            x2={`${getOrbPosition(to).x}%`}
            y2={`${getOrbPosition(to).y}%`}
          />
        ))}
      </svg>

      {agents.filter(a => a.status !== 'offline').map((agent, index) => {
        const pos = getOrbPosition(agent);
        const color = AGENT_COLORS[agent.id] || DEFAULT_COLOR;
        const sizeClass = getOrbSize(agent);
        const driftClass = `orb-drift-${(index % 4) + 1}`;

        return (
          <div
            key={agent.id}
            className={`agent-orb ${sizeClass} orb-${agent.status} ${driftClass}`}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            onClick={() => handleOrbClick(agent)}
          >
            <div
              className="orb-glow"
              style={{ background: `radial-gradient(circle, ${color}40, transparent 70%)` }}
            />
            <div className="orb-ring" style={{ borderColor: color }} />
            <div
              className="orb-core"
              style={{
                background: `radial-gradient(circle at 40% 35%, ${color}30, ${color}10)`,
                boxShadow: `0 0 20px ${color}20, inset 0 0 15px ${color}10`,
              }}
            >
              {agent.emoji}
            </div>
            <div className={`orb-status-dot status-${agent.status}`} />
            <div className="orb-label">{agent.name}</div>
          </div>
        );
      })}
    </div>
  );
}
