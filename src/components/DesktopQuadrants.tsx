import { useState } from 'react';
import { View, Agent } from '../types';

// ── App definitions ──

interface AppDef {
  id: View;
  icon: string;
  label: string;
  preview: string;
}

interface CategoryDef {
  id: string;
  icon: string;
  label: string;
  color: string;
  desc: string;
  apps: AppDef[];
}

const CATEGORIES: CategoryDef[] = [
  {
    id: 'my-apps',
    icon: '📱',
    label: 'My Apps',
    color: '#10b981',
    desc: '6 daily apps',
    apps: [
      { id: 'kitchen', icon: '🍳', label: 'Kitchen', preview: 'Meal planning & recipes' },
      { id: 'budget', icon: '💰', label: 'Budget', preview: 'Track spending & goals' },
      { id: 'life', icon: '🧠', label: 'Life Autopilot', preview: 'Tasks, habits & reminders' },
      { id: 'dreams', icon: '🎯', label: 'Dreams', preview: 'Goal tracking & milestones' },
      { id: 'feed', icon: '📰', label: 'Feed', preview: 'News & intelligence' },
      { id: 'games', icon: '🎮', label: 'Games', preview: 'Play & learn' },
    ],
  },
  {
    id: 'discover',
    icon: '🔭',
    label: 'Discover',
    color: '#f59e0b',
    desc: 'Browse & install',
    apps: [
      { id: 'marketplace', icon: '🛒', label: 'Marketplace', preview: 'Browse & install agents' },
      { id: 'agents', icon: '🧩', label: 'Agents', preview: 'Manage your AI team' },
    ],
  },
  {
    id: 'creator',
    icon: '🏗️',
    label: 'Creator',
    color: '#8b5cf6',
    desc: 'Build & create',
    apps: [
      { id: 'studio', icon: '🎨', label: 'Studio', preview: 'AI creative generation' },
      { id: 'vault', icon: '📦', label: 'Vault', preview: 'Files & projects' },
      { id: 'echo', icon: '📝', label: 'Echo', preview: 'Journal & reflection' },
    ],
  },
];

// ── Status helpers ──

const STATUS_COLORS: Record<string, string> = {
  working: '#22c55e',
  thinking: '#f59e0b',
  idle: '#6366f1',
  error: '#ef4444',
  offline: '#4b5563',
};

function getAgentProgress(agent: Agent): number {
  switch (agent.status) {
    case 'working': return 80;
    case 'thinking': return 50;
    case 'idle': return 20;
    case 'error': return 10;
    default: return 0;
  }
}

// ── Intel Dashboard ──

interface IntelDashboardProps {
  agents: Agent[];
}

// Ring gauge SVG component
function RingGauge({ value, max, color, label, sublabel }: { value: number; max: number; color: string; label: string; sublabel: string }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const offset = circumference * (1 - pct);

  return (
    <div className="intel-ring">
      <svg viewBox="0 0 72 72">
        <circle className="intel-ring-bg" cx="36" cy="36" r={radius} />
        <circle
          className="intel-ring-fill"
          cx="36" cy="36" r={radius}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ color }}
        />
      </svg>
      <div className="intel-ring-label">
        <span>{label}</span>
        <span className="intel-ring-sublabel">{sublabel}</span>
      </div>
    </div>
  );
}

