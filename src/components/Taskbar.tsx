import { View } from '../types';

interface TaskbarProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

const ITEMS: { view: View; icon: string; label: string }[] = [
  { view: 'dashboard', icon: '🏠', label: 'Dash' },
  { view: 'chat', icon: '💬', label: 'Chat' },
  { view: 'orbit', icon: '🧠', label: 'Orbit' },
  { view: 'foundation', icon: '🔧', label: 'Foundation' },
  { view: 'horizon', icon: '🎯', label: 'Horizon' },
  { view: 'family', icon: '🧩', label: 'Family' },
  { view: 'story', icon: '📖', label: 'Story' },
  { view: 'hearth', icon: '🍳', label: 'Hearth' },
  { view: 'pulse', icon: '💰', label: 'Pulse' },
  { view: 'current', icon: '📰', label: 'Current' },
  { view: 'marketplace', icon: '🛒', label: 'Bazaar' },
  { view: 'settings', icon: '⚙️', label: 'Settings' },
];

export default function Taskbar({ currentView, onNavigate }: TaskbarProps) {
  return (
    <div className="taskbar">
      {ITEMS.map((item) => (
        <button
          key={item.view}
          className={`taskbar-item ${currentView === item.view ? 'active' : ''}`}
          onClick={() => onNavigate(item.view)}
          title={item.label}
        >
          <span className="taskbar-icon">{item.icon}</span>
          <span className="taskbar-label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
