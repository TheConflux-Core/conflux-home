import { useState, useEffect, useRef } from 'react';
import { playHeartbeat } from '../lib/sound';
import { fetchAgentStatuses, AgentStatus } from '../hooks/useAgentStatus';
import '../styles-agent-boot-cards.css';

interface AgentBootCardsProps {
  userId: string;
  members?: any[];
  onComplete: () => void;
}

export default function AgentBootCards({ userId, members, onComplete }: AgentBootCardsProps) {
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([]);
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    // Play heartbeat sound on mount
    playHeartbeat();

    // Fetch agent statuses in parallel
    const member_id = members?.[0]?.id;
    fetchAgentStatuses(userId, member_id).then((statuses) => {
      setAgentStatuses(statuses);
    }).catch(() => {
      // Fallback to generic statuses if everything fails
      setAgentStatuses([
        { id: 'hearth', emoji: '🍳', name: 'Hearth', status: 'Hearth: Ready' },
        { id: 'pulse', emoji: '💰', name: 'Pulse', status: 'Pulse: Ready' },
        { id: 'orbit', emoji: '🪐', name: 'Orbit', status: 'Orbit: Ready' },
        { id: 'horizon', emoji: '🌅', name: 'Horizon', status: 'Horizon: Ready' },
      ]);
    });

    // After 2.5 seconds, start fade-out animation
    const fadeTimer = setTimeout(() => {
      setFading(true);
      // After fade completes, call onComplete
      setTimeout(() => {
        setVisible(false);
        onComplete();
      }, 500); // Match CSS transition duration
    }, 2500);

    return () => clearTimeout(fadeTimer);
  }, [userId, members, onComplete]);

  if (!visible) return null;

  return (
    <div className={`agent-boot-cards-overlay ${fading ? 'fading' : ''}`}>
      <div className="agent-boot-cards-container">
        {agentStatuses.map((agent, index) => (
          <div
            key={agent.id}
            className="agent-boot-card"
            style={{
              animationDelay: `${index * 150}ms`,
            }}
          >
            <div className="agent-boot-card-emoji">{agent.emoji}</div>
            <div className="agent-boot-card-content">
              <div className="agent-boot-card-name">{agent.name}</div>
              <div className="agent-boot-card-status">{agent.status}</div>
            </div>
          </div>
        ))}
        <div className="agent-boot-team-ready">
          Your team is ready.
        </div>
      </div>
    </div>
  );
}
