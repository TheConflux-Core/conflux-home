// Conflux Home — Gateway API Client SDK
// Main entry point. Clean import: import { GatewayClient } from './gateway-client'

import { invokeTool } from './tools';
import { sendMessage, streamMessage } from './chat';
import { checkHealth } from './health';

export type {
  GatewayConfig,
  GatewayAgent,
  GatewaySessionStatus,
  ChatMessage,
  ChatCompletionsResponse,
  ChatStreamChunk,
  HealthResponse,
  ToolInvokeResponse,
} from './types';

export { GatewayError, GatewayTimeoutError } from './types';

import type {
  GatewayConfig,
  ChatMessage,
  ToolInvokeResponse,
  GatewayAgent,
  GatewaySessionStatus,
} from './types';

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

export class GatewayClient {
  private readonly config: GatewayConfig;
  private readonly timeoutMs: number;

  constructor(config: GatewayConfig, timeoutMs?: number) {
    this.config = config;
    this.timeoutMs = timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  }

  // ── Helpers ──

  private withTimeout(): AbortController {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    controller.signal.addEventListener('abort', () => clearTimeout(timer));
    return controller;
  }

  // ── Tools ──

  /** Invoke any OpenClaw tool via the gateway */
  async invokeTool(
    tool: string,
    args?: Record<string, unknown>,
  ): Promise<ToolInvokeResponse> {
    const { signal } = this.withTimeout();
    return invokeTool(this.config, tool, args, signal);
  }

  /** List registered agents (via tools invoke) */
  async listAgents(): Promise<GatewayAgent[]> {
    const res = await this.invokeTool('agents_list', {});
    if (res.ok && res.result?.details) {
      return (res.result.details as unknown as GatewayAgent[]) ?? [];
    }
    return [];
  }

  /** Get current session status (via tools invoke) */
  async getSessionStatus(): Promise<GatewaySessionStatus> {
    const res = await this.invokeTool('session_status', {});
    if (res.ok && res.result?.details) {
      return (res.result.details as GatewaySessionStatus) ?? {};
    }
    return {};
  }

  // ── Chat ──

  /** Send a message and return the full response */
  async sendMessage(
    agentId: string,
    messages: ChatMessage[],
  ): Promise<string> {
    const { signal } = this.withTimeout();
    return sendMessage(this.config, agentId, messages, signal);
  }

  /** Stream a message with real-time chunk callback. Returns full text. */
  async streamMessage(
    agentId: string,
    messages: ChatMessage[],
    onChunk: (text: string) => void,
  ): Promise<string> {
    const { signal } = this.withTimeout();
    return streamMessage(this.config, agentId, messages, onChunk, signal);
  }

  // ── Health ──

  /** Check if the gateway is alive. Returns true if healthy. */
  async checkHealth(): Promise<boolean> {
    const { signal } = this.withTimeout();
    const res = await checkHealth(this.config, signal);
    return res.ok && res.status === 'live';
  }
}
