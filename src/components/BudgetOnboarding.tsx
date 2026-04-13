// Conflux Home — Budget Onboarding / Guided Tour
// Pulse Financial Boot Sequence + 9-Step Tour

import { useState, useEffect, useRef } from 'react';
import '../styles/pulse-onboarding.css';

export interface BudgetOnboardingProps {
  onComplete: () => void;
  onOpenConfig: () => void;
}

type TourStep = {
  id: string;
  target: string;        // CSS selector for spotlight
  title: string;
  body: string;
  action?: 'click' | 'input' | 'observe' | 'dismiss';
  actionLabel?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
};

// The 9-step tour
const TOUR_STEPS: TourStep[] = [
  {
    id: 'intro-ring',
    target: '.pulse-heart-container',
    title: 'Welcome to Pulse',
    body: 'This is your financial heartbeat. Watch it breathe — it watches you too. Pulse tracks every dollar so you never have to guess where your money went.',
    action: 'dismiss',
    actionLabel: 'Let\'s go →',
    position: 'center',
  },
  {
    id: 'cockpit',
    target: '.budget-cockpit',
    title: 'Your Financial Cockpit',
    body: 'Income, obligations, and projected surplus — all in one glance. No scrolling, no tabs. Just the truth.',
    action: 'dismiss',
    actionLabel: 'Next →',
    position: 'bottom',
  },
  {
    id: 'config-btn',
    target: '.btn-secondary',
    title: 'First, Set Your Rhythm',
    body: 'Tell Pulse when you get paid. Click CONFIG to set your pay schedule and income. Pulse uses this to project your allocation per pay period.',
    action: 'click',
    actionLabel: 'Open Config',
    position: 'bottom',
  },
  {
    id: 'buckets',
    target: '.grid-wrapper',
    title: 'Every Dollar Has a Job',
    body: 'These are Buckets — your spending categories. Each gets a monthly target. Pulse divides that target by your pay schedule to show exactly what to set aside per paycheck.',
    action: 'dismiss',
    actionLabel: 'Next →',
    position: 'top',
  },
  {
    id: 'matrix-grid',
    target: '.data-row',
    title: 'Your Allocation Grid',
    body: 'See what\'s been allocated vs. what\'s actually been paid. Green means secured. Yellow means still due. The bar fills as you pay.',
    action: 'dismiss',
    actionLabel: 'Next →',
    position: 'top',
  },
  {
    id: 'log-payment',
    target: '.btn-primary',
    title: 'Log a Payment',
    body: 'The fastest way to log: click LOG PAYMENT. Select a bucket, enter an amount, confirm. Pulse updates the grid instantly.',
    action: 'dismiss',
    actionLabel: 'Next →',
    position: 'bottom',
  },
  {
    id: 'ai-input',
    target: '.nlp-input-container',
    title: 'Just Say It',
    body: 'No forms. No dropdowns. Type naturally: "Spent $47 at Costco" or "Paid $880 for rent." Pulse parses it, categorizes it, and logs it.',
    action: 'dismiss',
    actionLabel: 'Next →',
    position: 'top',
  },
  {
    id: 'nudges',
    target: '.pulse-proactive',
    title: 'Pulse Doesn\'t Wait',
    body: 'Pulse watches your patterns. Overspending in dining? Running low on savings? It nudges you before problems grow. Proactive, not reactive.',
    action: 'dismiss',
    actionLabel: 'Next →',
    position: 'bottom',
  },
  {
    id: 'ready',
    target: '.budget-cockpit',
    title: 'Your Finances Have a Heartbeat',
    body: 'Pulse is live. Check in anytime — daily, weekly, payday. The ring keeps breathing. Your money keeps moving. Welcome to financial clarity.',
    action: 'dismiss',
    actionLabel: 'Start Using Pulse →',
    position: 'center',
  },
];

