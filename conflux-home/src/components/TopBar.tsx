import { useState, useEffect } from 'react';
import { Agent } from '../types';

interface TopBarProps {
  selectedAgent: Agent | null;
  gatewayConnected: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
}

export default function TopBar({ selectedAgent, gatewayConnected, isDark, onToggleTheme }: TopBarProps) {
  const [clock, setClock] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="topbar">
      <div className="topbar-left">
        <span className="topbar-logo">⚡</span>
        <span className="topbar-title">Conflux Home</span>
      </div>

      <div className="topbar-center">
        {selectedAgent ? `${selectedAgent.emoji} ${selectedAgent.name}` : 'Desktop'}
      </div>

      <div className="topbar-right">
        <span className="topbar-clock">{clock}</span>
        <div className="topbar-status">
          <div className={`topbar-status-dot ${gatewayConnected ? '' : 'disconnected'}`} />
        </div>
        <button
          className="topbar-theme-btn"
          onClick={onToggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
        <button
          className="topbar-settings-btn"
          onClick={() => {
            // Settings handled by parent view state
            const event = new CustomEvent('conflux:navigate', { detail: 'settings' });
            window.dispatchEvent(event);
          }}
          title="Settings"
        >
          ⚙️
        </button>
      </div>
    </div>
  );
}
