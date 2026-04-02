import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { onOpenUrl, getCurrent } from '@tauri-apps/plugin-deep-link';
import { Agent, View } from './types';
import TopBar from './components/TopBar';
import Desktop from './components/Desktop';
import DesktopV2 from './components/DesktopV2';
import './styles-quadrants.css';
import ConfluxBar from './components/ConfluxBar';
import ConfluxBarV2 from './components/ConfluxBarV2';
import './styles-conflux-bar-v2.css';
import ChatPanel from './components/ChatPanel';
import Marketplace from './components/Marketplace';
import AgentDetail from './components/AgentDetail';
import Onboarding from './components/Onboarding';
import WelcomeOverlay from './components/WelcomeOverlay';
import LoginScreen from './components/LoginScreen';
import Settings from './components/Settings';
import SplashScreen from './components/SplashScreen';
import ToastContainer from './components/Toast';
import UpdateBanner from './components/UpdateBanner';
import FamilySwitcher from './components/FamilySwitcher';
import FamilySetup from './components/FamilySetup';
import GameLauncher from './components/GameLauncher';
import GamesHub from './components/GamesHub';
import MinesweeperGame from './components/MinesweeperGame';
import SnakeGame from './components/SnakeGame';
import PacmanGame from './components/PacmanGame';
import SolitaireGame from './components/SolitaireGame';
import StoryGameReader from './components/StoryGameReader';
import ParentDashboard from './components/ParentDashboard';
import VoiceChat from './components/VoiceChat';
import KitchenView from './components/KitchenView';
import BudgetView from './components/BudgetView';
import FeedView from './components/FeedView';
import LifeAutopilotView from './components/LifeAutopilotView';
import HomeHealthView from './components/HomeHealthView';
import DreamBuilderView from './components/DreamBuilderView';
import GoogleView from './components/GoogleView';
import EchoView from './components/EchoView';
import AgentsView from './components/AgentsView';
import ImmersiveView from './components/ImmersiveView';
import ApiDashboard from './components/ApiDashboard';
import ControlRoom from './components/ControlRoom';
import VaultView from './components/VaultView';
import StudioView from './components/StudioView';
import { useEngine } from './hooks/useEngine';
import { useToast } from './hooks/useToast';
import { useFamily } from './hooks/useFamily';
import { useAuth } from './hooks/useAuth';
import { useSubscription } from './hooks/useSubscription';
import FeatureGate from './components/FeatureGate';
import { AuthProvider } from './contexts/AuthContext';
import { useStoryGames, useStoryGame, useStorySeeds } from './hooks/useStoryGame';
import { useLearningProgress, useLearningGoals } from './hooks/useLearning';
import { initTheme, getSavedWallpaper, getSavedColorTheme, BASE_THEMES, COLOR_THEMES } from './lib/theme';
import { registerShortcuts } from './lib/shortcuts';
import { trackEvent } from './lib/telemetry';
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
  echo: '/backgrounds/echo-bg.png',
  vault: '/backgrounds/vault-bg.png',
  studio: '/backgrounds/studio-bg.png',
  settings: '/backgrounds/settings-bg.png',
  dashboard: '/backgrounds/dashboard-bg.png',
  'api-dashboard': '/backgrounds/dashboard-bg.png', // Re-using an existing dashboard background
};

