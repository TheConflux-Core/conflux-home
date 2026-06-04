import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface Task {
  id: string;
  title: string;
  agent_id: string;
  status: 'pending' | 'in_progress' | 'review' | 'done' | 'completed' | 'failed' | 'blocked';
  priority: 'critical' | 'high' | 'normal' | 'low';
  created_at: string;
  description?: string;
  verification_id?: string;
  created_by?: string;
  result?: string;
  parent_task_id?: string;
  session_id?: string;
  requires_verify?: boolean;
  verified?: boolean;
  updated_at?: string;
  completed_at?: string;
}

export interface CreateTaskReq {
  title: string;
  agent_id: string;
  priority: string;
  description?: string;
}

export interface UpdateTaskReq {
  task_id: string;
  status?: string;
  result?: string;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      // Fetch ALL tasks across all agents for the Settings Kanban board
      const result = await invoke<Task[]>('engine_get_all_tasks');
      setTasks(result);
    } catch (err) {
      console.error('[useTasks] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (req: CreateTaskReq): Promise<string> => {
    const id = await invoke<string>('engine_create_task', { req });
    await refresh();
    return id;
  }, [refresh]);

  const update = useCallback(async (req: UpdateTaskReq) => {
    await invoke('engine_update_task', { req });
    await refresh();
  }, [refresh]);

  const grouped: Record<string, Task[]> = {
    pending: tasks.filter(t => t.status === 'pending'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    review: tasks.filter(t => t.status === 'review'),
    done: tasks.filter(t => t.status === 'done'),
    completed: tasks.filter(t => t.status === 'completed'),
    failed: tasks.filter(t => t.status === 'failed'),
    blocked: tasks.filter(t => t.status === 'blocked'),
  };

  return { tasks, grouped, loading, refresh, create, update };
}
