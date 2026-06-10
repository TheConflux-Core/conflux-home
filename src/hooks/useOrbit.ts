import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { OrbitDashboard, LifeSchedule } from '../types';
import { useAuthContext } from '../contexts/AuthContext';

export function useOrbit() {
  const { user } = useAuthContext();
  const userId = user?.id || '';
  const [dashboard, setDashboard] = useState<OrbitDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[useOrbit] userId:', userId || '(EMPTY — user not authenticated)');
  }, [userId]);

  const loadDashboard = useCallback(async () => {
    if (!userId) {
      console.warn('[useOrbit] loadDashboard skipped — no userId');
      return;
    }
    try {
      setLoading(true);
      const d = await invoke<OrbitDashboard>('life_get_orbit_dashboard', { userId });
      console.log('[useOrbit] dashboard loaded:', { pending: d.pending_tasks?.length ?? 0, completed: d.completed_today ?? 0 });
      setDashboard(d);
    } catch (e) {
      console.error('[useOrbit] loadDashboard FAILED:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const addTask = useCallback(
    async (title: string, category?: string, priority?: string, dueDate?: string, energyType?: string) => {
      try {
        await invoke('life_add_task', {
          userId,
          title,
          category: category ?? null,
          priority: priority ?? null,
          dueDate: dueDate ?? null,
          energyType: energyType ?? null,
        });
      } catch (e) {
        console.error('[useOrbit] addTask FAILED:', e);
        throw e;
      }
      await loadDashboard();
    },
    [userId, loadDashboard]
  );

  const completeTask = useCallback(
    async (taskId: string) => {
      await invoke('life_complete_task', { userId, taskId });
      await loadDashboard();
    },
    [userId, loadDashboard]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      await invoke('life_delete_task', { userId, taskId });
      await loadDashboard();
    },
    [userId, loadDashboard]
  );

  const addHabit = useCallback(
    async (name: string, category?: string, frequency?: string, targetCount?: number) => {
      await invoke('life_add_habit', {
        userId,
        name,
        category: category ?? null,
        frequency: frequency ?? null,
        targetCount: targetCount ?? null,
      });
      await loadDashboard();
    },
    [userId, loadDashboard]
  );

  const logHabit = useCallback(
    async (habitId: string) => {
      await invoke('life_log_habit', { userId, habitId });
      await loadDashboard();
    },
    [userId, loadDashboard]
  );

  const addFocus = useCallback(
    async (taskId: string, position?: number) => {
      await invoke('life_add_daily_focus', { userId, taskId, position: position ?? null });
      await loadDashboard();
    },
    [userId, loadDashboard]
  );

  const morningBrief = useCallback(async () => {
    return await invoke<string>('life_morning_brief', { userId });
  }, [userId]);

  const smartReschedule = useCallback(async (taskId: string) => {
    return await invoke<LifeSchedule>('life_smart_reschedule', { taskId });
  }, []);

  const parseInput = useCallback(async (input: string) => {
    return await invoke<{
      action: string;
      title: string;
      due_date?: string;
      priority?: string;
      category?: string;
      energy_type?: string;
      parsed: boolean;
    }>('life_parse_input', { input });
  }, []);

  const dismissNudge = useCallback(
    async (nudgeId: string) => {
      await invoke('life_dismiss_nudge', { userId, nudgeId });
      await loadDashboard();
    },
    [userId, loadDashboard]
  );

  return {
    dashboard,
    loading,
    loadDashboard,
    addTask,
    completeTask,
    deleteTask,
    addHabit,
    logHabit,
    addFocus,
    morningBrief,
    smartReschedule,
    parseInput,
    dismissNudge,
  };
}
