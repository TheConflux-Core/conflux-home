import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAgentStatus } from '../hooks/useAgentStatus';

interface AgentStatusGridProps {
  onComplete?: () => void;
}

export default function AgentStatusGrid({ onComplete }: AgentStatusGridProps) {
  const { user } = useAuth();
  const { statusList, loading } = useAgentStatus(user?.id ?? '', null);

  // Transform AgentStatusInfo to AgentStatus format
  const agentStatuses = statusList.map((status) => ({
    id: status.agentId,
    emoji: status.emoji,
    name: status.name,
    status: status.statusText,
  }));

  if (loading || !user) {
    return (
      <div className="agent-status-grid loading">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="agent-status-card" style={{ opacity: 0.3 }}>
            <div className="agent-status-emoji">⏳</div>
            <div className="agent-status-name">Loading...</div>
            <div className="agent-status-text">---</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="agent-status-grid">
      {agentStatuses.map((agent) => (
        <div key={agent.id} className="agent-status-card">
          <div className="agent-status-emoji">{agent.emoji}</div>
          <div className="agent-status-name">{agent.name}</div>
          <div className="agent-status-text">{agent.status}</div>
        </div>
      ))}
    </div>
  );
}
