// Conflux Home — Echo Counselor View
// Echo: Your reflective wellness companion
// NOT a therapist. A warm, present, insightful conversation partner.

import { playSuccess } from '../lib/sound';
import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEchoCounselor } from '../hooks/useEchoCounselor';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useAudioPlayer, ECHO_VOICE_ID } from '../hooks/useAudioPlayer';
import type { EchoCounselorMessage, EchoCrisisFlag, EchoCounselorSession, EchoWeeklyLetter } from '../types';
import { ECHO_CRISIS_RESOURCES } from '../types';
import '../styles-echo-counselor.css';
import '../styles-echo-onboarding.css';
import EchoBoot from './EchoBoot';
import EchoOnboarding, { hasCompletedEchoOnboarding } from './EchoOnboarding';
import EchoTour, { hasCompletedEchoTour } from './EchoTour';

type ViewMode = 'session' | 'sessions' | 'journal' | 'tools' | 'letter';

export default function EchoCounselorView() {
  const {
    state,
    messages,
    loading,
    sending,
    crisisAlert,
    startSession,
    sendMessage,
    endSession,
    clearMessages,
    loadMessages,
    getCounselorJournal,
    dismissCrisis,
    getOpening,
    generateWeeklyLetter,
    getWeeklyLetter,
    getWeeklyLetterHistory,
    setEveningReminder,
    writeGratitude,
    getGratitudeEntries,
    completeExercise,
    getEveningReminder,
    setCurrentSessionData,
    refresh,
  } = useEchoCounselor();

  const [view, setView] = useState<ViewMode>('session');
  const [input, setInput] = useState('');
  const [journal, setJournal] = useState<EchoCounselorSession[]>([]);
  const [sessionsList, setSessionsList] = useState<EchoCounselorSession[]>([]);
  const [showCrisisResources, setShowCrisisResources] = useState(false);
  // Past session expansion (journal/sessions view)
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [expandedSessionMessages, setExpandedSessionMessages] = useState<EchoCounselorMessage[]>([]);
  const [loadingExpanded, setLoadingExpanded] = useState(false);

  // Boot → Onboarding → Tour → Main
  const [bootDone, setBootDone] = useState(() => localStorage.getItem('echo-boot-done') === 'true');
  const hasOnboarded = hasCompletedEchoOnboarding();
  const hasTakenTour = hasCompletedEchoTour();
  const [showOnboarding, setShowOnboarding] = useState(!bootDone && !hasOnboarded);
  const [showTour, setShowTour] = useState(!bootDone ? false : !hasTakenTour);

  // After onboarding starts session, switch to session tab
  const switchToSession = useCallback(() => setView('session'), []);

  // Voice input — streams transcript into the textarea
  const [voiceText, setVoiceText] = useState('');
  const voice = useVoiceInput({
    onTranscription: (text) => setVoiceText(text),
  });

  // ElevenLabs TTS — lets user hear Echo's responses
  const audio = useAudioPlayer();

  // Merge voice transcript into input when it arrives
  useEffect(() => {
    if (voiceText) {
      setInput(prev => prev ? prev + ' ' + voiceText : voiceText);
      setVoiceText('');
    }
  }, [voiceText]);

  // Load journal on first render
  useEffect(() => {
    getCounselorJournal().then(j => setJournal(j));
  }, [getCounselorJournal]);

  // Auto-start a session if none exists (only after onboarding complete)
  useEffect(() => {
    if (!bootDone || showOnboarding || loading || !state || state.current_session) return;
    startSession();
  }, [bootDone, showOnboarding, loading, state, startSession]);

  // Load messages when an existing session is restored from DB on mount
  useEffect(() => {
    if (!state?.current_session?.id) return;
    loadMessages(state.current_session.id);
  }, [state?.current_session?.id, loadMessages]);

  // Keep sessionsList in sync whenever state.recent_sessions changes
  useEffect(() => {
    if (view === 'sessions' && state?.recent_sessions) {
      setSessionsList(state.recent_sessions);
    }
  }, [view, state?.recent_sessions]);

  const handleSubmit = async () => {
    if (!input.trim() || !state?.current_session?.id) return;

    const sessionId = state.current_session.id;
    const content = input;
    setInput('');

    try {
      await sendMessage(sessionId, content);
      playSuccess();
    } catch (e) {
      console.error('Failed to send:', e);
      // Restore input on error
      setInput(content);
    }
  };

  const handleStartSession = async () => {
    await startSession();
  };

  const handleCloseSession = async () => {
    if (!state?.current_session?.id) return;
    const sessionId = state.current_session.id;
    await endSession(sessionId);
    // Reload state so recent_sessions is fresh, then switch to Sessions tab
    await refresh();
    // handleViewChange populates sessionsList from updated state.recent_sessions
    await handleViewChange('sessions');
  };

  const handleViewChange = async (mode: ViewMode) => {
    setView(mode);
    if (mode === 'journal') {
      const j = await getCounselorJournal();
      setJournal(j);
    } else if (mode === 'sessions') {
      // Sessions tab: show ALL sessions from recent_sessions (including those without reflections yet)
      // Journal tab: shows only sessions with counselor reflections
      // Always populate from state after refresh completes to ensure fresh data
      if (state?.recent_sessions) {
        setSessionsList(state.recent_sessions);
      }
    }
  };

  // Chat bubble classes
  const getBubbleClass = (msg: EchoCounselorMessage) => {
    return msg.role === 'user'
      ? 'echo-msg-user'
      : msg.role === 'counselor'
        ? 'echo-msg-counselor'
        : 'echo-msg-system';
  };

  // Format time
  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="echo-counselor-view" style={{ paddingTop: '50px', paddingBottom: '150px', paddingLeft: '121px', paddingRight: '121px' }}>
        <div className="echo-loading">Loading Echo...</div>
      </div>
    );
  }

  // Boot sequence
  if (!bootDone) {
    return <EchoBoot onComplete={() => { localStorage.setItem('echo-boot-done', 'true'); setBootDone(true); }} />;
  }

  // Onboarding (starts first session internally)
  if (showOnboarding) {
    return <EchoOnboarding onComplete={(createdSession?: EchoCounselorSession) => { if (createdSession) setCurrentSessionData(createdSession); setShowOnboarding(false); if (!hasTakenTour) setShowTour(true); }} onStartSession={switchToSession} />;
  }

  // Guided tour
  if (showTour) {
    return <EchoTour onComplete={() => setShowTour(false)} />;
  }

  return (
    <div className="echo-counselor-view" style={{ paddingTop: '50px', paddingBottom: '125px', paddingLeft: '121px', paddingRight: '121px' }}>
      {/* Crisis Alert Banner */}
      <AnimatePresence>
        {crisisAlert && (
          <motion.div
            className="echo-crisis-banner"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
          >
            <div className="echo-crisis-icon">💜</div>
            <div className="echo-crisis-text">
              <strong>Echo is concerned.</strong> The counselor detected signs of distress.
            </div>
            <button className="echo-crisis-view-resources" onClick={() => setShowCrisisResources(true)}>
              View Resources
            </button>
            <button className="echo-crisis-dismiss" onClick={dismissCrisis}>×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crisis Resources Modal */}
      <AnimatePresence>
        {showCrisisResources && (
          <motion.div
            className="echo-crisis-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCrisisResources(false)}
          >
            <motion.div
              className="echo-crisis-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <h3>🆘 Crisis Resources</h3>
              <p>You're not alone. These are available 24/7:</p>
              <div className="echo-crisis-resources-list">
                {ECHO_CRISIS_RESOURCES.map((r, i) => (
                  <div key={i} className="echo-crisis-resource">
                    <div className="echo-crisis-resource-name">{r.name}</div>
                    <div className="echo-crisis-resource-phone">{r.phone}</div>
                    <div className="echo-crisis-resource-desc">{r.description}</div>
                    <div className="echo-crisis-resource-available">{r.available}</div>
                  </div>
                ))}
              </div>
              <button className="echo-crisis-close-modal" onClick={() => setShowCrisisResources(false)}>
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="echo-counselor-header">
        <h1 className="echo-counselor-title">
          <span className="echo-counselor-emoji">🤗</span> Echo
        </h1>
        <p className="echo-counselor-subtitle">Your reflective wellness companion</p>

        {/* Tab Navigation */}
        <div className="echo-counselor-tabs">
          <button
            className={`echo-counselor-tab ${view === 'session' ? 'active' : ''}`}
            onClick={() => handleViewChange('session')}
          >
            💬 Session
          </button>
          <button
            className={`echo-counselor-tab ${view === 'sessions' ? 'active' : ''}`}
            onClick={() => handleViewChange('sessions')}
          >
            📚 Sessions
          </button>
          <button
            className={`echo-counselor-tab ${view === 'journal' ? 'active' : ''}`}
            onClick={() => handleViewChange('journal')}
          >
            📓 Journal
          </button>
          <button
            className={`echo-counselor-tab ${view === 'tools' ? 'active' : ''}`}
            onClick={() => handleViewChange('tools')}
          >
            🛠️ Tools
          </button>
          <button
            className={`echo-counselor-tab ${view === 'letter' ? 'active' : ''}`}
            onClick={() => handleViewChange('letter')}
          >
            💌 Letter
          </button>
        </div>
      </div>

      {/* ═══ SESSION VIEW ═══ */}
      {view === 'session' && (
        <div className="echo-counselor-main">
          {/* No Active Session */}
          {!state?.current_session && (
            <div className="echo-counselor-no-session">
              <div className="echo-counselor-empty-icon">🤗</div>
              <h3>Ready to talk?</h3>
              <p>
                Echo is here to listen — without judgment, without a timer, without anything to prove.
              </p>
              <button className="echo-counselor-start-btn" onClick={handleStartSession}>
                Start a Session
              </button>
            </div>
          )}

          {/* Active Session */}
          {state?.current_session && (
            <>
              {/* Chat Messages */}
              <div className="echo-counselor-chat">
                {messages.length === 0 && (
                  <div className="echo-counselor-empty-chat">
                    <div className="echo-counselor-emoji-large">🤗</div>
                    <p>Echo has started the session...</p>
                  </div>
                )}
                {messages.map(msg => (
                  <motion.div
                    key={msg.id}
                    className={`echo-counselor-message ${getBubbleClass(msg)}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="echo-counselor-msg-bubble">
                      <div className="echo-counselor-msg-content">
                        {msg.content.split('\n').map((line, i) => (
                          <span key={i}>{line}{i < msg.content.split('\n').length - 1 && <br />}</span>
                        ))}
                      </div>
                      <div className="echo-counselor-msg-meta">
                        {msg.role === 'user' ? 'You' : 'Echo'} · {formatTime(msg.timestamp)}
                      </div>
                    </div>
                    {msg.role === 'counselor' && (
                      <button
                        className={`echo-msg-speak-btn ${audio.playingId === msg.id ? 'playing' : ''}`}
                        onClick={() => audio.playingId === msg.id ? audio.stop() : audio.speak(msg.content, msg.id, ECHO_VOICE_ID)}
                        title={audio.playingId === msg.id ? 'Stop' : 'Hear Echo'}
                      >
                        {audio.playingId === msg.id ? '⏹' : '▶'}
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Input Area */}
              <div className="echo-counselor-input-area">
                <textarea
                  className="echo-counselor-textarea"
                  placeholder="Talk to Echo..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  disabled={sending}
                />
                <div className="echo-counselor-input-actions">
                  <div className="echo-counselor-session-info">
                    Session {state.current_session.id.slice(0, 8)} · {messages.length} messages
                  </div>
                  <div className="echo-counselor-buttons">
                    <button
                      className="echo-counselor-mic-btn"
                      onClick={voice.toggleListening}
                      disabled={sending}
                      title={voice.isListening ? 'Stop recording' : 'Voice input'}
                    >
                      {voice.isListening ? '⏹️' : voice.isTranscribing ? '⏳' : '🎤'}
                    </button>
                    <button
                      className="echo-counselor-end-btn"
                      onClick={handleCloseSession}
                    >
                      End Session
                    </button>
                    <button
                      className="echo-counselor-send-btn"
                      onClick={handleSubmit}
                      disabled={!input.trim() || sending}
                    >
                      {sending ? '💬...' : '💬 Send'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ SESSIONS VIEW ═══ */}
      {view === 'sessions' && (
        <div className="echo-counselor-main">
          <div className="echo-counselor-sessions-intro">
            <h3>Your Sessions</h3>
            <p>
              Every conversation you've had with Echo — tap any session to read through it.
            </p>
          </div>
          {sessionsList.length === 0 ? (
            <div className="echo-counselor-sessions-empty">
              <p>No sessions yet. Start talking to Echo and your sessions will appear here.</p>
            </div>
          ) : (
            <div className="echo-counselor-sessions-list">
              {sessionsList.map(session => {
                const isExpanded = expandedSessionId === session.id;
                return (
                  <motion.div
                    key={session.id}
                    className={`echo-counselor-session-card ${isExpanded ? 'is-active' : ''}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div
                      className="echo-counselor-session-card-header"
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedSessionId(null);
                          setExpandedSessionMessages([]);
                        } else {
                          setExpandedSessionId(session.id);
                          setLoadingExpanded(true);
                          // Load messages directly from backend — don't pollute shared messages state
                          console.log('[DEBUG][Frontend] Calling echo_counselor_get_messages for session:', session.id);
                          invoke<EchoCounselorMessage[]>('echo_counselor_get_messages', { session_id: session.id })
                            .then(msgs => {
                              console.log('[DEBUG][Frontend] Received', msgs.length, 'messages for session', session.id);
                              console.log('[DEBUG][Frontend] Messages:', JSON.stringify(msgs.slice(0, 2)));
                              setExpandedSessionMessages(msgs);
                              setLoadingExpanded(false);
                            })
                            .catch(err => {
                              console.error('[DEBUG][Frontend] Error loading messages:', err);
                              setExpandedSessionMessages([]);
                              setLoadingExpanded(false);
                            });
                        }
                      }}
                    >
                      <div className="echo-counselor-session-card-date">
                        {new Date(session.created_at).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        {session.ended_at && (
                          <span className="echo-counselor-session-duration">
                            {' '}· {Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000)} min
                          </span>
                        )}
                      </div>
                      <div className="echo-counselor-session-card-meta">
                        {session.message_count} messages · {session.status} {isExpanded ? '▲' : '▼'}
                      </div>
                      {session.counselor_reflection && (
                        <div className="echo-counselor-session-card-reflection">
                          {session.counselor_reflection.slice(0, 80)}...
                        </div>
                      )}
                    </div>
                    {isExpanded && (
                      <motion.div
                        className="echo-counselor-session-card-messages"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        {loadingExpanded ? (
                          <div className="echo-counselor-journal-loading">Loading conversation...</div>
                        ) : expandedSessionMessages.length === 0 ? (
                          <div className="echo-counselor-journal-empty-msgs">No messages in this session.</div>
                        ) : (
                          expandedSessionMessages.map(msg => (
                            <div key={msg.id} className={`echo-counselor-journal-msg ${msg.role === 'user' ? 'user' : 'counselor'}`}>
                              <div className="echo-counselor-journal-msg-role">
                                {msg.role === 'user' ? 'You' : 'Echo'} · {formatTime(msg.timestamp)}
                              </div>
                              <div className="echo-counselor-journal-msg-content">{msg.content}</div>
                            </div>
                          ))
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ JOURNAL VIEW ═══ */}
      {view === 'journal' && (
        <div className="echo-counselor-main">
          <div className="echo-counselor-journal-intro">
            <h3>Echo's Private Journal</h3>
            <p>
              Echo writes reflections after each session. You're reading the counselor's private thoughts
              about your time together — the topics you discussed, the patterns noticed, the things worth
              revisiting next time.
            </p>
          </div>

          {journal.length === 0 ? (
            <div className="echo-counselor-journal-empty">
              <p>No sessions yet. Start talking to Echo and they'll write reflections here.</p>
            </div>
          ) : (
            <div className="echo-counselor-journal-entries">
              {journal.map(session => {
                if (!session.counselor_reflection) return null;
                const isExpanded = expandedSessionId === session.id;
                return (
                  <motion.div
                    key={session.id}
                    className="echo-counselor-journal-entry"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div
                      className="echo-counselor-journal-header echo-counselor-journal-header-clickable"
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedSessionId(null);
                          setExpandedSessionMessages([]);
                        } else {
                          setExpandedSessionId(session.id);
                          setLoadingExpanded(true);
                          loadMessages(session.id).then(msgs => {
                            setExpandedSessionMessages(msgs);
                            setLoadingExpanded(false);
                          });
                        }
                      }}
                    >
                      <div className="echo-counselor-journal-date">
                        {new Date(session.created_at).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="echo-counselor-journal-session-id">
                        {session.message_count} msg{session.message_count !== 1 ? 's' : ''} · {isExpanded ? '▲' : '▼'}
                      </div>
                    </div>
                    <div className="echo-counselor-journal-content">
                      {session.counselor_reflection}
                    </div>
                    {isExpanded && (
                      <motion.div
                        className="echo-counselor-journal-messages"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        {loadingExpanded ? (
                          <div className="echo-counselor-journal-loading">Loading conversation...</div>
                        ) : expandedSessionMessages.length === 0 ? (
                          <div className="echo-counselor-journal-empty-msgs">No messages in this session.</div>
                        ) : (
                          expandedSessionMessages.map(msg => (
                            <div key={msg.id} className={`echo-counselor-journal-msg ${msg.role === 'user' ? 'user' : 'counselor'}`}>
                              <div className="echo-counselor-journal-msg-role">
                                {msg.role === 'user' ? 'You' : 'Echo'} · {formatTime(msg.timestamp)}
                              </div>
                              <div className="echo-counselor-journal-msg-content">{msg.content}</div>
                            </div>
                          ))
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ TOOLS VIEW ═══ */}
      {view === 'tools' && (
        <div className="echo-counselor-main">
          <div className="echo-counselor-tools-section">
            <h3>🙏 Gratitude Practice</h3>
            <p>Write three things you're grateful for. Echo may suggest this during sessions.</p>
            <GratitudeWidget
              writeGratitude={writeGratitude}
              getGratitudeEntries={getGratitudeEntries}
            />
          </div>

          <div className="echo-counselor-tools-section">
            <h3>🫁 Grounding Exercises</h3>
            <p>Quick exercises to bring you back to the present moment.</p>
            <GroundingExercises completeExercise={completeExercise} />
          </div>

          <div className="echo-counselor-tools-section">
            <h3>🌙 Evening Ritual</h3>
            <p>A gentle reminder to check in with Echo before bed.</p>
            <EveningReminderWidget
              setEveningReminder={setEveningReminder}
              getEveningReminder={getEveningReminder}
            />
          </div>
        </div>
      )}

      {/* ═══ LETTER VIEW ═══ */}
      {view === 'letter' && (
        <div className="echo-counselor-main">
          <WeeklyLetterView
            generateWeeklyLetter={generateWeeklyLetter}
            getWeeklyLetter={getWeeklyLetter}
            getWeeklyLetterHistory={getWeeklyLetterHistory}
          />
        </div>
      )}
    </div>
  );
}

// ── Subcomponents ───────────────────────────────────────────────

function GratitudeWidget({
  writeGratitude,
  getGratitudeEntries,
}: {
  writeGratitude: (items: string[], context?: string) => Promise<void>;
  getGratitudeEntries: (limit?: number) => Promise<{ id: string; items: string; context: string | null; created_at: string }[]>;
}) {
  const [item1, setItem1] = useState('');
  const [item2, setItem2] = useState('');
  const [item3, setItem3] = useState('');
  const [context, setContext] = useState('');
  const [saved, setSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<{ id: string; items: string; context: string | null; created_at: string }[]>([]);

  const saveGratitude = async () => {
    const items = [item1, item2, item3].filter(Boolean);
    if (items.length < 3) return;

    await writeGratitude(items, context || undefined);
    setSaved(true);
    // Reload history if it's currently open so the new entry appears
    if (showHistory) {
      const entries = await getGratitudeEntries(10);
      setHistory(entries);
    }
    setTimeout(() => {
      setItem1('');
      setItem2('');
      setItem3('');
      setContext('');
      setSaved(false);
    }, 2000);
  };

  const toggleHistory = async () => {
    if (!showHistory) {
      const entries = await getGratitudeEntries(10);
      setHistory(entries);
    }
    setShowHistory(s => !s);
  };

  return (
    <div className="echo-gratitude-widget">
      <div className="echo-gratitude-inputs">
        <input
          className="echo-gratitude-input"
          placeholder="1. Grateful for..."
          value={item1}
          onChange={e => setItem1(e.target.value)}
        />
        <input
          className="echo-gratitude-input"
          placeholder="2. Grateful for..."
          value={item2}
          onChange={e => setItem2(e.target.value)}
        />
        <input
          className="echo-gratitude-input"
          placeholder="3. Grateful for..."
          value={item3}
          onChange={e => setItem3(e.target.value)}
        />
        <textarea
          className="echo-gratitude-context"
          placeholder="Optional: context (why, when, etc.)"
          value={context}
          onChange={e => setContext(e.target.value)}
        />
      </div>
      <button
        className={`echo-gratitude-save ${saved ? 'saved' : ''}`}
        onClick={saveGratitude}
        disabled={saved || !item1 || !item2 || !item3}
      >
        {saved ? '✓ Saved!' : 'Save Gratitude'}
      </button>
      <button className="echo-gratitude-history-toggle" onClick={toggleHistory}>
        {showHistory ? 'Hide history' : 'Show past entries'}
      </button>
      {showHistory && (
        <div className="echo-gratitude-history">
          {history.length === 0 ? (
            <p className="echo-gratitude-history-empty">No entries yet.</p>
          ) : (
            history.map(entry => {
              return (
                <div key={entry.id} className="echo-gratitude-history-entry">
                  <div className="echo-gratitude-history-date">
                    {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <ul className="echo-gratitude-history-items">
                    {(JSON.parse(entry.items) as string[]).map((item: string, i: number) => <li key={i}>{item}</li>)}
                  </ul>
                  {entry.context && <p className="echo-gratitude-history-context">{entry.context}</p>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function GroundingExercises({
  completeExercise,
}: {
  completeExercise: (id: string) => Promise<void>;
}) {
  const [activeExercise, setActiveExercise] = useState<string | null>(null);
  const [step, setStep] = useState<'list' | 'guide' | 'done'>('list');
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const exercises = [
    {
      id: 'breathing',
      title: '4-7-8 Breathing',
      description: 'Inhale for 4, hold for 7, exhale for 8. Repeat 4 times.',
      duration: 120, // seconds
      phases: [
        { label: 'Inhale', duration: 4, emoji: '🌬️' },
        { label: 'Hold', duration: 7, emoji: '🫁' },
        { label: 'Exhale', duration: 8, emoji: '💨' },
      ],
    },
    {
      id: '54321',
      title: '5-4-3-2-1 Grounding',
      description: 'Notice 5 things you see, 4 you hear, 3 you feel, 2 you smell, 1 you taste.',
      duration: 180,
      steps: ['5 things you see', '4 things you hear', '3 things you feel', '2 things you smell', '1 thing you taste'],
    },
    {
      id: 'body',
      title: 'Body Scan',
      description: 'Notice sensations from head to toe without judgment.',
      duration: 120,
      steps: ['Head & face', 'Neck & shoulders', 'Arms & hands', 'Chest & stomach', 'Back', 'Hips & legs', 'Feet'],
    },
  ];

  // Breathing timer
  const exercise = exercises.find(e => e.id === activeExercise);
  const isBreathing = activeExercise === 'breathing';

  useEffect(() => {
    if (!timerActive || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          setTimerActive(false);
          setStep('done');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timer]);

  const startExercise = (id: string) => {
    const ex = exercises.find(e => e.id === id);
    if (!ex) return;
    setActiveExercise(id);
    setStep('guide');
    setTimer(ex.duration);
    setTimerActive(true);
  };

  const handleComplete = async () => {
    if (!activeExercise) return;
    await completeExercise(activeExercise);
    setStep('done');
    setTimerActive(false);
  };

  const resetExercise = () => {
    setActiveExercise(null);
    setStep('list');
    setTimer(0);
    setTimerActive(false);
  };

  if (step === 'done') {
    return (
      <div className="echo-grounding-done">
        <div className="echo-grounding-done-icon">✨</div>
        <h4>Well done.</h4>
        <p>You took a moment to be present. That's worth noting.</p>
        <button className="echo-grounding-reset" onClick={resetExercise}>
          Back to exercises
        </button>
      </div>
    );
  }

  if (step === 'guide' && exercise) {
    return (
      <div className="echo-grounding-guide">
        <button className="echo-grounding-back" onClick={resetExercise}>← Back</button>
        <h4 className="echo-grounding-guide-title">{exercise.title}</h4>
        {isBreathing && exercise.phases && (
          <div className="echo-breathing-phase">
            {exercise.phases.map((phase, i) => {
              const elapsed = exercise.duration - timer;
              const cycleLen = 4 + 7 + 8; // 19s per cycle
              const cyclePosition = elapsed % cycleLen;
              let currentPhaseIdx = 0;
              let phaseElapsed = cyclePosition;
              if (cyclePosition < 4) { currentPhaseIdx = 0; phaseElapsed = cyclePosition; }
              else if (cyclePosition < 11) { currentPhaseIdx = 1; phaseElapsed = cyclePosition - 4; }
              else { currentPhaseIdx = 2; phaseElapsed = cyclePosition - 11; }
              const phase_ = exercise.phases[currentPhaseIdx];
              const progress = phaseElapsed / phase_.duration;
              return (
                <div key={i} className={`echo-breathing-phase-item ${i === currentPhaseIdx ? 'active' : ''}`}>
                  <span className="echo-breathing-emoji">{phase_.emoji}</span>
                  <span className="echo-breathing-label">{phase_.label}</span>
                  {i === currentPhaseIdx && (
                    <div className="echo-breathing-progress">
                      <div
                        className="echo-breathing-bar"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {!isBreathing && exercise.steps && (
          <div className="echo-grounding-steps">
            {exercise.steps.map((s, i) => {
              const elapsed = exercise.duration - timer;
              const stepDuration = exercise.duration / exercise.steps.length;
              const currentStep = Math.floor(elapsed / stepDuration);
              return (
                <div key={i} className={`echo-grounding-step ${i === currentStep ? 'current' : i < currentStep ? 'done' : ''}`}>
                  <span className="echo-grounding-step-num">{i < currentStep ? '✓' : i + 1}</span>
                  <span>{s}</span>
                </div>
              );
            })}
          </div>
        )}
        <div className="echo-grounding-timer">
          <span className="echo-grounding-time-left">
            {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
          </span>
          <button className="echo-grounding-pause" onClick={() => setTimerActive(t => !t)}>
            {timerActive ? '⏸' : '▶'}
          </button>
        </div>
        <button className="echo-grounding-finish" onClick={handleComplete}>
          Finish early
        </button>
      </div>
    );
  }

  return (
    <div className="echo-grounding-exercises">
      {exercises.map(ex => (
        <div
          key={ex.id}
          className="echo-grounding-card"
          onClick={() => startExercise(ex.id)}
        >
          <div className="echo-grounding-title">{ex.title}</div>
          <div className="echo-grounding-desc">{ex.description}</div>
          <div className="echo-grounding-duration">{ex.duration}s</div>
        </div>
      ))}
    </div>
  );
}

function EveningReminderWidget({
  setEveningReminder,
  getEveningReminder,
}: {
  setEveningReminder: (s: { enabled: boolean; hour: number; minute: number }) => Promise<void>;
  getEveningReminder: () => Promise<{ enabled: boolean; hour: number; minute: number } | null>;
}) {
  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState(20);
  const [minute, setMinute] = useState(0);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load saved reminder on mount
  useEffect(() => {
    getEveningReminder().then(reminder => {
      if (reminder) {
        setEnabled(reminder.enabled);
        setHour(reminder.hour);
        setMinute(reminder.minute);
      }
      setLoading(false);
    });
  }, [getEveningReminder]);

  const handleSave = async () => {
    await setEveningReminder({ enabled, hour, minute });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const formatTime = (h: number, m: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    const mm = m.toString().padStart(2, '0');
    return `${h12}:${mm} ${ampm}`;
  };

  return (
    <div className="echo-evening-widget">
      <div className="echo-evening-toggle">
        <label>
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
          />
          Enable evening reminder
        </label>
      </div>
      {enabled && (
        <div className="echo-evening-time">
          <div className="echo-evening-time-label">Reminder time</div>
          <div className="echo-evening-time-pickers">
            <select value={hour} onChange={e => setHour(Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}</option>
              ))}
            </select>
            <span>:</span>
            <select value={minute} onChange={e => setMinute(Number(e.target.value))}>
              {[0, 15, 30, 45].map(m => (
                <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
              ))}
            </select>
          </div>
          <div className="echo-evening-preview">Every day at {formatTime(hour, minute)}</div>
        </div>
      )}
      <button className={`echo-evening-save ${saved ? 'saved' : ''}`} onClick={handleSave}>
        {saved ? '✓ Saved!' : 'Save Reminder'}
      </button>
    </div>
  );
}

function WeeklyLetterView({
  generateWeeklyLetter,
  getWeeklyLetter,
  getWeeklyLetterHistory,
}: {
  generateWeeklyLetter: () => Promise<EchoWeeklyLetter | null>;
  getWeeklyLetter: () => Promise<EchoWeeklyLetter | null>;
  getWeeklyLetterHistory: (limit?: number) => Promise<EchoWeeklyLetter[]>;
}) {
  const [currentLetter, setCurrentLetter] = useState<EchoWeeklyLetter | null>(null);
  const [letterHistory, setLetterHistory] = useState<EchoWeeklyLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'past'>('current');
  const [expandedLetterId, setExpandedLetterId] = useState<string | null>(null);

  useEffect(() => {
    loadLetters();
  }, []);

  const loadLetters = async () => {
    setLoading(true);
    const [letter, history] = await Promise.all([
      getWeeklyLetter(),
      getWeeklyLetterHistory(4),
    ]);
    setCurrentLetter(letter);
    setLetterHistory(history);
    setLoading(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const letter = await generateWeeklyLetter();
    if (letter) {
      setCurrentLetter(letter);
      await loadLetters();
    }
    setGenerating(false);
  };

  const formatWeek = (start: string, end: string) => {
    const s = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const e = new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${s} – ${e}`;
  };

  if (loading) {
    return <div className="echo-letter-loading">Loading...</div>;
  }

  return (
    <div className="echo-letter-view">
      <div className="echo-letter-tabs">
        <button className={activeTab === 'current' ? 'active' : ''} onClick={() => setActiveTab('current')}>This Week</button>
        <button className={activeTab === 'past' ? 'active' : ''} onClick={() => setActiveTab('past')}>Past Letters</button>
      </div>

      {activeTab === 'current' && (
        <div className="echo-letter-current">
          {!currentLetter ? (
            <div className="echo-letter-empty">
              <p>Your first Weekly Echo Letter will be ready after your first session this week.</p>
              <p className="echo-letter-hint">Once you have sessions, come back here and Echo will write you a personal summary.</p>
            </div>
          ) : (
            <div className="echo-letter-content">
              <div className="echo-letter-header">
                <h3>Your Week in Echo</h3>
                <div className="echo-letter-week">{formatWeek(currentLetter.week_start, currentLetter.week_end)}</div>
                <div className="echo-letter-stats">
                  {currentLetter.session_count} session{currentLetter.session_count !== 1 ? 's' : ''} · {currentLetter.total_messages} messages
                </div>
              </div>
              <div className="echo-letter-body">
                {currentLetter.letter_content.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          )}
          <button
            className={`echo-letter-generate ${generating ? 'generating' : ''}`}
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? '✨ Echo is writing...' : currentLetter ? '✨ Regenerate Letter' : '✨ Generate My Letter'}
          </button>
        </div>
      )}

      {activeTab === 'past' && (
        <div className="echo-letter-past">
          {letterHistory.length === 0 ? (
            <p className="echo-letter-empty">No past letters yet.</p>
          ) : (
            letterHistory.map(letter => (
              <div key={letter.id} className={`echo-letter-past-item ${expandedLetterId === letter.id ? 'expanded' : ''}`} onClick={() => setExpandedLetterId(expandedLetterId === letter.id ? null : letter.id)}>
                <div className="echo-letter-past-header">
                  <div className="echo-letter-past-week">{formatWeek(letter.week_start, letter.week_end)}</div>
                  <div className="echo-letter-past-toggle">{expandedLetterId === letter.id ? '▲' : '▼'}</div>
                </div>
                {expandedLetterId === letter.id ? (
                  <div className="echo-letter-past-body">
                    {letter.letter_content.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                ) : (
                  <div className="echo-letter-past-preview">
                    {letter.letter_content.slice(0, 120)}...
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
