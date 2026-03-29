import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuth } from './useAuth';

// ── Types ──

export interface CreditBalance {
  balance: number;
  has_active_subscription: boolean;
  subscription_plan: string;
  monthly_credits: number;
  monthly_used: number;
  deposit_balance: number;
  total_available: number;
  source: 'subscription' | 'deposit' | 'free';
  daily_limit?: number;
  daily_used?: number;
  daily_remaining?: number;
}

export interface UsageEntry {
  id: string;
  model: string;
  provider_id: string;
  tokens_used: number;
  latency_ms: number;
  status: string;
  credits_charged: number;
  call_type: string;
  created_at: string;
}

export interface UsageStats {
  total_calls: number;
  total_tokens: number;
  total_credits: number;
  success_rate: number;
  by_provider: Array<{ provider: string; calls: number; credits: number }>;
  by_model: Array<{ model: string; calls: number; credits: number }>;
}

// ── Credit Balance Hook ──

const POLL_INTERVAL = 30_000;

export function useCredits() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const result = await invoke<CreditBalance>('get_credit_balance', { userId: user.id });
      setBalance(result);
      setError(null);
    } catch (err) {
      console.error('Failed to load credit balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to load credits');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();

    intervalRef.current = setInterval(refresh, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  return { balance, loading, refresh, error };
}

// ── Usage History Hook ──

export function useUsageHistory(limit: number = 20) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<UsageEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const result = await invoke<UsageEntry[]>('get_usage_history', { userId: user.id, limit });
      setEntries(result);
    } catch (err) {
      console.error('Failed to load usage history:', err);
    } finally {
      setLoading(false);
    }
  }, [user, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, loading, refresh };
}

// ── Usage Stats Hook ──

export function useUsageStats(days: number = 7) {
  const { user } = useAuth();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const result = await invoke<UsageStats>('get_usage_stats', { userId: user.id, days });
      setStats(result);
    } catch (err) {
      console.error('Failed to load usage stats:', err);
    } finally {
      setLoading(false);
    }
  }, [user, days]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, loading, refresh };
}
