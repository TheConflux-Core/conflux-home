// Conflux Home — Budget View (Pulse Overhaul)
// Monthly budget tracker with natural language entry, goals, patterns, and reports.

import { useState, useCallback, useEffect } from 'react';
import { useBudget } from '../hooks/useBudget';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types';
import type { BudgetGoal } from '../types';
import InsightCard from './InsightCard';
import PulseParticles from './PulseParticles';
import '../styles/budget-pulse.css';

function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

// ── SVG Circular Progress Ring ──

function SavingsRing({ pct, healthStatus = 'good' }: { pct: number; healthStatus?: string }) {
  const circumference = 2 * Math.PI * 40; // r=40
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference;
  return (
    <div className={`pulse-savings-ring-container`}>
      <div className={`pulse-savings-ring health-${healthStatus}`}>
        <svg viewBox="0 0 100 100">
          <circle className="pulse-savings-ring-track" cx="50" cy="50" r="40" />
          <circle
            className="pulse-savings-ring-fill"
            cx="50" cy="50" r="40"
            style={{ strokeDashoffset: offset }}
          />
        </svg>
        <div className="pulse-savings-ring-label">
          <span className="pulse-savings-ring-pct">{pct.toFixed(0)}%</span>
          <span className="pulse-savings-ring-text">saved</span>
        </div>
      </div>
      <div className="pulse-savings-ring-info">
        <div className="pulse-savings-ring-title">Savings Rate</div>
        <div className="pulse-savings-ring-sub">Target: 20%+ for healthy finances</div>
      </div>
    </div>
  );
}

// ── Goal Card with Progress Ring ──

function GoalCard({ goal, onDelete, onUpdate }: {
  goal: BudgetGoal;
  onDelete: (id: string) => void;
  onUpdate: (id: string, amount: number) => void;
}) {
  const pct = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
  const circumference = 2 * Math.PI * 25; // r=25
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="pulse-goal-card">
      <div className="pulse-goal-progress">
        <svg viewBox="0 0 60 60">
          <circle className="pulse-goal-progress-track" cx="30" cy="30" r="25" />
          <circle
            className="pulse-goal-progress-fill"
            cx="30" cy="30" r="25"
            style={{ strokeDashoffset: offset }}
          />
        </svg>
        <span className="pulse-goal-progress-pct">{pct.toFixed(0)}%</span>
      </div>
      <div className="pulse-goal-info">
        <div className="pulse-goal-name">{goal.name}</div>
        <div className="pulse-goal-amount">
          {formatMoney(goal.current_amount)} / {formatMoney(goal.target_amount)}
        </div>
        {goal.deadline && (
          <div className="pulse-goal-deadline">Due: {goal.deadline}</div>
        )}
      </div>
      <div className="pulse-goal-actions">
        <button className="btn-secondary" onClick={() => {
          const amt = prompt('Update current amount:', String(goal.current_amount));
          if (amt !== null) onUpdate(goal.id, parseFloat(amt));
        }} title="Update amount">✏️</button>
        <button className="btn-danger" onClick={() => onDelete(goal.id)} title="Delete goal">🗑️</button>
      </div>
    </div>
  );
}

// ── Main Component ──

