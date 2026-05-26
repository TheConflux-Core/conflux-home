import { View } from '../types';

interface DockProps {
  currentView: View;
  pinnedApps: View[];
  onNavigate: (view: View) => void;
  onOpenStartMenu: () => void;
}

const APP_ICONS: Record<View, { icon: string; label: string }> = {
  dashboard: { icon: '🏠', label: 'Home' },
  chat: { icon: '💬', label: 'Chat' },
  google: { icon: '🔍', label: 'Google' },
  family: { icon: '🧩', label: 'Family' },
  hearth: { icon: '🍳', label: 'Hearth' },
  pulse: { icon: '💰', label: 'Pulse' },
  orbit: { icon: '🧠', label: 'Orbit' },
  foundation: { icon: '🔧', label: 'Foundation' },
  horizon: { icon: '🎯', label: 'Horizon' },
  story: { icon: '📖', label: 'Story' },
  marketplace: { icon: '🛒', label: 'Marketplace' },
  mirror: { icon: '🪞', label: 'Mirror' },
  vault: { icon: '🔐', label: 'Vault' },
  studio: { icon: '✨', label: 'Studio' },
  'api-dashboard': { icon: '📊', label: 'API Dashboard' },
  security: { icon: '🛡️', label: 'Security' },
  'security-hub': { icon: '🛡️', label: 'Security' },
  aegis: { icon: '🛡️', label: 'Aegis' },
  viper: { icon: '🐍', label: 'Viper' },
  'agent-audit': { icon: '⚔️', label: 'Audit' },
  siem: { icon: '🛡️', label: 'SIEM' },
  settings: { icon: '⚙️', label: 'Settings' },
  onboarding: { icon: '👋', label: 'Onboarding' },
  bazaar: { icon: '🛒', label: 'Marketplace' },
  // dupe removed
  agents: { icon: '🧩', label: 'Agents' },
  echo: { icon: '🪞', label: 'Echo' },
  api: { icon: '📊', label: 'API' },
  // Coming soon
  current: { icon: '📰', label: 'Current' },
  radar: { icon: '📡', label: 'Radar' },
  games: { icon: '🎮', label: 'Games' },
};

const DEFAULT_PINNED: View[] = ['chat', 'family', 'hearth', 'pulse', 'settings'];

export default function Dock({ currentView, pinnedApps, onNavigate, onOpenStartMenu }: DockProps) {
  const pins = pinnedApps.length > 0 ? pinnedApps : DEFAULT_PINNED;

  return (
    <div className="dock">
      <button
        className="dock-start-btn"
        onClick={onOpenStartMenu}
        title="Start Menu"
      >
        🏠
      </button>

      <div className="dock-divider" />

      <div className="dock-items">
        {pins.map(view => {
          const app = APP_ICONS[view];
          if (!app) return null;
          const isActive = currentView === view;
          return (
            <button
              key={view}
              className={`dock-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(view)}
              title={app.label}
            >
              <span className="dock-item-icon">{app.icon}</span>
              <span className="dock-item-label">{app.label}</span>
            </button>
          );
        })}
      </div>

      <div className="dock-divider" />

      <button
        className="dock-item"
        onClick={onOpenStartMenu}
        title="More apps"
      >
        <span className="dock-item-icon">⋯</span>
        <span className="dock-item-label">More</span>
      </button>
    </div>
  );
}
