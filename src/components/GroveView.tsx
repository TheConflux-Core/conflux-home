// Conflux Home — Grove: The Skill Garden (Phase 2)
// "Watch your AI grow."
//
// A living visualization of everything your AI family has learned.
// Three growth stages: 🌱 Sprouting (fragments) → 🌿 Growing (learned) → 🌳 Mature (domain)

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// ── Types ──

interface SkillFragment {
  id: string;
  category: string;
  lesson: string;
  created_at: string;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  emoji: string;
  active: boolean;
  agents: string[] | string;
  installed_at: string;
  updated_at: string;
  skill_type?: string;
  version?: string;
  instructions?: string;
  triggers?: string;
  author?: string;
}

interface SkillEvent {
  id: string;
  skill_id: string;
  skill_name: string;
  event_type: string;
  detail: string | null;
  agent_id: string | null;
  created_at: string;
}

interface CompositionLink {
  id: string;
  parent_skill_id: string;
  child_skill_id: string;
  step_order: number;
  child_name: string;
  child_emoji: string;
  child_desc: string | null;
}

interface AgentCount {
  agents: string;
  count: number;
}

const AGENT_IDS = ['conflux', 'helix', 'forge', 'pulse', 'quanta', 'prism', 'vector', 'spectra', 'luma', 'catalyst'];
const AGENT_EMOJI: Record<string, string> = {
  conflux: '🤖', helix: '🔬', forge: '🔨', quanta: '✅',
  prism: '💎', pulse: '📣', vector: '🧭', spectra: '🧩',
  luma: '🚀', catalyst: '⚡',
};

// ── Main Component ──

