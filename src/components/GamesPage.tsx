// GamesPage — Phase 1: The Arcade
// Conflux Home · Full Games Hub · "Story"
// All styles inline — no external CSS cascade.
import { useState, useCallback } from 'react';
import type { GameItem } from './GamesHub';

// ── Game catalog ──────────────────────────────────────────────────────────────

const GAMES: GameItem[] = [
  { id: 'snake',           name: 'Snake',             icon: '🐍', subtitle: 'Arcade Classic',          status: 'available' },
  { id: 'pacman',          name: 'Pac-Man',           icon: '🟡', subtitle: 'Arcade Classic',          status: 'available' },
  { id: 'minesweeper',     name: 'Minesweeper',       icon: '💣', subtitle: 'Classic · 9×9 Grid',     status: 'available' },
  { id: 'solitaire',       name: 'Solitaire',         icon: '🃏', subtitle: 'Classic Card Game',       status: 'available' },
  { id: 'nani-solitaire',  name: 'Nani Solitaire',    icon: '🎴', subtitle: 'Family Tradition · 4×4', status: 'available' },
  { id: 'johnny-solitaire',name: "Johnny C's Solitaire", icon: '🀄', subtitle: 'FreeCell · 8 Columns', status: 'available' },
  { id: 'stories',         name: 'Conflux Stories',   icon: '📖', subtitle: 'Interactive Fiction',    status: 'coming-soon' },
];

const GAME_ACCENTS: Record<string, { glow: string; gradient: string; border: string }> = {
  snake:           { glow: '#4ade80', gradient: 'linear-gradient(135deg, #052e16, #0d3d23)', border: 'rgba(74,222,128,0.3)' },
  pacman:           { glow: '#fbbf24', gradient: 'linear-gradient(135deg, #1c1a08, #2d2a0c)', border: 'rgba(251,191,36,0.3)' },
  minesweeper:      { glow: '#f87171', gradient: 'linear-gradient(135deg, #1c0808, #2d1010)', border: 'rgba(248,113,113,0.3)' },
  solitaire:        { glow: '#60a5fa', gradient: 'linear-gradient(135deg, #081428, #0d1f3c)', border: 'rgba(96,165,250,0.3)' },
  'nani-solitaire': { glow: '#c084fc', gradient: 'linear-gradient(135deg, #1a0d2e, #2d1248)', border: 'rgba(192,132,252,0.3)' },
  'johnny-solitaire':{ glow: '#34d399', gradient: 'linear-gradient(135deg, #062e22, #0d3d30)', border: 'rgba(52,211,153,0.3)' },
  stories:          { glow: '#ffd700', gradient: 'linear-gradient(135deg, #2d2608, #3d350a)', border: 'rgba(255,215,0,0.3)' },
};

// ── Global padding (matches KitchenView, LifeAutopilotView) ──────────────────
// topBar: ~50px, bottomNav: ~150px, horizontal: 121px
const PAD_TOP    = '50px';
const PAD_BOTTOM = '150px';
const PAD_H      = '121px';

// ── Page style ────────────────────────────────────────────────────────────────

const PAGE_STYLE = {
  position: 'fixed' as const,
  inset: 0,
  zIndex: 1,
  minHeight: '100vh',
  width: '100%',
  overflowY: 'auto' as const,
  overflowX: 'hidden' as const,
  background: 'linear-gradient(160deg, #0d0d12 0%, #1a0a0a 100%)',
  fontFamily: "'system-ui', -apple-system, sans-serif",
  color: '#fff8f0',
};

// ── Background ────────────────────────────────────────────────────────────────

const BG_STYLE = {
  position: 'fixed' as const,
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none' as const,
  overflow: 'hidden',
};

const GRID_STYLE = {
  position: 'fixed' as const,
  inset: 0,
  zIndex: 0,
  backgroundImage: `
    linear-gradient(rgba(255,77,0,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,77,0,0.025) 1px, transparent 1px)
  `,
  backgroundSize: '64px 64px',
  WebkitMaskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 20%, transparent 100%)',
  maskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 20%, transparent 100%)',
};

