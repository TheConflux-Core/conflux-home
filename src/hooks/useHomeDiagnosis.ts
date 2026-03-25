import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { HomeDiagnosis } from '../types';

export function useHomeDiagnosis() {
  const [diagnosis, setDiagnosis] = useState<HomeDiagnosis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const diagnose = useCallback(async (symptom: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<HomeDiagnosis>('home_diagnose_problem', { id: 'default', symptom });
      setDiagnosis(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const logProblem = useCallback(async (description: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<HomeDiagnosis>('home_log_problem_natural', { id: 'default', description });
      setDiagnosis(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  return { diagnosis, loading, error, diagnose, logProblem };
}
