// Conflux Home — Current View
// Intelligence briefing dashboard: daily briefings, ripple radar, signal threads, Q&A, cognitive patterns.

import { useState, useCallback } from 'react';
import { useBriefing } from '../hooks/useBriefing';
import { useRipples } from '../hooks/useRipples';
import { useSignalThreads } from '../hooks/useSignalThreads';
import { useQuestionEngine } from '../hooks/useQuestionEngine';
import { useCognitivePatterns } from '../hooks/useCognitivePatterns';
import { useContentFeed } from '../hooks/useFeed';
import { CurrentHero, RippleCard, SignalThread, QuestionEngine, CognitiveDashboard } from './current';
import { FEED_TYPE_CONFIG } from '../types';

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type Section = 'briefing' | 'feed' | 'cognitive';

export default function FeedView() {
  // Hooks
  const { briefing, loading: briefingLoading, generating, generate } = useBriefing();
  const { ripples, loading: ripplesLoading, detect } = useRipples();
  const { threads, loading: threadsLoading, create } = useSignalThreads();
  const { result: questionResult, history: questionHistory, loading: questionLoading, ask } = useQuestionEngine();
  const { pattern, loading: patternLoading, analyze } = useCognitivePatterns();
  const { items, loading: feedLoading, unreadCount, markRead, toggleBookmark } = useContentFeed();

  // State
  const [filter, setFilter] = useState<string>('all');
  const [activeSection, setActiveSection] = useState<Section>('briefing');

  // Feed filtering
  const filtered = items.filter(item => {
    if (filter !== 'all' && item.content_type !== filter) return false;
    return true;
  });

  // Signal thread creation handler
  const handleCreateThread = useCallback(async (topic: string) => {
    await create(topic, '');
  }, [create]);

  return (
    <div className="current-view">
      {/* ── Section Tabs ── */}
      <div className="feed-filters" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`current-feed-filter-btn${activeSection === 'briefing' ? ' active' : ''}`}
          onClick={() => setActiveSection('briefing')}
        >
          🎯 Briefing
        </button>
        <button
          className={`current-feed-filter-btn${activeSection === 'feed' ? ' active' : ''}`}
          onClick={() => setActiveSection('feed')}
        >
          📰 Feed{unreadCount > 0 ? ` (${unreadCount})` : ''}
        </button>
        <button
          className={`current-feed-filter-btn${activeSection === 'cognitive' ? ' active' : ''}`}
          onClick={() => setActiveSection('cognitive')}
        >
          🧠 Intelligence
        </button>
      </div>

      {/* ════════════════════════════════════════════════════
          BRIEFING SECTION
          ════════════════════════════════════════════════════ */}
      {activeSection === 'briefing' && (
        <div style={{ animation: 'currentCardSnap 0.35s ease-out' }}>
          {/* Daily Briefing Hero */}
          <CurrentHero briefing={briefing} loading={briefingLoading} />
          <div style={{ textAlign: 'center', margin: '1rem 0' }}>
            <button className="btn-primary" onClick={generate} disabled={generating}>
              {generating
                ? '✨ Generating Briefing...'
                : briefing
                  ? '🔄 Regenerate Briefing'
                  : '✨ Generate Briefing'}
            </button>
          </div>

          {/* Ripple Radar */}
          <RippleCard ripples={ripples} />
          <div style={{ textAlign: 'center', margin: '1rem 0' }}>
            <button className="btn-primary" onClick={detect} disabled={ripplesLoading}>
              {ripplesLoading ? '🔍 Scanning...' : '🌊 Detect Ripples'}
            </button>
          </div>

          {/* Signal Threads */}
          <SignalThread threads={threads} onCreateThread={handleCreateThread} />

          {/* Question Engine */}
          <QuestionEngine
            result={questionResult}
            history={questionHistory}
            loading={questionLoading}
            onSubmit={ask}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          FEED SECTION
          ════════════════════════════════════════════════════ */}
      {activeSection === 'feed' && (
        <div style={{ animation: 'currentCardSnap 0.35s ease-out' }}>
          {/* Feed Type Filters */}
          <div className="feed-filters" style={{ marginBottom: '1rem' }}>
            <button
              className={`current-feed-filter-btn${filter === 'all' ? ' active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            {Object.entries(FEED_TYPE_CONFIG).map(([key, config]) => (
              <button
                key={key}
                className={`current-feed-filter-btn${filter === key ? ' active' : ''}`}
                onClick={() => setFilter(key)}
              >
                {config.emoji} {key.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Feed Items */}
          {feedLoading ? (
            <div className="feed-loading">Loading your feed...</div>
          ) : filtered.length === 0 ? (
            <div className="feed-empty">
              <p>Your feed is empty!</p>
              <p className="feed-empty-hint">Generate a briefing or refresh the feed to see content.</p>
            </div>
          ) : (
            <div className="feed-list">
              {filtered.map(item => {
                const typeConfig = FEED_TYPE_CONFIG[item.content_type] ?? { emoji: '📋', color: '#6b7280' };
                return (
                  <div
                    key={item.id}
                    className={`feed-item ${item.is_read ? 'read' : 'unread'}`}
                    onClick={() => !item.is_read && markRead(item.id)}
                  >
                    <div className="feed-item-header">
                      <span className="feed-item-type" style={{ background: `${typeConfig.color}15`, color: typeConfig.color }}>
                        {typeConfig.emoji} {item.content_type.replace('_', ' ')}
                      </span>
                      <span className="feed-item-time">{timeAgo(item.created_at)}</span>
                    </div>

                    <h3 className="feed-item-title">{item.title}</h3>
                    <p className="feed-item-body">{item.body}</p>

                    <div className="feed-item-footer">
                      {item.category && (
                        <span className="feed-item-category">{item.category}</span>
                      )}
                      <div className="feed-item-actions">
                        {item.source_url && (
                          <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="feed-link" onClick={e => e.stopPropagation()}>
                            🔗 Source
                          </a>
                        )}
                        <button
                          className="feed-bookmark-btn"
                          onClick={e => { e.stopPropagation(); toggleBookmark(item.id); }}
                          title={item.is_bookmarked ? 'Remove bookmark' : 'Bookmark'}
                        >
                          {item.is_bookmarked ? '⭐' : '☆'}
                        </button>
                      </div>
                    </div>

                    {!item.is_read && <div className="feed-unread-dot" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          INTELLIGENCE SECTION
          ════════════════════════════════════════════════════ */}
      {activeSection === 'cognitive' && (
        <div style={{ animation: 'currentCardSnap 0.35s ease-out' }}>
          <CognitiveDashboard pattern={pattern} loading={patternLoading} />
          <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
            <button className="btn-primary" onClick={() => analyze()} disabled={patternLoading}>
              {patternLoading ? '🧬 Analyzing...' : '🧠 Analyze My Patterns'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
