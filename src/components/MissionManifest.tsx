// Conflux Home — Mission Manifest (Orbit)
// Consolidated task list: Today's Focus + pending tasks in one place.
// Agents create tasks → they appear here. Users check them off.

import { useState } from 'react';
import type { LifeTask } from '../types';
import { playOrbitTaskComplete } from '../lib/sound';

interface MissionManifestProps {
  tasks: LifeTask[];
  completedTasks: LifeTask[];
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onAddTask: (title: string, category?: string, priority?: string, dueDate?: string, energyType?: string) => Promise<void>;
}

const PRIORITY_CONFIG: Record<string, { emoji: string; color: string }> = {
  urgent: { emoji: '🔴', color: '#ef4444' },
  high:   { emoji: '🟠', color: '#f97316' },
  medium: { emoji: '🟡', color: '#f59e0b' },
  normal: { emoji: '🟡', color: '#f59e0b' },
  low:    { emoji: '🟢', color: '#10b981' },
};

const CATEGORY_EMOJI: Record<string, string> = {
  health: '💪', work: '💼', personal: '🧑', family: '👨‍👩‍👧‍👦',
  finance: '💰', learning: '📚', creative: '🎨', home: '🏠',
};

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

// ── Single Task Row ──────────────────────────────────────────────────

function TaskRow({ task, onComplete, onDelete }: {
  task: LifeTask;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const pri = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.normal;
  const [completed, setCompleted] = useState(false);

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCompleted(true);
    playOrbitTaskComplete();
    setTimeout(() => onComplete(task.id), 200);
  };

  return (
    <div className={`mc-task-row ${completed ? 'completed' : ''}`}>
      <div className={`mc-task-check ${completed ? 'completed' : ''}`} onClick={handleComplete}>
        {completed && <span style={{ color: '#0b0f14', fontSize: '12px' }}>✓</span>}
      </div>
      <div className="mc-task-title">{task.title}</div>
      {task.category && (
        <span className="mc-task-category" style={{ fontSize: '11px', color: '#94a3b8', marginRight: '6px' }}>
          {CATEGORY_EMOJI[task.category] ?? '📌'}
        </span>
      )}
      <div className={`mc-task-priority ${task.priority}`} style={{ background: pri.color }} />
      {task.due_date && (
        <span
          className={`mc-task-due ${daysUntil(task.due_date) < 0 ? 'overdue' : daysUntil(task.due_date) === 0 ? 'today' : ''}`}
          style={{ color: dueColor(task.due_date) }}
        >
          {dueLabel(task.due_date)}
        </span>
      )}
      <button
        className="mc-task-delete orbit-task-delete"
        onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
        title="Delete task"
      >
        🗑️
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────

export function MissionManifest({ tasks, completedTasks, onComplete, onDelete, onAddTask }: MissionManifestProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('normal');
  const [dueDate, setDueDate] = useState('');

  const handleAdd = async () => {
    if (!title.trim()) return;
    await onAddTask(title.trim(), category || undefined, priority, dueDate || undefined);
    setTitle(''); setCategory(''); setPriority('normal'); setDueDate('');
    setShowForm(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(); }
    if (e.key === 'Escape') { setShowForm(false); }
  };

  // Sort: overdue first, then by due date, then by priority
  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, normal: 3, low: 4 };
  const sorted = [...tasks].sort((a, b) => {
    const aDays = a.due_date ? daysUntil(a.due_date) : 999;
    const bDays = b.due_date ? daysUntil(b.due_date) : 999;
    if (aDays !== bDays) return aDays - bDays;
    return (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
  });

  return (
    <div className="mc-panel" style={{ marginBottom: '20px' }}>
      <div className="mc-panel-header">
        <h3 className="mc-panel-title">🎯 Mission Manifest</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="mc-panel-count">{tasks.length} pending</span>
          <button
            className="mc-btn-secondary"
            onClick={() => setShowForm(!showForm)}
            style={{ padding: '4px 12px', fontSize: '11px' }}
          >
            {showForm ? '✕' : '+ Add'}
          </button>
        </div>
      </div>

      {/* Inline add form */}
      {showForm && (
        <div className="orbit-add-form">
          <input
            type="text"
            className="mc-nl-input orbit-form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What needs to be done?"
          />
          <div className="orbit-form-row">
            <select
              className="mc-btn-secondary orbit-form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Category</option>
              <option value="health">💪 Health</option>
              <option value="work">💼 Work</option>
              <option value="personal">🧑 Personal</option>
              <option value="family">👨‍👩‍👧‍👦 Family</option>
              <option value="finance">💰 Finance</option>
              <option value="learning">📚 Learning</option>
              <option value="creative">🎨 Creative</option>
              <option value="home">🏠 Home</option>
            </select>
            <select
              className="mc-btn-secondary orbit-form-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="urgent">🔴 Urgent</option>
              <option value="high">🟠 High</option>
              <option value="normal">🟡 Normal</option>
              <option value="low">🟢 Low</option>
            </select>
            <input
              type="date"
              className="mc-btn-secondary orbit-form-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <button
              className="mc-btn-primary orbit-form-submit"
              onClick={handleAdd}
              disabled={!title.trim()}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Task list */}
      {sorted.length === 0 && completedTasks.length === 0 ? (
        <div className="mc-empty orbit-empty-state">
          <div className="orbit-empty-icon">✨</div>
          <div>All clear. Your agents will add tasks here as they work.</div>
        </div>
      ) : sorted.length === 0 ? (
        <div className="mc-empty">
          All tasks complete for today! 🎉
        </div>
      ) : (
        <div className="orbit-task-list">
          {sorted.map(task => (
            <TaskRow key={task.id} task={task} onComplete={onComplete} onDelete={onDelete} />
          ))}
        </div>
      )}

      {/* Completed today */}
      {completedTasks.length > 0 && (
        <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>
            ✅ Completed today ({completedTasks.length})
          </div>
          {completedTasks.map(task => (
            <div key={task.id} className="mc-task-row completed" style={{ opacity: 0.5 }}>
              <div className="mc-task-check completed"><span style={{ color: '#0b0f14', fontSize: '12px' }}>✓</span></div>
              <div className="mc-task-title" style={{ textDecoration: 'line-through' }}>{task.title}</div>
              {task.completed_at && (
                <span className="mc-task-due" style={{ fontSize: '10px', marginLeft: 'auto' }}>
                  {new Date(task.completed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
