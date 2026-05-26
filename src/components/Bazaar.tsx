import { useState, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { MARKETPLACE_ITEMS, MarketplaceItem, MarketplaceItemType } from '../data/marketplace-items';
import '../styles-bazaar.css';
import '../styles-marketplace.css';

// ── Types ─────────────────────────────────────────────────────────

type CardVariant = 'hero' | 'browse' | 'grid' | 'owned';

interface BazaarCardProps {
  item: MarketplaceItem;
  variant: CardVariant;
  onOpen: () => void;
  onInstall: (e: React.MouseEvent) => void;
}

// ── Coming Soon Data ──────────────────────────────────────────────

const COMING_SOON_ITEMS = MARKETPLACE_ITEMS.filter((i) => i.status === 'coming-soon');
const OWNED_ITEMS = MARKETPLACE_ITEMS.filter((i) => i.status === 'installed');

// ── Bazaar ─────────────────────────────────────────────────────────

export default function Bazaar() {
  const [search, setSearch] = useState('');

  const filteredComingSoon = useMemo(() => {
    if (!search.trim()) return COMING_SOON_ITEMS;
    const q = search.toLowerCase();
    return COMING_SOON_ITEMS.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.tagline.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.skills.some((s) => s.toLowerCase().includes(q))
    );
  }, [search]);

  const filteredOwned = useMemo(() => {
    if (!search.trim()) return OWNED_ITEMS;
    const q = search.toLowerCase();
    return OWNED_ITEMS.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.tagline.toLowerCase().includes(q) ||
        i.skills.some((s) => s.toLowerCase().includes(q))
    );
  }, [search]);

  const handleOpen = useCallback((item: MarketplaceItem) => {
    if (item.status === 'coming-soon') return;
    window.dispatchEvent(
      new CustomEvent('conflux:navigate', {
        detail: { viewId: item.viewId, gameId: item.gameId },
      })
    );
  }, []);

  const handleInstall = useCallback(
    async (item: MarketplaceItem, e: React.MouseEvent) => {
      e.stopPropagation();
      if (item.status !== 'available') return;
      try {
        await invoke('agent_template_install', { template_id: item.agentId, member_id: null });
      } catch {
        // silent
      }
    },
    []
  );

  return (
    <div className="bazaar-root">
      {/* Black overlay — background image barely visible */}
      <div className="bazaar-overlay" />
      <div className="bazaar-hub">
        {/* ── Hero Header ── */}
        <div className="bazaar-hero">
          <div className="bazaar-hero-glow" />
          <div className="bazaar-hero-content">
            <div className="bazaar-logo-mark">
              <svg width="48" height="48" viewBox="0 0 56 56" fill="none">
                <rect x="4" y="20" width="48" height="32" rx="4" fill="rgba(245,200,66,0.12)" stroke="rgba(245,200,66,0.4)" strokeWidth="1.5"/>
                <rect x="10" y="26" width="12" height="10" rx="2" fill="rgba(245,200,66,0.2)" stroke="rgba(245,200,66,0.3)" strokeWidth="1"/>
                <rect x="26" y="26" width="12" height="10" rx="2" fill="rgba(245,200,66,0.2)" stroke="rgba(245,200,66,0.3)" strokeWidth="1"/>
                <rect x="10" y="40" width="12" height="8" rx="2" fill="rgba(245,200,66,0.2)" stroke="rgba(245,200,66,0.3)" strokeWidth="1"/>
                <rect x="26" y="40" width="12" height="8" rx="2" fill="rgba(245,200,66,0.2)" stroke="rgba(245,200,66,0.3)" strokeWidth="1"/>
                <path d="M28 4 L32 16 L50 16 L36 24 L40 36 L28 28 L16 36 L20 24 L6 16 L24 16 Z" fill="rgba(245,200,66,0.9)" stroke="rgba(245,200,66,0.6)" strokeWidth="1"/>
              </svg>
            </div>
            <div className="bazaar-hero-text">
              <h1 className="bazaar-title">Bazaar</h1>
              <p className="bazaar-subtitle">Discover what's next for your AI home</p>
            </div>
          </div>

          {/* Search */}
          <div className="bazaar-search-row">
            <div className="bazaar-search-inner">
              <span className="bazaar-search-icon">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search apps, agents, games..."
                className="bazaar-search-input"
              />
              {search && (
                <button className="bazaar-search-clear" onClick={() => setSearch('')}>✕</button>
              )}
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="bazaar-content">

          {/* ── Coming Soon Section — THE HERO ── */}
          {filteredComingSoon.length > 0 && (
            <div className="bazaar-section bazaar-section--coming-soon">
              <div className="bazaar-section-header">
                <div className="bazaar-section-accent bazaar-section-accent--soon" />
                <div className="bazaar-section-meta">
                  <span className="bazaar-eyebrow">Early Access</span>
                  <h2 className="bazaar-section-title">Coming Soon</h2>
                </div>
                <div className="bazaar-section-badge">
                  <span className="bazaar-count-badge">{filteredComingSoon.length}</span>
                  <span className="bazaar-count-label">upcoming</span>
                </div>
              </div>
              <p className="bazaar-section-desc">
                Be the first to know when these arrive. Join the waitlist and help shape what's next.
              </p>
              <div className="bazaar-coming-soon-grid">
                {filteredComingSoon.map((item) => (
                  <ComingSoonCard
                    key={item.id}
                    item={item}
                    onOpen={() => handleOpen(item)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Your Apps Section ── */}
          {filteredOwned.length > 0 && (
            <div className="bazaar-section bazaar-section--your-apps">
              <div className="bazaar-section-header">
                <div className="bazaar-section-accent bazaar-section-accent--owned" />
                <div className="bazaar-section-meta">
                  <span className="bazaar-eyebrow">Active</span>
                  <h2 className="bazaar-section-title bazaar-section-title--owned">Your Apps</h2>
                </div>
                <div className="bazaar-section-badge">
                  <span className="bazaar-count-badge bazaar-count-badge--owned">{filteredOwned.length}</span>
                  <span className="bazaar-count-label">installed</span>
                </div>
              </div>

              {/* App type groups */}
              {(['app', 'game', 'agent'] as MarketplaceItemType[]).map((type) => {
                const typeItems = filteredOwned.filter((i) => i.type === type);
                if (!typeItems.length) return null;
                const typeLabel = type === 'app' ? 'Apps' : type === 'game' ? 'Games' : 'Agents';
                return (
                  <div key={type} className="bazaar-type-group">
                    <div className="bazaar-type-group-header">
                      <span className="bazaar-type-group-label">{typeLabel}</span>
                      <div className="bazaar-type-group-line" />
                    </div>
                    <div className="bazaar-owned-card-row">
                      {typeItems.map((item) => (
                        <OwnedCard
                          key={item.id}
                          item={item}
                          onOpen={() => handleOpen(item)}
                          onInstall={(e) => handleInstall(item, e)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Empty State ── */}
          {filteredComingSoon.length === 0 && filteredOwned.length === 0 && (
            <div className="bazaar-empty">
              <span className="bazaar-empty-icon">🔭</span>
              <h3 className="bazaar-empty-title">Nothing found</h3>
              <p className="bazaar-empty-desc">Try a different search or browse all categories.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Coming Soon Card ───────────────────────────────────────────────

function ComingSoonCard({ item, onOpen }: { item: MarketplaceItem; onOpen: () => void }) {
  return (
    <div className="cs-card" onClick={onOpen}>
      {/* Glow blob */}
      <div className="cs-card-glow" />

      {/* Header */}
      <div className="cs-card-header">
        <div className="cs-card-icon-wrap">
          <span className="cs-card-emoji">{item.emoji}</span>
        </div>
        <div className="cs-card-type-badge">
          {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
        </div>
      </div>

      {/* Body */}
      <div className="cs-card-body">
        <h3 className="cs-card-name">{item.name}</h3>
        <p className="cs-card-tagline">{item.tagline}</p>
        <p className="cs-card-desc">{item.description}</p>
      </div>

      {/* Skills */}
      <div className="cs-card-skills">
        {item.skills.map((skill) => (
          <span key={skill} className="cs-skill-tag">{skill}</span>
        ))}
      </div>

      {/* Footer */}
      <div className="cs-card-footer">
        <button className="cs-waitlist-btn" onClick={(e) => e.stopPropagation()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a-2 2 0 0 1-3.46 0"/>
          </svg>
          Join Waitlist
        </button>
        <span className="cs-soon-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10"/>
          </svg>
          Coming Soon
        </span>
      </div>
    </div>
  );
}

// ── Owned Card ─────────────────────────────────────────────────────

function OwnedCard({ item, onOpen, onInstall }: Omit<BazaarCardProps, 'variant'>) {
  const isInstalled = item.status === 'installed';
  return (
    <div className="owned-card" onClick={onOpen}>
      <div className="owned-card-accent" />
      <div className="owned-card-header">
        <span className="owned-card-emoji">{item.emoji}</span>
        <span className="owned-card-type-badge">{item.type}</span>
      </div>
      <div className="owned-card-body">
        <h4 className="owned-card-name">{item.name}</h4>
        <p className="owned-card-tagline">{item.tagline}</p>
      </div>
      <div className="owned-card-footer">
        {isInstalled ? (
          <button className="owned-open-btn" onClick={onOpen}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
            Open
          </button>
        ) : (
          <button className="owned-install-btn" onClick={onInstall}>
            + Install
          </button>
        )}
        {isInstalled && <span className="owned-active-dot" title="Active" />}
      </div>
    </div>
  );
}
