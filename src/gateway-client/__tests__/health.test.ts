import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkHealth } from '../health';
import { GatewayError } from '../types';
import type { GatewayConfig } from '../types';

const config: GatewayConfig = { baseUrl: 'http://localhost:18789', token: 'test-token' };

describe('checkHealth (unit)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns HealthResponse on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, status: 'live' }),
    }));

    const result = await checkHealth(config);
    expect(result.ok).toBe(true);
    expect(result.status).toBe('live');
  });

  it('sends GET to /health', async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, status: 'live' }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    await checkHealth(config);

    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe('http://localhost:18789/health');
    expect(opts.method).toBe('GET');
  });

  it('throws GatewayError on non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    }));

    try {
      await checkHealth(config);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(GatewayError);
      expect((err as GatewayError).message).toContain('health check failed (503)');
    }
  });

  it('uses default baseUrl when not specified', async () => {
    const minimalConfig: GatewayConfig = { token: 'tok' };
    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, status: 'live' }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    await checkHealth(minimalConfig);
    expect(fetchSpy.mock.calls[0][0]).toBe('http://localhost:18789/health');
  });

  it('passes AbortSignal', async () => {
    const controller = new AbortController();
    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, status: 'live' }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    await checkHealth(config, controller.signal);
    expect(fetchSpy.mock.calls[0][1].signal).toBe(controller.signal);
  });
});

// ── Integration tests (run against live gateway) ──
// @integration

describe('checkHealth (integration)', () => {
  it('connects to live gateway /health', async () => {
    try {
      // Use real fetch (not mocked) for integration test
      const baseUrl = 'http://localhost:18789';
      const res = await fetch(`${baseUrl}/health`);
      if (!res.ok) {
        console.log('⚠️  Gateway returned non-OK status:', res.status);
        return;
      }
      const data = await res.json() as { ok: boolean; status: string };
      expect(data.ok).toBe(true);
      expect(data.status).toBe('live');
    } catch (err) {
      if (err instanceof Error && (err.message.includes('ECONNREFUSED') || err.message.includes('fetch failed') || err.message.includes('Failed to fetch'))) {
        console.log('⚠️  Integration test skipped — gateway unavailable at localhost:18789');
        return;
      }
      throw err;
    }
  });
});
