// Conflux Home — Budget Onboarding / Guided Tour
// Phase 1: Setup (collect data) → Phase 2: Tour (spotlight on real UI)

import { useState, useEffect, useCallback, useRef } from 'react';
import '../styles/pulse-onboarding.css';

// ─── Types ───────────────────────────────────────────────────

export interface BudgetOnboardingProps {
  onComplete: () => void;
  onSaveConfig: (config: SetupConfig, isUpdate?: boolean) => Promise<{ isUpdate: boolean }>;
}

export interface SetupBucket {
  id: string;
  name: string;
  icon: string;
  monthly_goal: number;
  color: string;
}

export interface SetupConfig {
  payFrequency: 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly';
  payDates: { p1: number; p2: number };
  monthlyIncome: number;
  buckets: SetupBucket[];
}

// ─── Phase 1: Setup State ───────────────────────────────────

interface SetupState {
  step: 'boot' | 'setup' | 'tour';
  tourStep: number;
  config: SetupConfig;
  newBucket: { name: string; goal: string; icon: string; color: string };
  isSaving: boolean;
  error: string | null;
  pendingPreset: Omit<SetupBucket, 'id'> | null;
  pendingAmount: string;
  isUpdate: boolean; // true if we're updating existing data
}

const DEFAULT_CONFIG: SetupConfig = {
  payFrequency: 'semi-monthly',
  payDates: { p1: 1, p2: 15 },
  monthlyIncome: 0,
  buckets: [],
};

const PRESET_BUCKETS: Omit<SetupBucket, 'id'>[] = [
  { name: 'Rent / Mortgage', icon: '🏠', monthly_goal: 0, color: '#10b981' },
  { name: 'Groceries', icon: '🛒', monthly_goal: 0, color: '#3b82f6' },
  { name: 'Electric', icon: '⚡', monthly_goal: 0, color: '#f59e0b' },
  { name: 'Gas', icon: '🔥', monthly_goal: 0, color: '#ef4444' },
  { name: 'Water', icon: '💧', monthly_goal: 0, color: '#06b6d4' },
  { name: 'Internet', icon: '📶', monthly_goal: 0, color: '#8b5cf6' },
  { name: 'Phone', icon: '📱', monthly_goal: 0, color: '#ec4899' },
  { name: 'Transportation', icon: '🚗', monthly_goal: 0, color: '#6366f1' },
  { name: 'Savings', icon: '🏦', monthly_goal: 0, color: '#0ea5e9' },
];

// ─── 5-Step Spotlight Tour ───────────────────────────────────

const TOUR_STEPS = [
  {
    id: 'cockpit',
    title: 'Your Financial Cockpit',
    body: 'Income, obligations, and projected surplus — all in one glance. Pulse updates this in real-time as you log payments.',
    target: '.budget-cockpit',
    cardPosition: 'bottom-left',
  },
  {
    id: 'buckets',
    title: 'Every Dollar Has a Job',
    body: 'Each bucket is a spending category with a monthly target. Pulse divides that target across your pay periods so you know exactly what to set aside each paycheck.',
    target: '.matrix-container',
    cardPosition: 'bottom-left',
  },
  {
    id: 'log',
    title: 'Log Payments Fast',
    body: 'Click LOG PAYMENT to record what you\'ve paid. Select a bucket, enter the amount, confirm — Pulse updates the grid instantly.',
    target: '.btn-primary',
    cardPosition: 'bottom-left',
  },
  {
    id: 'nav',
    title: 'Navigate Your Budget',
    body: 'Use the period arrows to step through pay periods. Each column shows what was allocated vs. what was actually paid.',
    target: '.matrix-nav',
    cardPosition: 'bottom-left',
  },
  {
    id: 'nudge',
    title: 'Pulse Doesn\'t Wait',
    body: 'Pulse watches your patterns. Running low on savings? Overspending in dining? It nudges you before problems grow. Proactive, not reactive.',
    target: '.pulse-proactive',
    cardPosition: 'bottom-left',
  },
];

// ─── Component ──────────────────────────────────────────────

