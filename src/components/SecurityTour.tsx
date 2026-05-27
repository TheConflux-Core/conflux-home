// Conflux Home — Security Guided Tour
// 4 steps: Hero Score → Scan Controls → 9 Tabs → Pending Requests

import { useState, useEffect, useRef } from 'react';
import TourSpotlight from './TourSpotlight';

const TOUR_DONE_KEY = 'security-tour-completed';

const TOUR_STEPS = [
  {
    id: 'hero',
    title: 'Your Security Score',
    body: 'This ring shows your overall security posture — a quick glance at how protected your system is. Four mini rings show Aegis, Viper, Agent defense, and active alerts.',
    target: '.sec-hero',
  },
  {
    id: 'scans',
    title: 'Run Security Scans',
    body: 'Aegis (Blue Team) audits your system for unlocked doors and weak settings. Viper (Red Team) hunts for vulnerabilities attackers could exploit. Run them regularly.',
    target: '.sec-scan-types',
  },
  {
    id: 'tabs',
    title: 'Navigate Security Views',
    body: 'Nine views: Overview for a quick health check, Aegis and Viper for deep scans, Watchtower for continuous monitoring with files/processes/network panels, Sentinel for agent quarantine and isolation, Network for discovering devices on your WiFi, Activity for agent events, Permissions for agent access controls, and Pending for requests awaiting your approval.',
    target: '.sec-tabs',
  },
  {
    id: 'pending',
    title: 'Permission Requests',
    body: "When an agent wants to do something outside its normal boundaries, you'll see a request here. You can allow or block it — once or always. Stay in control.",
    target: '.sec-alert-badge',
  },
];

export function hasCompletedSecurityTour(): boolean {
  return localStorage.getItem(TOUR_DONE_KEY) === 'true';
}

export function resetSecurityTour(): void {
  localStorage.removeItem(TOUR_DONE_KEY);
}

interface SecurityTourProps {
  onComplete: () => void;
}

export default function SecurityTour({ onComplete }: SecurityTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isActive, setIsActive] = useState(true);

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;

  // Stable refs for keyboard nav — avoid stale closure issue
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const handleNextRef = useRef<() => void>(() => {
    if (isLast) {
      setIsActive(false);
      localStorage.setItem(TOUR_DONE_KEY, 'true');
      onCompleteRef.current();
    } else {
      setCurrentStep(s => s + 1);
    }
  });

  const handleSkipRef = useRef<() => void>(() => {
    setIsActive(false);
    localStorage.setItem(TOUR_DONE_KEY, 'true');
    onCompleteRef.current();
  });

  // Track target with double-RAF timing
  useEffect(() => {
    if (!isActive || !step) return;

    const updateRect = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = document.querySelector(step.target);
          setTargetRect(el?.getBoundingClientRect() ?? null);
        });
      });
    };

    const timer = setTimeout(updateRect, 200);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [currentStep, step, isActive]);

  // Keyboard navigation — uses refs for stability
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsActive(false); onCompleteRef.current(); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNextRef.current(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isActive]);

  const handleNext = () => {
    if (isLast) {
      setIsActive(false);
      localStorage.setItem(TOUR_DONE_KEY, 'true');
      onComplete();
    } else {
      setCurrentStep(s => s + 1);
    }
  };

  const handleSkip = () => {
    setIsActive(false);
    localStorage.setItem(TOUR_DONE_KEY, 'true');
    onComplete();
  };

  if (!isActive) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 8999,
        backgroundImage: "url('/backgrounds/themes/viper.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.75)', zIndex: 0 }} />
      <TourSpotlight targetRect={targetRect} padding={10} borderRadius={16} />
      <SecurityTourTooltip
        targetRect={targetRect}
        step={step}
        currentStep={currentStep}
        total={TOUR_STEPS.length}
        isLast={isLast}
        onNext={handleNext}
        onSkip={handleSkip}
      />
    </div>
  );
}

// ── Tour Tooltip ─────────────────────────────────────────────────

interface TooltipProps {
  targetRect: DOMRect | null;
  step: typeof TOUR_STEPS[0];
  currentStep: number;
  total: number;
  isLast: boolean;
  onNext: () => void;
  onSkip: () => void;
}

