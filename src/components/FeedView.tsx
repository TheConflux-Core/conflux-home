// Conflux Home — Content Feed View
// AI-curated daily brief: news, tips, challenges, fun facts, reminders.

import { useState, useCallback } from 'react';
import { useContentFeed } from '../hooks/useFeed';
import { FEED_TYPE_CONFIG } from '../types';

export default function FeedView() {
  const { items, loading, generating, unreadCount, markRead, toggleBookmark, generate } = useContentFeed();
  const [filter, setFilter] = useState<string>('all');
  const [showBookmarks, setShowBookmarks] = useState(false);

  const handleGenerate = useCallback(async () => {
    await generate();
  }, [generate]);

  const filtered = items.filter(item => {
    if (showBookmarks && !item.is_bookmarked) return false;
    if (filter !== 'all' && item.content_type !== filter) return false;
    return true;
  });

  const timeAgo = (date: string): string => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="feed-view">
      {/* Header */}
      <div className="feed-header">
        <div>
          <h2 className="feed-title">📰 Your Feed</h2>
          {unreadCount > 0 && <span className="feed-badge">{unreadCount} new</span>}
        </div>
        <button className="btn-primary" onClick={handleGenerate} disabled={generating}>
          {generating ? '✨ Generating...' : '✨ Refresh Feed'}
        </button>
      </div>

      {/* Filters */}
      <div className="feed-filters">
        <button className={`genre-btn ${!showBookmarks && filter === 'all' ? 'active' : ''}`} onClick={() => { setFilter('all'); setShowBookmarks(false); }}>
          All
        </button>
        <button className={`genre-btn ${showBookmarks ? 'active' : ''}`} onClick={() => setShowBookmarks(!showBookmarks)}>
          ⭐ Saved
        </button>
        {Object.entries(FEED_TYPE_CONFIG).map(([key, config]) => (
          <button
            key={key}
            className={`genre-btn ${filter === key && !showBookmarks ? 'active' : ''}`}
            onClick={() => { setFilter(key); setShowBookmarks(false); }}
          >
            {config.emoji} {key.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Feed Items */}
      {loading ? (
        <div className="feed-loading">Loading your feed...</div>
      ) : filtered.length === 0 ? (
        <div className="feed-empty">
          <p>Your feed is empty!</p>
          <p className="feed-empty-hint">Click "Refresh Feed" to generate personalized content.</p>
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
  );
}
