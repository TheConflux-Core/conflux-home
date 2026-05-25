// GamesPage — Phase 1: The Arcade
// Conflux Home · Full Games Hub · "Story"
// All critical styles are inline to bypass any external CSS cascade issues.

import { useState, useCallback } from 'react';
import type { GameItem } from './GamesHub';

// ── Game catalog ──────────────────────────────────────────────────────────────

const GAMES: GameItem[] = [
  { id: 'snake',         name: 'Snake',           icon: '🐍', subtitle: 'Arcade Classic',           status: 'available' },
  { id: 'pacman',        name: 'Pac-Man',         icon: '🟡', subtitle: 'Arcade Classic',           status: 'available' },
  { id: 'minesweeper',   name: 'Minesweeper',     icon: '💣', subtitle: 'Classic · 9×9 Grid',      status: 'available' },
  { id: 'solitaire',     name: 'Solitaire',       icon: '🃏', subtitle: 'Classic Card Game',      status: 'available' },
  { id: 'nani-solitaire',name: 'Nani Solitaire',  icon: '🎴', subtitle: 'Family Tradition · 4×4',  status: 'available' },
  { id: 'johnny-solitaire',name:"Johnny C's Solitaire", icon: '🀄', subtitle: 'FreeCell · 8 Columns', status: 'available' },
  { id: 'stories',       name: 'Conflux Stories', icon: '📖', subtitle: 'Interactive Fiction',     status: 'coming-soon' },
];

// ── Inline style helpers ───────────────────────────────────────────────────────

