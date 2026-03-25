// Conflux Home — Dream Builder View (Horizon)
// Mountain-inspired design with velocity, AI narratives, milestone paths

import { useState, useCallback, useEffect } from 'react';
import { useDreams } from '../hooks/useDreams';
import { HorizonHero, HorizonGoalCard, HorizonMilestonePath, HorizonInsightCard, HorizonVelocity } from './horizon';
import type { Dream, DreamVelocity, DreamMilestone, DreamTask, DreamProgress } from '../types';

const CATEGORY_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
  housing:      { emoji: '🏠', color: '#3b82f6', label: 'Housing' },
  education:    { emoji: '🎓', color: '#8b5cf6', label: 'Education' },
  health:       { emoji: '💪', color: '#10b981', label: 'Health' },
  career:       { emoji: '💼', color: '#f59e0b', label: 'Career' },
  travel:       { emoji: '✈️', color: '#06b6d4', label: 'Travel' },
  family:       { emoji: '👨‍👩‍👧‍👦', color: '#ec4899', label: 'Family' },
  personal:     { emoji: '🌟', color: '#f97316', label: 'Personal' },
  financial:    { emoji: '💰', color: '#14b8a6', label: 'Financial' },
  creative:     { emoji: '🎨', color: '#a855f7', label: 'Creative' },
};

