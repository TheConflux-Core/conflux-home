// Conflux Home — Gateway Connection Hook
// Provides live gateway connection, agent list, and connection state.

import { useState, useEffect, useCallback, useRef } from 'react';
import { GatewayClient } from '../gateway-client';
import type { AgentInfo } from '../gateway-client';

export interface UseGatewayResult {
  client: GatewayClient | null;
  connected: boolean;
  agents: AgentInfo[];
  refresh: () => void;
  error: string | null;
}

const STORAGE_KEY = 'conflux-gateway-token';
const GATEWAY_URL = 'http://localhost:18789';
const POLL_INTERVAL_MS = 10_000;

export function getToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // localStorage unavailable
  }
}

export function useGateway(): UseGatewayResult {
  const [client, setClient] = useState<GatewayClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const readerRef = useRef<ReturnType<GatewayClient['getAgentReader']> | null>(null);

  // Fetch agents from the gateway
  const fetchAgents = useCallback(async () => {
    const reader = readerRef.current;
    if (!reader || !client) return;

    try {
      const alive = await client.checkHealth();
      if (!alive) {
        setConnected(false);
        setError(null);
        return;
      }
      setConnected(true);
      setError(null);

      const agentList = await reader.getAllAgents();
      setAgents(agentList);
    } catch (err) {
      setConnected(false);
      // Don't show connection errors as user-facing — just show disconnected
      if (err instanceof Error && err.name === 'GatewayTimeoutError') {
        setError(null); // Timeout is normal during startup
      }
    }
  }, [client]);

  // Initialize client from stored token
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError('No gateway token configured');
      return;
    }

    const gw = new GatewayClient({ baseUrl: GATEWAY_URL, token });
    setClient(gw);
    readerRef.current = gw.getAgentReader(10_000); // 10s cache TTL
  }, []);

  // Poll for agents on interval
  useEffect(() => {
    if (!client) return;

    // Immediate first fetch
    fetchAgents();

    const interval = setInterval(fetchAgents, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [client, fetchAgents]);

  return { client, connected, agents, refresh: fetchAgents, error };
}