export default function GroveView() {
  const [fragments, setFragments] = useState<SkillFragment[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'garden' | 'timeline' | 'browse'>('garden');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [bloomingId, setBloomingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [skillEvents, setSkillEvents] = useState<SkillEvent[]>([]);
  const [agentCounts, setAgentCounts] = useState<AgentCount[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [frags, allSkills, events, counts] = await Promise.all([
        invoke<SkillFragment[]>('engine_get_skill_fragments').catch(() => []),
        invoke<Skill[]>('engine_get_skills', { activeOnly: null }).catch(() => []),
        invoke<SkillEvent[]>('engine_get_skill_events', { limit: 200 }).catch(() => []),
        invoke<AgentCount[]>('engine_get_skill_count_by_agent').catch(() => []),
      ]);
      setFragments(frags);
      setSkills(allSkills);
      setSkillEvents(events);
      setAgentCounts(counts);
    } catch (err) {
      console.error('[Grove] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Listen for new skills being created → bloom animation
    const unlisten = listen<{ skill_name: string; skill_id: string }>('conflux:skill-created', (event) => {
      setBloomingId(event.payload.skill_id);
      setTimeout(() => setBloomingId(null), 2500);
      refresh();
    });

    return () => { unlisten.then(fn => fn()); };
  }, [refresh]);

  // ── Derived data ──

  const learned = skills.filter(s =>
    s.skill_type === 'learned' || s.skill_type === 'mined' || s.skill_type === 'synthesized'
  );
  const domain = skills.filter(s => s.skill_type === 'domain');
  const totalSkills = skills.length;
  const totalFragments = fragments.length;
  const activeSkills = skills.filter(s => s.active).length;

  // Agent filter
  const filteredLearned = agentFilter === 'all'
    ? learned
    : learned.filter(s => s.agents?.includes(agentFilter));
  const filteredDomain = agentFilter === 'all'
    ? domain
    : domain.filter(s => s.agents?.includes(agentFilter));

  // ── Tree growth level ──
  const treeLevel = totalSkills === 0 ? 0
    : totalSkills < 3 ? 1   // sapling
    : totalSkills < 8 ? 2   // small tree
    : totalSkills < 15 ? 3  // medium tree
    : totalSkills < 25 ? 4  // large tree
    : 5;                     // ancient tree

  if (loading) {
    return (
      <div className="grove-loading">
        <div className="grove-loading-spinner" />
        <span>Tending your garden…</span>
      </div>
    );
  }

  return (
    <div className="grove">
      {/* ── Skill Detail Overlay ── */}
      {expandedId && (
        <SkillDetailOverlay
          skill={skills.find(s => s.id === expandedId) || null}
          fragment={fragments.find(f => f.id === expandedId) || null}
          onClose={() => setExpandedId(null)}
          onDelete={async (id) => {
            try {
              await invoke('engine_uninstall_skill', { id });
              setExpandedId(null);
              refresh();
            } catch (err) {
              console.error('[Grove] Delete failed:', err);
            }
          }}
        />
      )}

      {/* ── Hero Section ── */}
      <div className="grove-hero">
        <GroveTreeSVG level={treeLevel} />
        <FireflyCanvas count={Math.min(6 + treeLevel * 3, 24)} />

        <div className="grove-hero-stats">
          <div className="grove-stat">
            <span className="grove-stat-number">{totalSkills}</span>
            <span className="grove-stat-label">skills learned</span>
          </div>
          <div className="grove-stat-divider" />
          <div className="grove-stat">
            <span className="grove-stat-number">{totalFragments}</span>
            <span className="grove-stat-label">fragments</span>
          </div>
          <div className="grove-stat-divider" />
          <div className="grove-stat">
            <span className="grove-stat-number">{activeSkills}</span>
            <span className="grove-stat-label">active</span>
          </div>
        </div>

        <p className="grove-hero-tagline">
          {totalSkills === 0
            ? "Your garden is just getting started. Use your AI and watch it grow."
            : totalSkills < 5
              ? "Your garden is sprouting. Each skill makes your AI smarter."
              : totalSkills < 15
                ? "Your garden is flourishing. Your AI is learning and adapting."
                : "Your garden is thriving. Your AI has built deep expertise."
          }
        </p>

        {/* ── Tabs ── */}
        <div className="grove-tabs">
          <button
            className={`grove-tab ${activeTab === 'garden' ? 'active' : ''}`}
            onClick={() => setActiveTab('garden')}
          >
            🌱 Garden
          </button>
          <button
            className={`grove-tab ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            📅 Timeline
          </button>
          <button
            className={`grove-tab ${activeTab === 'browse' ? 'active' : ''}`}
            onClick={() => setActiveTab('browse')}
          >
            🔍 Browse
          </button>
        </div>
      </div>

      {/* ── Agent Filter ── */}
      <div className="grove-filter">
        <span className="grove-filter-label">Showing skills for:</span>
        <select
          className="grove-filter-select"
          value={agentFilter}
          onChange={e => setAgentFilter(e.target.value)}
        >
          <option value="all">All Agents ({skills.length})</option>
          {AGENT_IDS.map(aid => {
            const cnt = agentCounts
              .filter(c => c.agents?.includes(aid))
              .reduce((sum, c) => sum + c.count, 0);
            return (
              <option key={aid} value={aid}>
                {AGENT_EMOJI[aid] || '🤖'} {aid} ({cnt})
              </option>
            );
          })}
        </select>
      </div>

      {/* ── Tab Content ── */}
      <div className="grove-content">
        {activeTab === 'garden' && (
          <GardenTab
            fragments={fragments}
            learned={filteredLearned}
            domain={filteredDomain}
            bloomingId={bloomingId}
            onExpand={(id) => setExpandedId(id)}
          />
        )}
        {activeTab === 'timeline' && (
          <TimelineTab skills={skills} fragments={fragments} skillEvents={skillEvents} onExpand={(id) => setExpandedId(id)} />
        )}
        {activeTab === 'browse' && (
          <BrowseTab skills={skills} onRefresh={refresh} onExpand={(id) => setExpandedId(id)} />
        )}
      </div>
    </div>
  );
}


// ── SVG Growth Tree ──

function GroveTreeSVG({ level }: { level: number }) {
  // Seeded random for consistent tree shape
  const seed = 42;
  const rand = (i: number) => {
    const x = Math.sin(seed + i * 127.1) * 43758.5453;
    return x - Math.floor(x);
  };

  const trunkH = 30 + level * 14;
  const trunkW = 4 + level * 2;
  const baseY = 130;
  const cx = 80;

  // Branch generation
  const branches: { x1: number; y1: number; x2: number; y2: number; w: number }[] = [];
  if (level >= 2) {
    const count = level >= 4 ? 6 : 4;
    for (let i = 0; i < count; i++) {
      const t = 0.3 + (i / count) * 0.5;
      const startY = baseY - trunkH * t;
      const dir = i % 2 === 0 ? -1 : 1;
      const len = 15 + rand(i) * 20 + level * 4;
      const angle = (25 + rand(i + 10) * 20) * (Math.PI / 180);
      branches.push({
        x1: cx,
        y1: startY,
        x2: cx + dir * len * Math.cos(angle),
        y2: startY - len * Math.sin(angle),
        w: Math.max(1.5, 3 - i * 0.3),
      });
    }
  }

  // Leaf clusters
  const leaves: { cx: number; cy: number; r: number; opacity: number }[] = [];
  const canopyY = baseY - trunkH;
  if (level >= 1) {
    const layers = Math.min(level + 1, 5);
    for (let l = 0; l < layers; l++) {
      const layerY = canopyY - l * 10 + 5;
      const layerR = 20 + level * 8 - l * 4;
      const count = 3 + l;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + l * 0.5;
        const dist = rand(l * 10 + i) * layerR * 0.6;
        leaves.push({
          cx: cx + Math.cos(angle) * dist,
          cy: layerY + Math.sin(angle) * dist * 0.4,
          r: 8 + rand(i + l * 5) * 8 + level * 2,
          opacity: 0.15 + rand(i + 20) * 0.2,
        });
      }
    }
  }

  // Root lines
  const roots: { x1: number; y1: number; x2: number; y2: number }[] = [];
  if (level >= 2) {
    for (let i = 0; i < 3; i++) {
      const dir = i === 0 ? -1 : i === 1 ? 1 : 0;
      roots.push({
        x1: cx + dir * 3,
        y1: baseY,
        x2: cx + dir * (12 + i * 6),
        y2: baseY + 6 + i * 2,
      });
    }
  }

  return (
    <svg className="grove-tree-svg" viewBox="0 0 160 150" width="200" height="180">
      <defs>
        <radialGradient id="grove-canopy-grad">
          <stop offset="0%" stopColor="#00ff88" stopOpacity="0.3" />
          <stop offset="60%" stopColor="#00cc66" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#009944" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="grove-glow-grad">
          <stop offset="0%" stopColor="#00ff88" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="grove-trunk-grad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#3a2a1a" />
          <stop offset="100%" stopColor="#5a4030" />
        </linearGradient>
      </defs>

      {/* Roots */}
      {roots.map((r, i) => (
        <line key={`root-${i}`} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
          stroke="#3a2a1a" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      ))}

      {/* Trunk */}
      <rect x={cx - trunkW / 2} y={baseY - trunkH} width={trunkW} height={trunkH}
        fill="url(#grove-trunk-grad)" rx="2">
        <animate attributeName="height" from="0" to={trunkH} dur="1.2s" fill="freeze" />
        <animate attributeName="y" from={baseY} to={baseY - trunkH} dur="1.2s" fill="freeze" />
      </rect>

      {/* Branches */}
      {branches.map((b, i) => (
        <line key={`br-${i}`} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2}
          stroke="#4a3525" strokeWidth={b.w} strokeLinecap="round" opacity="0.7">
          <animate attributeName="x2" from={b.x1} to={b.x2} dur="0.8s" begin="0.8s" fill="freeze" />
          <animate attributeName="y2" from={b.y1} to={b.y2} dur="0.8s" begin="0.8s" fill="freeze" />
        </line>
      ))}

      {/* Leaf clusters */}
      {leaves.map((l, i) => (
        <circle key={`leaf-${i}`} cx={l.cx} cy={l.cy} r={l.r}
          fill="url(#grove-canopy-grad)" opacity={l.opacity}>
          <animate attributeName="r" from="0" to={l.r} dur="0.6s" begin={`${1 + i * 0.05}s`} fill="freeze" />
          <animateTransform attributeName="transform" type="translate"
            values="0,0; 1,0; -1,0; 0,0" dur="5s" begin="1.5s" repeatCount="indefinite" />
        </circle>
      ))}

      {/* Glow for level 5 */}
      {level >= 5 && (
        <circle cx={cx} cy={canopyY - 10} r={50} fill="url(#grove-glow-grad)">
          <animate attributeName="r" values="45;55;45" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="4s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Small ground grass */}
      {level >= 1 && [0, 1, 2, 3, 4].map(i => (
        <line key={`grass-${i}`}
          x1={cx - 20 + i * 10} y1={baseY}
          x2={cx - 20 + i * 10 + (i % 2 === 0 ? 2 : -2)} y2={baseY - 4 - rand(i + 50) * 4}
          stroke="#2d7a4a" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      ))}
    </svg>
  );
}

// ── Canvas Firefly Particle System ──

function FireflyCanvas({ count }: { count: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; brightness: number }[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.parentElement?.getBoundingClientRect();
    const w = rect?.width || 280;
    const h = rect?.height || 200;
    canvas.width = w * 2; // retina
    canvas.height = h * 2;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(2, 2);

    // Init particles
    const particles = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * w,
      y: Math.random() * h * 0.8,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.1 - Math.random() * 0.3,
      life: Math.random() * 200,
      maxLife: 150 + Math.random() * 150,
      size: 1.5 + Math.random() * 2,
      brightness: 0.5 + Math.random() * 0.5,
    }));
    particlesRef.current = particles;

    const animate = () => {
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.life++;
        if (p.life > p.maxLife) {
          p.x = Math.random() * w;
          p.y = h * 0.3 + Math.random() * h * 0.5;
          p.vx = (Math.random() - 0.5) * 0.4;
          p.vy = -0.1 - Math.random() * 0.3;
          p.life = 0;
          p.maxLife = 150 + Math.random() * 150;
        }

        // Drift with gentle sine
        p.x += p.vx + Math.sin(p.life * 0.03) * 0.15;
        p.y += p.vy;

        // Fade in/out
const lifeRatio = p.life / p.maxLife;
        const alpha = lifeRatio < 0.15
          ? (lifeRatio / 0.15) * p.brightness
          : lifeRatio > 0.8
            ? ((1 - lifeRatio) / 0.2) * p.brightness
            : p.brightness;

        // Glow
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        grad.addColorStop(0, `rgba(0, 255, 136, ${alpha * 0.8})`);
        grad.addColorStop(0.4, `rgba(0, 255, 136, ${alpha * 0.3})`);
        grad.addColorStop(1, 'rgba(0, 255, 136, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = `rgba(200, 255, 220, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      className="grove-firefly-canvas"
    />
  );
}

// ── Garden Tab ──

function GardenTab({
  fragments,
  learned,
  domain,
  bloomingId,
  onExpand,
}: {
  fragments: SkillFragment[];
  learned: Skill[];
  domain: Skill[];
  bloomingId: string | null;
  onExpand: (id: string) => void;
}) {
  return (
    <div className="grove-garden">
      {/* 🌱 Sprouting */}
      <div className="grove-section">
        <div className="grove-section-header">
          <span className="grove-section-emoji">🌱</span>
          <span className="grove-section-title">Sprouting</span>
          <span className="grove-section-count">{fragments.length}</span>
        </div>
        {fragments.length === 0 ? (
          <div className="grove-empty">
            <p>No fragments yet. They appear as your AI uses tools and discovers patterns.</p>
          </div>
        ) : (
          <div className="grove-cards">
            {fragments.map(frag => (
              <div key={frag.id} className="grove-card fragment" onClick={() => onExpand(frag.id)}>
                <div className="grove-card-emoji">🌰</div>
                <div className="grove-card-body">
                  <div className="grove-card-name">{frag.category}</div>
                  <div className="grove-card-desc">
                    {frag.lesson.length > 100 ? frag.lesson.slice(0, 100) + '…' : frag.lesson}
                  </div>
                  <span className="grove-badge fragment">fragment</span>
                </div>
                <div className="grove-card-chevron">›</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🌿 Growing */}
      <div className="grove-section">
        <div className="grove-section-header">
          <span className="grove-section-emoji">🌿</span>
          <span className="grove-section-title">Growing</span>
          <span className="grove-section-count">{learned.length}</span>
        </div>
        {learned.length === 0 ? (
          <div className="grove-empty">
            <p>No learned skills yet. After repeated tool patterns, your AI will crystallize them into skills.</p>
          </div>
        ) : (
          <div className="grove-cards">
            {learned.map(skill => (
              <div
                key={skill.id}
                className={`grove-card learned ${bloomingId === skill.id ? 'blooming' : ''}`}
                onClick={() => onExpand(skill.id)}
              >
                <div className="grove-card-emoji">{skill.emoji || '🧩'}</div>
                <div className="grove-card-body">
                  <div className="grove-card-name">{skill.name}</div>
                  <div className="grove-card-desc">
                    {skill.description?.length > 100 ? skill.description.slice(0, 100) + '…' : skill.description}
                  </div>
                  <div className="grove-card-footer">
                    <span className="grove-badge learned">{skill.skill_type || 'learned'}</span>
                    {skill.version && <span className="grove-version">v{skill.version}</span>}
                    {!skill.active && <span className="grove-badge inactive-badge">paused</span>}
                  </div>
                </div>
                <div className="grove-card-chevron">›</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🌳 Mature */}
      <div className="grove-section">
        <div className="grove-section-header">
          <span className="grove-section-emoji">🌳</span>
          <span className="grove-section-title">Mature</span>
          <span className="grove-section-count">{domain.length}</span>
        </div>
        {domain.length === 0 ? (
          <div className="grove-empty">
            <p>No domain skills installed yet. Browse the marketplace to add expert-level skills.</p>
          </div>
        ) : (
          <div className="grove-cards">
            {domain.map(skill => (
              <div key={skill.id} className="grove-card domain" onClick={() => onExpand(skill.id)}>
                <div className="grove-card-emoji">{skill.emoji || '🏛️'}</div>
                <div className="grove-card-body">
                  <div className="grove-card-name">{skill.name}</div>
                  <div className="grove-card-desc">
                    {skill.description?.length > 100 ? skill.description.slice(0, 100) + '…' : skill.description}
                  </div>
                  <div className="grove-card-footer">
                    <span className="grove-badge domain">domain</span>
                    {skill.version && <span className="grove-version">v{skill.version}</span>}
                    {!skill.active && <span className="grove-badge inactive-badge">paused</span>}
                  </div>
                </div>
                <div className="grove-card-chevron">›</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// ── Timeline Tab ──

const EVENT_ICONS: Record<string, string> = {
  created: '🌱',
  matured: '🌳',
  updated: '🔄',
  deleted: '🗑️',
  paused: '⏸️',
  resumed: '▶️',
  fragment: '🌰',
  learned: '🧩',
  mined: '⛏️',
  synthesized: '🧪',
  domain: '🏛️',
};

function TimelineTab({ skills, fragments, skillEvents, onExpand }: {
  skills: Skill[];
  fragments: SkillFragment[];
  skillEvents: SkillEvent[];
  onExpand: (id: string) => void;
}) {
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Build unified timeline from skill_events (primary) + fallback to skills/fragments
  const events: { id: string; emoji: string; label: string; detail: string; date: string; type: string; skillId?: string }[] = [];

  if (skillEvents.length > 0) {
    // Use real skill events
    for (const ev of skillEvents) {
      events.push({
        id: ev.id,
        emoji: EVENT_ICONS[ev.event_type] || '🧩',
        label: ev.skill_name,
        detail: ev.detail || `Skill ${ev.event_type}`,
        date: ev.created_at,
        type: ev.event_type,
        skillId: ev.skill_id,
      });
    }
  } else {
    // Fallback: synthesize from skills + fragments
    for (const skill of skills) {
      events.push({
        id: skill.id,
        emoji: skill.emoji || '🧩',
        label: skill.name,
        detail: skill.description || '',
        date: skill.installed_at,
        type: skill.skill_type || 'learned',
        skillId: skill.id,
      });
    }
    for (const frag of fragments) {
      events.push({
        id: `frag-${frag.id}`,
        emoji: '🌰',
        label: frag.category,
        detail: frag.lesson,
        date: frag.created_at,
        type: 'fragment',
      });
    }
  }

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Filter
  const filtered = typeFilter === 'all'
    ? events
    : events.filter(e => e.type === typeFilter);

  // Get unique event types for filter buttons
  const eventTypes = Array.from(new Set(events.map(e => e.type)));

  if (events.length === 0) {
    return (
      <div className="grove-empty">
        <p>No skill history yet. Your garden's story will appear here as skills grow.</p>
      </div>
    );
  }

  // Group by day
  const grouped: typeof filtered[] = [];
  let currentDay = '';
  for (const event of filtered) {
    const day = event.date.split('T')[0];
    if (day !== currentDay) {
      grouped.push([]);
      currentDay = day;
    }
    grouped[grouped.length - 1].push(event);
  }

  return (
    <div className="grove-timeline">
      {/* Event type filter */}
      <div className="grove-timeline-filters">
        <button
          className={`grove-timeline-filter ${typeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setTypeFilter('all')}
        >
          All
        </button>
        {eventTypes.map(t => (
          <button
            key={t}
            className={`grove-timeline-filter ${typeFilter === t ? 'active' : ''}`}
            onClick={() => setTypeFilter(t)}
          >
            {EVENT_ICONS[t] || '•'} {t}
          </button>
        ))}
      </div>

      {grouped.length === 0 ? (
        <div className="grove-empty">
          <p>No events match this filter.</p>
        </div>
      ) : (
        grouped.map((dayEvents, di) => (
          <div key={di} className="grove-timeline-day">
            <div className="grove-timeline-date">
              {formatDate(dayEvents[0].date)}
            </div>
            {dayEvents.map(event => (
              <div
                key={event.id}
                className={`grove-timeline-event grove-timeline-event-${event.type}`}
                onClick={() => event.skillId ? onExpand(event.skillId) : undefined}
              >
                <div className="grove-timeline-dot" data-type={event.type} />
                <div className="grove-timeline-content">
                  <div className="grove-timeline-header">
                    <span className="grove-timeline-emoji">{event.emoji}</span>
                    <span className="grove-timeline-name">{event.label}</span>
                    <span className={`grove-badge ${event.type}`}>{event.type}</span>
                  </div>
                  <div className="grove-timeline-detail">
                    {event.detail.length > 120 ? event.detail.slice(0, 120) + '…' : event.detail}
                  </div>
                  <div className="grove-timeline-time">{formatTime(event.date)}</div>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}


// ── Browse Tab ──

// ── Marketplace Templates ──

interface MarketplaceSkill {
  name: string;
  description: string;
  emoji: string;
  triggers: string;
  procedure: string;
  category: string;
}

const MARKETPLACE_SKILLS: MarketplaceSkill[] = [
  {
    name: 'Web Research',
    description: 'Deep web research with structured summaries and source tracking.',
    emoji: '🔍',
    triggers: 'When the user wants to research a topic in depth',
    procedure: '1. Break the topic into 3-5 key questions\n2. Use web_search for each question\n3. Synthesize findings into a structured summary\n4. Cite all sources with URLs',
    category: 'research',
  },
  {
    name: 'Code Review',
    description: 'Systematic code review with security, performance, and style checks.',
    emoji: '🔎',
    triggers: 'When the user wants to review code for quality or issues',
    procedure: '1. Read the target files\n2. Check for security vulnerabilities\n3. Identify performance issues\n4. Review style and maintainability\n5. Provide prioritized feedback',
    category: 'development',
  },
  {
    name: 'Meeting Notes',
    description: 'Transform raw meeting transcripts into structured notes with action items.',
    emoji: '📝',
    triggers: 'When the user shares meeting notes or transcripts',
    procedure: '1. Identify key decisions and discussion points\n2. Extract action items with owners\n3. Flag open questions\n4. Generate a clean summary document',
    category: 'productivity',
  },
  {
    name: 'Data Analysis',
    description: 'Analyze data files and generate insights with visualizations.',
    emoji: '📊',
    triggers: 'When the user has data to analyze or visualize',
    procedure: '1. Load and inspect the data structure\n2. Identify key patterns and outliers\n3. Generate summary statistics\n4. Create relevant visualizations\n5. Provide actionable insights',
    category: 'analysis',
  },
  {
    name: 'Email Composer',
    description: 'Draft professional emails with appropriate tone and structure.',
    emoji: '✉️',
    triggers: 'When the user needs to write an important email',
    procedure: '1. Understand the context and recipient\n2. Determine the appropriate tone\n3. Draft with clear subject, greeting, body, close\n4. Review for clarity and conciseness',
    category: 'productivity',
  },
  {
    name: 'Debug Helper',
    description: 'Systematic debugging approach for tracking down bugs.',
    emoji: '🐛',
    triggers: 'When the user is stuck on a bug or error',
    procedure: '1. Read the error message carefully\n2. Reproduce the issue\n3. Isolate the problem area\n4. Check recent changes\n5. Form hypotheses and test them\n6. Verify the fix',
    category: 'development',
  },
];

function BrowseTab({ skills, onRefresh, onExpand }: {
  skills: Skill[];
  onRefresh: () => void;
  onExpand: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [uninstalling, setUninstalling] = useState<string | null>(null);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [installingSkill, setInstallingSkill] = useState<string | null>(null);

  const handleInstallMarketplace = async (template: MarketplaceSkill) => {
    setInstallingSkill(template.name);
    try {
      await invoke('engine_write_lesson_skill', {
        skillId: '',
        name: template.name,
        description: template.description,
        triggers: template.triggers,
        procedure: template.procedure,
        skillType: 'domain',
      });
      onRefresh();
    } catch (err) {
      console.error('[Grove] Install failed:', err);
    } finally {
      setInstallingSkill(null);
    }
  };

  // Filter marketplace by search
  const filteredMarketplace = MARKETPLACE_SKILLS.filter(m => {
    if (!search) return true;
    return m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase());
  });

  const handleUninstall = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUninstalling(id);
    try {
      await invoke('engine_uninstall_skill', { id });
      onRefresh();
    } catch (err) {
      console.error('[Grove] Uninstall failed:', err);
    } finally {
      setUninstalling(null);
    }
  };

  const handleToggle = async (id: string, active: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke('engine_toggle_skill', { id, active });
      onRefresh();
    } catch (err) {
      console.error('[Grove] Toggle failed:', err);
    }
  };

  // Filter by search + type
  const filtered = skills.filter(s => {
    const matchSearch = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || s.skill_type === typeFilter;
    return matchSearch && matchType;
  });

  const types = ['all', 'learned', 'mined', 'synthesized', 'domain'];

  return (
    <div className="grove-browse">
      {/* Search + Filter Bar */}
      <div className="grove-browse-bar">
        <input
          className="grove-search"
          type="text"
          placeholder="Search skills…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="grove-type-filters">
          {types.map(t => (
            <button
              key={t}
              className={`grove-type-filter ${typeFilter === t ? 'active' : ''}`}
              onClick={() => setTypeFilter(t)}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Community Marketplace */}
      <div className="grove-marketplace">
        <button
          className="grove-marketplace-toggle"
          onClick={() => setShowMarketplace(!showMarketplace)}
        >
          <span className="grove-marketplace-icon">🏪</span>
          <span>Community Skills</span>
          <span className="grove-marketplace-count">{MARKETPLACE_SKILLS.length}</span>
          <span className="grove-marketplace-chevron">{showMarketplace ? '▲' : '▼'}</span>
        </button>
        {showMarketplace && (
          <div className="grove-marketplace-grid">
            {filteredMarketplace.map(m => {
              const alreadyInstalled = skills.some(s => s.name.toLowerCase() === m.name.toLowerCase());
              return (
                <div key={m.name} className="grove-marketplace-card">
                  <div className="grove-marketplace-top">
                    <span className="grove-marketplace-emoji">{m.emoji}</span>
                    <div>
                      <div className="grove-marketplace-name">{m.name}</div>
                      <span className="grove-marketplace-cat">{m.category}</span>
                    </div>
                  </div>
                  <div className="grove-marketplace-desc">{m.description}</div>
                  {alreadyInstalled ? (
                    <span className="grove-marketplace-installed">✓ Installed</span>
                  ) : (
                    <button
                      className="grove-marketplace-install"
                      onClick={() => handleInstallMarketplace(m)}
                      disabled={installingSkill === m.name}
                    >
                      {installingSkill === m.name ? 'Installing…' : '＋ Install'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="grove-empty">
          <p>{search ? `No skills match "${search}".` : 'No skills installed yet. Skills are created automatically as your AI learns.'}</p>
        </div>
      ) : (
        <div className="grove-browse-grid">
          {filtered.map(skill => (
            <div
              key={skill.id}
              className={`grove-browse-card ${skill.active ? '' : 'inactive'}`}
              onClick={() => onExpand(skill.id)}
            >
              <div className="grove-browse-top">
                <span className="grove-browse-emoji">{skill.emoji || '🧩'}</span>
                <div className="grove-browse-info">
                  <div className="grove-browse-name">{skill.name}</div>
                  <span className={`grove-badge ${skill.skill_type || 'learned'}`}>
                    {skill.skill_type || 'learned'}
                  </span>
                </div>
              </div>
              <div className="grove-browse-desc">{skill.description}</div>
              <div className="grove-browse-actions">
                <button
                  className={`grove-toggle ${skill.active ? 'on' : 'off'}`}
                  onClick={(e) => handleToggle(skill.id, !skill.active, e)}
                >
                  {skill.active ? '✓ Active' : '○ Paused'}
                </button>
                <button
                  className="grove-delete-btn"
                  onClick={(e) => handleUninstall(skill.id, e)}
                  disabled={uninstalling === skill.id}
                >
                  {uninstalling === skill.id ? '…' : '🗑️'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Skill Detail Overlay ──

function SkillDetailOverlay({ skill, fragment, onClose, onDelete }: {
  skill: Skill | null;
  fragment: SkillFragment | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [discoverer, setDiscoverer] = useState<string | null>(null);
  const [compositionChain, setCompositionChain] = useState<CompositionLink[]>([]);
  const [compositionParents, setCompositionParents] = useState<{parent_skill_id: string; parent_name: string; parent_emoji: string}[]>([]);

  // Fetch discoverer and composition data when skill changes
  useEffect(() => {
    if (!skill?.id) { setDiscoverer(null); setCompositionChain([]); setCompositionParents([]); return; }
    invoke<string | null>('engine_get_skill_discoverer', { skillId: skill.id })
      .then(setDiscoverer)
      .catch(() => setDiscoverer(null));
    invoke<{chain: CompositionLink[]; parents: {parent_skill_id: string; parent_name: string; parent_emoji: string}[]}>('engine_get_skill_composition', { skillId: skill.id })
      .then(data => { setCompositionChain(data.chain || []); setCompositionParents(data.parents || []); })
      .catch(() => { setCompositionChain([]); setCompositionParents([]); });
  }, [skill?.id]);

  // Click outside to close
  const handleClickOutside = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!skill && !fragment) return null;

  // Fragment detail
  if (fragment && !skill) {
    return (
      <div className="grove-detail-overlay" ref={overlayRef} onClick={handleClickOutside}>
        <div className="grove-detail-card">
          <button className="grove-detail-close" onClick={onClose}>✕</button>
          <div className="grove-detail-emoji">🌰</div>
          <h2 className="grove-detail-title">{fragment.category}</h2>
          <span className="grove-badge fragment">fragment</span>
          <div className="grove-detail-section">
            <div className="grove-detail-label">Lesson</div>
            <div className="grove-detail-text">{fragment.lesson}</div>
          </div>
          <div className="grove-detail-section">
            <div className="grove-detail-label">Discovered</div>
            <div className="grove-detail-text">{formatDate(fragment.created_at)} at {formatTime(fragment.created_at)}</div>
          </div>
          <div className="grove-detail-hint">
            Fragments grow into skills after repeated patterns are detected.
          </div>
        </div>
      </div>
    );
  }

  // Skill detail
  const s = skill!;
  const agentsList = (() => {
    if (Array.isArray(s.agents)) return s.agents;
    try {
      return JSON.parse(s.agents || '[]');
    } catch {
      return s.agents === '*' ? ['All agents'] : [s.agents];
    }
  })();

  return (
    <div className="grove-detail-overlay" ref={overlayRef} onClick={handleClickOutside}>
      <div className="grove-detail-card">
        <button className="grove-detail-close" onClick={onClose}>✕</button>

        <div className="grove-detail-emoji">{s.emoji || '🧩'}</div>
        <h2 className="grove-detail-title">{s.name}</h2>
        <div className="grove-detail-badges">
          <span className={`grove-badge ${s.skill_type || 'learned'}`}>{s.skill_type || 'learned'}</span>
          {s.version && <span className="grove-version">v{s.version}</span>}
          {s.author && <span className="grove-version">by {s.author}</span>}
          {!s.active && <span className="grove-badge inactive-badge">paused</span>}
        </div>

        {s.description && (
          <div className="grove-detail-section">
            <div className="grove-detail-label">Description</div>
            <div className="grove-detail-text">{s.description}</div>
          </div>
        )}

        {s.triggers && (
          <div className="grove-detail-section">
            <div className="grove-detail-label">Triggers</div>
            <div className="grove-detail-text grove-detail-triggers">{s.triggers}</div>
          </div>
        )}

        {s.instructions && (
          <div className="grove-detail-section">
            <div className="grove-detail-label">Procedure</div>
            <MarkdownContent content={s.instructions} />
          </div>
        )}

        <div className="grove-detail-section">
          <div className="grove-detail-label">Assigned to</div>
          <div className="grove-detail-agents">
            {agentsList.map((a: string, i: number) => (
              <span key={i} className="grove-agent-tag">{a}</span>
            ))}
          </div>
        </div>

        {/* Discovered by agent */}
        {discoverer && (
          <div className="grove-detail-section">
            <div className="grove-detail-label">Discovered by</div>
            <div className="grove-detail-text">
              <span className="grove-agent-tag">{AGENT_EMOJI[discoverer] || '🤖'} {discoverer}</span>
            </div>
          </div>
        )}

        {/* Composition chains */}
        {(compositionChain.length > 0 || compositionParents.length > 0) && (
          <div className="grove-detail-section">
            <div className="grove-detail-label">Chains</div>
            <div className="grove-detail-text">
              {compositionParents.length > 0 && (
                <div style={{ marginBottom: 6 }}>
                  <span style={{ opacity: 0.6, fontSize: 12 }}>Chains into this →</span>
                  {compositionParents.map(p => (
                    <span key={p.parent_skill_id} className="grove-agent-tag" style={{ marginLeft: 4 }}>
                      {p.parent_emoji} {p.parent_name}
                    </span>
                  ))}
                </div>
              )}
              {compositionChain.length > 0 && (
                <div>
                  <span style={{ opacity: 0.6, fontSize: 12 }}>This chains to →</span>
                  {compositionChain.map(c => (
                    <span key={c.child_skill_id} className="grove-agent-tag" style={{ marginLeft: 4 }}>
                      {c.child_emoji} {c.child_name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grove-detail-section">
          <div className="grove-detail-label">Timeline</div>
          <div className="grove-detail-text">
            Learned {formatDate(s.installed_at)} at {formatTime(s.installed_at)}
            {s.updated_at !== s.installed_at && ` · Updated ${formatDate(s.updated_at)}`}
          </div>
        </div>

        {/* Delete */}
        <div className="grove-detail-danger">
          {confirmDelete ? (
            <div className="grove-confirm-delete">
              <span>Permanently delete this skill?</span>
              <button className="grove-confirm-yes" onClick={() => onDelete(s.id)}>Yes, delete</button>
              <button className="grove-confirm-no" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          ) : (
            <button className="grove-delete-skill-btn" onClick={() => setConfirmDelete(true)}>
              🗑️ Delete skill
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


// ── Simple Markdown Renderer ──

function renderMarkdown(md: string): string {
  if (!md) return '';
  let html = md
    // Escape HTML
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="grove-md-code"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="grove-md-inline">$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="grove-md-h3">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="grove-md-h2">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="grove-md-h1">$1</h2>')
    // Bold + italic
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="grove-md-li">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="grove-md-li grove-md-oli">$1</li>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="grove-md-hr" />')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="grove-md-link" href="$2" target="_blank">$1</a>')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p class="grove-md-p">')
    // Single newlines to <br>
    .replace(/\n/g, '<br>');

  // Wrap in paragraph
  html = '<p class="grove-md-p">' + html + '</p>';
  // Clean up empty paragraphs
  html = html.replace(/<p class="grove-md-p"><\/p>/g, '');
  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li class="grove-md-li(?: grove-md-oli)?">[\s\S]*?<\/li>)/g, (match) => {
    return '<ul class="grove-md-ul">' + match + '</ul>';
  });
  // Deduplicate nested <ul>
  html = html.replace(/<ul class="grove-md-ul">(<ul class="grove-md-ul">[\s\S]*?<\/ul>)<\/ul>/g, '$1');
  return html;
}

function MarkdownContent({ content }: { content: string }) {
  const html = useMemo(() => renderMarkdown(content), [content]);
  return <div className="grove-md" dangerouslySetInnerHTML={{ __html: html }} />;
}

// ── Helpers ──

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
