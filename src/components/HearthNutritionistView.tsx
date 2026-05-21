// Conflux Home — Hearth Nutritionist View
// Body health AI companion — warm chat, voice, playback, past sessions

import { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { useHearthNutritionist } from '../hooks/useHearthNutritionist';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { playSuccess } from '../lib/sound';
import { HEARTH_VOICE_ID } from '../hooks/useAudioPlayer';
import '../styles/kitchen-hearth.css';

// ─── LocalStorage keys ────────────────────────────────────────────────────────
const STORAGE_KEY_ACTIVE_SESSION = 'hearth_nutritionist_active_session_id';

// ─── Types ────────────────────────────────────────────────────────────────────
type ViewMode = 'chat' | 'sessions';

export default function HearthNutritionistView() {
  const {
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
  } = useHearthNutritionist();

  const [view, setView] = useState<ViewMode>('chat');
  const [input, setInput] = useState('');
  const [voiceText, setVoiceText] = useState('');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [expandedSessionMsgs, setExpandedSessionMsgs] = useState<any[]>([]);
  const [loadingExpanded, setLoadingExpanded] = useState(false);
  const [startingSession, setStartingSession] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audio = useAudioPlayer();
  const voice = useVoiceInput({ onTranscription: (text) => setVoiceText(text) });
  const isFirstRender = useRef(true);

  // Merge voice into input
  useEffect(() => {
    if (voiceText) {
      setInput(prev => prev ? prev + ' ' + voiceText : voiceText);
      setVoiceText('');
    }
  }, [voiceText]);

  // Scroll to bottom on new messages — disabled
  useEffect(() => {
    // no-op: auto-scroll disabled
  }, [messages]);

  // ── Restore a stored session ─────────────────────────────────────
  const handleRestoreSession = async (sessionId: string) => {
    setStartingSession(true);
    try {
      const allSessions: any[] = await invoke('hearth_nutritionist_get_sessions', {});
      const existing = allSessions.find((s: any) => s.id === sessionId);
      if (existing && existing.status === 'active') {
        setCurrentSession(existing);
        const msgs = await loadPastMessages(sessionId);
        setMessages(msgs);
      } else {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION);
        handleStartSession();
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION);
      handleStartSession();
    } finally {
      setStartingSession(false);
    }
  };

  // ── Start a new session ──────────────────────────────────────────
  const handleStartSession = useCallback(async () => {
    if (startingSession) return;
    setStartingSession(true);
    try {
      await startSession();
    } finally {
      setStartingSession(false);
    }
  }, [startSession, startingSession]);

  // ── Auto-start / restore session when switching to Chat tab ───
  useEffect(() => {
    if (view !== 'chat') return;
    const storedId = localStorage.getItem(STORAGE_KEY_ACTIVE_SESSION);
    if (storedId && !currentSession && !startingSession) {
      handleRestoreSession(storedId);
    } else if (!currentSession && !loading && !startingSession) {
      handleStartSession();
    }
  }, [view, currentSession, loading, startingSession, handleRestoreSession, handleStartSession]);

  // ── Persist active session ID ─────────────────────────────────────
  useEffect(() => {
    if (currentSession?.id) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_SESSION, currentSession.id);
    }
  }, [currentSession?.id]);

  const handleSubmit = async () => {
    if (!input.trim() || sending) return;
    const content = input.trim();
    flushSync(() => { setInput(''); });
    try {
      await sendMessage(content);
      playSuccess();
    } catch (e) {
      console.error('Send failed:', e);
      setInput(content);
    }
  };

  const handleEndSession = async () => {
    if (!currentSession) return;
    const sessionIdToEnd = currentSession.id;
    try {
      await endSession();
    } catch (e) {
      console.error('[HearthNutritionist] endSession:', e);
    }
    localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION);
    setCurrentSession(null);
    setMessages([]);
    handleViewChange('sessions');
  };

  const handleViewChange = async (mode: ViewMode) => {
    setView(mode);
    if (mode === 'sessions') {
      try {
        const allSessions: any[] = await invoke('hearth_nutritionist_get_sessions', {});
        setSessions(allSessions);
      } catch (e) {
        console.error('[HearthNutritionist] loadSessions:', e);
      }
    }
  };

  const handleExpandSession = async (sessionId: string) => {
    if (expandedSessionId === sessionId) {
      setExpandedSessionId(null);
      setExpandedSessionMsgs([]);
      return;
    }
    setExpandedSessionId(sessionId);
    setLoadingExpanded(true);
    const msgs = await loadPastMessages(sessionId);
    setExpandedSessionMsgs(msgs);
    setLoadingExpanded(false);
  };

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (ts: string) => new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const tips = [
    { emoji: '🔥', title: 'Protein First', body: 'Each meal: palm-sized protein. Keeps you fuller and preserves muscle.' },
    { emoji: '🥬', title: 'Eat the Rainbow', body: '3 colors of veg per day — especially leafy greens and orange roots.' },
    { emoji: '💧', title: 'Hydration First', body: 'Glass of water 15 min before eating. Improves digestion, cuts overeating.' },
    { emoji: '⏰', title: 'Meal Timing', body: 'Eat within 2h of waking. Keep dinner light, finish 3h before sleep.' },
    { emoji: '🧂', title: 'Salt in the Pan', body: 'Lightly salt as you cook — enhances flavor without the table sodium hit.' },
    { emoji: '🥜', title: 'Smart Snacking', body: 'A small handful of nuts gives healthy fats, protein, and stable energy.' },
  ];

  return (
    <div className="hearth-nutritionist-view">
      {/* Header */}
      <div className="hearth-nutritionist-header">
        <div className="hearth-nutritionist-title-row">
          <h2 className="hearth-nutritionist-title">🥗 Hearth Nutritionist</h2>
          <p className="hearth-nutritionist-subtitle">Your body's wellness companion</p>
        </div>
        <div className="hearth-nutritionist-tabs">
          <button
            className={`hearth-nutritionist-tab ${view === 'chat' ? 'active' : ''}`}
            onClick={() => handleViewChange('chat')}
          >
            💬 Chat
          </button>
          <button
            className={`hearth-nutritionist-tab ${view === 'sessions' ? 'active' : ''}`}
            onClick={() => handleViewChange('sessions')}
          >
            📚 Sessions
          </button>
        </div>
      </div>

      {/* ═══ CHAT VIEW ═══ */}
      {view === 'chat' && (
        <div className="hearth-nutritionist-chat-layout">
          {/* Left: Tips sidebar */}
          <div className="hearth-nutritionist-tips-col">
            <div className="hearth-nutritionist-tips-header">Daily Nutrition Tips</div>
            {tips.map((tip, i) => (
              <div key={i} className="hearth-nutritionist-tip-card">
                <span className="hearth-nutritionist-tip-emoji">{tip.emoji}</span>
                <div className="hearth-nutritionist-tip-body">
                  <span className="hearth-nutritionist-tip-title">{tip.title}</span>
                  <p className="hearth-nutritionist-tip-text">{tip.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Chat window */}
          <div className="hearth-nutritionist-chat-col">
            {/* Chat Messages */}
            <div className="hearth-nutritionist-chat-messages">
              {loading || startingSession ? (
                <div className="hearth-nutritionist-loading">
                  <div className="hearth-spinner" />
                  <span>Starting session...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="hearth-nutritionist-empty-chat">
                  <span className="hearth-empty-emoji">🥗</span>
                  <p>Ask Hearth about nutrition, meal planning, or your health goals</p>
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <motion.div
                      key={msg.id}
                      className={`hearth-nutritionist-msg ${msg.role === 'user' ? 'user' : 'counselor'}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="hearth-msg-bubble">
                        <div className="hearth-msg-content">
                          {msg.content.split('\n').map((line, i) => (
                            <span key={i}>{line}{i < msg.content.split('\n').length - 1 && <br />}</span>
                          ))}
                        </div>
                        <div className="hearth-msg-meta">
                          {msg.role === 'user' ? 'You' : 'Hearth'} · {formatTime(msg.timestamp)}
                        </div>
                      </div>
                      {msg.role === 'counselor' && (
                        <button
                          className={`hearth-msg-speak-btn ${audio.playingId === msg.id ? 'playing' : ''}`}
                          onClick={() => audio.playingId === msg.id ? audio.stop() : audio.speak(msg.content, msg.id, HEARTH_VOICE_ID)}
                          title={audio.playingId === msg.id ? 'Stop playback' : 'Hear Hearth'}
                        >
                          {audio.playingId === msg.id ? '⏹' : '▶'}
                        </button>
                      )}
                    </motion.div>
                  ))}
                  {sending && (
                    <div className="hearth-nutritionist-msg counselor">
                      <div className="hearth-msg-bubble">
                        <div className="typing-indicator">
                          <span /><span /><span />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="hearth-nutritionist-input-area">
              <textarea
                className="hearth-nutritionist-textarea"
                placeholder="Ask Hearth about nutrition, meals, or healthy habits..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                disabled={sending}
                rows={1}
              />
              <div className="hearth-nutritionist-input-actions">
                <button
                  className="hearth-mic-btn"
                  onClick={voice.toggleListening}
                  disabled={sending}
                  title={voice.isListening ? 'Stop recording' : 'Voice input'}
                >
                  {voice.isListening ? '⏹' : voice.isTranscribing ? '⏳' : '🎤'}
                </button>
                <button
                  className="hearth-end-session-btn"
                  onClick={handleEndSession}
                >
                  End & Start New
                </button>
                <button
                  className="hearth-send-btn"
                  onClick={handleSubmit}
                  disabled={!input.trim() || sending}
                >
                  {sending ? '✨...' : '✨ Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SESSIONS VIEW ═══ */}
      {view === 'sessions' && (
        <div className="hearth-nutritionist-sessions-view">
          <div className="hearth-sessions-intro">
            <h3>Your Nutrition Sessions</h3>
            <p>Tap any session to review your conversation with Hearth.</p>
          </div>
          {sessions.length === 0 ? (
            <div className="hearth-sessions-empty">
              <span className="hearth-empty-emoji">📚</span>
              <p>No sessions yet. Start chatting and your conversations will appear here.</p>
            </div>
          ) : (
            sessions.map(session => {
              const isExpanded = expandedSessionId === session.id;
              return (
                <motion.div
                  key={session.id}
                  className="hearth-session-card"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div
                    className="hearth-session-card-header"
                    onClick={() => handleExpandSession(session.id)}
                  >
                    <div className="hearth-session-date">
                      {formatDate(session.created_at)}
                      {session.ended_at && (
                        <span className="hearth-session-duration">
                          {' '}· {Math.round((new Date(session.ended_at).getTime() - new Date(session.created_at).getTime()) / 60000)} min
                        </span>
                      )}
                    </div>
                    <div className="hearth-session-meta">
                      {session.message_count} messages · {isExpanded ? '▲' : '▼'}
                    </div>
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        className="hearth-session-messages"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        {loadingExpanded ? (
                          <div className="hearth-session-loading">Loading...</div>
                        ) : expandedSessionMsgs.length === 0 ? (
                          <div className="hearth-session-empty">No messages in this session.</div>
                        ) : (
                          expandedSessionMsgs.map(msg => (
                            <div key={msg.id} className={`hearth-session-msg ${msg.role === 'user' ? 'user' : 'counselor'}`}>
                              <div className="hearth-session-msg-role">
                                {msg.role === 'user' ? 'You' : 'Hearth'} · {formatTime(msg.timestamp)}
                              </div>
                              <div className="hearth-session-msg-content">{msg.content}</div>
                            </div>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}