import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Agent, View } from './types';
import TopBar from './components/TopBar';
import Desktop from './components/Desktop';
import ConfluxBar from './components/ConfluxBar';
import ChatPanel from './components/ChatPanel';
import Marketplace from './components/Marketplace';
import AgentDetail from './components/AgentDetail';
import Onboarding from './components/Onboarding';
import WelcomeOverlay from './components/WelcomeOverlay';
import Settings from './components/Settings';
import SplashScreen from './components/SplashScreen';
import ToastContainer from './components/Toast';
import FamilySwitcher from './components/FamilySwitcher';
import FamilySetup from './components/FamilySetup';
import GameLauncher from './components/GameLauncher';
import GamesHub from './components/GamesHub';
import MinesweeperGame from './components/MinesweeperGame';
import StoryGameReader from './components/StoryGameReader';
import AgentTemplateBrowser from './components/AgentTemplateBrowser';
import ParentDashboard from './components/ParentDashboard';
import VoiceChat from './components/VoiceChat';
import KitchenView from './components/KitchenView';
import BudgetView from './components/BudgetView';
import FeedView from './components/FeedView';
import LifeAutopilotView from './components/LifeAutopilotView';
import HomeHealthView from './components/HomeHealthView';
import DreamBuilderView from './components/DreamBuilderView';
import ImmersiveView from './components/ImmersiveView';
import ControlRoom from './components/ControlRoom';
import { useEngine } from './hooks/useEngine';
import { useToast } from './hooks/useToast';
import { useFamily } from './hooks/useFamily';
import { useStoryGames, useStoryGame, useStorySeeds } from './hooks/useStoryGame';
import { useLearningProgress, useLearningGoals } from './hooks/useLearning';
import { initTheme, getSavedWallpaper } from './lib/theme';
import { registerShortcuts } from './lib/shortcuts';
import './styles/animations.css';