export default function BudgetOnboarding({ onComplete, onSaveConfig }: BudgetOnboardingProps) {
  const [state, setState] = useState<SetupState>({
    step: 'boot',
    tourStep: 0,
    config: DEFAULT_CONFIG,
    newBucket: { name: '', goal: '', icon: '💳', color: '#8b5cf6' },
    isSaving: false,
    error: null,
    pendingPreset: null,
    pendingAmount: '',
    isUpdate: false,
  });

  // Boot sequence → auto-advance to setup
  useEffect(() => {
    if (state.step !== 'boot') return;
    const t = setTimeout(() => setState(s => ({ ...s, step: 'setup' })), 2800);
    return () => clearTimeout(t);
  }, [state.step]);

  const updateConfig = useCallback((patch: Partial<SetupConfig>) => {
    setState(s => ({ ...s, config: { ...s.config, ...patch }, error: null }));
  }, []);

  const addBucket = useCallback(() => {
    const { newBucket } = state;
    if (!newBucket.name.trim() || !newBucket.goal) return;
    const bucket: SetupBucket = {
      id: `bucket-${Date.now()}`,
      name: newBucket.name.trim(),
      icon: newBucket.icon || '💳',
      monthly_goal: parseFloat(newBucket.goal) || 0,
      color: newBucket.color || '#8b5cf6',
    };
    setState(s => ({
      ...s,
      config: { ...s.config, buckets: [...s.config.buckets, bucket] },
      newBucket: { name: '', goal: '', icon: '💳', color: '#8b5cf6' },
    }));
  }, [state]);

  const removeBucket = useCallback((id: string) => {
    setState(s => ({
      ...s,
      config: { ...s.config, buckets: s.config.buckets.filter(b => b.id !== id) },
    }));
  }, []);

  const openPresetPopup = useCallback((preset: Omit<SetupBucket, 'id'>) => {
    setState(s => ({ ...s, pendingPreset: preset, pendingAmount: '' }));
  }, []);

  const confirmPresetBucket = useCallback(() => {
    const { pendingPreset, pendingAmount, config } = state;
    if (!pendingPreset || !pendingAmount) return;
    const bucket: SetupBucket = {
      id: `preset-${Date.now()}`,
      name: pendingPreset.name,
      icon: pendingPreset.icon,
      monthly_goal: parseFloat(pendingAmount) || 0,
      color: pendingPreset.color,
    };
    setState(s => ({
      ...s,
      config: { ...s.config, buckets: [...s.config.buckets, bucket] },
      pendingPreset: null,
      pendingAmount: '',
    }));
  }, [state]);

  const cancelPresetBucket = useCallback(() => {
    setState(s => ({ ...s, pendingPreset: null, pendingAmount: '' }));
  }, []);

  const handleFinishSetup = async () => {
    const { config, isUpdate } = state;
    if (config.monthlyIncome <= 0) {
      setState(s => ({ ...s, error: 'Please enter your monthly income.' }));
      return;
    }
    if (config.buckets.length === 0) {
      setState(s => ({ ...s, error: 'Add at least one bucket to track.' }));
      return;
    }
    setState(s => ({ ...s, isSaving: true, error: null }));
    try {
      const result = await onSaveConfig(config, isUpdate);
      setState(s => ({ ...s, step: 'tour', tourStep: 0, isUpdate: result.isUpdate }));
    } catch {
      setState(s => ({ ...s, isSaving: false, error: 'Failed to save. Try again.' }));
    }
  };

  const handleTourNext = () => {
    if (state.tourStep < TOUR_STEPS.length - 1) {
      setState(s => ({ ...s, tourStep: s.tourStep + 1 }));
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem('budget-tour-completed', 'true');
    onComplete();
  };

  // ─── Render ────────────────────────────────────────────────

  if (state.step === 'boot') {
    return <BootSequence />;
  }

  if (state.step === 'setup') {
    return (
      <SetupModal
        config={state.config}
        newBucket={state.newBucket}
        isSaving={state.isSaving}
        error={state.error}
        pendingPreset={state.pendingPreset}
        pendingAmount={state.pendingAmount}
        isUpdate={state.isUpdate}
        onUpdateConfig={updateConfig}
        onUpdateNewBucket={s => setState(prev => ({ ...prev, newBucket: s }))}
        onAddBucket={addBucket}
        onRemoveBucket={removeBucket}
        onOpenPresetPopup={openPresetPopup}
        onConfirmPresetBucket={confirmPresetBucket}
        onCancelPresetBucket={cancelPresetBucket}
        onPendingAmountChange={s => setState(prev => ({ ...prev, pendingAmount: s }))}
        onFinish={handleFinishSetup}
      />
    );
  }

  // Spotlight Tour — highlight real UI elements
  return (
    <SpotlightTour
      currentStep={state.tourStep}
      onNext={handleTourNext}
      onSkip={handleComplete}
    />
  );
}

// ─── Spotlight Tour ────────────────────────────────────────

interface SpotlightTourProps {
  currentStep: number;
  onNext: () => void;
  onSkip: () => void;
}

function SpotlightTour({ currentStep, onNext, onSkip }: SpotlightTourProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({});
  const stepRef = useRef(currentStep);
  stepRef.current = currentStep;

  const step = TOUR_STEPS[currentStep];

  // Find target element and position the spotlight + card
  useEffect(() => {
    // Use multiple frames to ensure DOM is stable
    let raf1: number;
    let raf2: number;

    const update = () => {
      const target = document.querySelector(step.target);
      if (!target) {
        // Fallback: position card at bottom-left
        setSpotlightRect(null);
        setCardStyle({ bottom: 32, left: 32, top: 'auto', right: 'auto' });
        return;
      }

      const rect = target.getBoundingClientRect();
      const GAP = 12;
      const CARD_WIDTH = 340;
      const vw = window.innerWidth;

      setSpotlightRect(rect);

      // Position the card below the target, centered
      let cardLeft = rect.left + rect.width / 2 - CARD_WIDTH / 2;
      // Clamp to viewport
      cardLeft = Math.max(16, Math.min(cardLeft, vw - CARD_WIDTH - 16));

      setCardStyle({
        position: 'fixed',
        bottom: window.innerHeight - rect.top + GAP,
        left: cardLeft,
        top: 'auto',
        right: 'auto',
        maxWidth: CARD_WIDTH,
        width: 'calc(100vw - 32px)',
      });
    };

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(update);
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [currentStep, step.target]);

  // Re-position on scroll/resize
  useEffect(() => {
    const handle = () => {
      const target = document.querySelector(step.target);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const CARD_WIDTH = 340;
      let cardLeft = rect.left + rect.width / 2 - CARD_WIDTH / 2;
      cardLeft = Math.max(16, Math.min(cardLeft, window.innerWidth - CARD_WIDTH - 16));
      setSpotlightRect(rect);
      setCardStyle(prev => ({
        ...prev,
        bottom: window.innerHeight - rect.top + 12,
        left: cardLeft,
      }));
    };
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [step.target]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNext(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNext, onSkip]);

  return (
    <div className="pulse-tour-overlay" ref={overlayRef}>
      {/* Spotlight: glowing box around target */}
      {spotlightRect && (
        <div
          className="pulse-tour-spotlight"
          style={{
            top: spotlightRect.top - 8,
            left: spotlightRect.left - 8,
            width: spotlightRect.width + 16,
            height: spotlightRect.height + 16,
          }}
        />
      )}

      {/* Dark scrim — covers everything EXCEPT a margin around the spotlight */}
      {spotlightRect && (
        <div
          className="pulse-tour-scrim"
          style={{
            '--spotlight-top': `${spotlightRect.top - 20}px`,
            '--spotlight-bottom': `${window.innerHeight - spotlightRect.bottom - 20}px`,
            '--spotlight-left': `${spotlightRect.left - 20}px`,
            '--spotlight-right': `${window.innerWidth - spotlightRect.right - 20}px`,
          } as React.CSSProperties}
        />
      )}

      {/* Arrow pointing down at the spotlight */}
      {spotlightRect && (
        <div
          className="pulse-tour-spotlight-arrow"
          style={{
            top: spotlightRect.top - 10,
            left: spotlightRect.left + spotlightRect.width / 2 - 8,
          }}
        />
      )}

      {/* Tour Card */}
      <div className="pulse-tour-spotlight-card" style={cardStyle}>
        {/* Close X */}
        <button className="pulse-tour-close" onClick={onSkip}>✕</button>

        <div className="pulse-tour-progress">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`pulse-tour-dot ${i === currentStep ? 'active' : i < currentStep ? 'done' : ''}`}
            />
          ))}
        </div>

        <div className="pulse-tour-step-label">
          {currentStep + 1} of {TOUR_STEPS.length}
        </div>
        <h3 className="pulse-tour-heading">{step.title}</h3>
        <p className="pulse-tour-text">{step.body}</p>
        <div className="pulse-tour-card-actions">
          <button className="pulse-tour-skip" onClick={onSkip}>
            Skip tour
          </button>
          <button className="pulse-tour-cta" onClick={onNext}>
            {currentStep === TOUR_STEPS.length - 1 ? 'Start Using Pulse →' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Boot Sequence ─────────────────────────────────────────

function BootSequence() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className={`pulse-boot boot-${phase}`}>
      <div className="pulse-boot-content">
        {phase >= 1 && <div className="pulse-boot-logo">PULSE</div>}
        {phase >= 2 && (
          <div className="pulse-boot-heart">
            <svg viewBox="0 0 100 100" className="pulse-boot-heart-svg">
              <path
                className="pulse-boot-heart-path"
                d="M50 88 C20 60, 5 40, 15 25 C25 10, 45 10, 50 25 C55 10, 75 10, 85 25 C95 40, 80 60, 50 88Z"
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
              />
            </svg>
          </div>
        )}
        {phase >= 3 && <div className="pulse-boot-tagline">your financial heartbeat</div>}
      </div>
    </div>
  );
}

