// Conflux Home — Speak to Pulse Tab
// Voice + chat financial advisor with session persistence
// Layout: left health banner + right chat panel (always open)

import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { flushSync } from 'react-dom';
import '../styles/pulse-tabs.css';

// ─── LocalStorage keys ────────────────────────────────────────────────────────
const STORAGE_KEY_ACTIVE_SESSION = 'pulse_active_session_id';

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = 'session' | 'sessions';

interface ChatMessage {
  id: string;
  role: 'user' | 'pulse';
  content: string;
  timestamp: Date;
  hasReaction?: boolean;
}

interface HealthMetrics {
  score: number;
  budgetStatus: 'on-track' | 'over' | 'under';
  savingsRate: 'excellent' | 'fair' | 'low';
  spendingTrend: 'up' | 'down' | 'stable';
  investmentProgress: 'ahead' | 'on-track' | 'behind';
}

interface MarketStatus {
  isOpen: boolean;
  label: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const QUICK_SUGGESTIONS: { text: string; icon: string }[] = [
  { text: "Can I afford a $30K car?", icon: '💰' },
  { text: "How am I doing financially?", icon: '📊' },
  { text: "What should I do with my tax refund?", icon: '🎯' },
  { text: "Give me a financial health check", icon: '🩺' },
  { text: "Show my spending breakdown", icon: '📈' },
  { text: "What's my financial health score?", icon: '💹' },
];

const REACTION_KEYWORDS = ['great', 'excellent', 'on track', 'well done', 'congratulations', 'goal reached', '+', 'awesome', 'fantastic', 'perfect'];

// ─── Financial Health Score — Vertical Banner ───────────────────────────────

function FinancialHealthBanner({ metrics }: { metrics: HealthMetrics }) {
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const dashLen = (metrics.score / 100) * circ;
  const isExcellent = metrics.score >= 75;
  const isFair = metrics.score >= 45 && metrics.score < 75;
  const scoreColor = isExcellent ? '#10b981' : isFair ? '#f59e0b' : '#ef4444';
  const scoreLabel = isExcellent ? 'Excellent' : isFair ? 'Fair' : 'Needs Attention';

  return (
    <div className="pulse-health-banner">
      {/* Ring */}
      <div className="banner-ring-wrap">
        <svg width="90" height="90" viewBox="0 0 90 90" className="banner-ring-svg">
          <circle cx="45" cy="45" r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
          <circle
            cx="45" cy="45" r={radius}
            fill="none"
            stroke={scoreColor}
            strokeWidth="6"
            strokeDasharray={`${dashLen} ${circ}`}
            strokeDashoffset={circ / 4}
            strokeLinecap="round"
            transform="rotate(-90 45 45)"
            className="pulse-score-arc"
            style={{ filter: `drop-shadow(0 0 8px ${scoreColor}90)` }}
          />
          <text x="45" y="41" textAnchor="middle" fill={scoreColor} fontSize="20" fontWeight={900}
            fontFamily="'JetBrains Mono', monospace">
            {metrics.score}
          </text>
          <text x="45" y="54" textAnchor="middle" fill="rgba(236,253,245,0.4)" fontSize="7.5" fontWeight={700}>
            / 100
          </text>
        </svg>
        <div className="banner-ring-glow" style={{ background: `radial-gradient(circle, ${scoreColor}20 0%, transparent 70%)` }} />
      </div>

      {/* Label */}
      <div className="banner-score-label">
        <span className="banner-label-top">Financial</span>
        <span className="banner-label-bottom">Health</span>
      </div>

      {/* Status */}
      <div className="banner-status" style={{ color: scoreColor }}>{scoreLabel}</div>

      {/* Divider */}
      <div className="banner-divider" />

      {/* Metric pills — stacked vertically */}
      <div className="banner-metrics">
        <MetricPill label="Budget" value={metrics.budgetStatus.replace('-', ' ')} good={metrics.budgetStatus !== 'over'} />
        <MetricPill label="Savings" value={metrics.savingsRate} good={metrics.savingsRate === 'excellent'} />
        <MetricPill label="Spending" value={metrics.spendingTrend} good={metrics.spendingTrend !== 'up'} />
        <MetricPill label="Invest" value={metrics.investmentProgress.replace('-', ' ')} good={metrics.investmentProgress !== 'behind'} />
      </div>
    </div>
  );
}

function MetricPill({ label, value, good }: { label: string; value: string; good: boolean }) {
  const color = good ? '#10b981' : '#f59e0b';
  return (
    <div className="banner-metric-pill">
      <span className="banner-pill-label">{label}</span>
      <span className="banner-pill-value" style={{ color }}>{value}</span>
    </div>
  );
}

// ─── Pulse Reaction ──────────────────────────────────────────────────────────

function PulseReaction({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="pulse-reaction" aria-hidden="true">
      <span className="reaction-particle p1">✦</span>
      <span className="reaction-particle p2">✦</span>
      <span className="reaction-particle p3">✧</span>
      <span className="reaction-particle p4">✦</span>
      <span className="reaction-particle p5">✧</span>
      <span className="reaction-emote">✨</span>
    </div>
  );
}

// ─── Voice Visualizer ──────────────────────────────────────────────────────

function VoiceVisualizer({ active }: { active: boolean }) {
  return (
    <div className={`voice-visualizer-wrap ${active ? 'active' : ''}`}>
      <div className="voice-rings">
        <div className="voice-ring ring-1" />
        <div className="voice-ring ring-2" />
        <div className="voice-ring ring-3" />
      </div>
      <div className="sound-wave-bars">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`sound-bar bar-${i}`} style={{ animationDelay: `${i * 0.07}s` }} />
        ))}
      </div>
    </div>
  );
}

