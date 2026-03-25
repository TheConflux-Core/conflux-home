import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

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
  zigbot: { id: 'zigbot', name: 'Conflux', emoji: '🤖', role: 'Strategic Partner', why: 'Guides your strategy and helps you think clearly about opportunities' },
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

// ── Keyword-based conversation responses ──

const KEYWORD_RESPONSES = [
  {
    keywords: ['business', 'startup', 'company', 'agency', 'scale', 'revenue', 'growth', 'marketing', 'clients', 'sales', 'money', 'earn', 'income'],
    agents: ['zigbot', 'helix', 'forge', 'vector', 'pulse'],
    response: "Got it. You're building something and you want to grow.\n\nI'm thinking:\n• Helix 🔬 — she'll dig into your market and find what your competitors are missing\n• Pulse 📣 — he handles all the marketing and launch strategy\n• Forge 🔨 — he builds. Landing pages, content, automation. Fast.\n\nAnd obviously me. I'm not going anywhere.",
  },
  {
    keywords: ['learn', 'research', 'study', 'understand', 'knowledge', 'analysis', 'curious', 'interesting', 'read', 'explore', 'figure out'],
    agents: ['zigbot', 'helix', 'quanta'],
    response: "Love the curiosity. You want to dig deep and actually understand things.\n\nFor that:\n• Helix 🔬 — deep research specialist. Give her a question, she'll find answers nobody else has.\n• Quanta ✅ — she verifies everything. No fake facts.\n\nI'll be here to help you think through what you find.",
  },
  {
    keywords: ['code', 'build', 'develop', 'app', 'software', 'automate', 'technical', 'programming', 'website', 'tool'],
    agents: ['forge', 'quanta', 'spectra', 'prism'],
    response: "A builder. I like it.\n\nYour crew:\n• Forge 🔨 — writes code, builds products. Fast.\n• Spectra 🧩 — breaks big goals into small steps.\n• Quanta ✅ — reviews everything before it ships.\n\nLet's build something great.",
  },
  {
    keywords: ['write', 'content', 'creative', 'design', 'blog', 'article', 'story', 'brand', 'art', 'photo', 'video', 'music'],
    agents: ['forge', 'pulse', 'helix'],
    response: "Creative energy — I can feel it.\n\nYour creative team:\n• Forge 🔨 — content, design, creation.\n• Pulse 📣 — gets your work in front of the right people.\n• Helix 🔬 — researches what your audience wants.\n\nLet's make something people remember.",
  },
  {
    keywords: ['family', 'kids', 'schedule', 'meal', 'home', 'dinner', 'planning', 'calendar', 'grocery', 'chores', 'clean', 'organize'],
    agents: ['zigbot', 'catalyst', 'spectra'],
    response: "Life gets busy. Let me help you take some of it back.\n\nYour daily team:\n• Catalyst ⚡ — she catches things before they slip through the cracks.\n• Spectra 🧩 — breaks overwhelming days into manageable pieces.\n\nAnd me — I'm always here when you need to think something through.",
  },
  {
    keywords: ['overwhelmed', 'stressed', 'too much', 'burned out', 'exhausted', 'anxious', 'busy', 'chaos', 'drowning'],
    agents: ['catalyst', 'spectra', 'zigbot'],
    response: "I hear you. When everything feels like too much, that's usually because there's no system holding it together.\n\nLet's fix that:\n• Spectra 🧩 — she'll break the chaos into clear, doable pieces.\n• Catalyst ⚡ — she's your early warning system. Things stop falling through.\n\nAnd me — sometimes you just need someone to think with.",
  },
  {
    keywords: ['health', 'fitness', 'workout', 'diet', 'exercise', 'weight', 'sleep', 'wellness', 'cook', 'recipe'],
    agents: ['catalyst', 'zigbot', 'helix'],
    response: "Taking care of yourself is the foundation for everything else.\n\nYour wellness team:\n• Catalyst ⚡ — she'll help you build habits that stick.\n• Helix 🔬 — she can research the best approaches for your goals.\n\nSmall steps, big results. Let's go.",
  },
  {
    keywords: ['nothing', 'just looking', 'idk', "don't know", 'not sure', 'browsing', 'checking', 'playing around'],
    agents: ['zigbot', 'helix', 'catalyst'],
    response: "No worries — you don't need a big plan to get started. Sometimes the best things come from just exploring.\n\nI'll give you a versatile team:\n• Helix 🔬 — she's great at finding interesting things to dig into.\n• Catalyst ⚡ — she'll help you stay on top of the little stuff.\n\nWe'll figure it out together.",
  },
];

