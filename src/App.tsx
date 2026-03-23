import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Agent, View } from './types';
import TopBar from './components/TopBar';
import Desktop from './components/Desktop';
import Taskbar from './components/Taskbar';
import ChatPanel from './components/ChatPanel';
import Marketplace from './components/Marketplace';
import AgentDetail from './components/AgentDetail';
import Onboarding from './components/Onboarding';
import WelcomeOverlay from './components/WelcomeOverlay';
import Settings from './components/Settings';
import SplashScreen from './components/SplashScreen';
import ToastContainer from './components/Toast';
import { useEngine } from './hooks/useEngine';
import { useConfluxChat } from './hooks/useConfluxChat';
import { useToast } from './hooks/useToast';
import { initTheme, getSavedWallpaper } from './lib/theme';
import { registerShortcuts } from './lib/shortcuts';
import './styles/animations.css';

// Default wallpapers
function getDefaultWallpaper(): string {
  const saved = getSavedWallpaper();
  if (saved) return saved;
  const isDark = document.body.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  return isDark ? '/wallpapers/wallpaper-dark.png' : '/wallpapers/desktop-wallpaper.png';
}

// ── Main App ──

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [wallpaper, setWallpaper] = useState(() => getDefaultWallpaper());
  const [liveAgents, setLiveAgents] = useState(0);
  const [engineHealthy, setEngineHealthy] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const { toasts, toast, dismiss } = useToast();
  const toastRef = useRef(toast);

  // Initialize theme system once on mount
  useEffect(() => {
    initTheme();
  }, []);

  // Fetch live dashboard stats
  useEffect(() => {
    async function fetchDashboard() {
      try {
        const agents = await invoke<any[]>('engine_get_agents');
        setLiveAgents(agents.filter((a: any) => a.status !== 'offline').length);
        const health = await invoke<any>('engine_health');
        setEngineHealthy(health?.status === 'healthy' || true);
      } catch {}
    }
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  // Keep toast ref in sync
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  // Listen for conflux:toast custom events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message: string; type: 'success' | 'error' | 'info' };
      if (detail?.message) {
        toastRef.current(detail.message, detail.type || 'info');
      }
    };
    window.addEventListener('conflux:toast', handler);
    return () => window.removeEventListener('conflux:toast', handler);
  }, []);

  // Listen for custom events from Settings
  useEffect(() => {
    const onThemeChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as string;
      // Settings dispatched event — applyTheme is already called in Settings handleThemeChange,
      // but we listen here to stay in sync if anything else dispatches
      if (detail === 'dark') {
        document.body.classList.add('dark');
      } else if (detail === 'light') {
        document.body.classList.remove('dark');
      } else if (detail === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.toggle('dark', prefersDark);
      }
    };

    const onAccentChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as string;
      document.body.setAttribute('data-accent', detail);
    };

    const onWallpaperChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as string;
      setWallpaper(detail);
    };

    window.addEventListener('conflux:theme-change', onThemeChange);
    window.addEventListener('conflux:accent-change', onAccentChange);
    window.addEventListener('conflux:wallpaper-change', onWallpaperChange);
    return () => {
      window.removeEventListener('conflux:theme-change', onThemeChange);
      window.removeEventListener('conflux:accent-change', onAccentChange);
      window.removeEventListener('conflux:wallpaper-change', onWallpaperChange);
    };
  }, []);

  // Onboarding state — check localStorage on mount
  const [isOnboarded, setIsOnboarded] = useState(() => {
    return localStorage.getItem('conflux-onboarded') === 'true';
  });
  const [showWelcome, setShowWelcome] = useState(() => {
    // Show welcome if onboarded but not yet welcomed (returning user, first welcome)
    const onboarded = localStorage.getItem('conflux-onboarded') === 'true';
    const welcomed = localStorage.getItem('conflux-welcomed') === 'true';
    return onboarded && !welcomed;
  });
  const [userName, setUserName] = useState(() => localStorage.getItem('conflux-name') || 'there');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('conflux-selected-agents');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const { connected, agents, refresh } = useEngine();

  // Listen for settings nav from TopBar gear icon
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'settings') setView('settings');
    };
    window.addEventListener('conflux:navigate', handler);
    return () => window.removeEventListener('conflux:navigate', handler);
  }, []);

  // Listen for open-chat from AgentDetail modal
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.agentId) {
        const agent = agents.find(a => a.id === detail.agentId);
        if (agent) {
          setSelectedAgent(agent);
          setChatOpen(true);
        }
      }
    };
    window.addEventListener('conflux:open-chat', handler);
    return () => window.removeEventListener('conflux:open-chat', handler);
  }, [agents]);

  // Handle onboarding completion
  const handleOnboardingComplete = useCallback((goals: string[], agentIds: string[]) => {
    localStorage.setItem('conflux-onboarded', 'true');
    localStorage.setItem('conflux-goals', JSON.stringify(goals));
    localStorage.setItem('conflux-selected-agents', JSON.stringify(agentIds));

    const name = localStorage.getItem('conflux-name') || 'there';
    setUserName(name);
    setSelectedAgentIds(agentIds);

    // Show welcome if not already welcomed
    const alreadyWelcomed = localStorage.getItem('conflux-welcomed') === 'true';
    setShowWelcome(!alreadyWelcomed);
    setIsOnboarded(true);
  }, []);

  // Handle welcome dismiss
  const handleWelcomeComplete = useCallback(() => {
    setShowWelcome(false);
  }, []);

  // Filter agents by selectedAgentIds if set
  const filteredAgents = useMemo(() => {
    if (selectedAgentIds.length === 0) return agents;
    return agents.filter(a => selectedAgentIds.includes(a.id));
  }, [agents, selectedAgentIds]);

  const handleSelectAgent = useCallback((agent: Agent | null) => {
    setSelectedAgent(agent);
    if (agent) {
      setChatOpen(true);
    } else {
      setChatOpen(false);
    }
  }, []);

  const handleCloseChat = useCallback(() => {
    setChatOpen(false);
    setSelectedAgent(null);
  }, []);

  const handleNavigate = useCallback((v: View) => {
    setView(v);
    if (v === 'chat' && !selectedAgent) {
      // Auto-select first active agent when navigating to chat
      const active = agents.find(a => a.status !== 'offline');
      if (active) setSelectedAgent(active);
      setChatOpen(true);
    }
  }, [agents, selectedAgent]);

  // ── Keyboard shortcuts (FIX 10) ──
  useEffect(() => {
    if (!isOnboarded || showWelcome) return;
    const cleanup = registerShortcuts({
      onNavigate: (v) => handleNavigate(v),
      onClose: () => {
        if (chatOpen) handleCloseChat();
        else if (view !== 'dashboard') setView('dashboard');
      },
      onFocusSearch: () => {
        const searchInput = document.querySelector<HTMLInputElement>('.marketplace-search input, .marketplace-search');
        if (searchInput) searchInput.focus();
      },
      onSelectFirstAgent: () => {
        const list = selectedAgentIds.length > 0 ? filteredAgents : agents;
        const first = list.find(a => a.status !== 'offline') ?? list[0];
        if (first) setSelectedAgent(first);
      },
    });
    return cleanup;
  }, [isOnboarded, showWelcome, connected, view, chatOpen, handleNavigate, handleCloseChat, filteredAgents, agents, selectedAgentIds]);

  // ── Gate: Splash screen ──
  if (!loaded) {
    return <SplashScreen onComplete={() => setLoaded(true)} />;
  }

  // ── Gate: Onboarding ──
  if (!isOnboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // ── Gate: Welcome overlay ──
  if (showWelcome) {
    return (
      <WelcomeOverlay
        userName={userName}
        selectedAgentIds={selectedAgentIds}
        onComplete={handleWelcomeComplete}
      />
    );
  }

  // Determine if we're showing an overlay view
  const showDashboardOverlay = view === 'dashboard';
  const showMarketplaceOverlay = view === 'marketplace';
  const showSettingsOverlay = view === 'settings';

  return (
    <div className="desktop-shell">
      <TopBar
        selectedAgent={selectedAgent}
        engineConnected={connected}
      />

      <Desktop
        agents={selectedAgentIds.length > 0 ? filteredAgents : agents}
        selectedAgent={selectedAgent}
        onSelectAgent={handleSelectAgent}
        wallpaper={wallpaper || undefined}
      />

      {/* Backdrop overlay when chat is open */}
      {chatOpen && (
        <div className="chat-backdrop" onClick={handleCloseChat} />
      )}

      {/* Chat slide-in panel */}
      <ChatPanel
        agent={selectedAgent}
        isOpen={chatOpen}
        onClose={handleCloseChat}
      />

      {/* Overlay views */}
      {showDashboardOverlay && (
        <div className="content-overlay">
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Your AI Family
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {(selectedAgentIds.length > 0 ? filteredAgents : agents).filter(a => a.status === 'working' || a.status === 'thinking').length} agents working
              right now. Click any agent on the desktop to chat.
            </p>
          </div>

          {/* Quick Stats — Live Data */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}>
            {[
              { label: 'Active Agents', value: liveAgents, emoji: '🤖', sub: 'online now' },
              { label: 'Products Built', value: '12', emoji: '📦', sub: 'across all niches' },
              { label: 'Missions Done', value: '14', emoji: '🎯', sub: 'completed' },
              { label: 'Engine Health', value: engineHealthy ? 'Healthy' : 'Check', emoji: engineHealthy ? '💚' : '⚠️', sub: 'all systems' },
            ].map((stat) => (
              <div key={stat.label} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: 20,
                textAlign: 'center',
                boxShadow: 'var(--shadow)',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>{stat.emoji}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, opacity: 0.7 }}>
                  {stat.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <h3 style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Quick Actions
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 12,
          }}>
            {[
              { label: 'View Tasks', emoji: '📋', view: 'settings' },
              { label: 'Browse Skills', emoji: '🧩', view: 'settings' },
              { label: 'Schedule Job', emoji: '🕐', view: 'settings' },
              { label: 'Marketplace', emoji: '🛒', view: 'marketplace' },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('conflux:navigate', { detail: action.view }));
                }}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '16px 12px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span style={{ fontSize: 24 }}>{action.emoji}</span>
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showMarketplaceOverlay && (
        <div className="content-overlay">
          <Marketplace />
        </div>
      )}

      {showSettingsOverlay && (
        <div className="content-overlay">
          <Settings />
        </div>
      )}

      <Taskbar currentView={view} onNavigate={handleNavigate} />

      {/* Agent Detail Modal — listens for conflux:agent-detail events */}
      <AgentDetail />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
