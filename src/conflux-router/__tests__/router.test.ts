// Conflux Router — Basic Tests
// Run with: npx vitest run src/conflux-router/__tests__/router.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getProvidersForTier,
  getProvidersForAlias,
  findModelForAlias,
  FREE_PROVIDERS,
  PAID_PROVIDERS,
  ALIAS_MAP,
} from '../providers';
import {
  loadQuota,
  hasQuota,
  incrementQuota,
  remainingCalls,
  resetQuota,
} from '../quota';

// ── Mock localStorage ──

const storage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value; },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
});

// ── Provider Registry Tests ──

describe('Provider Registry', () => {
  it('should have free providers', () => {
    expect(FREE_PROVIDERS.length).toBeGreaterThanOrEqual(4);
  });

  it('should have paid providers', () => {
    expect(PAID_PROVIDERS.length).toBeGreaterThanOrEqual(2);
  });

  it('free tier should only return free providers', () => {
    const providers = getProvidersForTier('free');
    expect(providers.every(p => p.tier === 'free')).toBe(true);
  });

  it('pro tier should return both free and paid', () => {
    const providers = getProvidersForTier('pro');
    const hasFree = providers.some(p => p.tier === 'free');
    const hasPaid = providers.some(p => p.tier === 'paid');
    expect(hasFree).toBe(true);
    expect(hasPaid).toBe(true);
  });

  it('conflux-fast should have providers on free tier', () => {
    const providers = getProvidersForAlias('conflux-fast', 'free');
    expect(providers.length).toBeGreaterThan(0);
  });

  it('conflux-smart should have more providers on pro tier', () => {
    const free = getProvidersForAlias('conflux-smart', 'free');
    const pro = getProvidersForAlias('conflux-smart', 'pro');
    expect(pro.length).toBeGreaterThanOrEqual(free.length);
  });

  it('should find model for alias on a provider', () => {
    const provider = FREE_PROVIDERS[0]; // Google Gemini
    const model = findModelForAlias(provider, 'conflux-fast');
    expect(model).not.toBeNull();
    expect(model?.alias).toBe('conflux-fast');
  });
});

// ── Alias Map Tests ──

describe('Alias Map', () => {
  it('conflux-fast should map to providers', () => {
    expect(ALIAS_MAP['conflux-fast'].length).toBeGreaterThan(0);
  });

  it('conflux-smart should map to providers', () => {
    expect(ALIAS_MAP['conflux-smart'].length).toBeGreaterThan(0);
  });

  it('all mapped provider IDs should exist in providers', () => {
    const allIds = [...FREE_PROVIDERS, ...PAID_PROVIDERS].map(p => p.id);
    for (const [alias, providerIds] of Object.entries(ALIAS_MAP)) {
      for (const id of providerIds) {
        expect(allIds, `Alias "${alias}" references unknown provider "${id}"`).toContain(id);
      }
    }
  });
});

// ── Quota Tests ──

describe('Quota Tracker', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should create default quota for new user', () => {
    const quota = loadQuota('test-user', 'free');
    expect(quota.callsToday).toBe(0);
    expect(quota.maxCallsPerDay).toBe(50);
    expect(quota.tier).toBe('free');
  });

  it('should track calls correctly', () => {
    let quota = loadQuota('test-user', 'free');
    expect(hasQuota(quota)).toBe(true);

    quota = incrementQuota(quota, 100);
    expect(quota.callsToday).toBe(1);
    expect(quota.tokensToday).toBe(100);
  });

  it('should enforce daily limit', () => {
    let quota = loadQuota('test-user', 'free');
    // Simulate hitting the limit
    for (let i = 0; i < 50; i++) {
      quota = incrementQuota(quota, 10);
    }
    expect(hasQuota(quota)).toBe(false);
    expect(remainingCalls(quota)).toBe(0);
  });

  it('pro tier should have unlimited quota', () => {
    const quota = loadQuota('pro-user', 'pro');
    expect(hasQuota(quota)).toBe(true);
    expect(quota.maxCallsPerDay).toBe(Infinity);

    // Even after many calls
    let updated = quota;
    for (let i = 0; i < 1000; i++) {
      updated = incrementQuota(updated, 10);
    }
    expect(hasQuota(updated)).toBe(true);
  });

  it('should reset quota', () => {
    let quota = loadQuota('test-user', 'free');
    quota = incrementQuota(quota, 100);
    expect(quota.callsToday).toBe(1);

    quota = resetQuota('test-user', 'free');
    expect(quota.callsToday).toBe(0);
    expect(quota.tokensToday).toBe(0);
  });
});
