// Conflux Home — Budget Hook
// Manages budget entries and summaries via Tauri commands.

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { BudgetEntry, BudgetSummary } from '../types';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function useBudget(memberId?: string) {
  const [month, setMonth] = useState(getCurrentMonth);
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [e, s] = await Promise.all([
        invoke<BudgetEntry[]>('budget_get_entries', { memberId: memberId ?? null, month }),
        invoke<BudgetSummary>('budget_get_summary', { month }),
      ]);
      setEntries(e);
      setSummary(s);
    } catch (e) {
      console.error('Failed to load budget:', e);
    } finally {
      setLoading(false);
    }
  }, [memberId, month]);

  useEffect(() => { load(); }, [load]);

  const addEntry = useCallback(async (req: {
    member_id?: string;
    entry_type: string;
    category: string;
    amount: number;
    description?: string;
    recurring?: boolean;
    frequency?: string;
    date: string;
  }) => {
    await invoke('budget_add_entry', {
      req: {
        ...req,
        member_id: req.member_id ?? null,
        description: req.description ?? null,
        recurring: req.recurring ?? false,
        frequency: req.frequency ?? null,
      },
    });
    await load();
  }, [load]);

  const deleteEntry = useCallback(async (id: string) => {
    await invoke('budget_delete_entry', { id });
    await load();
  }, [load]);

  const prevMonth = useCallback(() => {
    setMonth(m => {
      const [y, mo] = m.split('-').map(Number);
      const d = new Date(y, mo - 2, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setMonth(m => {
      const [y, mo] = m.split('-').map(Number);
      const d = new Date(y, mo, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
  }, []);

  return { entries, summary, month, loading, addEntry, deleteEntry, prevMonth, nextMonth, reload: load };
}
