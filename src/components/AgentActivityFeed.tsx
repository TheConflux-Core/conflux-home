// Conflux Home — Agent Activity Feed
// Real-time timeline of heartbeat agent outputs for Orbit view.
// Lives at the top of the Orbit/LifeAutopilotView as the primary content area.

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from '../contexts/AuthContext';
import '../styles/orbit-activity-feed.css';

// ── Types ────────────────────────────────────────────────────────────

export interface ActivityEntry {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_emoji: string | null;
  action: string;
  summary: string;
  detail: string | null;
  action_items: string | null;
  chain_run_id: string | null;
  dismissed: boolean;
  created_at: string;
}

interface ActivityFeedResponse {
  entries: ActivityEntry[];
  total_count: number;
  has_more: boolean;
}

// ── Agent Colors ─────────────────────────────────────────────────────

const AGENT_COLORS: Record<string, string> = {
  conflux:  '#8b5cf6',
  aegis:    '#38bdf8',
  helix:    '#a78bfa',
  pulse:    '#34d399',
  viper:    '#22c55e',
  horizon:  '#f472b6',
  orbit:    '#e879f9',
  hearth:   '#fb923c',
  echo:     '#f472b6',
};

function agentColor(agentId: string): string {
  return AGENT_COLORS[agentId] ?? '#94a3b8';
}

// ── Timestamp Formatting ──────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Action Execution ───────────────────────────────────────────────────

const ACTION_HANDLERS: Record<string, (text: string, userId?: string) => void> = {
  log_expense: (_text) => {
    window.dispatchEvent(new CustomEvent('conflux:ui-action', {
      detail: { widget: 'activeApp', action: 'set', value: 'budget' },
    }));
  },
  add_grocery: async (text) => {
    const itemName = text
      .replace(/^(add|buy|get|pick up|grab)\s+/i, '')
      .replace(/\s+to (your )?(grocery|shopping) list/i, '')
      .trim();
    try {
      await invoke('kitchen_add_grocery_item', {
        name: itemName || text,
        quantity: null,
        unit: null,
        category: null,
        estimatedCost: null,
        weekStart: null,
        memberId: null,
      });
      window.dispatchEvent(new CustomEvent('conflux:ui-action', {
        detail: { widget: 'activeApp', action: 'set', value: 'kitchen' },
      }));
    } catch (e) {
      console.error('[AgentActivityFeed] Failed to add grocery item:', e);
      window.dispatchEvent(new CustomEvent('conflux:ui-action', {
        detail: { widget: 'activeApp', action: 'set', value: 'kitchen' },
      }));
    }
  },
  plan_meals: (_text) => {
    window.dispatchEvent(new CustomEvent('conflux:ui-action', {
      detail: { widget: 'activeApp', action: 'set', value: 'kitchen' },
    }));
  },
  create_task: async (text, userId) => {
    const title = text
      .replace(/^(create|add|set up|start)\s+/i, '')
      .replace(/\s*(a )?task/i, '')
      .trim();
    if (userId) {
      try {
        await invoke('life_add_task', {
          user_id: userId,
          title: title || text,
          category: 'personal',
          priority: 'medium',
          due_date: null,
          energy_type: null,
        });
      } catch (e) {
        console.error('[AgentActivityFeed] Failed to create task:', e);
      }
    }
    window.dispatchEvent(new CustomEvent('conflux:ui-action', {
      detail: { widget: 'activeApp', action: 'set', value: 'life' },
    }));
  },
  view_milestones: (_text) => {
    window.dispatchEvent(new CustomEvent('conflux:ui-action', {
      detail: { widget: 'activeApp', action: 'set', value: 'dreams' },
    }));
  },
  'navigate:budget': () => {
    window.dispatchEvent(new CustomEvent('conflux:ui-action', {
      detail: { widget: 'activeApp', action: 'set', value: 'budget' },
    }));
  },
  'navigate:kitchen': () => {
    window.dispatchEvent(new CustomEvent('conflux:ui-action', {
      detail: { widget: 'activeApp', action: 'set', value: 'kitchen' },
    }));
  },
  'navigate:dreams': () => {
    window.dispatchEvent(new CustomEvent('conflux:ui-action', {
      detail: { widget: 'activeApp', action: 'set', value: 'dreams' },
    }));
  },
  'navigate:life': () => {
    window.dispatchEvent(new CustomEvent('conflux:ui-action', {
      detail: { widget: 'activeApp', action: 'set', value: 'life' },
    }));
  },
  'navigate:echo': () => {
    window.dispatchEvent(new CustomEvent('conflux:ui-action', {
      detail: { widget: 'activeApp', action: 'set', value: 'echo' },
    }));
  },
};

function executeAction(actionType: string, text: string, userId?: string) {
  const handler = ACTION_HANDLERS[actionType];
  if (handler) {
    handler(text, userId);
  } else {
    console.log('[AgentActivityFeed] No handler for action type:', actionType);
  }
}

// ── Action Item Pills ─────────────────────────────────────────────────

interface ActionItem {
  text: string;
  action: string;
}

