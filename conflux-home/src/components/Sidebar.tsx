import { View } from '../types';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  agentCount: number;
  activeCount: number;
}

const NAV_ITEMS: { view: View; emoji: string; label: string }[] = [
  { view: 'dashboard', emoji: '🏠', label: 'Home' },
  { view: 'chat', emoji: '💬', label: 'Chat' },
  { view: 'marketplace', emoji: '🛒', label: 'Marketplace' },
  { view: 'settings', emoji: '⚙️', label: 'Settings' },
];

export default function Sidebar({ currentView, onNavigate, agentCount, activeCount }: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h1>⚡ Conflux Home</h1>
        <p>Your AI Family</p>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.view}
            className={`nav-item ${currentView === item.view ? 'active' : ''}`}
            onClick={() => onNavigate(item.view)}
          >
            <span className="emoji">{item.emoji}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--border)',
        fontSize: 12,
        color: 'var(--text-muted)',
      }}>
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: 'var(--accent-success)' }}>●</span>{' '}
          {activeCount} of {agentCount} agents online
        </div>
        <div>Memory: 4.3 MB used</div>
      </div>
    </div>
  );
}
