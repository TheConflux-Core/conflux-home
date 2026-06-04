// Conflux Home — Life Autopilot View (Orbit)
// Simplified: Mission Manifest (tasks) + Agent Activity Feed.
// Agents create tasks → users see them here. That's the loop.

import { useState, useCallback, useEffect } from 'react';
import { useOrbit } from '../hooks/useOrbit';
import type { LifeTask } from '../types';
import { MicButton } from './voice';
import { MissionControlHeader } from './MissionControlHeader';
import OrbitBoot from './OrbitBoot';
import OrbitOnboarding, { hasCompletedOrbitOnboarding } from './OrbitOnboarding';
import { MissionManifest } from './MissionManifest';
import AgentActivityFeed from './AgentActivityFeed';
import { AgentBoard } from './AgentBoard';

/* ── Main View ───────────────────────────────── */

export default function LifeAutopilotView() {
  const {
    dashboard, loading, addTask, completeTask, deleteTask,
    parseInput,
  } = useOrbit();

  /* Boot → Onboarding state */
  const [bootDone, setBootDone] = useState(() => localStorage.getItem('orbit-boot-done') === 'true');
  const hasOnboarded = hasCompletedOrbitOnboarding();
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  /* Tab state */
  const [activeTab, setActiveTab] = useState<'manifest' | 'agentboard'>('manifest');

  /* Natural language input */
  const [nlInput, setNlInput] = useState('');
  const [nlParsing, setNlParsing] = useState(false);
  const [parseFeedback, setParseFeedback] = useState<string | null>(null);

  const handleParseInput = useCallback(async (input: string) => {
    if (!input.trim() || nlParsing) return;
    setNlParsing(true);
    try {
      const result = await parseInput(input);
      if (result.action === 'habit') {
        setParseFeedback('✓ Added habit');
      } else {
        await addTask(
          result.title || input,
          result.category,
          result.priority,
          result.due_date,
          result.energy_type,
        );
        const extras: string[] = [];
        if (result.due_date) extras.push(`📅 ${result.due_date}`);
        if (result.priority) extras.push(`${result.priority} priority`);
        if (result.category) extras.push(`${result.category}`);
        const extraStr = extras.length > 0 ? ` (${extras.join(', ')})` : '';
        setParseFeedback(`✓ Added${extraStr}`);
      }
      setTimeout(() => setParseFeedback(null), 2000);
    } catch {
      await addTask(input);
    } finally {
      setNlInput('');
      setNlParsing(false);
    }
  }, [nlParsing, parseInput, addTask]);

  const handleAddTask = useCallback(async (title: string, category?: string, priority?: string, dueDate?: string, energyType?: string) => {
    await addTask(title, category, priority, dueDate, energyType);
  }, [addTask]);

  /* Derived data */
  const tasks = dashboard?.pending_tasks ?? [];
  const completedTasks = dashboard?.completed_tasks ?? [];
  const streakTotal = dashboard?.streak_total ?? 0;
  const completedToday = dashboard?.completed_today ?? 0;
  const pendingToday = tasks.filter(t => {
    if (!t.due_date) return false;
    const today = new Date().toISOString().split('T')[0];
    return t.due_date === today;
  }).length;
  const totalTasksToday = completedToday + pendingToday;
  const trendPct = totalTasksToday > 0
    ? ((completedToday / totalTasksToday) * 100) - 60
    : 0;
  const safeTrendPct = trendPct ?? 0;

  if (loading && !dashboard) {
    return (
      <div className="mission-control-view" style={{ paddingTop: '50px', paddingBottom: '150px', paddingLeft: '121px', paddingRight: '121px' }}>
        <div className="mc-loading">Loading your orbit...</div>
      </div>
    );
  }

  return (
    <>
      {/* ── Boot Sequence ── */}
      {!bootDone && (
        <OrbitBoot
          onComplete={() => {
            localStorage.setItem('orbit-boot-done', 'true');
            setBootDone(true);
          }}
        />
      )}

      {/* ── Onboarding Briefing ── */}
      {bootDone && !hasOnboarded && !onboardingComplete && (
        <OrbitOnboarding
          onComplete={() => setOnboardingComplete(true)}
        />
      )}

      <div className="mission-control-view" style={{ paddingTop: '50px', paddingBottom: '150px', paddingLeft: '121px', paddingRight: '121px' }}>
        {/* Header with Momentum Gauge */}
        <MissionControlHeader
          completedToday={completedToday}
          totalTasksToday={totalTasksToday}
          streakTotal={streakTotal}
          taskCount={tasks.length}
          trendPct={safeTrendPct}
        />

        {/* Natural Language Input */}
        <div className="mc-nl-section">
          <div className="mc-nl-row">
            <div className="input-with-mic">
              <input
                type="text"
                className="mc-nl-input"
                value={nlInput}
                onChange={e => setNlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleParseInput(nlInput.trim())}
                placeholder='Quick add — e.g. "finish report by Friday" or "buy groceries"'
              />
              <MicButton
                onTranscription={(text) => setNlInput(text)}
                variant="inline"
                size="sm"
                className="mic-button-inline"
              />
            </div>
            <button
              className="mc-nl-btn"
              onClick={() => handleParseInput(nlInput.trim())}
              disabled={nlParsing || !nlInput.trim()}
            >
              {nlParsing ? '...' : '→'}
            </button>
          </div>
        </div>

        {/* Parse Feedback Toast */}
        {parseFeedback && <div className="orbit-toast" style={{ color: '#10b981' }}>{parseFeedback}</div>}

        {/* Tab Switcher — Mission Manifest vs Agent Board */}
        <div style={{
          display: 'flex', gap: '4px', marginBottom: '16px',
          background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
          padding: '3px', width: 'fit-content',
        }}>
          <button
            onClick={() => setActiveTab('manifest')}
            style={{
              padding: '6px 16px', fontSize: '12px', fontWeight: 600,
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              background: activeTab === 'manifest' ? 'rgba(139,92,246,0.2)' : 'transparent',
              color: activeTab === 'manifest' ? '#c4b5fd' : '#6b7280',
              transition: 'all 0.15s',
            }}
          >
            🎯 My Tasks
          </button>
          <button
            onClick={() => setActiveTab('agentboard')}
            style={{
              padding: '6px 16px', fontSize: '12px', fontWeight: 600,
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              background: activeTab === 'agentboard' ? 'rgba(139,92,246,0.2)' : 'transparent',
              color: activeTab === 'agentboard' ? '#c4b5fd' : '#6b7280',
              transition: 'all 0.15s',
            }}
          >
            🤖 Agent Board
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'manifest' ? (
          <>
            <MissionManifest
              tasks={tasks}
              completedTasks={completedTasks}
              onComplete={completeTask}
              onDelete={deleteTask}
              onAddTask={handleAddTask}
            />
          </>
        ) : (
          <AgentBoard />
        )}

        {/* Agent Activity Feed — What your agents have been doing */}
        <AgentActivityFeed />
      </div>
    </>
  );
}
