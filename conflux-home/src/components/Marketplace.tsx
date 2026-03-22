import { useState, useMemo } from 'react';
import { AGENT_PROFILES } from '../data/agent-descriptions';
import Avatar from './Avatar';

// ─── Types ─────────────────────────────────────────────────────

type CategoryType = 'work' | 'life' | 'creative' | 'fun' | 'expert';

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

// ─── 8 Marketplace-Only Agents (Coming Soon) ───────────────────

interface MarketplaceAgentDraft {
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
}

const MARKETPLACE_AGENTS: MarketplaceAgentDraft[] = [
  {
    id: 'legal-expert',
    name: 'Legal Eagle',
    emoji: '⚖️',
    role: 'Legal Advisor',
    category: 'expert',
    tagline: 'Contract review and legal research',
    description: 'Reviews contracts, explains legal concepts, flags risks before you sign.',
    personality: 'Precise, cautious, thorough.',
    skills: ['contract-review', 'legal-research', 'compliance-check'],
    bestFor: ['Contract review', 'Legal research'],
    avatarPath: '/avatars/legal-expert.png',
    color: '#8866cc',
  },
  {
    id: 'chef',
    name: 'Chef Bot',
    emoji: '👨‍🍳',
    role: 'Recipe & Meal Planner',
    category: 'life',
    tagline: 'Recipe suggestions and meal planning',
    description: 'Creates meal plans based on your preferences, dietary needs, and what is in your fridge.',
    personality: 'Creative, encouraging, practical.',
    skills: ['recipe-suggestion', 'meal-planning', 'nutrition'],
    bestFor: ['Meal planning', 'Recipe discovery'],
    avatarPath: '/avatars/chef.png',
    color: '#cc8844',
  },
  {
    id: 'code-mentor',
    name: 'Code Sensei',
    emoji: '🥋',
    role: 'Coding Mentor',
    category: 'work',
    tagline: 'Learn to code with a patient teacher',
    description: 'Teaches programming concepts, reviews your code, and suggests improvements.',
    personality: 'Patient, methodical, encouraging.',
    skills: ['code-review', 'teaching', 'debugging'],
    bestFor: ['Learning to code', 'Code review'],
    avatarPath: '/avatars/code-mentor.png',
    color: '#44cc88',
  },
  {
    id: 'finance',
    name: 'Budget Buddy',
    emoji: '💰',
    role: 'Personal Finance',
    category: 'life',
    tagline: 'Personal finance and expense tracking',
    description: 'Helps you budget, track expenses, and find ways to save money.',
    personality: 'Analytical, supportive, practical.',
    skills: ['budgeting', 'expense-tracking', 'financial-advice'],
    bestFor: ['Budgeting', 'Expense tracking'],
    avatarPath: '/avatars/finance.png',
    color: '#44cc44',
  },
  {
    id: 'storyteller',
    name: 'Story Weaver',
    emoji: '📖',
    role: 'Creative Writer',
    category: 'creative',
    tagline: 'Creative writing and story generation',
    description: 'Generates stories, helps with writer feedback, creates worlds.',
    personality: 'Imaginative, vivid, collaborative.',
    skills: ['creative-writing', 'storytelling', 'world-building'],
    bestFor: ['Creative writing', 'Story generation'],
    avatarPath: '/avatars/storyteller.png',
    color: '#cc66aa',
  },
  {
    id: 'fitness',
    name: 'Fit Coach',
    emoji: '💪',
    role: 'Fitness Coach',
    category: 'life',
    tagline: 'Workout plans and health tips',
    description: 'Creates personalized workout plans and tracks your fitness goals.',
    personality: 'Motivating, realistic, supportive.',
    skills: ['workout-planning', 'nutrition', 'goal-tracking'],
    bestFor: ['Workout planning', 'Fitness goals'],
    avatarPath: '/avatars/fitness.png',
    color: '#ff6644',
  },
  {
    id: 'travel',
    name: 'Travel Guide',
    emoji: '✈️',
    role: 'Trip Planner',
    category: 'life',
    tagline: 'Trip planning and local recommendations',
    description: 'Plans trips, finds hidden gems, and creates itineraries.',
    personality: 'Adventurous, knowledgeable, enthusiastic.',
    skills: ['trip-planning', 'local-recommendations', 'booking-help'],
    bestFor: ['Trip planning', 'Local recommendations'],
    avatarPath: '/avatars/travel.png',
    color: '#4488ff',
  },
  {
    id: 'debate',
    name: 'Debate Partner',
    emoji: '🎤',
    role: 'Critical Thinker',
    category: 'fun',
    tagline: 'Argue any side, sharpen your thinking',
    description: 'Challenges your views, argues opposing positions, helps you think critically.',
    personality: 'Sharp, playful, intellectually honest.',
    skills: ['critical-thinking', 'argumentation', 'perspective-shifting'],
    bestFor: ['Debate practice', 'Critical thinking'],
    avatarPath: '/avatars/debate.png',
    color: '#ff44aa',
  },
];

