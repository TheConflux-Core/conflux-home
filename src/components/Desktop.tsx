import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Avatar from './Avatar';
import DesktopWidgets from './DesktopWidgets';
import { Agent, AGENT_COLORS, View } from '../types';

interface DesktopProps {
  agents: Agent[];
  wallpaper?: string;
  onNavigate: (view: View) => void;
}

const STATUS_COLORS: Record<string, string> = {
  idle: '#555577',
  working: '#00ff88',
  thinking: '#ffaa00',
  error: '#ff4466',
  offline: '#555577',
};

export default function Desktop({ agents, wallpaper, onNavigate }: DesktopProps) {
  const [liveStats, setLiveStats] = useState({
    activeAgents: 0,
  });

  // Fetch live stats from engine
  useEffect(() => {
    async function fetchStats() {
      try {
        const engineAgents = await invoke<any[]>('engine_get_agents');
        const active = engineAgents.filter((a: any) => a.status !== 'offline').length;
        setLiveStats(prev => ({ ...prev, activeAgents: active }));
      } catch {
        // silently fail, show defaults
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeAgents = agents.filter(a => a.status !== 'offline');

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

      <DesktopWidgets onNavigate={onNavigate} />

      {/* Agent presence bar at the bottom */}
      {activeAgents.length > 0 && (
        <div className="agents-bottom-bar">
          {activeAgents.map((agent) => {
            const accentColor = AGENT_COLORS[agent.id] ?? '#8888aa';
            return (
              <div
                key={agent.id}
                className="agent-avatar-mini"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('conflux:open-chat', { detail: { agentId: agent.id } }));
                }}
                title={`${agent.name} — ${agent.status}`}
              >
                <Avatar
                  agentId={agent.id}
                  name={agent.name}
                  emoji={agent.emoji}
                  status={agent.status}
                  size="sm"
                  showStatus={true}
                />
                <span>{agent.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
