import { useState, useEffect } from 'react';
import { Agent } from '../types';
import { Theme, getEffectiveTheme, applyTheme, saveTheme } from '../lib/theme';

interface TopBarProps {
  selectedAgent: Agent | null;
  gatewayConnected: boolean;
}

function getThemeIcon(preference: Theme): string {
  switch (preference) {
    case 'light': return '☀️';
    case 'dark': return '🌙';
    case 'system': return '💻';
  }
}

function getThemeLabel(preference: Theme): string {
  switch (preference) {
    case 'light': return 'Light';
    case 'dark': return 'Dark';
    case 'system': return 'System';
  }
}

function cycleTheme(current: Theme): Theme {
  if (current === 'light') return 'dark';
  if (current === 'dark') return 'system';
  return 'light';
}

export default function TopBar({ selectedAgent, gatewayConnected }: TopBarProps) {
  const [clock, setClock] = useState('');
  const [themePref, setThemePref] = useState<Theme>(
    () => (localStorage.getItem('conflux-theme') as Theme) || 'system'
  );

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

  // Listen for system theme changes when preference is 'system'
  useEffect(() => {
    if (themePref !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      applyTheme(e.matches ? 'dark' : 'light');
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [themePref]);

  const handleToggleTheme = () => {
    const next = cycleTheme(themePref);
    setThemePref(next);
    saveTheme(next);
    const effective = getEffectiveTheme(next);
    applyTheme(effective);
    // Dispatch event so App.tsx stays in sync
    window.dispatchEvent(new CustomEvent('conflux:theme-change', { detail: next }));
  };

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
          onClick={handleToggleTheme}
          title={`Theme: ${getThemeLabel(themePref)} (click to cycle)`}
        >
          {getThemeIcon(themePref)}
        </button>
        <button
          className="topbar-settings-btn"
          onClick={() => {
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
