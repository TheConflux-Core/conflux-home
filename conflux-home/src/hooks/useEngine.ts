// Conflux Home — Engine Hook
// Replaces useGateway. Fetches agents from the embedded engine via Tauri commands.
// No gateway dependency — the engine IS the app.

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Agent } from '../types';

interface EngineAgent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  soul?: string;
  instructions?: string;
  model_alias: string;
  tier: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UseEngineResult {
  connected: boolean;
  agents: Agent[];
  refresh: () => void;
  error: string | null;
}

const POLL_INTERVAL_MS = 30_000;

/** Map engine agent → UI Agent type */
function toUIAgent(a: EngineAgent): Agent {
  return {
    id: a.id,
    name: a.name,
    emoji: a.emoji,
    role: a.role,
    description: a.role,
    status: a.is_active ? 'idle' : 'offline',
    model: a.model_alias || '',
  };
}

export function useEngine(): UseEngineResult {
  const [connected, setConnected] = useState(true); // optimistic — engine is embedded
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const [healthResult, agentList] = await Promise.all([
        invoke<any>('engine_health').catch(() => null),
        invoke<EngineAgent[]>('engine_get_agents'),
      ]);

      // Engine is healthy if the call succeeds (and optionally health.status === 'healthy')
      setConnected(true);
      setError(null);

      const mapped = (agentList ?? []).map(toUIAgent);
      setAgents(mapped);
    } catch (err) {
      // Engine calls failed — show error but don't block the app
      setConnected(false);
      setError(err instanceof Error ? err.message : 'Engine unavailable');
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  return { connected, agents, refresh: fetchAgents, error };
}
