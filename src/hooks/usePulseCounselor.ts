// usePulseCounselor — Hook for Pulse Financial Advisor sessions
// Manages start_session, send_message, end_session, get_messages, get_sessions

import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface PulseSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  message_count: number;
  summary: string | null;
}

export interface PulseMessage {
  id: string;
  session_id: string;
  role: 'user' | 'pulse';
  content: string;
  timestamp: string;
}

// Simple in-memory store for a pending flush when session ends.
// We optimistically show messages in the UI and flush to DB when the
// user explicitly ends the session.
interface PendingFlush {
  sessionId: string;
  messages: PulseMessage[];
}

export function usePulseCounselor() {
  const [currentSession, setCurrentSession] = useState<PulseSession | null>(null);
  const [messages, setMessages] = useState<PulseMessage[]>([]);
  const [sessions, setSessions] = useState<PulseSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const pendingRef = { current: [] as PulseMessage[] };

  // ── Start a new session ─────────────────────────────────
  const startSession = useCallback(async () => {
    setLoading(true);
    try {
      const session = await invoke<PulseSession>('pulse_start_session');
      const msgs = await invoke<PulseMessage[]>('pulse_get_messages', { session_id: session.id });
      setCurrentSession(session);
      setMessages(msgs);
      return session;
    } catch (e) {
      console.error('[usePulseCounselor] startSession:', e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Send a message ────────────────────────────────────────
  const sendMessage = useCallback(async (sessionId: string, content: string) => {
    setSending(true);
    try {
      // Optimistic: add user message immediately
      const userMsg: PulseMessage = {
        id: `temp-${Date.now()}`,
        session_id: sessionId,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMsg]);
      pendingRef.current.push(userMsg);

      // Get LLM response via pulse_chat
      const reply = await invoke<string>('pulse_chat', { req: { message: content } });

      const pulseMsg: PulseMessage = {
        id: `temp-${Date.now()}-p`,
        session_id: sessionId,
        role: 'pulse',
        content: reply,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, pulseMsg]);
      pendingRef.current.push(pulseMsg);

      return pulseMsg;
    } catch (e) {
      console.error('[usePulseCounselor] sendMessage:', e);
      throw e;
    } finally {
      setSending(false);
    }
  }, []);

  // ── End the current session ────────────────────────────────
  const endSession = useCallback(async (sessionId: string) => {
    try {
      // Persist any pending messages to DB via raw SQL
      // (Each message insert is a separate call — acceptable for session-end)
      for (const msg of pendingRef.current) {
        try {
          await invoke('pulse_save_message', {
            session_id: msg.session_id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
          });
        } catch (e) {
          // Non-fatal; message was already shown in UI
          console.warn('[usePulseCounselor] save message failed:', e);
        }
      }
      pendingRef.current = [];

      await invoke('pulse_end_session', { session_id: sessionId });
      setCurrentSession(null);
      setMessages([]);
    } catch (e) {
      console.error('[usePulseCounselor] endSession:', e);
    }
  }, []);

  // ── Load all past sessions ────────────────────────────────
  const loadSessions = useCallback(async (limit = 20) => {
    try {
      const s = await invoke<PulseSession[]>('pulse_get_sessions', { limit });
      setSessions(s);
      return s;
    } catch (e) {
      console.error('[usePulseCounselor] loadSessions:', e);
      return [];
    }
  }, []);

  // ── Load messages for a given session ────────────────────
  const loadMessages = useCallback(async (sessionId: string) => {
    try {
      const msgs = await invoke<PulseMessage[]>('pulse_get_messages', { session_id: sessionId });
      return msgs;
    } catch (e) {
      console.error('[usePulseCounselor] loadMessages:', e);
      return [];
    }
  }, []);

  return {
    currentSession,
    messages,
    sessions,
    loading,
    sending,
    startSession,
    sendMessage,
    endSession,
    loadSessions,
    loadMessages,
    setCurrentSession,
  };
}