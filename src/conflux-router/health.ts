// Conflux Router — Health Monitor
// Checks provider health periodically and caches results.

import type { Provider, ProviderHealth } from './types';

const DEFAULT_CHECK_INTERVAL_MS = 60_000; // 60 seconds
const HEALTH_CHECK_TIMEOUT_MS = 5_000;    // 5 seconds
const MAX_ERROR_COUNT = 3;                // mark unhealthy after 3 consecutive failures

/**
 * In-memory health cache.
 */
const healthCache = new Map<string, ProviderHealth>();

/**
 * Check a single provider's health.
 */
async function checkProvider(provider: Provider): Promise<ProviderHealth> {
  const start = Date.now();

  try {
    // Build health check URL with API key if needed
    const url = new URL(provider.healthEndpoint);
    if (provider.apiKey) {
      // Some providers need auth on health endpoints
      // We'll try without first — most model list endpoints don't require it
    }

    const headers: Record<string, string> = {
      ...provider.headers,
    };
    if (provider.apiKey) {
      headers['Authorization'] = `Bearer ${provider.apiKey}`;
    }

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
    });

    const latencyMs = Date.now() - start;
    const healthy = res.ok;

    const prev = healthCache.get(provider.id);
    const errorCount = healthy ? 0 : (prev?.errorCount ?? 0) + 1;

    const entry: ProviderHealth = {
      providerId: provider.id,
      healthy: healthy && errorCount < MAX_ERROR_COUNT,
      latencyMs,
      lastCheck: new Date(),
      errorCount,
    };

    healthCache.set(provider.id, entry);
    return entry;
  } catch {
    const prev = healthCache.get(provider.id);
    const errorCount = (prev?.errorCount ?? 0) + 1;

    const entry: ProviderHealth = {
      providerId: provider.id,
      healthy: false,
      latencyMs: Infinity,
      lastCheck: new Date(),
      errorCount,
    };

    healthCache.set(provider.id, entry);
    return entry;
  }
}

/**
 * Run health checks on all providers in parallel.
 */
export async function checkAllProviders(providers: Provider[]): Promise<Map<string, ProviderHealth>> {
  await Promise.allSettled(providers.map(checkProvider));
  return new Map(healthCache);
}

/**
 * Get cached health for a provider. Returns null if never checked.
 */
export function getCachedHealth(providerId: string): ProviderHealth | null {
  return healthCache.get(providerId) ?? null;
}

/**
 * Check if a provider is healthy (from cache).
 * Defaults to healthy if never checked (optimistic).
 */
export function isProviderHealthy(providerId: string): boolean {
  const cached = healthCache.get(providerId);
  if (!cached) return true; // optimistic — hasn't failed yet
  return cached.healthy;
}

/**
 * Get all healthy providers from a list, sorted by latency.
 */
export function getHealthyProviders(providers: Provider[]): Provider[] {
  return providers
    .filter((p) => isProviderHealthy(p.id))
    .sort((a, b) => {
      const healthA = healthCache.get(a.id);
      const healthB = healthCache.get(b.id);
      const latA = healthA?.latencyMs ?? a.priority * 100;
      const latB = healthB?.latencyMs ?? b.priority * 100;
      return latA - latB;
    });
}

/**
 * Start periodic health checks. Returns a cleanup function.
 */
export function startHealthMonitor(
  providers: Provider[],
  intervalMs: number = DEFAULT_CHECK_INTERVAL_MS,
): () => void {
  // Run immediately
  checkAllProviders(providers);

  // Then schedule periodic checks
  const intervalId = setInterval(() => {
    checkAllProviders(providers);
  }, intervalMs);

  // Return cleanup function
  return () => clearInterval(intervalId);
}

/**
 * Get a summary of all provider health (for UI display).
 */
export function getHealthSummary(): Array<{
  id: string;
  name: string;
  healthy: boolean;
  latencyMs: number;
  lastCheck: Date | null;
}> {
  const summary: Array<{
    id: string;
    name: string;
    healthy: boolean;
    latencyMs: number;
    lastCheck: Date | null;
  }> = [];

  for (const [id, health] of healthCache) {
    summary.push({
      id,
      name: id, // name resolution would need provider registry
      healthy: health.healthy,
      latencyMs: health.latencyMs,
      lastCheck: health.lastCheck,
    });
  }

  return summary;
}
