import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { soundManager } from './lib/sound';
import { playBuildComplete } from './lib/onboarding-sounds';
import { isAndroid, startListening as androidStartListening, stopListening as androidStopListening, cancel as androidCancel, isAvailable as androidVoiceAvailable } from './lib/androidVoice';
import { initHeartbeatGlobal } from './lib/heartbeatGlobal';
import { startDemoBeats, stopDemoBeats } from './lib/beatBus';
import { onOpenUrl, getCurrent } from '@tauri-apps/plugin-deep-link';
import { Agent, View } from './types';
import TopBar from './components/TopBar';
import Desktop from './components/Desktop';
import DesktopV2 from './components/DesktopV2';
import './styles-quadrants.css';
import './styles-mobile.css';
import './styles-mobile-layout.css';
import ConfluxBar from './components/ConfluxBar';
import ConfluxBarV2 from './components/ConfluxBarV2';
import './styles-conflux-bar-v2.css';
import ChatPanel from './components/ChatPanel';
import MarketplaceNew from './components/MarketplaceNew';
import AgentDetail from './components/AgentDetail';
import Onboarding from './components/onboarding-v2';
import WelcomeOverlay from './components/WelcomeOverlay';
import AgentIntroductions from './components/AgentIntroductions';
import ConfluxOrbit from './components/ConfluxOrbit';
import ConfluxShell from './components/ConfluxShell';
import { NudgeToast } from './components/conflux';
import LoginScreen from './components/LoginScreen';
import AuthCallback from './components/AuthCallback';
import Settings from './components/Settings';
import GroveView from './components/GroveView';
import SplashScreen from './components/SplashScreen';
import ToastContainer from './components/Toast';
import UpdateBanner from './components/UpdateBanner';
import FamilySetup from './components/FamilySetup';
import GameLauncher from './components/GameLauncher';
import MinesweeperGame from './components/MinesweeperGame';
import SnakeGame from './components/SnakeGame';
import PacmanGame from './components/PacmanGame';
import SolitaireGame from './components/SolitaireGame';
import NaniSolitaireGame from './components/NaniSolitaireGame';
import JohnnySolitaireGame from './components/JohnnySolitaireGame';
import GamesPage from './components/GamesPage';
import StoryGameReader from './components/StoryGameReader';
import ParentDashboard from './components/ParentDashboard';
import VoiceChat from './components/VoiceChat';
import KitchenView from './components/KitchenView';
import PulseWrapper from './components/PulseWrapper';
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
import SecurityDashboard from './components/SecurityDashboard';
import AegisDashboard from './components/AegisDashboard';
import ViperDashboard from './components/ViperDashboard'
import AgentAuditDashboard from './components/AgentAuditDashboard';
import SIEMDashboard from './components/SIEMDashboard';

import TourV2 from './components/TourV2';

// Phase 0.3+: Global AI Input, Agent Status
import AgentStatusPanel from './components/AgentStatusPanel';
import { useAgentStatus } from './hooks/useAgentStatus';
import './styles-agent-introductions.css';
import './styles-global-ai-input.css';
import './styles-agent-boot-cards.css';
import './styles-agent-status.css';
import AgentBootCards from './components/AgentBootCards';
import './styles-agent-boot-cards.css';
import { useEngine } from './hooks/useEngine';
import { useToast } from './hooks/useToast';
import { useFamily } from './hooks/useFamily';
import { useAuth } from './hooks/useAuth';
import useNotificationListener from './hooks/useNotificationListener';
import { useSubscription } from './hooks/useSubscription';
import { AuthProvider } from './contexts/AuthContext';
import { useStoryGames, useStoryGame, useStorySeeds } from './hooks/useStoryGame';
import { useLearningProgress, useLearningGoals } from './hooks/useLearning';
import { initTheme, getSavedWallpaper, getSavedColorTheme, BASE_THEMES, COLOR_THEMES, applyTheme, saveTheme, applyAccent, saveAccent, applyColorTheme, saveColorTheme } from './lib/theme';
import { registerShortcuts } from './lib/shortcuts';
import { trackEvent } from './lib/telemetry';
import './styles/animations.css';
import './styles-global-ai-input.css';
import './styles/tour.css';
import './styles/grove.css';
import './components/onboarding-v2/onboarding-v2.css';

// Background images for immersive views
const VIEW_BACKGROUNDS: Record<string, string> = {
  hearth: '', // Transparent — Hearth renders its own component backgrounds
  pulse: '/backgrounds/budget-bg.webp',
  orbit: '/backgrounds/life-bg.webp',
  foundation: '/backgrounds/home-bg.webp',
  horizon: '/backgrounds/dreams-bg.webp',
  family: '/backgrounds/agents-bg.webp',
  story: '/backgrounds/games-bg.webp',
  games: '/backgrounds/games-bg.webp',
  marketplace: '/backgrounds/marketplace-bg.webp',
  mirror: '/backgrounds/echo-bg.webp',
  vault: '/backgrounds/vault-bg.webp',
  studio: '/backgrounds/studio-bg.webp',
  settings: '/backgrounds/settings-bg.webp',
  grove: '',  // Grove renders its own dark forest background
  google: '/backgrounds/google-bg.webp',
  dashboard: '/backgrounds/dashboard-bg.webp',
  'api-dashboard': '/backgrounds/dashboard-bg.webp', // Re-using an existing dashboard background
  security: '/backgrounds/themes/aegis.png',
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
  return isDark ? '/wallpapers/wallpaper-dark.webp' : '/wallpapers/desktop-wallpaper.webp';
}