function ActionPills({ itemsJson, userId }: { itemsJson: string | null; userId?: string }) {
  if (!itemsJson) return null;
  let rawItems: any[] = [];
  try { rawItems = JSON.parse(itemsJson); } catch { return null; }
  if (!rawItems.length) return null;

  // Normalize: support both old format (plain strings) and new format (objects with text+action)
  const items: ActionItem[] = rawItems.map(item => {
    if (typeof item === 'string') return { text: item, action: 'none' };
    return { text: item.text || String(item), action: item.action || 'none' };
  });

  return (
    <div className="orbit-pills">
      {items.slice(0, 4).map((item, i) => {
        const hasAction = item.action && item.action !== 'none';
        const truncated = item.text.length > 50 ? item.text.slice(0, 50) + '…' : item.text;
        return (
          <button
            key={i}
            className={`orbit-pill ${hasAction ? 'orbit-pill-action' : 'orbit-pill-inert'}`}
            onClick={hasAction ? () => executeAction(item.action, item.text, userId) : undefined}
            title={hasAction ? `Click to: ${item.text}` : item.text}
          >
            <span className="orbit-pill-icon">{hasAction ? '⚡' : '→'}</span>
            {truncated}
          </button>
        );
      })}
    </div>
  );
}

// ── Single Activity Entry ─────────────────────────────────────────────

function ActivityEntryRow({
  entry,
  onDismiss,
  userId,
}: {
  entry: ActivityEntry;
  onDismiss: (id: string) => void;
  userId?: string;
}) {
  const color = agentColor(entry.agent_id);
  const emoji = entry.agent_emoji ?? '⚙️';

  return (
    <motion.div
      className="orbit-entry"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Agent dot */}
      <div className="orbit-entry-dot-wrap">
        <div
          className="orbit-entry-dot"
          style={{
            background: `${color}18`,
            border: `2px solid ${color}`,
            ['--agent-color' as any]: color,
          }}
        >
          {emoji}
        </div>
      </div>

      {/* Content */}
      <div className="orbit-entry-content">
        <div className="orbit-entry-meta">
          <span className="orbit-entry-agent" style={{ color }}>
            {entry.agent_name}
          </span>
          <span className="orbit-entry-action">
            {entry.action.replace(/_/g, ' ')}
          </span>
          <span className="orbit-entry-time">
            {timeAgo(entry.created_at)}
          </span>
        </div>

        <p className="orbit-entry-summary">
          {entry.summary}
        </p>

        {entry.action_items && (
          <ActionPills itemsJson={entry.action_items} userId={userId} />
        )}
      </div>

      {/* Dismiss */}
      <button
        className="orbit-entry-dismiss"
        onClick={() => onDismiss(entry.id)}
        title="Dismiss"
      >
        ×
      </button>
    </motion.div>
  );
}

// ── Skeleton Loading ───────────────────────────────────────────────────

function SkeletonEntry() {
  return (
    <div className="orbit-skeleton">
      <div className="orbit-skeleton-dot" />
      <div className="orbit-skeleton-lines">
        <div className="orbit-skeleton-line orbit-skeleton-line-1" />
        <div className="orbit-skeleton-line orbit-skeleton-line-2" />
        <div className="orbit-skeleton-line orbit-skeleton-line-3" />
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="orbit-feed-empty">
      <div className="orbit-feed-empty-icon">🌱</div>
      <p className="orbit-feed-empty-title">Your agents are waking up...</p>
      <p className="orbit-feed-empty-sub">
        Activity will appear here when the heartbeat chain runs.
      </p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export default function AgentActivityFeed() {
  const { user } = useAuthContext();
  const userId = user?.id || '';
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  // Fetch initial feed
  const fetchFeed = useCallback(async (all = false) => {
    try {
      const result = await invoke<ActivityFeedResponse>('heartbeat_get_activity_feed', {
        limit: all ? 50 : 5,
        offset: 0,
        includeDismissed: false,
      });
      setEntries(result.entries);
    } catch (e) {
      console.error('[AgentActivityFeed] Failed to fetch:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed(showAll);
  }, [fetchFeed, showAll]);

  // Listen for real-time activity-new events from the heartbeat chain
  useEffect(() => {
    let disposed = false;

    const unlistenPromise = listen<ActivityEntry>('conflux:activity-new', (event) => {
      if (disposed) return;
      const newEntry = event.payload;
      setEntries(prev => {
        if (prev.some(e => e.id === newEntry.id)) return prev;
        return [newEntry, ...prev];
      });
    });

    return () => {
      disposed = true;
      unlistenPromise.then(unlisten => unlisten());
    };
  }, []);

  // Dismiss an entry
  const handleDismiss = useCallback(async (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    try {
      await invoke('heartbeat_dismiss_activity', { id });
    } catch (e) {
      console.error('[AgentActivityFeed] Failed to dismiss:', e);
    }
  }, []);

  // Reload feed
  const handleRefresh = useCallback(() => {
    setLoading(true);
    fetchFeed(showAll);
  }, [fetchFeed, showAll]);

  return (
    <div className="orbit-feed">
      {/* Header */}
      <div className="orbit-feed-header">
        <div className="orbit-feed-title-group">
          <span className="orbit-feed-icon">⚡</span>
          <h3 className="orbit-feed-title">Agent Activity</h3>
          {!loading && entries.length > 0 && (
            <span className="orbit-feed-count">{entries.length}</span>
          )}
        </div>
        <div className="orbit-feed-actions">
          {entries.length >= 5 && !showAll && (
            <button className="orbit-feed-btn" onClick={() => setShowAll(true)}>
              View All
            </button>
          )}
          {showAll && (
            <button className="orbit-feed-btn" onClick={() => setShowAll(false)}>
              Collapse
            </button>
          )}
          <button
            className="orbit-feed-btn orbit-feed-btn-refresh"
            onClick={handleRefresh}
            title="Refresh"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Feed Content */}
      {loading ? (
        <div>
          {[1, 2, 3].map(i => <SkeletonEntry key={i} />)}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="orbit-timeline">
          <AnimatePresence>
            {entries.map(entry => (
              <ActivityEntryRow
                key={entry.id}
                entry={entry}
                onDismiss={handleDismiss}
                userId={userId}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