const PAGE_STYLE = {
  position: 'fixed' as const,
  inset: 0,
  zIndex: 1,
  minHeight: '100vh',
  width: '100%',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column' as const,
  background: 'linear-gradient(160deg, #0d0d12 0%, #1a0a0a 100%)',
  fontFamily: "'system-ui', -apple-system, sans-serif",
  color: '#fff8f0',
};

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
    linear-gradient(rgba(255,77,0,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,77,0,0.03) 1px, transparent 1px)
  `,
  backgroundSize: '60px 60px',
  maskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, black 30%, transparent 100%)',
  WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, black 30%, transparent 100%)',
};

const SPOTLIGHT_STYLE = {
  position: 'fixed' as const,
  inset: 0,
  zIndex: 0,
  background: 'radial-gradient(ellipse 50% 40% at 50% 0%, rgba(255,77,0,0.06) 0%, transparent 70%)',
};

const INNER_STYLE = {
  position: 'relative' as const,
  zIndex: 1,
  padding: '24px 32px 100px',
  maxWidth: '1100px',
  margin: '0 auto',
  width: '100%',
  boxSizing: 'border-box' as const,
};

const HEADER_STYLE = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '32px',
};

const BACK_BTN_STYLE = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '999px',
  color: '#fff8f0',
  padding: '8px 20px',
  fontSize: '14px',
  cursor: 'pointer',
  fontFamily: "'system-ui', -apple-system, sans-serif",
};

const TITLE_GROUP_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const ICON_STYLE = {
  fontSize: '36px',
  lineHeight: 1,
};

const TITLE_TEXT_STYLE = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '2px',
};

const H1_STYLE = {
  margin: 0,
  fontSize: '28px',
  fontWeight: 700,
  color: '#fff8f0',
  lineHeight: 1.1,
};

const SUBTITLE_P_STYLE = {
  margin: 0,
  fontSize: '13px',
  color: '#8a7a6a',
  fontWeight: 500,
};

const SECTION_LABEL_STYLE = {
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '2px',
  color: '#8a7a6a',
  marginBottom: '16px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  opacity: 0.6,
};

const HERO_STYLE = {
  position: 'relative' as const,
  marginBottom: '32px',
  borderRadius: '20px',
  overflow: 'hidden',
  background: 'linear-gradient(135deg, #161020 0%, #1e1428 100%)',
  border: '1px solid rgba(255,77,0,0.2)',
  padding: '24px 28px',
  display: 'flex',
  alignItems: 'center',
  gap: '20px',
  cursor: 'pointer',
};

const HERO_ICON_STYLE = {
  fontSize: '48px',
  flexShrink: 0,
};

const HERO_BODY_STYLE = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '6px',
};

const HERO_H2_STYLE = {
  margin: 0,
  fontSize: '20px',
  fontWeight: 700,
  color: '#ffd700',
};

const HERO_P_STYLE = {
  margin: 0,
  fontSize: '14px',
  color: '#fff8f0',
  lineHeight: 1.5,
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
  padding: '10px 24px',
  fontSize: '14px',
  fontWeight: 700,
  cursor: 'pointer',
  flexShrink: 0,
  boxShadow: '0 4px 16px rgba(255,215,0,0.3)',
};

const GRID_STYLE_CSS = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: '16px',
  marginBottom: '36px',
};

const CARD_STYLE = (accentColor: string) => ({
  position: 'relative' as const,
  borderRadius: '16px',
  padding: '20px',
  background: '#161020',
  border: `1px solid ${accentColor}33`,
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '8px',
  transition: 'all 0.2s ease',
});

const CARD_BODY_STYLE = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  gap: '8px',
  flex: 1,
};

const CARD_ICON_STYLE = {
  fontSize: '40px',
  lineHeight: 1,
};

const CARD_NAME_STYLE = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#fff8f0',
};

const CARD_SUBTITLE_STYLE = {
  fontSize: '12px',
  color: '#8a7a6a',
};

const CARD_CTA_STYLE = {
  fontSize: '12px',
  color: '#4ade80',
  fontWeight: 600,
};

const SOUND_BTN_STYLE = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  border: '1px solid rgba(255,255,255,0.07)',
  background: 'rgba(255,255,255,0.04)',
  fontSize: '16px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
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

const GAME_ACCENTS: Record<string, string> = {
  snake: '#4ade80',
  pacman: '#fbbf24',
  minesweeper: '#f87171',
  solitaire: '#60a5fa',
  'nani-solitaire': '#c084fc',
  'johnny-solitaire': '#34d399',
  stories: '#ffd700',
};

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

  const handleToggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem('conflux_sound_enabled', String(next));
      return next;
    });
  }, []);

  const handleSelectGame = useCallback((gameId: string) => {
    window.dispatchEvent(new CustomEvent('conflux:navigate', { detail: gameId }));
  }, []);

  const handleBack = useCallback(() => {
    if (onBack) onBack();
    else {
      window.dispatchEvent(new CustomEvent('conflux:navigate', { detail: 'dashboard' }));
    }
  }, [onBack]);

  const activeSessions: { id: string; name: string; icon: string; meta: string }[] = [];
  if (activeSnake)         activeSessions.push({ id: 'snake',            name: 'Snake',            icon: '🐍', meta: 'Game in progress' });
  if (activePacman)        activeSessions.push({ id: 'pacman',           name: 'Pac-Man',          icon: '🟡', meta: 'Game in progress' });
  if (activeMinesweeper)   activeSessions.push({ id: 'minesweeper',       name: 'Minesweeper',      icon: '💣', meta: 'Game in progress' });
  if (activeSolitaire)     activeSessions.push({ id: 'solitaire',        name: 'Solitaire',        icon: '🃏', meta: 'Game in progress' });
  if (activeNaniSolitaire) activeSessions.push({ id: 'nani-solitaire',   name: 'Nani Solitaire',   icon: '🎴', meta: 'Game in progress' });
  if (activeJohnnySolitaire)activeSessions.push({ id: 'johnny-solitaire',name: "Johnny C's Solitaire", icon: '🀄', meta: 'Game in progress' });

  const handleResumeGame = useCallback((gameId: string) => {
    window.dispatchEvent(new CustomEvent('conflux:navigate', { detail: gameId }));
  }, []);

  return (
    <div style={PAGE_STYLE}>
      {/* ── Background layers ── */}
      <div style={BG_STYLE}>
        <div style={GRID_STYLE} />
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'fixed',
              width: i % 3 === 0 ? '3px' : '2px',
              height: i % 3 === 0 ? '3px' : '2px',
              borderRadius: '50%',
              background: '#ff4d00',
              boxShadow: '0 0 6px #ff4d00, 0 0 12px #ff4d00',
              left: `${8 + i * 12}%`,
              bottom: '-10px',
              animation: `ember-rise ${9 + i}s linear infinite`,
              animationDelay: `${i * 1.3}s`,
            }}
          />
        ))}
        <div style={SPOTLIGHT_STYLE} />
      </div>

      {/* ── Inner content ── */}
      <div style={INNER_STYLE}>
        {/* Header */}
        <div style={HEADER_STYLE}>
          <div style={TITLE_GROUP_STYLE}>
            <button style={BACK_BTN_STYLE} onClick={handleBack}>← Discover</button>
            <span style={ICON_STYLE}>🎮</span>
            <div style={TITLE_TEXT_STYLE}>
              <h1 style={H1_STYLE}>Games</h1>
              <p style={SUBTITLE_P_STYLE}>Play, compete, and unwind</p>
            </div>
          </div>
          <button
            style={SOUND_BTN_STYLE}
            onClick={handleToggleSound}
            title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>

        {/* ── Hero: Conflux Stories ── */}
        <div style={HERO_STYLE} onClick={() => handleSelectGame('stories')}>
          <span style={HERO_ICON_STYLE}>📖</span>
          <div style={HERO_BODY_STYLE}>
            <h2 style={HERO_H2_STYLE}>Conflux Stories</h2>
            <p style={HERO_P_STYLE}>Where will your story go? Interactive fiction powered by AI — every choice shapes the narrative.</p>
            <span style={HERO_HINT_STYLE}>"Your adventure awaits..."</span>
          </div>
          <button style={HERO_CTA_STYLE} onClick={(e) => { e.stopPropagation(); handleSelectGame('stories'); }}>
            Begin →
          </button>
        </div>

        {/* ── Classic Games ── */}
        <div style={SECTION_LABEL_STYLE}>
          Classic Games
          <span style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.07) 0%, transparent 100%)' }} />
        </div>
        <div style={GRID_STYLE_CSS}>
          {GAMES.filter(g => g.id !== 'stories').map((game) => {
            const accent = GAME_ACCENTS[game.id] ?? '#ff4d00';
            return (
              <div
                key={game.id}
                style={{
                  ...CARD_STYLE(accent),
                  opacity: game.status === 'coming-soon' ? 0.6 : 1,
                }}
                onClick={() => { if (game.status === 'available') handleSelectGame(game.id); }}
              >
                {game.status === 'coming-soon' && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: '#8a7a6a',
                    background: 'rgba(255,255,255,0.06)',
                    padding: '3px 8px',
                    borderRadius: '999px',
                  }}>
                    Coming Soon
                  </div>
                )}
                <div style={CARD_BODY_STYLE}>
                  <span style={CARD_ICON_STYLE}>{game.icon}</span>
                  <span style={CARD_NAME_STYLE}>{game.name}</span>
                  <span style={CARD_SUBTITLE_STYLE}>{game.subtitle}</span>
                </div>
                {game.status === 'available' && (
                  <div style={CARD_CTA_STYLE}>▶ Play</div>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeSessions.map(session => (
                <div
                  key={session.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px 20px',
                    background: '#161020',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '14px',
                  }}
                >
                  <span style={{ fontSize: '28px' }}>{session.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff8f0' }}>{session.name}</div>
                    <div style={{ fontSize: '12px', color: '#8a7a6a' }}>{session.meta}</div>
                  </div>
                  <button
                    style={{
                      padding: '8px 20px',
                      borderRadius: '999px',
                      border: '1px solid rgba(74,222,128,0.3)',
                      background: 'rgba(74,222,128,0.1)',
                      color: '#4ade80',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    onClick={() => handleResumeGame(session.id)}
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
          0%   { transform: translateY(0) scale(1); opacity: 0.8; }
          20%  { opacity: 1; }
          80%  { opacity: 0.6; }
          100% { transform: translateY(-110vh) scale(0.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}