export default function BudgetOnboarding({ onComplete, onOpenConfig }: BudgetOnboardingProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [booting, setBooting] = useState(true);
  const [bootPhase, setBootPhase] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Boot sequence: fade in from black
  useEffect(() => {
    const phases = [
      { delay: 200, phase: 1 },   // "PULSE" text appears
      { delay: 600, phase: 2 },   // Heart ring draws
      { delay: 1400, phase: 3 },  // Cockpit materializes
      { delay: 2000, phase: 4 },  // Grid fades in
      { delay: 2600, phase: 5 },  // Tour begins
    ];

    phases.forEach(({ delay, phase }) => {
      setTimeout(() => setBootPhase(phase), delay);
    });

    const total = Math.max(...phases.map(p => p.delay)) + 500;
    const t = setTimeout(() => {
      setBooting(false);
      setVisible(true);
    }, total);

    return () => clearTimeout(t);
  }, []);

  // Update spotlight position on step change
  useEffect(() => {
    if (!visible || booting) return;
    updateSpotlight();
  }, [step, visible, booting]);

  const updateSpotlight = () => {
    const current = TOUR_STEPS[step];
    if (!current || current.target === '.budget-cockpit' || current.target === '.pulse-heart-container' || current.position === 'center') {
      setSpotlightRect(null);
      return;
    }

    const el = document.querySelector(current.target);
    if (el) {
      setSpotlightRect(el.getBoundingClientRect());
    } else {
      setSpotlightRect(null);
    }
  };

  const handleAction = () => {
    const current = TOUR_STEPS[step];
    if (current.action === 'click' && current.id === 'config-btn') {
      onOpenConfig();
    }

    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setVisible(false);
    localStorage.setItem('budget-tour-completed', 'true');
    setTimeout(onComplete, 300);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem('budget-tour-completed', 'true');
    setTimeout(onComplete, 300);
  };

  // Global key handler
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss();
      if (e.key === 'Enter' || e.key === ' ') handleAction();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, step]);

  if (!visible && !booting) return null;

  const current = TOUR_STEPS[step];
  const isCenter = current?.position === 'center';
  const showSpotlight = spotlightRect && !isCenter;

  return (
    <>
      {/* Boot Sequence Overlay */}
      {booting && (
        <div className={`pulse-boot-sequence boot-phase-${bootPhase}`}>
          <div className="boot-text">
            <span className="boot-pulse-text">PULSE</span>
            <div className="boot-heart">
              <svg viewBox="0 0 100 100" className="boot-heart-svg">
                <path
                  className="boot-heart-path"
                  d="M50 88 C20 60, 5 40, 15 25 C25 10, 45 10, 50 25 C55 10, 75 10, 85 25 C95 40, 80 60, 50 88Z"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="300"
                  strokeDashoffset="300"
                />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Tour Overlay */}
      {!booting && visible && (
        <div className="pulse-tour-overlay" ref={overlayRef}>
          {/* Spotlight cutout */}
          {showSpotlight && (
            <div
              className="pulse-spotlight"
              style={{
                top: spotlightRect.top - 8,
                left: spotlightRect.left - 8,
                width: spotlightRect.width + 16,
                height: spotlightRect.height + 16,
              }}
            />
          )}

          {/* Tour Card */}
          <div
            className={`pulse-tour-card ${current?.position || 'bottom'}`}
            style={getCardStyle(current, spotlightRect)}
          >
            <div className="pulse-tour-progress">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`pulse-tour-dot ${i === step ? 'active' : i < step ? 'done' : ''}`}
                />
              ))}
            </div>

            <div className="pulse-tour-step-num">Step {step + 1} of {TOUR_STEPS.length}</div>

            <h3 className="pulse-tour-title">{current?.title}</h3>
            <p className="pulse-tour-body">{current?.body}</p>

            <div className="pulse-tour-actions">
              <button className="pulse-tour-skip" onClick={handleDismiss}>
                Skip Tour
              </button>
              <button className="pulse-tour-next" onClick={handleAction}>
                {current?.actionLabel || 'Next →'}
              </button>
            </div>
          </div>

          {/* Dismiss area click */}
          {showSpotlight && (
            <div className="pulse-tour-dismiss-zone" onClick={handleDismiss} />
          )}
        </div>
      )}
    </>
  );
}

function getCardStyle(step: TourStep | undefined, rect: DOMRect | null): React.CSSProperties {
  if (!step || step.position === 'center' || !rect) {
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const gap = 16;
  const cardWidth = 360;

  switch (step.position) {
    case 'bottom':
      return {
        position: 'fixed',
        top: rect.bottom + gap,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
        maxWidth: cardWidth,
      };
    case 'top':
      return {
        position: 'fixed',
        bottom: window.innerHeight - rect.top + gap,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
        maxWidth: cardWidth,
      };
    case 'right':
      return {
        position: 'fixed',
        top: rect.top + rect.height / 2,
        left: rect.right + gap,
        transform: 'translateY(-50%)',
        maxWidth: cardWidth,
      };
    case 'left':
      return {
        position: 'fixed',
        top: rect.top + rect.height / 2,
        right: window.innerWidth - rect.left + gap,
        transform: 'translateY(-50%)',
        maxWidth: cardWidth,
      };
    default:
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
  }
}
