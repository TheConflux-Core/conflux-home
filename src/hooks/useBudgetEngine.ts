import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { 
  BudgetSettings, 
  BudgetBucket, 
  BudgetAllocation, 
  BudgetTransaction,
  UpdateSettingsRequest,
  LogTransactionRequest
} from '../types';

export function useBudgetEngine() {
  const [settings, setSettings] = useState<BudgetSettings | null>(null);
  const [buckets, setBuckets] = useState<BudgetBucket[]>([]);
  const [allocations, setAllocations] = useState<BudgetAllocation[]>([]);
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Fetchers ──

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const [s, b, a, t] = await Promise.all([
        invoke<BudgetSettings>('budget_get_settings'),
        invoke<BudgetBucket[]>('budget_get_buckets'),
        invoke<BudgetAllocation[]>('budget_get_allocations'),
        invoke<BudgetTransaction[]>('budget_get_transactions'),
      ]);
      setSettings(s);
      setBuckets(b);
      setAllocations(a);
      setTransactions(t);
    } catch (err) {
      console.error('Failed to load budget engine data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  // ── Actions ──

  const updateSettings = useCallback(async (req: UpdateSettingsRequest) => {
    console.log('🔧 Hook: updateSettings called with:', req);
    try {
      const result = await invoke('budget_update_settings', { req });
      console.log('🔧 Hook: budget_update_settings result:', result);
      await refreshData();
    } catch (err) {
      console.error('🔧 Hook: budget_update_settings failed:', err);
      throw err;
    }
  }, [refreshData]);

  const logTransaction = useCallback(async (req: LogTransactionRequest) => {
    await invoke('budget_log_transaction', { req });
    await refreshData();
  }, [refreshData]);

  const updateAllocation = useCallback(async (bucketId: string, payPeriodId: string, amount: number) => {
    await invoke('budget_update_allocation', { bucketId, payPeriodId, amount });
    await refreshData();
  }, [refreshData]);

  const createBucket = useCallback(async (bucket: { name: string; icon: string; monthly_goal: number; color: string }) => {
    await invoke('budget_create_bucket', { 
      name: bucket.name, 
      icon: bucket.icon, 
      monthlyGoal: bucket.monthly_goal, 
      color: bucket.color 
    });
    await refreshData();
  }, [refreshData]);

  return {
    settings,
    buckets,
    allocations,
    transactions,
    loading,
    updateSettings,
    logTransaction,
    updateAllocation,
    createBucket,
    refreshData,
  };
}
