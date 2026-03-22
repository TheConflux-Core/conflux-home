// Conflux Home — Agent Chat Hook
// Manages a chat session for a single agent with real streaming.

import { useState, useEffect, useCallback, useRef } from 'react';
import { GatewayClient, ChatSession } from '../gateway-client';
import type { ChatMessage } from '../gateway-client';
import type { AgentMessage } from '../types';
import { getToken } from './useGateway';

const GATEWAY_URL = 'http://localhost:18789';

export interface UseAgentChatResult {
  messages: AgentMessage[];
  sendMessage: (content: string) => Promise<void>;
  streaming: boolean;
  thinking: boolean;
  error: string | null;
}

let messageCounter = 0;
function nextId(): string {
  return `msg-${Date.now()}-${++messageCounter}`;
}

function timestamp(): string {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function useAgentChat(agentId: string | null): UseAgentChatResult {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<ChatSession | null>(null);
  const clientRef = useRef<GatewayClient | null>(null);

  // Create client and session when agentId changes
  useEffect(() => {
    if (!agentId) {
      sessionRef.current = null;
      clientRef.current = null;
      setMessages([]);
      return;
    }

    const token = getToken();
    if (!token) return;

    const client = new GatewayClient({ baseUrl: GATEWAY_URL, token });
    clientRef.current = client;
    const session = client.createChatSession(agentId, { persist: false });
    sessionRef.current = session;

    // Set system message for the agent
    session.setSystemMessage(`You are ${agentId}, an OpenClaw agent. Be helpful, concise, and in-character.`);

    // Reset messages when agent changes
    setMessages([]);
    setError(null);
  }, [agentId]);

  const sendMessage = useCallback(async (content: string) => {
    const session = sessionRef.current;
    if (!session || !agentId) return;

    // Add user message to UI
    const userMsg: AgentMessage = {
      id: nextId(),
      agentId: 'user',
      content,
      timestamp: timestamp(),
      type: 'user',
    };
    setMessages(prev => [...prev, userMsg]);

    // Create a placeholder assistant message for streaming
    const assistantId = nextId();
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
      await session.sendAndStream(content, {
        onStart() {
          setThinking(false);
        },
        onChunk(text) {
          // Incrementally update the assistant message
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: m.content + text }
                : m
            )
          );
        },
        onError(err) {
          setError(err.message);
          setThinking(false);
          setStreaming(false);
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMsg);
      // Update the assistant message to show the error
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId && m.content === ''
            ? { ...m, content: `[Error: ${errorMsg}]` }
            : m
        )
      );
    } finally {
      setThinking(false);
      setStreaming(false);
    }
  }, [agentId]);

  return { messages, sendMessage, streaming, thinking, error };
}