// ── Main App ──

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
  const [isTTSSpeaking, setIsTTSSpeaking] = useState(false);
  const isTTSSpeakingRef = useRef(false);
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
  const [isAuthCallback, setIsAuthCallback] = useState(() => window.location.pathname === '/auth/callback');
  const [showTour, setShowTour] = useState(false);
  const { toasts, toast, dismiss } = useToast();
  const toastRef = useRef(toast);

  // ── Supabase Auth ──
  const { user, loading: authLoading, signInWithEmail } = useAuth();
  const authenticated = !!user;
  const subscription = useSubscription();

  // Mount global notification listener (desktop notifications from engine)
  useNotificationListener();

  // Handle conflux://auth/callback deep links (fallback for protocol-registered platforms)
  const handleAuthDeepLink = useCallback(async (url: string) => {
    if (!url.includes('auth/callback')) return
    try {
      const hashIdx = url.indexOf('#')
      if (hashIdx === -1) return
      const params = new URLSearchParams(url.slice(hashIdx + 1))
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      if (!access_token || !refresh_token) return

      const { supabase } = await import('./lib/supabase')
      const { error } = await supabase.auth.setSession({ access_token, refresh_token })
      if (error) console.error('[DeepLink] Auth callback error:', error.message)
      else console.log('[DeepLink] Auth session set from deep link')
    } catch (err) {
      console.error('[DeepLink] Auth callback failed:', err)
    }
  }, [])

  // Global deep link handler for billing redirects
  // Guard: skip in browser dev mode (no Tauri runtime).
  useEffect(() => {
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (!isTauri) {
      console.log('[DeepLink] Skipping — browser dev mode (no Tauri runtime)');
      return;
    }

    console.log('[DeepLink] Registering billing deep link handlers');

    // 1. Tauri deep-link plugin
    const unlistenPromise = onOpenUrl((urls) => {
      console.log('[DeepLink] onOpenUrl fired:', urls);
      const url = urls?.[0] ?? '';
      if (url.includes('billing/success')) {
        console.log('[DeepLink] Billing success — refreshing subscription');
        subscription.refresh();
      }
      if (url.includes('auth/callback')) {
        console.log('[DeepLink] Auth callback deep link detected');
        handleAuthDeepLink(url);
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
      if (url.includes('auth/callback')) {
        console.log('[DeepLink] Auth callback (getCurrent)');
        handleAuthDeepLink(url);
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
        if (url.includes('auth/callback')) {
          console.log('[DeepLink] Auth callback (raw event)');
          handleAuthDeepLink(url);
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

  // Preload sound system on mount
  useEffect(() => {
    soundManager.preload().then(() => {
      playBuildComplete();
    });
  }, []);

  // Initialize global heartbeat singleton
  // Demo beats disabled — testing real chain beats from Rust via conflux:beat-event → beatBus
  useEffect(() => {
    initHeartbeatGlobal();
    // startDemoBeats(); // re-enable if chain beats aren't firing
    // return () => { stopDemoBeats(); };
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
        setLiveAgents(agents.length);
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

  // Listen for skill-created events → show toast notification
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    listen<{ skill_name: string; skill_id: string }>('conflux:skill-created', (event) => {
      toastRef.current(`🧩 New skill learned: ${event.payload.skill_name}`, 'success');
    }).then(fn => { unlisten = fn; }).catch(() => {});
    return () => { unlisten?.(); };
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

    const onUiAction = (e: Event) => {
      const { widget, action, value } = (e as CustomEvent).detail as {
        widget: string;
        action: string;
        value: any;
      };
      console.log('[App] UI action:', widget, action, value);
      if (!widget) {
        console.warn('[App] ui_action: no widget provided');
        return;
      }
      console.log('[App] UI action handler:', { widget, action, value });
      switch (widget) {
        case 'theme':
          // value: 'light', 'dark', 'system', OR a color theme name (pulse, viper, echo, etc.)
          if (value) {
            const v = value as string;
            console.log('[App] theme widget, value:', v, 'checking against known themes');
            // Check if it's a color theme name (applyColorTheme handles wallpaper + CSS vars)
            if (v !== 'light' && v !== 'dark' && v !== 'system') {
              // It's a named color theme (pulse, viper, echo, etc.)
              console.log('[App] Applying color theme:', v);
              applyColorTheme(v);
              saveColorTheme(v);
            } else {
              // Base theme
              const themeVal = v === 'system' ? 'dark' : v;
              console.log('[App] Applying base theme:', themeVal);
              applyTheme(themeVal as 'light' | 'dark');
              saveTheme(themeVal as any);
            }
          }
          break;
        case 'accentColor':
          // value: 'blue', 'purple', 'green', 'orange', 'pink', 'cyan', or theme name like 'viper'
          if (value) {
            const v = value as string;
            // Check if it's a known accent color
            const knownAccents: string[] = ['blue', 'purple', 'green', 'orange', 'pink', 'cyan'];
            if (knownAccents.includes(v)) {
              applyAccent(v as any);
              saveAccent(v as any);
            } else {
              // Treat as a color theme name (e.g., 'viper' → green accent)
              applyColorTheme(v);
              saveColorTheme(v);
            }
          }
          break;
        case 'wallpaper':
          // value: wallpaper URL string
          if (value) setWallpaper(value);
          break;
        case 'sidebar':
          // sidebar control removed — kept as no-op for event compat
          break;
        case 'activeApp':
          // value: view name string (dashboard, kitchen, budget, life, etc.)
          // Use setImmersiveView to show full-screen app views.
          if (value) setImmersiveView(value as View);
          break;
        case 'chat':
          // action: 'open' | 'close' | 'toggle', value: optionally agent id
          if (action === 'toggle') setChatOpen(prev => !prev);
          else if (action === 'open') { setChatOpen(true); if (value) { /* route to specific agent */ } }
          else if (action === 'close') setChatOpen(false);
          break;
        case 'voiceChat':
          // action: 'toggle' | 'open' | 'close'
          if (action === 'toggle') setVoiceChatOpen(prev => !prev);
          else if (action === 'open') setVoiceChatOpen(true);
          else if (action === 'close') setVoiceChatOpen(false);
          break;
        case 'controlRoom':
          // action: 'toggle' | 'open' | 'close'
          if (action === 'toggle') setControlRoom(prev => !prev);
          else if (action === 'open') setControlRoom(true);
          else if (action === 'close') setControlRoom(false);
          break;
        case 'immersiveApp':
          // value: app name to enter immersive mode (kitchen, budget, life, dreams, home, vault)
          if (value) setImmersiveView(value as View);
          break;
        case 'exitImmersive':
          // exit immersive/fullscreen app mode
          setImmersiveView(null);
          break;
        case 'pushToTalk':
          // action: 'toggle' | 'start' | 'stop', value: optionally duration in ms
          if (action === 'toggle') setIsPushToTalkActive(prev => !prev);
          else if (action === 'start') setIsPushToTalkActive(true);
          else if (action === 'stop') setIsPushToTalkActive(false);
          break;
        case 'barVersion':
          // value: 'v1' or 'v2'
          if (value === 'v1') setUseBarV2(false);
          else if (value === 'v2') setUseBarV2(true);
          break;
        case 'confluxBar':
          // value: 'show' or 'hide'
          if (value === 'show') setUseBarV2(true);
          else if (value === 'hide') setUseBarV2(false);
          break;
        case 'chatExpanded':
          // action: 'expand' | 'collapse' | 'toggle'
          if (action === 'toggle') setExpandedChat(prev => !prev);
          else if (action === 'expand') setExpandedChat(true);
          else if (action === 'collapse') setExpandedChat(false);
          break;
        default:
          console.log('[App] Unknown ui_action widget:', widget);
      }
    };

    window.addEventListener('conflux:theme-change', onThemeChange);
    window.addEventListener('conflux:accent-change', onAccentChange);
    window.addEventListener('conflux:wallpaper-change', onWallpaperChange);
    // Tauri v2: custom Tauri events must use @tauri-apps/api/event listen(),
    // NOT window.addEventListener (different event delivery systems).
    import('@tauri-apps/api/event').then(({ listen }) => {
      // Handle theme changes from Conflux AI (ui_action with widget="theme")
      // Call applyColorTheme + saveColorTheme directly — same as TopBar dropdown.
      listen<{widget: string; action: string; value: any}>('conflux:ui-action', (event) => {
        const { widget, action, value } = event.payload;
        if (widget === 'theme' && value) {
          const v = value as string;
          if (v !== 'light' && v !== 'dark' && v !== 'system') {
            console.log('[App] Tauri: applying color theme via listen():', v);
            applyColorTheme(v);
            saveColorTheme(v);
          } else {
            const themeVal = v === 'system' ? 'dark' : v;
            applyTheme(themeVal as 'light' | 'dark');
            saveTheme(themeVal as any);
          }
        } else {
          // Pass other widgets to the existing onUiAction handler
          onUiAction({ detail: event.payload } as any);
        }
      }).catch(e => console.warn('[App] listen conflux:ui-action error:', e));


    });
    return () => {
      window.removeEventListener('conflux:theme-change', onThemeChange);
      window.removeEventListener('conflux:accent-change', onAccentChange);
      window.removeEventListener('conflux:wallpaper-change', onWallpaperChange);
      window.removeEventListener('conflux:ui-action', onUiAction);
    };
  }, []);

  const [isOnboarded, setIsOnboarded] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showIntroductions, setShowIntroductions] = useState(true);
  const [showBootCards, setShowBootCards] = useState(() => {
    // Disabled by ZigBot on 2026-04-06 per Don's request
    return false;
  });

  // Load onboarding state from backend on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let retries = 3;
      while (retries > 0) {
        try {
          const profile = await invoke<any>('get_user_profile');
          if (cancelled) return;
          console.log('[App] get_user_profile returned:', JSON.stringify(profile));
          if (profile?.onboarded) {
            setIsOnboarded(true);
            if (profile.name) setUserName(profile.name);
            if (profile.selected_apps) {
              setSelectedAgentIds(profile.selected_apps);
            }
            if (profile.goals) {
              localStorage.setItem('conflux-goals', JSON.stringify(profile.goals));
            }
          } else {
            // Fallback to localStorage for migration
            const lsOnboarded = localStorage.getItem('conflux-onboarded') === 'true';
            if (lsOnboarded) {
              setIsOnboarded(true);
              const name = localStorage.getItem('conflux-name') || 'there';
              setUserName(name);
              const apps = localStorage.getItem('conflux-setup-apps');
              if (apps) setSelectedAgentIds(JSON.parse(apps));
              // Migrate to backend
              await invoke('save_user_profile', {
                profile: {
                  name,
                  onboarded: true,
                  goals: localStorage.getItem('conflux-goals')
                    ? JSON.parse(localStorage.getItem('conflux-goals')!)
                    : null,
                  selected_apps: apps ? JSON.parse(apps) : null,
                },
              });
            }
            setShowIntroductions(
              localStorage.getItem('conflux-introductions-complete') !== 'true'
            );
          }
          return; // Success — exit retry loop
        } catch (e: any) {
          retries--;
          if (retries === 0) {
            console.warn('[App] Failed to load user profile from backend:', e);
            if (typeof window !== 'undefined' && window.alert) {
              window.alert(`Profile load failed: ${e?.message || String(e)}`);
            }
            // Fallback to localStorage
            const lsOnboarded = localStorage.getItem('conflux-onboarded') === 'true';
            setIsOnboarded(lsOnboarded);
            setShowIntroductions(
              localStorage.getItem('conflux-introductions-complete') !== 'true'
            );
          } else {
            await new Promise(r => setTimeout(r, 500));
          }
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);



  // Push-to-Talk — stable refs so VoiceFAB and keyboard share the same functions
  const pttActiveRef = useRef(false);
  const pttCancelledRef = useRef(false);
  const startPTTRef = useRef<(() => Promise<void>) | null>(null);
  const stopPTTRef = useRef<(() => Promise<void>) | null>(null);

  // Handle voice input -> Chat -> TTS (extracted from PTT effect for stability)
  const handleVoiceInput = useCallback(async (text: string) => {
      try {
        // Set Conflux to 'thinking' state
        // We'll use a custom event to trigger this in ConfluxOrbit
        window.dispatchEvent(new CustomEvent('conflux-thinking', { detail: { text } }));

        // Route to the main chat engine (using Conflux as the primary persona)
        // Using an existing session ID found in the DB to avoid FK errors
        // Create or reuse a session for voice chat
        // First, try to get existing sessions for 'conflux' agent
        const sessions = await invoke('engine_get_sessions', { limit: 10 });
        let sessionId = 'e95f3a8e-9246-48e3-a70b-0ae13d164d1a'; // fallback
        
        if (Array.isArray(sessions) && sessions.length > 0) {
          // Look for an active session with the 'conflux' agent
          const voiceSession = sessions.find((s: any) => s.agent_id === 'conflux');
          if (voiceSession) {
            sessionId = voiceSession.id;
          } else {
            // Create a new session for voice chat
            const newSession = await invoke('engine_create_session', { agent_id: 'conflux' });
            sessionId = (newSession as any).id;
          }
        } else {
          // No sessions found, create a new one
          const newSession = await invoke('engine_create_session', { agent_id: 'conflux' });
          sessionId = (newSession as any).id;
        }

        const response = await invoke('engine_chat', {
          req: {
            session_id: sessionId,
            agent_id: 'conflux',
            message: text,
          }
        });

        // Trigger TTS for the response
        const chatResponse = response as any;
        if (chatResponse.content) {
          try {
            // Strip JSON tool-call blocks from TTS input.
            // The model sometimes outputs JSON tool calls as text (e.g. {"name": "ui_action", ...}).
            // Remove anything that looks like a JSON object with "name" and "arguments" fields.
            const rawText = chatResponse.content;
            let cleaned = rawText;
            try {
              // Parse and reconstruct, removing any top-level key whose value looks like a tool call
              const parsed = JSON.parse(rawText);
              cleaned = typeof parsed === 'string' ? parsed : rawText;
            } catch {
              // Not valid JSON — try to strip tool-call JSON fragments from plain text.
              // Match {...} blocks containing "name" and "arguments" (tool-call pattern).
              cleaned = rawText
                .replace(/\x5Bthink\x5D[\s\S]*?\x5B\/think\x5D/gi, '')
                .replace(/\x3Cthink\x3E[\s\S]*?<\/think>/gi, '')
                .replace(
                  /\{\s*"name"\s*:\s*"[^"]+"\s*,\s*"arguments"\s*:\s*\{[^}]*\}\s*\}/g,
                  ''
                )
                .replace(
                  /\{\s*"name"\s*:\s*"[^"]+"\s*,\s*"arguments"\s*:\s*\{[^}]*\}\s*,?\s*\}/g,
                  ''
                )
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            }
            const textToSpeak = cleaned.length > 3 ? cleaned : rawText;
            await invoke('voice_synthesize', {
              text: textToSpeak,
            });
          } catch (ttsErr) {
            // TTS failed — ensure fairy returns to idle so it doesn't get stuck
            console.warn('[Voice] TTS failed:', ttsErr);
            window.dispatchEvent(new CustomEvent('conflux-idle'));
          }
        } else {
          // No content to speak — return to idle
          console.log('[Voice] Chat returned no content — returning to idle');
          window.dispatchEvent(new CustomEvent('conflux-force-idle'));
        }
      } catch (err) {
        console.error('[Voice] Chat failed:', err);
        window.dispatchEvent(new CustomEvent('conflux-force-idle'));
      }
    }, []);

  // Push-to-Talk: start recording
  const startPTT = useCallback(async () => {
    if (pttActiveRef.current) return;
    pttCancelledRef.current = false;
    pttActiveRef.current = true;
    setIsPushToTalkActive(true);
    soundManager.playAgentWake('conflux');
    try {
      if (isAndroid) {
        await androidStartListening();
      } else {
        await invoke('voice_capture_start');
      }
      // Only dispatch if we weren't cancelled during startup
      if (pttCancelledRef.current) return;
      window.dispatchEvent(new CustomEvent('push-to-talk-start'));
    } catch (err) {
      console.error('[PTT] Failed to start voice capture:', err);
      pttActiveRef.current = false;
      setIsPushToTalkActive(false);
      window.dispatchEvent(new CustomEvent('conflux-force-idle'));
    }
  }, [handleVoiceInput]);

  // Push-to-Talk: stop recording and transcribe
  const stopPTT = useCallback(async () => {
    if (pttCancelledRef.current) {
      pttActiveRef.current = false;
      setIsPushToTalkActive(false);
      return;
    }
    pttActiveRef.current = false;
    setIsPushToTalkActive(false);
    window.dispatchEvent(new CustomEvent('push-to-talk-end'));

    try {
      // ── Android path: getUserMedia → MediaRecorder → ElevenLabs STT ──
      if (isAndroid) {
        window.dispatchEvent(new CustomEvent('conflux-thinking', { detail: { text: '(transcribing...)' } }));
        const audioBlob = await androidStopListening();

        if (!audioBlob || audioBlob.size < 1000) {
          console.log('[PTT] Android: no meaningful audio captured');
          window.dispatchEvent(new CustomEvent('conflux-force-idle'));
          window.dispatchEvent(new CustomEvent('conflux-transcription-done'));
          return;
        }

        console.log('[PTT] Android: audio blob size:', audioBlob.size, 'bytes');

        // Convert blob to base64 for Tauri command
        const arrayBuffer = await audioBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const audioBase64 = btoa(binary);

        console.log('[PTT] Android: sending', audioBase64.length, 'base64 chars to ElevenLabs STT');

        try {
          const transcript = await invoke<string>('voice_transcribe_audio', { audioBase64 });
          if (transcript && transcript.trim()) {
            console.log('[PTT] Android STT transcript:', transcript);
            await handleVoiceInput(transcript.trim());
          } else {
            console.log('[PTT] Android STT returned empty — no speech detected');
            window.dispatchEvent(new CustomEvent('conflux-force-idle'));
          }
        } catch (sttErr) {
          console.error('[PTT] Android STT failed:', sttErr);
          window.dispatchEvent(new CustomEvent('conflux-force-idle'));
        }

        window.dispatchEvent(new CustomEvent('conflux-transcription-done'));
        return;
      }

      // ── Desktop path: cpal + ElevenLabs ──
      const result = await invoke<{ samples: number; duration_seconds: number; transcript?: string | null }>('voice_capture_stop');

      // Guard: no audio recorded (quick click/tap without speech)
      if (!result.samples || result.samples < 1600) {
        console.log('[PTT] No meaningful audio captured (%d samples) — returning to idle', result.samples);
        window.dispatchEvent(new CustomEvent('conflux-force-idle'));
        return;
      }

      window.dispatchEvent(new CustomEvent('conflux-thinking', { detail: { text: '(transcribing...)' } }));

      // Fast path: realtime STT already gave us a transcript synchronously
      if (result.transcript && result.transcript.trim()) {
        console.log('[PTT] Realtime STT transcript:', result.transcript);
        await handleVoiceInput(result.transcript.trim());
        return;
      }

      // Fallback: wait for conflux:transcription event
      const eventText = await new Promise<string>(async (resolve) => {
        const unlisten = await listen<{ text: string }>('conflux:transcription', (event) => {
          clearTimeout(timeoutId);
          unlisten();
          if (event.payload?.text) resolve(event.payload.text);
          else resolve('');
        });
        let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
          unlisten();
          resolve('');
        }, 3000);
      });

      if (eventText && eventText.trim()) {
        console.log('[PTT] Realtime STT via event:', eventText);
        await handleVoiceInput(eventText.trim());
        return;
      }

      // Last resort: batch STT
      console.log('[PTT] No realtime transcript — calling ElevenLabs batch STT...');
      try {
        const text = await invoke<string>('voice_transcribe');
        if (text && text.trim()) {
          console.log('[PTT] Batch STT transcript:', text);
          await handleVoiceInput(text.trim());
          return;
        }
        console.log('[PTT] Batch STT returned empty transcript — returning to idle');
        window.dispatchEvent(new CustomEvent('conflux-force-idle'));
      } catch (e) {
        console.error('[PTT] Batch STT failed:', e);
        window.dispatchEvent(new CustomEvent('conflux-force-idle'));
      }
    } catch (err) {
      console.error('[PTT] Transcription/Chat failed:', err);
      window.dispatchEvent(new CustomEvent('conflux-force-idle'));
    } finally {
      window.dispatchEvent(new CustomEvent('conflux-transcription-done'));
    }
  }, [handleVoiceInput]);

  // Expose to VoiceFAB via refs
  startPTTRef.current = startPTT;
  stopPTTRef.current = stopPTT;

  // Keyboard: Space for PTT, Esc/Backspace to cancel
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Esc or Backspace cancels PTT without transcribing
      if ((e.key === 'Escape' || e.key === 'Backspace') && pttActiveRef.current) {
        e.preventDefault();
        pttCancelledRef.current = true;
        pttActiveRef.current = false;
        setIsPushToTalkActive(false);
        window.dispatchEvent(new CustomEvent('push-to-talk-end'));
        try {
          if (isAndroid) {
            androidCancel();
          } else {
            await invoke('voice_capture_stop');
          }
        } catch { /* may already be stopped */ }
        window.dispatchEvent(new CustomEvent('conflux-force-idle'));
        return;
      }

      // Esc also stops TTS playback mid-response
      if (e.key === 'Escape' && isTTSSpeakingRef.current) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('conflux-stop-tts'));
        return;
      }

      if (immersiveView) return;

      if (e.code === 'Space' && !pttActiveRef.current) {
        e.preventDefault();
        await startPTT();
      }
    };

    const handleKeyUp = async (e: KeyboardEvent) => {
      if (e.code === 'Space' && pttActiveRef.current) {
        await stopPTT();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [immersiveView, startPTT, stopPTT]);

  // Track TTS speaking state for stop button
  useEffect(() => {
    const handleTTSStatus = (e: Event) => {
      const speaking = (e as CustomEvent).detail?.speaking ?? false;
      setIsTTSSpeaking(speaking);
      isTTSSpeakingRef.current = speaking;
    };
    window.addEventListener('conflux:tts-status', handleTTSStatus);
    return () => window.removeEventListener('conflux:tts-status', handleTTSStatus);
  }, []);

  // On first render, clear the session flag so boot cards show every page reload
  useEffect(() => {
    localStorage.removeItem('conflux-boot-cards-seen-this-session');
  }, []);

  const [userName, setUserName] = useState(() => localStorage.getItem('conflux-name') || 'there');
  // Keep in sync with AgentsView DEFAULT_ACTIVE_AGENTS
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('conflux-selected-agents');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    // Fresh install or empty — use same defaults as AgentsView so Desktop
    // renders with the right agents while AgentsView boots async
    return ['conflux', 'helix', 'pulse', 'hearth', 'echo', 'aegis', 'viper'];
  });

  // Listen for agent selection changes from AgentsView
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<string[]>;
      setSelectedAgentIds(customEvent.detail);
    };
    window.addEventListener('conflux:agents-selected', handler);
    return () => window.removeEventListener('conflux:agents-selected', handler);
  }, []);

  // Restore onboarding state from Supabase if localStorage is empty
  useEffect(() => {
    if (!user || isOnboarded) { console.log('[App] Supabase restore: skipped (user=', !!user, 'isOnboarded=', isOnboarded, ')'); return }
    console.log('[App] Supabase restore: checking ch_profiles for user', user.id)
    import('./lib/supabase').then(async ({ supabase }) => {
      const { data, error } = await supabase
        .from('ch_profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()
      if (error) {
        console.warn('[App] Supabase ch_profiles query error:', error.message)
        return
      }
      // If user has a display_name in Supabase, they completed onboarding on another device
      if (data?.display_name) {
        console.log('[App] ✅ User has profile in Supabase, syncing name')
        localStorage.setItem('conflux-onboarded', 'true')
        localStorage.setItem('conflux-name', data.display_name)
        setUserName(data.display_name)
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
  const [activeNaniSolitaire, setActiveNaniSolitaire] = useState(false);
  const [activeJohnnySolitaire, setActiveJohnnySolitaire] = useState(false);
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

  // Phase 0.4: Agent status data
  const { statusList: agentStatuses } = useAgentStatus(user?.id ?? '', activeMemberId || undefined);
  const [showStatusPanel, setShowStatusPanel] = useState(false);
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
        agent_id: selectedAgent.id,
        user_id: user!.id,
        title: null,
      });
      setVoiceSessionId(sessionId);
    }

    // Import and call syncSessionToEngine before making the request
    const { syncSessionToEngine } = await import('@/lib/syncSession');
    await syncSessionToEngine();

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
      if (gameId === 'minesweeper') { setImmersiveView('story'); setActiveMinesweeper(true); }
      else if (gameId === 'snake') { setImmersiveView('story'); setActiveSnake(true); }
      else if (gameId === 'pacman') { setImmersiveView('story'); setActivePacman(true); }
      else if (gameId === 'solitaire') { setImmersiveView('story'); setActiveSolitaire(true); }
      else if (gameId === 'nani-solitaire') { setImmersiveView('story'); setActiveNaniSolitaire(true); }
      else if (gameId === 'johnny-solitaire') { setImmersiveView('story'); setActiveJohnnySolitaire(true); }
      else if (gameId === 'stories') { setImmersiveView('story'); setActiveGameId(null); }
      else if (gameId === 'games') {
        setActiveMinesweeper(false);
        setActiveSnake(false);
        setActivePacman(false);
        setActiveSolitaire(false);
        setActiveNaniSolitaire(false);
        setActiveJohnnySolitaire(false);
        setActiveGameId(null);
        setImmersiveView('games');
      }
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
          soundManager.playAgentWake(agent.id);
          localStorage.setItem('conflux-last-chat-agent', agent.id);
          setChatOpen(true);
        }
      }
    };
    window.addEventListener('conflux:open-chat', handler);
    return () => window.removeEventListener('conflux:open-chat', handler);
  }, [agents]);

  // Handle onboarding completion — receives (goals, selectedApps) from the Wizard
  const handleOnboardingComplete = useCallback(async (_goals: string[], selectedApps: string[]) => {
    // Read name from localStorage (Onboarding just saved it there)
    const name = localStorage.getItem('conflux-name') || userName || 'there';
    setUserName(name);

    // 1. Persist to backend (reliable across platforms)
    try {
      await invoke('save_user_profile', {
        profile: {
          name,
          onboarded: true,
          goals: _goals.length ? _goals : null,
          selected_apps: selectedApps.length ? selectedApps : null,
        },
      });
    } catch (e) {
      console.warn('[Onboarding] Failed to save profile to backend:', e);
    }

    // 2. Also keep localStorage as cache
    localStorage.setItem('conflux-onboarded', 'true');
    localStorage.setItem('conflux-setup-apps', JSON.stringify(selectedApps));
    // Ensure Intel dashboard shows correct agent count from the start
    if (!localStorage.getItem('conflux-selected-agents')) {
      localStorage.setItem('conflux-selected-agents', JSON.stringify(['conflux', 'helix', 'pulse', 'hearth', 'echo', 'aegis', 'viper']));
    }

    // 3. Create the Family Member record in the local DB
    if (user) {
      invoke('family_create', {
        req: {
          name,
          age: null as unknown as number,
          age_group: 'adult',
          avatar: '👤',
          color: '#6366f1',
          default_agent_id: 'conflux',
          parent_id: null
        }
      }).catch(e => console.error('[Onboarding] Failed to create family member:', e));

      // 4. Save onboarding state to Supabase
      import('./lib/supabase').then(({ supabase }) => {
        supabase.from('ch_profiles').upsert({
          id: user.id,
          display_name: name,
        }).then(({ error }) => { if (error) console.warn('[Onboarding] Supabase upsert failed:', error) })
      })
      trackEvent(user.id, null, 'onboarding_completed', { selectedApps })
    }

    setIsOnboarded(true);

    // Onboarding IS the welcome — skip WelcomeOverlay
    localStorage.setItem('conflux-welcomed', 'true');
    // Tour V2 — auto-start after onboarding
    if (localStorage.getItem('conflux-tour-v2-completed') !== 'true') {
      setTimeout(() => setShowTour(true), 1500);
    }
  }, [user, userName]);

  // Handle welcome dismiss
  const handleWelcomeComplete = useCallback(() => {
    setShowWelcome(false);
    const introductionsComplete = localStorage.getItem('conflux-introductions-complete') === 'true';
    if (!introductionsComplete) {
      setShowIntroductions(true);
    } else if (localStorage.getItem('conflux-tour-v2-completed') !== 'true') {
      setShowTour(true);
    }
  }, []);

  // Handle introductions completion
  const handleIntroductionsComplete = useCallback(() => {
    setShowIntroductions(false);
    // Show boot cards after introductions
    setShowBootCards(true);
    // Tour V2 — auto-start after introductions
    if (localStorage.getItem('conflux-tour-v2-completed') !== 'true') {
      setShowTour(true);
    }
  }, []);

  // Tour V2 — auto-start for already-onboarded users on mount
  useEffect(() => {
    if (isOnboarded && !showWelcome && localStorage.getItem('conflux-tour-v2-completed') !== 'true') {
      const timer = setTimeout(() => setShowTour(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isOnboarded, showWelcome]);

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

  // ── Phase 0.3: Intent Router ──
  const handleIntentRoute = useCallback((intent: any) => {
    if (intent.view === 'chat') {
      onOpenGlobalChat(intent.prompt);
    } else {
      setImmersiveView(intent.view as View);
      const targetAgent = agents.find(a => a.id === intent.agentId);
      if (targetAgent) {
        setSelectedAgent(targetAgent);
        soundManager.playAgentWake(targetAgent.id);
        localStorage.setItem('conflux-last-chat-agent', targetAgent.id);
        setChatOpen(true);
      }
    }
  }, [agents]);

  const onOpenGlobalChat = useCallback((message?: string) => {
    if (!selectedAgent) {
      const lastAgentId = localStorage.getItem('conflux-last-chat-agent');
      const byLast = lastAgentId ? agents.find(a => a.id === lastAgentId) : null;
      const byConflux = agents.find(a => a.id === 'conflux' || a.name.toLowerCase() === 'conflux');
      const byActive = agents.find(a => a.status !== 'offline');
      const pick = byLast || byConflux || byActive || agents[0];
      if (pick) setSelectedAgent(pick);
    }
    setChatOpen(true);
    if (message) {
      window.dispatchEvent(new CustomEvent('conflux:prefill-chat', { detail: message }));
    }
  }, [agents, selectedAgent]);

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
    setActiveNaniSolitaire(false);
    setActiveJohnnySolitaire(false);
    setActiveGameId(null);

    // Notify desktop components to collapse any expanded views
    window.dispatchEvent(new CustomEvent('conflux:navigate', { detail: v }));

    setView(v);
    if (v === 'dashboard') {
      // Home → go to desktop (close any immersive view)
      setImmersiveView(null);
      setChatOpen(false);
      setVoiceChatOpen(false);
    } else if (v === 'games') {
      setActiveMinesweeper(false);
      setActiveSnake(false);
      setActivePacman(false);
      setActiveSolitaire(false);
      setActiveNaniSolitaire(false);
      setActiveJohnnySolitaire(false);
      setActiveGameId(null);
      setImmersiveView('games');
      setChatOpen(false);
    } else if (v === 'marketplace' || v === 'bazaar') {
      // Discover → open marketplace
      setImmersiveView('marketplace');
    } else if (v === 'security' || v === 'security-hub') {
      setImmersiveView('security');
    } else if (v === 'family' || v === 'agents') {
      setImmersiveView('family');
    } else if (v === 'mirror' || v === 'echo') {
      setImmersiveView('mirror');
    } else if (v === 'api' || v === 'api-dashboard') {
      setImmersiveView('api-dashboard');
    } else if (v === 'current' || v === 'radar') {
      // Coming soon — show a toast and return to dashboard
      toast('Ripple Radar coming soon — hang tight!', 'info');
      setView('dashboard');
    } else if (v === 'aegis' || v === 'viper' || v === 'agent-audit' || v === 'siem') {
      setImmersiveView(v);
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
      // Chat opens as overlay on top of whatever view is active
      // We do NOT set immersiveView to null here
      setChatOpen(true);
    } else if (v === 'settings') {
      // Settings renders as an immersive view (not a desktop overlay)
      setImmersiveView('settings');
      setChatOpen(false);
    } else {
      // All other apps — hearth, pulse, orbit, horizon, foundation, agents, echo, vault, studio, etc.
      setImmersiveView(v);
      setChatOpen(false);
    }
  }, [agents, selectedAgent]);

  // Close game and return to Games hub
  const closeGame = useCallback(() => {
    setActiveMinesweeper(false);
    setActiveSnake(false);
    setActivePacman(false);
    setActiveSolitaire(false);
    setActiveNaniSolitaire(false);
    setActiveJohnnySolitaire(false);
    setActiveGameId(null);
    window.dispatchEvent(new CustomEvent('conflux:navigate', {
      detail: { viewId: 'games', gameId: 'games' },
    }));
  }, []);

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
  console.log('[App] Gate: loaded=', loaded, '| isAuthCallback=', isAuthCallback, '| authLoading=', authLoading, '| authenticated=', authenticated, '| isOnboarded=', isOnboarded);
  if (!loaded) {
    console.log('[App] → Rendering SplashScreen');
    return <SplashScreen onComplete={() => setLoaded(true)} />;
  }

  // ── Gate: Auth callback (magic link / OAuth redirect) ──
  if (isAuthCallback) {
    console.log('[App] → Rendering AuthCallback');
    return <AuthCallback onComplete={() => setIsAuthCallback(false)} />;
  }

  // ── Gate: Auth ──
  if (authLoading) {
    console.log('[App] → Rendering auth loading spinner');
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a1a' }}>
        <img src="/logo_v1.png" alt="Conflux" style={{ width: 32, height: 32, objectFit: 'contain' }} />
      </div>
    );
  }

  if (!authenticated) {
    console.log('[App] → Rendering LoginScreen (not authenticated)');
    return <LoginScreen onAuthSuccess={() => { console.log('[App] onAuthSuccess called'); }} />;
  }

  // ── Gate: Onboarding ──
  console.log('[App] Gate check — isOnboarded:', isOnboarded, '| user:', user?.id);
  if (!isOnboarded) {
    console.log('[App] → Rendering Onboarding (isOnboarded=false)');
    return <Onboarding onComplete={handleOnboardingComplete} />;
  } else {
    console.log('[App] → Skipping Onboarding (isOnboarded=true)');
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

  // ── Gate: Agent Introductions ──
  // Disabled by ZigBot on 2026-04-06 per Don's request
  if (false && showIntroductions) {
    return (
      <AgentIntroductions
        userName={userName}
        selectedAgentIds={selectedAgentIds}
        userId={user?.id ?? ''}
        familyMemberId={activeMemberId ?? undefined}
        onComplete={handleIntroductionsComplete}
      />
    );
  }

  return (
    <AuthProvider>
    <div className="desktop-shell">
      {false && showBootCards && (
        <AgentBootCards
          userId={user?.id ?? ''}
          members={familyMembers}
          onComplete={() => {
            setShowBootCards(false);
            localStorage.setItem('conflux-boot-cards-seen-this-session', 'true');
          }}
        />
      )}
      {showTour && <TourV2 onComplete={() => setShowTour(false)} onNavigate={(v) => handleNavigate(v as View)} />}
      <TopBar
        selectedAgent={selectedAgent}
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
            onNavigate={(v) => handleNavigate(v)}
          />
        ) : (
          <Desktop
            agents={selectedAgentIds.length > 0 ? filteredAgents : agents}
            wallpaper={wallpaper || undefined}
            onNavigate={(v) => handleNavigate(v)}
          />
        )
      )}

      {/* Family Switcher — moved to TopBar popup (removed from desktop) */}

      {/* Immersive full-screen view — wraps app content with custom background */}
      {immersiveView && (
        <ImmersiveView
          view={immersiveView}
          backgroundUrl={(immersiveView === 'story' && activeNaniSolitaire) ? '/backgrounds/nani-solitaire-bg.webp' : VIEW_BACKGROUNDS[immersiveView] || '/backgrounds/dashboard-bg.webp'}
          onClose={() => setImmersiveView(null)}
        >
          {immersiveView === 'hearth' && <KitchenView />}
          {immersiveView === 'pulse' && <PulseWrapper />}
          {immersiveView === 'orbit' && <LifeAutopilotView />}
          {immersiveView === 'foundation' && <HomeHealthView />}
          {immersiveView === 'horizon' && <DreamBuilderView />}
          {immersiveView === 'google' && <GoogleView />}
          {immersiveView === 'marketplace' && (
            <MarketplaceNew />
          )}
          {immersiveView === 'family' && <AgentsView />}
          {immersiveView === 'mirror' && <EchoView />}
          {immersiveView === 'vault' && <VaultView />}
          {immersiveView === 'studio' && <StudioView />}
          {immersiveView === 'settings' && <Settings />}
          {immersiveView === 'grove' && <GroveView />}
          {immersiveView === 'security' && <SecurityDashboard />}
          {immersiveView === 'aegis' && <AegisDashboard />}
          {immersiveView === 'viper' && <ViperDashboard />}
          {immersiveView === 'agent-audit' && <AgentAuditDashboard />}
          {immersiveView === 'siem' && <SIEMDashboard />}
          {immersiveView === 'security-hub' && <SecurityDashboard />}
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
                  { label: 'Active Agents', value: liveAgents, sub: 'online now', icon: '/logo_v1.png' },
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
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{stat.icon ? <img src={stat.icon} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} /> : stat.emoji}</div>
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
          {immersiveView === 'games' && <GamesPage onBack={() => {
            window.dispatchEvent(new CustomEvent('conflux:navigate', { detail: 'dashboard' }));
            window.dispatchEvent(new CustomEvent('conflux:expand-category', { detail: 'discover' }));
            setImmersiveView(null);
          }} />}
          {immersiveView === 'story' && activeMinesweeper && (
            <MinesweeperGame onBack={closeGame} />
          )}
          {immersiveView === 'story' && activeSnake && (
            <SnakeGame onBack={closeGame} />
          )}
          {immersiveView === 'story' && activePacman && (
            <PacmanGame onBack={closeGame} />
          )}
          {immersiveView === 'story' && activeSolitaire && (
            <SolitaireGame onBack={closeGame} />
          )}
          {immersiveView === 'story' && activeNaniSolitaire && (
            <NaniSolitaireGame onBack={closeGame} />
          )}
          {immersiveView === 'story' && activeJohnnySolitaire && (
            <JohnnySolitaireGame onBack={closeGame} />
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

      {/* Conflux Brain + New Visuals — context provider, StatusOrb, DockGlow, VoiceFAB */}
      <ConfluxOrbit
        view={view}
        immersiveView={immersiveView}
        chatOpen={chatOpen}
        voiceChatOpen={voiceChatOpen}
        isPushToTalkActive={isPushToTalkActive}
      >
        <ConfluxShell
          isPushToTalkActive={isPushToTalkActive}
          onStartPTT={() => startPTTRef.current?.()}
          onStopPTT={() => stopPTTRef.current?.()}
        >
          {useBarV2 ? (
            <ConfluxBarV2
              currentView={view}
              agents={agents}
              selectedAgentIds={selectedAgentIds}
              pinnedApps={['chat', 'hearth', 'pulse', 'settings']}
              onNavigate={handleNavigate}
            />
          ) : (
            <ConfluxBar
              currentView={view}
              agents={agents}
              pinnedApps={['chat', 'hearth', 'pulse', 'settings']}
              onNavigate={handleNavigate}
            />
          )}
        </ConfluxShell>
      </ConfluxOrbit>

      {/* Nudge Toasts — replaces fairy speech bubbles */}
      <NudgeToast />

      {/* Stop TTS button — appears when Conflux is speaking, Esc on desktop, tap on mobile */}
      {isTTSSpeaking && (
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('conflux-stop-tts'))}
          style={{
            position: 'fixed',
            bottom: 100,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            background: 'rgba(220, 38, 38, 0.9)',
            color: '#fff',
            border: 'none',
            borderRadius: 24,
            padding: '10px 24px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(220, 38, 38, 0.4)',

          }}
        >
          ⏹ Stop Speaking
        </button>
      )}

      {/* Agent Detail Modal — listens for conflux:agent-detail events */}
      <AgentDetail />

      {/* Phase 0.4: Agent Status Panel */}
      {showStatusPanel && (
        <AgentStatusPanel
          statuses={agentStatuses}
          onClose={() => setShowStatusPanel(false)}
          onOpenApp={(agentId) => {
            const viewMap: Record<string, View> = {
              hearth: 'hearth',
              pulse: 'pulse',
              orbit: 'orbit',
              horizon: 'horizon',
            };
            setShowStatusPanel(false);
            if (viewMap[agentId]) setImmersiveView(viewMap[agentId]);
          }}
        />
      )}

      <UpdateBanner />

      {/* Toast notifications */}
      {/* Skill creation prompt — global overlay, fires on any view */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
    </AuthProvider>
  );
}
