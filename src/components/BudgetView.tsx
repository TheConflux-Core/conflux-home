// Conflux Home — Budget View
// Monthly budget tracker with income, expenses, savings, and category breakdown.

import { useState, useCallback } from 'react';
import { useBudget } from '../hooks/useBudget';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types';

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

export default function BudgetView() {
  const { entries, summary, month, loading, addEntry, deleteEntry, prevMonth, nextMonth } = useBudget();

  const [showAddForm, setShowAddForm] = useState(false);
  const [entryType, setEntryType] = useState<'income' | 'expense' | 'savings'>('expense');
  const [category, setCategory] = useState('groceries');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const categories = entryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

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

  const income = summary?.total_income ?? 0;
  const expenses = summary?.total_expenses ?? 0;
  const savings = summary?.total_savings ?? 0;
  const net = income - expenses - savings;
  const spentPct = income > 0 ? Math.min((expenses / income) * 100, 100) : 0;

  return (
    <div className="budget-view">
      {/* Header */}
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

      {/* Summary Cards */}
      <div className="budget-summary">
        <div className="budget-card income">
          <div className="budget-card-label">Income</div>
          <div className="budget-card-value">{formatMoney(income)}</div>
        </div>
        <div className="budget-card expenses">
          <div className="budget-card-label">Expenses</div>
          <div className="budget-card-value">{formatMoney(expenses)}</div>
          {income > 0 && <div className="budget-card-pct">{spentPct.toFixed(0)}% of income</div>}
        </div>
        <div className="budget-card savings">
          <div className="budget-card-label">Savings</div>
          <div className="budget-card-value">{formatMoney(savings)}</div>
        </div>
        <div className={`budget-card net ${net >= 0 ? 'positive' : 'negative'}`}>
          <div className="budget-card-label">Net</div>
          <div className="budget-card-value">{net >= 0 ? '+' : ''}{formatMoney(net)}</div>
        </div>
      </div>

      {/* Progress bar */}
      {income > 0 && (
        <div className="budget-progress">
          <div className="budget-progress-bar">
            <div className="budget-progress-expenses" style={{ width: `${spentPct}%` }} />
            <div className="budget-progress-savings" style={{ width: `${Math.min((savings / income) * 100, 100 - spentPct)}%`, left: `${spentPct}%` }} />
          </div>
          <div className="budget-progress-labels">
            <span>{spentPct.toFixed(0)}% spent</span>
            <span>{income > 0 ? ((income - expenses - savings) / income * 100).toFixed(0) : 0}% remaining</span>
          </div>
        </div>
      )}

      {/* Add Form */}
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

      {/* Category Breakdown */}
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

      {/* Recent Entries */}
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