// Default wallpapers — uses color theme if set
function getDefaultWallpaper(): string {
  const saved = getSavedWallpaper();
  if (saved) return saved;
  // Use theme wallpaper (base or color)
  const colorThemeId = getSavedColorTheme();
  const colorTheme = BASE_THEMES.find(t => t.id === colorThemeId) ?? COLOR_THEMES.find(t => t.id === colorThemeId);
  if (colorTheme) return colorTheme.wallpaper;
  // Fallback
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
  const [expandedChat, setExpandedChat] = useState(false);
  const [voiceChatOpen, setVoiceChatOpen] = useState(false);
  const [wallpaper, setWallpaper] = useState(() => getDefaultWallpaper());
  const [useBarV2, setUseBarV2] = useState(true);
  const [liveAgents, setLiveAgents] = useState(0);
  const [engineHealthy, setEngineHealthy] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const { toasts, toast, dismiss } = useToast();
  const toastRef = useRef(toast);

  // ── Supabase Auth ──
  const { user, loading: authLoading, signInWithEmail } = useAuth();
  const authenticated = !!user;
  const subscription = useSubscription();

  // Global deep link handler for billing redirects
  useEffect(() => {
    console.log('[DeepLink] Registering billing deep link handlers');

    // 1. Tauri deep-link plugin
    const unlistenPromise = onOpenUrl((urls) => {
      console.log('[DeepLink] onOpenUrl fired:', urls);
      const url = urls?.[0] ?? '';
      if (url.includes('billing/success')) {
        console.log('[DeepLink] Billing success — refreshing subscription');
        subscription.refresh();
      }
    });

    // 2. getCurrent — app launched by deep link
    getCurrent().then((urls) => {
      console.log('[DeepLink] getCurrent:', urls);
      const url = urls?.[0] ?? '';
      if (url.includes('billing/success')) {
        console.log('[DeepLink] Billing success (getCurrent) — refreshing subscription');
        subscription.refresh();
      }
    }).catch((e) => console.log('[DeepLink] getCurrent error:', e));

    // 3. Raw Tauri event — single-instance plugin forwarding
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<string[]>('deep-link://new-url', (event) => {
        console.log('[DeepLink] Raw event:', event.payload);
        const url = event.payload?.[0] ?? '';
        if (url.includes('billing/success')) {
          console.log('[DeepLink] Billing success (raw event) — refreshing subscription');
          subscription.refresh();
        }
      }).then(fn => {
        // Store unlisten for cleanup (we'll just let it live for now)
      }).catch(e => console.log('[DeepLink] listen error:', e));
    });

    return () => { unlistenPromise.then(fn => fn()) };
  }, [subscription.refresh]);

  // Initialize theme system once on mount
  useEffect(() => {
    initTheme();
  }, []);

  // Expose bar v2 toggle for console testing
  useEffect(() => {
    (window as any).__toggleBarV2 = () => setUseBarV2(v => !v);
  }, []);

  // Quadrants desktop toggle
  const [useQuadrants, setUseQuadrants] = useState(true);
  useEffect(() => {
    (window as any).__toggleQuadrants = () => setUseQuadrants(v => !v);
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
    const onThemeChange = (_e: Event) => {
      // Always dark mode
      document.body.classList.add('dark');
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

  // Restore onboarding state from Supabase if localStorage is empty
  useEffect(() => {
    if (!user || isOnboarded) return
    import('./lib/supabase').then(async ({ supabase }) => {
      const { data } = await supabase
        .from('ch_profiles')
        .select('onboarded, display_name, onboarding_goals, selected_agents')
        .eq('id', user.id)
        .single()
      if (data?.onboarded) {
        localStorage.setItem('conflux-onboarded', 'true')
        if (data.display_name) {
          localStorage.setItem('conflux-name', data.display_name)
          setUserName(data.display_name)
        }
        if (data.selected_agents) {
          localStorage.setItem('conflux-selected-agents', JSON.stringify(data.selected_agents))
          setSelectedAgentIds(data.selected_agents)
        }
        if (data.onboarding_goals) {
          localStorage.setItem('conflux-goals', JSON.stringify(data.onboarding_goals))
        }
        setIsOnboarded(true)
      }
    })
  }, [user, isOnboarded])

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
const [activeSnake, setActiveSnake] = useState(false);
  const [activePacman, setActivePacman] = useState(false);
  const [activeSolitaire, setActiveSolitaire] = useState(false);
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
        userId: user!.id,
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

  // Listen for marketplace navigation events (conflux:navigate with viewId/gameId)
  useEffect(() => {
    const handler = (e: CustomEvent<{ viewId: string; gameId?: string }>) => {
      const detail = e.detail;
      // Only handle marketplace-style events (object with viewId), ignore string events (e.g. settings)
      if (!detail || typeof detail !== 'object' || !('viewId' in detail)) return;
      const { viewId, gameId } = detail;
      if (gameId === 'minesweeper') { setImmersiveView(viewId as View); setActiveMinesweeper(true); }
      else if (gameId === 'snake') { setImmersiveView(viewId as View); setActiveSnake(true); }
      else if (gameId === 'pacman') { setImmersiveView(viewId as View); setActivePacman(true); }
      else if (gameId === 'solitaire') { setImmersiveView(viewId as View); setActiveSolitaire(true); }
      else if (gameId === 'stories') { setImmersiveView(viewId as View); setActiveGameId(null); }
      else setImmersiveView(viewId as View);
    };
    window.addEventListener('conflux:navigate', handler as EventListener);
    return () => window.removeEventListener('conflux:navigate', handler as EventListener);
  }, []);

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
          localStorage.setItem('conflux-last-chat-agent', agent.id);
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

    // Save onboarding state to Supabase
    if (user) {
      import('./lib/supabase').then(({ supabase }) => {
        supabase.from('ch_profiles').upsert({
          id: user.id,
          onboarded: true,
          onboarding_goals: goals,
          selected_agents: agentIds,
          display_name: name,
        }).then()
      })
      trackEvent(user.id, null, 'onboarding_completed', { goals, agentIds })
    }

    // Show welcome if not already welcomed
    const alreadyWelcomed = localStorage.getItem('conflux-welcomed') === 'true';
    setShowWelcome(!alreadyWelcomed);
    setIsOnboarded(true);
  }, [user]);

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
      localStorage.setItem('conflux-last-chat-agent', agent.id);
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
    setExpandedChat(false);
    setSelectedAgent(null);
  }, []);

  const handleNavigate = useCallback((v: View) => {
    // Clear game state whenever we navigate away from games
    setActiveMinesweeper(false);
    setActiveSnake(false);
    setActivePacman(false);
    setActiveSolitaire(false);
    setActiveGameId(null);

    // Notify desktop components to collapse any expanded views
    window.dispatchEvent(new CustomEvent('conflux:navigate', { detail: v }));

    setView(v);
    if (v === 'dashboard') {
      // Home → go to desktop (close any immersive view)
      setImmersiveView(null);
      setChatOpen(false);
      setVoiceChatOpen(false);
    } else if (v === 'chat') {
      if (!selectedAgent) {
        // Default to last-used agent, then "Conflux", then first active
        const lastAgentId = localStorage.getItem('conflux-last-chat-agent');
        const byLast = lastAgentId ? agents.find(a => a.id === lastAgentId) : null;
        const byConflux = agents.find(a => a.id === 'conflux' || a.name.toLowerCase() === 'conflux');
        const byActive = agents.find(a => a.status !== 'offline');
        const pick = byLast || byConflux || byActive || agents[0];
        if (pick) setSelectedAgent(pick);
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

  // ── Gate: Auth ──
  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a1a' }}>
        <div style={{ fontSize: 32 }}>🤖</div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginScreen onAuthSuccess={() => { /* auth state change triggers re-render via useAuth */ }} />;
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
    <AuthProvider>
    <div className="desktop-shell">
      <TopBar
        selectedAgent={selectedAgent}
        engineConnected={connected}
        controlRoom={controlRoom}
        currentView={view}
        onNavigate={(v) => handleNavigate(v as View)}
      />

      {controlRoom ? (
        <ControlRoom
          agents={selectedAgentIds.length > 0 ? filteredAgents : agents}
          onNavigate={(v) => setImmersiveView(v as View)}
          onOpenChat={(agentId) => {
            const agent = agents.find(a => a.id === agentId);
            if (agent) {
              setSelectedAgent(agent);
              localStorage.setItem('conflux-last-chat-agent', agent.id);
              setChatOpen(true);
            }
          }}
        />
      ) : (
        useQuadrants ? (
          <DesktopV2
            agents={selectedAgentIds.length > 0 ? filteredAgents : agents}
            wallpaper={wallpaper || undefined}
            onNavigate={(v) => setImmersiveView(v)}
          />
        ) : (
          <Desktop
            agents={selectedAgentIds.length > 0 ? filteredAgents : agents}
            wallpaper={wallpaper || undefined}
            onNavigate={(v) => setImmersiveView(v)}
          />
        )
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
          {immersiveView === 'google' && <GoogleView />}
          {immersiveView === 'marketplace' && <Marketplace />}
          {immersiveView === 'agents' && <AgentsView />}
          {immersiveView === 'echo' && <EchoView />}
          {immersiveView === 'vault' && <VaultView />}
          {immersiveView === 'studio' && <StudioView />}
          {immersiveView === 'settings' && <Settings />}
          {immersiveView === 'api-dashboard' && <ApiDashboard />}
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
          {immersiveView === 'games' && !activeGameId && !activeMinesweeper && !activeSnake && !activePacman && !activeSolitaire && (
            <GamesHub
              onOpenGame={(gameId) => {
                if (gameId === 'minesweeper') {
                  setActiveMinesweeper(true);
                }
                if (gameId === 'snake') {
                  setActiveSnake(true);
                }
                if (gameId === 'pacman') {
                  setActivePacman(true);
                }
                if (gameId === 'solitaire') {
                  setActiveSolitaire(true);
                }
              }}
            />
          )}
          {immersiveView === 'games' && activeMinesweeper && (
            <MinesweeperGame onBack={() => setActiveMinesweeper(false)} />
          )}
          {immersiveView === 'games' && activeSnake && !activeMinesweeper && (
            <SnakeGame onBack={() => setActiveSnake(false)} />
          )}
          {immersiveView === 'games' && activePacman && !activeMinesweeper && !activeSnake && (
            <PacmanGame onBack={() => setActivePacman(false)} />
          )}
          {immersiveView === 'games' && activeSolitaire && !activeMinesweeper && !activeSnake && !activePacman && (
            <SolitaireGame onBack={() => setActiveSolitaire(false)} />
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
        agents={filteredAgents.length > 0 ? filteredAgents : agents}
        isOpen={chatOpen}
        isExpanded={expandedChat}
        onClose={handleCloseChat}
        onSelectAgent={handleSelectAgent}
        onToggleExpand={() => setExpandedChat(prev => !prev)}
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

      {useBarV2 ? (
        <ConfluxBarV2
          currentView={view}
          agents={agents}
          pinnedApps={['chat', 'kitchen', 'budget', 'settings']}
          onNavigate={handleNavigate}
        />
      ) : (
        <ConfluxBar
          currentView={view}
          agents={agents}
          pinnedApps={['chat', 'kitchen', 'budget', 'settings']}
          onNavigate={handleNavigate}
        />
      )}

      {/* Agent Detail Modal — listens for conflux:agent-detail events */}
      <AgentDetail />

      <UpdateBanner />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
    </AuthProvider>
  );
}
