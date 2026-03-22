// Gateway API Client — Type Definitions
// Only types verified against real gateway responses.

// ── Config ──

export interface GatewayConfig {
  /** Gateway base URL, defaults to http://localhost:18789 */
  baseUrl?: string;
  /** Bearer token for gateway auth */
  token: string;
}

// ── Tools Invoke ──

export interface ToolInvokeRequest {
  tool: string;
  args?: Record<string, unknown>;
}

export interface ToolInvokeResponse {
  ok: boolean;
  result?: {
    content?: unknown[];
    details?: Record<string, unknown>;
  };
  error?: string;
}

// Agent listing (returned via tools invoke — generic until verified shape)
export interface GatewayAgent {
  id: string;
  name?: string;
  status?: string;
  // TODO: add fields once real gateway response is verified
}

// Session status (returned via tools invoke — generic until verified shape)
export interface GatewaySessionStatus {
  // TODO: verify real response fields from gateway
  [key: string]: unknown;
}

// ── Chat Completions (OpenAI-compatible) ──

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionsRequest {
  model: string;
  messages: ChatMessage[];
  stream: boolean;
}

// Non-streaming response
export interface ChatChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string | null;
}

export interface ChatCompletionsResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatChoice[];
}

// Streaming chunk (SSE data lines)
export interface ChatStreamChunk {
  choices: Array<{
    delta: {
      content?: string;
      role?: string;
    };
    index: number;
    finish_reason: string | null;
  }>;
}

// ── Health ──

export interface HealthResponse {
  ok: boolean;
  status: string;
}

// ── Errors ──

export class GatewayError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'GatewayError';
  }
}

export class GatewayTimeoutError extends GatewayError {
  constructor() {
    super('Gateway request timed out', undefined);
    this.name = 'GatewayTimeoutError';
  }
}
