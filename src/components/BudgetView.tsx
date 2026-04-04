// Conflux Home — Budget View (Zero-Based Evolution)
// Envelope-based budgeting with "Per Pay" logic and AI insights.

import { useState, useCallback, useEffect } from 'react';
import { useBudget } from '../hooks/useBudget';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types';
import type { BudgetGoal } from '../types';
import InsightCard from './InsightCard';
import PulseParticles from './PulseParticles';
import '../styles/budget-pulse.css';
import { MicButton } from './voice';

function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

function formatPeriod(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

// ── Envelope Card Component ──

function EnvelopeCard({ name, icon, color, target, current, prevBal }: {
  name: string; icon: string; color: string;
  target: number; current: number; prevBal: number;
}) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div className="envelope-card" style={{ borderLeftColor: color }}>
      <div className="envelope-header">
        <span className="envelope-icon">{icon}</span>
        <span className="envelope-name">{name}</span>
      </div>
      <div className="envelope-stats">
        <div className="envelope-stat">
          <span className="stat-label">Goal</span>
          <span className="stat-value">{formatMoney(target)}</span>
        </div>
        <div className="envelope-stat">
          <span className="stat-label">Allocated</span>
          <span className="stat-value">{formatMoney(current)}</span>
        </div>
        {prevBal > 0 && (
          <div className="envelope-stat debt">
            <span className="stat-label">Prev Bal</span>
            <span className="stat-value">{formatMoney(prevBal)}</span>
          </div>
        )}
      </div>
      <div className="envelope-progress">
        <div className="envelope-progress-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ── Main Component ──

export default function BudgetView() {
  const {
    entries, summary, period, loading, goals, patterns, report,
    addEntry, deleteEntry, prevPeriod, nextPeriod,
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

  const categories = entryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // ── Computed ──
  const income = summary?.total_income ?? 0;
  const expenses = summary?.total_expenses ?? 0;
  const savings = summary?.total_savings ?? 0;
  const net = income - expenses - savings;

  // Zero-Based "Unallocated" - The goal is to get this to 0
  const unallocated = income - expenses - savings;

  if (loading) return <div className="budget-view"><div className="pulse-loading"><div className="pulse-skeleton" style={{ height: 200 }} /></div></div>;

  return (
    <div className="budget-view">
      <PulseParticles />

      {/* ── Header ── */}
      <div className="budget-header">
        <div className="budget-nav">
          <button className="budget-nav-btn" onClick={prevPeriod}>←</button>
          <h2 className="budget-month">{formatPeriod(period)}</h2>
          <button className="budget-nav-btn" onClick={nextPeriod}>→</button>
        </div>
        <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel' : '+ Allocate'}
        </button>
      </div>

      {/* ── Zero-Based Status ── */}
      <div className="pulse-zero-status">
        <div className={`pulse-zero-indicator ${unallocated < 0 ? 'negative' : unallocated > 0 ? 'positive' : 'zeroed'}`}>
          <span>{unallocated >= 0 ? '+' : ''}{formatMoney(unallocated)}</span>
          <small>Unallocated</small>
        </div>
        <p className="pulse-zero-text">
          {unallocated > 0 ? "You have money left to give a job." : unallocated < 0 ? "You've allocated more than you have!" : "Every dollar has a job! 🎉"}
        </p>
      </div>

      {/* ── Envelope Grid ── */}
      <div className="pulse-envelope-grid">
        {EXPENSE_CATEGORIES.map(cat => {
          // Calculate totals for this category
          const catEntries = entries.filter(e => e.category === cat.id);
          const current = catEntries.filter(e => e.entry_type === 'expense').reduce((sum, e) => sum + e.amount, 0);
          const prevBal = 0; // Placeholder - will come from a future "rollover" feature
          return (
            <EnvelopeCard 
              key={cat.id}
              name={cat.label}
              icon={cat.id === 'groceries' ? '🛒' : cat.id === 'rent' ? '🏠' : '💳'}
              color={cat.color}
              target={0} // Placeholder for "Per Pay" goal
              current={current}
              prevBal={prevBal}
            />
          );
        })}
      </div>

      {/* ── Natural Language Input ── */}
      <div className="pulse-nl-bar">
        <div className="input-with-mic">
          <input
            className="pulse-nl-input"
            type="text"
            placeholder='e.g. "Put $100 in Savings" or "Rent is $820"'
            value={nlInput}
            onChange={e => { setNlInput(e.target.value); setNlParsed(null); }}
            onKeyDown={e => { if (e.key === 'Enter') handleNLParse(); }}
            disabled={nlLoading}
          />
          <MicButton
            onTranscription={(text) => { setNlInput(text); setNlParsed(null); }}
            variant="inline"
            size="sm"
            className="mic-button-inline"
          />
        </div>
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
                {submitting ? '...' : '✓ Allocate'}
              </button>
              <button className="btn-secondary" onClick={() => setNlParsed(null)}>✕</button>
            </div>
          </div>
        )}
      </div>

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
              {submitting ? 'Allocating...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {/* ── Recent Entries ── */}
      <div className="budget-entries">
        <h3 className="section-title">📋 Activity</h3>
        {entries.length === 0 ? (
          <div className="budget-empty">No entries yet. Start by adding your income!</div>
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
