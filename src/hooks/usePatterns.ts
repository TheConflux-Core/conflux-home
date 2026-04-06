// Conflux Home — Pattern Detection Hook
// Detects spending patterns, savings goals, cooking frequency, dream velocity, and habit streaks

import { useState, useEffect, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { BudgetPattern, BudgetGoal, KitchenDigest, DreamDashboard, LifeHabit, OrbitDashboard } from '../types';
import { useAuth } from './useAuth';

// ── Pattern Types ──

export type PatternType =
  | 'dining_spend_spike'
  | 'savings_on_track'
  | 'savings_behind'
  | 'cooking_frequency_drop'
  | 'dream_stalling'
  | 'habit_streak_milestone';

export interface DetectedPattern {
  id: string;
  type: PatternType;
  severity: 'attention' | 'success' | 'warning' | 'celebration';
  title: string;
  message: string;
  icon: string;
  timestamp: string;
  data?: Record<string, any>;
}

// ── Helper Functions ──

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getLastMonthKey(): string {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  return getMonthKey(now);
}

// ── Main Hook ──

export function usePatterns(memberId?: string) {
  const { user } = useAuth();
  const [patterns, setPatterns] = useState<DetectedPattern[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolve auth-wired user ID, falling back to explicit memberId or null
  const resolvedMemberId = useMemo(
    () => memberId || (user ? user.id : null),
    [memberId, user]
  );

  // Generate unique ID for patterns
  const generateId = useCallback(() => {
    return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Detect dining spend spikes from budget patterns
  const detectDiningSpikes = useCallback(async (): Promise<DetectedPattern[]> => {
    try {
      const budgetPatterns = await invoke<BudgetPattern[]>('budget_detect_patterns', {
        member_id: resolvedMemberId,
      });

      const diningPatterns = budgetPatterns.filter(
        (p) => p.category.toLowerCase().includes('dining') ||
              p.category.toLowerCase().includes('food') ||
              p.category.toLowerCase().includes('restaurant') ||
              p.category.toLowerCase().includes('eating out')
      );

      return diningPatterns
        .filter(p => p.pattern_type === 'spike' || p.avg_amount > 100) // Threshold for spike detection
        .map(p => ({
          id: generateId(),
          type: 'dining_spend_spike' as PatternType,
          severity: 'attention' as const,
          title: 'Dining Spend Spike',
          message: `High spending detected in ${p.category}: ${p.description}`,
          icon: '🍽️',
          timestamp: new Date().toISOString(),
          data: { pattern: p },
        }));
    } catch (e) {
      console.warn('Failed to detect dining spikes:', e);
      return [];
    }
  }, [resolvedMemberId, generateId]);

  // Detect savings goal progress
  const detectSavingsProgress = useCallback(async (): Promise<DetectedPattern[]> => {
    try {
      const goals = await invoke<BudgetGoal[]>('budget_get_goals', {
        member_id: resolvedMemberId,
      });

      const patterns: DetectedPattern[] = [];

      goals.forEach(goal => {
        const progress = (goal.current_amount / goal.target_amount) * 100;

        if (progress >= 100) {
          patterns.push({
            id: generateId(),
            type: 'savings_on_track',
            severity: 'success',
            title: 'Savings Goal Achieved',
            message: `Congratulations! You've reached your goal: ${goal.name}`,
            icon: '🎉',
            timestamp: new Date().toISOString(),
            data: { goal, progress },
          });
        } else if (progress >= 50) {
          patterns.push({
            id: generateId(),
            type: 'savings_on_track',
            severity: 'success',
            title: 'Savings on Track',
            message: `Halfway there on ${goal.name}: ${progress.toFixed(0)}%`,
            icon: '✅',
            timestamp: new Date().toISOString(),
            data: { goal, progress },
          });
        } else if (goal.deadline) {
          const deadline = new Date(goal.deadline);
          const now = new Date();
          const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          // If deadline is within 30 days and less than 50% complete, flag as behind
          if (daysRemaining < 30 && progress < 50) {
            patterns.push({
              id: generateId(),
              type: 'savings_behind',
              severity: 'warning',
              title: 'Savings Behind Schedule',
              message: `${goal.name} is ${progress.toFixed(0)}% complete with ${daysRemaining} days remaining`,
              icon: '⚠️',
              timestamp: new Date().toISOString(),
              data: { goal, progress, daysRemaining },
            });
          }
        }
      });

      return patterns;
    } catch (e) {
      console.warn('Failed to detect savings progress:', e);
      return [];
    }
  }, [resolvedMemberId, generateId]);

  // Detect cooking frequency drops from kitchen digest
  const detectCookingFrequency = useCallback(async (): Promise<DetectedPattern[]> => {
    try {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Start of current week

      const digest = await invoke<KitchenDigest>('kitchen_weekly_digest', {
        week_start: weekStart.toISOString().split('T')[0],
        member_id: resolvedMemberId,
      });

      const patterns: DetectedPattern[] = [];

      // Check for cooking frequency drops (compare to previous week or threshold)
      // If meals_cooked is below threshold, flag as drop
      if (digest.meals_cooked < 3) {
        patterns.push({
          id: generateId(),
          type: 'cooking_frequency_drop',
          severity: 'attention',
          title: 'Cooking Frequency Low',
          message: `You've only cooked ${digest.meals_cooked} meals this week. Try planning a few more!`,
          icon: '🍳',
          timestamp: new Date().toISOString(),
          data: { digest },
        });
      }

      return patterns;
    } catch (e) {
      console.warn('Failed to detect cooking frequency:', e);
      return [];
    }
  }, [resolvedMemberId, generateId]);

  // Detect dream stalling from velocity data
  const detectDreamStalling = useCallback(async (): Promise<DetectedPattern[]> => {
    try {
      const dashboard = await invoke<DreamDashboard>('dream_get_dashboard', {
        userId: resolvedMemberId,
      });

      const patterns: DetectedPattern[] = [];

      // Check active dreams with low velocity or stalled progress
      dashboard.dreams.forEach(dream => {
        // If dream has no recent progress and has upcoming tasks, it might be stalling
        const hasRecentProgress = dashboard.recent_progress.some(
          p => p.dream_id === dream.id && new Date(p.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
        );

        const dreamTasks = dashboard.upcoming_tasks.filter(t => t.dream_id === dream.id);

        if (!hasRecentProgress && dreamTasks.length > 2) {
          patterns.push({
            id: generateId(),
            type: 'dream_stalling',
            severity: 'warning',
            title: 'Dream Progress Stalling',
            message: `Your dream "${dream.title}" hasn't seen progress recently. Time to take action?`,
            icon: '💭',
            timestamp: new Date().toISOString(),
            data: { dream, tasks: dreamTasks },
          });
        }
      });

      return patterns;
    } catch (e) {
      console.warn('Failed to detect dream stalling:', e);
      return [];
    }
  }, [resolvedMemberId, generateId]);

  // Detect habit streak milestones
  const detectHabitStreaks = useCallback(async (): Promise<DetectedPattern[]> => {
    try {
      const dashboard = await invoke<OrbitDashboard>('life_get_orbit_dashboard', {
        userId: resolvedMemberId,
      });

      const patterns: DetectedPattern[] = [];

      dashboard.active_habits.forEach(habit => {
        // Check for milestone streaks (7, 14, 30, 60, 90 days)
        const milestones = [7, 14, 30, 60, 90];
        const reachedMilestone = milestones.includes(habit.streak);

        if (reachedMilestone) {
          patterns.push({
            id: generateId(),
            type: 'habit_streak_milestone',
            severity: 'celebration',
            title: `Habit Streak: ${habit.streak} Days!`,
            message: `Amazing! You've maintained "${habit.name}" for ${habit.streak} days in a row!`,
            icon: '🔥',
            timestamp: new Date().toISOString(),
            data: { habit },
          });
        }
      });

      return patterns;
    } catch (e) {
      console.warn('Failed to detect habit streaks:', e);
      return [];
    }
  }, [resolvedMemberId, generateId]);

  // Main analysis function
  const analyze = useCallback(async () => {
    try {
      setLoading(true);

      // Run all pattern detections in parallel
      const [
        diningSpikes,
        savingsProgress,
        cookingFrequency,
        dreamStalling,
        habitStreaks,
      ] = await Promise.all([
        detectDiningSpikes(),
        detectSavingsProgress(),
        detectCookingFrequency(),
        detectDreamStalling(),
        detectHabitStreaks(),
      ]);

      // Combine all patterns and sort by severity (celebration first, then success, then attention, then warning)
      const allPatterns = [
        ...diningSpikes,
        ...savingsProgress,
        ...cookingFrequency,
        ...dreamStalling,
        ...habitStreaks,
      ].sort((a, b) => {
        const severityOrder = { celebration: 0, success: 1, attention: 2, warning: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      setPatterns(allPatterns);
      return allPatterns;
    } catch (e) {
      console.error('Failed to analyze patterns:', e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [
    detectDiningSpikes,
    detectSavingsProgress,
    detectCookingFrequency,
    detectDreamStalling,
    detectHabitStreaks,
  ]);

  // Auto-analyze on mount
  useEffect(() => {
    if (resolvedMemberId) {
      analyze();
    }
  }, [resolvedMemberId, analyze]);

  // Clear pattern by ID
  const dismissPattern = useCallback((id: string) => {
    setPatterns(prev => prev.filter(p => p.id !== id));
  }, []);

  return {
    patterns,
    loading,
    analyze,
    dismissPattern,
  };
}
