import { useState, useEffect, useRef } from 'react';
import { Agent } from '../types';
import { Theme, getEffectiveTheme, applyTheme, saveTheme, BASE_THEMES, COLOR_THEMES, getSavedColorTheme, saveColorTheme } from '../lib/theme';
import ConnectivityWidget from './ConnectivityWidget';
import { useCredits } from '../hooks/useCredits';

interface TopBarProps {
  selectedAgent: Agent | null;
  engineConnected: boolean;
  controlRoom?: boolean;
  currentView?: string;
  onNavigate?: (view: string) => void;
}

export default function TopBar({ selectedAgent, engineConnected, controlRoom, currentView, onNavigate }: TopBarProps) {
  const [clock, setClock] = useState('');
  const [themePref, setThemePref] = useState<Theme>(
    () => (localStorage.getItem('conflux-theme') as Theme) || 'system'
  );
  const [colorTheme, setColorTheme] = useState(() => getSavedColorTheme());
  const [showThemes, setShowThemes] = useState(false);
  const [showConnectivity, setShowConnectivity] = useState(false);
  const [notifUnread, setNotifUnread] = useState(() => {
    const stored = localStorage.getItem('conflux-notif-unread');
    return stored ? Math.min(parseInt(stored, 10), 99) : 0;
  });
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [recentNotifs, setRecentNotifs] = useState<{title: string; body: string}[]>([]);
  const { balance, loading: creditsLoading } = useCredits();
  const themeRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Persist unread count to localStorage
  useEffect(() => {
    localStorage.setItem('conflux-notif-unread', String(notifUnread));
  }, [notifUnread]);

  // Track unread desktop notifications
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{title: string; body: string}>;
      const notif = { title: ce.detail?.title ?? '', body: ce.detail?.body ?? '' };
      setNotifUnread(n => Math.min(n + 1, 99));
      setRecentNotifs(prev => {
        const next = [notif, ...prev].slice(0, 5);
        localStorage.setItem('conflux-recent-notifs', JSON.stringify(next));
        return next;
      });
    };
    window.addEventListener('conflux:agent-notification', handler as EventListener);
    return () => window.removeEventListener('conflux:agent-notification', handler as EventListener);
  }, []);

  // Load persisted recent notifications
  useEffect(() => {
    const stored = localStorage.getItem('conflux-recent-notifs');
    if (stored) {
      try { setRecentNotifs(JSON.parse(stored)); } catch {}
    }
  }, []);

  // Close notification menu on outside click
  useEffect(() => {
    if (!showNotifMenu) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler); };
  }, [showNotifMenu]);

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

  // Close theme picker on click outside
  useEffect(() => {
    if (!showThemes) return;
    const handler = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setShowThemes(false);
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler); };
  }, [showThemes]);

  // Close connectivity popup on click outside
  useEffect(() => {
    if (!showConnectivity) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.topbar-connectivity-popup') && !target.closest('.topbar-google-btn') && !target.closest('.topbar-status')) {
        setShowConnectivity(false);
      }
    };
    const timer = setTimeout(() => document.addEventListener('click', handler), 100);
    return () => { clearTimeout(timer); document.removeEventListener('click', handler); };
  }, [showConnectivity]);

  const handleSelectColorTheme = (themeId: string) => {
    setColorTheme(themeId);
    saveColorTheme(themeId);
    setShowThemes(false);
  };

  const currentThemeDef = BASE_THEMES.find(t => t.id === colorTheme) ?? COLOR_THEMES.find(t => t.id === colorTheme);

  return (
    <div className="topbar">
      <div className="topbar-left">
        <span className="topbar-logo">⚡</span>
        <span className="topbar-title">
          Conflux Home{' '}
          <span
            style={{ fontSize: 10, opacity: 0.5, marginLeft: 4, cursor: 'default', userSelect: 'none' }}
            onClick={() => {
              const event = new CustomEvent('conflux:toggle-control-room');
              window.dispatchEvent(event);
            }}
            title=""
          >
            v{import.meta.env.VITE_APP_VERSION || '?'}
          </span>
        </span>
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
          className="topbar-google-btn"
          onClick={() => setShowConnectivity(!showConnectivity)}
          title="Google & Connectivity"
          style={{ background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', padding: '4px 6px', opacity: 0.6 }}
        >
          🔗
        </button>

        {/* Theme Picker Dropdown */}
        <div className="topbar-theme-picker" ref={themeRef} style={{ position: 'relative' }}>
          <button
            className="topbar-theme-btn"
            onClick={() => setShowThemes(!showThemes)}
            title="Change theme"
          >
            {currentThemeDef?.emoji ?? '◈'}
          </button>

          {showThemes && (
            <div className="theme-dropdown" style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 8,
              zIndex: 200,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 6,
              minWidth: 200,
              boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(20px)',
            }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                padding: '8px 12px 6px',
              }}>
                Base
              </div>
              {BASE_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleSelectColorTheme(theme.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: colorTheme === theme.id ? 700 : 400,
                    color: colorTheme === theme.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: colorTheme === theme.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                    transition: 'background 0.15s ease, color 0.15s ease',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (colorTheme !== theme.id) (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    if (colorTheme !== theme.id) (e.target as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <span style={{ fontSize: 16 }}>{theme.emoji}</span>
                  <span>{theme.name}</span>
                  {colorTheme === theme.id && (
                    <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.6 }}>✓</span>
                  )}
                </button>
              ))}
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 8px' }} />
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                padding: '8px 12px 6px',
              }}>
                App Themes
              </div>
              {COLOR_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleSelectColorTheme(theme.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: colorTheme === theme.id ? 700 : 400,
                    color: colorTheme === theme.id ? 'var(--theme-accent, var(--text-primary))' : 'var(--text-secondary)',
                    background: colorTheme === theme.id ? 'var(--theme-accent-glow, rgba(255,255,255,0.05))' : 'transparent',
                    transition: 'background 0.15s ease, color 0.15s ease',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (colorTheme !== theme.id) (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    if (colorTheme !== theme.id) (e.target as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <span style={{ fontSize: 16 }}>{theme.emoji}</span>
                  <span>{theme.name}</span>
                  {colorTheme === theme.id && (
                    <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.6 }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className="topbar-settings-btn"
          onClick={() => {
            if (currentView === 'settings') {
              onNavigate?.('dashboard');
            } else {
              onNavigate?.('settings');
            }
          }}
          title={currentView === 'settings' ? 'Close Settings' : 'Settings'}
        >
          ⚙️
        </button>

        {/* Notification Bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className="topbar-notif-btn"
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            title="Notifications"
            style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', padding: '4px 6px', position: 'relative', lineHeight: 1 }}
          >
            🔔
            {notifUnread > 0 && (
              <span style={{
                position: 'absolute',
                top: -2,
                right: -4,
                minWidth: 14,
                height: 14,
                padding: '0 3px',
                borderRadius: 999,
                fontSize: 8,
                fontWeight: 700,
                color: '#fff',
                background: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                border: '2px solid var(--bg-primary, #080812)',
              }}>
                {notifUnread > 99 ? '99+' : notifUnread}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 8,
              marginRight: -4,
              zIndex: 200,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 8,
              minWidth: 300,
              maxWidth: 340,
              boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(20px)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px 10px',
                borderBottom: '1px solid var(--border)',
                marginBottom: 6,
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => { setNotifUnread(0); setRecentNotifs([]); localStorage.removeItem('conflux-notif-unread'); localStorage.removeItem('conflux-recent-notifs'); }}
                    style={{ fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 4 }}
                  >
                    Clear all
                  </button>
                  <button
                    onClick={() => { setShowNotifMenu(false); onNavigate?.('settings'); }}
                    style={{ fontSize: 10, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 4 }}
                  >
                    Settings →
                  </button>
                </div>
              </div>

              {recentNotifs.length === 0 ? (
                <div style={{ padding: '16px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                  No recent notifications
                </div>
              ) : (
                recentNotifs.map((n, i) => (
                  <div key={i} style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    marginBottom: 2,
                    background: i === 0 ? 'rgba(255,255,255,0.04)' : 'transparent',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{n.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.body}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <span className="topbar-clock">{clock}</span>
      </div>
    </div>
  );
}