// ─── Setup Modal ────────────────────────────────────────────

interface SetupModalProps {
  config: SetupConfig;
  newBucket: SetupState['newBucket'];
  isSaving: boolean;
  error: string | null;
  pendingPreset: Omit<SetupBucket, 'id'> | null;
  pendingAmount: string;
  isUpdate: boolean;
  onUpdateConfig: (patch: Partial<SetupConfig>) => void;
  onUpdateNewBucket: (s: SetupState['newBucket']) => void;
  onAddBucket: () => void;
  onRemoveBucket: (id: string) => void;
  onOpenPresetPopup: (preset: Omit<SetupBucket, 'id'>) => void;
  onConfirmPresetBucket: () => void;
  onCancelPresetBucket: () => void;
  onPendingAmountChange: (s: string) => void;
  onFinish: () => void;
}

function SetupModal({
  config,
  newBucket,
  isSaving,
  error,
  pendingPreset,
  pendingAmount,
  isUpdate,
  onUpdateConfig,
  onUpdateNewBucket,
  onAddBucket,
  onRemoveBucket,
  onOpenPresetPopup,
  onConfirmPresetBucket,
  onCancelPresetBucket,
  onPendingAmountChange,
  onFinish,
}: SetupModalProps) {
  const pendingInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pendingPreset && pendingInputRef.current) {
      pendingInputRef.current.focus();
    }
  }, [pendingPreset]);

  const handlePendingKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onConfirmPresetBucket();
    if (e.key === 'Escape') onCancelPresetBucket();
  };

  return (
    <div className="pulse-setup-overlay">
      <div className="pulse-setup-card">

        {/* Update mode banner */}
        {isUpdate && (
          <div className="pulse-setup-update-banner">
            Updating your existing Pulse configuration
          </div>
        )}

        {/* Preset Amount Popup */}
        {pendingPreset && (
          <div className="pulse-preset-popup-overlay" onClick={onCancelPresetBucket}>
            <div className="pulse-preset-popup" onClick={e => e.stopPropagation()}>
              <div className="pulse-preset-popup-header">
                <span className="pulse-preset-popup-icon">{pendingPreset.icon}</span>
                <span className="pulse-preset-popup-name">{pendingPreset.name}</span>
              </div>
              <p className="pulse-preset-popup-question">
                How much do you pay monthly for {pendingPreset.name.toLowerCase()}?
              </p>
              <div className="pulse-preset-popup-input-row">
                <span className="pulse-preset-popup-dollar">$</span>
                <input
                  ref={pendingInputRef}
                  type="number"
                  className="pulse-preset-popup-input"
                  placeholder="0"
                  value={pendingAmount}
                  onChange={e => onPendingAmountChange(e.target.value)}
                  onKeyDown={handlePendingKeyDown}
                  min="0"
                />
              </div>
              <div className="pulse-preset-popup-actions">
                <button className="pulse-preset-popup-cancel" onClick={onCancelPresetBucket}>
                  Cancel
                </button>
                <button
                  className="pulse-preset-popup-confirm"
                  onClick={onConfirmPresetBucket}
                  disabled={!pendingAmount || parseFloat(pendingAmount) <= 0}
                >
                  Add ${pendingAmount || '0'} / mo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="pulse-setup-header">
          <div className="pulse-setup-icon">💚</div>
          <h2 className="pulse-setup-title">{isUpdate ? 'Update Pulse' : 'Set Up Pulse'}</h2>
          <p className="pulse-setup-subtitle">
            {isUpdate
              ? 'Adjust your income, pay rhythm, or tracked buckets.'
              : 'Tell Pulse about your income and we\'ll build your financial grid.'}
          </p>
        </div>

        {/* Step 1: Income */}
        <div className="pulse-setup-section">
          <label className="pulse-setup-label">
            <span className="pulse-setup-step-num">01</span>
            Monthly Income
          </label>
          <div className="pulse-setup-income-row">
            <span className="pulse-setup-dollar">$</span>
            <input
              type="number"
              className="pulse-setup-income-input"
              placeholder="4,400"
              value={config.monthlyIncome || ''}
              onChange={e => onUpdateConfig({ monthlyIncome: parseFloat(e.target.value) || 0 })}
              min="0"
              autoFocus
            />
          </div>
          <p className="pulse-setup-hint">
            Total take-home pay per month, after taxes.
          </p>
        </div>

        {/* Step 2: Pay Rhythm */}
        <div className="pulse-setup-section">
          <label className="pulse-setup-label">
            <span className="pulse-setup-step-num">02</span>
            Pay Rhythm
          </label>
          <div className="pulse-setup-rhythm-grid">
            {[
              { value: 'weekly', label: 'Weekly' },
              { value: 'bi-weekly', label: 'Bi-weekly' },
              { value: 'semi-monthly', label: 'Semi-monthly' },
              { value: 'monthly', label: 'Monthly' },
            ].map(({ value, label }) => (
              <button
                key={value}
                className={`pulse-setup-rhythm-btn ${config.payFrequency === value ? 'active' : ''}`}
                onClick={() => onUpdateConfig({ payFrequency: value as SetupConfig['payFrequency'] })}
              >
                {label}
              </button>
            ))}
          </div>

          {config.payFrequency === 'bi-weekly' && (
            <div className="pulse-setup-paydays">
              <div className="pulse-setup-payday-group">
                <label>First Pay Day</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={config.payDates.p1}
                  onChange={e => onUpdateConfig({ payDates: { ...config.payDates, p1: parseInt(e.target.value) || 1 } })}
                />
              </div>
              <span className="pulse-setup-payday-and">—</span>
              <div className="pulse-setup-payday-group">
                <label>Second Pay Day</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={config.payDates.p2}
                  onChange={e => onUpdateConfig({ payDates: { ...config.payDates, p2: parseInt(e.target.value) || 15 } })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Buckets */}
        <div className="pulse-setup-section">
          <label className="pulse-setup-label">
            <span className="pulse-setup-step-num">03</span>
            Spending Buckets
          </label>
          <p className="pulse-setup-hint" style={{ marginBottom: 12 }}>
            What do you track? Click a category, enter the monthly amount.
          </p>

          {config.buckets.length > 0 && (
            <div className="pulse-setup-bucket-list">
              {config.buckets.map(b => (
                <div key={b.id} className="pulse-setup-bucket-row">
                  <span className="pulse-setup-bucket-icon">{b.icon}</span>
                  <span className="pulse-setup-bucket-name">{b.name}</span>
                  <span className="pulse-setup-bucket-goal">
                    ${b.monthly_goal.toLocaleString()}/mo
                  </span>
                  <button className="pulse-setup-bucket-remove" onClick={() => onRemoveBucket(b.id)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="pulse-setup-presets">
            {PRESET_BUCKETS.filter(
              pb => !config.buckets.some(cb => cb.name === pb.name)
            ).map(pb => (
              <button
                key={pb.name}
                className="pulse-setup-preset-btn"
                style={{ '--preset-color': pb.color } as React.CSSProperties}
                onClick={() => onOpenPresetPopup(pb)}
              >
                <span>{pb.icon}</span>
                <span>{pb.name}</span>
              </button>
            ))}
          </div>

          <div className="pulse-setup-add-bucket">
            <input
              type="text"
              placeholder="Bucket name (e.g. Netflix)"
              value={newBucket.name}
              onChange={e => onUpdateNewBucket({ ...newBucket, name: e.target.value })}
              className="pulse-setup-bucket-name-input"
            />
            <div className="pulse-setup-bucket-goal-input-wrap">
              <span>$</span>
              <input
                type="number"
                placeholder="Monthly $"
                value={newBucket.goal}
                onChange={e => onUpdateNewBucket({ ...newBucket, goal: e.target.value })}
              />
            </div>
            <button
              className="pulse-setup-add-btn"
              onClick={onAddBucket}
              disabled={!newBucket.name.trim() || !newBucket.goal}
            >
              +
            </button>
          </div>
        </div>

        {error && <div className="pulse-setup-error">{error}</div>}

        <button
          className="pulse-setup-finish"
          onClick={onFinish}
          disabled={isSaving}
        >
          {isSaving ? (
            <span className="pulse-setup-saving">Setting up Pulse...</span>
          ) : isUpdate ? (
            'Save Changes →'
          ) : (
            'Launch Pulse →'
          )}
        </button>
      </div>
    </div>
  );
}
