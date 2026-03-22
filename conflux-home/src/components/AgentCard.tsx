import { Agent } from '../types';

interface AgentCardProps {
  agent: Agent;
  onClick: () => void;
}

export default function AgentCard({ agent, onClick }: AgentCardProps) {
  return (
    <div className="agent-card" onClick={onClick}>
      <div className="agent-card-header">
        <div className="agent-emoji">{agent.emoji}</div>
        <div className="agent-info">
          <h3>{agent.name}</h3>
          <div className="role">{agent.role}</div>
        </div>
      </div>

      <div className="agent-status">
        <div className={`status-dot ${agent.status}`} />
        <span style={{
          color: agent.status === 'working' ? 'var(--accent-success)' :
                 agent.status === 'thinking' ? 'var(--accent-warning)' :
                 agent.status === 'error' ? 'var(--accent-error)' :
                 'var(--text-muted)',
          textTransform: 'capitalize',
        }}>
          {agent.status}
        </span>
      </div>

      {agent.currentTask && (
        <div className="agent-task">"{agent.currentTask}"</div>
      )}

      <div className="agent-meta">
        <span>{agent.model.split('/').pop()}</span>
        <span>{agent.memorySize} KB memory</span>
        <span>{agent.lastActive}</span>
      </div>
    </div>
  );
}
