/**
 * Tour V2 — The Real Tour
 *
 * After onboarding, this tour teaches users what makes Conflux Home
 * fundamentally different from every other AI app. Not "where things are"
 * but "how this changes your life."
 *
 * Conflux narrates each step via ElevenLabs TTS.
 * Spotlight highlights real UI elements. Full-screen steps for concepts.
 * Interactive Google Connect offer. Agent voice line finale.
 *
 * SAFETY: Completely self-contained. Imports only from existing shared
 * components (TourSpotlight, TourTooltip). No existing code modified.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import TourSpotlight from './TourSpotlight';
import TourTooltip from './TourTooltip';
import { invoke } from '@tauri-apps/api/core';

// ── Audio playback ───────────────────────────────────────────

let _tourAudio: HTMLAudioElement | null = null;

function stopTourAudio() {
  if (_tourAudio) {
    _tourAudio.pause();
    _tourAudio.src = '';
    _tourAudio = null;
  }
}

function playTourAudio(base64: string): Promise<void> {
  return new Promise((resolve, reject) => {
    stopTourAudio();
    const audio = new Audio(`data:audio/mp3;base64,${base64}`);
    _tourAudio = audio;
    audio.onended = () => { _tourAudio = null; resolve(); };
    audio.onerror = () => { _tourAudio = null; resolve(); }; // don't block tour on audio errors
    audio.play().catch(() => { _tourAudio = null; resolve(); }); // autoplay may be blocked
  });
}

// ── Agent data for finale ────────────────────────────────────

const AGENTS = [
  { id: 'conflux', name: 'Conflux', emoji: '🤖', voiceLine: 'Online. Ready to build.' },
  { id: 'helix',   name: 'Helix',   emoji: '🔬', voiceLine: 'I find the signal in the noise.' },
  { id: 'pulse',   name: 'Pulse',   emoji: '💚', voiceLine: "Let's make your money move smarter." },
  { id: 'hearth',  name: 'Hearth',  emoji: '🍳', voiceLine: "Good food. Good fuel. Let's cook." },
  { id: 'echo',    name: 'Echo',    emoji: '🫂', voiceLine: "I'm here. However you're doing." },
  { id: 'aegis',   name: 'Aegis',   emoji: '🛡️', voiceLine: 'Your fortress is my responsibility.' },
  { id: 'viper',   name: 'Viper',   emoji: '🐍', voiceLine: 'I break things so nothing breaks you.' },
];

// ── Tour steps ───────────────────────────────────────────────

interface TourV2Step {
  id: string;
  targetId: string | null;
  title: string;
  text: string;
  durationMs?: number;     // auto-advance delay for concept steps
  isInteractive?: boolean; // shows custom button instead of "Next"
  interactiveLabel?: string;
}

const TOUR_STEPS: TourV2Step[] = [
  {
    id: 'welcome',
    targetId: null,
    title: 'Your Team Is Alive',
    text: "Welcome home. I'm Conflux — I'll be your guide. Your agents aren't waiting for instructions. They're already working. Let me show you what that means.",
    durationMs: 7000,
  },
  {
    id: 'heartbeat',
    targetId: null,
    title: 'The Heartbeat',
    text: "Every 30 minutes, a system scan runs through your entire life. Pulse checks your budget. Hearth reviews your meals. Aegis scans for threats. Horizon tracks your goals. You don't ask — we just check in.",
    durationMs: 8000,
  },
  {
    id: 'memory',
    targetId: 'chat',
    title: 'We Remember Everything',
    text: "Every conversation we have is remembered. Your preferences, your patterns, your history — it all carries forward. Ask Pulse about last month's spending. Tell Hearth you're allergic to shellfish once. We never forget.",
    durationMs: 7000,
  },
  {
    id: 'cross-app',
    targetId: 'intel',
    title: 'Cross-App Intelligence',
    text: "Your agents talk to each other. Pulse might notice you're spending more on dining and tell Hearth — who adjusts your meal plan. Horizon sees your savings goal and tells Pulse to tighten the budget. We're a team, not a toolkit.",
    durationMs: 8000,
  },
  {
    id: 'navigation',
    targetId: 'dock',
    title: 'Your Command Center',
    text: "This dock is always here. Left button opens your app library. Center button is where you talk to us — type or speak. Right button takes you home. Everything is one click away.",
    durationMs: 7000,
  },
  {
    id: 'voice-themes',
    targetId: null,
    title: 'Voice & Themes',
    text: "You can talk to us too — click the chat button and use the microphone. And in Settings, you can change the entire look of Conflux Home. Dark mode, light mode, custom colors. Make it yours.",
    durationMs: 7000,
  },
  {
    id: 'google-connect',
    targetId: null,
    title: 'Connect Your Life',
    text: "Want to go deeper? Connect your Google account and we can check your calendar, read your emails, and access your Drive. Your agents become exponentially more powerful with your real data. Ready to connect?",
    isInteractive: true,
    interactiveLabel: 'Connect Google',
  },
  {
    id: 'proactive',
    targetId: null,
    title: 'Proactive, Not Reactive',
    text: "We don't wait for you to ask. We schedule tasks, monitor patterns, and nudge you when something needs attention. A bill due soon. A goal almost reached. A habit you're building. We're always watching.",
    durationMs: 7000,
  },
  {
    id: 'more-than-chat',
    targetId: null,
    title: 'More Than Chat',
    text: "This isn't another AI chatbot. This is an operating system for your life. Persistent memory. Cross-app intelligence. Proactive agents. Scheduled automation. A team that knows you and works together — even when you're not here.",
    durationMs: 8000,
  },
  {
    id: 'finale',
    targetId: null,
    title: "You're Home",
    text: "Your team is ready. Explore freely — we're watching over you. If you ever need this tour again, find it in Settings.",
    durationMs: 6000,
  },
];

// ── Confetti ─────────────────────────────────────────────────

interface ConfettiDot {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  color: string;
  size: number;
  opacity: number;
  shape: 'rect' | 'circle';
}

function ConfettiBurst({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<ConfettiDot[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;

    const colors = ['#00d4ff', '#00cc88', '#10b981', '#f59e0b', '#a78bfa', '#6366f1', '#22c55e'];
    const initial: ConfettiDot[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 20,
      y: 40,
      vx: (Math.random() - 0.5) * 6,
      vy: -(Math.random() * 8 + 2),
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 6,
      opacity: 1,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    }));

    setParticles(initial);

    let frame = 0;
    const gravity = 0.15;
    const drag = 0.99;

    const tick = () => {
      frame++;
      setParticles(prev => {
        if (prev.length === 0 || frame > 120) {
          cancelAnimationFrame(animRef.current);
          return [];
        }
        return prev
          .map(p => ({
            ...p,
            x: p.x + p.vx * 0.5,
            y: p.y + p.vy * 0.5,
            vy: p.vy + gravity,
            vx: p.vx * drag,
            rotation: p.rotation + p.rotSpeed,
            opacity: frame > 60 ? p.opacity * 0.95 : p.opacity,
          }))
          .filter(p => p.opacity > 0.05 && p.y < 105);
      });
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 100001,
    }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.shape === 'rect' ? p.size * 0.6 : p.size,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            background: p.color,
            opacity: p.opacity,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}

// ── Agent Team Row (for concept steps) ───────────────────────

function AgentTeamRow() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: 8,
      margin: '14px 0 6px',
      flexWrap: 'wrap',
    }}>
      {AGENTS.map((agent, i) => (
        <div
          key={agent.id}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            animation: `tour-agent-pop 0.4s ${i * 0.08}s both`,
          }}
        >
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: 'rgba(0, 212, 255, 0.08)',
            border: '1px solid rgba(0, 212, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
          }}>
            {agent.emoji}
          </div>
          <span style={{
            fontSize: 9,
            color: 'rgba(255,255,255,0.5)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            {agent.name}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Heartbeat Pulse Visual ───────────────────────────────────

function HeartbeatVisual() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      margin: '14px 0 6px',
    }}>
      <svg width="220" height="50" viewBox="0 0 220 50" fill="none">
        <path
          d="M0 25 L40 25 L50 25 L60 10 L70 40 L80 15 L90 35 L100 25 L120 25 L130 25 L140 8 L150 42 L160 18 L170 32 L180 25 L220 25"
          stroke="#00d4ff"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
          style={{
            animation: 'tour-heartbeat-line 2s ease-in-out infinite',
          }}
        />
        <circle cx="110" cy="25" r="4" fill="#00d4ff" opacity="0.5"
          style={{ animation: 'tour-heartbeat-dot 2s ease-in-out infinite' }}
        />
      </svg>
    </div>
  );
}

// ── Cross-App Flow Visual ────────────────────────────────────

function CrossAppVisual() {
  const flows = [
    { from: 'Pulse', to: 'Hearth', via: 'dining spend → meal adjust', color: '#10b981' },
    { from: 'Horizon', to: 'Pulse', via: 'savings goal → budget tighten', color: '#6366f1' },
    { from: 'Aegis', to: 'Conflux', via: 'threat detected → alert sent', color: '#f59e0b' },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      margin: '12px 0 4px',
    }}>
      {flows.map((flow, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            borderRadius: 8,
            background: `${flow.color}08`,
            border: `1px solid ${flow.color}20`,
            animation: `tour-agent-pop 0.4s ${i * 0.15}s both`,
            fontSize: 11,
          }}
        >
          <span style={{ color: flow.color, fontWeight: 700 }}>{flow.from}</span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>→</span>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{flow.via}</span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>→</span>
          <span style={{ color: flow.color, fontWeight: 700 }}>{flow.to}</span>
        </div>
      ))}
    </div>
  );
}

// ── Proactive Visual ─────────────────────────────────────────

function ProactiveVisual() {
  const items = [
    { icon: '💳', text: 'Netflix unused for 3 weeks — consider canceling?', color: '#10b981' },
    { icon: '🎯', text: 'Vacation fund 73% there — on pace for August', color: '#6366f1' },
    { icon: '🛒', text: 'You usually buy groceries on Saturdays — add to list?', color: '#f59e0b' },
    { icon: '🛡️', text: 'Password breach detected on 2 accounts', color: '#ef4444' },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 5,
      margin: '12px 0 4px',
    }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            animation: `tour-agent-pop 0.4s ${i * 0.12}s both`,
            fontSize: 11,
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          <span>{item.icon}</span>
          <span style={{ flex: 1 }}>{item.text}</span>
          <span style={{
            fontSize: 9,
            color: item.color,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            opacity: 0.8,
          }}>auto</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Tour V2 Component ───────────────────────────────────

interface TourV2Props {
  onComplete: () => void;
  onNavigate?: (view: string) => void;
}

export default function TourV2({ onComplete, onNavigate }: TourV2Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFinaleAgents, setShowFinaleAgents] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasStarted = useRef(false);

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const isFirst = currentStep === 0;

  // ── TTS ────────────────────────────────────────────────────

  const speak = useCallback(async (text: string) => {
    if (isMuted) return;
    try {
      const result = await invoke<{ audio_base64: string }>('tts_speak', {
        text,
        voice: 'conflux',
      });
      await playTourAudio(result.audio_base64);
    } catch {
      // TTS unavailable — tour continues silently
    }
  }, [isMuted]);

  // ── Start tour with initial TTS ────────────────────────────

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);

    // Speak the welcome after a brief pause
    const t = setTimeout(() => {
      speak(TOUR_STEPS[0].title + '. ' + TOUR_STEPS[0].text);
    }, 800);
    return () => clearTimeout(t);
  }, [speak]);

  // ── Speak when step changes ────────────────────────────────

  useEffect(() => {
    if (!step || !hasStarted.current) return;
    const t = setTimeout(() => {
      speak(step.title + '. ' + step.text);
    }, 400);
    return () => clearTimeout(t);
  }, [currentStep, step, speak]);

  // ── Spotlight positioning ──────────────────────────────────

  useEffect(() => {
    if (!step || !isActive) return;

    const updateRect = () => {
      if (step.targetId) {
        const el = document.querySelector(`[data-tour-id="${step.targetId}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
          setTargetRect(el.getBoundingClientRect());
        } else {
          setTargetRect(null);
        }
      } else {
        setTargetRect(null);
      }
    };

    const timer = setTimeout(updateRect, 200);
    window.addEventListener('resize', updateRect);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRect);
    };
  }, [step, currentStep, isActive]);

  // ── Auto-advance for concept steps ─────────────────────────

  useEffect(() => {
    if (!step || isLast || step.isInteractive) return;

    if (step.durationMs) {
      autoAdvanceTimer.current = setTimeout(() => {
        setCurrentStep(prev => Math.min(prev + 1, TOUR_STEPS.length - 1));
      }, step.durationMs);
    }

    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, [currentStep, step, isLast]);

  // ── Finale agent voice lines ───────────────────────────────

  useEffect(() => {
    if (step?.id !== 'finale') return;

    const t = setTimeout(() => setShowFinaleAgents(true), 1500);

    // Play all agent voice lines in sequence
    const playSequence = async () => {
      await new Promise(r => setTimeout(r, 2500));
      for (const agent of AGENTS) {
        if (!isMuted) {
          try {
            const result = await invoke<{ audio_base64: string }>('tts_speak', {
              text: agent.voiceLine,
              voice: agent.id,
            });
            await playTourAudio(result.audio_base64);
            await new Promise(r => setTimeout(r, 400));
          } catch {
            // TTS unavailable — skip
          }
        }
      }
    };
    playSequence();

    return () => clearTimeout(t);
  }, [step?.id, isMuted]);

  // ── Keyboard navigation ────────────────────────────────────

  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleComplete();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (!step?.isInteractive) handleNext();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ── Cleanup on unmount ─────────────────────────────────────

  useEffect(() => {
    return () => {
      stopTourAudio();
      window.speechSynthesis.cancel();
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  // ── Navigation ─────────────────────────────────────────────

  const handleNext = useCallback(() => {
    stopTourAudio();
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);

    if (isLast) {
      handleComplete();
    } else {
      setCurrentStep(prev => Math.min(prev + 1, TOUR_STEPS.length - 1));
    }
  }, [isLast]);

  const handleGoogleConnect = useCallback(() => {
    stopTourAudio();
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    onNavigate?.('google');
    // Continue tour after a moment
    setTimeout(() => {
      setCurrentStep(prev => Math.min(prev + 1, TOUR_STEPS.length - 1));
    }, 500);
  }, [onNavigate]);

  const handleComplete = useCallback(() => {
    stopTourAudio();
    window.speechSynthesis.cancel();
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    setIsActive(false);
    localStorage.setItem('conflux-tour-v2-completed', 'true');
    onComplete();
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  if (!isActive || !step) return null;

  // ── Render enhanced tooltip content ────────────────────────

  const enhancedTitle = step.title;
  let enhancedText = step.text;

  // Add visual elements to specific steps
  let extraContent: React.ReactNode = null;
  if (step.id === 'welcome' || step.id === 'finale') {
    extraContent = <AgentTeamRow />;
  } else if (step.id === 'heartbeat') {
    extraContent = <HeartbeatVisual />;
  } else if (step.id === 'cross-app') {
    extraContent = <CrossAppVisual />;
  } else if (step.id === 'proactive') {
    extraContent = <ProactiveVisual />;
  }

  return (
    <div className="guided-tour">
      {/* Confetti */}
      <ConfettiBurst active={showConfetti} />

      {/* Spotlight */}
      <TourSpotlight targetRect={targetRect} />

      {/* Custom enhanced tooltip */}
      <div
        className="tour-v2-tooltip-anchor"
        style={{
          position: 'fixed',
          top: targetRect
            ? targetRect.bottom + 16
            : '50%',
          left: targetRect
            ? Math.max(16, Math.min(
                targetRect.left + targetRect.width / 2 - 175,
                window.innerWidth - 366
              ))
            : '50%',
          transform: targetRect ? 'none' : 'translate(-50%, -50%)',
          zIndex: 10000,
          pointerEvents: 'auto',
        }}
      >
        <div className="tour-v2-tooltip" style={{ width: 350 }}>
          {/* Agent indicator */}
          <div className="tour-v2-agent-indicator">
            <span className="tour-v2-agent-dot" />
            <span className="tour-v2-agent-label">Conflux is explaining</span>
            <button
              className="tour-v2-mute-btn"
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute narration' : 'Mute narration'}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          </div>

          {/* Content */}
          <div className="tour-v2-content">
            <h3 className="tour-v2-title">{enhancedTitle}</h3>
            <p className="tour-v2-text">{enhancedText}</p>
            {extraContent}
          </div>

          {/* Footer */}
          <div className="tour-v2-footer">
            <span className="tour-v2-progress">
              {currentStep + 1} / {TOUR_STEPS.length}
            </span>
            <div className="tour-v2-actions">
              <button className="tour-v2-skip" onClick={handleSkip}>
                Skip tour
              </button>
              {step.isInteractive ? (
                <button className="tour-v2-connect" onClick={handleGoogleConnect}>
                  {step.interactiveLabel || 'Connect'}
                </button>
              ) : (
                <button className="tour-v2-next" onClick={handleNext}>
                  {isLast ? "Let's Go" : isFirst ? "Let's Go" : 'Next →'}
                </button>
              )}
            </div>
          </div>

          {/* Finale agents */}
          {showFinaleAgents && (
            <div className="tour-v2-finale-agents">
              {AGENTS.map((agent, i) => (
                <div
                  key={agent.id}
                  className="tour-v2-finale-agent"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <span className="tour-v2-finale-emoji">{agent.emoji}</span>
                  <span className="tour-v2-finale-name">{agent.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Styles */}
      <style>{`
        @keyframes tour-agent-pop {
          from { opacity: 0; transform: scale(0.8) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes tour-heartbeat-line {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
        @keyframes tour-heartbeat-dot {
          0%, 100% { r: 3; opacity: 0.3; }
          50% { r: 6; opacity: 0.8; }
        }
        @keyframes tour-v2-agent-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes tour-v2-finale-pop {
          from { opacity: 0; transform: scale(0.5) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .tour-v2-tooltip {
          background: rgba(10, 10, 20, 0.96);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 18px;
          box-shadow:
            0 12px 48px rgba(0, 0, 0, 0.6),
            0 0 0 1px rgba(0, 212, 255, 0.1),
            0 0 60px rgba(0, 212, 255, 0.06);
          overflow: hidden;
          animation: tour-v2-appear 0.35s ease-out;
        }
        @keyframes tour-v2-appear {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .tour-v2-agent-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(0, 212, 255, 0.03);
        }
        .tour-v2-agent-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #00d4ff;
          box-shadow: 0 0 12px rgba(0, 212, 255, 0.5);
          animation: tour-v2-agent-pulse 2s ease-in-out infinite;
        }
        .tour-v2-agent-label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 500;
          flex: 1;
          letter-spacing: 0.3px;
        }
        .tour-v2-mute-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          padding: 2px;
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        .tour-v2-mute-btn:hover { opacity: 1; }

        .tour-v2-content {
          padding: 20px 20px 16px;
        }
        .tour-v2-title {
          font-size: 17px;
          font-weight: 700;
          background: linear-gradient(135deg, #00d4ff, #6366f1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 8px;
          line-height: 1.3;
        }
        .tour-v2-text {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
          line-height: 1.6;
        }

        .tour-v2-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .tour-v2-progress {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.35);
          font-weight: 500;
          font-variant-numeric: tabular-nums;
        }
        .tour-v2-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tour-v2-skip {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.45);
          font-size: 12px;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 8px;
          transition: background 0.15s, color 0.15s;
        }
        .tour-v2-skip:hover {
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.8);
        }
        .tour-v2-next {
          background: linear-gradient(135deg, #00d4ff, #6366f1);
          color: #fff;
          border: none;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 18px;
          border-radius: 10px;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          box-shadow: 0 2px 12px rgba(0, 212, 255, 0.3);
        }
        .tour-v2-next:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 20px rgba(0, 212, 255, 0.5);
        }
        .tour-v2-next:active {
          transform: scale(0.98);
        }
        .tour-v2-connect {
          background: linear-gradient(135deg, #4285f4, #34a853);
          color: #fff;
          border: none;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 18px;
          border-radius: 10px;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          box-shadow: 0 2px 12px rgba(66, 133, 244, 0.3);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .tour-v2-connect:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 20px rgba(66, 133, 244, 0.5);
        }
        .tour-v2-connect:active {
          transform: scale(0.98);
        }

        .tour-v2-finale-agents {
          display: flex;
          justify-content: center;
          gap: 10px;
          padding: 12px 20px 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          flex-wrap: wrap;
        }
        .tour-v2-finale-agent {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          animation: tour-v2-finale-pop 0.4s ease-out both;
        }
        .tour-v2-finale-emoji {
          font-size: 20px;
        }
        .tour-v2-finale-name {
          font-size: 9px;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        @media (prefers-reduced-motion: reduce) {
          .tour-v2-tooltip,
          .tour-v2-agent-dot,
          .tour-v2-finale-agent {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}