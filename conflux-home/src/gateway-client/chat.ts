// Chat Completions with SSE streaming — POST /v1/chat/completions
// Enhanced with ChatSession for conversation management.

import {
  GatewayError,
  GatewayTimeoutError,
  type GatewayConfig,
  type ChatMessage,
  type ChatCompletionsResponse,
  type ChatSessionState,
  type StreamCallbacks,
} from './types';

// ── Re-export types for consumers ──

export type { ChatSessionState, StreamCallbacks };

// ── Constants ──

const DEFAULT_RETRY_DELAY_MS = 1_000;
const PERSISTENCE_KEY_PREFIX = 'conflux-chat-session:';

// ── Low-level API functions ──

/**
 * Send a message (non-streaming) and return the full response text.
 */
export async function sendMessage(
  config: GatewayConfig,
  agentId: string,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const baseUrl = config.baseUrl ?? 'http://localhost:18789';

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      'x-openclaw-agent-id': agentId,
    },
    body: JSON.stringify({
      model: `openclaw:${agentId}`,
      messages,
      stream: false,
    }),
    signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => undefined);
    throw new GatewayError(`chat/completions failed (${res.status})`, res.status, body);
  }

  const data = (await res.json()) as ChatCompletionsResponse;
  return data.choices?.[0]?.message?.content ?? '';
}

/**
 * Stream a message via SSE. Calls `onChunk` for each text fragment.
 * Returns the accumulated full text.
 */
export async function streamMessage(
  config: GatewayConfig,
  agentId: string,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const baseUrl = config.baseUrl ?? 'http://localhost:18789';

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      'x-openclaw-agent-id': agentId,
    },
    body: JSON.stringify({
      model: `openclaw:${agentId}`,
      messages,
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => undefined);
    throw new GatewayError(`chat/completions stream failed (${res.status})`, res.status, body);
  }

  if (!res.body) {
    throw new GatewayError('No response body for SSE stream');
  }

  return parseSSEStream(res.body, onChunk, signal);
}

/**
 * Parse an SSE ReadableStream into text chunks.
 * Handles partial chunks across network packets.
 */
