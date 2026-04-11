// Conflux Home — Echo Counselor View
// Mirror: Your reflective wellness companion
// NOT a therapist. A warm, present, insightful conversation partner.

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEchoCounselor } from '../hooks/useEchoCounselor';
import type { EchoCounselorMessage, EchoCrisisFlag, EchoCounselorSession } from '../types';
import { ECHO_CRISIS_RESOURCES } from '../types';
import '../styles-echo-counselor.css';

type ViewMode = 'session' | 'journal' | 'tools';

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
    getCounselorJournal,
    dismissCrisis,
    getOpening,
    refresh,
  } = useEchoCounselor();

  const [view, setView] = useState<ViewMode>('session');
  const [input, setInput] = useState('');
  const [journal, setJournal] = useState<EchoCounselorSession[]>([]);
  const [showCrisisResources, setShowCrisisResources] = useState(false);

  // Load journal on first render
  useEffect(() => {
    getCounselorJournal().then(j => setJournal(j));
  }, [getCounselorJournal]);

  // Auto-start a session if none exists and we have data
  useEffect(() => {
    if (!loading && state && !state.current_session && state.recent_sessions.length === 0) {
      startSession();
    }
  }, [loading, state, startSession]);

  const handleSubmit = async () => {
    if (!input.trim() || !state?.current_session?.id) return;

    const sessionId = state.current_session.id;
    const content = input;
    setInput('');

    try {
      await sendMessage(sessionId, content);
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
    await endSession(state.current_session.id);
  };

  const handleViewChange = async (mode: ViewMode) => {
    setView(mode);
    if (mode === 'journal') {
      const j = await getCounselorJournal();
      setJournal(j);
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
      <div className="echo-counselor-view">
        <div className="echo-loading">Loading Mirror...</div>
      </div>
    );
  }

  return (
    <div className="echo-counselor-view">
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
              <strong>Mirror is concerned.</strong> The counselor detected signs of distress.
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
          <span className="echo-counselor-emoji">🪞</span> Mirror
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
            className={`echo-counselor-tab ${view === 'journal' ? 'active' : ''}`}
            onClick={() => handleViewChange('journal')}
          >
            📓 Counselor's Journal
          </button>
          <button
            className={`echo-counselor-tab ${view === 'tools' ? 'active' : ''}`}
            onClick={() => handleViewChange('tools')}
          >
            🛠️ Tools
          </button>
        </div>
      </div>

      {/* ═══ SESSION VIEW ═══ */}
      {view === 'session' && (
        <div className="echo-counselor-main">
          {/* No Active Session */}
          {!state?.current_session && (
            <div className="echo-counselor-no-session">
              <div className="echo-counselor-empty-icon">🪞</div>
              <h3>Ready to talk?</h3>
              <p>
                Mirror is here to listen — without judgment, without a timer, without anything to prove.
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
                    <div className="echo-counselor-emoji-large">🪞</div>
                    <p>Mirror has started the session...</p>
                  </div>
                )}
                {messages.map(msg => (
                  <motion.div
                    key={msg.id}
                    className={`echo-counselor-message ${getBubbleClass(msg)}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="echo-counselor-msg-content">
                      {msg.content.split('\n').map((line, i) => (
                        <span key={i}>{line}{i < msg.content.split('\n').length - 1 && <br />}</span>
                      ))}
                    </div>
                    <div className="echo-counselor-msg-meta">
                      {msg.role === 'user' ? 'You' : 'Mirror'} · {formatTime(msg.timestamp)}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Input Area */}
              <div className="echo-counselor-input-area">
                <textarea
                  className="echo-counselor-textarea"
                  placeholder="Talk to Mirror..."
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

      {/* ═══ JOURNAL VIEW ═══ */}
      {view === 'journal' && (
        <div className="echo-counselor-main">
          <div className="echo-counselor-journal-intro">
            <h3>Mirror's Private Journal</h3>
            <p>
              Mirror writes reflections after each session. You're reading the counselor's private thoughts
              about your time together — the topics you discussed, the patterns noticed, the things worth
              revisiting next time.
            </p>
          </div>

          {journal.length === 0 ? (
            <div className="echo-counselor-journal-empty">
              <p>No sessions yet. Start talking to Mirror and they'll write reflections here.</p>
            </div>
          ) : (
            <div className="echo-counselor-journal-entries">
              {journal.map(session => {
                if (!session.counselor_reflection) return null;
                return (
                  <motion.div
                    key={session.id}
                    className="echo-counselor-journal-entry"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="echo-counselor-journal-header">
                      <div className="echo-counselor-journal-date">
                        {new Date(session.created_at).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="echo-counselor-journal-session-id">
                        Session {session.id.slice(0, 8)}
                      </div>
                    </div>
                    <div className="echo-counselor-journal-content">
                      {session.counselor_reflection}
                    </div>
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
            <p>Write three things you're grateful for. Mirror may suggest this during sessions.</p>
            <GratitudeWidget />
          </div>

          <div className="echo-counselor-tools-section">
            <h3>🫁 Grounding Exercises</h3>
            <p>Quick exercises to bring you back to the present moment.</p>
            <GroundingExercises />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Subcomponents ───────────────────────────────────────────────

function GratitudeWidget() {
  const [item1, setItem1] = useState('');
  const [item2, setItem2] = useState('');
  const [item3, setItem3] = useState('');
  const [context, setContext] = useState('');
  const [saved, setSaved] = useState(false);

  const saveGratitude = async () => {
    const items = [item1, item2, item3].filter(Boolean);
    if (items.length < 3) return;

    // Call backend: echo_counselor_write_gratitude
    setSaved(true);
    setTimeout(() => {
      setItem1('');
      setItem2('');
      setItem3('');
      setContext('');
      setSaved(false);
    }, 2000);
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
    </div>
  );
}

function GroundingExercises() {
  const [activeExercise, setActiveExercise] = useState<string | null>(null);

  const exercises = [
    {
      id: 'breathing',
      title: '4-7-8 Breathing',
      description: 'Inhale for 4, hold for 7, exhale for 8. Repeat 4 times.',
      duration: '2 min',
    },
    {
      id: '54321',
      title: '5-4-3-2-1 Grounding',
      description: 'Name 5 things you see, 4 you hear, 3 you feel, 2 you smell, 1 you taste.',
      duration: '3 min',
    },
    {
      id: 'body',
      title: 'Body Scan',
      description: 'Notice sensations from head to toe without judgment.',
      duration: '2 min',
    },
  ];

  return (
    <div className="echo-grounding-exercises">
      {exercises.map(ex => (
        <div
          key={ex.id}
          className={`echo-grounding-card ${activeExercise === ex.id ? 'active' : ''}`}
          onClick={() => setActiveExercise(activeExercise === ex.id ? null : ex.id)}
        >
          <div className="echo-grounding-title">{ex.title}</div>
          <div className="echo-grounding-desc">{ex.description}</div>
          <div className="echo-grounding-duration">{ex.duration}</div>
        </div>
      ))}
    </div>
  );
}
