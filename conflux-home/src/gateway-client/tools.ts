// Tools Invoke wrapper — POST /tools/invoke

import { GatewayError, type GatewayConfig, type ToolInvokeResponse } from './types';

/**
 * Invoke any OpenClaw tool via the gateway.
 */
export async function invokeTool(
  config: GatewayConfig,
  toolName: string,
  args?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<ToolInvokeResponse> {
  const baseUrl = config.baseUrl ?? 'http://localhost:18789';

  const res = await fetch(`${baseUrl}/tools/invoke`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tool: toolName, args: args ?? {} }),
    signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => undefined);
    throw new GatewayError(`tools/invoke failed (${res.status})`, res.status, body);
  }

  return (await res.json()) as ToolInvokeResponse;
}
