import { Agent } from '../types';
import AgentCard from './AgentCard';

interface DashboardProps {
  agents: Agent[];
  onSelectAgent: (agent: Agent) => void;
}

export default function Dashboard({ agents, onSelectAgent }: DashboardProps) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
          Your AI Family
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {agents.filter(a => a.status === 'working' || a.status === 'thinking').length} agents working
          right now. Click any agent to chat.
        </p>
      </div>

      <div className="dashboard-grid">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onClick={() => onSelectAgent(agent)}
          />
        ))}
      </div>

      {/* Quick Stats */}
      <div style={{
        marginTop: 32,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
      }}>
        {[
          { label: 'Missions Completed', value: '14', emoji: '🎯' },
          { label: 'Products Built', value: '13', emoji: '📦' },
          { label: 'Research Reports', value: '6', emoji: '📊' },
          { label: 'Hours Saved', value: '247', emoji: '⏰' },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: 20,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{stat.emoji}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent-primary)' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
