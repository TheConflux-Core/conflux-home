// Chat Completions with SSE streaming — POST /v1/chat/completions

import {
  GatewayError,
  GatewayTimeoutError,
  type GatewayConfig,
  type ChatMessage,
  type ChatCompletionsResponse,
} from './types';

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

  return fullText;
}
