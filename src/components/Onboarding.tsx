import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playTourBlip, playHeartbeat, playWelcomeChime } from '../lib/sound';
import { NeuralBrainScene } from './NeuralBrainScene';
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
      {[0, 1, 2, 3].map(i => {
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

  // Step 3: Setup Phase
  const [setupProgress, setSetupProgress] = useState(0);
  const [setupAppName, setSetupAppName] = useState('');

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

  // Always dark mode
  useEffect(() => {
    document.body.classList.add('dark');
  }, []);

  // Step 3: Simulate app setup progress
  useEffect(() => {
    if (step !== 3) return;

    const apps = Array.from(selectedApps);
    if (apps.length === 0) {
      onComplete([], []);
      return;
    }

    let currentAppIndex = 0;
    let progress = 0;

    const setupInterval = setInterval(() => {
      progress += 2;
      if (progress >= 100) {
        progress = 0;
        currentAppIndex++;
        if (currentAppIndex >= apps.length) {
          clearInterval(setupInterval);
          // All apps "set up" - finish
          const appsArr = Array.from(selectedApps);
          localStorage.setItem('conflux-onboarded', 'true');
          localStorage.setItem('conflux-name', userName.trim() || 'there');
          localStorage.setItem('conflux-setup-apps', JSON.stringify(appsArr));
          onComplete([], appsArr);
          return;
        }
      }
      setSetupProgress(progress);
      setSetupAppName(APPS.find(a => a.id === apps[currentAppIndex])?.name || '');
    }, 30);

    return () => clearInterval(setupInterval);
  }, [step, selectedApps, userName, onComplete]);

  // Navigation
  const goToStep = useCallback((nextStep: number) => {
    playTourBlip();
    setAnimating(true);
    setTimeout(() => {
      setStep(nextStep);
      setAnimating(false);
    }, 50);
  }, []);

  const nextStep = () => {
    if (step === 0 && userName.trim().length > 0) {
      localStorage.setItem('conflux-name', userName.trim());
    }
    if (step === 2) {
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
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
          mode="idle" 
          pulseImpulse={{ strength: 5, bursts: 1 }} 
          transparent={true}
          style={{ width: 200, height: 200, margin: '0 auto' }}
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

  // Render Step 1: Ice Breaker
  const renderIceBreakerStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4 }}
      style={{ textAlign: 'center', maxWidth: 520, width: '100%', margin: '0 auto', position: 'relative' }}
    >
      {/* Conflux Presence visible in background of Ice Breaker */}
      <div style={{ position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)' }}>
        <NeuralBrainScene 
          mode="listen" 
          pulseImpulse={{ strength: 8, bursts: 2 }} 
          transparent={true}
          style={{ width: 150, height: 150 }}
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

  // Render Step 2: Checklist
  const renderChecklistStep = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4 }}
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

  // Render Step 3: Setup Progress (The "Typewriter" Phase)
  const renderSetupStep = () => {
    const apps = Array.from(selectedApps);
    const currentApp = APPS.find(a => a.id === apps[Math.floor(setupProgress / 100 * apps.length)]);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ textAlign: 'center', maxWidth: 600, width: '100%', margin: '0 auto', position: 'relative' }}
      >
        {/* Active Neural Brain in center during setup */}
        <div style={{ position: 'absolute', top: -140, left: '50%', transform: 'translateX(-50%)' }}>
          <NeuralBrainScene 
            mode="focus" 
            pulseImpulse={{ strength: 10 + (setupProgress / 10), bursts: 3 }} 
            transparent={true}
            style={{ width: 180, height: 180 }}
          />
        </div>

        <h2 style={{
          fontSize: 24,
          fontWeight: 700,
          marginBottom: 40,
          marginTop: 80,
          color: 'var(--text-primary)',
        }}>
          Setting up your workspace...
        </h2>

        {/* App Icons Grid */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 24,
          marginBottom: 32,
        }}>
          {APPS.map((app) => {
            const isSelected = selectedApps.has(app.id);
            const appIndex = Array.from(selectedApps).indexOf(app.id);
            const isCompleted = setupProgress >= 100 && Array.from(selectedApps).indexOf(app.id) < Math.floor(setupProgress / 100 * apps.length);
            const isCurrent = currentApp?.id === app.id;

            return (
              <motion.div
                key={app.id}
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{
                  scale: isSelected ? (isCurrent ? 1.2 : 1) : 0.8,
                  opacity: isSelected ? 1 : 0.3,
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  opacity: isSelected ? 1 : 0.3,
                }}
              >
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: 16,
                  background: isCurrent
                    ? 'var(--accent-primary)'
                    : isCompleted
                      ? '#10b981'
                      : 'var(--bg-card)',
                  border: `2px solid ${isCurrent ? 'var(--accent-primary)' : 'var(--border)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  transition: 'all 0.3s ease',
                }}>
                  {app.emoji}
                </div>
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: isCurrent ? 'var(--accent-primary)' : 'var(--text-secondary)',
                }}>
                  {app.name}
                </span>
              </motion.div>
            );
          })}
        </div>

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
            transition={{ duration: 0.2 }}
            style={{
              height: 8,
              borderRadius: 16,
              background: 'var(--accent-primary)',
              width: `${setupProgress}%`,
            }}
          />
        </div>

        <p style={{
          fontSize: 14,
          color: 'var(--text-secondary)',
        }}>
          {currentApp ? `Setting up ${currentApp.name}...` : 'Complete!'}
        </p>
      </motion.div>
    );
  };

  // Render step based on current step
  const renderStep = () => {
    switch (step) {
      case 0:
        return renderHeartbeatStep();
      case 1:
        return renderIceBreakerStep();
      case 2:
        return renderChecklistStep();
      case 3:
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
      {step < 3 && <ProgressBar step={step} />}

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
            {step !== 1 && (
              <button
                className="next-btn"
                onClick={nextStep}
                disabled={
                  (step === 0 && userName.trim().length === 0) ||
                  (step === 2 && selectedApps.size === 0)
                }
                style={{
                  width: 'auto',
                  padding: '10px 28px',
                  opacity: (
                    (step === 0 && userName.trim().length === 0) ||
                    (step === 2 && selectedApps.size === 0)
                  ) ? 0.5 : 1,
                  cursor: (
                    (step === 0 && userName.trim().length === 0) ||
                    (step === 2 && selectedApps.size === 0)
                  ) ? 'not-allowed' : 'pointer',
                }}
              >
                {step === 0 ? 'Get Started' : step === 2 ? 'Enter Conflux' : ''}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
