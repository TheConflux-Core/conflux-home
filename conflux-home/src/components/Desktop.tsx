import { useEffect, useState } from 'react';
import Avatar from './Avatar';
import { Agent, AGENT_COLORS } from '../types';

interface DesktopProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent | null) => void;
  wallpaper?: string;
}

function getTimeAgo(dateStr?: string): string {
  if (!dateStr) return 'Never';
  if (dateStr === 'Just now') return 'Just now';
  return dateStr;
}

function MemoryBar({ used, max = 2000 }: { used?: number; max?: number }) {
  if (!used) return null;
  const pct = Math.min((used / max) * 100, 100);
  const color = pct > 80 ? 'var(--accent-error)' : pct > 50 ? 'var(--accent-warning)' : 'var(--accent-success)';
  return (
    <div className="memory-bar-container" title={`${used} KB memory used`}>
      <div className="memory-bar-track">
        <div className="memory-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="memory-bar-label">{used}KB</span>
    </div>
  );
}

function StatusText({ agent }: { agent: Agent }) {
  if (agent.status === 'working' && agent.currentTask) {
    return <div className="agent-status-text working">Working on: {agent.currentTask}</div>;
  }
  if (agent.status === 'thinking' && agent.currentTask) {
    return <div className="agent-status-text thinking">Thinking about: {agent.currentTask}</div>;
  }
  if (agent.status === 'error') {
    return <div className="agent-status-text error">Needs attention</div>;
  }
  if (agent.status === 'offline') {
    return <div className="agent-status-text offline">Offline</div>;
  }
  return <div className="agent-status-text idle">Idle</div>;
}

export default function Desktop({ agents, selectedAgent, onSelectAgent, wallpaper }: DesktopProps) {
  const [, setTick] = useState(0);

  // Auto-update "last active" timestamps every 30s
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="desktop-area"
      style={wallpaper ? {
        backgroundImage: `url('${wallpaper}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : undefined}
    >
      <div className="desktop-bg-pattern" />

      <div className="desktop-agents">
        {agents.map((agent) => {
          const isSelected = selectedAgent?.id === agent.id;
          const isActive = agent.status === 'working' || agent.status === 'thinking';
          const accentColor = AGENT_COLORS[agent.id] ?? '#8888aa';

          return (
            <div
              key={agent.id}
              className={`agent-presence-card ${isSelected ? 'selected' : ''} ${isActive ? 'breathing' : ''}`}
              style={{
                '--agent-accent': accentColor,
                background: `color-mix(in srgb, ${accentColor} 5%, var(--bg-card))`,
              } as React.CSSProperties}
              onClick={() => onSelectAgent(isSelected ? null : agent)}
            >
              <div className="agent-avatar-wrap">
                <Avatar
                  agentId={agent.id}
                  name={agent.name}
                  emoji={agent.emoji}
                  status={agent.status}
                  size="lg"
                  showStatus={true}
                />
              </div>

              <div className="agent-info">
                <div className="agent-presence-name">{agent.name}</div>
                <div className="agent-presence-role">{agent.role}</div>
              </div>

              <StatusText agent={agent} />

              <MemoryBar used={agent.memorySize} />

              <div className="agent-last-active">
                <span className="last-active-dot" style={{ background: agent.status === 'offline' ? 'var(--text-muted)' : 'var(--accent-success)' }} />
                {getTimeAgo(agent.lastActive)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
