import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { MARKETPLACE_ITEMS, MarketplaceItem, MarketplaceItemType } from '../data/marketplace-items';
import '../styles-marketplace.css';

// ── Type & Category Config ─────────────────────────────────────

type TypeTab = 'all' | MarketplaceItemType;

const TYPE_TABS: { id: TypeTab; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '✦' },
  { id: 'app', label: 'Apps', emoji: '◆' },
  { id: 'game', label: 'Games', emoji: '♦' },
  { id: 'agent', label: 'Agents', emoji: '◈' },
];

const TYPE_LABELS: Record<MarketplaceItemType, string> = {
  app: 'App',
  game: 'Game',
  agent: 'Agent',
};

// Per-category accent colors
const CATEGORY_COLORS: Record<string, string> = {
  all: '#f5c842',
  life: '#ff8844',
  productivity: '#00cc88',
  knowledge: '#64748b',
  classic: '#fbbf24',
  story: '#cc66aa',
  creative: '#ff66cc',
  work: '#00d4ff',
  expert: '#ff6633',
  education: '#8b5cf6',
  fun: '#ff44aa',
};

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? '#f5c842';
}

// ── Hero Particles ──────────────────────────────────────────────

function HeroParticles() {
  const particles = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      size: 2 + Math.random() * 3,
      duration: 4 + Math.random() * 6,
      delay: Math.random() * 5,
      opacity: 0.15 + Math.random() * 0.35,
    }));
  }, []);

  return (
    <div className="hero-particles">
      {particles.map((p) => (
        <div
          key={p.id}
          className="hero-particle"
          style={{
            left: p.left,
            bottom: '10%',
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            '--max-opacity': p.opacity,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ── Marketplace ────────────────────────────────────────────────

export default function Marketplace() {
  const [typeTab, setTypeTab] = useState<TypeTab>('all');
  const [categoryTab, setCategoryTab] = useState('all');
  const [search, setSearch] = useState('');
  const [localStatus, setLocalStatus] = useState<Record<string, MarketplaceItem['status']>>({});
  const [searchFocused, setSearchFocused] = useState(false);

  // All categories visible under the current type
  const categories = useMemo(() => {
    const source =
      typeTab === 'all'
        ? MARKETPLACE_ITEMS
        : MARKETPLACE_ITEMS.filter((i) => i.type === typeTab);
    const cats = [...new Set(source.map((i) => i.category))];
    return ['all', ...cats.sort()];
  }, [typeTab]);

  const handleTypeTab = useCallback((id: TypeTab) => {
    setTypeTab(id);
    setCategoryTab('all');
  }, []);

  // Items after all filters applied
  const filteredItems = useMemo(() => {
    let items = MARKETPLACE_ITEMS;
    if (typeTab !== 'all') items = items.filter((i) => i.type === typeTab);
    if (categoryTab !== 'all') items = items.filter((i) => i.category === categoryTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.tagline.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.skills.some((s) => s.toLowerCase().includes(q))
      );
    }
    return items.map((i) => ({ ...i, status: localStatus[i.id] ?? i.status }));
  }, [typeTab, categoryTab, search, localStatus]);

  // Featured items — only on All + no search
  const featuredItems = useMemo(() => {
    if (typeTab !== 'all' || search.trim()) return [];
    return MARKETPLACE_ITEMS.filter((i) => i.featured).map((i) => ({
      ...i,
      status: localStatus[i.id] ?? i.status,
    }));
  }, [typeTab, search, localStatus]);

  // Group non-featured items by category
  const groupedItems = useMemo(() => {
    if (typeTab !== 'all' || search.trim()) return [];
    const nonFeatured = filteredItems.filter((i) => !i.featured);
    const groups: Record<string, MarketplaceItem[]> = {};
    for (const item of nonFeatured) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [typeTab, search, filteredItems]);

  // Handlers
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
      if (item.status === 'coming-soon' || item.status === 'installed') return;
      try {
        await invoke('agent_template_install', { template_id: item.agentId, member_id: null });
        setLocalStatus((prev) => ({ ...prev, [item.id]: 'installed' }));
      } catch {
        // leave as available
      }
    },
    []
  );

  const getButtonText = (status: MarketplaceItem['status']) => {
    switch (status) {
      case 'installed': return '✓ Open';
      case 'available': return '+ Install';
      case 'coming-soon': return 'Coming Soon';
    }
  };

  const isGroupedBrowse = typeTab === 'all' && !search.trim() && categoryTab === 'all';
  const installedCount = MARKETPLACE_ITEMS.filter(i => i.status === 'installed').length;
  const availableCount = MARKETPLACE_ITEMS.filter(i => i.status === 'available').length;

  return (
    <div className="marketplace-hub">
      {/* ── Hero — The Grand Entrance ── */}
      <div className="marketplace-hero">
        <div className="marketplace-hero-glow" />
        <HeroParticles />
        <div className="marketplace-hero-content">
          <div className="marketplace-hero-icon">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
              {/* Bazaar tent/market icon */}
              <path d="M28 6 L6 24 H50 Z" fill="rgba(245,200,66,0.12)" stroke="rgba(245,200,66,0.35)" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M14 24 V46 H42 V24" fill="none" stroke="rgba(245,200,66,0.2)" strokeWidth="1"/>
              <rect x="22" y="34" width="12" height="12" rx="2" fill="rgba(245,200,66,0.08)" stroke="rgba(245,200,66,0.25)" strokeWidth="1"/>
              <circle cx="28" cy="16" r="2.5" fill="rgba(245,200,66,0.6)"/>
              {/* Hanging lanterns */}
              <line x1="18" y1="24" x2="18" y2="30" stroke="rgba(245,200,66,0.2)" strokeWidth="0.8"/>
              <circle cx="18" cy="31" r="2" fill="rgba(245,200,66,0.15)" stroke="rgba(245,200,66,0.3)" strokeWidth="0.8"/>
              <line x1="38" y1="24" x2="38" y2="30" stroke="rgba(245,200,66,0.2)" strokeWidth="0.8"/>
              <circle cx="38" cy="31" r="2" fill="rgba(245,200,66,0.15)" stroke="rgba(245,200,66,0.3)" strokeWidth="0.8"/>
              {/* Base line */}
              <line x1="4" y1="46" x2="52" y2="46" stroke="rgba(245,200,66,0.15)" strokeWidth="1"/>
            </svg>
          </div>
          <h1 className="marketplace-hero-title">The Bazaar</h1>
          <p className="marketplace-hero-sub">
            Discover your next AI companion — {installedCount} installed, {availableCount} ready to meet
          </p>
        </div>
      </div>

      {/* ── Sticky Filter Bar ── */}
      <div className="marketplace-filters">
        <div className="marketplace-content">

          {/* Search */}
          <div className="marketplace-search">
            <div className="marketplace-search-inner">
              <span className="marketplace-search-icon">◈</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Find your next agent..."
              />
              {search && (
                <button className="search-clear" onClick={() => setSearch('')}>✕</button>
              )}
            </div>
            {search.trim() && (
              <div className="search-results-count">
                {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''} found
              </div>
            )}
          </div>

          {/* Type Tabs */}
          <div className="marketplace-tabs-row">
            <div className="marketplace-type-tabs">
              {TYPE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`type-tab ${typeTab === tab.id ? 'active' : ''}`}
                  data-type={tab.id}
                  onClick={() => handleTypeTab(tab.id)}
                >
                  {tab.emoji} {tab.label}
                </button>
              ))}
            </div>

            {/* Category Tabs */}
            {(typeTab !== 'all' || (typeTab === 'all' && categoryTab !== 'all')) && (
              <div className="marketplace-category-tabs">
                <button
                  className={`category-tab ${categoryTab === 'all' ? 'active' : ''}`}
                  onClick={() => setCategoryTab('all')}
                  style={{ '--cat-color': '#f5c842' } as React.CSSProperties}
                >
                  All
                </button>
                {categories.filter((c) => c !== 'all').map((cat) => (
                  <button
                    key={cat}
                    className={`category-tab ${categoryTab === cat ? 'active' : ''}`}
                    onClick={() => setCategoryTab(cat)}
                    style={{ '--cat-color': categoryColor(cat) } as React.CSSProperties}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="marketplace-content marketplace-body">

        {/* ── Grouped Browse View (All, no filter) ── */}
        {isGroupedBrowse && (
          <>
            {/* Featured row */}
            {featuredItems.length > 0 && (
              <div className="marketplace-section">
                <div className="marketplace-section-header">
                  <div className="section-header-accent" style={{ background: 'linear-gradient(180deg, #f5c842, #f0a830)' }} />
                  <div>
                    <span className="section-eyebrow">Handpicked</span>
                    <h2 className="marketplace-section-title">Featured</h2>
                  </div>
                </div>
                <div className="marketplace-card-row">
                  {featuredItems.map((item) => (
                    <MarketplaceCard
                      key={item.id}
                      item={item}
                      variant="featured"
                      onOpen={() => handleOpen(item)}
                      onInstall={(e) => handleInstall(item, e)}
                      getButtonText={getButtonText}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Category groups */}
            {groupedItems.map(([category, items]) => (
              <div key={category} className="marketplace-section">
                <div className="marketplace-section-header">
                  <div
                    className="section-header-accent"
                    style={{ background: `linear-gradient(180deg, ${categoryColor(category)}, ${categoryColor(category)}66)` }}
                  />
                  <div className="section-header-text">
                    <span className="section-eyebrow">Browse</span>
                    <h2 className="marketplace-section-title" style={{ color: categoryColor(category) }}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </h2>
                    <span className="section-count">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="marketplace-card-row">
                  {items.map((item) => (
                    <MarketplaceCard
                      key={item.id}
                      item={item}
                      variant="browse"
                      onOpen={() => handleOpen(item)}
                      onInstall={(e) => handleInstall(item, e)}
                      getButtonText={getButtonText}
                    />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── Grid View (type selected OR search active OR category selected) ── */}
        {!isGroupedBrowse && filteredItems.length > 0 && (
          <div className="marketplace-grid">
            {filteredItems.map((item) => (
              <MarketplaceCard
                key={item.id}
                item={item}
                variant="grid"
                onOpen={() => handleOpen(item)}
                onInstall={(e) => handleInstall(item, e)}
                getButtonText={getButtonText}
              />
            ))}
          </div>
        )}

        {/* ── Empty State ── */}
        {filteredItems.length === 0 && (
          <div className="marketplace-empty">
            <div className="empty-icon-wrap">
              <span className="empty-emoji">◈</span>
            </div>
            <h3>Nothing here yet</h3>
            <p>
              {search.trim()
                ? `No matches for "${search}" — try a different search`
                : 'No items in this category yet. Check back soon.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Card Component ────────────────────────────────────────────────

type CardVariant = 'featured' | 'browse' | 'grid';

function MarketplaceCard({
  item,
  variant,
  onOpen,
  onInstall,
  getButtonText,
}: {
  item: MarketplaceItem;
  variant: CardVariant;
  onOpen: () => void;
  onInstall: (e: React.MouseEvent) => void;
  getButtonText: (s: MarketplaceItem['status']) => string;
}) {
  const isDisabled = item.status === 'coming-soon';
  const cardStyle = { '--card-color': item.color } as React.CSSProperties;

  return (
    <div
      className={`mp-card mp-card--${variant} ${isDisabled ? 'mp-card--disabled' : ''}`}
      style={cardStyle}
      onClick={isDisabled ? undefined : onOpen}
    >
      {/* Color accent top bar */}
      <div className="mp-card-accent" />

      {/* Card header row */}
      <div className="mp-card-header">
        <span className="mp-card-emoji">{item.emoji}</span>
        <div className="mp-card-meta">
          <span className="mp-card-type-badge">{TYPE_LABELS[item.type]}</span>
          {item.status === 'installed' && <span className="mp-installed-dot" title="Installed" />}
        </div>
      </div>

      {/* Content */}
      <div className="mp-card-body">
        <h3 className="mp-card-name">{item.name}</h3>
        <p className="mp-card-tagline">{item.tagline}</p>

        {/* Skill tags */}
        <div className="mp-card-skills">
          {item.skills.slice(0, 3).map((skill) => (
            <span key={skill} className="mp-skill-tag">{skill}</span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mp-card-footer">
        <button
          className={`mp-card-action mp-card-action--${item.status}`}
          onClick={item.status === 'available' ? onInstall : item.status === 'installed' ? onOpen : undefined}
          disabled={isDisabled}
        >
          {getButtonText(item.status)}
        </button>
      </div>
    </div>
  );
}
