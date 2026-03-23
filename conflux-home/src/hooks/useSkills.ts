import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon?: string;
  active: boolean;
  agents: string[];
  installed_at: string;
}

export function useSkills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await invoke<Skill[]>('engine_get_skills', { activeOnly: null });
      setSkills(result);
    } catch (err) {
      console.error('[useSkills] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const install = useCallback(async (manifestJson: string): Promise<string> => {
    const id = await invoke<string>('engine_install_skill', { manifestJson });
    await refresh();
    return id;
  }, [refresh]);

  const toggle = useCallback(async (id: string, active: boolean) => {
    await invoke('engine_toggle_skill', { id, active });
    setSkills(prev => prev.map(s => s.id === id ? { ...s, active } : s));
  }, []);

  const uninstall = useCallback(async (id: string) => {
    await invoke('engine_uninstall_skill', { id });
    setSkills(prev => prev.filter(s => s.id !== id));
  }, []);

  return { skills, loading, refresh, install, toggle, uninstall };
}
