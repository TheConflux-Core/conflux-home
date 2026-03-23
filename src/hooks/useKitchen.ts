// Conflux Home — Kitchen Hook
// Manages meals, weekly plans, and grocery lists via Tauri commands.

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Meal, MealWithIngredients, WeeklyPlan, GroceryItem } from '../types';

export function useMeals(category?: string, cuisine?: string, favoritesOnly = false) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await invoke<Meal[]>('kitchen_get_meals', {
        category: category ?? null,
        cuisine: cuisine ?? null,
        favoritesOnly,
      });
      setMeals(data);
    } catch (e) {
      console.error('Failed to load meals:', e);
    } finally {
      setLoading(false);
    }
  }, [category, cuisine, favoritesOnly]);

  useEffect(() => { load(); }, [load]);

  const addWithAI = useCallback(async (description: string) => {
    const result = await invoke<MealWithIngredients>('kitchen_ai_add_meal', { description });
    setMeals(prev => [result.meal, ...prev]);
    return result;
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    await invoke('kitchen_toggle_favorite', { id });
    setMeals(prev => prev.map(m => m.id === id ? { ...m, is_favorite: !m.is_favorite } : m));
  }, []);

  return { meals, loading, addWithAI, toggleFavorite, reload: load };
}

export function useMealDetail(mealId: string | null) {
  const [meal, setMeal] = useState<MealWithIngredients | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!mealId) { setMeal(null); return; }
    try {
      setLoading(true);
      const data = await invoke<MealWithIngredients | null>('kitchen_get_meal', { id: mealId });
      setMeal(data);
    } catch (e) {
      console.error('Failed to load meal:', e);
    } finally {
      setLoading(false);
    }
  }, [mealId]);

  useEffect(() => { load(); }, [load]);

  return { meal, loading, reload: load };
}

export function useWeeklyPlan(weekStart: string) {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await invoke<WeeklyPlan>('kitchen_get_weekly_plan', { weekStart });
      setPlan(data);
    } catch (e) {
      console.error('Failed to load weekly plan:', e);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  const setEntry = useCallback(async (dayOfWeek: number, mealSlot: string, mealId: string | null, notes?: string) => {
    await invoke('kitchen_set_plan_entry', {
      req: { week_start: weekStart, day_of_week: dayOfWeek, meal_slot: mealSlot, meal_id: mealId, notes: notes ?? null },
    });
    await load();
  }, [weekStart, load]);

  const clearWeek = useCallback(async () => {
    await invoke('kitchen_clear_week_plan', { weekStart });
    await load();
  }, [weekStart, load]);

  return { plan, loading, setEntry, clearWeek, reload: load };
}

export function useGroceryList(weekStart: string) {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await invoke<GroceryItem[]>('kitchen_get_grocery', { weekStart });
      setItems(data);
    } catch (e) {
      console.error('Failed to load grocery list:', e);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  const generate = useCallback(async () => {
    const data = await invoke<GroceryItem[]>('kitchen_generate_grocery', { weekStart });
    setItems(data);
  }, [weekStart]);

  const toggleItem = useCallback(async (id: string) => {
    await invoke('kitchen_toggle_grocery_item', { id });
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_checked: !i.is_checked } : i));
  }, []);

  const totalCost = items.reduce((sum, i) => sum + (i.estimated_cost ?? 0), 0);

  return { items, loading, generate, toggleItem, totalCost, reload: load };
}
