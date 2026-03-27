// Conflux Home — Life Autopilot View (Orbit)
// Focus engine, morning brief, habits, smart reschedule, nudges, heatmap.

import { useState, useCallback } from 'react';
import { useOrbit } from '../hooks/useOrbit';
import type { LifeTask, LifeHabit, LifeNudge, LifeDailyFocus } from '../types';
import { MicButton } from './voice';

/* ── Config ──────────────────────────────────── */

const PRIORITY_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
  urgent: { emoji: '🔴', color: '#ef4444', label: 'Urgent' },
  high:   { emoji: '🟠', color: '#f97316', label: 'High' },
  medium: { emoji: '🟡', color: '#f59e0b', label: 'Medium' },
  normal: { emoji: '🟡', color: '#f59e0b', label: 'Normal' },
  low:    { emoji: '🟢', color: '#10b981', label: 'Low' },
};

const ENERGY_EMOJI: Record<string, string> = {
  high: '⚡', medium: '🔋', low: '🌙',
};

const CATEGORY_EMOJI: Record<string, string> = {
  health: '💪', work: '💼', personal: '🧑', family: '👨‍👩‍👧‍👦',
  finance: '💰', learning: '📚', creative: '🎨', home: '🏠',
};

const FREQUENCY_LABEL: Record<string, string> = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
};

/* ── Helpers ─────────────────────────────────── */

function daysUntil(date: string): number {
  return Math.ceil((new Date(date + 'T23:59:59').getTime() - Date.now()) / 86400000);
}

function dueLabel(date: string): string {
  const d = daysUntil(date);
  if (d < 0) return `${Math.abs(d)}d overdue`;
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d <= 7) return `${d}d`;
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function dueColor(date: string): string {
  const d = daysUntil(date);
  if (d < 0) return '#ef4444';
  if (d <= 1) return '#f97316';
  if (d <= 3) return '#f59e0b';
  return '#6b7280';
}

/* ── Heatmap ─────────────────────────────────── */

