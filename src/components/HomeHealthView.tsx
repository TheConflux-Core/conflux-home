// Conflux Home — Foundation View
// Your Home's Nerve Center: diagnosis, predictions, seasonal care, warranties, AI chat

import { useState, useEffect, useCallback } from 'react';
import { useHomeHealth } from '../hooks/useHomeHealth';
import { useHomeDiagnosis, usePredictions, useSeasonalTasks, useWarrantyAlerts, useHomeChat } from '../hooks/foundation-hooks';
import { FoundationHero, FoundationDiagnosisCard, FoundationPredictionsGrid, FoundationSeasonalCalendar, FoundationChat, FoundationVault } from './foundation';
import '../styles/foundation.css';

type Tab = 'overview' | 'diagnose' | 'calendar' | 'vault' | 'chat';

export default function HomeHealthView() {
  const { dashboard, loading, load } = useHomeHealth();
  const { diagnosis, loading: diagnosing, error: diagnoseError, diagnose } = useHomeDiagnosis();
  const { predictions, load: loadPredictions } = usePredictions();
  const { tasks, load: loadSeasonalTasks, complete } = useSeasonalTasks();
  const { alerts, load: loadWarrantyAlerts } = useWarrantyAlerts();
  const { messages, loading: chatLoading, send } = useHomeChat();

  const [tab, setTab] = useState<Tab>('overview');
  const [symptomInput, setSymptomInput] = useState('');
  const [vaultLoaded, setVaultLoaded] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1);
  const [recentDiagnoses, setRecentDiagnoses] = useState<string[]>([]);

  // Load dashboard on mount
  useEffect(() => { load(); }, [load]);

  // Load predictions on mount
  useEffect(() => { loadPredictions(); }, [loadPredictions]);

  // Load seasonal tasks on mount and when month changes
  useEffect(() => { loadSeasonalTasks(currentMonth); }, [currentMonth, loadSeasonalTasks]);

  // Load warranty alerts when Vault tab opens
  useEffect(() => {
    if (tab === 'vault' && !vaultLoaded) {
      loadWarrantyAlerts();
      setVaultLoaded(true);
    }
  }, [tab, vaultLoaded, loadWarrantyAlerts]);

  const handleDiagnose = useCallback(async () => {
    const trimmed = symptomInput.trim();
    if (!trimmed || diagnosing) return;
    await diagnose(trimmed);
    setRecentDiagnoses(prev => [trimmed, ...prev].slice(0, 5));
    setSymptomInput('');
  }, [symptomInput, diagnosing, diagnose]);

  const handleDiagnoseKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleDiagnose();
    }
  }, [handleDiagnose]);

  const handleMonthChange = useCallback((m: number) => {
    setCurrentMonth(m);
  }, []);

  if (loading) {
    return (
      <div className="foundation-view">
        <div className="foundation-header">
          <h2 className="foundation-title">🏗️ Foundation</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const healthScore = dashboard?.health_score ?? 0;
  const totalMonthly = dashboard?.total_monthly_utilities ?? 0;
  const overdueCount = dashboard?.overdue_maintenance?.length ?? 0;
  const upcomingCount = dashboard?.upcoming_maintenance?.length ?? 0;
  const appliancesAtRisk = dashboard?.appliances_needing_service?.length ?? 0;
  const systems: Array<{ name: string; icon: string; status: 'healthy' | 'warning' | 'critical'; detail: string }> = [];
  const alertsCount = 0;

  return (
    <div className="foundation-view">
      <div className="foundation-header">
        <h2 className="foundation-title">🏗️ Foundation</h2>
        <div className="foundation-tabs">
          {(['overview', 'diagnose', 'calendar', 'vault', 'chat'] as const).map(t => (
            <button
              key={t}
              className={`foundation-tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'overview' ? '📊 Overview' : t === 'diagnose' ? '🩺 Diagnose' : t === 'calendar' ? '📅 Calendar' : t === 'vault' ? '🛡️ Vault' : '💬 Chat'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview Tab ── */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FoundationHero
            healthScore={healthScore}
            systems={systems}
            alertsCount={alertsCount}
          />

          <FoundationPredictionsGrid predictions={predictions} />

          {/* Quick Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="budget-card" style={{ borderLeft: '3px solid #3b82f6' }}>
              <span className="budget-card-emoji">💰</span>
              <span className="budget-card-label">Monthly Utilities</span>
              <span className="budget-card-value" style={{ color: '#3b82f6' }}>${totalMonthly.toFixed(2)}</span>
            </div>
            <div className="budget-card" style={{ borderLeft: '3px solid #ef4444' }}>
              <span className="budget-card-emoji">🔴</span>
              <span className="budget-card-label">Overdue</span>
              <span className="budget-card-value" style={{ color: '#ef4444' }}>{overdueCount}</span>
            </div>
            <div className="budget-card" style={{ borderLeft: '3px solid #f59e0b' }}>
              <span className="budget-card-emoji">🔔</span>
              <span className="budget-card-label">Upcoming</span>
              <span className="budget-card-value" style={{ color: '#f59e0b' }}>{upcomingCount}</span>
            </div>
            <div className="budget-card" style={{ borderLeft: '3px solid #8b5cf6' }}>
              <span className="budget-card-emoji">⚠️</span>
              <span className="budget-card-label">Appliances at Risk</span>
              <span className="budget-card-value" style={{ color: '#8b5cf6' }}>{appliancesAtRisk}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Diagnose Tab ── */}
      {tab === 'diagnose' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Natural Language Input */}
          <div style={{ display: 'flex', gap: 12 }}>
            <textarea
              className="foundation-nl-input"
              value={symptomInput}
              onChange={e => setSymptomInput(e.target.value)}
              onKeyDown={handleDiagnoseKeyDown}
              placeholder="Describe what's wrong with your home..."
              rows={3}
            />
          </div>
          <button
            className="btn-primary"
            onClick={handleDiagnose}
            disabled={!symptomInput.trim() || diagnosing}
            style={{ alignSelf: 'flex-start' }}
          >
            {diagnosing ? '🔍 Diagnosing...' : '🔍 Diagnose Problem'}
          </button>

          {diagnoseError && (
            <div style={{ color: '#ef4444', fontSize: 13 }}>⚠️ {diagnoseError}</div>
          )}

          {/* Diagnosis Result */}
          {diagnosis && <FoundationDiagnosisCard diagnosis={diagnosis} />}

          {/* Recent Problems */}
          {recentDiagnoses.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.75)', margin: '0 0 10px 0' }}>
                🕒 Recent Problems
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentDiagnoses.map((problem, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.7)',
                    }}
                  >
                    {problem}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Calendar Tab ── */}
      {tab === 'calendar' && (
        <FoundationSeasonalCalendar
          tasks={tasks}
          currentMonth={currentMonth}
          onMonthChange={handleMonthChange}
          onComplete={complete}
        />
      )}

      {/* ── Vault Tab ── */}
      {tab === 'vault' && (
        <FoundationVault alerts={alerts} />
      )}

      {/* ── Chat Tab ── */}
      {tab === 'chat' && (
        <FoundationChat
          messages={messages}
          onSend={send}
          loading={chatLoading}
        />
      )}
    </div>
  );
}
