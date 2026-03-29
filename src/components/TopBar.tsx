import { useState, useEffect } from 'react';
import { Agent } from '../types';
import { Theme, getEffectiveTheme, applyTheme, saveTheme } from '../lib/theme';
import ConnectivityWidget from './ConnectivityWidget';
import { VoiceOverlay } from './voice';
import { useCredits } from '../hooks/useCredits';

interface TopBarProps {
  selectedAgent: Agent | null;
  engineConnected: boolean;
  controlRoom?: boolean;
  onNavigate?: (view: string) => void;
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

export default function TopBar({ selectedAgent, engineConnected, controlRoom, onNavigate }: TopBarProps) {
  const [clock, setClock] = useState('');
  const [themePref, setThemePref] = useState<Theme>(
    () => (localStorage.getItem('conflux-theme') as Theme) || 'system'
  );
  const [showConnectivity, setShowConnectivity] = useState(false);
  const [showVoiceOverlay, setShowVoiceOverlay] = useState(false);
  const { balance, loading: creditsLoading } = useCredits();

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
        <span className="topbar-title">Conflux Home <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 4 }}>v{import.meta.env.VITE_APP_VERSION || '?'}</span></span>
      </div>

      <div className="topbar-center">
        {selectedAgent ? `${selectedAgent.emoji} ${selectedAgent.name}` : 'Desktop'}
      </div>

      <div className="topbar-right">
        {!creditsLoading && balance && (
          <span style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            padding: '2px 8px',
            borderRadius: 6,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            whiteSpace: 'nowrap',
            marginRight: 4,
          }}>
            {balance.source === 'free'
              ? `⚡ ${balance.daily_remaining ?? 0}/${balance.daily_limit ?? 0} today`
              : `⚡ ${(balance.total_available ?? 0).toLocaleString()} credits`
            }
          </span>
        )}
        <span className="topbar-clock">{clock}</span>
        <button
          className="mic-button mic-button-topbar"
          onClick={() => setShowVoiceOverlay(true)}
          title="Voice input"
          style={{ width: 32, height: 32 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>
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
          onClick={() => onNavigate?.('settings')}
          title="Settings"
        >
          ⚙️
        </button>
        <button
          className={`topbar-control-room-btn${controlRoom ? ' active' : ''}`}
          onClick={() => {
            const event = new CustomEvent('conflux:toggle-control-room');
            window.dispatchEvent(event);
          }}
          title="Toggle Control Room (dev)"
        >
          🌐
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
      <VoiceOverlay
        active={showVoiceOverlay}
        onTranscription={(text) => {
          // Dispatch transcription event so other components can listen
          window.dispatchEvent(new CustomEvent('conflux:voice-transcription', { detail: text }));
        }}
        onDone={() => setShowVoiceOverlay(false)}
      />
    </div>
  );
}