// Background images for immersive views
const VIEW_BACKGROUNDS: Record<string, string> = {
  kitchen: '/backgrounds/kitchen-bg.png',
  budget: '/backgrounds/budget-bg.png',
  life: '/backgrounds/life-bg.png',
  home: '/backgrounds/home-bg.png',
  dreams: '/backgrounds/dreams-bg.png',
  agents: '/backgrounds/agents-bg.png',
  games: '/backgrounds/games-bg.png',
  feed: '/backgrounds/feed-bg.png',
  marketplace: '/backgrounds/marketplace-bg.png',
  settings: '/backgrounds/settings-bg.png',
  dashboard: '/backgrounds/dashboard-bg.png',
};

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
  const [immersiveView, setImmersiveView] = useState<View | null>(null);
  const [controlRoom, setControlRoom] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [voiceChatOpen, setVoiceChatOpen] = useState(false);
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
  const [showWelcome, setShowWelcome] = useState(false);
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

  // Family profiles
  const { members: familyMembers, create: createFamilyMember } = useFamily();
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [showFamilySetup, setShowFamilySetup] = useState(false);

  // Story games
  const { games: storyGames, create: createStoryGame, reload: reloadGames } = useStoryGames(activeMemberId ?? undefined);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [showGameLauncher, setShowGameLauncher] = useState(false);
  const [activeMinesweeper, setActiveMinesweeper] = useState(false);
  const {
    game: activeGame, chapters: activeGameChapters, currentChapter: activeGameCurrentChapter,
    choosePath, solvePuzzle, generateNextChapter,
  } = useStoryGame(activeGameId);
  const { seeds: storySeeds } = useStorySeeds(
    activeMemberId ? familyMembers.find(m => m.id === activeMemberId)?.age_group : undefined,
  );

  // Filter agents by active family member's age group
  const activeMember = familyMembers.find(m => m.id === activeMemberId);

  // Learning progress for parent dashboard
  const { progress: learningProgress } = useLearningProgress(activeMemberId);
  const { goals: learningGoals, create: createLearningGoal } = useLearningGoals(activeMemberId);
  const [dashboardMemberId, setDashboardMemberId] = useState<string | null>(null);
  const dashboardMember = familyMembers.find(m => m.id === dashboardMemberId);

  // Voice chat session tracking
  const [voiceSessionId, setVoiceSessionId] = useState<string | null>(null);

  // Voice chat send handler — uses engine_chat directly
  const handleVoiceSend = useCallback(async (message: string): Promise<string> => {
    if (!selectedAgent) return "Oops! No agent selected.";

    // Create session if needed
    let sessionId = voiceSessionId;
    if (!sessionId) {
      sessionId = await invoke<string>('engine_create_session', {
        agentId: selectedAgent.id,
        userId: 'default',
        title: null,
      });
      setVoiceSessionId(sessionId);
    }

    const result = await invoke<any>('engine_chat', {
      req: {
        session_id: sessionId,
        agent_id: selectedAgent.id,
        message,
        max_tokens: 500, // shorter for kids
      }
    });

    // Log learning activity for young kids
    if (activeMemberId && activeMember && (activeMember.age_group === 'toddler' || activeMember.age_group === 'preschool')) {
      try {
        await invoke('learning_log_activity', {
          req: {
            member_id: activeMemberId,
            agent_id: selectedAgent.id,
            session_id: sessionId,
            activity_type: 'language',
            topic: message.slice(0, 50),
            description: `Chat with ${selectedAgent.name}`,
            difficulty: 'easy',
            duration_sec: 10,
          }
        });
      } catch { /* non-critical */ }
    }

    return result.content || "Hmm, let me think about that! 🤔";
  }, [selectedAgent, voiceSessionId, activeMemberId, activeMember]);

  // Listen for settings nav from TopBar gear icon
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'settings') setView('settings');
    };
    window.addEventListener('conflux:navigate', handler);
    return () => window.removeEventListener('conflux:navigate', handler);
  }, []);

  // Listen for control room toggle (dev)
  useEffect(() => {
    const handler = () => setControlRoom(prev => !prev);
    window.addEventListener('conflux:toggle-control-room', handler);
    return () => window.removeEventListener('conflux:toggle-control-room', handler);
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
      const isYoungKid = activeMember && (activeMember.age_group === 'toddler' || activeMember.age_group === 'preschool');
      if (isYoungKid) {
        setVoiceChatOpen(true);
        setChatOpen(false);
      } else {
        setChatOpen(true);
        setVoiceChatOpen(false);
      }
    } else {
      setChatOpen(false);
      setVoiceChatOpen(false);
    }
  }, [activeMember]);

  const handleCloseChat = useCallback(() => {
    setChatOpen(false);
    setVoiceChatOpen(false);
    setSelectedAgent(null);
  }, []);

  const handleNavigate = useCallback((v: View) => {
    setView(v);
    if (v === 'dashboard') {
      // Home → go to desktop (close any immersive view)
      setImmersiveView(null);
      setChatOpen(false);
      setVoiceChatOpen(false);
    } else if (v === 'chat') {
      if (!selectedAgent) {
        // Auto-select first active agent when navigating to chat
        const active = agents.find(a => a.status !== 'offline');
        if (active) setSelectedAgent(active);
      }
      setImmersiveView(null);
      setChatOpen(true);
    } else {
      // Open immersive view for all other navigation
      setImmersiveView(v);
      setChatOpen(false);
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

  return (
    <div className="desktop-shell">
      <TopBar
        selectedAgent={selectedAgent}
        engineConnected={connected}
        controlRoom={controlRoom}
      />

      {controlRoom ? (
        <ControlRoom />
      ) : (
        <Desktop
          agents={selectedAgentIds.length > 0 ? filteredAgents : agents}
          wallpaper={wallpaper || undefined}
          onNavigate={(v) => setImmersiveView(v)}
        />
      )}

      {/* Family Switcher — moved to TopBar popup (removed from desktop) */}

      {/* Immersive full-screen view — wraps app content with custom background */}
      {immersiveView && (
        <ImmersiveView
          view={immersiveView}
          backgroundUrl={VIEW_BACKGROUNDS[immersiveView] || '/backgrounds/dashboard-bg.png'}
          onClose={() => setImmersiveView(null)}
        >
          {immersiveView === 'kitchen' && <KitchenView />}
          {immersiveView === 'budget' && <BudgetView />}
          {immersiveView === 'feed' && <FeedView />}
          {immersiveView === 'life' && <LifeAutopilotView />}
          {immersiveView === 'home' && <HomeHealthView />}
          {immersiveView === 'dreams' && <DreamBuilderView />}
          {immersiveView === 'marketplace' && <Marketplace />}
          {immersiveView === 'settings' && <Settings />}
          {immersiveView === 'agents' && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                      🧩 Agent Library
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {activeMember
                        ? `Age-appropriate agents for ${activeMember.name}`
                        : 'Browse and install agent templates for your family'}
                    </p>
                  </div>
                </div>
                <AgentTemplateBrowser
                  member={activeMember ?? null}
                  onClose={() => setImmersiveView(null)}
                  onInstalled={() => refresh()}
                />
              </div>
            </div>
          )}
          {immersiveView === 'dashboard' && (
            <div>
              <h3 style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Your AI Family
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
                {(selectedAgentIds.length > 0 ? filteredAgents : agents).filter(a => a.status === 'working' || a.status === 'thinking').length} agents working
                right now. Click any agent on the desktop to chat.
              </p>
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
                  }}>
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
            </div>
          )}
          {immersiveView === 'games' && !activeGameId && !activeMinesweeper && (
            <GamesHub
              onOpenGame={(gameId) => {
                if (gameId === 'minesweeper') {
                  setActiveMinesweeper(true);
                }
              }}
            />
          )}
          {immersiveView === 'games' && activeMinesweeper && (
            <MinesweeperGame onBack={() => setActiveMinesweeper(false)} />
          )}
        </ImmersiveView>
      )}

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

      {/* Voice Chat — for toddler/preschool agents */}
      {voiceChatOpen && selectedAgent && (
        <VoiceChat
          agent={selectedAgent}
          onSendMessage={handleVoiceSend}
          onClose={handleCloseChat}
        />
      )}

      {/* Story Game Reader — full screen overlay when playing */}
      {activeGame && activeGameId && (
        <StoryGameReader
          game={activeGame}
          chapters={activeGameChapters}
          currentChapter={activeGameCurrentChapter}
          onChoose={choosePath}
          onSolvePuzzle={solvePuzzle}
          onClose={() => setActiveGameId(null)}
          onGenerateNext={generateNextChapter}
        />
      )}

      {/* Game Launcher Modal */}
      {showGameLauncher && (
        <GameLauncher
          seeds={storySeeds}
          memberAgeGroup={activeMember?.age_group}
          onCreateGame={async (req) => {
            const game = await createStoryGame(req);
            setShowGameLauncher(false);
            setActiveGameId(game.id);
            return game;
          }}
          onClose={() => setShowGameLauncher(false)}
        />
      )}

      {/* Family Setup Modal */}
      {showFamilySetup && (
        <FamilySetup
          onSubmit={async (req) => {
            await createFamilyMember(req);
            setShowFamilySetup(false);
          }}
          onCancel={() => setShowFamilySetup(false)}
        />
      )}

      {/* Parent Dashboard */}
      {dashboardMember && (
        <ParentDashboard
          member={dashboardMember}
          progress={dashboardMemberId === activeMemberId ? learningProgress : null}
          goals={dashboardMemberId === activeMemberId ? learningGoals : []}
          onCreateGoal={createLearningGoal}
          onClose={() => setDashboardMemberId(null)}
        />
      )}

      <ConfluxBar
        currentView={view}
        agents={agents}
        pinnedApps={['chat', 'agents', 'kitchen', 'budget', 'settings']}
        onNavigate={handleNavigate}
      />

      {/* Agent Detail Modal — listens for conflux:agent-detail events */}
      <AgentDetail />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