const SPOTLIGHT_STYLE = {
  position: 'fixed' as const,
  inset: 0,
  zIndex: 0,
  background: 'radial-gradient(ellipse 60% 50% at 50% -10%, rgba(255,77,0,0.08) 0%, transparent 65%)',
};

const INNER_STYLE = {
  position: 'relative' as const,
  zIndex: 1,
  paddingTop: PAD_TOP,
  paddingBottom: PAD_BOTTOM,
  paddingLeft: PAD_H,
  paddingRight: PAD_H,
  maxWidth: '1200px',
  margin: '0 auto',
  width: '100%',
  boxSizing: 'border-box' as const,
};

// ── Header ─────────────────────────────────────────────────────────────────────

const HEADER_STYLE = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '40px',
};

const BACK_BTN_STYLE = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '999px',
  color: '#fff8f0',
  padding: '10px 22px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
  transition: 'all 0.2s ease',
};

const TITLE_ROW_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
};

const ICON_STYLE = {
  fontSize: '42px',
  lineHeight: 1,
  filter: 'drop-shadow(0 0 8px rgba(255,77,0,0.5))',
};

const H1_STYLE = {
  margin: 0,
  fontSize: '32px',
  fontWeight: 800,
  color: '#fff8f0',
  lineHeight: 1.1,
  textShadow: '0 2px 12px rgba(0,0,0,0.5)',
};

const SUBTITLE_P_STYLE = {
  margin: '2px 0 0',
  fontSize: '13px',
  color: '#8a7a6a',
  fontWeight: 500,
};

const SOUND_BTN_STYLE = {
  width: '44px',
  height: '44px',
  borderRadius: '50%',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  fontSize: '18px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  transition: 'all 0.2s ease',
};

// ── Section label ─────────────────────────────────────────────────────────────

const SECTION_LABEL_STYLE = {
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '2.5px',
  color: '#8a7a6a',
  marginBottom: '20px',
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  opacity: 0.7,
};

// ── Hero ───────────────────────────────────────────────────────────────────────

const HERO_STYLE = {
  position: 'relative' as const,
  marginBottom: '44px',
  borderRadius: '24px',
  overflow: 'hidden',
  background: 'linear-gradient(135deg, #161020 0%, #1e1428 100%)',
  border: '1px solid rgba(255,215,0,0.2)',
  padding: '28px 32px',
  display: 'flex',
  alignItems: 'center',
  gap: '24px',
  cursor: 'pointer',
  boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 60px rgba(255,215,0,0.05), inset 0 1px 0 rgba(255,255,255,0.06)',
  transform: 'perspective(800px)',
  transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
};

const HERO_ICON_STYLE = {
  fontSize: '56px',
  flexShrink: 0,
  filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.4))',
};

const HERO_BODY_STYLE = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '6px',
};

const HERO_H2_STYLE = {
  margin: 0,
  fontSize: '22px',
  fontWeight: 800,
  color: '#ffd700',
  textShadow: '0 0 20px rgba(255,215,0,0.3)',
};

const HERO_P_STYLE = {
  margin: 0,
  fontSize: '14px',
  color: 'rgba(255,248,240,0.85)',
  lineHeight: 1.6,
};

const HERO_HINT_STYLE = {
  fontSize: '12px',
  color: '#8a7a6a',
  fontStyle: 'italic',
};

const HERO_CTA_STYLE = {
  background: 'linear-gradient(135deg, #ffd700, #f59e0b)',
  border: 'none',
  borderRadius: '999px',
  color: '#0d0d12',
  padding: '12px 28px',
  fontSize: '15px',
  fontWeight: 800,
  cursor: 'pointer',
  flexShrink: 0,
  boxShadow: '0 6px 24px rgba(255,215,0,0.35), 0 0 40px rgba(255,215,0,0.1)',
  transition: 'all 0.2s ease',
};

// ── Card grid ──────────────────────────────────────────────────────────────────