export default function BudgetView() {
  const {
    entries, summary, month, loading, goals, patterns, report,
    addEntry, deleteEntry, prevMonth, nextMonth,
    parseNatural, createGoal, updateGoal, deleteGoal, generateReport,
  } = useBudget();

  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [entryType, setEntryType] = useState<'income' | 'expense' | 'savings'>('expense');
  const [category, setCategory] = useState('groceries');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Natural language state
  const [nlInput, setNlInput] = useState('');
  const [nlParsed, setNlParsed] = useState<{
    entry_type: string;
    category: string;
    amount: number;
    description: string;
  } | null>(null);
  const [nlLoading, setNlLoading] = useState(false);

  // Goals state
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalAlloc, setGoalAlloc] = useState('');
  const [creatingGoal, setCreatingGoal] = useState(false);

  // Report state
  const [reportLoading, setReportLoading] = useState(false);

  // Insights state
  const [insights, setInsights] = useState<Array<{
    pattern_type: string;
    message: string;
    severity: string;
    category: string | null;
    amount: number | null;
  }>>([]);

  const categories = entryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // ── Handlers ──

  const handleAdd = useCallback(async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;
    setSubmitting(true);
    try {
      await addEntry({
        entry_type: entryType,
        category: entryType === 'savings' ? 'savings' : category,
        amount: amt,
        description: description.trim() || undefined,
        recurring,
        date: getToday(),
      });
      setAmount('');
      setDescription('');
      setShowAddForm(false);
    } finally {
      setSubmitting(false);
    }
  }, [amount, category, description, entryType, recurring, addEntry]);

  const handleNLParse = useCallback(async () => {
    const input = nlInput.trim();
    if (!input) return;
    setNlLoading(true);
    try {
      const result = await parseNatural(input);
      setNlParsed(result);
    } catch (e) {
      console.error('Failed to parse:', e);
    } finally {
      setNlLoading(false);
    }
  }, [nlInput, parseNatural]);

  const handleNLConfirm = useCallback(async () => {
    if (!nlParsed) return;
    setSubmitting(true);
    try {
      await addEntry({
        entry_type: nlParsed.entry_type,
        category: nlParsed.category,
        amount: nlParsed.amount,
        description: nlParsed.description || undefined,
        date: getToday(),
      });
      setNlInput('');
      setNlParsed(null);
    } finally {
      setSubmitting(false);
    }
  }, [nlParsed, addEntry]);

  const handleCreateGoal = useCallback(async () => {
    if (!goalName.trim() || !goalTarget) return;
    setCreatingGoal(true);
    try {
      await createGoal(
        goalName.trim(),
        parseFloat(goalTarget),
        goalDeadline || undefined,
        goalAlloc ? parseFloat(goalAlloc) : undefined,
      );
      setGoalName('');
      setGoalTarget('');
      setGoalDeadline('');
      setGoalAlloc('');
      setShowGoalForm(false);
    } finally {
      setCreatingGoal(false);
    }
  }, [goalName, goalTarget, goalDeadline, goalAlloc, createGoal]);

  const handleGenerateReport = useCallback(async () => {
    setReportLoading(true);
    try {
      await generateReport();
    } finally {
      setReportLoading(false);
    }
  }, [generateReport]);

  // ── Computed ──

  const income = summary?.total_income ?? 0;
  const expenses = summary?.total_expenses ?? 0;
  const savings = summary?.total_savings ?? 0;
  const net = income - expenses - savings;
  const spentPct = income > 0 ? Math.min((expenses / income) * 100, 100) : 0;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;

  const healthStatus = spentPct > 90 ? 'danger' : spentPct > 70 ? 'caution' : 'good';

  // Generate proactive insights from patterns
  useEffect(() => {
    if (patterns.length > 0 && insights.length === 0) {
      // Convert patterns to insight cards
      const generated = patterns.slice(0, 3).map((p, i) => ({
        pattern_type: p.pattern_type,
        message: `${p.description} — averaging $${p.avg_amount.toFixed(2)} per ${p.frequency}.`,
        severity: i === 0 ? 'info' as const : (p.avg_amount > 200 ? 'warning' as const : 'info' as const),
        category: p.category,
        amount: p.avg_amount,
      }));
      setInsights(generated);
    }
  }, [patterns]);

  if (loading) {
    return (
      <div className="budget-view">
        <div className="pulse-loading">
          <div className="pulse-skeleton" style={{ height: '48px' }} />
          <div className="budget-summary">
            {[1, 2, 3, 4].map(i => <div key={i} className="pulse-skeleton" />)}
          </div>
          <div className="pulse-skeleton" />
          <div className="pulse-skeleton pulse-skeleton-sm" />
          <div className="pulse-skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="budget-view">
      <PulseParticles />

      {/* ── Header ── */}
      <div className="budget-header">
        <div className="budget-nav">
          <button className="budget-nav-btn" onClick={prevMonth}>←</button>
          <h2 className="budget-month">{formatMonth(month)}</h2>
          <button className="budget-nav-btn" onClick={nextMonth}>→</button>
        </div>
        <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel' : '+ Add Entry'}
        </button>
      </div>

      {/* ── Natural Language Input ── */}
      <div className="pulse-nl-bar">
        <input
          className="pulse-nl-input"
          type="text"
          placeholder='Spent $45 on groceries...'
          value={nlInput}
          onChange={e => { setNlInput(e.target.value); setNlParsed(null); }}
          onKeyDown={e => { if (e.key === 'Enter') handleNLParse(); }}
          disabled={nlLoading}
        />
        {nlLoading && (
          <div className="pulse-nl-result">
            <span className="pulse-spinner" />
            <span style={{ fontSize: '0.85rem', color: 'var(--pulse-text-muted)' }}>Parsing...</span>
          </div>
        )}
        {nlParsed && !nlLoading && (
          <div className="pulse-nl-result">
            <span className="pulse-nl-result-icon">
              {nlParsed.entry_type === 'income' ? '💰' : nlParsed.entry_type === 'savings' ? '🏦' : '💸'}
            </span>
            <div className="pulse-nl-result-info">
              <div className="pulse-nl-result-type">{nlParsed.entry_type} · {nlParsed.category}</div>
              <div className="pulse-nl-result-detail">{nlParsed.description}</div>
            </div>
            <span className="pulse-nl-result-amount">{formatMoney(nlParsed.amount)}</span>
            <div className="pulse-nl-result-actions">
              <button className="btn-primary" onClick={handleNLConfirm} disabled={submitting}>
                {submitting ? '...' : '✓ Add'}
              </button>
              <button className="btn-secondary" onClick={() => setNlParsed(null)}>✕</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bento Hero Grid ── */}
      <div className="pulse-bento-hero">
        <div className="pulse-bento-ring">
          <SavingsRing pct={savingsRate} healthStatus={healthStatus} />
        </div>
        <div className="pulse-bento-card income">
          <div className="budget-card-label">Income</div>
          <div className="budget-card-value">{formatMoney(income)}</div>
        </div>
        <div className="pulse-bento-card expenses">
          <div className="budget-card-label">Expenses</div>
          <div className="budget-card-value">{formatMoney(expenses)}</div>
          {income > 0 && <div className="budget-card-pct">{spentPct.toFixed(0)}% of income</div>}
        </div>
        <div className="pulse-bento-card savings">
          <div className="budget-card-label">Savings</div>
          <div className="budget-card-value">{formatMoney(savings)}</div>
        </div>
        <div className={`pulse-bento-card net ${net >= 0 ? 'positive' : 'negative'}`}>
          <div className="budget-card-label">Net</div>
          <div className="budget-card-value">{net >= 0 ? '+' : ''}{formatMoney(net)}</div>
        </div>
      </div>

      {/* ── Proactive AI Insights ── */}
      {insights.length > 0 && (
        <div className="pulse-insights-section">
          {insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} index={i} />
          ))}
        </div>
      )}

      {/* ── Progress Bar ── */}
      {income > 0 && (
        <div className="budget-progress">
          <div className="budget-progress-bar">
            <div className="budget-progress-expenses" style={{ width: `${spentPct}%` }} />
            <div
              className="budget-progress-savings"
              style={{ width: `${Math.min((savings / income) * 100, 100 - spentPct)}%`, left: `${spentPct}%` }}
            />
          </div>
          <div className="budget-progress-labels">
            <span>{spentPct.toFixed(0)}% spent</span>
            <span>{income > 0 ? ((income - expenses - savings) / income * 100).toFixed(0) : 0}% remaining</span>
          </div>
        </div>
      )}

      {/* ── Add Entry Form ── */}
      {showAddForm && (
        <div className="budget-form">
          <div className="budget-form-type">
            <button className={`type-btn ${entryType === 'income' ? 'active' : ''}`} onClick={() => { setEntryType('income'); setCategory('salary'); }}>
              💰 Income
            </button>
            <button className={`type-btn ${entryType === 'expense' ? 'active' : ''}`} onClick={() => { setEntryType('expense'); setCategory('groceries'); }}>
              💸 Expense
            </button>
            <button className={`type-btn ${entryType === 'savings' ? 'active' : ''}`} onClick={() => { setEntryType('savings'); setCategory('savings'); }}>
              🏦 Savings
            </button>
          </div>

          <div className="budget-form-row">
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Amount"
              className="budget-form-input amount"
              min="0"
              step="0.01"
            />
            {entryType !== 'savings' && (
              <select value={category} onChange={e => setCategory(e.target.value)} className="budget-form-input">
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            )}
          </div>

          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="budget-form-input full"
          />

          <div className="budget-form-actions">
            <label className="budget-recurring">
              <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} />
              Monthly recurring
            </label>
            <button className="btn-primary" onClick={handleAdd} disabled={submitting || !amount}>
              {submitting ? 'Adding...' : 'Add Entry'}
            </button>
          </div>
        </div>
      )}

      {/* ── Goals Section ── */}
      <div className="pulse-goals-section">
        <div className="pulse-goals-header">
          <h3 className="section-title">🎯 Budget Goals</h3>
          <button className="btn-secondary" onClick={() => setShowGoalForm(!showGoalForm)}>
            {showGoalForm ? 'Cancel' : '+ Add Goal'}
          </button>
        </div>

        {showGoalForm && (
          <div className="pulse-goal-add-form">
            <div className="pulse-goal-add-row">
              <input
                type="text"
                placeholder="Goal name (e.g. Emergency Fund)"
                value={goalName}
                onChange={e => setGoalName(e.target.value)}
              />
              <input
                type="number"
                placeholder="Target amount"
                value={goalTarget}
                onChange={e => setGoalTarget(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="pulse-goal-add-row">
              <input
                type="date"
                value={goalDeadline}
                onChange={e => setGoalDeadline(e.target.value)}
                placeholder="Deadline"
              />
              <input
                type="number"
                placeholder="Monthly allocation (optional)"
                value={goalAlloc}
                onChange={e => setGoalAlloc(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <button className="btn-primary" onClick={handleCreateGoal} disabled={creatingGoal || !goalName.trim() || !goalTarget}>
              {creatingGoal ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        )}

        {goals.length === 0 && !showGoalForm ? (
          <div className="pulse-goals-empty">No goals yet. Create one to start tracking your savings targets!</div>
        ) : (
          <div className="pulse-goals-grid">
            {goals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onDelete={deleteGoal}
                onUpdate={updateGoal}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Patterns Section ── */}
      <div className="pulse-patterns-section">
        <h3 className="section-title">🔍 Spending Patterns</h3>
        {patterns.length === 0 ? (
          <div className="pulse-patterns-empty">No patterns detected yet. More data needed.</div>
        ) : (
          <div className="pulse-patterns-grid">
            {patterns.map((p, i) => (
              <div key={i} className="pulse-pattern-card">
                <div className="pulse-pattern-header">
                  <span className="pulse-pattern-type">{p.pattern_type}</span>
                  <span className="pulse-pattern-category">{p.category}</span>
                </div>
                <div className="pulse-pattern-desc">{p.description}</div>
                <div className="pulse-pattern-meta">
                  <span>Avg: {formatMoney(p.avg_amount)}</span>
                  <span>{p.frequency}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Monthly Report ── */}
      <div className="pulse-report-section">
        <div className="pulse-report-trigger">
          <h3 className="section-title">📈 Monthly Report</h3>
          <button className="btn-secondary" onClick={handleGenerateReport} disabled={reportLoading}>
            {reportLoading ? <><span className="pulse-spinner" /> Generating...</> : '📊 Generate Report'}
          </button>
        </div>

        {report && (
          <div className="pulse-report-card">
            <div className="pulse-report-header">
              <span className="pulse-report-title">Monthly Report</span>
              <span className="pulse-report-month">{formatMonth(report.month)}</span>
            </div>

            <div className="pulse-report-grid">
              <div className="pulse-report-stat">
                <div className="pulse-report-stat-label">Income</div>
                <div className="pulse-report-stat-value">{formatMoney(report.total_income)}</div>
              </div>
              <div className="pulse-report-stat">
                <div className="pulse-report-stat-label">Expenses</div>
                <div className="pulse-report-stat-value">{formatMoney(report.total_expenses)}</div>
              </div>
              <div className="pulse-report-stat">
                <div className="pulse-report-stat-label">Net</div>
                <div className="pulse-report-stat-value">{formatMoney(report.net)}</div>
              </div>
            </div>

            <div className={`pulse-savings-ring-container`}>
              <SavingsRing pct={report.savings_rate * 100} />
            </div>

            {report.comparison_to_last_month !== null && (
              <div className={`pulse-report-comparison ${report.comparison_to_last_month >= 0 ? 'positive' : 'negative'}`}>
                {report.comparison_to_last_month >= 0 ? '↑' : '↓'}{' '}
                {Math.abs(report.comparison_to_last_month).toFixed(1)}% vs last month
              </div>
            )}

            {report.top_categories.length > 0 && (
              <div>
                <div className="section-title" style={{ marginBottom: '8px' }}>Top Spending</div>
                <div className="pulse-report-top-cats">
                  {report.top_categories.map((cat, i) => (
                    <div key={i} className="pulse-report-cat-row">
                      <span className="pulse-report-cat-name">{cat.category}</span>
                      <span className="pulse-report-cat-amount">{formatMoney(cat.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Category Breakdown ── */}
      {summary && summary.categories.length > 0 && (
        <div className="budget-categories">
          <h3 className="section-title">📊 Spending by Category</h3>
          <div className="cat-bars">
            {summary.categories.map(cat => {
              const catConfig = EXPENSE_CATEGORIES.find(c => c.id === cat.category);
              const pct = expenses > 0 ? (cat.total / expenses) * 100 : 0;
              return (
                <div key={cat.category} className="cat-bar-row">
                  <span className="cat-bar-label">{catConfig?.label ?? cat.category}</span>
                  <div className="cat-bar-track">
                    <div className="cat-bar-fill" style={{ width: `${Math.max(pct, 3)}%`, background: catConfig?.color ?? '#6b7280' }} />
                  </div>
                  <span className="cat-bar-amount">{formatMoney(cat.total)}</span>
                  <span className="cat-bar-pct">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Recent Entries ── */}
      <div className="budget-entries">
        <h3 className="section-title">📋 Recent Entries</h3>
        {entries.length === 0 ? (
          <div className="budget-empty">No entries this month. Add your first one above!</div>
        ) : (
          <div className="entry-list">
            {entries.slice(0, 20).map(entry => {
              const allCats = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
              const catConfig = allCats.find(c => c.id === entry.category);
              return (
                <div key={entry.id} className={`entry-row ${entry.entry_type}`}>
                  <span className="entry-type-icon">
                    {entry.entry_type === 'income' ? '💰' : entry.entry_type === 'savings' ? '🏦' : '💸'}
                  </span>
                  <div className="entry-info">
                    <div className="entry-desc">{entry.description ?? catConfig?.label ?? entry.category}</div>
                    <div className="entry-meta">
                      {catConfig?.label ?? entry.category} · {entry.date}
                      {entry.recurring && ' 🔁'}
                    </div>
                  </div>
                  <span className={`entry-amount ${entry.entry_type}`}>
                    {entry.entry_type === 'income' ? '+' : '-'}{formatMoney(entry.amount)}
                  </span>
                  <button className="entry-delete" onClick={() => deleteEntry(entry.id)}>✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
