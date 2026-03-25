import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { OrbitDashboard, LifeSchedule } from '../types';

export function useOrbit() {
  const [dashboard, setDashboard] = useState<OrbitDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const d = await invoke<OrbitDashboard>('life_get_orbit_dashboard');
      setDashboard(d);
    } catch (e) {
      console.error('Failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const addTask = useCallback(
    async (title: string, category?: string, priority?: string, dueDate?: string, energyType?: string) => {
      await invoke('life_add_task', {
        title,
        category: category ?? null,
        priority: priority ?? null,
        dueDate: dueDate ?? null,
        energyType: energyType ?? null,
      });
      await loadDashboard();
    },
    [loadDashboard]
  );

  const completeTask = useCallback(
    async (taskId: string) => {
      await invoke('life_complete_task', { taskId });
      await loadDashboard();
    },
    [loadDashboard]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      await invoke('life_delete_task', { taskId });
      await loadDashboard();
    },
    [loadDashboard]
  );

  const addHabit = useCallback(
    async (name: string, category?: string, frequency?: string, targetCount?: number) => {
      await invoke('life_add_habit', {
        name,
        category: category ?? null,
        frequency: frequency ?? null,
        targetCount: targetCount ?? null,
      });
      await loadDashboard();
    },
    [loadDashboard]
  );

  const logHabit = useCallback(
    async (habitId: string) => {
      await invoke('life_log_habit', { habitId });
      await loadDashboard();
    },
    [loadDashboard]
  );

  const addFocus = useCallback(
    async (taskId: string, position?: number) => {
      await invoke('life_add_daily_focus', { taskId, position: position ?? null });
      await loadDashboard();
    },
    [loadDashboard]
  );

  const morningBrief = useCallback(async () => {
    return await invoke<string>('life_morning_brief');
  }, []);

  const smartReschedule = useCallback(async (taskId: string) => {
    return await invoke<LifeSchedule>('life_smart_reschedule', { taskId });
  }, []);

  const parseInput = useCallback(async (input: string) => {
    return await invoke<{ action: string; title: string; parsed: boolean }>('life_parse_input', { input });
  }, []);

  const dismissNudge = useCallback(
    async (nudgeId: string) => {
      await invoke('life_dismiss_nudge', { nudgeId });
      await loadDashboard();
    },
    [loadDashboard]
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
