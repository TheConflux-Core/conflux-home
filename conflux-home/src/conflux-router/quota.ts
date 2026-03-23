// Conflux Router — Quota Tracker
// Tracks daily usage per user. localStorage for MVP, server sync later.

import type { UserQuota, UserTier } from './types';

const STORAGE_KEY_PREFIX = 'conflux-quota:';
const DEFAULT_FREE_DAILY_LIMIT = 50;

/**
 * Get today's date as a UTC date string (for quota reset comparison).
 */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // "2026-03-22"
}

/**
 * Load quota from localStorage. Returns default if not found.
 */
export function loadQuota(userId: string, tier: UserTier = 'free'): UserQuota {
  if (typeof localStorage !== 'undefined') {
    try {
      const key = `${STORAGE_KEY_PREFIX}${userId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const stored = JSON.parse(raw) as UserQuota;
        // Reset if it's a new day
        if (stored.lastReset !== todayUTC()) {
          const reset: UserQuota = {
            ...stored,
            callsToday: 0,
            tokensToday: 0,
            lastReset: todayUTC(),
          };
          saveQuota(reset);
          return reset;
        }
        return stored;
      }
    } catch {
      // Corrupted storage — start fresh
    }
  }

  // Default quota
  const maxCalls = tier === 'free' ? DEFAULT_FREE_DAILY_LIMIT : Infinity;
  return {
    userId,
    tier,
    callsToday: 0,
    maxCallsPerDay: maxCalls,
    tokensToday: 0,
    lastReset: todayUTC(),
  };
}

/**
 * Save quota to localStorage.
 */
export function saveQuota(quota: UserQuota): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const key = `${STORAGE_KEY_PREFIX}${quota.userId}`;
    localStorage.setItem(key, JSON.stringify(quota));
  } catch {
    // localStorage full — fail silently, quota just won't persist
  }
}

/**
 * Check if the user has remaining quota.
 */
export function hasQuota(quota: UserQuota): boolean {
  if (quota.tier !== 'free') return true; // paid tiers unlimited
  return quota.callsToday < quota.maxCallsPerDay;
}

/**
 * Increment quota after a successful call.
 * Returns updated quota.
 */
export function incrementQuota(quota: UserQuota, tokensUsed: number = 0): UserQuota {
  const updated: UserQuota = {
    ...quota,
    callsToday: quota.callsToday + 1,
    tokensToday: quota.tokensToday + tokensUsed,
  };
  saveQuota(updated);
  return updated;
}

/**
 * Get remaining calls for today.
 */
export function remainingCalls(quota: UserQuota): number {
  if (quota.tier !== 'free') return Infinity;
  return Math.max(0, quota.maxCallsPerDay - quota.callsToday);
}

/**
 * Reset quota (for testing or admin override).
 */
export function resetQuota(userId: string, tier: UserTier = 'free'): UserQuota {
  const maxCalls = tier === 'free' ? DEFAULT_FREE_DAILY_LIMIT : Infinity;
  const quota: UserQuota = {
    userId,
    tier,
    callsToday: 0,
    maxCallsPerDay: maxCalls,
    tokensToday: 0,
    lastReset: todayUTC(),
  };
  saveQuota(quota);
  return quota;
}
