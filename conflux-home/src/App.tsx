import { useState, useEffect, useCallback, useMemo } from 'react';
import { Agent, View } from './types';
import TopBar from './components/TopBar';
import Desktop from './components/Desktop';
import Taskbar from './components/Taskbar';
import ChatPanel from './components/ChatPanel';
import Marketplace from './components/Marketplace';
import Onboarding from './components/Onboarding';
import WelcomeOverlay from './components/WelcomeOverlay';
import { useGateway } from './hooks/useGateway';
import type { AgentInfo } from './gateway-client';

// Map SDK AgentInfo → UI Agent type
function mapAgentInfo(info: AgentInfo): Agent {
  return {
    id: info.id,
    name: info.name,
    emoji: info.emoji,
    role: info.role,
    description: `${info.role} agent`,
    status: info.status,
    model: info.model || '',
    currentTask: info.currentTask,
    lastActive: info.lastActive,
    memorySize: info.memorySize,
  };
}

// ── Connecting Screen ──

function ConnectingScreen() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="desktop-shell" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        textAlign: 'center',
        color: 'var(--text-muted)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <div style={{ fontSize: 18 }}>Connecting to gateway{dots}</div>
      </div>
    </div>
  );
}

// ── Settings View ──

function SettingsView() {
  const [resetting, setResetting] = useState(false);

  const handleReset = () => {
    if (resetting) return;
    setResetting(true);
    localStorage.removeItem('conflux-onboarded');
    localStorage.removeItem('conflux-welcomed');
    localStorage.removeItem('conflux-goals');
    localStorage.removeItem('conflux-selected-agents');
    localStorage.removeItem('conflux-name');
    localStorage.removeItem('conflux-gateway-url');
    // Keep gateway token so user doesn't need to re-enter it
    window.location.reload();
  };

  return (
    <div style={{ textAlign: 'center', paddingTop: 100, color: 'var(--text-muted)' }}>
      <p style={{ fontSize: 48 }}>⚙️</p>
      <p style={{ marginTop: 16, fontSize: 16 }}>Settings</p>
      <p style={{ fontSize: 13, marginTop: 8, marginBottom: 32 }}>API keys, model preferences, agent configs</p>

      <button
        onClick={handleReset}
        disabled={resetting}
        style={{
          padding: '10px 24px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
          color: resetting ? 'var(--text-muted)' : 'var(--accent-error)',
          fontSize: 14,
          fontWeight: 500,
          cursor: resetting ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        {resetting ? 'Resetting...' : 'Reset Onboarding'}
      </button>
    </div>
  );
}

// ── Main App ──

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

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

  const { client, connected, agents: rawAgents, refresh } = useGateway();

  // Map live agents to UI Agent type
  const agents = useMemo(() => rawAgents.map(mapAgentInfo), [rawAgents]);

  // Listen for settings nav from TopBar gear icon
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'settings') setView('settings');
    };
    window.addEventListener('conflux:navigate', handler);
    return () => window.removeEventListener('conflux:navigate', handler);
  }, []);

  // Toggle dark mode on body
  useEffect(() => {
    document.body.classList.toggle('dark', isDark);
  }, [isDark]);

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

  // ── Gate: not connected to gateway yet → show connecting screen ──
  if (!connected) {
    return <ConnectingScreen />;
  }

  // Determine if we're showing an overlay view
  const showDashboardOverlay = view === 'dashboard';
  const showMarketplaceOverlay = view === 'marketplace';
  const showSettingsOverlay = view === 'settings';

  return (
    <div className="desktop-shell">
      <TopBar
        selectedAgent={selectedAgent}
        gatewayConnected={connected}
        isDark={isDark}
        onToggleTheme={() => setIsDark(d => !d)}
      />

      <Desktop
        agents={selectedAgentIds.length > 0 ? filteredAgents : agents}
        selectedAgent={selectedAgent}
        onSelectAgent={handleSelectAgent}
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

          {/* Quick Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16,
          }}>
            {[
              { label: 'Missions Completed', value: '14', emoji: '🎯' },
              { label: 'Products Built', value: '13', emoji: '📦' },
              { label: 'Research Reports', value: '6', emoji: '📊' },
              { label: 'Hours Saved', value: '247', emoji: '⏰' },
            ].map((stat) => (
              <div key={stat.label} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--border-radius)',
                padding: 20,
                textAlign: 'center',
                boxShadow: 'var(--shadow)',
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{stat.emoji}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {stat.label}
                </div>
              </div>
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
          <SettingsView />
        </div>
      )}

      <Taskbar currentView={view} onNavigate={handleNavigate} />
    </div>
  );
}
