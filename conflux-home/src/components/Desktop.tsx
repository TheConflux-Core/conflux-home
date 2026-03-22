import Avatar from './Avatar';
import { Agent } from '../types';

interface DesktopProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent | null) => void;
}

export default function Desktop({ agents, selectedAgent, onSelectAgent }: DesktopProps) {
  return (
    <div className="desktop-area">
      <div className="desktop-bg-pattern" />

      <div className="desktop-agents">
        {agents.map((agent) => {
          const isSelected = selectedAgent?.id === agent.id;
          const isActive = agent.status === 'working' || agent.status === 'thinking';

          return (
            <div
              key={agent.id}
              className={`agent-presence ${isSelected ? 'selected' : ''} ${isActive ? 'breathing' : ''}`}
              onClick={() => onSelectAgent(isSelected ? null : agent)}
            >
              <Avatar
                agentId={agent.id}
                name={agent.name}
                emoji={agent.emoji}
                status={agent.status}
                size="lg"
                showStatus={true}
              />
              <div className="agent-presence-name">{agent.name}</div>
              <div className="agent-presence-role">{agent.role}</div>
              <div className="agent-presence-status">
                <div className={`status-indicator ${agent.status}`} />
                <span>{agent.status}</span>
              </div>
              {agent.currentTask && (
                <div className="agent-presence-task">{agent.currentTask}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
