import { useState, useEffect } from 'react';
import { Agent } from '../types';
import { Theme, getEffectiveTheme, applyTheme, saveTheme } from '../lib/theme';
import ConnectivityWidget from './ConnectivityWidget';

interface TopBarProps {
  selectedAgent: Agent | null;
  engineConnected: boolean;
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

export default function TopBar({ selectedAgent, engineConnected }: TopBarProps) {
  const [clock, setClock] = useState('');
  const [themePref, setThemePref] = useState<Theme>(
    () => (localStorage.getItem('conflux-theme') as Theme) || 'system'
  );
  const [showConnectivity, setShowConnectivity] = useState(false);

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

  // Close connectivity popup on click outside
  useEffect(() => {
    if (!showConnectivity) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.topbar-connectivity-popup') && !target.closest('.topbar-google-btn') && !target.closest('.topbar-status')) {
        setShowConnectivity(false);
      }
    };
    // Delay to avoid immediate close on the click that opens it
    const timer = setTimeout(() => document.addEventListener('click', handler), 100);
    return () => { clearTimeout(timer); document.removeEventListener('click', handler); };
  }, [showConnectivity]);

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
        <div className="topbar-status" onClick={() => setShowConnectivity(!showConnectivity)} style={{ cursor: 'pointer' }}>
          <div className={`topbar-status-dot ${engineConnected ? '' : 'disconnected'}`} />
        </div>
        {showConnectivity && (
          <div className="topbar-connectivity-popup" style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 100,
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
            padding: 16, minWidth: 280, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <ConnectivityWidget />
          </div>
        )}
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
        <button
          className="topbar-google-btn"
          onClick={() => setShowConnectivity(!showConnectivity)}
          title="Google & Connectivity"
          style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: '4px 8px' }}
        >
          🔗
        </button>
      </div>
    </div>
  );
}
