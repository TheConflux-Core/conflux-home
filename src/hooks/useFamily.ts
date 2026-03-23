// Conflux Home — Family Profiles Hook
// Manages family members via Tauri commands.

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { FamilyMember, CreateFamilyMemberRequest, AgeGroup } from '../types';

export function useFamily() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await invoke<FamilyMember[]>('family_list');
      setMembers(data);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (req: CreateFamilyMemberRequest) => {
    const member = await invoke<FamilyMember>('family_create', { req });
    setMembers(prev => [...prev, member]);
    return member;
  }, []);

  const remove = useCallback(async (id: string) => {
    await invoke('family_delete', { id });
    setMembers(prev => prev.filter(m => m.id !== id));
  }, []);

  const getByAgeGroup = useCallback((ageGroup: AgeGroup) => {
    return members.filter(m => m.age_group === ageGroup);
  }, [members]);

  return { members, loading, error, create, remove, getByAgeGroup, reload: load };
}
