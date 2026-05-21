// Conflux Home — BudgetTab (PulseWrapper Tab)
// Zero-based budgeting matrix adapted as a Pulse tab.
// Does NOT include boot/onboarding/tour — managed by PulseWrapper.

import { useState, useCallback, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useAuth } from '../hooks/useAuth';
import { useBudget } from '../hooks/useBudget';
import { useBudgetEngine } from '../hooks/useBudgetEngine';
import PulseParticles from './PulseParticles';
import BudgetConfigModal from './BudgetConfigModal';
import { TransactionLogModal } from './TransactionLogModal';
import { parseBudgetCommand } from '../hooks/useBudgetAI';
import { playSuccess } from '../lib/sound';

function formatMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface BudgetTabProps {
  preOnboarding?: boolean;
}

export default function BudgetTab({ preOnboarding = false }: BudgetTabProps) {
  const { user } = useAuth();
  const { period, prevPeriod, nextPeriod } = useBudget();
  const {
    settings,
    buckets,
    transactions,
    updateSettings,
    logTransaction,
    createBucket,
    updateBucket,
    deleteBucket,
    deleteTransaction,
    parseNatural,
    refreshData,
  } = useBudgetEngine(user?.id ?? null);

  // ── State ────────────────────────────────────────────────
  const [activeBucket, setActiveBucket] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [nlpInput, setNlpInput] = useState('');
  const [nlpParsed, setNlpParsed] = useState<{ entry_type: string; category: string; amount: number; description: string } | null>(null);
  const [nlpConfirming, setNlpConfirming] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [showTxHistory, setShowTxHistory] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: string; period: 'p1' | 'p2' } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Listen for external budget changes (e.g. LLM-added entries)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<{ action: string }>('conflux:budget-changed', () => {
      refreshData();
    }).then(fn => { unlisten = fn; }).catch(() => {});
    return () => { if (unlisten) unlisten(); };
  }, [refreshData]);

  // ── Derived ─────────────────────────────────────────────
  const totalIncome = settings?.income_amount || 0;
  const totalObligations = buckets.reduce((sum, b) => sum + (b.monthly_goal || 0), 0);
  const surplus = totalIncome - totalObligations;
  const showNudgePlaceholder = buckets.length < 3 || !settings?.income_amount;

  // ── Proactive Nudge Engine ─────────────────────────────────
  // Generate actionable insights based on budget state
  const nudge = (() => {
    if (showNudgePlaceholder) return null;

    const surplusPct = totalIncome > 0 ? (surplus / totalIncome) * 100 : 0;
    const bucketNames = buckets.map(b => b.name.toLowerCase());

    // 1. Deficit alert — most urgent
    if (surplus < 0) {
      const shortfall = Math.abs(surplus);
      return {
        icon: '🚨',
        title: 'Deficit Alert',
        body: `Your obligations exceed income by ${formatMoney(shortfall)} (${surplusPct.toFixed(0)}% over budget). Review your ${buckets.find(b => (b.monthly_goal || 0) > 0)?.name ?? 'top'} bucket to find cuts.`,
        color: '#ef4444',
        urgency: 'high' as const,
      };
    }

    // 2. Rollover warning — bucket fully paid before period end
    const now = new Date();
    const daysIntoPeriod = (now.getDate() / 30) * 100; // rough % of month
    const nearFullBuckets = buckets.filter(b => {
      const paid = transactions.filter(t => t.bucket_id === b.id && t.status === 'reconciled')
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      return paid >= (b.monthly_goal || 0) * 0.9 && daysIntoPeriod < 70;
    });
    if (nearFullBuckets.length > 0) {
      return {
        icon: '♻️',
        title: 'Bucket Ready to Rollover',
        body: `${nearFullBuckets[0].name} is 90%+ funded with time to spare. Consider adding more or rolling surplus to savings.`,
        color: '#34d399',
        urgency: 'low' as const,
      };
    }

    // 3. Savings rate nudge — encourage saving more
    if (surplusPct > 15) {
      return {
        icon: '🎯',
        title: 'Strong Savings Rate',
        body: `${surplusPct.toFixed(0)}% of income is unallocated — ${formatMoney(surplus)}. Move it to savings or investments before you spend it.`,
        color: '#34d399',
        urgency: 'low' as const,
      };
    }

    // 4. Unallocated bucket — no goal set
    const unallocatedBuckets = buckets.filter(b => !(b.monthly_goal && b.monthly_goal > 0));
    if (unallocatedBuckets.length > 0) {
      return {
        icon: '💡',
        title: 'Bucket Needs a Goal',
        body: `${unallocatedBuckets[0].name} has no monthly limit set. Add a goal in Config to start tracking.`,
        color: '#fbbf24',
        urgency: 'medium' as const,
      };
    }

    // 5. High-spend category alert — if one bucket dominates
    const topBucket = [...buckets].sort((a, b) => (b.monthly_goal || 0) - (a.monthly_goal || 0))[0];
    if (topBucket && totalObligations > 0) {
      const dominantPct = ((topBucket.monthly_goal || 0) / totalObligations) * 100;
      if (dominantPct > 60) {
        return {
          icon: '📊',
          title: `${topBucket.name} Dominates Budget`,
          body: `${topBucket.name} is ${dominantPct.toFixed(0)}% of your obligations. Is that intentional? Review if you want to rebalance.`,
          color: '#fbbf24',
          urgency: 'medium' as const,
        };
      }
    }

    // Default: positive status
    return {
      icon: '✅',
      title: 'Budget On Track',
      body: `All ${buckets.length} buckets tracked. ${surplus > 0 ? formatMoney(surplus) + ' surplus this period.' : 'Spending is balanced.'}`,
      color: '#34d399',
      urgency: 'none' as const,
    };
  })();

  // ── Helpers ─────────────────────────────────────────────
  const getAllocation = (bucketId: string, p: number) => {
    const bucket = buckets.find(b => b.id === bucketId);
    if (!bucket) return 0;
    const goal = bucket.monthly_goal || 0;
    const freq = settings?.pay_frequency;
    if (freq === 'biweekly') return (goal * 12) / 26;
    if (freq === 'weekly') return (goal * 12) / 52;
    if (freq === 'monthly') return p === 1 ? goal : 0;
    return goal / 2; // semi-monthly
  };

  const getPaid = (bucketId: string) =>
    Math.abs(
      transactions
        .filter(t => t.bucket_id === bucketId && t.status === 'reconciled')
        .reduce((sum, t) => sum + t.amount, 0)
    );

  const parseMoney = (val: string | number): number => {
    if (typeof val === 'number') return val;
    return parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
  };

  // ── Cell Editing ────────────────────────────────────────
  const handleCellClick = (bucketId: string, period: 'p1' | 'p2', val: number) => {
    setEditingCell({ id: bucketId, period });
    setEditValue(val.toString());
  };

  const handleCellEdit = () => {
    setEditingCell(null);
  };

  // ── NLP Input ───────────────────────────────────────────
  const handleNlpSubmit = async () => {
    if (!nlpInput.trim()) return;
    try {
      const parsed = await parseNatural(nlpInput);
      setNlpParsed(parsed);
      setNlpConfirming(true);
    } catch (err) {
      console.error('[BudgetTab] NLP parse failed:', err);
    }
  };

  const handleNlpConfirm = async () => {
    if (!nlpParsed) return;
    try {
      const bucketName = nlpParsed.category;
      const bucket = buckets.find(b => b.name.toLowerCase().includes(bucketName.toLowerCase()));
      if (!bucket) {
        alert(`No bucket found for "${bucketName}". Add a bucket first in Config.`);
        return;
      }
      await logTransaction({
        bucket_id: bucket.id,
        amount: nlpParsed.amount,
        date: new Date().toISOString().split('T')[0],
        status: 'reconciled',
        description: nlpParsed.description,
        category: nlpParsed.category,
      });
      playSuccess();
      setNlpInput('');
      setNlpParsed(null);
      setNlpConfirming(false);
    } catch (err) {
      console.error('[BudgetTab] NLP confirm failed:', err);
    }
  };

  const handleNlpCancel = () => {
    setNlpParsed(null);
    setNlpConfirming(false);
  };

  // ── JSX ─────────────────────────────────────────────────
  return (
    <div className="budget-matrix-v2" style={{ paddingTop: preOnboarding ? '50px' : '20px', paddingBottom: '120px', paddingLeft: '121px', paddingRight: '121px' }}>
      <div className="matrix-bg-effects" />
      <PulseParticles />

      {/* Proactive Nudge — placeholder state */}
      {!nudge && (
        <div className="pulse-proactive pulse-proactive-placeholder">
          <span className="pulse-proactive-icon">💡</span>
          <div className="pulse-proactive-content">
            <div className="pulse-proactive-title">Pulse is watching...</div>
            <div className="pulse-proactive-body">
              Configure your pay schedule and add buckets to unlock proactive insights.
            </div>
          </div>
        </div>
      )}

      {/* Proactive Nudge — computed */}
      {nudge && (
        <div className="pulse-proactive" style={{ borderLeft: `3px solid ${nudge.color}` }}>
          <span className="pulse-proactive-icon">{nudge.icon}</span>
          <div className="pulse-proactive-content">
            <div className="pulse-proactive-title">{nudge.title}</div>
            <div className="pulse-proactive-body">{nudge.body}</div>
          </div>
        </div>
      )}

      {/* ── Financial Cockpit ── */}
      <div className="budget-cockpit">
        <div className="cockpit-gauge">
          <div className="gauge-label">Monthly Income</div>
          <div className="gauge-value income">{formatMoney(totalIncome)}</div>
          <div className="gauge-pulse" />
        </div>
        <div className="cockpit-gauge">
          <div className="gauge-label">Total Obligations</div>
          <div className="gauge-value">{formatMoney(totalObligations)}</div>
        </div>
        <div className="cockpit-gauge">
          <div className="gauge-label">Projected Surplus</div>
          <div className="gauge-value surplus">{formatMoney(surplus)}</div>
          <div className="gauge-indicator">● ONLINE</div>
        </div>
      </div>

      {/* ── Natural Language Input ── */}
      <div className="pulse-nlp-bar">
        <div className="nlp-input-wrap">
          <span className="nlp-icon">💬</span>
          <input
            className="nlp-input"
            placeholder="Tell Pulse what happened... e.g. spent $47 at Costco"
            value={nlpInput}
            onChange={e => setNlpInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleNlpSubmit()}
          />
          <button className="nlp-submit-btn" onClick={handleNlpSubmit} disabled={!nlpInput.trim()}>
            Send
          </button>
        </div>
        {nlpConfirming && nlpParsed && (
          <div className="nlp-confirm-card">
            <div className="nlp-confirm-label">Did Pulse understand correctly?</div>
            <div className="nlp-confirm-detail">
              <span className="nlp-type-badge">{nlpParsed.entry_type.toUpperCase()}</span>
              <span className="nlp-amount">${nlpParsed.amount.toFixed(2)}</span>
              <span className="nlp-category">for <strong>{nlpParsed.category}</strong></span>
            </div>
            <div className="nlp-confirm-actions">
              <button className="nlp-yes-btn" onClick={handleNlpConfirm}>✓ Yes, log it</button>
              <button className="nlp-no-btn" onClick={handleNlpCancel}>✕ Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Matrix Header ── */}
      <div className="matrix-header">
        <div className="matrix-nav">
          <button className="matrix-btn" onClick={prevPeriod}>←</button>
          <h2 className="matrix-title">{period} // ALLOCATION GRID</h2>
          <button className="matrix-btn" onClick={nextPeriod}>→</button>
        </div>
        <div className="matrix-controls">
          <button className="btn-primary" onClick={() => setIsLogOpen(true)}>⚡ LOG PAYMENT</button>
          <button className="btn-secondary" onClick={() => setShowTxHistory(v => !v)}>
            {showTxHistory ? '▲ HIDE HISTORY' : `📋 HISTORY (${transactions.length})`}
          </button>
          <button className="btn-secondary" onClick={() => setIsConfigOpen(true)}>⚙️ CONFIG</button>
        </div>
      </div>

      {/* ── Allocation Grid ── */}
      <div className="matrix-container">
        <div className="grid-wrapper">
          {/* Column Headers */}
          <div className="grid-row header-row">
            <div className="grid-cell col-bucket">BUCKET ID</div>
            <div className="grid-cell col-pay">ALLOCATED P1</div>
            <div className="grid-cell col-paid">ACTUAL PAID P1</div>
            <div className="grid-cell col-pay">ALLOCATED P2</div>
            <div className="grid-cell col-paid">ACTUAL PAID P2</div>
            <div className="grid-cell col-meter">STATUS & TOTAL</div>
          </div>

          {/* Data Rows */}
          {buckets.map((bucket, index) => {
            const p1Alloc = getAllocation(bucket.id, 1);
            const p2Alloc = getAllocation(bucket.id, 2);
            const totalPaid = getPaid(bucket.id);
            const goal = bucket.monthly_goal || 0;
            const pct = goal > 0 ? Math.min((totalPaid / goal) * 100, 100) : 0;
            const isFull = totalPaid >= goal;

            return (
              <div
                key={bucket.id}
                className={`grid-row data-row ${activeBucket === bucket.id ? 'active' : ''}`}
                style={{ '--row-index': index } as React.CSSProperties}
                onMouseEnter={() => setActiveBucket(bucket.id)}
                onMouseLeave={() => setActiveBucket(null)}
              >
                <div className="grid-cell col-bucket">
                  <span className="bucket-icon" style={{ color: bucket.color || undefined }}>{bucket.icon || '💳'}</span>
                  <span className="bucket-label">{bucket.name}</span>
                </div>

                <div className="grid-cell col-pay interactive" onClick={() => handleCellClick(bucket.id, 'p1', p1Alloc)}>
                  {editingCell?.id === bucket.id && editingCell?.period === 'p1' ? (
                    <input
                      autoFocus
                      className="cell-edit-input"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={handleCellEdit}
                      onKeyDown={e => e.key === 'Enter' && handleCellEdit()}
                    />
                  ) : (
                    <span className="pay-amount">{formatMoney(p1Alloc)}</span>
                  )}
                </div>

                <div className="grid-cell col-paid">
                  <span className={`paid-val ${Math.min(totalPaid, p1Alloc) > 0 ? 'pending' : 'settled'}`}>
                    {formatMoney(Math.min(totalPaid, p1Alloc))}
                  </span>
                </div>

                <div className="grid-cell col-pay interactive" onClick={() => handleCellClick(bucket.id, 'p2', p2Alloc)}>
                  {editingCell?.id === bucket.id && editingCell?.period === 'p2' ? (
                    <input
                      autoFocus
                      className="cell-edit-input"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={handleCellEdit}
                      onKeyDown={e => e.key === 'Enter' && handleCellEdit()}
                    />
                  ) : (
                    <span className="pay-amount">{formatMoney(p2Alloc)}</span>
                  )}
                </div>

                <div className="grid-cell col-paid">
                  <span className={`paid-val ${Math.max(0, totalPaid - p1Alloc) > 0 ? 'pending' : 'settled'}`}>
                    {formatMoney(Math.max(0, totalPaid - p1Alloc))}
                  </span>
                </div>

                <div className="grid-cell col-meter">
                  <div className="meter-info">
                    <span className="meter-total">Goal: {formatMoney(goal)}</span>
                    <span className={`meter-label ${isFull ? 'complete' : 'due'}`}>
                      {isFull ? 'SECURED' : `${formatMoney(Math.max(0, goal - totalPaid))} DUE`}
                    </span>
                  </div>
                  <div className="meter-track">
                    <div
                      className="meter-fill"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: isFull ? '#10b981' : (bucket.color || '#10b981'),
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Transaction History Panel ── */}
      {showTxHistory && (
        <div className="tx-history-panel">
          <div className="tx-history-header">TRANSACTION LOG</div>
          {transactions.length === 0 ? (
            <div className="tx-history-empty">No transactions logged yet.</div>
          ) : (
            <div className="tx-history-list">
              {[...transactions].reverse().map(tx => {
                const bucket = buckets.find(b => b.id === tx.bucket_id);
                return (
                  <div key={tx.id} className="tx-history-row">
                    <div className="tx-row-left">
                      <span className="tx-icon">{bucket?.icon || '💳'}</span>
                      <div className="tx-row-info">
                        <span className="tx-row-bucket">{bucket?.name || 'Uncategorized'}</span>
                        <span className="tx-row-desc">{tx.description || tx.merchant || '—'}</span>
                        <span className="tx-row-date">{tx.date}</span>
                      </div>
                    </div>
                    <div className="tx-row-right">
                      <span className={`tx-amount ${tx.amount >= 0 ? 'income' : ''}`}>
                        {tx.amount >= 0 ? '+' : ''}{formatMoney(tx.amount)}
                      </span>
                      <span className={`tx-status ${tx.status}`}>{tx.status}</span>
                      <button
                        className="tx-delete-btn"
                        onClick={async () => {
                          if (confirm(`Delete this ${formatMoney(tx.amount)} transaction?`)) {
                            await deleteTransaction(tx.id);
                          }
                        }}
                        title="Delete transaction"
                      >✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      <BudgetConfigModal
        isOpen={isConfigOpen}
        settings={settings}
        buckets={buckets}
        onClose={() => setIsConfigOpen(false)}
        onSaveSettings={async (config) => {
          setSaveStatus('saving');
          try {
            await updateSettings({
              pay_frequency: config.pay_frequency,
              pay_dates: config.pay_dates,
              income_amount: config.income_amount,
            });
          } catch (err) {
            console.error('[BudgetTab] Failed to save settings:', err);
            throw err;
          } finally {
            setSaveStatus('idle');
          }
        }}
        onUpdateBucket={async (id, bucket) => {
          await updateBucket(id, bucket);
        }}
        onCreateBucket={async (bucket) => {
          await createBucket(bucket);
        }}
        onDeleteBucket={async (id) => {
          await deleteBucket(id);
        }}
        saveStatus={saveStatus}
      />

      <TransactionLogModal
        isOpen={isLogOpen}
        onClose={() => setIsLogOpen(false)}
        buckets={buckets.map(b => ({
          id: b.id,
          name: b.name,
          icon: b.icon || '💳',
          color: b.color || '#10b981',
        }))}
        onSave={async (data: { bucketId: string; amount: number; date: string }) => {
          await logTransaction({
            bucket_id: data.bucketId,
            amount: data.amount,
            date: data.date,
            status: 'reconciled',
          });
          playSuccess();
          setIsLogOpen(false);
        }}
      />
    </div>
  );
}