const GRID_STYLE_CSS = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '12px',
  marginBottom: '48px',
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface GamesPageProps {
  activeMinesweeper?: boolean;
  activeSnake?: boolean;
  activePacman?: boolean;
  activeSolitaire?: boolean;
  activeNaniSolitaire?: boolean;
  activeJohnnySolitaire?: boolean;
  setActiveMinesweeper?: (v: boolean) => void;
  setActiveSnake?: (v: boolean) => void;
  setActivePacman?: (v: boolean) => void;
  setActiveSolitaire?: (v: boolean) => void;
  setActiveNaniSolitaire?: (v: boolean) => void;
  setActiveJohnnySolitaire?: (v: boolean) => void;
  setActiveGameId?: (id: string | null) => void;
  onBack?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GamesPage({
  activeMinesweeper = false,
  activeSnake = false,
  activePacman = false,
  activeSolitaire = false,
  activeNaniSolitaire = false,
  activeJohnnySolitaire = false,
  onBack,
}: GamesPageProps) {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem('conflux_sound_enabled') !== 'false'; }
    catch { return true; }
  });
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);

  const handleToggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem('conflux_sound_enabled', String(next));
      return next;
    });
  }, []);

  const handleSelectGame = useCallback((gameId: string) => {
    window.dispatchEvent(new CustomEvent('conflux:navigate', { detail: { viewId: 'games', gameId } }));
  }, []);

  const handleBack = useCallback(() => {
    if (onBack) onBack();
    else window.dispatchEvent(new CustomEvent('conflux:navigate', { detail: 'dashboard' }));
  }, [onBack]);

  const activeSessions: { id: string; name: string; icon: string; meta: string }[] = [];
  if (activeSnake)           activeSessions.push({ id: 'snake',            name: 'Snake',            icon: '🐍', meta: 'Game in progress' });
  if (activePacman)          activeSessions.push({ id: 'pacman',           name: 'Pac-Man',          icon: '🟡', meta: 'Game in progress' });
  if (activeMinesweeper)     activeSessions.push({ id: 'minesweeper',       name: 'Minesweeper',      icon: '💣', meta: 'Game in progress' });
  if (activeSolitaire)       activeSessions.push({ id: 'solitaire',         name: 'Solitaire',        icon: '🃏', meta: 'Game in progress' });
  if (activeNaniSolitaire)   activeSessions.push({ id: 'nani-solitaire',   name: 'Nani Solitaire',   icon: '🎴', meta: 'Game in progress' });
  if (activeJohnnySolitaire) activeSessions.push({ id: 'johnny-solitaire', name: "Johnny C's Solitaire", icon: '🀄', meta: 'Game in progress' });

  const handleResumeGame = useCallback((gameId: string) => {
    window.dispatchEvent(new CustomEvent('conflux:navigate', { detail: gameId }));
  }, []);

  return (
    <div style={PAGE_STYLE}>
      {/* ── Background layers ── */}
      <div style={BG_STYLE}>
        <div style={GRID_STYLE} />
        {/* Ember particles */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'fixed',
              width: i % 3 === 0 ? '3px' : '2px',
              height: i % 3 === 0 ? '3px' : '2px',
              borderRadius: '50%',
              background: '#ff4d00',
              boxShadow: '0 0 8px #ff4d00, 0 0 16px rgba(255,77,0,0.6)',
              left: `${6 + i * 10}%`,
              bottom: '-12px',
              animation: `ember-rise ${8 + i * 1.2}s linear infinite`,
              animationDelay: `${i * 1.1}s`,
            }}
          />
        ))}
        <div style={SPOTLIGHT_STYLE} />
        {/* Corner glow blobs */}
        <div style={{ position: 'fixed', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,77,0,0.06) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'fixed', bottom: '80px', left: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,77,0,0.04) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />
      </div>

      {/* ── Content ── */}
      <div style={INNER_STYLE}>
        {/* Header */}
        <div style={HEADER_STYLE}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              style={BACK_BTN_STYLE}
              onClick={handleBack}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.target as HTMLButtonElement).style.transform = 'translateY(0)'; }}
            >
              ← Discover
            </button>
            <span style={ICON_STYLE}>🎮</span>
            <div>
              <h1 style={H1_STYLE}>Games</h1>
              <p style={SUBTITLE_P_STYLE}>Play, compete, and unwind</p>
            </div>
          </div>
          <button
            style={SOUND_BTN_STYLE}
            onClick={handleToggleSound}
            title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.target as HTMLButtonElement).style.transform = 'scale(1.05)'; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.target as HTMLButtonElement).style.transform = 'scale(1)'; }}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>

        {/* ── Hero: Conflux Stories (Coming Soon) ── */}
        <div
          style={{
            ...HERO_STYLE,
            cursor: 'default',
            opacity: 0.55,
            filter: 'grayscale(0.3)',
          }}
        >
          {/* Glow border */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: '24px', border: '1px solid rgba(255,215,0,0.15)', pointerEvents: 'none' }} />
          {/* Corner accent */}
          <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', background: 'radial-gradient(circle at top right, rgba(255,215,0,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {/* Coming Soon badge */}
          <div style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase' as const,
            letterSpacing: '1px',
            color: '#8a7a6a',
            background: 'rgba(255,255,255,0.06)',
            padding: '4px 10px',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            Coming Soon
          </div>

          <span style={HERO_ICON_STYLE}>📖</span>
          <div style={HERO_BODY_STYLE}>
            <h2 style={HERO_H2_STYLE}>Conflux Stories</h2>
            <p style={HERO_P_STYLE}>Where will your story go? Interactive fiction powered by AI — every choice shapes the narrative.</p>
            <span style={HERO_HINT_STYLE}>"Your adventure awaits..."</span>
          </div>
          <button
            style={{
              ...HERO_CTA_STYLE,
              opacity: 0.4,
              cursor: 'default',
              pointerEvents: 'none' as const,
            }}
            disabled
          >
            Coming Soon
          </button>
        </div>

        {/* ── Classic Games ── */}
        <div style={SECTION_LABEL_STYLE}>
          Classic Games
          <span style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.07) 0%, transparent 100%)' }} />
        </div>
        <div style={GRID_STYLE_CSS}>
          {GAMES.filter(g => g.id !== 'stories').map((game, idx) => {
            const accent = GAME_ACCENTS[game.id] ?? { glow: '#ff4d00', gradient: 'linear-gradient(135deg, #161020, #1e1428)', border: 'rgba(255,77,0,0.3)' };
            const isHovered = hoveredGame === game.id;
            const isLocked = game.status === 'coming-soon';

            return (
              <div
                key={game.id}
                style={{
                  position: 'relative' as const,
                  borderRadius: '20px',
                  minHeight: '150px',
                  padding: '32px 24px',
                  background: accent.gradient,
                  border: `1px solid ${isHovered ? accent.border.replace('0.3', '0.6') : accent.border}`,
                  cursor: isLocked ? 'default' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column' as const,
                  gap: '12px',
                  opacity: isLocked ? 0.55 : 1,
                  transform: isHovered && !isLocked
                    ? 'perspective(600px) rotateX(4deg) rotateY(-2deg) translateZ(8px) scale(1.04)'
                    : 'perspective(600px)',
                  boxShadow: isHovered && !isLocked
                    ? `0 20px 50px rgba(0,0,0,0.5), 0 0 30px ${accent.glow}22, inset 0 1px 0 rgba(255,255,255,0.08)`
                    : `0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)`,
                  transition: 'all 0.25s cubic-bezier(.4,0,.2,1)',
                  overflow: 'hidden',
                  animation: 'card-portal-enter 0.5s ease-out backwards',
                  animationDelay: `${idx * 80}ms`,
                }}
                onClick={() => { if (!isLocked) handleSelectGame(game.id); }}
                onMouseEnter={() => setHoveredGame(game.id)}
                onMouseLeave={() => setHoveredGame(null)}
              >
                {/* Glow orb behind icon — portal effect */}
                <div style={{
                  position: 'absolute' as const,
                  top: '30%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: isHovered ? '120px' : '80px',
                  height: isHovered ? '120px' : '80px',
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${accent.glow}28 0%, ${accent.glow}08 50%, transparent 70%)`,
                  pointerEvents: 'none',
                  filter: isHovered ? 'blur(8px)' : 'blur(16px)',
                  transition: 'all 0.4s ease',
                  opacity: isHovered ? 1 : 0.5,
                }} />

                {/* Accent line at top */}
                <div style={{
                  position: 'absolute' as const,
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: `linear-gradient(90deg, transparent, ${accent.glow}60, transparent)`,
                  opacity: isHovered ? 1 : 0.4,
                  transition: 'opacity 0.3s',
                }} />

                {/* Locked badge */}
                {isLocked && (
                  <div style={{
                    position: 'absolute' as const,
                    top: '14px',
                    right: '14px',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '1px',
                    color: '#8a7a6a',
                    background: 'rgba(255,255,255,0.06)',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    Coming Soon
                  </div>
                )}

                {/* Card icon — portal gateway */}
                <div style={{
                  fontSize: '52px',
                  lineHeight: 1,
                  filter: isHovered
                    ? `drop-shadow(0 0 16px ${accent.glow}88) drop-shadow(0 0 40px ${accent.glow}33)`
                    : 'drop-shadow(0 0 6px rgba(0,0,0,0.5))',
                  transform: isHovered ? 'translateY(-6px) scale(1.15)' : 'translateY(0)',
                  transition: 'all 0.35s cubic-bezier(.4,0,.2,1)',
                  textAlign: 'center' as const,
                }}>
                  {game.icon}
                </div>

                {/* Card text */}
                <div style={{ textAlign: 'center' as const }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: isHovered ? accent.glow : '#fff8f0',
                    transition: 'color 0.25s',
                    textShadow: isHovered ? `0 0 20px ${accent.glow}44` : 'none',
                  }}>
                    {game.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8a7a6a', marginTop: '6px', fontWeight: 500 }}>
                    {game.subtitle}
                  </div>
                </div>

                {/* Play CTA */}
                {!isLocked && (
                  <div style={{
                    marginTop: 'auto',
                    textAlign: 'center' as const,
                    fontSize: '13px',
                    fontWeight: 800,
                    color: accent.glow,
                    opacity: isHovered ? 1 : 0.5,
                    transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
                    transition: 'all 0.25s cubic-bezier(.4,0,.2,1)',
                    letterSpacing: '0.5px',
                  }}>
                    ▶ Play
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Active Sessions ── */}
        {activeSessions.length > 0 && (
          <div>
            <div style={SECTION_LABEL_STYLE}>
              Continue Playing
              <span style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.07) 0%, transparent 100%)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {activeSessions.map(session => (
                <div
                  key={session.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    padding: '20px 24px',
                    background: 'linear-gradient(135deg, #161020, #1a1428)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '18px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(74,222,128,0.3)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
                >
                  <span style={{ fontSize: '36px', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.2))' }}>{session.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff8f0' }}>{session.name}</div>
                    <div style={{ fontSize: '12px', color: '#8a7a6a', marginTop: '3px' }}>{session.meta}</div>
                  </div>
                  <button
                    style={{
                      padding: '10px 24px',
                      borderRadius: '999px',
                      border: '1px solid rgba(74,222,128,0.3)',
                      background: 'rgba(74,222,128,0.08)',
                      color: '#4ade80',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(74,222,128,0.15)',
                      transition: 'all 0.2s ease',
                    }}
                    onClick={() => handleResumeGame(session.id)}
                    onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'rgba(74,222,128,0.16)'; (e.target as HTMLButtonElement).style.transform = 'scale(1.05)'; }}
                    onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'rgba(74,222,128,0.08)'; (e.target as HTMLButtonElement).style.transform = 'scale(1)'; }}
                  >
                    Resume
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes ember-rise {
          0%   { transform: translateY(0) scale(1); opacity: 0.7; }
          20%  { opacity: 1; }
          80%  { opacity: 0.5; }
          100% { transform: translateY(-120vh) scale(0.4); opacity: 0; }
        }
        @keyframes card-portal-enter {
          0% { opacity: 0; transform: perspective(600px) translateY(30px) scale(0.95); }
          100% { opacity: 1; transform: perspective(600px) translateY(0) scale(1); }
        }
        @keyframes hero-cta-breathe {
          0%, 100% { box-shadow: 0 6px 24px rgba(255,215,0,0.35), 0 0 40px rgba(255,215,0,0.1); }
          50% { box-shadow: 0 6px 24px rgba(255,215,0,0.45), 0 0 60px rgba(255,215,0,0.18); }
        }
      `}</style>
    </div>
  );
}