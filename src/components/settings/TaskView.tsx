// Conflux Home — Kanban Task Board
// Drag-and-drop task management across 4 status columns.

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTasks, type Task, type CreateTaskReq } from '../../hooks/useTasks';

const COLUMNS: { key: Task['status']; label: string; emoji: string }[] = [
  { key: 'pending', label: 'Pending', emoji: '📋' },
  { key: 'in_progress', label: 'In Progress', emoji: '🔨' },
  { key: 'review', label: 'Review', emoji: '🔍' },
  { key: 'done', label: 'Done', emoji: '✅' },
];

const PRIORITY_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  critical: { label: 'Critical', color: '#ff4444', emoji: '🔴' },
  high: { label: 'High', color: '#ffaa00', emoji: '🟡' },
  normal: { label: 'Normal', color: '#34c759', emoji: '🟢' },
  low: { label: 'Low', color: '#0071e3', emoji: '🔵' },
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface AgentInfo {
  id: string;
  name: string;
}

export default function TaskView() {
  const { grouped, loading, create, update } = useTasks();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<Task['status'] | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Quick-add form
  const [addTitle, setAddTitle] = useState('');
  const [addPriority, setAddPriority] = useState<string>('normal');
  const [addAgent, setAddAgent] = useState('');
  const [agents, setAgents] = useState<AgentInfo[]>([]);

  useEffect(() => {
    invoke<AgentInfo[]>('engine_get_agents')
      .then(setAgents)
      .catch((err) => console.error('[TaskView] Failed to load agents:', err));
  }, []);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedId(null);
    setDragOverCol(null);
    (e.currentTarget as HTMLElement).style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent, col: Task['status']) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(col);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: Task['status']) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!draggedId) return;

    try {
      await update({ id: draggedId, status: newStatus });
    } catch (err) {
      window.dispatchEvent(new CustomEvent('conflux:toast', {
        detail: { message: `Failed to move task: ${err}`, type: 'error' },
      }));
    }
    setDraggedId(null);
  };

  const handleAdd = async () => {
    if (!addTitle.trim()) return;
    try {
      await create({
        title: addTitle.trim(),
        agent_id: addAgent,
        priority: addPriority,
      });
      setAddTitle('');
      setAddPriority('normal');
      setShowAdd(false);
    } catch (err) {
      window.dispatchEvent(new CustomEvent('conflux:toast', {
        detail: { message: `Failed to create task: ${err}`, type: 'error' },
      }));
    }
  };

  if (loading) {
    return (
      <div className="settings-section">
        <div className="settings-section-title">📋 Tasks</div>
        <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="settings-section">
      <div className="settings-section-title">
        📋 Tasks
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            background: showAdd ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 13,
            cursor: 'pointer',
            color: showAdd ? '#000' : 'var(--text-muted)',
            fontWeight: 600,
          }}
        >
          +
        </button>
      </div>

      {/* Quick-Add Form */}
      {showAdd && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 14,
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'flex-end',
        }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Title
            </label>
            <input
              className="settings-input"
              value={addTitle}
              onChange={e => setAddTitle(e.target.value)}
              placeholder="Task title..."
              autoFocus
            />
          </div>

          <div style={{ flex: '0 0 auto' }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Priority
            </label>
            <div style={{ display: 'flex', gap: 4 }}>
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setAddPriority(key)}
                  style={{
                    background: addPriority === key ? `${cfg.color}22` : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${addPriority === key ? cfg.color : 'var(--border)'}`,
                    borderRadius: 6,
                    padding: '5px 8px',
                    fontSize: 11,
                    cursor: 'pointer',
                    color: addPriority === key ? cfg.color : 'var(--text-muted)',
                    fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                  title={cfg.label}
                >
                  {cfg.emoji}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: '0 0 140px' }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Agent
            </label>
            <select
              className="settings-input"
              value={addAgent}
              onChange={e => setAddAgent(e.target.value)}
            >
              <option value="">Any agent</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <button
            className="settings-button primary"
            onClick={handleAdd}
            disabled={!addTitle.trim()}
            style={{ flex: '0 0 auto' }}
          >
            ➕ Add
          </button>
        </div>
      )}

      {/* Kanban Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 10,
        minHeight: 200,
      }}>
        {COLUMNS.map((col) => {
          const items = grouped[col.key];
          const isOver = dragOverCol === col.key;

          return (
            <div
              key={col.key}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.key)}
              style={{
                background: isOver ? 'rgba(var(--accent-rgb, 0,113,227), 0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isOver ? 'var(--accent-primary)' : 'var(--border)'}`,
                borderRadius: 10,
                padding: 10,
                minHeight: 160,
                transition: 'all 0.15s',
              }}
            >
              {/* Column Header */}
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span>{col.emoji}</span>
                <span>{col.label}</span>
                <span style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  padding: '1px 7px',
                  fontSize: 10,
                  color: 'var(--text-muted)',
                }}>
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map((task) => {
                  const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.normal;
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '8px 10px',
                        cursor: 'grab',
                        transition: 'opacity 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                        {task.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: pri.color,
                          background: `${pri.color}15`,
                          borderRadius: 4,
                          padding: '1px 5px',
                        }}>
                          {pri.emoji} {pri.label}
                        </span>
                        {task.agent_id && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {task.agent_id}
                          </span>
                        )}
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {relativeTime(task.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