function HeatmapRow({ completedToday }: { completedToday: number }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { label: d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0), isToday: i === 6 };
  });
  return (
    <div className="orbit-heatmap">
      <div className="orbit-heatmap-label">Activity</div>
      <div className="orbit-heatmap-cells">
        {days.map((d, i) => (
          <div key={i} className={`orbit-heatmap-cell ${d.isToday ? 'today' : ''} ${d.isToday && completedToday > 0 ? 'active' : ''}`}
            title={d.isToday ? `${completedToday} completed today` : ''}>
            <span className="orbit-heatmap-day">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Nudge Card ──────────────────────────────── */

function NudgeCard({ nudge, onDismiss }: { nudge: LifeNudge; onDismiss: (id: string) => void }) {
  const icon: Record<string, string> = { overdue: '🚨', streak: '🔥', energy: '⚡', suggestion: '💡', celebrate: '🎉' };
  return (
    <div className="orbit-nudge-card">
      <span className="orbit-nudge-emoji">{icon[nudge.nudge_type] ?? '💬'}</span>
      <div className="orbit-nudge-body">
        <p className="orbit-nudge-message">{nudge.message}</p>
        {nudge.action_label && <span className="orbit-nudge-action">{nudge.action_label}</span>}
      </div>
      <button className="orbit-nudge-dismiss" onClick={() => onDismiss(nudge.id)}>✕</button>
    </div>
  );
}

/* ── Habit Card ──────────────────────────────── */

function HabitCard({ habit, onLog }: { habit: LifeHabit; onLog: (id: string) => void }) {
  const emoji = habit.category ? (CATEGORY_EMOJI[habit.category] ?? '📌') : '📌';
  return (
    <div className="orbit-habit-card">
      <div className="orbit-habit-header">
        <span className="orbit-habit-emoji">{emoji}</span>
        <div className="orbit-habit-info">
          <div className="orbit-habit-name">{habit.name}</div>
          <div className="orbit-habit-meta">
            <span>{FREQUENCY_LABEL[habit.frequency] ?? habit.frequency}</span>
            {habit.best_streak > 0 && <span className="orbit-habit-best">Best: {habit.best_streak}🔥</span>}
          </div>
        </div>
      </div>
      <div className="orbit-habit-streak">
        <span className="orbit-streak-count">{habit.streak}</span>
        <span className="orbit-streak-label">🔥 streak</span>
      </div>
      <button className="orbit-habit-log-btn" onClick={() => onLog(habit.id)}>✓ Log</button>
    </div>
  );
}

/* ── Focus Card ──────────────────────────────── */

function FocusCard({ focus, onComplete, onReschedule }: {
  focus: LifeDailyFocus; onComplete: (id: string) => void; onReschedule: (id: string) => void;
}) {
  const task = focus.task;
  if (!task) return null;
  const pri = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.normal;
  const energy = task.energy_type ? ENERGY_EMOJI[task.energy_type] : null;
  return (
    <div className="orbit-focus-card">
      <div className="orbit-focus-position">{focus.position + 1}</div>
      <div className="orbit-focus-body">
        <div className="orbit-focus-title">{task.title}</div>
        <div className="orbit-focus-meta">
          <span className="orbit-priority-badge" style={{ background: pri.color + '22', color: pri.color }}>
            {pri.emoji} {pri.label}
          </span>
          {energy && <span className="orbit-energy-badge">{energy} {task.energy_type}</span>}
          {task.category && <span className="orbit-category-badge">{CATEGORY_EMOJI[task.category] ?? '📌'} {task.category}</span>}
          {task.due_date && <span className="orbit-due-badge" style={{ color: dueColor(task.due_date) }}>📅 {dueLabel(task.due_date)}</span>}
        </div>
      </div>
      <div className="orbit-focus-actions">
        <button className="orbit-focus-complete" onClick={() => onComplete(task.id)}>✓</button>
        <button className="orbit-focus-reschedule" onClick={() => onReschedule(task.id)}>↻</button>
      </div>
    </div>
  );
}

/* ── Task Row ────────────────────────────────── */

function TaskRow({ task, onComplete, onDelete }: {
  task: LifeTask; onComplete: (id: string) => void; onDelete: (id: string) => void;
}) {
  const pri = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.normal;
  const energy = task.energy_type ? ENERGY_EMOJI[task.energy_type] : null;
  return (
    <div className="orbit-task-row">
      <button className="orbit-task-check" onClick={() => onComplete(task.id)}>
        <span className="orbit-task-check-circle" style={{ borderColor: pri.color }} />
      </button>
      <div className="orbit-task-body">
        <div className="orbit-task-title">{task.title}</div>
        <div className="orbit-task-meta">
          <span className="orbit-priority-dot" style={{ background: pri.color }} />
          <span>{pri.label}</span>
          {energy && <span>{energy}</span>}
          {task.category && <span>{CATEGORY_EMOJI[task.category] ?? '📌'} {task.category}</span>}
          {task.due_date && <span style={{ color: dueColor(task.due_date) }}>📅 {dueLabel(task.due_date)}</span>}
        </div>
      </div>
      <button className="orbit-task-delete" onClick={() => onDelete(task.id)}>✕</button>
    </div>
  );
}

/* ── Main View ───────────────────────────────── */

export default function LifeAutopilotView() {
  const {
    dashboard, loading, addTask, completeTask, deleteTask,
    addHabit, logHabit, addFocus, morningBrief, smartReschedule,
    parseInput, dismissNudge,
  } = useOrbit();

  /* Morning brief */
  const [briefText, setBriefText] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);

  /* Natural language input */
  const [nlInput, setNlInput] = useState('');
  const [nlParsing, setNlParsing] = useState(false);

  /* Add task form */
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState('');
  const [taskPriority, setTaskPriority] = useState('normal');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskEnergy, setTaskEnergy] = useState('');

  /* Add habit form */
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [habitName, setHabitName] = useState('');
  const [habitCategory, setHabitCategory] = useState('');
  const [habitFrequency, setHabitFrequency] = useState('daily');
  const [habitTarget, setHabitTarget] = useState(1);

  /* Reschedule toast */
  const [rescheduleResult, setRescheduleResult] = useState<string | null>(null);

  const handleMorningBrief = useCallback(async () => {
    if (briefLoading) return;
    setBriefLoading(true); setBriefText('');
    try { setBriefText(await morningBrief()); }
    catch { setBriefText('Failed to generate brief. Try again.'); }
    finally { setBriefLoading(false); }
  }, [briefLoading, morningBrief]);

  const handleParseInput = useCallback(async () => {
    if (!nlInput.trim() || nlParsing) return;
    setNlParsing(true);
    try {
      const result = await parseInput(nlInput.trim());
      if (result.parsed && result.action === 'add_task') { await addTask(result.title); setNlInput(''); }
    } catch { await addTask(nlInput.trim()); setNlInput(''); }
    finally { setNlParsing(false); }
  }, [nlInput, nlParsing, parseInput, addTask]);

  const handleAddTask = useCallback(async () => {
    if (!taskTitle.trim()) return;
    await addTask(taskTitle.trim(), taskCategory || undefined, taskPriority, taskDueDate || undefined, taskEnergy || undefined);
    setTaskTitle(''); setTaskCategory(''); setTaskPriority('normal'); setTaskDueDate(''); setTaskEnergy(''); setShowTaskForm(false);
  }, [taskTitle, taskCategory, taskPriority, taskDueDate, taskEnergy, addTask]);

  const handleAddHabit = useCallback(async () => {
    if (!habitName.trim()) return;
    await addHabit(habitName.trim(), habitCategory || undefined, habitFrequency, habitTarget);
    setHabitName(''); setHabitCategory(''); setHabitFrequency('daily'); setHabitTarget(1); setShowHabitForm(false);
  }, [habitName, habitCategory, habitFrequency, habitTarget, addHabit]);

  const handleReschedule = useCallback(async (taskId: string) => {
    try {
      const s = await smartReschedule(taskId);
      setRescheduleResult(s.suggested_time ? `Suggested: ${s.suggested_time}${s.reason ? ` — ${s.reason}` : ''}` : 'No better time found.');
    } catch { setRescheduleResult('Reschedule failed.'); }
    setTimeout(() => setRescheduleResult(null), 5000);
  }, [smartReschedule]);

  /* Derived data */
  const focus = dashboard?.today_focus ?? [];
  const tasks = dashboard?.pending_tasks ?? [];
  const habits = dashboard?.active_habits ?? [];
  const nudges = dashboard?.nudges ?? [];
  const streakTotal = dashboard?.streak_total ?? 0;
  const completedToday = dashboard?.completed_today ?? 0;

  if (loading && !dashboard) return <div className="orbit-view"><div className="orbit-loading">Loading your orbit...</div></div>;

  return (
    <div className="orbit-view">

      {/* Header */}
      <div className="orbit-header">
        <div className="orbit-header-left">
          <h2 className="orbit-title">🌀 Life Orbit</h2>
          <div className="orbit-header-stats">
            <span className="orbit-stat">✅ {completedToday} today</span>
            <span className="orbit-stat">🔥 {streakTotal} streak</span>
            <span className="orbit-stat">📋 {tasks.length} tasks</span>
          </div>
        </div>
      </div>

      {/* Morning Brief */}
      <div className="orbit-brief-section">
        <button className="orbit-brief-btn" onClick={handleMorningBrief} disabled={briefLoading}>
          {briefLoading ? '✨ Generating...' : '☀️ Morning Brief'}
        </button>
        {briefText && <div className="orbit-brief-card"><p className="orbit-brief-text">{briefText}</p></div>}
      </div>

      {/* Natural Language Input */}
      <div className="orbit-nl-section">
        <div className="orbit-nl-row">
          <div className="input-with-mic">
            <input type="text" className="orbit-nl-input" value={nlInput}
              onChange={e => setNlInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleParseInput()}
              placeholder='Quick add — e.g. "finish report by Friday" or "buy groceries"' />
            <MicButton
              onTranscription={(text) => setNlInput(text)}
              variant="inline"
              size="sm"
              className="mic-button-inline"
            />
          </div>
          <button className="orbit-nl-btn" onClick={handleParseInput} disabled={nlParsing || !nlInput.trim()}>
            {nlParsing ? '...' : '→'}
          </button>
        </div>
      </div>

      {/* Reschedule Toast */}
      {rescheduleResult && <div className="orbit-toast">{rescheduleResult}</div>}

      {/* Nudges */}
      {nudges.filter(n => !n.dismissed).length > 0 && (
        <div className="orbit-nudges-section">
          {nudges.filter(n => !n.dismissed).map(n => <NudgeCard key={n.id} nudge={n} onDismiss={dismissNudge} />)}
        </div>
      )}

      {/* Today's Focus */}
      <div className="orbit-section">
        <h3 className="orbit-section-title">🎯 Today's Focus</h3>
        {focus.length === 0
          ? <p className="orbit-empty">No focus items yet. Add tasks and set your daily focus.</p>
          : <div className="orbit-focus-list">{focus.map(f => <FocusCard key={f.id} focus={f} onComplete={completeTask} onReschedule={handleReschedule} />)}</div>
        }
      </div>

      {/* Pending Tasks */}
      <div className="orbit-section">
        <div className="orbit-section-header">
          <h3 className="orbit-section-title">📋 Pending Tasks</h3>
          <button className="orbit-add-btn" onClick={() => setShowTaskForm(!showTaskForm)}>{showTaskForm ? '✕' : '+ Add'}</button>
        </div>
        {showTaskForm && (
          <div className="orbit-form">
            <input type="text" className="orbit-form-input" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Task title" autoFocus />
            <div className="orbit-form-row">
              <select className="orbit-form-select" value={taskCategory} onChange={e => setTaskCategory(e.target.value)}>
                <option value="">Category</option>
                <option value="health">💪 Health</option><option value="work">💼 Work</option>
                <option value="personal">🧑 Personal</option><option value="family">👨‍👩‍👧‍👦 Family</option>
                <option value="finance">💰 Finance</option><option value="learning">📚 Learning</option>
                <option value="creative">🎨 Creative</option><option value="home">🏠 Home</option>
              </select>
              <select className="orbit-form-select" value={taskPriority} onChange={e => setTaskPriority(e.target.value)}>
                <option value="urgent">🔴 Urgent</option><option value="high">🟠 High</option>
                <option value="normal">🟡 Normal</option><option value="low">🟢 Low</option>
              </select>
              <input type="date" className="orbit-form-input orbit-form-date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} />
              <select className="orbit-form-select" value={taskEnergy} onChange={e => setTaskEnergy(e.target.value)}>
                <option value="">Energy</option><option value="high">⚡ High</option>
                <option value="medium">🔋 Medium</option><option value="low">🌙 Low</option>
              </select>
              <button className="orbit-form-submit" onClick={handleAddTask} disabled={!taskTitle.trim()}>Add</button>
            </div>
          </div>
        )}
        {tasks.length === 0
          ? <p className="orbit-empty">All caught up! No pending tasks.</p>
          : <div className="orbit-task-list">{tasks.map(t => <TaskRow key={t.id} task={t} onComplete={completeTask} onDelete={deleteTask} />)}</div>
        }
      </div>

      {/* Habits */}
      <div className="orbit-section">
        <div className="orbit-section-header">
          <h3 className="orbit-section-title">🔄 Habits</h3>
          <button className="orbit-add-btn" onClick={() => setShowHabitForm(!showHabitForm)}>{showHabitForm ? '✕' : '+ Add'}</button>
        </div>
        {showHabitForm && (
          <div className="orbit-form">
            <input type="text" className="orbit-form-input" value={habitName} onChange={e => setHabitName(e.target.value)} placeholder="Habit name" autoFocus />
            <div className="orbit-form-row">
              <select className="orbit-form-select" value={habitCategory} onChange={e => setHabitCategory(e.target.value)}>
                <option value="">Category</option><option value="health">💪 Health</option>
                <option value="work">💼 Work</option><option value="personal">🧑 Personal</option>
                <option value="learning">📚 Learning</option><option value="creative">🎨 Creative</option>
              </select>
              <select className="orbit-form-select" value={habitFrequency} onChange={e => setHabitFrequency(e.target.value)}>
                <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
              </select>
              <input type="number" className="orbit-form-input orbit-form-num" value={habitTarget}
                onChange={e => setHabitTarget(Number(e.target.value) || 1)} min={1} max={100} placeholder="Target" />
              <button className="orbit-form-submit" onClick={handleAddHabit} disabled={!habitName.trim()}>Add</button>
            </div>
          </div>
        )}
        {habits.length === 0
          ? <p className="orbit-empty">No habits tracked yet. Start building streaks!</p>
          : <div className="orbit-habit-grid">{habits.map(h => <HabitCard key={h.id} habit={h} onLog={logHabit} />)}</div>
        }
      </div>

      {/* Activity Heatmap */}
      <div className="orbit-section">
        <h3 className="orbit-section-title">📊 Activity</h3>
        <HeatmapRow completedToday={completedToday} />
      </div>

    </div>
  );
}
