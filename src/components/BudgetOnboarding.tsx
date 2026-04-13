// Conflux Home — Budget Onboarding / Guided Tour
// Phase 1: Setup (collect data) → Phase 2: Tour (teach with real data)

import { useState, useEffect, useCallback } from 'react';
import '../styles/pulse-onboarding.css';

// ─── Types ───────────────────────────────────────────────────

export interface BudgetOnboardingProps {
  onComplete: () => void;
  onSaveConfig: (config: SetupConfig) => Promise<void>;
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

// ─── Phase 1: Setup Questions ───────────────────────────────

interface SetupState {
  step: 'boot' | 'setup' | 'tour';
  tourStep: number;
  config: SetupConfig;
  newBucket: { name: string; goal: string; icon: string; color: string };
  isSaving: boolean;
  error: string | null;
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
  { name: 'Utilities', icon: '💡', monthly_goal: 0, color: '#f59e0b' },
  { name: 'Transportation', icon: '🚗', monthly_goal: 0, color: '#6366f1' },
  { name: 'Savings', icon: '🏦', monthly_goal: 0, color: '#06b6d4' },
];

// ─── Simplified 5-Step Tour (after setup) ───────────────────

const TOUR_STEPS = [
  {
    id: 'cockpit',
    title: 'Your Financial Cockpit',
    body: 'Income, obligations, and projected surplus — all in one glance. Pulse updates this in real-time as you log payments.',
  },
  {
    id: 'buckets',
    title: 'Every Dollar Has a Job',
    body: 'Each bucket is a spending category with a monthly target. Pulse divides that target across your pay periods so you know exactly what to set aside each paycheck.',
  },
  {
    id: 'grid',
    title: 'Track Every Payment',
    body: 'The allocation grid shows what\'s been set aside vs. what\'s actually been paid. Green means secured. Yellow means still due.',
  },
  {
    id: 'log',
    title: 'Log Payments Fast',
    body: 'Click LOG PAYMENT to record what you\'ve paid. Select a bucket, enter the amount, confirm — Pulse updates the grid instantly.',
  },
  {
    id: 'nudge',
    title: 'Pulse Doesn\'t Wait',
    body: 'Pulse watches your patterns. Running low on savings? Overspending in dining? It nudges you before problems grow. Proactive, not reactive.',
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

  const handleFinishSetup = async () => {
    const { config } = state;
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
      await onSaveConfig(config);
      setState(s => ({ ...s, step: 'tour', tourStep: 0 }));
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
        onUpdateConfig={updateConfig}
        onUpdateNewBucket={s => setState(prev => ({ ...prev, newBucket: s }))}
        onAddBucket={addBucket}
        onRemoveBucket={removeBucket}
        onFinish={handleFinishSetup}
      />
    );
  }

  // Tour step — dims UI, shows floating card
  return (
    <div className="pulse-tour-overlay">
      <div className="pulse-tour-scrim" />
      <div className="pulse-tour-floating-card">
        <div className="pulse-tour-progress">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`pulse-tour-dot ${i === state.tourStep ? 'active' : i < state.tourStep ? 'done' : ''}`}
            />
          ))}
        </div>
        <div className="pulse-tour-step-label">
          {state.tourStep + 1} of {TOUR_STEPS.length}
        </div>
        <h3 className="pulse-tour-heading">{TOUR_STEPS[state.tourStep].title}</h3>
        <p className="pulse-tour-text">{TOUR_STEPS[state.tourStep].body}</p>
        <div className="pulse-tour-card-actions">
          <button className="pulse-tour-skip" onClick={handleComplete}>
            Skip tour
          </button>
          <button className="pulse-tour-cta" onClick={handleTourNext}>
            {state.tourStep === TOUR_STEPS.length - 1 ? 'Start Using Pulse →' : 'Next →'}
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
  onUpdateConfig: (patch: Partial<SetupConfig>) => void;
  onUpdateNewBucket: (s: SetupState['newBucket']) => void;
  onAddBucket: () => void;
  onRemoveBucket: (id: string) => void;
  onFinish: () => void;
}

function SetupModal({
  config,
  newBucket,
  isSaving,
  error,
  onUpdateConfig,
  onUpdateNewBucket,
  onAddBucket,
  onRemoveBucket,
  onFinish,
}: SetupModalProps) {
  const incomeRef = { current: null as HTMLInputElement | null };

  return (
    <div className="pulse-setup-overlay">
      <div className="pulse-setup-card">
        {/* Header */}
        <div className="pulse-setup-header">
          <div className="pulse-setup-icon">💚</div>
          <h2 className="pulse-setup-title">Set Up Pulse</h2>
          <p className="pulse-setup-subtitle">
            Tell Pulse about your income and we'll build your financial grid.
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
            What do you track? Add your bills and savings goals.
          </p>

          {/* Existing buckets */}
          {config.buckets.length > 0 && (
            <div className="pulse-setup-bucket-list">
              {config.buckets.map(b => (
                <div key={b.id} className="pulse-setup-bucket-row">
                  <span className="pulse-setup-bucket-icon">{b.icon}</span>
                  <span className="pulse-setup-bucket-name">{b.name}</span>
                  <span className="pulse-setup-bucket-goal">
                    ${b.monthly_goal.toLocaleString()}
                  </span>
                  <button className="pulse-setup-bucket-remove" onClick={() => onRemoveBucket(b.id)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Presets */}
          <div className="pulse-setup-presets">
            {PRESET_BUCKETS.filter(
              pb => !config.buckets.some(cb => cb.name === pb.name)
            ).map(pb => (
              <button
                key={pb.name}
                className="pulse-setup-preset-btn"
                onClick={() => {
                  const bucket: SetupBucket = {
                    id: `preset-${Date.now()}-${pb.name}`,
                    ...pb,
                    monthly_goal: pb.monthly_goal,
                  };
                  onUpdateConfig({ buckets: [...config.buckets, bucket] });
                }}
              >
                <span>{pb.icon}</span>
                <span>{pb.name}</span>
              </button>
            ))}
          </div>

          {/* Custom bucket */}
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

        {/* Error */}
        {error && <div className="pulse-setup-error">{error}</div>}

        {/* Finish */}
        <button
          className="pulse-setup-finish"
          onClick={onFinish}
          disabled={isSaving}
        >
          {isSaving ? (
            <span className="pulse-setup-saving">Setting up Pulse...</span>
          ) : (
            'Launch Pulse →'
          )}
        </button>
      </div>
    </div>
  );
}
