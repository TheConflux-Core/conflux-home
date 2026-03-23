// Conflux Home — Dream Builder Hook
import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Dream, DreamDashboard, DreamTask, DreamProgress } from '../types';

export function useDreams() {
  const [dashboard, setDashboard] = useState<DreamDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const d = await invoke<DreamDashboard>('dream_get_dashboard');
      setDashboard(d);
    } catch (e) { console.error('Failed:', e); }
    finally { setLoading(false); }
  }, []);

  const addDream = useCallback(async (title: string, category: string, description?: string, targetDate?: string, memberId?: string) => {
    await invoke('dream_add', {
      id: crypto.randomUUID(), title, category,
      description: description ?? null, targetDate: targetDate ?? null, memberId: memberId ?? null
    });
    await load();
  }, [load]);

  const aiPlan = useCallback(async (dream: Dream) => {
    return await invoke('dream_ai_plan', {
      dreamId: dream.id, title: dream.title, category: dream.category,
      description: dream.description, targetDate: dream.target_date
    });
  }, []);

  const completeTask = useCallback(async (id: string) => {
    await invoke('dream_complete_task', { id });
    await load();
  }, [load]);

  const completeMilestone = useCallback(async (id: string) => {
    await invoke('dream_complete_milestone', { id });
    await load();
  }, [load]);

  const addProgress = useCallback(async (dreamId: string, note: string, progressChange: number) => {
    await invoke('dream_add_progress', {
      id: crypto.randomUUID(), dreamId, note, progressChange, aiInsight: null
    });
    await load();
  }, [load]);

  const deleteDream = useCallback(async (id: string) => {
    await invoke('dream_delete', { id });
    await load();
  }, [load]);

  return { dashboard, loading, load, addDream, aiPlan, completeTask, completeMilestone, addProgress, deleteDream };
}
