import { useState, useEffect, useCallback, useMemo } from 'react';
import { Agent, View } from './types';
import TopBar from './components/TopBar';
import Desktop from './components/Desktop';
import Taskbar from './components/Taskbar';
import ChatPanel from './components/ChatPanel';
import Marketplace from './components/Marketplace';
import Onboarding from './components/Onboarding';
import { useGateway, getToken, saveToken } from './hooks/useGateway';
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

// ── Token Setup Screen ──

function TokenSetup({ onTokenSaved }: { onTokenSaved: () => void }) {
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setError('Please enter a token');
      return;
    }
    saveToken(trimmed);
    onTokenSaved();
  };

  return (
    <div className="desktop-shell" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 48,
        maxWidth: 440,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Connect to Gateway</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
          Enter your OpenClaw gateway token to get started.
        </p>
        <input
          type="password"
          placeholder="Paste your gateway token..."
          value={tokenInput}
          onChange={e => { setTokenInput(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-input, #1a1a2e)',
            color: 'var(--text-primary)',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: 12,
          }}
        />
        {error && (
          <div style={{ color: 'var(--accent-error, #ff4444)', fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}
        <button
          onClick={handleSave}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--accent-primary, #00d4ff)',
            color: '#000',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Connect
        </button>
      </div>
    </div>
  );
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

// ── Main App ──

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [hasToken, setHasToken] = useState(() => !!getToken());

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

  const handleTokenSaved = useCallback(() => {
    setHasToken(true);
    // Gateway hook will pick up the token from localStorage on next render
    window.location.reload();
  }, []);

  // Gate: no token → show setup screen
  if (!hasToken) {
    return <TokenSetup onTokenSaved={handleTokenSaved} />;
  }

  // Gate: onboarding
  if (!hasCompletedOnboarding) {
    return <Onboarding onComplete={() => setHasCompletedOnboarding(true)} />;
  }

  // Gate: not connected to gateway yet → show connecting screen
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
        agents={agents}
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
              {agents.filter(a => a.status === 'working' || a.status === 'thinking').length} agents working
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
          <div style={{ textAlign: 'center', paddingTop: 100, color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 48 }}>⚙️</p>
            <p style={{ marginTop: 16, fontSize: 16 }}>Settings coming soon</p>
            <p style={{ fontSize: 13, marginTop: 8 }}>API keys, model preferences, agent configs</p>
          </div>
        </div>
      )}

      <Taskbar currentView={view} onNavigate={handleNavigate} />
    </div>
  );
}
