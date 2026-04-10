import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { playTourBlip, playHeartbeat, playWelcomeChime } from '../lib/sound';
import { NeuralBrainScene } from './NeuralBrainScene';
import { COMMANDS } from '../lib/neuralBrain';
import ConfluxOrbit from './ConfluxOrbit';
import { useAuth } from '../hooks/useAuth';
import '../styles/animations.css';

// ── Types ──

interface OnboardingProps {
  onComplete: (goals: string[], selectedApps: string[]) => void;
}

// ── Apps for Step 2 ──

interface AppOption {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

const APPS: AppOption[] = [
  { id: 'budget', name: 'Budget', emoji: '💰', description: 'Track expenses and savings' },
  { id: 'kitchen', name: 'Kitchen', emoji: '🍳', description: 'Recipes and meal planning' },
  { id: 'dreams', name: 'Dreams', emoji: '✨', description: 'Goals and aspirations' },
  { id: 'life', name: 'Life', emoji: '🏠', description: 'Daily tasks and organization' },
];

// Wizard choreography sequence for Step 3 setup
const WIZARD_SEQUENCE = [
  { x: 0.5, y: 0.5, delay: 1200, label: 'Initializing...' },
  { x: 0.1, y: 0.5, delay: 1500, label: 'Setting up Budget' },
  { x: 0.9, y: 0.5, delay: 1500, label: 'Stocking Kitchen' },
  { x: 0.5, y: 0.2, delay: 1500, label: 'Creating Dreams' },
  { x: 0.5, y: 0.5, delay: 1000, label: 'Done!' },
];

// ── Heartbeat SVG Component ──

function HeartbeatSVG({ active, variant = 'default' }: { active: boolean; variant?: 'default' | 'pulse' }) {
  return (
    <svg viewBox="0 0 400 80" style={{ width: '100%', maxWidth: 400, height: 80 }}>
      <path
        d="M0,40 L60,40 L70,40 L80,20 L90,60 L100,10 L110,70 L120,40 L130,40 L200,40 L210,40 L220,20 L230,60 L240,10 L250,70 L260,40 L270,40 L340,40 L350,40 L360,20 L370,60 L380,10 L390,70 L400,40"
        fill="none"
        stroke={variant === 'pulse' ? '#10b981' : 'var(--accent-primary)'}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 800,
          filter: `drop-shadow(0 0 6px ${variant === 'pulse' ? '#10b981' : 'var(--accent-primary)'})`,
          animation: active
            ? variant === 'pulse'
              ? 'heartbeat-pulse 1.5s ease-in-out infinite'
              : 'heartbeat-draw 2s linear infinite'
            : 'none',
        }}
      />
    </svg>
  );
}

// ── Particles Component ──

function Particles({ count = 15 }: { count?: number }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    left: `${5 + Math.random() * 90}%`,
    size: 2 + Math.random() * 2,
    duration: 4 + Math.random() * 4,
    delay: Math.random() * 3,
    opacity: 0.15 + Math.random() * 0.25,
  }));

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            bottom: '-4px',
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: 'var(--accent-primary)',
            opacity: p.opacity,
            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ── Progress Bar Component ──

function ProgressBar({ step }: { step: number }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
      padding: '20px 0 0',
      flexShrink: 0,
    }}>
      {[0, 1, 2, 3, 4].map(i => {
        const isActive = i === step;
        const isDone = i < step;
        return (
          <motion.div
            key={i}
            animate={{
              width: isActive ? 32 : 10,
              backgroundColor: isDone || isActive
                ? 'var(--accent-primary)'
                : 'var(--border)',
              opacity: isDone || isActive ? 1 : 0.4,
            }}
            transition={{ duration: 0.3 }}
            style={{
              width: isActive ? 32 : 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: isDone || isActive
                ? 'var(--accent-primary)'
                : 'var(--border)',
              opacity: isDone || isActive ? 1 : 0.4,
            }}
          />
        );
      })}
    </div>
  );
}

// ── Main Component ──

