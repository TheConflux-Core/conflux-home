import { useState } from 'react';
import { useEcho } from '../hooks/useEcho';
import type { EchoMood } from '../types';
import { ECHO_MOOD_CONFIG } from '../types';
import '../styles-echo.css';

type Tab = 'write' | 'mirror' | 'timeline';

export default function EchoView() {
  const { entries, stats, patterns, loading, write, deleteEntry } = useEcho();
  const [tab, setTab] = useState<Tab>('write');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<EchoMood | null>(null);
  const [tagsStr, setTagsStr] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [inkBleed, setInkBleed] = useState(false);
  
  // Trigger ink-bleed animation on mood selection
  const handleMoodSelect = (m: EchoMood) => {
    setInkBleed(true);
    setMood(mood === m ? null : m);
    setTimeout(() => setInkBleed(false), 300);
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
      await write({ content: content.trim(), mood: mood ?? undefined, tags: tags.length ? tags : undefined });
      setContent('');
      setMood(null);
      setTagsStr('');
      setTab('timeline');
    } catch (err) {
      console.error('Echo write failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    await deleteEntry(id);
    setExpandedId(null);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateHeader = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const groupByDate = (items: typeof entries) => {
    const groups: { date: string; entries: typeof entries }[] = [];
    for (const e of items) {
      const d = new Date(e.created_at).toDateString();
      const existing = groups.find(g => g.date === d);
      if (existing) existing.entries.push(e);
      else groups.push({ date: d, entries: [e] });
    }
    return groups;
  };

  if (loading) {
    return (
      <div className="echo-hub">
        <div className="echo-header">
          <h1>🪞 Echo</h1>
          <div className="echo-subtitle">The notebook that listens</div>
        </div>
        <div className="echo-loading" />
      </div>
    );
  }

  const dateGroups = groupByDate(entries);

  const patternIcons: Record<string, string> = { mood: '🎭', topic: '💬', time: '⏰', frequency: '🔄' };

  return (
    <div className="echo-hub">
      <div className="echo-header">
        <h1 className={inkBleed ? 'ink-bleed' : ''}>🪞 Echo</h1>
        <div className="echo-subtitle">The notebook that listens</div>
      </div>

      {/* Tab Navigation */}
      <div className="echo-tabs">
        <button className={`echo-tab ${tab === 'write' ? 'active' : ''}`} onClick={() => setTab('write')}>
          ✍️ Write
        </button>
        <button className={`echo-tab ${tab === 'mirror' ? 'active' : ''}`} onClick={() => setTab('mirror')}>
          🪞 Mirror
        </button>
        <button className={`echo-tab ${tab === 'timeline' ? 'active' : ''}`} onClick={() => setTab('timeline')}>
          📅 Timeline
        </button>
      </div>

      {/* ═══ WRITE TAB ═══ */}
      {tab === 'write' && (
        <>
          <div className="echo-daily-prompt">
            <h2>How was today?</h2>

            <div className="echo-mood-selector">
              {(Object.keys(ECHO_MOOD_CONFIG) as EchoMood[]).map(m => (
                <button
                  key={m}
                  className={`echo-mood-btn ${mood === m ? 'active' : ''} ${inkBleed ? 'ink-bleed-active' : ''}`}
                  style={{ '--mood-color': ECHO_MOOD_CONFIG[m].color } as React.CSSProperties}
                  onClick={() => handleMoodSelect(m)}
                >
                  <span className="echo-mood-emoji">{ECHO_MOOD_CONFIG[m].emoji}</span>
                  {ECHO_MOOD_CONFIG[m].label}
                </button>
              ))}
            </div>

            <textarea
              className="echo-textarea"
              placeholder="Pour your thoughts here..."
              value={content}
              onChange={e => setContent(e.target.value)}
            />

            <input
              className="echo-tags-input"
              placeholder="Tags (comma-separated, optional)"
              value={tagsStr}
              onChange={e => setTagsStr(e.target.value)}
            />

            <button
              className="echo-submit-btn"
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
            >
              {submitting ? 'Saving...' : 'Save Entry'}
            </button>
          </div>

          {/* Recent entries */}
          {entries.length > 0 && (
            <div>
              <h3 className="echo-section-title">Recent</h3>
              <div className="echo-entries">
                {entries.slice(0, 5).map(entry => (
                  <div key={entry.id}>
                    {expandedId === entry.id ? (
                      <div className="echo-entry-expanded">
                        <div className="echo-entry-header">
                          {entry.mood && (
                            <span
                              className="echo-mood-dot"
                              style={{ backgroundColor: ECHO_MOOD_CONFIG[entry.mood].color }}
                            />
                          )}
                          <span className="echo-entry-time">{formatTime(entry.created_at)}</span>
                        </div>
                        <div className="echo-entry-full-content">{entry.content}</div>
                        {entry.tags.length > 0 && (
                          <div className="echo-entry-tags">
                            {entry.tags.map(t => <span key={t} className="echo-entry-tag">{t}</span>)}
                          </div>
                        )}
                        <div className="echo-entry-meta">
                          <span>{entry.word_count} words</span>
                          {entry.is_voice && <span className="echo-entry-voice-badge">🎤 Voice</span>}
                        </div>
                        <button className="echo-delete-btn" onClick={() => handleDelete(entry.id)}>Delete</button>
                        <button className="echo-delete-btn" style={{ marginLeft: 8 }} onClick={() => setExpandedId(null)}>Collapse</button>
                      </div>
                    ) : (
                      <div className="echo-entry" onClick={() => setExpandedId(entry.id)}>
                        <div className="echo-entry-header">
                          {entry.mood && (
                            <span
                              className="echo-mood-dot"
                              style={{ backgroundColor: ECHO_MOOD_CONFIG[entry.mood].color }}
                            />
                          )}
                          <span className="echo-entry-time">{formatTime(entry.created_at)}</span>
                        </div>
                        <div className="echo-entry-preview">{entry.content}</div>
                        <div className="echo-entry-meta">
                          <span>{entry.word_count} words</span>
                          {entry.is_voice && <span className="echo-entry-voice-badge">🎤 Voice</span>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {entries.length === 0 && (
            <div className="echo-empty">
              <div className="echo-empty-icon">🪞</div>
              <h3>Your notebook awaits</h3>
              <p>Write your first entry above. Echo is listening.</p>
            </div>
          )}
        </>
      )}

      {/* ═══ MIRROR TAB ═══ */}
      {tab === 'mirror' && (
        <div className="echo-mirror">
          {/* Stats Bar */}
          <div className="echo-stats-bar">
            <div className="echo-stat-pill">
              <div className="echo-stat-label">🔥 Streak</div>
              <div className="echo-stat-value">{stats?.current_streak ?? 0}</div>
            </div>
            <div className="echo-stat-pill">
              <div className="echo-stat-label">📝 Total</div>
              <div className="echo-stat-value">{stats?.total_entries ?? 0}</div>
            </div>
            <div className="echo-stat-pill">
              <div className="echo-stat-label">✍️ Avg Words</div>
              <div className="echo-stat-value">{stats?.avg_words_per_entry ?? 0}</div>
            </div>
            <div className="echo-stat-pill">
              <div className="echo-stat-label">📅 Today</div>
              <div className="echo-stat-value">{stats?.today_entries?.length ?? 0}</div>
            </div>
          </div>

          {/* Patterns */}
          <h3 className="echo-section-title">What Echo notices</h3>
          {patterns.length > 0 ? (
            <div className="echo-patterns">
              {patterns.map(p => (
                <div key={p.id} className="echo-pattern-card">
                  <div className="echo-pattern-icon">{patternIcons[p.pattern_type] ?? '📊'}</div>
                  <div className="echo-pattern-title">{p.title}</div>
                  <div className="echo-pattern-desc">{p.description}</div>
                  <div className="echo-confidence-bar">
                    <div className="echo-confidence-fill" style={{ width: `${p.confidence}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="echo-empty" style={{ padding: '32px 24px' }}>
              <div className="echo-empty-icon">🔍</div>
              <h3>Still learning</h3>
              <p>Echo is still learning your patterns. Keep writing!</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ TIMELINE TAB ═══ */}
      {tab === 'timeline' && (
        <>
          {entries.length === 0 ? (
            <div className="echo-empty">
              <div className="echo-empty-icon">📖</div>
              <h3>No entries yet</h3>
              <p>Start writing to build your timeline.</p>
            </div>
          ) : (
            <div className="echo-entries">
              {dateGroups.map(group => (
                <div key={group.date}>
                  <div className="echo-date-separator">
                    <span>{formatDateHeader(group.entries[0].created_at)} · {group.entries.length}</span>
                  </div>
                  {group.entries.map(entry => (
                    <div key={entry.id}>
                      {expandedId === entry.id ? (
                        <div className="echo-entry-expanded">
                          <div className="echo-entry-header">
                            {entry.mood && (
                              <span className="echo-mood-dot" style={{ backgroundColor: ECHO_MOOD_CONFIG[entry.mood].color }} />
                            )}
                            <span className="echo-entry-time">{formatTime(entry.created_at)}</span>
                          </div>
                          <div className="echo-entry-full-content">{entry.content}</div>
                          {entry.tags.length > 0 && (
                            <div className="echo-entry-tags">
                              {entry.tags.map(t => <span key={t} className="echo-entry-tag">{t}</span>)}
                            </div>
                          )}
                          <div className="echo-entry-meta">
                            <span>{entry.word_count} words</span>
                            {entry.is_voice && <span className="echo-entry-voice-badge">🎤 Voice</span>}
                          </div>
                          <button className="echo-delete-btn" onClick={() => handleDelete(entry.id)}>Delete</button>
                          <button className="echo-delete-btn" style={{ marginLeft: 8 }} onClick={() => setExpandedId(null)}>Collapse</button>
                        </div>
                      ) : (
                        <div className="echo-entry" onClick={() => setExpandedId(entry.id)}>
                          <div className="echo-entry-header">
                            {entry.mood && (
                              <span className="echo-mood-dot" style={{ backgroundColor: ECHO_MOOD_CONFIG[entry.mood].color }} />
                            )}
                            <span className="echo-entry-time">{formatTime(entry.created_at)}</span>
                          </div>
                          <div className="echo-entry-preview">{entry.content.slice(0, 100)}{entry.content.length > 100 ? '...' : ''}</div>
                          <div className="echo-entry-meta">
                            <span>{entry.word_count} words</span>
                            {entry.is_voice && <span className="echo-entry-voice-badge">🎤 Voice</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