function SecurityTourTooltip({ targetRect, step, currentStep, total, isLast, onNext, onSkip }: TooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, placement: 'bottom' as 'top' | 'bottom' });

  useEffect(() => {
    if (!ref.current || !targetRect) return;

    const tooltip = ref.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 16;

    const spaceBelow = vh - targetRect.bottom - gap * 2;
    const spaceAbove = targetRect.top - gap * 2;
    const placement = spaceBelow >= tooltipRect.height ? 'bottom' : spaceAbove >= tooltipRect.height ? 'top' : 'bottom';

    let top = placement === 'bottom'
      ? targetRect.bottom + gap
      : targetRect.top - tooltipRect.height - gap;
    top = Math.max(gap, Math.min(top, vh - tooltipRect.height - gap));

    let left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
    left = Math.max(gap, Math.min(left, vw - tooltipRect.width - gap));

    setPos({ top, left, placement });
  }, [targetRect]);

  // Fallback centered position when no target
  useEffect(() => {
    if (!targetRect && ref.current) {
      const tooltip = ref.current.getBoundingClientRect();
      setPos({
        top: window.innerHeight / 2 - tooltip.height / 2 + 80,
        left: window.innerWidth / 2 - tooltip.width / 2,
        placement: 'bottom',
      });
    }
  }, [targetRect]);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 9000,
        width: 440,
        maxWidth: 'calc(100vw - 48px)',
        background: 'linear-gradient(135deg, #0a0f1a, #0f1f15)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid #22c55e33',
        borderRadius: 22,
        boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,197,94,0.1), 0 0 40px rgba(34,197,94,0.08)',
        animation: 'secFadeScale 0.25s ease-out',
        overflow: 'visible',
      }}
    >
      {targetRect && (
        <div
          style={{
            position: 'absolute',
            width: 14,
            height: 14,
            background: 'linear-gradient(135deg, #0a0f1a, #0f1f15)',
            border: '1px solid #22c55e33',
            transform: 'rotate(45deg)',
            zIndex: -1,
            left: Math.min(
              Math.max(targetRect.left + targetRect.width / 2 - pos.left, 28),
              (ref.current?.getBoundingClientRect().width ?? 440) - 28
            ),
            ...(pos.placement === 'bottom'
              ? { top: -8, borderRight: 'none', borderBottom: 'none' }
              : { bottom: -8, borderLeft: 'none', borderTop: 'none' }
            ),
          } as React.CSSProperties}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: 1.2 }}>
          Step {currentStep + 1} of {total}
        </span>
        <button
          onClick={onSkip}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#475569',
            cursor: 'pointer',
            fontSize: 16,
            padding: '6px 10px',
            borderRadius: 8,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '12px 24px 0' }}>
        {TOUR_STEPS.map((_, i) => (
          <div
            key={i}
            style={{
              height: 6,
              borderRadius: 4,
              background: i === currentStep ? '#22c55e' : i < currentStep ? '#22c55e66' : '#1e293b',
              width: i === currentStep ? 36 : 10,
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>

      <h3 style={{
        fontSize: 22,
        fontWeight: 800,
        color: '#f1f5f9',
        margin: '16px 0 10px',
        padding: '0 24px',
        letterSpacing: '-0.3px',
      }}>
        {step.title}
      </h3>
      <p style={{
        fontSize: 15,
        color: '#94a3b8',
        margin: 0,
        padding: '0 24px',
        lineHeight: 1.65,
      }}>
        {step.body}
      </p>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 24px 24px',
        borderTop: '1px solid #1e293b',
        marginTop: 18,
      }}>
        <button
          onClick={onSkip}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontSize: 13,
            cursor: 'pointer',
            padding: '10px 14px',
            borderRadius: 10,
          }}
        >
          Skip tour
        </button>
        <button
          onClick={onNext}
          style={{
            background: 'linear-gradient(135deg, #064e32, #022c1a)',
            color: '#22c55e',
            border: '1px solid #22c55e44',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            padding: '11px 24px',
            cursor: 'pointer',
            boxShadow: '0 0 24px #22c55e18',
            transition: 'all 0.15s',
          }}
        >
          {isLast ? '🛡️ Secure Your System' : 'Next →'}
        </button>
      </div>
    </div>
  );
}