import { useState, useEffect, useCallback, useRef } from 'react';
import Avatar from './Avatar';
import '../styles/animations.css';

// ── Types ──

interface OnboardingProps {
  onComplete: (goals: string[], selectedAgents: string[]) => void;
}

// ── Constants ──

interface GoalOption {
  id: string;
  slug: string;
  emoji: string;
  title: string;
  description: string;
}

const GOALS: GoalOption[] = [
  { id: 'business', slug: 'building-a-business', emoji: '🚀', title: 'Building a business', description: 'Strategy, research, content, and growth' },
  { id: 'learn', slug: 'learning-research', emoji: '📚', title: 'Learning & research', description: 'Deep dives, analysis, and knowledge building' },
  { id: 'work', slug: 'work-productivity', emoji: '💼', title: 'Work productivity', description: 'Task management, writing, and automation' },
  { id: 'creative', slug: 'creative-projects', emoji: '🎨', title: 'Creative projects', description: 'Writing, design, and brainstorming' },
  { id: 'life', slug: 'everyday-life', emoji: '🏠', title: 'Everyday life', description: 'Planning, organizing, and daily help' },
];

const GOAL_AGENT_MAP: Record<string, string[]> = {
  'building-a-business': ['zigbot', 'helix', 'forge', 'vector', 'pulse'],
  'learning-research': ['helix', 'quanta', 'zigbot'],
  'work-productivity': ['prism', 'forge', 'spectra', 'quanta'],
  'creative-projects': ['forge', 'pulse', 'helix'],
  'everyday-life': ['zigbot', 'helix', 'catalyst'],
};

interface AgentInfo {
  id: string;
  name: string;
  emoji: string;
  role: string;
  why: string;
}

const ALL_AGENTS: Record<string, AgentInfo> = {
  zigbot: { id: 'zigbot', name: 'ZigBot', emoji: '🤖', role: 'Strategic Partner', why: 'Guides your strategy and helps you think clearly about opportunities' },
  helix: { id: 'helix', name: 'Helix', emoji: '🔬', role: 'Market Researcher', why: 'Finds market data, competitor intel, and validates ideas' },
  forge: { id: 'forge', name: 'Forge', emoji: '🔨', role: 'Execution Builder', why: 'Builds products, writes code, and creates deliverables' },
  vector: { id: 'vector', name: 'Vector', emoji: '🧭', role: 'Business Strategist', why: 'Evaluates opportunities and keeps your portfolio on track' },
  pulse: { id: 'pulse', name: 'Pulse', emoji: '📣', role: 'Growth Engine', why: 'Handles marketing, launch strategy, and audience building' },
  quanta: { id: 'quanta', name: 'Quanta', emoji: '✅', role: 'Quality Control', why: 'Verifies outputs, checks facts, and ensures quality' },
  prism: { id: 'prism', name: 'Prism', emoji: '💎', role: 'System Orchestrator', why: 'Coordinates missions and manages the agent pipeline' },
  spectra: { id: 'spectra', name: 'Spectra', emoji: '🧩', role: 'Task Decomposer', why: 'Breaks complex goals into clear, actionable tasks' },
  luma: { id: 'luma', name: 'Luma', emoji: '🚀', role: 'Run Launcher', why: 'Launches and monitors agent runs across the system' },
  catalyst: { id: 'catalyst', name: 'Catalyst', emoji: '⚡', role: 'Everyday Assistant', why: 'Helps with daily planning, organization, and quick tasks' },
};

const AGENT_EMOJIS = Object.values(ALL_AGENTS).map(a => a.emoji);

const BACKGROUND_EMOJIS = AGENT_EMOJIS.map((emoji, i) => ({
  emoji,
  left: `${10 + (i * 8) % 80}%`,
  top: `${15 + ((i * 13) % 60)}%`,
  delay: i * 200,
  size: 28 + (i % 3) * 8,
}));

// BYOK providers
const BYOK_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', emoji: '🧠', placeholder: 'sk-...' },
  { id: 'anthropic', name: 'Anthropic', emoji: '🏛️', placeholder: 'sk-ant-...' },
  { id: 'gemini', name: 'Gemini', emoji: '💎', placeholder: 'AI...' },
  { id: 'ollama', name: 'Ollama', emoji: '🦙', placeholder: 'http://localhost:11434' },
];

