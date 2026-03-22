import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { invokeTool } from '../tools';
import { GatewayError } from '../types';
import type { GatewayConfig } from '../types';

const config: GatewayConfig = { baseUrl: 'http://localhost:18789', token: 'test-token' };

describe('invokeTool', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('sends POST to /tools/invoke with correct headers and body', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, result: { details: { agents: [] } } }),
    });

    await invokeTool(config, 'agents_list', { limit: 5 });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe('http://localhost:18789/tools/invoke');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Authorization']).toBe('Bearer test-token');
    expect(opts.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(opts.body);
    expect(body.tool).toBe('agents_list');
    expect(body.args).toEqual({ limit: 5 });
  });

  it('uses empty args when args not provided', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await invokeTool(config, 'health_check');

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.args).toEqual({});
  });

  it('throws GatewayError on non-OK response', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    await expect(invokeTool(config, 'bad_tool')).rejects.toThrow(GatewayError);
    await expect(invokeTool(config, 'bad_tool')).rejects.toThrow('tools/invoke failed (500)');
  });

  it('throws GatewayError on 401 unauthorized', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    await expect(invokeTool(config, 'any_tool')).rejects.toThrow(GatewayError);
  });

  it('uses default baseUrl when not specified', async () => {
    const minimalConfig: GatewayConfig = { token: 'tok' };
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await invokeTool(minimalConfig, 'test');
    const url = fetchSpy.mock.calls[0][0];
    expect(url).toBe('http://localhost:18789/tools/invoke');
  });

  it('passes AbortSignal through', async () => {
    const controller = new AbortController();
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await invokeTool(config, 'test', {}, controller.signal);
    expect(fetchSpy.mock.calls[0][1].signal).toBe(controller.signal);
  });

  it('returns parsed ToolInvokeResponse on success', async () => {
    const mockResponse = { ok: true, result: { details: { count: 42 } } };
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await invokeTool(config, 'test');
    expect(result).toEqual(mockResponse);
    expect(result.ok).toBe(true);
  });
});