// Agent personality one-liners
const AGENT_HELLOS: Record<string, string> = {
  zigbot: "I'm the one you come to when you need to think. Or when it's 2 AM and you have a crazy idea.",
  helix: "I find things other people miss. Market signals, competitor moves, hidden opportunities.",
  forge: "You describe it, I build it. Landing pages, content, code. I don't do slow.",
  vector: "I'm the reality check. I'll tell you if your idea is gold or garbage.",
  pulse: "I get your stuff in front of the right people. Marketing, launches, growth.",
  quanta: "I check everything twice. Nothing ships without my sign-off.",
  prism: "I keep the team organized. When 10 things need to happen at once, I'm your person.",
  spectra: "I break big scary goals into small doable steps.",
  luma: "I press the buttons. Launches, deployments, going live. That's me.",
  catalyst: "I'm the early warning system. If something's about to break, I'll let you know.",
};

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

  // Force dark theme for onboarding
  useEffect(() => {
    document.body.classList.add('dark');
    return () => {
      // Restore user's actual preference after onboarding
      const stored = localStorage.getItem('conflux-theme') as 'light' | 'dark' | 'system' | null;
      if (stored === 'light') document.body.classList.remove('dark');
    };
  }, []);

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

  // Step 2 — Conversation
  const [chatMessages, setChatMessages] = useState<Array<{role: 'zigbot' | 'user', text: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [conversationDone, setConversationDone] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);

  // Step 3 — Team
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [shakingAgent, setShakingAgent] = useState<string | null>(null);
  const [flashingAgent, setFlashingAgent] = useState<string | null>(null);

  // Step 4 — Connect Google
  const [googleStatus, setGoogleStatus] = useState<'loading' | 'canConnect' | 'connected' | 'error'>('loading');
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);

  // Step 5 — Alive (formerly step 4)
  const [alivePhase, setAlivePhase] = useState<'loading' | 'ready'>('loading');

  const nameInputRef = useRef<HTMLInputElement>(null);

  // ── Init chat on Step 2 ──
  useEffect(() => {
    if (step === 2 && chatMessages.length === 0) {
      setChatMessages([{
        role: 'zigbot',
        text: "👋 Hey! I'm Conflux.\n\nWhat do you wish you had more help with? Doesn't have to be big — even just day-to-day stuff counts.\n\nNo wrong answers here.",
      }]);
    }
  }, [step]);

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
  // ── Conversation ──
  const handleChatSend = useCallback(() => {
    const msg = chatInput.trim();
    if (!msg) return;

    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatInput('');

    // Match keywords
    const lower = msg.toLowerCase();
    let matched = KEYWORD_RESPONSES.find(r =>
      r.keywords.some(k => lower.includes(k))
    );

    if (!matched) {
      matched = {
        keywords: [],
        agents: ['zigbot', 'helix', 'catalyst'],
        response: "Interesting. I've got a good feeling about this.\n\nI'm starting you with a versatile team:\n• Helix 🔬 — she'll help you explore and figure things out.\n• Catalyst ⚡ — she keeps the day-to-day running smooth.\n\nAnd me, obviously. We'll figure out the rest as we go.",
      };
    }

    setSelectedTeam(matched!.agents);
    setSelectedAgents(new Set(matched!.agents));

    setTimeout(() => {
      setChatMessages(prev => [...prev, { role: 'zigbot', text: matched!.response }]);
      setConversationDone(true);
    }, 800);
  }, [chatInput]);

  const handleConversationContinue = useCallback(() => {
    localStorage.setItem('conflux-user-profile', JSON.stringify({
      name: userName,
      messages: chatMessages,
      recommendedAgents: selectedTeam,
    }));
    nextStep();
  }, [userName, chatMessages, selectedTeam, nextStep]);

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
    const agentsArr = Array.from(selectedAgents);
    localStorage.setItem('conflux-onboarded', 'true');
    localStorage.setItem('conflux-goals', JSON.stringify(selectedTeam));
    localStorage.setItem('conflux-selected-agents', JSON.stringify(agentsArr));
    localStorage.setItem('conflux-name', userName.trim() || 'there');
    onComplete(selectedTeam, agentsArr);
  };

  // ── Google Connect (Step 4) Hooks & Handlers ──
  useEffect(() => {
    if (step === 4) {
      const checkGoogle = async () => {
        try {
          setGoogleStatus('loading');
          const isConnected = await invoke('engine_google_is_connected');
          if (isConnected) {
            const email = await invoke('engine_google_get_email');
            setGoogleEmail(email as string);
            setGoogleStatus('connected');
          } else {
            setGoogleStatus('canConnect');
          }
        } catch (error) {
          console.error("Error checking Google status:", error);
          setGoogleStatus('canConnect');
        }
      };
      checkGoogle();
    }
  }, [step]);

  const handleGoogleConnect = async () => {
    try {
      const email = await invoke('engine_google_connect');
      setGoogleEmail(email as string);
      setGoogleStatus('connected');
    } catch (error) {
      console.error("Error connecting to Google:", error);
      // Optionally, show an error message to the user
      setGoogleStatus('error');
    }
  };

  const handleGoogleSkip = () => {
    nextStep(); // Move to the next step without connecting Google
  };

  // ── Alive animation (Step 5) ──
  useEffect(() => {
    if (step === 5) { // Updated from step 4 to step 5
      setAlivePhase('loading');
      const timer = setTimeout(() => setAlivePhase('ready'), 2500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // ── Skip overall onboarding ──
  const handleSkip = (skipGoogleConnect: boolean = false) => {
    const allAgentIds = Object.keys(ALL_AGENTS);
    localStorage.setItem('conflux-onboarded', 'true');
    localStorage.setItem('conflux-goals', JSON.stringify([]));
    localStorage.setItem('conflux-selected-agents', JSON.stringify(allAgentIds));
    localStorage.setItem('conflux-name', userName.trim() || 'there');
    if (skipGoogleConnect) {
      localStorage.setItem('conflux-google-skip', 'true');
    }
    onComplete([], allAgentIds);
  };

  // ── Derived ──
  const canNext = (
    (step === 0 && userName.trim().length > 0) || // Welcome: Must enter name
    step === 1 ||  // Provider: always can proceed
    (step === 2 && conversationDone) || // Conversation: must complete chat
    step === 3 || // Team: always can proceed, even if no agents selected (default to all)
    step === 4 || // Google Connect: always can skip or connect
    step === 5 // Alive: always has continue
  );

  // ── Background gradient for goals ──
  // ── Render ──

  const renderStep = () => {
    switch (step) {
      case 0: return renderWelcome();
      case 1: return renderProvider();
      case 2: return renderGoals();
      case 3: return renderTeam();
      case 4: return renderGoogleConnect();
      case 5: return renderAlive();
      default: return null;
    }
  };

  const renderWelcome = () => (
    <div style={{ textAlign: 'center', maxWidth: 420, width: '100%', margin: '0 auto', position: 'relative' }}>
      {/* Floating particles */}
      <Particles count={15} />

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

    </div>
  );

  const renderProvider = () => (
    <div style={{ textAlign: 'center', maxWidth: 480, width: '100%', margin: '0 auto', position: 'relative' }}>
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
    <div style={{ textAlign: 'center', maxWidth: 520, width: '100%', margin: '0 auto' }}>
      <h2
        className="animate-fade-in"
        style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}
      >
        Let's get to know you
      </h2>
      <p
        className="animate-fade-in"
        style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, '--stagger-delay': '100ms' } as React.CSSProperties}
      >
        Chat with Conflux and he'll put together your perfect team.
      </p>

      {/* Chat messages */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 16,
        maxHeight: 320,
        overflowY: 'auto',
        marginBottom: 16,
        textAlign: 'left',
      }}>
        {chatMessages.map((msg, i) => (
          <div
            key={i}
            className="animate-fade-in"
            style={{
              display: 'flex',
              justifyContent: msg.role === 'zigbot' ? 'flex-start' : 'flex-end',
              marginBottom: 12,
            }}
          >
            {msg.role === 'zigbot' && (
              <span style={{ fontSize: 20, marginRight: 8, flexShrink: 0, marginTop: 2 }}>🤖</span>
            )}
            <div style={{
              maxWidth: '80%',
              padding: '10px 14px',
              borderRadius: 14,
              background: msg.role === 'zigbot' ? 'var(--bg-primary)' : 'var(--accent-primary)',
              color: msg.role === 'zigbot' ? 'var(--text-primary)' : '#fff',
              fontSize: 14,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
            }}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input or Continue */}
      {!conversationDone ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleChatSend()}
            placeholder="What do you wish you had more help with?"
            autoFocus
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button
            onClick={handleChatSend}
            style={{
              padding: '12px 20px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--accent-primary)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Send
          </button>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 13, color: '#10b981', marginBottom: 12 }}>
            ✓ Your team has been selected based on our chat
          </p>
          <button
            className="next-btn"
            onClick={handleConversationContinue}
            style={{ maxWidth: 280, margin: '0 auto' }}
          >
            Meet Your Team →
          </button>
        </div>
      )}
    </div>
  );

  const renderTeam = () => {
    const agentIds = Array.from(selectedAgents);
    const agentList = agentIds.map(id => ALL_AGENTS[id]).filter(Boolean);

    return (
      <div style={{ textAlign: 'center', maxWidth: 520, width: '100%', margin: '0 auto' }}>
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
                    {AGENT_HELLOS[agent.id] || agent.why}
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

  const renderGoogleConnect = () => (
    <div style={{ textAlign: 'center', maxWidth: 480, width: '100%', margin: '0 auto', position: 'relative' }}>
        <h2
            className="animate-fade-in"
            style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}
        >
            Connect Your World
        </h2>
        <p
            className="animate-fade-in"
            style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, '--stagger-delay': '100ms' } as React.CSSProperties}
        >
            Integrate with Google to unlock powerful AI capabilities.
        </p>

        {/* Info Card */}
        <div
            className="animate-scale-in"
            style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: 20,
                marginBottom: 20,
                textAlign: 'left',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
            }}
        >
            <div style={{ fontSize: 36 }}>🔗</div>
            <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                    What connecting Google enables:
                </p>
                <ul style={{ fontSize: 13, color: 'var(--text-secondary)', listStyle: 'none', padding: 0, margin: 0 }}>
                    <li style={{ marginBottom: 4 }}>✉️ Gmail — read, send, search emails</li>
                    <li style={{ marginBottom: 4 }}>📄 Docs — read and write documents</li>
                    <li style={{ marginBottom: 4 }}>📊 Sheets — data and reports</li>
                    <li>📁 Drive — file management</li>
                </ul>
            </div>
        </div>

        {googleStatus === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, minHeight: 150 }}>
                <span className="dot-pulse" />
                <p style={{ color: 'var(--text-muted)' }}>Checking Google connection status...</p>
            </div>
        )}

        {googleStatus === 'canConnect' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <button
                    className="next-btn"
                    onClick={handleGoogleConnect}
                    style={{ width: 'auto', padding: '12px 32px', fontSize: 16 }}
                >
                    Connect with Google
                </button>
            </div>
        )}

        {googleStatus === 'connected' && (
            <div className="animate-scale-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, color: '#10b981' }}>
                <span style={{ fontSize: 48 }}>&#10004;&#65039;</span>
                <p style={{ fontSize: 18, fontWeight: 600 }}>Google Connected!</p>
                {googleEmail && <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Connected as: {googleEmail}</p>}
            </div>
        )}

        {googleStatus === 'error' && (
             <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, color: 'var(--accent-red)' }}>
                <span style={{ fontSize: 48 }}>&#9888;&#65039;</span>
                <p style={{ fontSize: 18, fontWeight: 600 }}>Connection Error</p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)',maxWidth: 300 }}>
                    There was an issue connecting to Google. Please check your credentials and try again.
                </p>
                <button
                    className="next-btn"
                    onClick={() => setGoogleStatus('canConnect')}
                    style={{ width: 'auto', padding: '10px 24px' }}
                >
                    Try Again
                </button>
            </div>
        )}
    </div>
  );

  const renderAlive = () => {
    const agentIds = Array.from(selectedAgents);
    const agentList = agentIds.map(id => ALL_AGENTS[id]).filter(Boolean);

    return (
      <div style={{
        textAlign: 'center', maxWidth: 420, width: '100%', margin: '0 auto', position: 'relative',
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
      {step < 5 && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: 10, padding: '20px 0 0', flexShrink: 0,
        }}>
          {[0, 1, 2, 3, 4, 5].map(i => {
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
      {step < 5 && (
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
            {(step === 2 || step === 3 || step === 4) && (
              <button
                onClick={() => handleSkip()}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--text-muted)', fontSize: 13,
                  cursor: 'pointer', textDecoration: 'underline',
                }}
              >
                Skip setup
              </button>
            )}
            <button
              className="next-btn"
              onClick={step === 0 ? nextStep : step === 1 ? nextStep : step === 2 ? nextStep : step === 3 ? nextStep : step === 4 ? nextStep : undefined}
              disabled={
                (step === 0 && userName.trim().length === 0) ||
                (step === 3 && selectedAgents.size < 1)
              }
              style={{
                width: 'auto', padding: '10px 28px',
                opacity: (
                  (step === 0 && userName.trim().length === 0) ||
                  (step === 3 && selectedAgents.size < 1)
                ) ? 0.5 : 1,
                cursor: (
                  (step === 0 && userName.trim().length === 0) ||
                  (step === 3 && selectedAgents.size < 1)
                ) ? 'not-allowed' : 'pointer',
              }}
            >
              {step === 0 ? 'Get Started' : step === 1 ? 'Continue →' : 'Next →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
