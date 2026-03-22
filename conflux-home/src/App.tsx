import { useState } from 'react';
import { Agent, View } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
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
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Show onboarding if first time
  if (!hasCompletedOnboarding) {
    return <Onboarding onComplete={() => setHasCompletedOnboarding(true)} />;
  }

  const activeAgents = agents.filter(a => a.status !== 'offline').length;
  const tasksRunning = agents.filter(a => a.status === 'working' || a.status === 'thinking').length;

  return (
    <div className="app-layout">
      <Sidebar
        currentView={view}
        onNavigate={setView}
        agentCount={agents.length}
        activeCount={activeAgents}
      />
      <div className="main-content">
        <div className="top-bar">
          <h2>{getViewTitle(view)}</h2>
          <div className="pipeline-status">
            <div className="stat">
              <div className="dot" />
              <span>{activeAgents} agents active</span>
            </div>
            <div className="stat">
              <span>{tasksRunning} tasks running</span>
            </div>
            <div className="stat">
              <span>Uptime: 2h 34m</span>
            </div>
          </div>
        </div>
        <div className="content-area">
          {view === 'dashboard' && (
            <Dashboard
              agents={agents}
              onSelectAgent={(agent) => {
                setSelectedAgent(agent);
                setView('chat');
              }}
            />
          )}
          {view === 'chat' && (
            <ChatPanel
              agent={selectedAgent}
              agents={agents}
              onSelectAgent={setSelectedAgent}
            />
          )}
          {view === 'marketplace' && <Marketplace />}
          {view === 'settings' && (
            <div style={{ textAlign: 'center', paddingTop: 100, color: 'var(--text-muted)' }}>
              <p style={{ fontSize: 48 }}>⚙️</p>
              <p style={{ marginTop: 16, fontSize: 16 }}>Settings coming soon</p>
              <p style={{ fontSize: 13, marginTop: 8 }}>API keys, model preferences, agent configs</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getViewTitle(view: View): string {
  switch (view) {
    case 'dashboard': return 'Dashboard';
    case 'chat': return 'Chat';
    case 'marketplace': return 'Agent Marketplace';
    case 'settings': return 'Settings';
    case 'onboarding': return 'Welcome';
  }
}
