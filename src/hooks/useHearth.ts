import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { HomeMenuItem, TonightMeal, PantryHeatItem, CookingStep, KitchenDigest, KitchenNudge, MealPhoto } from '../types';

export function useTonightsMenu() {
  const [tonight, setTonight] = useState<TonightMeal | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const meal = await invoke<TonightMeal | null>('kitchen_tonights_menu', { memberId: null });
      setTonight(meal);
    } catch (e) { console.error('Failed to load tonight\'s menu:', e); }
    finally { setLoading(false); }
  }, []);

  return { tonight, loading, load };
}

export function useHomeMenu() {
  const [menu, setMenu] = useState<HomeMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      // Chef's Specials: real intelligent recommendations
      const items = await invoke<HomeMenuItem[]>('kitchen_chefs_specials', { memberId: null, limit: 5 });
      setMenu(items);
    } catch (e) { console.error('Failed:', e); }
    finally { setLoading(false); }
  }, []);

  return { menu, loading, load };
}

export function useCookingMode(mealId: string | null) {
  const [steps, setSteps] = useState<CookingStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadSteps = useCallback(async () => {
    if (!mealId) return;
    try {
      setLoading(true);
      const s = await invoke<CookingStep[]>('kitchen_get_cooking_steps', { mealId, memberId: null });
      setSteps(s);
      setCurrentStep(0);
    } catch (e) { console.error('Failed:', e); }
    finally { setLoading(false); }
  }, [mealId]);

  const nextStep = useCallback(() => setCurrentStep(c => Math.min(c + 1, steps.length - 1)), [steps.length]);
  const prevStep = useCallback(() => setCurrentStep(c => Math.max(c - 1, 0)), []);

  return { steps, currentStep, loading, loadSteps, nextStep, prevStep };
}

export function useKitchenDigest(weekStart: string) {
  const [digest, setDigest] = useState<KitchenDigest | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const d = await invoke<KitchenDigest>('kitchen_weekly_digest', { weekStart, memberId: null });
      setDigest(d);
    } catch (e) { console.error('Failed:', e); }
    finally { setLoading(false); }
  }, [weekStart]);

  return { digest, loading, load };
}

export function useKitchenNudges() {
  const [nudges, setNudges] = useState<KitchenNudge[]>([]);

  const load = useCallback(async () => {
    try {
      const n = await invoke<KitchenNudge[]>('kitchen_get_nudges');
      setNudges(n);
    } catch (e) { console.error('Failed:', e); }
  }, []);

  return { nudges, load };
}

export function useMealPhotos(mealId: string | null) {
  const [photos, setPhotos] = useState<MealPhoto[]>([]);

  const load = useCallback(async () => {
    if (!mealId) return;
    try {
      const p = await invoke<MealPhoto[]>('kitchen_get_meal_photos', { mealId, memberId: null });
      setPhotos(p);
    } catch (e) { console.error('Failed:', e); }
  }, [mealId]);

  const upload = useCallback(async (photoUrl: string, caption?: string) => {
    if (!mealId) return;
    try {
      await invoke('kitchen_upload_meal_photo', { mealId, photoUrl, caption: caption ?? null, memberId: null });
      await load();
    } catch (e) { console.error('Failed:', e); }
  }, [mealId, load]);

  return { photos, load, upload };
}
