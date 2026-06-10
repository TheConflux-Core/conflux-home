// Conflux Home — Hearth Nutritionist Hook
// Body-health AI companion with its own backend stack.
// Separate from Echo Counselor — has its own tables and commands.

import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface HearthNutritionMessage {
  id: string;
  session_id: string;
  role: 'user' | 'counselor' | 'system';
  content: string;
  timestamp: string;
}

export interface HearthNutritionSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  message_count: number;
  created_at: string;
}

function makeId(): string {
  return `hearth-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useHearthNutritionist() {
  const [sessions, setSessions] = useState<HearthNutritionSession[]>([]);
  const [currentSession, setCurrentSession] = useState<HearthNutritionSession | null>(null);
  const [messages, setMessages] = useState<HearthNutritionMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // ── Start Session ──────────────────────────────────────────
  const startSession = useCallback(async () => {
    setLoading(true);
    try {
      const session = await invoke<HearthNutritionSession>('hearth_nutritionist_start_session', { req: {} });
      setSessions(prev => [session, ...prev]);
      setCurrentSession(session);
      setMessages([]);
    } catch (e) {
      console.error('[HearthNutritionist] startSession failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Send Message ──────────────────────────────────────────
  const sendMessage = useCallback(async (content: string) => {
    let sessionId = currentSession?.id;
    if (!sessionId) {
      // Auto-start a session if needed
      await startSession();
      sessionId = currentSession?.id;
      if (!sessionId) return; // still no session — bail
    }
    if (sending) return;
    setSending(true);
    try {
      // Add user message immediately (optimistic)
      const userMsg: HearthNutritionMessage = {
        id: makeId(),
        session_id: sessionId,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMsg]);

      // Call Hearth's own backend command (uses HEARTH_SYSTEM_PROMPT)
      const response = await invoke<{ id: string; session_id: string; role: string; content: string; timestamp: string }>(
        'hearth_nutritionist_send_message',
        { session_id: sessionId, content },
      );

      // Add Hearth's response
      const hearthMsg: HearthNutritionMessage = {
        id: response.id,
        session_id: response.session_id,
        role: 'counselor' as const,
        content: response.content,
        timestamp: response.timestamp,
      };
      setMessages(prev => [...prev, hearthMsg]);

      // Update session message count locally
      setSessions(prev =>
        prev.map((s: HearthNutritionSession) => s.id === sessionId ? { ...s, message_count: s.message_count + 2 } : s)
      );
      setCurrentSession(prev =>
        prev ? { ...prev, message_count: prev.message_count + 2 } : prev
      );
    } catch (e) {
      console.error('[HearthNutritionist] sendMessage failed:', e);
      throw e;
    } finally {
      setSending(false);
    }
  }, [currentSession, sending]);

  // ── End Session ──────────────────────────────────────────
  const endSession = useCallback(async () => {
    if (!currentSession) return;
    const sessionId = currentSession.id;

    try {
      await invoke('hearth_nutritionist_end_session', { session_id: sessionId });
    } catch (e) {
      console.error('[HearthNutritionist] endSession backend error:', e);
    }

    setSessions(prev =>
      prev.map((s: HearthNutritionSession) => s.id === sessionId ? { ...s, ended_at: new Date().toISOString(), status: 'completed' } : s)
    );
    setCurrentSession(null);
    setMessages([]);
  }, [currentSession]);

  // ── Resume a past session ────────────────────────────────
  const resumeSession = useCallback(async (session: HearthNutritionSession) => {
    setCurrentSession(session);
    setMessages([]);
    try {
      const msgs = await invoke<{ id: string; session_id: string; role: string; content: string; timestamp: string }[]>(
        'hearth_nutritionist_get_messages',
        { session_id: session.id },
      );
      setMessages(msgs.map(m => ({
        id: m.id,
        session_id: m.session_id,
        role: m.role as 'user' | 'counselor',
        content: m.content,
        timestamp: m.timestamp,
      })));
    } catch (e) {
      console.error('[HearthNutritionist] resumeSession failed:', e);
    }
  }, []);

  // ── Load messages for a past session ────────────────────
  const loadPastMessages = useCallback(async (sessionId: string): Promise<HearthNutritionMessage[]> => {
    try {
      const msgs = await invoke<{ id: string; session_id: string; role: string; content: string; timestamp: string }[]>(
        'hearth_nutritionist_get_messages',
        { session_id: sessionId },
      );
      return msgs.map(m => ({
        id: m.id,
        session_id: m.session_id,
        role: m.role as 'user' | 'counselor',
        content: m.content,
        timestamp: m.timestamp,
      }));
    } catch (e) {
      console.error('[HearthNutritionist] loadPastMessages failed:', e);
      return [];
    }
  }, []);

  return {
    sessions,
    currentSession,
    messages,
    loading,
    sending,
    startSession,
    sendMessage,
    endSession,
    resumeSession,
    loadPastMessages,
    setCurrentSession,
    setMessages,
    setSessions,
  };
}