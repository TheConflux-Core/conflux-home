// Health check — GET /health

import { GatewayError, type GatewayConfig, type HealthResponse } from './types';

/**
 * Check if the gateway is alive and reachable.
 */
export async function checkHealth(
  config: GatewayConfig,
  signal?: AbortSignal,
): Promise<HealthResponse> {
  const baseUrl = config.baseUrl ?? 'http://localhost:18789';

  const res = await fetch(`${baseUrl}/health`, {
    method: 'GET',
    signal,
  });

  if (!res.ok) {
    throw new GatewayError(`health check failed (${res.status})`, res.status);
  }

  return (await res.json()) as HealthResponse;
}
