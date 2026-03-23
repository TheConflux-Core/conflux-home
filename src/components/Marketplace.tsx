import { useState, useMemo } from 'react';
import { AGENT_PROFILES, AgentCategory } from '../data/agent-descriptions';
import Avatar from './Avatar';

// ─── Types ─────────────────────────────────────────────────────

export type CategoryType = AgentCategory;

interface MarketplaceAgent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  tagline: string;
  description: string;
  personality: string;
  skills: string[];
  bestFor: string[];
  avatarPath: string;
  color: string;
  category: CategoryType;
  isCore: boolean;
  comingSoon: boolean;
  installed: boolean;
}

// ─── Categories ────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '🌟' },
  { id: 'work', label: 'Work', emoji: '💼' },
  { id: 'life', label: 'Life', emoji: '🏥' },
  { id: 'creative', label: 'Creative', emoji: '🎨' },
  { id: 'fun', label: 'Fun', emoji: '🎮' },
  { id: 'expert', label: 'Expert', emoji: '🎓' },
];

// ─── Component ─────────────────────────────────────────────────

export default function Marketplace() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [installedSet, setInstalledSet] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('conflux-selected-agents');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Merge core + marketplace agents from unified AGENT_PROFILES
  const allAgents: MarketplaceAgent[] = useMemo(() => {
    return AGENT_PROFILES.map((p) => ({
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      role: p.role,
      tagline: p.tagline,
      description: p.description,
      personality: p.personality,
      skills: p.skills,
      bestFor: p.bestFor,
      avatarPath: p.avatarPath,
      color: p.color,
      category: p.category,
      isCore: !p.comingSoon,
      comingSoon: p.comingSoon ?? false,
      installed: !p.comingSoon && installedSet.has(p.id),
    }));
  }, [installedSet]);

  // Filter
  const filtered = useMemo(() => {
    let list = allAgents;
    if (selectedCategory !== 'all') {
      list = list.filter((a) => a.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q) ||
          a.tagline.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allAgents, selectedCategory, search]);

  // Featured: Legal Eagle, Code Sensei, Chef Bot
  const featuredIds = ['legal-expert', 'code-mentor', 'chef'];
  const featuredAgents = allAgents.filter((a) => featuredIds.includes(a.id));

  const handleInstall = (id: string, comingSoon: boolean) => {
    if (comingSoon) return;
    setInstalledSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem('conflux-selected-agents', JSON.stringify([...next]));
      return next;
    });
  };

  const handleCardClick = (id: string) => {
    window.dispatchEvent(new CustomEvent('conflux:agent-detail', { detail: { agentId: id } }));
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 4 }}>
          Agent Marketplace
        </h3>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
          Browse, install, and manage your AI agents.
        </p>
      </div>

      {/* Search + Category Tabs */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <span
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 14,
              opacity: 0.5,
            }}
          >
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents..."
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.08)',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 4,
            scrollbarWidth: 'none',
          }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: `1px solid ${selectedCategory === cat.id ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.1)'}`,
                background:
                  selectedCategory === cat.id ? 'rgba(123, 47, 255, 0.1)' : 'transparent',
                color:
                  selectedCategory === cat.id
                    ? 'var(--accent-secondary)'
                    : 'rgba(255,255,255,0.75)',
                cursor: 'pointer',
                fontSize: 12,
                whiteSpace: 'nowrap',
                fontWeight: selectedCategory === cat.id ? 600 : 400,
                transition: 'all 0.15s ease',
              }}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Section */}
      {selectedCategory === 'all' && !search.trim() && (
        <div style={{ marginBottom: 32 }}>
          <h4
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.75)',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ⭐ Featured
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 16,
            }}
          >
            {featuredAgents.map((agent, i) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onInstall={() => handleInstall(agent.id, agent.comingSoon)}
                onClick={() => handleCardClick(agent.id)}
                featured
                index={i}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Agents Grid */}
      <div>
        <h4
          style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.75)',
            marginBottom: 12,
          }}
        >
          {selectedCategory === 'all'
            ? 'All Agents'
            : CATEGORIES.find((c) => c.id === selectedCategory)?.label}{' '}
          ({filtered.length})
        </h4>
        <div className="marketplace-grid">
          {filtered.map((agent, i) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onInstall={() => handleInstall(agent.id, agent.comingSoon)}
              onClick={() => handleCardClick(agent.id)}
              index={i}
            />
          ))}
          {filtered.length === 0 && (
            <div className="marketplace-empty-state">
              <div className="marketplace-empty-emoji">🔍</div>
              <h4 className="marketplace-empty-title">No agents found</h4>
              <p className="marketplace-empty-text">
                Try a different search, or browse all agents.
              </p>
              <button
                className="marketplace-empty-btn"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('all');
                }}
              >
                Clear Search
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Agent Card Component ──────────────────────────────────────

function AgentCard({
  agent,
  onInstall,
  onClick,
  featured = false,
  index = 0,
}: {
  agent: MarketplaceAgent;
  onInstall: () => void;
  onClick: () => void;
  featured?: boolean;
  index?: number;
}) {
  return (
    <div
      className="marketplace-card"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        position: 'relative',
        animation: `card-enter 0.4s ease-out both`,
        animationDelay: `${index * 50}ms`,
        ...(featured
          ? {
              borderColor: 'var(--accent-secondary)',
              borderWidth: 1.5,
            }
          : {}),
      }}
    >
      {/* Coming Soon overlay */}
      {agent.comingSoon && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            fontSize: 10,
            padding: '3px 8px',
            borderRadius: 12,
            background: 'rgba(123, 47, 255, 0.15)',
            color: 'var(--accent-secondary)',
            fontWeight: 600,
            letterSpacing: 0.5,
          }}
        >
          🔒 Coming Soon
        </div>
      )}

      <div className="category-badge">{agent.category}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Avatar
          agentId={agent.id}
          name={agent.name}
          emoji={agent.emoji}
          status="idle"
          size="md"
          showStatus={false}
        />
        <div>
          <h3>{agent.name}</h3>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{agent.tagline}</div>
        </div>
      </div>

      <p className="description">{agent.description}</p>

      <div className="skills">
        {agent.skills.slice(0, 4).map((skill) => (
          <span key={skill} className="skill-tag">
            {skill}
          </span>
        ))}
      </div>

      <button
        className={`install-btn ${agent.installed ? 'installed' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onInstall();
        }}
        disabled={agent.comingSoon}
        style={
          agent.comingSoon
            ? {
                opacity: 0.5,
                cursor: 'not-allowed',
                borderColor: 'rgba(255,255,255,0.4)',
                color: 'rgba(255,255,255,0.6)',
              }
            : {}
        }
      >
        {agent.comingSoon
          ? '🔒 Coming Soon'
          : agent.installed
            ? '✓ Installed'
            : '+ Install Agent'}
      </button>
    </div>
  );
}
