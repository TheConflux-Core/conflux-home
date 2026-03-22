import { useState, useEffect, useCallback } from 'react';
import { Agent, View } from './types';
import TopBar from './components/TopBar';
import Desktop from './components/Desktop';
import Taskbar from './components/Taskbar';
import ChatPanel from './components/ChatPanel';
import Marketplace from './components/Marketplace';
import Onboarding from './components/Onboarding';

// Demo agents — these would come from OpenClaw runtime
const DEMO_AGENTS: Agent[] = [
  {
    id: 'zigbot',
    name: 'ZigBot',
    emoji: '🤖',
    role: 'Strategic Partner',
    description: 'Your executive interface and strategic co-owner. Helps you think clearly and make high-quality decisions.',
    status: 'working',
    model: 'openrouter/xiaomi/mimo-v2-pro',
    currentTask: 'Analyzing market opportunities...',
    lastActive: 'Just now',
    memorySize: 847,
  },
  {
    id: 'helix',
    name: 'Helix',
    emoji: '🔬',
    role: 'Research & Intelligence',
    description: 'Deep market research, competitive analysis, and trend identification.',
    status: 'thinking',
    model: 'openrouter/xiaomi/mimo-v2-pro',
    currentTask: 'Researching billion-dollar empire patterns...',
    lastActive: '2 min ago',
    memorySize: 1203,
  },
  {
    id: 'forge',
    name: 'Forge',
    emoji: '🔨',
    role: 'Builder',
    description: 'Creates artifacts, generates content, builds products.',
    status: 'idle',
    model: 'openrouter/xiaomi/mimo-v2-pro',
    lastActive: '15 min ago',
    memorySize: 456,
  },
  {
    id: 'quanta',
    name: 'Quanta',
    emoji: '✅',
    role: 'Quality Control',
    description: 'Verifies outputs, catches errors, ensures quality standards.',
    status: 'idle',
    model: 'openrouter/xiaomi/mimo-v2-pro',
    lastActive: '15 min ago',
    memorySize: 312,
  },
  {
    id: 'prism',
    name: 'Prism',
    emoji: '💎',
    role: 'System Orchestrator',
    description: 'Manages mission lifecycle, coordinates agent workflows.',
    status: 'working',
    model: 'openrouter/xiaomi/mimo-v2-pro',
    currentTask: 'Managing mission-0600 pipeline...',
    lastActive: 'Just now',
    memorySize: 589,
  },
  {
    id: 'pulse',
    name: 'Pulse',
    emoji: '📣',
    role: 'Growth & Marketing',
    description: 'Creates marketing assets, manages launches, drives growth.',
    status: 'offline',
    model: 'openrouter/xiaomi/mimo-v2-pro',
    lastActive: '2 hours ago',
    memorySize: 234,
  },
  {
    id: 'vector',
    name: 'Vector',
    emoji: '🎯',
    role: 'CEO / Gatekeeper',
    description: 'Evaluates opportunities, approves investments, financial strategy.',
    status: 'idle',
    model: 'openrouter/xiaomi/mimo-v2-pro',
    lastActive: '1 hour ago',
    memorySize: 678,
  },
];

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [agents] = useState<Agent[]>(DEMO_AGENTS);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isDark, setIsDark] = useState(false);

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

  // Show onboarding if first time
  if (!hasCompletedOnboarding) {
    return <Onboarding onComplete={() => setHasCompletedOnboarding(true)} />;
  }

  // Determine if we're showing an overlay view
  const showDashboardOverlay = view === 'dashboard';
  const showMarketplaceOverlay = view === 'marketplace';
  const showSettingsOverlay = view === 'settings';

  return (
    <div className="desktop-shell">
      <TopBar
        selectedAgent={selectedAgent}
        gatewayConnected={true}
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