export default function DreamBuilderView() {
  const {
    dashboard, loading, load,
    addDream, deleteDream,
    completeMilestone, completeTask,
    addProgress, addMilestone, addTask,
    getVelocity, updateProgressManual, narrate,
  } = useDreams();

  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [selectedVelocity, setSelectedVelocity] = useState<DreamVelocity | null>(null);
  const [selectedMilestones, setSelectedMilestones] = useState<DreamMilestone[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<DreamTask[]>([]);
  const [selectedProgress, setSelectedProgress] = useState<DreamProgress[]>([]);
  const [velocities, setVelocities] = useState<Record<string, DreamVelocity>>({});
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('personal');
  const [newDesc, setNewDesc] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [narrating, setNarrating] = useState(false);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [progressNote, setProgressNote] = useState('');
  const [progressPct, setProgressPct] = useState('5');

  // Load velocities for all dreams when dashboard changes
  useEffect(() => {
    if (!dashboard?.dreams) return;
    dashboard.dreams.forEach(async (dream) => {
      try {
        const v = await getVelocity(dream.id);
        setVelocities(prev => ({ ...prev, [dream.id]: v }));
      } catch { /* velocity may not be available yet */ }
    });
  }, [dashboard, getVelocity]);

  // Load detail when selecting a dream
  useEffect(() => {
    if (!selectedDream || !dashboard) return;
    setSelectedVelocity(velocities[selectedDream.id] ?? null);
    setSelectedMilestones(dashboard.dreams.find(d => d.id === selectedDream.id)
      ? [] // milestones come from separate invoke in real app
      : []);
    setSelectedTasks(dashboard.upcoming_tasks.filter(t => t.dream_id === selectedDream.id));
    setSelectedProgress(dashboard.recent_progress.filter(p => p.dream_id === selectedDream.id));
    setNarrative(null);
  }, [selectedDream, dashboard, velocities]);

  const handleCreate = useCallback(async () => {
    if (!newTitle.trim()) return;
    await addDream(crypto.randomUUID(), newTitle, newDesc || null, newCategory, newTarget || null);
    setNewTitle(''); setNewDesc(''); setNewTarget('');
    setShowNewForm(false);
  }, [newTitle, newCategory, newDesc, newTarget, addDream]);

  const handleNarrate = useCallback(async () => {
    if (!selectedDream) return;
    setNarrating(true);
    try {
      const result = await narrate(selectedDream.id);
      setNarrative(result);
    } catch (e) {
      console.error('Narrate failed:', e);
    } finally {
      setNarrating(false);
    }
  }, [selectedDream, narrate]);

  const handleCompleteMilestone = useCallback(async (id: string) => {
    await completeMilestone(id);
  }, [completeMilestone]);

  const handleCompleteTask = useCallback(async (id: string) => {
    await completeTask(id);
  }, [completeTask]);

  const handleAddProgress = useCallback(async () => {
    if (!selectedDream || !progressNote.trim()) return;
    await addProgress(selectedDream.id, progressNote, parseFloat(progressPct) || 0, null);
    setProgressNote('');
  }, [selectedDream, progressNote, progressPct, addProgress]);

  if (loading) return (
    <div className="horizon-view">
      <div className="horizon-loading">
        <div className="horizon-loading-icon">🏔️</div>
        <p className="horizon-loading-text">Charting your horizons...</p>
      </div>
    </div>
  );

  const activeDreams = dashboard?.dreams.filter(d => d.status === 'active') ?? [];

  return (
    <div className="horizon-view">
      {selectedDream ? (
        /* ── Selected Dream Detail View ── */
        <div className="horizon-detail">
          <button className="horizon-back-btn" onClick={() => setSelectedDream(null)}>
            ← Back to Dreams
          </button>

          {/* Mountain Hero */}
          <HorizonHero
            title={selectedDream.title}
            velocity={selectedVelocity}
          />

          {/* Velocity Stats */}
          {selectedVelocity && (
            <HorizonVelocity velocity={selectedVelocity} />
          )}

          {/* Milestones Path */}
          {selectedMilestones.length > 0 && (
            <div className="horizon-section">
              <h3 className="horizon-section-title">🏔️ Milestones</h3>
              <HorizonMilestonePath milestones={selectedMilestones} onComplete={handleCompleteMilestone} />
            </div>
          )}

          {/* Tasks */}
          {selectedTasks.length > 0 && (
            <div className="horizon-section">
              <h3 className="horizon-section-title">📋 Tasks</h3>
              <div className="horizon-task-list">
                {selectedTasks.map(t => (
                  <div key={t.id} className={`horizon-task ${t.is_completed ? 'completed' : ''}`}>
                    <button
                      className="horizon-task-check"
                      onClick={() => handleCompleteTask(t.id)}
                    >
                      {t.is_completed ? '☑' : '☐'}
                    </button>
                    <div className="horizon-task-content">
                      <span className="horizon-task-title">{t.title}</span>
                      {t.due_date && <span className="horizon-task-date">{t.due_date}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Narrate */}
          <div className="horizon-section">
            <button
              className="horizon-narrate-btn"
              onClick={handleNarrate}
              disabled={narrating}
            >
              {narrating ? '✨ Crafting your story...' : '📖 AI Narrative'}
            </button>
            {narrative && (
              <div className="horizon-narrative">
                <p className="horizon-narrative-text">{narrative}</p>
              </div>
            )}
          </div>

          {/* AI Insights */}
          {selectedProgress.filter(p => p.ai_insight).length > 0 && (
            <div className="horizon-section">
              <h3 className="horizon-section-title">💡 Insights</h3>
              {selectedProgress.filter(p => p.ai_insight).map(p => (
                <HorizonInsightCard
                  key={p.id}
                  text={p.ai_insight!}
                  date={new Date(p.created_at).toLocaleDateString()}
                />
              ))}
            </div>
          )}

          {/* Log Progress */}
          <div className="horizon-section">
            <h3 className="horizon-section-title">📈 Log Progress</h3>
            <div className="horizon-progress-form">
              <input
                type="text"
                value={progressNote}
                onChange={e => setProgressNote(e.target.value)}
                placeholder="What did you do today?"
                className="horizon-input"
              />
              <div className="horizon-progress-row">
                <input
                  type="number"
                  value={progressPct}
                  onChange={e => setProgressPct(e.target.value)}
                  className="horizon-input horizon-input-sm"
                  min="0"
                  max="100"
                />
                <span className="horizon-pct-label">%</span>
                <button
                  className="horizon-btn"
                  onClick={handleAddProgress}
                  disabled={!progressNote.trim()}
                >
                  Log
                </button>
              </div>
            </div>
          </div>

          {/* Delete */}
          <button
            className="horizon-delete-btn"
            onClick={() => { deleteDream(selectedDream.id); setSelectedDream(null); }}
          >
            🗑️ Delete Dream
          </button>
        </div>
      ) : (
        /* ── Dream List View ── */
        <div className="horizon-list">
          <div className="horizon-header">
            <h2 className="horizon-title">🏔️ Dreams</h2>
            <button className="horizon-btn" onClick={() => setShowNewForm(!showNewForm)}>
              {showNewForm ? 'Cancel' : '+ New Dream'}
            </button>
          </div>

          {/* Stats Bar */}
          <div className="horizon-stats-bar">
            <div className="horizon-stat-card">
              <span className="horizon-stat-emoji">🎯</span>
              <span className="horizon-stat-value">{dashboard?.active_dreams ?? 0}</span>
              <span className="horizon-stat-label">Active Dreams</span>
            </div>
            <div className="horizon-stat-card">
              <span className="horizon-stat-emoji">🏆</span>
              <span className="horizon-stat-value">{dashboard?.completed_milestones ?? 0}/{dashboard?.total_milestones ?? 0}</span>
              <span className="horizon-stat-label">Milestones</span>
            </div>
            <div className="horizon-stat-card">
              <span className="horizon-stat-emoji">📋</span>
              <span className="horizon-stat-value">{dashboard?.upcoming_tasks.length ?? 0}</span>
              <span className="horizon-stat-label">Upcoming</span>
            </div>
          </div>

          {/* New Dream Form */}
          {showNewForm && (
            <div className="horizon-new-form">
              <div className="horizon-form-header">
                <span>✨</span>
                <span>New Dream</span>
              </div>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="What's your dream?"
                className="horizon-input"
              />
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Describe it..."
                className="horizon-textarea"
                rows={2}
              />
              <div className="horizon-form-row">
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="horizon-select">
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.emoji} {v.label}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={newTarget}
                  onChange={e => setNewTarget(e.target.value)}
                  className="horizon-input horizon-input-date"
                />
                <button
                  className="horizon-btn"
                  onClick={handleCreate}
                  disabled={!newTitle.trim()}
                >
                  Create
                </button>
              </div>
            </div>
          )}

          {/* Dream Cards */}
          <div className="horizon-dream-grid">
            {activeDreams.length === 0 ? (
              <div className="horizon-empty">
                <div className="horizon-empty-icon">🏔️</div>
                <p className="horizon-empty-text">No dreams yet. What mountain do you want to climb?</p>
              </div>
            ) : (
              activeDreams.map(dream => {
                const vel = velocities[dream.id] ?? {
                  dream_id: dream.id,
                  milestones_completed: 0,
                  milestones_total: 0,
                  tasks_completed: 0,
                  tasks_total: 0,
                  progress_pct: dream.progress,
                  pace: 'on_track',
                  days_remaining: null,
                  estimated_completion: null,
                };
                return (
                  <HorizonGoalCard
                    key={dream.id}
                    dream={dream}
                    velocity={vel}
                    onSelect={(id) => setSelectedDream(activeDreams.find(d => d.id === id) ?? null)}
                  />
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