// ─── Categories ────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '🌟' },
  { id: 'work', label: 'Work', emoji: '💼' },
  { id: 'life', label: 'Life', emoji: '🏥' },
  { id: 'creative', label: 'Creative', emoji: '🎨' },
  { id: 'fun', label: 'Fun', emoji: '🎮' },
  { id: 'expert', label: 'Expert', emoji: '🎓' },
];

// ─── Helpers ───────────────────────────────────────────────────

function inferCategory(id: string): CategoryType {
  const map: Record<string, CategoryType> = {
    zigbot: 'work',
    helix: 'work',
    forge: 'work',
    quanta: 'work',
    prism: 'work',
    pulse: 'work',
    vector: 'expert',
    spectra: 'work',
    luma: 'work',
    catalyst: 'work',
  };
  return map[id] ?? 'work';
}

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

  // Merge core + marketplace agents
  const allAgents: MarketplaceAgent[] = useMemo(() => {
    const core: MarketplaceAgent[] = AGENT_PROFILES.map((p) => ({
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
      category: inferCategory(p.id),
      isCore: true,
      comingSoon: false,
      installed: installedSet.has(p.id),
    }));
    const extra: MarketplaceAgent[] = MARKETPLACE_AGENTS.map((p) => ({
      ...p,
      isCore: false,
      comingSoon: true,
      installed: false,
    }));
    return [...core, ...extra];
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
        <h3 style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
          Agent Marketplace
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
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
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
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
                border: `1px solid ${selectedCategory === cat.id ? 'var(--accent-secondary)' : 'var(--border)'}`,
                background:
                  selectedCategory === cat.id ? 'rgba(123, 47, 255, 0.1)' : 'transparent',
                color:
                  selectedCategory === cat.id
                    ? 'var(--accent-secondary)'
                    : 'var(--text-secondary)',
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
              color: 'var(--text-secondary)',
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
            {featuredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onInstall={() => handleInstall(agent.id, agent.comingSoon)}
                onClick={() => handleCardClick(agent.id)}
                featured
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
            color: 'var(--text-secondary)',
            marginBottom: 12,
          }}
        >
          {selectedCategory === 'all'
            ? 'All Agents'
            : CATEGORIES.find((c) => c.id === selectedCategory)?.label}{' '}
          ({filtered.length})
        </h4>
        <div className="marketplace-grid">
          {filtered.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onInstall={() => handleInstall(agent.id, agent.comingSoon)}
              onClick={() => handleCardClick(agent.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: 40,
                color: 'var(--text-muted)',
                fontSize: 14,
              }}
            >
              No agents found matching your search.
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
}: {
  agent: MarketplaceAgent;
  onInstall: () => void;
  onClick: () => void;
  featured?: boolean;
}) {
  return (
    <div
      className="marketplace-card"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        position: 'relative',
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
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{agent.tagline}</div>
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
                borderColor: 'var(--text-muted)',
                color: 'var(--text-muted)',
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