// Setup facts
const SETUP_FACTS = [
  "Each agent has a soul — a unique personality that shapes how they think",
  "Your team's heartbeat checks in to make sure everyone's okay",
  "Your agents remember everything. The longer you use them, the smarter they get",
  "Your data stays on your machine. Always.",
  "Agents can collaborate — like a real team, but they never sleep",
  "This isn't just software. It's a home for your AI family.",
];

// Goal → gradient map
const GOAL_GRADIENTS: Record<string, string> = {
  business: 'rgba(99,102,241,0.06)',
  learn: 'rgba(59,130,246,0.06)',
  work: 'rgba(16,185,129,0.06)',
  creative: 'rgba(236,72,153,0.06)',
  life: 'rgba(245,158,11,0.06)',
};

// ── Particles for Welcome ──

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

// ── Confetti for Alive Phase 2 ──

function Confetti({ count = 20 }: { count?: number }) {
  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const distance = 80 + Math.random() * 120;
    return {
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance - 60,
      rotation: Math.random() * 720 - 360,
      color: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'][i % 6],
      size: 4 + Math.random() * 4,
      delay: Math.random() * 0.2,
    };
  });

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: i % 3 === 0 ? '50%' : '2px',
            background: p.color,
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`,
            '--rotation': `${p.rotation}deg`,
            animation: `confetti-particle 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${p.delay}s forwards`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ── Typewriter placeholder ──

function useTypewriterPlaceholder(text: string, typing: boolean, speed = 100) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    if (typing) return; // Only animate when not typing
    let i = 0;
    setDisplayed('');
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, typing, speed]);

  return typing ? '' : displayed;
}

// ── Component ──

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);

  // Step 0 — Welcome
  const [userName, setUserName] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typewriterPlaceholder = useTypewriterPlaceholder("What's your name?", isTyping, 80);

  // Step 1 — Provider
  const [setupPhase, setSetupPhase] = useState<'connecting' | 'alive' | 'done'>('connecting');
  const [factIndex, setFactIndex] = useState(0);
  const [heartbeatPulse, setHeartbeatPulse] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [byokKeys, setByokKeys] = useState<Record<string, string>>({});
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Step 2 — Goals
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());

  // Step 3 — Team
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [shakingAgent, setShakingAgent] = useState<string | null>(null);
  const [flashingAgent, setFlashingAgent] = useState<string | null>(null);

  // Step 4 — Alive
  const [alivePhase, setAlivePhase] = useState<'loading' | 'ready'>('loading');

  const nameInputRef = useRef<HTMLInputElement>(null);

  // ── Derive agents from goals ──
  useEffect(() => {
    const agentSet = new Set<string>();
    selectedGoals.forEach(goalId => {
      const goal = GOALS.find(g => g.id === goalId);
      if (goal) {
        (GOAL_AGENT_MAP[goal.slug] || []).forEach(a => agentSet.add(a));
      }
    });
    if (agentSet.size > 0) setSelectedAgents(agentSet);
  }, [selectedGoals]);

  // ── Navigation ──
  const goToStep = useCallback((nextStep: number) => {
    setAnimating(true);
    setTimeout(() => {
      setStep(nextStep);
      setAnimating(false);
    }, 50);
  }, []);

  const nextStep = () => {
    // If still on 'connecting', skip to 'alive' immediately
    if (step === 1 && setupPhase === 'connecting') {
      setSetupPhase('alive');
      setHeartbeatPulse(true);
      localStorage.setItem('conflux-provider-setup', JSON.stringify({ type: 'free' }));
      return;
    }
    goToStep(step + 1);
  };
  const prevStep = () => goToStep(step - 1);

  // ── Provider: Auto-advance through facts ──
  useEffect(() => {
    if (step !== 1 || setupPhase !== 'connecting') return;
    const interval = setInterval(() => {
      setFactIndex(prev => (prev + 1) % SETUP_FACTS.length);
    }, 2200);
    const timer = setTimeout(() => {
      setSetupPhase('alive');
      setHeartbeatPulse(true);
      localStorage.setItem('conflux-provider-setup', JSON.stringify({ type: 'free' }));
    }, 6000);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [step, setupPhase]);

  // ── Provider: BYOK ──
  const handleByokConnect = (providerId: string) => {
    const key = byokKeys[providerId]?.trim();
    if (!key) return;
    localStorage.setItem('conflux-provider-setup', JSON.stringify({ type: 'byok', providers: [providerId] }));
    setActiveModal(null);
    setSetupPhase('alive');
    setHeartbeatPulse(true);
  };

  // ── Goals ──
  const toggleGoal = (id: string) => {
    setSelectedGoals(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 3) {
        next.add(id);
      }
      return next;
    });
  };

  // ── Team ──
  const toggleAgent = (id: string) => {
    setSelectedAgents(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) {
          next.delete(id);
        } else {
          // Shake — can't deselect last
          setShakingAgent(id);
          setTimeout(() => setShakingAgent(null), 400);
        }
      } else {
        next.add(id);
        // Flash working then idle
        setFlashingAgent(id);
        setTimeout(() => setFlashingAgent(null), 600);
      }
      return next;
    });
  };

  // ── Enter home ──
  const handleEnter = () => {
    const goalsArr = Array.from(selectedGoals);
    const agentsArr = Array.from(selectedAgents);
    localStorage.setItem('conflux-onboarded', 'true');
    localStorage.setItem('conflux-goals', JSON.stringify(goalsArr));
    localStorage.setItem('conflux-selected-agents', JSON.stringify(agentsArr));
    localStorage.setItem('conflux-name', userName.trim() || 'there');
    onComplete(goalsArr, agentsArr);
  };

  // ── Alive animation ──
  useEffect(() => {
    if (step === 4) {
      setAlivePhase('loading');
      const timer = setTimeout(() => setAlivePhase('ready'), 2500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // ── Skip ──
  const handleSkip = () => {
    const allAgentIds = Object.keys(ALL_AGENTS);
    localStorage.setItem('conflux-onboarded', 'true');
    localStorage.setItem('conflux-goals', JSON.stringify([]));
    localStorage.setItem('conflux-selected-agents', JSON.stringify(allAgentIds));
    localStorage.setItem('conflux-name', userName.trim() || 'there');
    onComplete([], allAgentIds);
  };

  // ── Derived ──
  const canNext = step === 0
    || step === 1  // always can proceed from provider (auto-connects)
    || (step === 2 && selectedGoals.size >= 2)
    || (step === 3 && selectedAgents.size >= 1);

  // ── Background gradient for goals ──
  const goalGradient = selectedGoals.size > 0
    ? Array.from(selectedGoals).map(id => GOAL_GRADIENTS[id] || 'transparent').join(', ')
    : 'transparent';

  // ── Render ──

  const renderStep = () => {
    switch (step) {
      case 0: return renderWelcome();
      case 1: return renderProvider();
      case 2: return renderGoals();
      case 3: return renderTeam();
      case 4: return renderAlive();
      default: return null;
    }
  };

  const renderWelcome = () => (
    <div style={{ textAlign: 'center', maxWidth: 420, position: 'relative' }}>
      {/* Floating particles */}
      <Particles count={15} />

      {/* Background agent emojis — appear as user types */}
      {userName.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {BACKGROUND_EMOJIS.map((b, i) => (
            <span
              key={i}
              className="animate-fade-in"
              style={{
                position: 'absolute',
                left: b.left,
                top: b.top,
                fontSize: b.size,
                opacity: 0.08,
                '--stagger-delay': `${b.delay}ms`,
                userSelect: 'none',
              } as React.CSSProperties}
            >
              {b.emoji}
            </span>
          ))}
        </div>
      )}

      <div className="animate-scale-in" style={{ marginBottom: 24 }}>
        <img
          src="/logo.png"
          alt="Conflux Home"
          style={{ width: 96, height: 96, objectFit: 'contain' }}
        />
      </div>

      <h1
        className="animate-fade-in"
        style={{
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: '-0.5px',
          color: 'var(--text-primary)',
          marginBottom: 12,
          '--stagger-delay': '200ms',
        } as React.CSSProperties}
      >
        Welcome to Conflux Home
      </h1>

      <p
        className="animate-fade-in"
        style={{
          fontSize: 17,
          color: 'var(--text-secondary)',
          marginBottom: 32,
          lineHeight: 1.5,
          '--stagger-delay': '350ms',
        } as React.CSSProperties}
      >
        Your AI family is about to come alive.
      </p>

      <input
        ref={nameInputRef}
        type="text"
        placeholder={typewriterPlaceholder || "What's your name?"}
        value={userName}
        onChange={e => setUserName(e.target.value)}
        onFocus={() => setIsTyping(true)}
        onBlur={() => setIsTyping(false)}
        className="animate-fade-in"
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
          marginBottom: 24,
          boxSizing: 'border-box',
          '--stagger-delay': '500ms',
        } as React.CSSProperties}
        autoFocus
      />

      <div>
        <button
          className="next-btn animate-breathe"
          onClick={nextStep}
          style={{ maxWidth: 280, margin: '0 auto', display: 'block' }}
        >
          Get Started
        </button>
      </div>
    </div>
  );

  const renderProvider = () => (
    <div style={{ textAlign: 'center', maxWidth: 480, width: '100%', position: 'relative' }}>
      {setupPhase === 'connecting' && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: 400, gap: 24,
        }}>
          {/* Heartbeat SVG — drawing animation */}
          <svg viewBox="0 0 400 80" style={{ width: '100%', maxWidth: 400, height: 80 }}>
            <path
              d="M0,40 L60,40 L70,40 L80,20 L90,60 L100,10 L110,70 L120,40 L130,40 L200,40 L210,40 L220,20 L230,60 L240,10 L250,70 L260,40 L270,40 L340,40 L350,40 L360,20 L370,60 L380,10 L390,70 L400,40"
              fill="none"
              stroke="var(--accent-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 800,
                filter: 'drop-shadow(0 0 6px currentColor)',
                animation: 'heartbeat-draw 2s linear infinite',
              }}
            />
          </svg>

          {/* "Waking up" text */}
          <h2
            className="animate-fade-in"
            style={{
              fontSize: 24, fontWeight: 700, color: 'var(--text-primary)',
              marginBottom: 0,
            }}
          >
            Your team is waking up...
          </h2>

          {/* Cycling facts */}
          <p
            key={factIndex}
            className="animate-fade-in"
            style={{
              fontSize: 15, color: 'var(--text-secondary)', maxWidth: 340,
              lineHeight: 1.6, minHeight: 48,
            }}
          >
            {SETUP_FACTS[factIndex]}
          </p>
        </div>
      )}

      {setupPhase === 'alive' && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: 400, gap: 24,
        }}>
          {/* Heartbeat SVG — stable pulse, green */}
          <svg viewBox="0 0 400 80" style={{ width: '100%', maxWidth: 400, height: 80 }}>
            <path
              d="M0,40 L60,40 L70,40 L80,20 L90,60 L100,10 L110,70 L120,40 L130,40 L200,40 L210,40 L220,20 L230,60 L240,10 L250,70 L260,40 L270,40 L340,40 L350,40 L360,20 L370,60 L380,10 L390,70 L400,40"
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 800,
                filter: 'drop-shadow(0 0 6px #10b981)',
                animation: 'heartbeat-pulse 1.5s ease-in-out infinite',
              }}
            />
          </svg>

          {/* Alive text */}
          <h2
            className="animate-scale-in"
            style={{
              fontSize: 24, fontWeight: 700, color: '#10b981',
              marginBottom: 0,
            }}
          >
            Your team's heart is beating. ✨
          </h2>

          {/* Continue button */}
          <button
            className="next-btn animate-fade-in"
            onClick={nextStep}
            style={{
              maxWidth: 280, width: '100%', padding: '12px 24px',
              '--stagger-delay': '500ms',
            } as React.CSSProperties}
          >
            Continue →
          </button>

          {/* Advanced setup link */}
          <button
            className="animate-fade-in"
            onClick={() => setShowAdvanced(true)}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-muted)', fontSize: 13,
              cursor: 'pointer', marginTop: 8,
              '--stagger-delay': '700ms',
            } as React.CSSProperties}
          >
            ⚙️ I have my own setup
          </button>
        </div>
      )}

      {/* Advanced BYOK modal */}
      {showAdvanced && (
        <div
          onClick={() => setShowAdvanced(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div
            className="animate-scale-in"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 20, padding: 28, maxWidth: 420, width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
          >
            {/* Close button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                Bring Your Own Setup
              </h3>
              <button
                onClick={() => setShowAdvanced(false)}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--text-muted)', fontSize: 20,
                  cursor: 'pointer', padding: 4, lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Connect your own provider to use your own API keys.
            </p>

            {/* Provider cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {BYOK_PROVIDERS.map(p => {
                const hasKey = byokKeys[p.id]?.trim();
                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px',
                      background: 'var(--bg-primary)',
                      border: `1px solid ${hasKey ? '#10b981' : 'var(--border)'}`,
                      borderRadius: 14,
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{p.emoji}</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
                      {p.name}
                    </span>
                    {hasKey ? (
                      <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>✓ Connected</span>
                    ) : (
                      <button
                        onClick={() => setActiveModal(p.id)}
                        style={{
                          background: 'none', border: '1px solid var(--border)',
                          borderRadius: 10, padding: '8px 18px',
                          color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500,
                          cursor: 'pointer', transition: 'all 0.15s ease',
                        }}
                      >
                        Connect
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* BYOK key input modal */}
      {activeModal && (() => {
        const provider = BYOK_PROVIDERS.find(p => p.id === activeModal)!;
        return (
          <div
            onClick={() => setActiveModal(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 110,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            }}
          >
            <div
              className="animate-scale-in"
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: 28, maxWidth: 380, width: '100%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 28 }}>{provider.emoji}</span>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Connect {provider.name}
                </h3>
              </div>
              <input
                type="password"
                placeholder={provider.placeholder}
                value={byokKeys[provider.id] || ''}
                onChange={e => setByokKeys(prev => ({ ...prev, [provider.id]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleByokConnect(provider.id)}
                autoFocus
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  border: '1px solid var(--border)', background: 'var(--bg-primary)',
                  color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box', marginBottom: 16,
                }}
              />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setActiveModal(null)}
                  style={{
                    background: 'none', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '8px 18px', color: 'var(--text-secondary)',
                    fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  className="next-btn"
                  onClick={() => handleByokConnect(provider.id)}
                  style={{ width: 'auto', padding: '8px 20px' }}
                >
                  Connect
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );

  const renderGoals = () => (
    <div style={{ textAlign: 'center', maxWidth: 520 }}>
      <h2
        className="animate-fade-in"
        style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}
      >
        What do you want help with?
      </h2>
      <p
        className="animate-fade-in"
        style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32, '--stagger-delay': '100ms' } as React.CSSProperties}
      >
        Select 2–3 goals. This helps us pick the right agents for you.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 12, marginBottom: 12, textAlign: 'left',
        transition: 'background 1s ease',
        background: goalGradient,
        borderRadius: 16, padding: 4,
      }}>
        {GOALS.map((goal, i) => {
          const isSelected = selectedGoals.has(goal.id);
          return (
            <div
              key={goal.id}
              className="animate-fade-in"
              onClick={() => toggleGoal(goal.id)}
              style={{
                padding: '18px 16px',
                background: 'var(--bg-card)',
                border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border)'}`,
                borderRadius: 14,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                boxShadow: isSelected ? '0 0 0 1px var(--accent-primary), 0 0 20px var(--accent-primary)' : 'var(--shadow)',
                '--stagger-delay': `${i * 80}ms`,
              } as React.CSSProperties}
            >
              {isSelected && (
                <div
                  className="animate-scale-in"
                  style={{
                    position: 'absolute', top: 10, right: 12,
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--accent-primary)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                  }}
                >✓</div>
              )}
              <div
                className={isSelected ? '' : ''}
                style={{
                  fontSize: 28, marginBottom: 8,
                  transition: 'transform 0.3s ease',
                  transform: isSelected ? 'translateY(-4px)' : 'none',
                }}
              >{goal.emoji}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                {goal.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {goal.description}
              </div>
            </div>
          );
        })}
      </div>

      <p style={{
        fontSize: 12,
        color: selectedGoals.size >= 2 ? '#10b981' : 'var(--text-muted)',
        marginBottom: 8,
      }}>
        {selectedGoals.size < 2
          ? `Select at least 2 (${selectedGoals.size}/2)`
          : `${selectedGoals.size} selected ✓`}
      </p>
    </div>
  );

  const renderTeam = () => {
    const agentIds = Array.from(selectedAgents);
    const agentList = agentIds.map(id => ALL_AGENTS[id]).filter(Boolean);

    return (
      <div style={{ textAlign: 'center', maxWidth: 520 }}>
        <h2
          className="animate-fade-in"
          style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}
        >
          Your personalized AI team
        </h2>
        <p
          className="animate-fade-in"
          style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28, '--stagger-delay': '100ms' } as React.CSSProperties}
        >
          Based on your goals, we recommend these agents. Toggle any on or off.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', marginBottom: 20 }}>
          {agentList.map((agent, i) => {
            const isOn = selectedAgents.has(agent.id);
            const isShaking = shakingAgent === agent.id;
            const isFlashing = flashingAgent === agent.id;
            return (
              <div
                key={agent.id}
                className={`animate-slide-up ${isShaking ? 'animate-shake' : ''}`}
                onClick={() => toggleAgent(agent.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px',
                  background: 'var(--bg-card)',
                  border: `2px solid ${isOn ? 'var(--accent-primary)' : 'var(--border)'}`,
                  borderRadius: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: isOn ? 1 : 0.5,
                  '--stagger-delay': `${i * 150}ms`,
                } as React.CSSProperties}
              >
                <Avatar
                  agentId={agent.id}
                  name={agent.name}
                  emoji={agent.emoji}
                  status={isFlashing ? 'working' : isOn ? 'idle' : 'offline'}
                  size="md"
                  showStatus={false}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {agent.name}
                    <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                      {agent.role}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                    Why this agent: {agent.why}
                  </div>
                </div>
                {/* Toggle switch with bounce */}
                <div style={{
                  width: 44, height: 26, borderRadius: 13,
                  background: isOn ? 'var(--accent-primary)' : 'var(--border)',
                  position: 'relative', flexShrink: 0,
                  transition: 'background 0.2s ease',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: '#fff',
                    position: 'absolute', top: 2,
                    left: isOn ? 20 : 2,
                    transition: 'left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          You can add more agents anytime from the Marketplace.
        </p>
      </div>
    );
  };

  const renderAlive = () => {
    const agentIds = Array.from(selectedAgents);
    const agentList = agentIds.map(id => ALL_AGENTS[id]).filter(Boolean);

    return (
      <div style={{
        textAlign: 'center', maxWidth: 420, position: 'relative',
        minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Confetti on ready */}
        {alivePhase === 'ready' && <Confetti count={20} />}

        {alivePhase === 'loading' ? (
          <div>
            <h2
              className="animate-fade-in"
              style={{ fontSize: 24, fontWeight: 700, marginBottom: 32, color: 'var(--text-primary)' }}
            >
              Your team is coming alive…
            </h2>

            {/* Scan-line agent outlines */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16,
              marginBottom: 32,
            }}>
              {agentList.map((agent, i) => (
                <div
                  key={agent.id}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    animation: `scan-line 0.6s ease ${i * 0.2}s both`,
                  }}
                >
                  <Avatar
                    agentId={agent.id}
                    name={agent.name}
                    emoji={agent.emoji}
                    status="working"
                    size="md"
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {agent.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Central pulsing text */}
            <div className="animate-breathe" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              fontSize: 14, color: 'var(--text-muted)',
            }}>
              <span>Syncing neural pathways</span>
              <span style={{ display: 'inline-block', width: 24, textAlign: 'left' }}>
                <DotPulse />
              </span>
            </div>
          </div>
        ) : (
          <div>
            <h2
              className="animate-scale-in"
              style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, color: 'var(--text-primary)' }}
            >
              Your team is ready!
            </h2>

            <div style={{
              display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 24,
            }}>
              {agentList.map((agent, i) => (
                <div
                  key={agent.id}
                  className="animate-fade-in"
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    '--stagger-delay': `${i * 100}ms`,
                  } as React.CSSProperties}
                >
                  <Avatar
                    agentId={agent.id}
                    name={agent.name}
                    emoji={agent.emoji}
                    status="idle"
                    size="md"
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {agent.name}
                  </span>
                </div>
              ))}
            </div>

            <p
              className="animate-fade-in"
              style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28, '--stagger-delay': '200ms' } as React.CSSProperties}
            >
              {agentList.length} agent{agentList.length !== 1 ? 's' : ''} ready to go.
            </p>

            <button
              className="next-btn animate-slide-up"
              onClick={handleEnter}
              style={{ maxWidth: 280, margin: '0 auto', display: 'block', '--stagger-delay': '400ms' } as React.CSSProperties}
            >
              Enter Conflux Home
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── DotPulse helper ──
  function DotPulse() {
    const [dots, setDots] = useState('');
    useEffect(() => {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 400);
      return () => clearInterval(interval);
    }, []);
    return <>{dots}</>;
  }

  // ── Main Render ──

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', width: '100%',
      background: 'var(--bg-primary)',
    }}>
      {/* Progress bar */}
      {step < 4 && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: 10, padding: '20px 0 0', flexShrink: 0,
        }}>
          {[0, 1, 2, 3].map(i => {
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div
                key={i}
                className={isActive ? 'animate-breathe' : ''}
                style={{
                  width: isActive ? 32 : 10,
                  height: 10,
                  borderRadius: 5,
                  background: isDone || isActive
                    ? 'var(--accent-primary)'
                    : 'var(--border)',
                  opacity: isDone || isActive ? 1 : 0.4,
                  transition: 'all 0.3s ease',
                }}
              />
            );
          })}
        </div>
      )}

      {/* Content area */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        overflow: 'auto',
      }}>
        <div className={animating ? '' : 'step-enter'} key={step} style={{ width: '100%' }}>
          {renderStep()}
        </div>
      </div>

      {/* Bottom navigation */}
      {step < 4 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 24px 28px', flexShrink: 0,
        }}>
          <div>
            {step > 0 && (
              <button
                onClick={prevStep}
                style={{
                  background: 'none', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 20px',
                  color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s ease',
                }}
              >
                ← Back
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {step >= 2 && (
              <button
                onClick={handleSkip}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--text-muted)', fontSize: 13,
                  cursor: 'pointer', textDecoration: 'underline',
                }}
              >
                Skip setup
              </button>
            )}
            {step === 0 && (
              <button
                className="next-btn"
                onClick={nextStep}
                disabled={!canNext}
                style={{
                  width: 'auto', padding: '10px 28px',
                  opacity: canNext ? 1 : 0.5,
                  cursor: canNext ? 'pointer' : 'not-allowed',
                }}
              >
                Next →
              </button>
            )}
            {step === 1 && (
              <button
                className="next-btn"
                onClick={nextStep}
                disabled={!canNext}
                style={{
                  width: 'auto', padding: '10px 28px',
                  opacity: canNext ? 1 : 0.5,
                  cursor: canNext ? 'pointer' : 'not-allowed',
                }}
              >
                Continue →
              </button>
            )}
            {step === 2 && (
              <button
                className="next-btn"
                onClick={nextStep}
                disabled={!canNext}
                style={{
                  width: 'auto', padding: '10px 28px',
                  opacity: canNext ? 1 : 0.5,
                  cursor: canNext ? 'pointer' : 'not-allowed',
                }}
              >
                Next →
              </button>
            )}
            {step === 3 && (
              <button
                className="next-btn"
                onClick={nextStep}
                disabled={selectedAgents.size < 1}
                style={{
                  width: 'auto', padding: '10px 28px',
                  opacity: selectedAgents.size >= 1 ? 1 : 0.5,
                  cursor: selectedAgents.size >= 1 ? 'pointer' : 'not-allowed',
                }}
              >
                ✨ Bring to Life →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
