// Conflux Home — Cloud Chat Hook
// Routes chat through the Conflux Router (Supabase Edge Function).
// Uses Supabase JWT for auth, credit-based billing.

import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { AgentMessage } from '../types';

const CONFLUX_ROUTER_URL = 'https://zcvhozqrssotirabdlzr.supabase.co/functions/v1/conflux-router';

export interface UseCloudChatResult {
  messages: AgentMessage[];
  sendMessage: (content: string) => Promise<void>;
  streaming: boolean;
  thinking: boolean;
  error: string | null;
  remainingCalls: number;
  isQuotaExceeded: boolean;
  mode: 'cloud';
  credits: number;
}

let messageCounter = 0;
function nextId(): string {
  return `msg-${Date.now()}-${++messageCounter}`;
}

function timestamp(): string {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

interface CloudChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CloudChatRequest {
  model: string;
  messages: CloudChatMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

interface CloudChatResponse {
  id: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface UseCloudChatOptions {
  userId: string;
  agentId: string | null;
  model?: string;
  systemPrompt?: string;
  getToken: () => Promise<string | null>;
}

export function useCloudChat(options: UseCloudChatOptions): UseCloudChatResult {
  const { agentId, model = 'gpt-4o-mini', systemPrompt, getToken } = options;

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const assistantIdRef = useRef<string | null>(null);

  // Load credits on mount
  useEffect(() => {
    let cancelled = false;
    async function loadCredits() {
      const token = await getToken();
      if (!token || cancelled) return;
      try {
        const res = await fetch(`${CONFLUX_ROUTER_URL}/v1/credits`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setCredits(data.balance ?? 0);
        }
      } catch { /* non-critical */ }
    }
    loadCredits();
  }, [getToken]);

  const sendMessage = useCallback(async (content: string) => {
    if (!agentId) return;

    const token = await getToken();
    if (!token) {
      setError('Not authenticated — please log in');
      return;
    }

    // Add user message to UI
    const userMsg: AgentMessage = {
      id: nextId(),
      agentId: 'user',
      content,
      timestamp: timestamp(),
      type: 'user',
    };
    setMessages(prev => [...prev, userMsg]);

    // Create assistant placeholder
    const assistantId = nextId();
    assistantIdRef.current = assistantId;
    const assistantMsg: AgentMessage = {
      id: assistantId,
      agentId,
      content: '',
      timestamp: timestamp(),
      type: 'agent',
    };
    setMessages(prev => [...prev, assistantMsg]);

    setThinking(true);
    setStreaming(true);
    setError(null);

    try {
      // Build message history for the API
      const apiMessages: CloudChatMessage[] = [];
      if (systemPrompt) {
        apiMessages.push({ role: 'system', content: systemPrompt });
      }
      // Add conversation history (last 20 messages)
      const history = messages.slice(-20);
      for (const m of history) {
        apiMessages.push({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.content,
        });
      }
      // Add current message
      apiMessages.push({ role: 'user', content });

      const request: CloudChatRequest = {
        model,
        messages: apiMessages,
        max_tokens: 4096,
        temperature: 0.7,
        stream: true, // ENABLE STREAMING
      };

      const res = await fetch(`${CONFLUX_ROUTER_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        setStreaming(false); // Stop streaming on error
        setThinking(false);
        const errData = await res.json().catch(() => ({}));
        if (res.status === 402) {
          setError('Insufficient credits — upgrade or purchase more');
          setCredits(errData.balance ?? 0);
        } else {
          setError(errData.message ?? `API error: ${res.status}`);
        }
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId && m.content === ''
              ? { ...m, content: `[Error: ${errData.message ?? res.status}]` }
              : m
          )
        );
        return;
      }

      setThinking(false);

      // Read the SSE stream
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6); // Remove "data: " prefix
          if (data === '[DONE]') {
            setStreaming(false); // Stream finished
            break;
          }

          try {
            const chunk = JSON.parse(data);
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              // Update the assistant message incrementally
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: fullContent }
                    : m
                )
              );
            }
          } catch { /* skip malformed chunks */ }
        }
      }

      // If no content received but stream ended without error, show a fallback
      if (fullContent === '' && error === null) {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId && m.content === ''
              ? { ...m, content: '[No response received]' }
              : m
          )
        );
      }

      // Read credits from response headers
      const creditsCharged = res.headers.get('X-Conflux-Credits-Charged');
      if (creditsCharged) {
        setCredits(prev => Math.max(0, prev - parseInt(creditsCharged, 10)));
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Chat failed';
      setError(msg);
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId && m.content === ''
            ? { ...m, content: `[Error: ${msg}]` }
            : m
        )
      );
    }
  }, [agentId, model, systemPrompt, messages, getToken]);

  return {
    messages,
    sendMessage,
    streaming,
    thinking,
    error,
    remainingCalls: credits,
    isQuotaExceeded: credits <= 0,
    mode: 'cloud',
    credits,
  };
}