/**
 * Onboarding Component - 4-Step Wizard Flow
 * 
 * Steps:
 * 0. Heartbeat: Name input + Return support + Heartbeat animation
 * 1. Ice Breaker: Large input for "What do you need help with?"
 * 2. The Checklist: Grid of toggles for Apps to Set Up Now (Budget, Kitchen, Dreams, Life)
 * 3. App Setup (Skeleton): Progress bar showing setup progress
 * 
 * Data Storage:
 * - userName → localStorage: 'conflux-name'
 * - selectedApps → localStorage: 'conflux-setup-apps'
 * 
 * @param onComplete - Callback with selected apps when flow completes
 */
export default function Onboarding({ onComplete }: OnboardingProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);

  // Step 0: Heartbeat - Name input
  const [userName, setUserName] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [heartbeatActive, setHeartbeatActive] = useState(false);

  // Step 1: Ice Breaker - Large text input
  const [iceBreakerInput, setIceBreakerInput] = useState('');

  // Step 2: Checklist - Selected apps
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());

  // Step 3: Interactive Setup State Machine
  const [setupProgress, setSetupProgress] = useState(0);
  const [setupAppName, setSetupAppName] = useState('');
  const [currentSetupApp, setCurrentSetupApp] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [setupQueue, setSetupQueue] = useState<string[]>([]);
  const [setupQueueIndex, setSetupQueueIndex] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<string>>(new Set());
  const [income, setIncome] = useState(5000); // store income across steps

  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play base64 MP3 audio via Web Audio API
  const playBase64Audio = useCallback((base64: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      ctx.decodeAudioData(bytes.buffer).then((buffer) => {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => resolve();
        source.start(0);
      }).catch(reject);
    });
  }, []);

  // Speak the Ice Breaker prompt via ElevenLabs
  const speakPrompt = useCallback(async () => {
    const promptText = `Hey ${userName || 'there'}! Let's get to know each other. What's on your mind today? What do you need help with?`;
    setIsSpeaking(true);
    try {
      const result = await invoke<{ audio_base64: string }>('tts_speak', { text: promptText, voice: 'Conflux' });
      await playBase64Audio(result.audio_base64);
    } catch (err) {
      console.warn('[Onboarding] TTS failed (non-fatal):', err);
    } finally {
      setIsSpeaking(false);
    }
  }, [userName, playBase64Audio]);

  // Load persisted data on mount
  useEffect(() => {
    const savedName = localStorage.getItem('conflux-name');
    if (savedName) setUserName(savedName);

    const savedApps = localStorage.getItem('conflux-setup-apps');
    if (savedApps) {
      try {
        const apps = JSON.parse(savedApps);
        setSelectedApps(new Set(apps));
      } catch (e) {
        console.error('Failed to parse saved apps:', e);
      }
    }
  }, []);

  // Play welcome chime on mount
  useEffect(() => {
    playWelcomeChime();
  }, []);

  // Step 2: Speak the Ice Breaker prompt via TTS (when user sees the question)
  useEffect(() => {
    if (step === 2) {
      speakPrompt();
    }
  }, [step, speakPrompt]);

  // Always dark mode
  useEffect(() => {
    document.body.classList.add('dark');
  }, []);

  // Step 3: Interactive Setup — initialize the queue when entering Step 3
  useEffect(() => {
    if (step !== 3) return;

    const apps = Array.from(selectedApps);
    if (apps.length === 0) {
      onComplete([], []);
      return;
    }

    // Build queue from selected apps and kick off first question
    setSetupQueue(apps);
    setSetupQueueIndex(0);
    setCurrentSetupApp(apps[0]);
    setSetupAppName(APPS.find(a => a.id === apps[0])?.name || apps[0]);
    setUserAnswer('');
    setIsConfiguring(false);
    setSetupProgress(0);
    setCompletedApps(new Set());
  }, [step, selectedApps, onComplete]);

  // Save current app's data and advance to the next question
  const handleSaveAndFly = useCallback(async () => {
    if (!currentSetupApp) return;

    setIsConfiguring(true);
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    // Animate progress bar
    const animateProgress = async () => {
      for (let p = 0; p <= 100; p += 2) {
        setSetupProgress(Math.min(p, 100));
        await delay(16);
      }
    };

    // Income may have been set previously; default to 5000
    const parsedIncome = parseFloat(userAnswer) || 5000;
    if (currentSetupApp === 'budget') {
      setIncome(parsedIncome);
    }

    try {
      switch (currentSetupApp) {
        case 'budget': {
          // Cross-app intelligence: calculate suggested limits
          const groceriesLimit = Math.max(500, Math.min(2000, parsedIncome * 0.15));
          const monthlySavings = parsedIncome * 0.20;
          const isHighIncome = parsedIncome > 7000;
          
          // Prepare categories list
          const categories = ['groceries', 'rent', 'utilities', 'transportation', 'entertainment'];
          if (isHighIncome) categories.push('Premium Pantry');
          
          console.log('[Onboarding] Saving budget data for user:', user?.id);
          
          // Create BudgetSettings (the source of truth for BudgetView)
          await invoke('budget_update_settings', {
            req: {
              pay_frequency: 'semimonthly',
              pay_dates: [1, 15],
              income_amount: parsedIncome,
              currency: 'USD',
            },
            member_id: user?.id || null,
          }).catch(err => console.error('[Onboarding] budget_update_settings failed:', err));
          
          // Create BudgetBuckets for each category
          const bucketColors: Record<string, string> = {
            groceries: '#10b981', rent: '#f59e0b', utilities: '#3b82f6',
            transportation: '#8b5cf6', entertainment: '#ec4899', savings: '#06b6d4',
          };
          const bucketIcons: Record<string, string> = {
            groceries: '🛒', rent: '🏠', utilities: '⚡',
            transportation: '🚗', entertainment: '🎬', savings: '💰',
          };
          for (const cat of categories) {
            const monthlyGoal = cat === 'groceries' ? groceriesLimit
              : cat === 'savings' ? monthlySavings
              : 0;
            await invoke('budget_create_bucket', {
              req: {
                name: cat.charAt(0).toUpperCase() + cat.slice(1),
                icon: bucketIcons[cat] || '📦',
                monthly_goal: monthlyGoal,
                color: bucketColors[cat] || '#6b7280',
              },
              member_id: user?.id || null,
            }).catch(err => console.error('[Onboarding] budget_create_bucket failed:', err));
          }
          
          // Also save legacy budget_entries for cross-app tools
          await invoke('save_budget_data', {
            income: parsedIncome,
            categories: categories,
            member_id: user?.id || null,
          }).catch(err => console.error('[Onboarding] save_budget_data failed:', err));
          
          const today = new Date().toISOString().split('T')[0];
          await invoke('budget_add_entry', {
            member_id: user?.id || null,
            entry_type: 'expense',
            category: 'groceries',
            amount: groceriesLimit,
            description: 'Suggested groceries budget (cross-app intelligence)',
            recurring: true,
            frequency: 'monthly',
            date: today,
          }).catch(err => console.error('[Onboarding] budget_add_entry failed:', err));
          
          await invoke('budget_add_entry', {
            member_id: user?.id || null,
            entry_type: 'savings',
            category: 'savings',
            amount: monthlySavings,
            description: 'Monthly savings projection (cross-app intelligence)',
            recurring: true,
            frequency: 'monthly',
            date: today,
          }).catch(err => console.error('[Onboarding] budget_add_entry failed:', err));
          
          break;
        }
        case 'kitchen': {
          const staples = userAnswer
            ? userAnswer.split(',').map(s => s.trim()).filter(Boolean)
            : ['Rice', 'Olive Oil', 'Salt'];
          // Cross-app intelligence: if Income is high, suggest Premium Pantry (already added in Budget)
          for (const item of staples) {
            // Default quantity for Rice
            let quantity = 1;
            let unit = 'item';
            if (item.toLowerCase() === 'rice') {
              quantity = 5; // default quantity for rice
              unit = 'item';
            }
            await invoke('kitchen_add_inventory', {
              req: {
                name: item,
                quantity: quantity,
                unit: unit,
                category: 'pantry',
                expiry_date: null,
                location: 'pantry',
              },
              member_id: user?.id || null,
            }).catch(err => console.error('[Onboarding] kitchen_add_inventory failed:', err));
          }
          break;
        }
        case 'dreams': {
          const dreamId = crypto.randomUUID?.() || `dream-${Date.now()}`;
          await invoke('dream_add', {
            id: dreamId,
            member_id: user?.id || null,
            title: userAnswer || 'My First Dream',
            description: 'A starter goal to get things rolling!',
            category: 'personal',
            target_date: null,
          }).catch(err => console.error('[Onboarding] dream_add failed:', err));
          // Cross-app intelligence: break dream into a Savings sub-task in Budget (create a goal)
          const dreamTitle = userAnswer || 'My First Dream';
          const monthlyAllocation = Math.round(income * 0.10); // 10% of income towards this dream
          await invoke('budget_create_goal', {
            name: `Save for ${dreamTitle}`,
            target_amount: 0, // unknown target
            deadline: null,
            monthly_allocation: monthlyAllocation,
            member_id: user?.id || null,
          }).catch(err => console.error('[Onboarding] budget_create_goal failed:', err));
          break;
        }
        case 'life': {
          await invoke('life_add_habit', {
            user_id: user?.id || 'default',
            name: userAnswer || 'Morning Routine',
            category: 'wellness',
            frequency: 'daily',
            target_count: 1,
          }).catch(err => console.error('[Onboarding] life_add_habit failed:', err));
          break;
        }
        default:
          await delay(800);
          break;
      }
    } catch (err) {
      console.warn(`[Onboarding] invoke failed for ${currentSetupApp}:`, err);
      await delay(800);
    }

    // Animate progress bar
    await animateProgress();

    // Mark current app as completed
    setCompletedApps(prev => new Set([...prev, currentSetupApp]));

    // Advance to next app in queue
    const nextIndex = setupQueueIndex + 1;
    if (nextIndex < setupQueue.length) {
      setSetupQueueIndex(nextIndex);
      setCurrentSetupApp(setupQueue[nextIndex]);
      setSetupAppName(APPS.find(a => a.id === setupQueue[nextIndex])?.name || setupQueue[nextIndex]);
      setUserAnswer('');
      setSetupProgress(0);
      setIsConfiguring(false);
    } else {
      // All apps configured — finish
      const appsArr = Array.from(selectedApps);
      localStorage.setItem('conflux-onboarded', 'true');
      localStorage.setItem('conflux-name', userName.trim() || 'there');
      localStorage.setItem('conflux-setup-apps', JSON.stringify(appsArr));
      onComplete([], appsArr);
    }
  }, [currentSetupApp, userAnswer, setupQueueIndex, setupQueue, selectedApps, userName, onComplete, income]);

  // Skip current app and advance to next
  const handleSkipApp = useCallback(() => {
    if (!currentSetupApp) return;

    const nextIndex = setupQueueIndex + 1;
    if (nextIndex < setupQueue.length) {
      setSetupQueueIndex(nextIndex);
      setCurrentSetupApp(setupQueue[nextIndex]);
      setSetupAppName(APPS.find(a => a.id === setupQueue[nextIndex])?.name || setupQueue[nextIndex]);
      setUserAnswer('');
      setSetupProgress(0);
      setIsConfiguring(false);
    } else {
      const appsArr = Array.from(selectedApps);
      localStorage.setItem('conflux-onboarded', 'true');
      localStorage.setItem('conflux-name', userName.trim() || 'there');
      localStorage.setItem('conflux-setup-apps', JSON.stringify(appsArr));
      onComplete([], appsArr);
    }
  }, [currentSetupApp, setupQueueIndex, setupQueue, selectedApps, userName, onComplete]);

  // Navigation — use a longer crossfade between steps for smoother transitions
  const goToStep = useCallback((nextStep: number) => {
    playTourBlip();
    setAnimating(true);
    setTimeout(() => {
      setStep(nextStep);
      setTimeout(() => setAnimating(false), 400);
    }, 300);
  }, []);

  const nextStep = () => {
    if (step === 0 && userName.trim().length > 0) {
      localStorage.setItem('conflux-name', userName.trim());
    }
    if (step === 3) {
      const appsArr = Array.from(selectedApps);
      localStorage.setItem('conflux-setup-apps', JSON.stringify(appsArr));
    }
    goToStep(step + 1);
  };

  const prevStep = () => goToStep(step - 1);

  // Toggle app selection
  const toggleApp = (appId: string) => {
    setSelectedApps(prev => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  };

  // Handle Enter key on name input
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && userName.trim().length > 0) {
      nextStep();
    }
  };

  // Render Step 0: Heartbeat
  const renderHeartbeatStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      style={{ textAlign: 'center', maxWidth: 420, width: '100%', margin: '0 auto', position: 'relative' }}
    >
      <Particles count={15} />

      <div style={{ marginBottom: 24 }}>
        <img
          src="/logo.png"
          alt="Conflux Home"
          style={{ width: 96, height: 96, objectFit: 'contain' }}
        />
      </div>

      <h1 style={{
        fontSize: 32,
        fontWeight: 700,
        letterSpacing: '-0.5px',
        color: 'var(--text-primary)',
        marginBottom: 12,
      }}>
        Welcome to Conflux Home
      </h1>

      <p style={{
        fontSize: 17,
        color: 'var(--text-secondary)',
        marginBottom: 32,
        lineHeight: 1.5,
      }}>
        Your AI family is about to come alive.
      </p>
      
      {/* Initial Neural Brain Pulse */}
      <div style={{ marginBottom: 24 }}>
        <NeuralBrainScene 
          command={COMMANDS[0]} 
          pulseImpulse={5} 
          transparent={true}
        />
      </div>

      {/* Heartbeat Animation */}
      <div style={{ marginBottom: 24 }}>
        <HeartbeatSVG active={heartbeatActive} />
      </div>

      <input
        type="text"
        placeholder="What's your name?"
        value={userName}
        onChange={e => setUserName(e.target.value)}
        onKeyDown={handleNameKeyDown}
        onFocus={() => { setIsTyping(true); setHeartbeatActive(true); }}
        onBlur={() => { setIsTyping(false); setHeartbeatActive(false); }}
        style={{
          width: '100%',
          maxWidth: 280,
          padding: '12px 16px',
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          fontSize: 16,
          textAlign: 'center',
          outline: 'none',
          boxSizing: 'border-box',
        }}
        autoFocus
      />

      {userName && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ marginTop: 16, fontSize: 14, color: 'var(--text-secondary)' }}
        >
          Press <kbd style={{
            padding: '2px 8px',
            borderRadius: 4,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            fontSize: 12,
          }}>Enter</kbd> to continue
        </motion.p>
      )}
    </motion.div>
  );


  // Render Step 1: Meet Your Family — Introduce the agent team
  const renderFamilyStep = () => {
    const CORE_AGENTS = [
      { id: 'conflux', name: 'Conflux', emoji: '🧠', tagline: 'Your co-founder who never sleeps.', color: '#00d4ff' },
      { id: 'prism', name: 'Prism', emoji: '🔮', tagline: 'I keep the machine running.', color: '#a855f7' },
      { id: 'forge', name: 'Forge', emoji: '⚒️', tagline: 'Give me a spec, I build it.', color: '#f97316' },
      { id: 'helix', name: 'Helix', emoji: '🧬', tagline: 'Research at the speed of thought.', color: '#06b6d4' },
      { id: 'pulse', name: 'Pulse', emoji: '💚', tagline: 'Your financial heartbeat.', color: '#10b981' },
      { id: 'quanta', name: 'Quanta', emoji: '🔬', tagline: 'I verify. Always.', color: '#eab308' },
      { id: 'vector', name: 'Vector', emoji: '📊', tagline: 'Show me the numbers.', color: '#ef4444' },
      { id: 'spectra', name: 'Spectra', emoji: '🌈', tagline: 'Any problem is just small tasks.', color: '#ec4899' },
      { id: 'luma', name: 'Luma', emoji: '🚀', tagline: 'Ship it.', color: '#8b5cf6' },
    ];

    return (
      <motion.div
        key="step-family"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        transition={{ duration: 0.5 }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          maxWidth: 800, width: '100%', textAlign: 'center',
        }}
      >
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            fontSize: '2rem', fontWeight: 700,
            background: 'linear-gradient(135deg, #00d4ff, #a855f7, #ec4899)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: 8,
          }}
        >
          Meet Your Family
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginBottom: 32, maxWidth: 500 }}
        >
          {userName ? `${userName}, meet` : 'Meet'} the agents who will power your Conflux Home. Each one has a specialty. Together, they're unstoppable.
        </motion.p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          width: '100%',
          maxWidth: 700,
        }}>
          {CORE_AGENTS.map((agent, i) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.12, duration: 0.4, type: 'spring', stiffness: 200 }}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${agent.color}22`,
                borderRadius: 16,
                padding: '20px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                cursor: 'default',
                transition: 'all 0.3s ease',
              }}
              whileHover={{ scale: 1.05, background: `${agent.color}11`, borderColor: `${agent.color}44` }}
            >
              <div style={{
                fontSize: 36,
                filter: `drop-shadow(0 0 8px ${agent.color}66)`,
              }}>
                {agent.emoji}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: agent.color }}>
                {agent.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', lineHeight: 1.3 }}>
                {agent.tagline}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  };

  // Render Step 2: Ice Breaker
  const renderIceBreakerStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      style={{ textAlign: 'center', maxWidth: 520, width: '100%', margin: '0 auto', position: 'relative' }}
    >
      {/* Conflux Presence visible in background of Ice Breaker */}
      <div style={{ position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)' }}>
        <NeuralBrainScene 
          command={isSpeaking ? COMMANDS[3] : COMMANDS[1]} 
          pulseImpulse={isSpeaking ? 24 : 8} 
          transparent={true}
        />
      </div>

      <h1 style={{
        fontSize: 28,
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginBottom: 60,
      }}>
        👋 Hey {userName || 'there'}!
      </h1>

      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 32,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      }}>
        <p style={{
          fontSize: 16,
          color: 'var(--text-secondary)',
          marginBottom: 24,
          lineHeight: 1.6,
        }}>
          Let's get to know each other. What's on your mind today? What do you need help with?
        </p>

        <textarea
          value={iceBreakerInput}
          onChange={e => setIceBreakerInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && iceBreakerInput.trim()) {
              e.preventDefault();
              nextStep();
            }
          }}
          placeholder="What do you need help with?"
          rows={3}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontSize: 16,
            outline: 'none',
            resize: 'none',
            marginBottom: 16,
            boxSizing: 'border-box',
          }}
        />

        <p style={{
          fontSize: 13,
          color: 'var(--text-muted)',
          fontStyle: 'italic',
        }}>
          (This will help us personalize your experience)
        </p>
      </div>
      
      {/* Next button triggers TTS in real app - placeholder for now */}
      <div style={{ marginTop: 32 }}>
        <button
          onClick={nextStep}
          style={{
            padding: '12px 24px',
            borderRadius: 12,
            background: 'var(--accent-primary)',
            color: 'white',
            border: 'none',
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          Let's Build Your Team →
        </button>
      </div>
    </motion.div>
  );

  // Render Step 2: Checklist — smooth exit transitions to App Setup
  const renderChecklistStep = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -10 }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      style={{ textAlign: 'center', maxWidth: 560, width: '100%', margin: '0 auto' }}
    >
      <h2 style={{
        fontSize: 24,
        fontWeight: 700,
        marginBottom: 8,
        color: 'var(--text-primary)',
      }}>
        Apps to Set Up Now
      </h2>
      <p style={{
        fontSize: 14,
        color: 'var(--text-secondary)',
        marginBottom: 24,
      }}>
        Select the apps you'd like to get started with.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 16,
        marginBottom: 24,
      }}>
        {APPS.map((app, index) => {
          const isSelected = selectedApps.has(app.id);
          return (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => toggleApp(app.id)}
              style={{
                padding: 20,
                borderRadius: 14,
                border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border)'}`,
                background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-card)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div style={{ fontSize: 36 }}>{app.emoji}</div>
              <div style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}>
                {app.name}
              </div>
              <div style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                textAlign: 'center',
              }}>
                {app.description}
              </div>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border)'}`,
                background: isSelected ? 'var(--accent-primary)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 4,
              }}>
                {isSelected && (
                  <span style={{ color: '#fff', fontSize: 14 }}>✓</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <p style={{
        fontSize: 13,
        color: 'var(--text-muted)',
      }}>
        {selectedApps.size} app{selectedApps.size !== 1 ? 's' : ''} selected
      </p>
    </motion.div>
  );

  // Get question config for each app type
  const getAppQuestion = (appId: string): { prompt: string; placeholder: string; inputType: string } => {
    switch (appId) {
      case 'budget':
        return {
          prompt: '💰 What is your monthly income?',
          placeholder: 'e.g. 5000',
          inputType: 'number',
        };
      case 'kitchen':
        return {
          prompt: '🍳 What kitchen staples do you have?',
          placeholder: 'e.g. Rice, Olive Oil, Salt (comma-separated)',
          inputType: 'text',
        };
      case 'dreams':
        return {
          prompt: '✨ What\'s your first dream or goal?',
          placeholder: 'e.g. Learn to play guitar',
          inputType: 'text',
        };
      case 'life':
        return {
          prompt: '🏠 What habit do you want to build?',
          placeholder: 'e.g. Morning Routine',
          inputType: 'text',
        };
      default:
        return {
          prompt: `Setting up ${appId}...`,
          placeholder: 'Enter something...',
          inputType: 'text',
        };
    }
  };

  // Render Step 3: Interactive Setup — Question UI with wizard fly animation
  const renderSetupStep = () => {
    if (!currentSetupApp) return null;

    const question = getAppQuestion(currentSetupApp);
    const appInfo = APPS.find(a => a.id === currentSetupApp);
    const isLastApp = setupQueueIndex >= setupQueue.length - 1;

    return (
      <motion.div
        key={currentSetupApp}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        style={{ textAlign: 'center', maxWidth: 520, width: '100%', margin: '0 auto', position: 'relative' }}
      >
        {/* Conflux Wizard — only flies during isConfiguring (save animation) */}
        {isConfiguring && (
          <ConfluxOrbit
            view="dashboard"
            immersiveView={null}
            chatOpen={false}
            voiceChatOpen={false}
            isPushToTalkActive={false}
            wizardMode={true}
            wizardSequence={WIZARD_SEQUENCE}
          />
        )}

        {/* Active Neural Brain in center during setup */}
        <div style={{ position: 'absolute', top: -140, left: '50%', transform: 'translateX(-50%)' }}>
          <NeuralBrainScene
            command={isConfiguring ? COMMANDS[4] : COMMANDS[1]}
            pulseImpulse={isConfiguring ? 10 + (setupProgress / 10) * 3 : 8}
            transparent={true}
          />
        </div>

        {/* App progress indicator — which app in the queue */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
          marginBottom: 24,
          marginTop: 60,
        }}>
          {setupQueue.map((appId, idx) => {
            const app = APPS.find(a => a.id === appId);
            const isCompleted = completedApps.has(appId);
            const isCurrent = appId === currentSetupApp && !isConfiguring;
            const isProcessing = appId === currentSetupApp && isConfiguring;
            return (
              <div
                key={appId}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: isCompleted
                    ? '#10b981'
                    : isCurrent
                      ? 'var(--accent-primary)'
                      : isProcessing
                        ? 'var(--accent-primary)'
                        : 'var(--bg-card)',
                  border: `2px solid ${isCurrent || isProcessing ? 'var(--accent-primary)' : isCompleted ? '#10b981' : 'var(--border)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  transition: 'all 0.3s ease',
                  transform: isCurrent ? 'scale(1.15)' : 'scale(1)',
                }}>
                  {app?.emoji}
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: isCurrent ? 'var(--accent-primary)' : isCompleted ? '#10b981' : 'var(--text-secondary)',
                }}>
                  {app?.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Question UI or Configuring animation */}
        {!isConfiguring ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSetupApp}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
            >
              <h2 style={{
                fontSize: 22,
                fontWeight: 700,
                marginBottom: 8,
                color: 'var(--text-primary)',
              }}>
                Let's set up {appInfo?.name || currentSetupApp} {appInfo?.emoji}
              </h2>

              <p style={{
                fontSize: 15,
                color: 'var(--text-secondary)',
                marginBottom: 28,
                lineHeight: 1.5,
              }}>
                {question.prompt}
              </p>

              {/* Question Input */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: 24,
                marginBottom: 24,
              }}>
                <input
                  type={question.inputType}
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  placeholder={question.placeholder}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && userAnswer.trim()) {
                      handleSaveAndFly();
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: 16,
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  autoFocus
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <button
                  onClick={handleSkipApp}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 10,
                    background: 'none',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Skip →
                </button>
                <button
                  onClick={handleSaveAndFly}
                  disabled={!userAnswer.trim()}
                  style={{
                    padding: '10px 28px',
                    borderRadius: 10,
                    background: userAnswer.trim() ? 'var(--accent-primary)' : 'var(--bg-card)',
                    color: userAnswer.trim() ? 'white' : 'var(--text-secondary)',
                    border: userAnswer.trim() ? 'none' : '1px solid var(--border)',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: userAnswer.trim() ? 'pointer' : 'not-allowed',
                    opacity: userAnswer.trim() ? 1 : 0.6,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isLastApp ? '✨ Save & Finish' : '🚀 Save & Fly'}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          /* Configuring animation — progress bar + typewriter */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h2 style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 24,
              color: 'var(--text-primary)',
            }}>
              Setting up {appInfo?.name || currentSetupApp}...
            </h2>

            {/* Progress Bar */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: 6,
              marginBottom: 16,
            }}>
              <motion.div
                animate={{ width: `${setupProgress}%` }}
                transition={{ duration: 0.15 }}
                style={{
                  height: 8,
                  borderRadius: 16,
                  background: 'var(--accent-primary)',
                  width: `${setupProgress}%`,
                }}
              />
            </div>

            {/* Typewriter status text */}
            <AnimatePresence mode="wait">
              <motion.p
                key={setupProgress > 90 ? 'done' : 'saving'}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                style={{
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                }}
              >
                {setupProgress < 50
                  ? `Saving your ${appInfo?.name || ''} data...`
                  : setupProgress < 90
                    ? `Almost there...`
                    : `Done! ✨`}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    );
  };

  // Render step based on current step
  const renderStep = () => {
    switch (step) {
      case 0:
        return renderHeartbeatStep();
      case 1:
        return renderFamilyStep();
      case 2:
        return renderIceBreakerStep();
      case 3:
        return renderChecklistStep();
      case 4:
        return renderSetupStep();
      default:
        return null;
    }
  };

  // ── Commented out old code for reference ──
  /*
  // OLD GOALS STEP (Step 2)
  // - Chat with Conflux to determine which agents to use
  // - Keyword-based conversation system
  // - Replaced by new Checklist step

  // OLD GOOGLE CONNECT STEP (Step 4)
  // - Google integration setup
  // - Connection status checking
  // - Replaced by new Setup step

  // OLD ALIVE STEP (Step 5)
  // - Final team animation
  // - Confetti celebration
  // - Replaced by streamlined setup flow
  */

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100%',
      background: 'var(--bg-primary)',
    }}>
      {/* Progress Bar */}
      {step < 4 && <ProgressBar step={step} />}

      {/* Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        overflow: 'auto',
      }}>
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      {step < 3 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px 28px',
          flexShrink: 0,
        }}>
          <div>
            {step > 0 && (
              <button
                onClick={prevStep}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 20px',
                  color: 'var(--text-secondary)',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                ← Back
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              {step === 1 && (
                <button
                  onClick={nextStep}
                  disabled={isSpeaking}
                  style={{
                    padding: '10px 28px',
                    borderRadius: 10,
                    background: isSpeaking ? 'var(--bg-card)' : 'var(--accent-primary)',
                    color: isSpeaking ? 'var(--text-secondary)' : 'white',
                    border: isSpeaking ? '1px solid var(--border)' : 'none',
                    fontSize: 14,
                    cursor: isSpeaking ? 'not-allowed' : 'pointer',
                    opacity: isSpeaking ? 0.7 : 1,
                    transition: 'all 0.3s ease',
                  }}
                >
                  {isSpeaking ? '🎙️ Listening...' : 'Skip →'}
                </button>
              )}
              {step !== 1 && (
                <button
                  className="next-btn"
                  onClick={nextStep}
                  disabled={
                    (step === 0 && userName.trim().length === 0) ||
                    (step === 3 && selectedApps.size === 0)
                  }
                  style={{
                    width: 'auto',
                    padding: '10px 28px',
                    opacity: (
                      (step === 0 && userName.trim().length === 0) ||
                      (step === 3 && selectedApps.size === 0)
                    ) ? 0.5 : 1,
                    cursor: (
                      (step === 0 && userName.trim().length === 0) ||
                      (step === 3 && selectedApps.size === 0)
                    ) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {step === 0 ? 'Get Started' : step === 3 ? 'Enter Conflux' : ''}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
