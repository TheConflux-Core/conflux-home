// Conflux Home — InvestmentsTab (PulseWrapper Tab)
// Long-term investment goals tracker with dark emerald Pulse aesthetic.
// Uses static sample data — no Rust backend required.

import { useState, useRef, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import '../styles/InvestmentsTab.css';

// ── Types ────────────────────────────────────────────────────────────

export type GoalType = '401k' | 'ira' | 'hsa' | 'college' | 'emergency' | 'custom';
export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';
export type GoalStatus = 'on_track' | 'behind' | 'ahead';

export interface InvestmentGoal {
  id: string;
  name: string;
  type: GoalType;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  targetDate: string | null;
  createdAt: number;
  riskProfile: RiskProfile;
}

export interface GoalFormData {
  name: string;
  type: GoalType;
  targetAmount: string;
  currentAmount: string;
  monthlyContribution: string;
  targetDate: string;
  riskProfile: RiskProfile;
}

// ── Static Sample Goals ──────────────────────────────────────────────

const SAMPLE_GOALS: InvestmentGoal[] = [
  {
    id: '1',
    name: '2028 Retirement Target',
    type: '401k',
    targetAmount: 1000000,
    currentAmount: 285000,
    monthlyContribution: 2200,
    targetDate: '2028-06-01',
    riskProfile: 'aggressive',
    createdAt: Date.now() - 86400000 * 365 * 3,
  },
  {
    id: '2',
    name: 'Emma\'s College Fund',
    type: 'college',
    targetAmount: 150000,
    currentAmount: 95000,
    monthlyContribution: 500,
    targetDate: '2033-08-15',
    riskProfile: 'moderate',
    createdAt: Date.now() - 86400000 * 365 * 5,
  },
  {
    id: '3',
    name: 'Emergency Reserve',
    type: 'emergency',
    targetAmount: 30000,
    currentAmount: 28500,
    monthlyContribution: 400,
    targetDate: null,
    riskProfile: 'conservative',
    createdAt: Date.now() - 86400000 * 180,
  },
  {
    id: '4',
    name: 'Roth IRA Maxout',
    type: 'ira',
    targetAmount: 7000,
    currentAmount: 4200,
    monthlyContribution: 583,
    targetDate: '2026-12-31',
    riskProfile: 'moderate',
    createdAt: Date.now() - 86400000 * 90,
  },
  {
    id: '5',
    name: 'HSA Goal 2026',
    type: 'hsa',
    targetAmount: 8000,
    currentAmount: 6100,
    monthlyContribution: 300,
    targetDate: '2026-12-31',
    riskProfile: 'conservative',
    createdAt: Date.now() - 86400000 * 60,
  },
];

// ── DB → frontend mapper ────────────────────────────────────────────

function dbToGoal(raw: any): InvestmentGoal {
  return {
    id: raw.id,
    name: raw.name,
    type: (raw.goal_type ?? raw.type ?? 'custom') as InvestmentGoal['type'],
    targetAmount: typeof raw.target_amount === 'number' ? raw.target_amount : parseFloat(raw.target_amount ?? '0'),
    currentAmount: typeof raw.current_amount === 'number' ? raw.current_amount : parseFloat(raw.current_amount ?? '0'),
    monthlyContribution: typeof raw.monthly_contribution === 'number' ? raw.monthly_contribution : parseFloat(raw.monthly_contribution ?? '0'),
    targetDate: raw.target_date ?? null,
    riskProfile: (raw.risk_profile ?? 'moderate') as InvestmentGoal['riskProfile'],
    createdAt: raw.created_at ? new Date(raw.created_at).getTime() : Date.now(),
  };
}

const TYPE_META: Record<GoalType, { icon: string; label: string }> = {
  '401k':      { icon: '🏦', label: '401(k)' },
  'ira':       { icon: '🏛️', label: 'IRA' },
  'hsa':       { icon: '🏥', label: 'HSA' },
  'college':   { icon: '🎓', label: 'College' },
  'emergency': { icon: '🆘', label: 'Emergency Fund' },
  'custom':    { icon: '⭐', label: 'Custom' },
};

const RISK_META: Record<RiskProfile, { label: string; color: string }> = {
  conservative: { label: 'Conservative', color: '#60a5fa' },
  moderate:     { label: 'Moderate',      color: '#a78bfa' },
  aggressive:   { label: 'Aggressive',    color: '#f472b6' },
};

const STATUS_META: Record<GoalStatus, { label: string; color: string; bg: string }> = {
  on_track: { label: 'On Track', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  behind:   { label: 'Behind',   color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  ahead:    { label: 'Ahead',    color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' },
};

const GOAL_TYPES: GoalType[] = ['401k', 'ira', 'hsa', 'college', 'emergency', 'custom'];
const RISK_PROFILES: RiskProfile[] = ['conservative', 'moderate', 'aggressive'];

// ── Confetti directions for celebration animation ─────────────────────
const CONFETTI_DIRECTIONS = [
  'translate(-60px, -40px)', 'translate(-40px, -60px)', 'translate(-20px, -70px)',
  'translate(0px, -75px)',   'translate(20px, -70px)',   'translate(40px, -60px)',
  'translate(60px, -40px)', 'translate(-55px, -10px)', 'translate(55px, -10px)',
  'translate(-70px, 20px)',  'translate(70px, 20px)',   'translate(-30px, -55px)',
];

// ── Helpers ──────────────────────────────────────────────────────────

function generateId(): string {
  return `goal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function calcProgress(g: InvestmentGoal): { pct: number; remaining: number; status: GoalStatus } {
  const pct = g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0;
  const remaining = Math.max(0, g.targetAmount - g.currentAmount);
  let status: GoalStatus = 'on_track';
  if (g.monthlyContribution > 0 && remaining > 0) {
    const monthsLeft = remaining / g.monthlyContribution;
    if (g.targetDate) {
      const targetMs = new Date(g.targetDate).getTime();
      const nowMs = Date.now();
      const monthsToTarget = (targetMs - nowMs) / (1000 * 60 * 60 * 24 * 30);
      if (monthsLeft < monthsToTarget * 0.85) status = 'ahead';
      else if (monthsLeft > monthsToTarget * 1.15) status = 'behind';
    } else {
      if (monthsLeft < 12) status = 'ahead';
      else if (monthsLeft > 24) status = 'behind';
    }
  }
  return { pct, remaining, status };
}

function calcProjectedMonths(g: InvestmentGoal): number | null {
  if (g.monthlyContribution <= 0) return null;
  const remaining = g.targetAmount - g.currentAmount;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / g.monthlyContribution);
}

function projectedDate(g: InvestmentGoal): string | null {
  const months = calcProjectedMonths(g);
  if (months === null) return null;
  if (months === 0) return new Date().toISOString().split('T')[0];
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

function calcDaysRemaining(g: InvestmentGoal): string {
  if (g.targetDate) {
    const targetMs = new Date(g.targetDate).getTime();
    const nowMs = Date.now();
    const days = Math.ceil((targetMs - nowMs) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Past due';
    if (days === 0) return 'Today';
    if (days < 30) return `${days}d left`;
    const months = Math.ceil(days / 30);
    if (months < 12) return `${months}mo left`;
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    return remMonths > 0 ? `${years}yr ${remMonths}mo` : `${years}yr`;
  }
  const months = calcProjectedMonths(g);
  if (months === null) return '';
  if (months === 0) return 'Complete';
  return `${months}mo to target`;
}

function get6MonthProjection(g: InvestmentGoal): number[] {
  const monthly = g.monthlyContribution;
  if (monthly <= 0) return [];
  const projections: number[] = [];
  let cumulative = g.currentAmount;
  for (let i = 1; i <= 6; i++) {
    cumulative += monthly;
    projections.push(Math.min(cumulative, g.targetAmount));
  }
  return projections;
}

// ── Sub-components ───────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="investments-empty">
      <div className="investments-empty-icon">🏦</div>
      <h3 className="investments-empty-title">Set Your First Investment Goal</h3>
      <p className="investments-empty-body">401k, IRA, college fund — track them all here.</p>
      <button className="btn-add-first-goal" onClick={onAdd}>
        <span>➕</span> Add Investment Goal
      </button>
    </div>
  );
}

function ConfettiBurst() {
  return (
    <div className="confetti-container">
      {CONFETTI_DIRECTIONS.map((dir, i) => (
        <div
          key={i}
          className="confetti-particle"
          style={{
            '--confetti-direction': dir,
            left: '50%',
            top: '50%',
            marginLeft: -3,
            marginTop: -3,
            background: ['#10b981', '#34d399', '#059669', '#fbbf24', '#38bdf8', '#a78bfa'][i % 6],
            animationDelay: `${i * 0.04}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

function GoalCard({
  goal, expanded, onToggle, onDelete, onEdit, celebrating,
}: {
  goal: InvestmentGoal;
  expanded: boolean;
  onToggle: () => void;
  onDelete: (id: string) => void;
  onEdit: (goal: InvestmentGoal) => void;
  celebrating: boolean;
}) {
  const { pct, remaining, status } = calcProgress(goal);
  const projDate = projectedDate(goal);
  const statusMeta = STATUS_META[status];
  const typeMeta = TYPE_META[goal.type];
  const riskMeta = RISK_META[goal.riskProfile];
  const monthsLeft = calcProjectedMonths(goal);
  const daysLabel = calcDaysRemaining(goal);
  const isReached = pct >= 100;
  const isActive = goal.monthlyContribution > 0 && remaining > 0;
  const projection = get6MonthProjection(goal);
  const maxProj = Math.max(...projection, goal.targetAmount);

  return (
    <div
      className={`goal-card ${expanded ? 'goal-card-expanded' : ''}`}
      data-status={status}
      data-reached={isReached ? 'true' : 'false'}
      data-active={isActive && !isReached ? 'true' : 'false'}
    >
      <div className="goal-card-header" onClick={onToggle}>
        <div className="goal-type-icon">{typeMeta.icon}</div>
        <div className="goal-name-block">
          <span className="goal-name">{goal.name}</span>
          <span className="goal-type-label">{typeMeta.label}</span>
        </div>
        <div className="goal-progress-summary">
          <span className="goal-pct-label">{pct.toFixed(1)}%</span>
          <span className="goal-remaining-label">{formatMoney(remaining)} left</span>
        </div>
        <div className="goal-status-badge" style={{ color: statusMeta.color, background: statusMeta.bg }}>
          {isReached ? '🎉 Goal Reached!' : statusMeta.label}
        </div>
        <button className="goal-expand-btn" onClick={e => { e.stopPropagation(); onToggle(); }} aria-label={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? '▲' : '▼'}
        </button>
        {daysLabel && <span className="goal-days-remaining">{daysLabel}</span>}
      </div>

      <div className="goal-progress-track">
        {isReached && celebrating && <ConfettiBurst />}
        <div className="goal-progress-fill" style={{ width: `${pct}%` }} />
        <div className="goal-progress-glow" style={{ width: `${pct}%` }} />
      </div>

      {expanded && (
        <div className="goal-detail-panel">
          {projection.length > 0 && (
            <div className="monthly-projection">
              <div className="monthly-projection-title">6-Month Projection</div>
              <div className="monthly-projection-bars">
                {projection.map((amt, i) => {
                  const monthName = new Date(new Date().setMonth(new Date().getMonth() + i + 1))
                    .toLocaleDateString('en-US', { month: 'short' });
                  const heightPct = (amt / maxProj) * 100;
                  return (
                    <div key={i} className="projection-bar" data-month={monthName}>
                      <div className="projection-bar-fill" style={{ height: `${heightPct}%` }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="goal-detail-grid">
            <div className="goal-detail-item">
              <span className="detail-label">Current Amount</span>
              <span className="detail-value">{formatMoney(goal.currentAmount)}</span>
            </div>
            <div className="goal-detail-item">
              <span className="detail-label">Target Amount</span>
              <span className="detail-value">{formatMoney(goal.targetAmount)}</span>
            </div>
            <div className="goal-detail-item">
              <span className="detail-label">Monthly Contribution</span>
              <span className="detail-value">{formatMoney(goal.monthlyContribution)}</span>
            </div>
            <div className="goal-detail-item">
              <span className="detail-label">Projected Completion</span>
              <span className="detail-value">
                {projDate ? formatShortDate(projDate) : '—'}
                {monthsLeft !== null && monthsLeft > 0 && (
                  <span className="detail-sub"> ({monthsLeft} mo)</span>
                )}
              </span>
            </div>
            {goal.targetDate && (
              <div className="goal-detail-item">
                <span className="detail-label">Target Date</span>
                <span className="detail-value">{formatShortDate(goal.targetDate)}</span>
              </div>
            )}
            <div className="goal-detail-item">
              <span className="detail-label">Risk Profile</span>
              <span className="detail-badge" style={{ color: riskMeta.color, borderColor: riskMeta.color }}>
                {riskMeta.label}
              </span>
            </div>
          </div>

          <div className="goal-detail-actions">
            <button className="btn-edit-goal" onClick={e => { e.stopPropagation(); onEdit(goal); }}>
              ✏️ Edit Goal
            </button>
            <button
              className="btn-delete-goal"
              onClick={e => {
                e.stopPropagation();
                if (confirm(`Delete "${goal.name}"? This cannot be undone.`)) {
                  onDelete(goal.id);
                }
              }}
            >
              🗑 Delete Goal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add/Edit Form ────────────────────────────────────────────────────

function GoalForm({
  initial, onSubmit, onCancel,
}: {
  initial?: InvestmentGoal;
  onSubmit: (goal: InvestmentGoal) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<GoalFormData>({
    name: initial?.name ?? '',
    type: initial?.type ?? '401k',
    targetAmount: initial ? String(initial.targetAmount) : '',
    currentAmount: initial ? String(initial.currentAmount) : '',
    monthlyContribution: initial ? String(initial.monthlyContribution) : '',
    targetDate: initial?.targetDate ?? '',
    riskProfile: initial?.riskProfile ?? 'moderate',
  });
  const [error, setError] = useState('');

  function update(field: keyof GoalFormData, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setError('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Goal name is required.'); return; }
    const target = parseFloat(form.targetAmount);
    const current = parseFloat(form.currentAmount);
    const monthly = parseFloat(form.monthlyContribution);
    if (isNaN(target) || target <= 0) { setError('Enter a valid target amount.'); return; }
    if (isNaN(current) || current < 0) { setError('Enter a valid current amount.'); return; }
    if (isNaN(monthly) || monthly < 0) { setError('Enter a valid monthly contribution.'); return; }

    const goal: InvestmentGoal = {
      id: initial?.id ?? generateId(),
      name: form.name.trim(),
      type: form.type,
      targetAmount: target,
      currentAmount: current,
      monthlyContribution: monthly,
      targetDate: form.targetDate || null,
      riskProfile: form.riskProfile,
      createdAt: initial?.createdAt ?? Date.now(),
    };
    onSubmit(goal);
  }

  return (
    <div className="goal-form-overlay">
      <form className="goal-form" onSubmit={handleSubmit}>
        <div className="goal-form-header">
          <h3>{initial ? 'Edit Goal' : 'Add Investment Goal'}</h3>
          <button type="button" className="form-close-btn" onClick={onCancel}>✕</button>
        </div>

        <div className="goal-form-body">
          <div className="form-field">
            <label htmlFor="goal-name">Goal Name</label>
            <input id="goal-name" type="text" placeholder="e.g. 2028 Retirement Target"
              value={form.name} onChange={e => update('name', e.target.value)} autoFocus />
          </div>

          <div className="form-field">
            <label>Account Type</label>
            <div className="type-selector">
              {GOAL_TYPES.map(t => (
                <button key={t} type="button"
                  className={`type-btn ${form.type === t ? 'active' : ''}`}
                  onClick={() => update('type', t)}>
                  <span className="type-btn-icon">{TYPE_META[t].icon}</span>
                  <span className="type-btn-label">{TYPE_META[t].label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="goal-target">Target Amount ($)</label>
              <input id="goal-target" type="number" min="0" step="0.01" placeholder="500000"
                value={form.targetAmount} onChange={e => update('targetAmount', e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="goal-current">Current Amount ($)</label>
              <input id="goal-current" type="number" min="0" step="0.01" placeholder="125000"
                value={form.currentAmount} onChange={e => update('currentAmount', e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="goal-monthly">Monthly Contribution ($)</label>
              <input id="goal-monthly" type="number" min="0" step="0.01" placeholder="1500"
                value={form.monthlyContribution} onChange={e => update('monthlyContribution', e.target.value)} />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="goal-target-date">Target Date (optional)</label>
            <input id="goal-target-date" type="date"
              value={form.targetDate} onChange={e => update('targetDate', e.target.value)} />
          </div>

          <div className="form-field">
            <label>Risk Profile</label>
            <div className="risk-selector">
              {RISK_PROFILES.map(r => (
                <button key={r} type="button"
                  className={`risk-btn risk-${r} ${form.riskProfile === r ? 'active' : ''}`}
                  onClick={() => update('riskProfile', r)}>
                  {RISK_META[r].label}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}
        </div>

        <div className="goal-form-actions">
          <button type="button" className="btn-cancel-goal" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-save-goal">{initial ? 'Save Changes' : 'Create Goal'}</button>
        </div>
      </form>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export default function InvestmentsTab() {
  const [goals, setGoals] = useState<InvestmentGoal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<InvestmentGoal | null>(null);
  const [celebratingIds, setCelebratingIds] = useState<Set<string>>(new Set());
  const celebratedRef = useRef<Set<string>>(new Set());

  // ── DB load ──────────────────────────────────────────────────────
  async function loadGoals() {
    try {
      const raw: any[] = await invoke('pulse_get_investment_goals', { memberId: null });
      setGoals(raw.map(dbToGoal));
    } catch (e) {
      console.error('[InvestmentsTab] loadGoals error:', e);
    }
  }

  useEffect(() => { loadGoals(); }, []);

  // ── DB persistence ─────────────────────────────────────────────────
  const handleAdd = useCallback(async (goal: InvestmentGoal) => {
    try {
      const created: any = await invoke('pulse_add_investment_goal', {
        req: { name: goal.name, goal_type: goal.type, target_amount: goal.targetAmount, current_amount: goal.currentAmount, monthly_contribution: goal.monthlyContribution, target_date: goal.targetDate, risk_profile: goal.riskProfile },
        memberId: null,
      });
      setGoals(prev => [dbToGoal(created), ...prev]);
      setShowForm(false);
      setEditingGoal(null);
    } catch (e) { console.error('[InvestmentsTab] add error:', e); }
  }, []);

  const handleUpdate = useCallback(async (goal: InvestmentGoal) => {
    try {
      const updated: any = await invoke('pulse_update_investment_goal', {
        id: goal.id,
        req: { name: goal.name, goal_type: goal.type, target_amount: goal.targetAmount, current_amount: goal.currentAmount, monthly_contribution: goal.monthlyContribution, target_date: goal.targetDate, risk_profile: goal.riskProfile },
      });
      setGoals(prev => prev.map(g => g.id === goal.id ? dbToGoal(updated) : g));
      setShowForm(false);
      setEditingGoal(null);
    } catch (e) { console.error('[InvestmentsTab] update error:', e); }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await invoke('pulse_delete_investment_goal', { id });
      setGoals(prev => prev.filter(g => g.id !== id));
      if (expandedId === id) setExpandedId(null);
      celebratedRef.current.delete(id);
      setCelebratingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    } catch (e) { console.error('[InvestmentsTab] delete error:', e); }
  }, [expandedId]);

  const handleFormCancel = useCallback(() => {
    setShowForm(false);
    setEditingGoal(null);
  }, []);

  const handleEdit = useCallback((goal: InvestmentGoal) => {
    setEditingGoal(goal);
    setShowForm(true);
  }, []);

  const handleFormSubmit = useCallback((goal: InvestmentGoal) => {
    if (editingGoal) handleUpdate(goal);
    else handleAdd(goal);
  }, [editingGoal, handleAdd, handleUpdate]);

  const totalPortfolioValue = goals.reduce((sum, g) => sum + g.currentAmount, 0);

  return (
    <div className="investments-tab">
      {/* Header */}
      <div className="investments-header">
        <div className="investments-header-left">
          <div className="investments-title-row">
            <h2 className="investments-title">🏦 Investment Goals</h2>
            {goals.length > 0 && (
              <span className="investments-count">{goals.length} goal{goals.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          {goals.length > 0 && (
            <div className="investments-portfolio-summary">
              Total portfolio value: <span>{formatMoney(totalPortfolioValue)}</span>
            </div>
          )}
        </div>
        {!showForm && (
          <button className="btn-open-add-form" onClick={() => { setEditingGoal(null); setShowForm(true); }}>
            <span>➕</span> Add Goal
          </button>
        )}
      </div>

      {/* Add/edit form modal */}
      {showForm && (
        <GoalForm
          initial={editingGoal ?? undefined}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}

      {/* Content */}
      {goals.length === 0 && !showForm ? (
        <EmptyState onAdd={() => { setEditingGoal(null); setShowForm(true); }} />
      ) : (
        <div className="goals-grid">
          {goals.map(goal => {
            const { pct } = calcProgress(goal);
            const isReached = pct >= 100;
            const alreadyCelebrated = celebratedRef.current.has(goal.id);
            const shouldCelebrate = isReached && !alreadyCelebrated;

            if (shouldCelebrate) {
              celebratedRef.current.add(goal.id);
              setCelebratingIds(prev => new Set(prev).add(goal.id));
              setTimeout(() => {
                setCelebratingIds(prev => { const next = new Set(prev); next.delete(goal.id); return next; });
              }, 2500);
            }

            return (
              <GoalCard
                key={goal.id}
                goal={goal}
                expanded={expandedId === goal.id}
                onToggle={() => setExpandedId(prev => prev === goal.id ? null : goal.id)}
                onDelete={handleDelete}
                onEdit={handleEdit}
                celebrating={celebratingIds.has(goal.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}