// Conflux Home — Cron Jobs Hook
// Manages scheduled tasks via engine Tauri commands.

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface CronJob {
  id: string;
  agent_id: string;
  schedule: string;
  message: string;
  enabled: boolean;
  last_run?: string;
  next_run?: string;
  created_at: string;
}

export interface CreateCronReq {
  agent_id: string;
  schedule: string;
  message: string;
  enabled: boolean;
}

export function useCron() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await invoke<CronJob[]>('engine_get_crons', { enabledOnly: null });
      setJobs(result);
    } catch (err) {
      console.error('[useCron] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (req: CreateCronReq): Promise<string> => {
    try {
      const id = await invoke<string>('engine_create_cron', { req });
      await refresh();
      return id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      window.dispatchEvent(new CustomEvent('conflux:toast', {
        detail: { message: msg, type: 'error' },
      }));
      throw err;
    }
  }, [refresh]);

  const toggle = useCallback(async (id: string, enabled: boolean) => {
    try {
      await invoke('engine_toggle_cron', { id, enabled });
      setJobs(prev => prev.map(j => j.id === id ? { ...j, enabled } : j));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      window.dispatchEvent(new CustomEvent('conflux:toast', {
        detail: { message: msg, type: 'error' },
      }));
      throw err;
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      await invoke('engine_delete_cron', { id });
      setJobs(prev => prev.filter(j => j.id !== id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      window.dispatchEvent(new CustomEvent('conflux:toast', {
        detail: { message: msg, type: 'error' },
      }));
      throw err;
    }
  }, []);

  return { jobs, loading, refresh, create, toggle, remove };
}