// ─── Market Status ──────────────────────────────────────────────────────────

function MarketStatusBadge({ status }: { status: MarketStatus }) {
  return (
    <div className="market-status-badge">
      <span className={`market-dot ${status.isOpen ? 'open' : 'closed'}`} />
      <span className="market-label">Market {status.label}</span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function SpeakToPulseTab() {
  const [view, setView] = useState<ViewMode>('session');
  const [input, setInput] = useState('');
  const [voiceText, setVoiceText] = useState('');
  const [sending, setSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showReaction, setShowReaction] = useState(false);
  const [marketStatus, setMarketStatus] = useState<MarketStatus>({ isOpen: true, label: 'OPEN' });
  const [healthMetrics] = useState<HealthMetrics>({
    score: 78,
    budgetStatus: 'on-track',
    savingsRate: 'excellent',
    spendingTrend: 'down',
    investmentProgress: 'on-track',
  });

  // Session state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [expandedSessionMessages, setExpandedSessionMessages] = useState<ChatMessage[]>([]);
  const [loadingExpanded, setLoadingExpanded] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [startingSession, setStartingSession] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voice = useVoiceInput({ onTranscription: (text) => setVoiceText(text) });

  // Update market status periodically
  useEffect(() => {
    const checkMarket = () => {
      const now = new Date();
      const hour = now.getUTCHours() - 5; // EST
      const day = now.getUTCDay();
      const isWeekday = day >= 1 && day <= 5;
      const isMarketHour = hour >= 9.5 && hour < 16;
      setMarketStatus({ isOpen: isWeekday && isMarketHour, label: isWeekday && isMarketHour ? 'OPEN' : 'CLOSED' });
    };
    checkMarket();
    const interval = setInterval(checkMarket, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Merge voice into input
  useEffect(() => {
    if (voiceText) {
      setInput(prev => prev ? prev + ' ' + voiceText : voiceText);
      setVoiceText('');
    }
  }, [voiceText]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── Auto-start / restore session ────────────────────────
  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEY_ACTIVE_SESSION);
    if (storedId && !currentSessionId && !startingSession) {
      handleRestoreSession(storedId);
    } else if (!storedId && !currentSessionId && !startingSession) {
      handleStartSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Restore a stored session ───────────────────────────
  const handleRestoreSession = async (sessionId: string) => {
    setStartingSession(true);
    setLoadingSession(true);
    try {
      const sessions: any[] = await invoke('pulse_get_sessions', { limit: 100 });
      const existing = sessions.find((s: any) => s.id === sessionId);
      if (existing && existing.status === 'active') {
        setCurrentSessionId(sessionId);
        const msgs: any[] = await invoke('pulse_get_messages', { session_id: sessionId });
        setChatMessages(msgs.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.timestamp),
        })));
      } else {
        // Session ended or missing — clear storage and start fresh
        localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION);
        handleStartSession();
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION);
      handleStartSession();
    } finally {
      setLoadingSession(false);
      setStartingSession(false);
    }
  };

  const shouldReact = (text: string) => {
    const lower = text.toLowerCase();
    return REACTION_KEYWORDS.some(kw => lower.includes(kw));
  };

  // ── Start a new session ────────────────────────────────
  const handleStartSession = useCallback(async () => {
    if (startingSession) return;
    setStartingSession(true);
    setLoadingSession(true);
    try {
      const session = await invoke<any>('pulse_start_session');
      setCurrentSessionId(session.id);
      localStorage.setItem(STORAGE_KEY_ACTIVE_SESSION, session.id);
      const msgs: any[] = await invoke('pulse_get_messages', { session_id: session.id });
      setChatMessages(msgs.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp),
      })));
    } catch (e) {
      console.error('[SpeakToPulse] startSession:', e);
    } finally {
      setLoadingSession(false);
      setStartingSession(false);
    }
  }, [startingSession]);

  // ── End session ────────────────────────────────────────
  const handleEndSession = async () => {
    if (!currentSessionId) return;
    const sessionIdToEnd = currentSessionId;
    try {
      await invoke('pulse_end_session', { session_id: sessionIdToEnd });
    } catch (e) {
      console.error('[SpeakToPulse] endSession:', e);
    }
    localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION);
    setCurrentSessionId(null);
    setChatMessages([]);
    setView('sessions');
    handleViewChange('sessions');
  };

  // ── Submit message ────────────────────────────────────
  const handleSubmit = async () => {
    if (!input.trim() || sending || !currentSessionId) return;
    const content = input.trim();
    flushSync(() => { setInput(''); });
    setShowReaction(false);

    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMsg]);
    setSending(true);

    try {
      const reply = await invoke<string>('pulse_chat', { req: { message: content } });
      const reaction = shouldReact(reply);
      if (reaction) setShowReaction(true);
      const pulseMsg: ChatMessage = {
        id: `temp-${Date.now()}-p`,
        role: 'pulse',
        content: reply,
        timestamp: new Date(),
        hasReaction: reaction,
      };
      setChatMessages(prev => [...prev, pulseMsg]);

      const now = new Date().toISOString();
      await invoke('pulse_save_message', {
        session_id: currentSessionId,
        role: 'user',
        content,
        timestamp: userMsg.timestamp.toISOString(),
      });
      await invoke('pulse_save_message', {
        session_id: currentSessionId,
        role: 'pulse',
        content: reply,
        timestamp: pulseMsg.timestamp.toISOString(),
      });
      await invoke('pulse_increment_session_count', { session_id: currentSessionId });
    } catch {
      const errMsg: ChatMessage = {
        id: `temp-${Date.now()}-e`,
        role: 'pulse',
        content: "Sorry, I hit a snag. Try again in a moment.",
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleSuggestion = async (text: string) => {
    setInput(text);
    setTimeout(() => handleSubmit(), 100);
  };

  const handleStartListening = () => {
    setIsListening(true);
    voice.startListening();
  };

  const handleStopListening = () => {
    setIsListening(false);
    voice.stopListening();
  };

  const handleViewChange = async (mode: ViewMode) => {
    setView(mode);
    if (mode === 'sessions') {
      const s = await invoke<any[]>('pulse_get_sessions', { limit: 20 });
      setPastSessions(s);
    }
  };

  const handleExpandSession = async (sessionId: string) => {
    if (expandedSessionId === sessionId) {
      setExpandedSessionId(null);
      setExpandedSessionMessages([]);
      return;
    }
    setExpandedSessionId(sessionId);
    setLoadingExpanded(true);
    try {
      const msgs: any[] = await invoke('pulse_get_messages', { session_id: sessionId });
      setExpandedSessionMessages(msgs.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp),
      })));
    } catch {
      setExpandedSessionMessages([]);
    } finally {
      setLoadingExpanded(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const formatDuration = (started: string, ended: string | null) => {
    const start = new Date(started).getTime();
    const end = ended ? new Date(ended).getTime() : Date.now();
    const mins = Math.round((end - start) / 60000);
    return `${mins} min`;
  };

  // ── Tab Navigation ─────────────────────────────────────
  const tabs: { id: ViewMode; label: string; icon: string }[] = [
    { id: 'session', label: 'Session', icon: '💬' },
    { id: 'sessions', label: 'History', icon: '📚' },
  ];

  return (
    <div className="speak-to-pulse">
      {isListening && <div className="waveform-bg" />}

      {/* ── LEFT: Financial Health Banner ──────────────────── */}
      <FinancialHealthBanner metrics={healthMetrics} />

      {/* ── RIGHT: Chat Panel ─────────────────────────────── */}
      <div className="pulse-chat-panel">

        {/* Header */}
        <div className="pulse-chat-header">
          <div className="pulse-chat-title">
            <span className="pulse-chat-title-icon">💹</span>
            <span className="pulse-chat-title-text">Pulse</span>
            <span className="pulse-chat-subtitle">Financial Advisor</span>
          </div>
          <MarketStatusBadge status={marketStatus} />
        </div>

        {/* View Tabs */}
        <div className="pulse-view-tabs">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`pulse-view-tab ${view === t.id ? 'active' : ''}`}
              onClick={() => handleViewChange(t.id)}
            >
              <span className="pulse-view-tab-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ═══ SESSION VIEW ═══ */}
        {view === 'session' && (
          <div className="pulse-session-view">
            {/* Chat History — always visible, scrollable */}
            <div className="chat-history">
              {loadingSession ? (
                <div className="pulse-loading-state">
                  <div className="pulse-spinner" />
                  <span>Starting session...</span>
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="chat-empty-state">
                  <div className="chat-empty-icon">💹</div>
                  <div className="chat-empty-title">Your financial advisor is ready</div>
                  <div className="chat-empty-sub">Ask anything — from budgets to investments, Pulse has the full picture.</div>
                </div>
              ) : (
                <>
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`chat-message ${msg.role}`}>
                      {msg.role === 'pulse' && (
                        <div className="pulse-avatar">💹</div>
                      )}
                      <div className="message-bubble-wrap">
                        <div className="message-bubble">
                          {msg.role === 'pulse' && (
                            <div className="message-watermark" aria-hidden="true">💹</div>
                          )}
                          <div className="message-text">{msg.content}</div>
                          <div className="message-time">{formatTime(msg.timestamp)}</div>
                        </div>
                        <PulseReaction visible={!!(msg.hasReaction && msg.id === chatMessages[chatMessages.length - 1]?.id && showReaction)} />
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="chat-message pulse">
                      <div className="pulse-avatar">💹</div>
                      <div className="message-bubble-wrap">
                        <div className="message-bubble">
                          <div className="typing-indicator">
                            <span /><span /><span />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Quick Suggestions */}
            {!sending && chatMessages.length === 0 && (
              <div className="quick-suggestions">
                {QUICK_SUGGESTIONS.map(s => (
                  <button key={s.text} className="suggestion-chip" onClick={() => handleSuggestion(s.text)}>
                    <span className="chip-icon">{s.icon}</span>
                    <span className="chip-text">{s.text}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar — always at bottom */}
            <div className="chat-input-bar">
              <input
                className="chat-input"
                placeholder="Ask Pulse anything about your finances..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                disabled={sending || loadingSession}
              />
              <button
                className={`voice-btn ${isListening ? 'listening' : ''}`}
                onMouseDown={handleStartListening}
                onMouseUp={handleStopListening}
                onMouseLeave={handleStopListening}
                title="Hold to speak"
                disabled={sending || loadingSession}
              >
                <VoiceVisualizer active={isListening} />
                {!isListening && <span className="mic-icon">🎤</span>}
              </button>
              <button
                className="send-btn"
                onClick={handleSubmit}
                disabled={!input.trim() || sending || loadingSession}
              >
                ➤
              </button>
              {currentSessionId && (
                <button
                  className="end-session-btn"
                  onClick={handleEndSession}
                  title="End session"
                >
                  End
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══ SESSIONS HISTORY VIEW ═══ */}
        {view === 'sessions' && (
          <div className="pulse-sessions-view">
            <div className="pulse-sessions-intro">
              <h3>Your Sessions</h3>
              <p>Every conversation with Pulse — tap to read through it.</p>
            </div>

            {pastSessions.length === 0 ? (
              <div className="pulse-sessions-empty">
                <p>No sessions yet. Ask Pulse something to get started.</p>
              </div>
            ) : (
              <div className="pulse-sessions-list">
                {pastSessions.map(session => {
                  const isExpanded = expandedSessionId === session.id;
                  return (
                    <div key={session.id} className={`pulse-session-card ${isExpanded ? 'is-active' : ''}`}>
                      <div
                        className="pulse-session-card-header"
                        onClick={() => handleExpandSession(session.id)}
                      >
                        <div className="pulse-session-card-date">
                          {formatDate(session.started_at)}
                          {session.ended_at && (
                            <span className="pulse-session-duration">
                              {' '}· {formatDuration(session.started_at, session.ended_at)}
                            </span>
                          )}
                        </div>
                        <div className="pulse-session-card-meta">
                          {session.message_count} msgs · {session.status} {isExpanded ? '▲' : '▼'}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="pulse-session-card-messages">
                          {loadingExpanded ? (
                            <div className="pulse-session-loading">Loading...</div>
                          ) : expandedSessionMessages.length === 0 ? (
                            <div className="pulse-session-empty-msgs">No messages.</div>
                          ) : (
                            expandedSessionMessages.map(msg => (
                              <div key={msg.id} className={`pulse-session-msg ${msg.role}`}>
                                <div className="pulse-session-msg-role">
                                  {msg.role === 'user' ? 'You' : 'Pulse'} · {formatTime(msg.timestamp)}
                                </div>
                                <div className="pulse-session-msg-content">{msg.content}</div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}