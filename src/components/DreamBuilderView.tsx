// Conflux Home — Dream Builder View
// Reverse-engineer your family's goals into daily actions

import { useState, useCallback } from 'react';
import { useDreams } from '../hooks/useDreams';
import type { Dream, DreamDashboard } from '../types';

const CATEGORY_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
  housing:      { emoji: '🏠', color: '#3b82f6', label: 'Housing' },
  education:    { emoji: '🎓', color: '#8b5cf6', label: 'Education' },
  health:       { emoji: '💪', color: '#10b981', label: 'Health' },
  career:       { emoji: '💼', color: '#f59e0b', label: 'Career' },
  travel:       { emoji: '✈️', color: '#06b6d4', label: 'Travel' },
  family:       { emoji: '👨‍👩‍👧‍👦', color: '#ec4899', label: 'Family' },
  personal:     { emoji: '🌟', color: '#f97316', label: 'Personal' },
  financial:    { emoji: '💰', color: '#14b8a6', label: 'Financial' },
};

export default function DreamBuilderView() {
  const { dashboard, loading, addDream, aiPlan, completeTask, completeMilestone, addProgress, deleteDream } = useDreams();
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('housing');
  const [newDesc, setNewDesc] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [planning, setPlanning] = useState(false);
  const [planResult, setPlanResult] = useState<any>(null);
  const [progressNote, setProgressNote] = useState('');
  const [progressPct, setProgressPct] = useState('5');

  const handleCreate = useCallback(async () => {
    if (!newTitle.trim()) return;
    await addDream(newTitle, newCategory, newDesc || undefined, newTarget || undefined);
    setNewTitle(''); setNewDesc(''); setNewTarget('');
    setShowNewForm(false);
  }, [newTitle, newCategory, newDesc, newTarget, addDream]);

  const handleAiPlan = useCallback(async (dream: Dream) => {
    setPlanning(true);
    try {
      const result = await aiPlan(dream);
      setPlanResult(result);
    } finally {
      setPlanning(false);
    }
  }, [aiPlan]);

  const handleAddProgress = useCallback(async () => {
    if (!selectedDream || !progressNote.trim()) return;
    await addProgress(selectedDream.id, progressNote, parseFloat(progressPct) || 0);
    setProgressNote('');
  }, [selectedDream, progressNote, progressPct, addProgress]);

  if (loading) return (
    <div className="kitchen-view">
      <div className="kitchen-header"><h2 className="kitchen-title">🎯 Dream Builder</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading...</p></div>
    </div>
  );

  const activeDreams = dashboard?.dreams.filter(d => d.status === 'active') ?? [];

  return (
    <div className="kitchen-view">
      <div className="kitchen-header">
        <h2 className="kitchen-title">🎯 Dream Builder</h2>
        <button className="btn-primary" onClick={() => setShowNewForm(!showNewForm)}>
          {showNewForm ? 'Cancel' : '+ New Dream'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div className="budget-card" style={{ borderLeft: '3px solid #8b5cf6' }}>
          <span className="budget-card-emoji">🎯</span>
          <span className="budget-card-label">Active Dreams</span>
          <span className="budget-card-value" style={{ color: '#8b5cf6' }}>{dashboard?.active_dreams ?? 0}</span>
        </div>
        <div className="budget-card" style={{ borderLeft: '3px solid #10b981' }}>
          <span className="budget-card-emoji">🏆</span>
          <span className="budget-card-label">Milestones</span>
          <span className="budget-card-value" style={{ color: '#10b981' }}>{dashboard?.completed_milestones ?? 0}/{dashboard?.total_milestones ?? 0}</span>
        </div>
        <div className="budget-card" style={{ borderLeft: '3px solid #f59e0b' }}>
          <span className="budget-card-emoji">📋</span>
          <span className="budget-card-label">Upcoming Tasks</span>
          <span className="budget-card-value" style={{ color: '#f59e0b' }}>{dashboard?.upcoming_tasks.length ?? 0}</span>
        </div>
      </div>

      {/* New Dream Form */}
      {showNewForm && (
        <div className="ai-add-section" style={{ marginBottom: 16 }}>
          <div className="fridge-scan-header"><span className="ai-add-icon">✨</span><span>New Dream</span></div>
          <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder='"We want to buy a house in 3 years"' className="ai-add-input" style={{ marginBottom: 8 }} />
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Describe your dream..." className="fridge-textarea" rows={2} style={{ marginBottom: 8 }} />
          <div className="ai-add-row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="kitchen-select">
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
            </select>
            <input type="date" value={newTarget} onChange={e => setNewTarget(e.target.value)} className="ai-add-input" style={{ width: 160 }} />
            <button className="btn-primary" onClick={handleCreate} disabled={!newTitle.trim()}>Create Dream</button>
          </div>
        </div>
      )}

      {/* Dream List or Detail */}
      {selectedDream ? (
        <DreamDetail
          dream={selectedDream}
          onBack={() => { setSelectedDream(null); setPlanResult(null); }}
          onPlan={handleAiPlan}
          onCompleteMilestone={completeMilestone}
          onCompleteTask={completeTask}
          onDelete={deleteDream}
          planning={planning}
          planResult={planResult}
          progressNote={progressNote}
          setProgressNote={setProgressNote}
          progressPct={progressPct}
          setProgressPct={setProgressPct}
          onAddProgress={handleAddProgress}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activeDreams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
              <p style={{ color: 'rgba(255,255,255,0.6)' }}>No dreams yet. Create your first one!</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>"We want to buy a house in 3 years" → AI reverse-engineers it into daily actions</p>
            </div>
          ) : (
            activeDreams.map(d => {
              const cat = CATEGORY_CONFIG[d.category] ?? CATEGORY_CONFIG.personal;
              return (
                <div key={d.id} onClick={() => setSelectedDream(d)}
                  style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{cat.emoji} {d.title}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: cat.color }}>{d.progress.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', marginBottom: 8 }}>
                    <div style={{ height: '100%', borderRadius: 2, width: `${d.progress}%`, background: cat.color }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                    <span>{cat.label}</span>
                    {d.target_date && <span>Target: {new Date(d.target_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function DreamDetail({
  dream, onBack, onPlan, onCompleteMilestone, onCompleteTask, onDelete,
  planning, planResult, progressNote, setProgressNote, progressPct, setProgressPct, onAddProgress
}: {
  dream: Dream; onBack: () => void;
  onPlan: (d: Dream) => Promise<void>; onCompleteMilestone: (id: string) => Promise<void>;
  onCompleteTask: (id: string) => Promise<void>; onDelete: (id: string) => Promise<void>;
  planning: boolean; planResult: any;
  progressNote: string; setProgressNote: (s: string) => void;
  progressPct: string; setProgressPct: (s: string) => void; onAddProgress: () => Promise<void>;
}) {
  const cat = CATEGORY_CONFIG[dream.category] ?? CATEGORY_CONFIG.personal;
  const hasPlan = dream.ai_plan || planResult;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>←</button>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>{cat.emoji} {dream.title}</h3>
          {dream.description && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{dream.description}</p>}
        </div>
        <span style={{ fontSize: 24, fontWeight: 700, color: cat.color }}>{dream.progress.toFixed(0)}%</span>
      </div>

      {/* Progress Bar */}
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ height: '100%', borderRadius: 3, width: `${dream.progress}%`, background: cat.color }} />
      </div>

      {/* AI Plan */}
      {!hasPlan ? (
        <button className="btn-primary" onClick={() => onPlan(dream)} disabled={planning} style={{ padding: '12px 20px' }}>
          {planning ? '✨ Building your plan...' : '🧠 Let AI Build Your Plan'}
        </button>
      ) : (
        <div style={{ background: '#8b5cf610', border: '1px solid #8b5cf630', borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>🧠 AI Plan</div>
          {planResult?.analysis && <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>{planResult.analysis}</p>}
          {planResult?.habit && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Daily Habit</div>
              <div style={{ fontSize: 13 }}>🔄 {planResult.habit.title}: {planResult.habit.description}</div>
            </div>
          )}
          {planResult?.metrics && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Track These</div>
              {planResult.metrics.map((m: string, i: number) => (
                <div key={i} style={{ fontSize: 13 }}>📊 {m}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Log Progress */}
      <div className="ai-add-section" style={{ padding: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>📈 Log Progress</div>
        <div className="ai-add-row">
          <input type="text" value={progressNote} onChange={e => setProgressNote(e.target.value)} placeholder="What did you do today?" className="ai-add-input" />
          <input type="number" value={progressPct} onChange={e => setProgressPct(e.target.value)} className="ai-add-input" style={{ width: 60 }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>%</span>
          <button className="btn-primary" onClick={onAddProgress} disabled={!progressNote.trim()}>Log</button>
        </div>
      </div>

      {/* Delete */}
      <button onClick={() => { onDelete(dream.id); onBack(); }}
        style={{ background: 'none', border: '1px solid #ef444440', color: '#ef4444', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, alignSelf: 'flex-start' }}>
        🗑️ Delete Dream
      </button>
    </div>
  );
}