function IntelDashboard({ agents }: IntelDashboardProps) {
  const activeAgents = agents.filter(a => a.status !== 'offline');
  const workingCount = agents.filter(a => a.status === 'working' || a.status === 'thinking').length;
  const onlinePct = agents.length > 0 ? Math.round((activeAgents.length / agents.length) * 100) : 0;

  return (
    <div className="intel-dashboard">
      <div className="intel-header">
        <span className="intel-title">🧠 INTEL</span>
        <span className="intel-live-indicator">
          <span className="intel-live-dot" />
          LIVE
        </span>
      </div>

      <div className="intel-body">
        {/* Ring Gauges — overview */}
        <div className="intel-section">
          <div className="intel-section-title">SYSTEM OVERVIEW</div>
          <div className="intel-rings">
            <RingGauge value={activeAgents.length} max={Math.max(agents.length, 1)} color="#6366f1" label={`${activeAgents.length}`} sublabel="online" />
            <RingGauge value={workingCount} max={Math.max(agents.length, 1)} color="#22c55e" label={`${workingCount}`} sublabel="working" />
            <RingGauge value={onlinePct} max={100} color="#f59e0b" label={`${onlinePct}%`} sublabel="health" />
          </div>
        </div>

        {/* Agents Section — cockpit bars */}
        <div className="intel-section">
          <div className="intel-section-title">AGENT STATUS</div>
          <div className="intel-section-content">
            {agents.map((agent) => {
              const color = STATUS_COLORS[agent.status] || '#4b5563';
              const progress = getAgentProgress(agent);
              const isOffline = agent.status === 'offline';
              return (
                <div
                  key={agent.id}
                  className="intel-agent-row"
                  style={isOffline ? { opacity: 0.3 } : undefined}
                >
                  <span className="intel-agent-dot" style={{ background: color }} />
                  <span className="intel-agent-name">{agent.emoji} {agent.name}</span>
                  <span className="intel-agent-status-text">{agent.status}</span>
                  <div className="intel-agent-bar">
                    <div
                      className="intel-agent-bar-fill"
                      style={{
                        width: `${progress}%`,
                        ['--bar-color' as string]: color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {agents.length === 0 && (
              <div className="intel-activity-item">No agents connected</div>
            )}
          </div>
        </div>

        {/* Metrics Section — card grid */}
        <div className="intel-section">
          <div className="intel-section-title">METRICS</div>
          <div className="intel-metrics-grid">
            <div className="intel-metric-card">
              <span className="intel-metric-icon">🔋</span>
              <span className="intel-metric-value">94%</span>
              <span className="intel-metric-label">System</span>
            </div>
            <div className="intel-metric-card">
              <span className="intel-metric-icon">📡</span>
              <span className="intel-metric-value">12h 34m</span>
              <span className="intel-metric-label">Uptime</span>
            </div>
            <div className="intel-metric-card">
              <span className="intel-metric-icon">🧠</span>
              <span className="intel-metric-value">2.1 GB</span>
              <span className="intel-metric-label">Memory</span>
            </div>
          </div>
        </div>

        {/* Activity Section */}
        <div className="intel-section">
          <div className="intel-section-title">ACTIVITY</div>
          <div className="intel-section-content">
            <div className="intel-activity-item">
              <span className="intel-activity-dot" />
              <span>Mission-1223: completed</span>
              <span className="intel-activity-time">2h</span>
            </div>
            <div className="intel-activity-item">
              <span className="intel-activity-dot" />
              <span>Budget updated</span>
              <span className="intel-activity-time">4h</span>
            </div>
            <div className="intel-activity-item">
              <span className="intel-activity-dot" />
              <span>New agent online</span>
              <span className="intel-activity-time">6h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Expanded Category View ──

interface ExpandedViewProps {
  category: CategoryDef;
  onBack: () => void;
  onNavigate: (view: View) => void;
}

function ExpandedView({ category, onBack, onNavigate }: ExpandedViewProps) {
  return (
    <div className="quadrant-expanded">
      <div className="quadrant-expanded-header">
        <button className="quadrant-back-btn" onClick={onBack}>
          ←
        </button>
        <span className="quadrant-expanded-title">
          {category.icon} {category.label}
        </span>
      </div>
      <div className="quadrant-expanded-grid">
        {category.apps.map((app) => (
          <div
            key={app.id}
            className="desktop-widget"
            onClick={() => onNavigate(app.id)}
            style={{ '--widget-color': category.color } as React.CSSProperties}
          >
            <div
              className="widget-accent"
              style={{
                background: `linear-gradient(90deg, ${category.color}, ${category.color}44)`,
              }}
            />
            <div className="widget-body">
              <span className="widget-icon">{app.icon}</span>
              <span className="widget-label">{app.label}</span>
              <span className="widget-preview">{app.preview}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ──

interface DesktopQuadrantsProps {
  onNavigate: (view: View) => void;
  agents: Agent[];
}

export default function DesktopQuadrants({ onNavigate, agents }: DesktopQuadrantsProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Expanded view
  if (expandedCategory) {
    const category = CATEGORIES.find((c) => c.id === expandedCategory);
    if (category) {
      return (
        <ExpandedView
          category={category}
          onBack={() => setExpandedCategory(null)}
          onNavigate={onNavigate}
        />
      );
    }
  }

  // Main view
  return (
    <div className="desktop-quadrants">
      {/* Left: Intel Dashboard */}
      <IntelDashboard agents={agents} />

      {/* Right: Category Cards */}
      <div className="desktop-quadrants-right">
        {CATEGORIES.map((cat) => (
          <div
            key={cat.id}
            className="category-card"
            onClick={() => setExpandedCategory(cat.id)}
            style={{ '--cat-color': cat.color } as React.CSSProperties}
          >
            <div
              className="category-card-accent"
              style={{ background: `linear-gradient(180deg, ${cat.color}, ${cat.color}44)` }}
            />
            <span className="category-card-icon">{cat.icon}</span>
            <div className="category-card-info">
              <div className="category-card-title">{cat.label}</div>
              <div className="category-card-desc">{cat.desc}</div>
              <div className="category-card-preview">
                {cat.apps.slice(0, 4).map((app) => (
                  <span key={app.id} className="category-card-preview-item">{app.icon} {app.label}</span>
                ))}
                {cat.apps.length > 4 && (
                  <span className="category-card-preview-item">+{cat.apps.length - 4} more</span>
                )}
              </div>
            </div>
            <span className="category-card-badge">{cat.apps.length}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