async function parseSSEStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  try {
    while (true) {
      if (signal?.aborted) {
        throw new GatewayTimeoutError();
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE messages are separated by double newlines
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;

        if (trimmed === 'data: [DONE]') {
          return fullText;
        }

        if (trimmed.startsWith('data: ')) {
          const json = trimmed.slice(6);
          try {
            const chunk = JSON.parse(json);
            const content: string | undefined = chunk.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              onChunk(content);
            }
          } catch {
            // Skip unparseable lines — some servers send keepalives
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Flush remaining buffer
  if (buffer.trim() && buffer.trim() !== 'data: [DONE]') {
    const trimmed = buffer.trim();
    if (trimmed.startsWith('data: ')) {
      try {
        const chunk = JSON.parse(trimmed.slice(6));
        const content: string | undefined = chunk.choices?.[0]?.delta?.content;
        if (content) {
          fullText += content;
          onChunk(content);
        }
      } catch {
        // Skip
      }
    }
  }

  return fullText;
}

// ── ChatSession ──

/**
 * Manages conversation state for a single agent chat session.
 * Handles message history, streaming, persistence, abort/cancel, and retry.
 */
export class ChatSession {
  private _state: ChatSessionState;
  private _config: GatewayConfig;
  private _abortController: AbortController | null = null;
  private _persist: boolean;

  constructor(
    config: GatewayConfig,
    agentId: string,
    options?: { persist?: boolean },
  ) {
    this._config = config;
    this._persist = options?.persist ?? false;

    this._state = {
      agentId,
      messages: [],
      isStreaming: false,
      error: null,
    };

    if (this._persist) {
      this._loadFromStorage();
    }
  }

  // ── Getters ──

  get state(): Readonly<ChatSessionState> {
    return this._state;
  }

  get messages(): ReadonlyArray<ChatMessage> {
    return this._state.messages;
  }

  get isStreaming(): boolean {
    return this._state.isStreaming;
  }

  get error(): string | null {
    return this._state.error;
  }

  get agentId(): string {
    return this._state.agentId;
  }

  // ── Message Management ──

  /** Add a message to the conversation */
  addMessage(message: ChatMessage): void {
    this._state.messages = [...this._state.messages, message];
    this._maybePersist();
  }

  /** Add a user message and return it */
  addUserMessage(content: string): ChatMessage {
    const msg: ChatMessage = { role: 'user', content };
    this.addMessage(msg);
    return msg;
  }

  /** Add an assistant message and return it */
  addAssistantMessage(content: string): ChatMessage {
    const msg: ChatMessage = { role: 'assistant', content };
    this.addMessage(msg);
    return msg;
  }

  /** Add a system message (typically used once at session start) */
  setSystemMessage(content: string): void {
    const existing = this._state.messages.findIndex((m) => m.role === 'system');
    if (existing >= 0) {
      const updated = [...this._state.messages];
      updated[existing] = { role: 'system', content };
      this._state.messages = updated;
    } else {
      this._state.messages = [{ role: 'system', content }, ...this._state.messages];
    }
    this._maybePersist();
  }

  /** Get the last N messages */
  getRecent(count: number): ChatMessage[] {
    return this._state.messages.slice(-count);
  }

  /** Get all messages as a plain array copy */
  getMessages(): ChatMessage[] {
    return [...this._state.messages];
  }

  /** Clear all messages */
  clearMessages(): void {
    this._state.messages = [];
    this._state.error = null;
    this._maybePersist();
  }

  // ── Streaming ──

  /**
   * Send a user message and stream the assistant's response.
   * Calls StreamCallbacks for real-time UI updates.
   * Returns the full assistant response text.
   *
   * - Uses AbortController so the UI can cancel mid-stream
   * - Retries once on failure with backoff
   * - Tracks streaming state in ChatSessionState
   */
  async sendAndStream(
    userContent: string,
    callbacks?: StreamCallbacks,
  ): Promise<string> {
    if (this._state.isStreaming) {
      throw new Error('Session is already streaming. Cancel or wait before sending again.');
    }

    // Add user message
    this.addUserMessage(userContent);

    this._state.isStreaming = true;
    this._state.error = null;
    this._abortController = new AbortController();

    callbacks?.onStart?.();

    try {
      const fullText = await this._streamWithRetry(callbacks);

      this.addAssistantMessage(fullText);
      callbacks?.onDone?.(fullText);
      return fullText;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this._state.error = error.message;
      callbacks?.onError?.(error);
      throw error;
    } finally {
      this._state.isStreaming = false;
      this._abortController = null;
    }
  }

  /** Cancel the current in-flight stream */
  cancel(): void {
    if (this._abortController) {
      this._abortController.abort();
    }
  }

  /** Whether a stream is currently in-flight */
  get isCancelled(): boolean {
    return this._abortController?.signal.aborted ?? false;
  }

  // ── Persistence (localStorage / Tauri store) ──

  /** Save current state to localStorage */
  save(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const key = `${PERSISTENCE_KEY_PREFIX}${this._state.agentId}`;
      localStorage.setItem(key, JSON.stringify({
        messages: this._state.messages,
      }));
    } catch {
      // localStorage full or unavailable — fail silently
    }
  }

  /** Load state from localStorage */
  load(): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      const key = `${PERSISTENCE_KEY_PREFIX}${this._state.agentId}`;
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (Array.isArray(data.messages)) {
        this._state.messages = data.messages;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /** Clear persisted data for this session */
  clearPersisted(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const key = `${PERSISTENCE_KEY_PREFIX}${this._state.agentId}`;
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  // ── Private Helpers ──

  private async _streamWithRetry(callbacks?: StreamCallbacks): Promise<string> {
    const messagesCopy = this._getMessagesForSend();

    try {
      return await streamMessage(
        this._config,
        this._state.agentId,
        messagesCopy,
        (chunk) => callbacks?.onChunk?.(chunk),
        this._abortController?.signal,
      );
    } catch (err) {
      // Don't retry if user cancelled
      if (this._abortController?.signal.aborted) {
        throw err;
      }

      // Don't retry server errors (4xx) — only network/timeout errors
      if (err instanceof GatewayError && err.status && err.status < 500) {
        throw err;
      }

      // Single retry with backoff
      await this._delay(DEFAULT_RETRY_DELAY_MS);

      if (this._abortController?.signal.aborted) {
        throw err;
      }

      // Create a fresh AbortController for the retry
      this._abortController = new AbortController();

      return await streamMessage(
        this._config,
        this._state.agentId,
        messagesCopy,
        (chunk) => callbacks?.onChunk?.(chunk),
        this._abortController?.signal,
      );
    }
  }

  /** Get a clean copy of messages for sending (strips system from metadata if needed) */
  private _getMessagesForSend(): ChatMessage[] {
    return [...this._state.messages];
  }

  private _maybePersist(): void {
    if (this._persist) {
      this.save();
    }
  }

  private _loadFromStorage(): void {
    this.load();
  }

  private _delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
