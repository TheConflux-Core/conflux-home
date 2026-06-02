import { useEffect, useState, useCallback, useRef } from 'react';
import TourSpotlight from './TourSpotlight';
import TourTooltip from './TourTooltip';
import { useTourState } from '../hooks/useTourState';
import { playNavSwish } from '../lib/sound';

interface TourStep {
  id: string;
  targetId: string | null; // data-tour-id, null for full-screen overlay
  title: string;
  text: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    targetId: null,
    title: 'Your Team Is Alive',
    text: "You just met your AI agents. They're not tools — they're teammates. Each one has a specialty, and they work together. Let me show you how.",
  },
  {
    id: 'chat',
    targetId: 'chat',
    title: 'Talk to Your Agents',
    text: 'This is how you communicate. Type naturally — no commands needed. Your agents remember every conversation and learn your preferences over time.',
  },
  {
    id: 'proactive',
    targetId: 'intel',
    title: 'They Notice Things',
    text: 'Your agents don\'t wait for you to ask. They watch for patterns, spot opportunities, and nudge you when something needs attention. That\'s the difference.',
  },
  {
    id: 'apps',
    targetId: 'apps',
    title: 'Apps Are Worlds',
    text: 'Each app isn\'t just a feature — it\'s a world your agents live in. Budget is Pulse\'s domain. Kitchen is Hearth\'s. They\'re building your experience right now.',
  },
  {
    id: 'voice',
    targetId: 'chat',
    title: 'Speak Naturally',
    text: 'You can talk to your agents too. Click the mic button or use push-to-talk. They understand context — no robotic commands needed.',
  },
  {
    id: 'complete',
    targetId: null,
    title: "You're Ready",
    text: "The best way to learn is to explore. Your agents are waiting. You can replay this tour anytime from Settings.",
  },
];

// ── Confetti Particle ──

interface ConfettiParticle {
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

function ConfettiBurst({ active, onComplete }: { active: boolean; onComplete?: () => void }) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;

    const colors = ['#00d4ff', '#00cc88', '#10b981', '#f59e0b', '#a78bfa', '#6366f1', '#22c55e'];
    const initial: ConfettiParticle[] = Array.from({ length: 50 }, (_, i) => ({
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
          onComplete?.();
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
            transition: 'none',
          }}
        />
      ))}
    </div>
  );
}

// ── Tour Start Pulse Overlay ──

function TourStartPulse({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <>
      <style>{`
        @keyframes tour-pulse-overlay-in {
          0% { opacity: 0; }
          20% { opacity: 1; }
          100% { opacity: 0; }
        }
        .tour-pulse-overlay {
          position: fixed;
          inset: 0;
          z-index: 100000;
          pointer-events: none;
          background: radial-gradient(circle at center, rgba(0, 113, 227, 0.08) 0%, transparent 60%);
          animation: tour-pulse-overlay-in 1.2s ease-out forwards;
        }
      `}</style>
      <div className="tour-pulse-overlay" />
    </>
  );
}

interface GuidedTourProps {
  onComplete: () => void;
  /** Whether tour should auto-start (e.g., right after welcome overlay dismiss) */
  autoStart?: boolean;
}

export default function GuidedTour({ onComplete, autoStart = false }: GuidedTourProps) {
  const { currentStep, nextStep, completeTour, skipTour } = useTourState();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isActive, setIsActive] = useState(!autoStart); // if autoStart, will activate via effect
  const [showConfetti, setShowConfetti] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const hasAutoStarted = useRef(false);

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const isFirst = currentStep === 0;

  // Auto-start: fire confetti + pulse after a small delay
  useEffect(() => {
    if (autoStart && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      // Short delay to let the welcome overlay fully fade out
      const t1 = setTimeout(() => {
        setIsActive(true);
        setShowConfetti(true);
        setShowPulse(true);
        // Play a satisfying sound
        playNavSwish('forward');
      }, 400);
      const t2 = setTimeout(() => setShowPulse(false), 1600);
      const t3 = setTimeout(() => setShowConfetti(false), 3000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [autoStart]);

  // Get target element rect
  useEffect(() => {
    if (!step || !isActive) return;

    const updateRect = () => {
      if (step.targetId) {
        const el = document.querySelector(`[data-tour-id="${step.targetId}"]`);
        setTargetRect(el?.getBoundingClientRect() ?? null);
      } else {
        setTargetRect(null);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(updateRect, 100);

    // Update on resize
    window.addEventListener('resize', updateRect);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRect);
    };
  }, [step, currentStep, isActive]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isActive, currentStep]);

  const handleNext = useCallback(() => {
    playNavSwish('forward');
    if (isLast) {
      setIsActive(false);
      completeTour();
      onComplete();
    } else {
      nextStep();
    }
  }, [isLast, nextStep, completeTour, onComplete]);

  const handleSkip = useCallback(() => {
    setIsActive(false);
    skipTour();
    onComplete();
  }, [skipTour, onComplete]);

  if (!isActive || !step) return null;

  return (
    <div className="guided-tour">
      {/* Confetti burst on tour start */}
      <ConfettiBurst active={showConfetti} />

      {/* Radial pulse on tour start */}
      {showPulse ? <TourStartPulse active={true} />
      : null}

      <TourSpotlight targetRect={targetRect} />
      <TourTooltip
        targetRect={targetRect}
        title={step.title}
        text={step.text}
        step={currentStep}
        total={TOUR_STEPS.length}
        onNext={handleNext}
        onSkip={handleSkip}
        isLast={isLast}
        isFirst={isFirst}
      />
    </div>
  );
}
