// GamesPage — Phase 1: The Arcade
// Conflux Home · Full Games Hub · "Story"

import { useState, useCallback } from 'react';
import '../styles-games.css';
import type { GameItem } from './GamesHub';

// ── Game catalog ──────────────────────────────────────────────────────────────

const GAMES: GameItem[] = [
  {
    id: 'snake',
    name: 'Snake',
    icon: '🐍',
    subtitle: 'Arcade Classic',
    status: 'available',
  },
  {
    id: 'pacman',
    name: 'Pac-Man',
    icon: '🟡',
    subtitle: 'Arcade Classic',
    status: 'available',
  },
  {
    id: 'minesweeper',
    name: 'Minesweeper',
    icon: '💣',
    subtitle: 'Classic · 9×9 Grid',
    status: 'available',
  },
  {
    id: 'solitaire',
    name: 'Solitaire',
    icon: '🃏',
    subtitle: 'Classic Card Game',
    status: 'available',
  },
  {
    id: 'nani-solitaire',
    name: 'Nani Solitaire',
    icon: '🎴',
    subtitle: 'Family Tradition · 4×4 Grid',
    status: 'available',
  },
  {
    id: 'johnny-solitaire',
    name: "Johnny C's Solitaire",
    icon: '🀄',
    subtitle: 'FreeCell · 8 Columns',
    status: 'available',
  },
  {
    id: 'stories',
    name: 'Conflux Stories',
    icon: '📖',
    subtitle: 'Interactive Fiction',
    status: 'coming-soon',
  },
];

// ── Props from App.tsx — lifted state ─────────────────────────────────────────

interface GamesPageProps {
  // From App.tsx — game active flags
  activeMinesweeper?: boolean;
  activeSnake?: boolean;
  activePacman?: boolean;
  activeSolitaire?: boolean;
  activeNaniSolitaire?: boolean;
  activeJohnnySolitaire?: boolean;
  // Setters
  setActiveMinesweeper?: (v: boolean) => void;
  setActiveSnake?: (v: boolean) => void;
  setActivePacman?: (v: boolean) => void;
  setActiveSolitaire?: (v: boolean) => void;
  setActiveNaniSolitaire?: (v: boolean) => void;
  setActiveJohnnySolitaire?: (v: boolean) => void;
  setActiveGameId?: (id: string | null) => void;
  // Navigation
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
  setActiveMinesweeper,
  setActiveSnake,
  setActivePacman,
  setActiveSolitaire,
  setActiveNaniSolitaire,
  setActiveJohnnySolitaire,
  setActiveGameId,
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
    // Tell App.tsx which game to launch via custom event
    window.dispatchEvent(new CustomEvent('conflux:navigate', {
      detail: gameId,
    }));
  }, []);

  const handleBack = useCallback(() => {
    if (onBack) onBack();
    else {
      window.dispatchEvent(new CustomEvent('conflux:navigate', {
        detail: 'dashboard',
      }));
    }
  }, [onBack]);

  // Build active sessions from actual game flags
  const activeSessions: { id: string; name: string; icon: string; meta: string }[] = [];
  if (activeSnake)        activeSessions.push({ id: 'snake',           name: 'Snake',           icon: '🐍', meta: 'Game in progress' });
  if (activePacman)       activeSessions.push({ id: 'pacman',          name: 'Pac-Man',         icon: '🟡', meta: 'Game in progress' });
  if (activeMinesweeper)  activeSessions.push({ id: 'minesweeper',     name: 'Minesweeper',     icon: '💣', meta: 'Game in progress' });
  if (activeSolitaire)    activeSessions.push({ id: 'solitaire',       name: 'Solitaire',       icon: '🃏', meta: 'Game in progress' });
  if (activeNaniSolitaire)activeSessions.push({ id: 'nani-solitaire',  name: 'Nani Solitaire',  icon: '🎴', meta: 'Game in progress' });
  if (activeJohnnySolitaire)activeSessions.push({ id: 'johnny-solitaire', name: "Johnny C's Solitaire", icon: '🀄', meta: 'Game in progress' });

  const handleResumeGame = useCallback((gameId: string) => {
    window.dispatchEvent(new CustomEvent('conflux:navigate', { detail: gameId }));
  }, []);

  return (
    <div className="games-page">
      {/* ── Background layers ── */}
      <div className="games-page-bg">
        <div className="games-grid-lines" />
        {/* Ember particles */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="ember" />
        ))}
        <div className="games-spotlight" />
      </div>

      {/* ── Inner content ── */}
      <div className="games-page-inner">
        {/* Header */}
        <div className="games-header">
          <div className="games-header-left">
            <button className="games-back-btn" onClick={handleBack}>
              ← Discover
            </button>
            <div className="games-title-group">
              <span className="games-icon">🎮</span>
              <div className="games-title-text">
                <h1>Games</h1>
                <p>Play, compete, and unwind</p>
              </div>
            </div>
          </div>
          <div className="games-header-actions">
            <button
              className={`games-sound-btn ${soundEnabled ? 'sound-on' : 'sound-off'}`}
              onClick={handleToggleSound}
              title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
          </div>
        </div>

        {/* ── Hero: Conflux Stories ── */}
        <div
          className="games-hero"
          onClick={() => handleSelectGame('stories')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectGame('stories'); }}
        >
          <span className="games-hero-icon">📖</span>
          <div className="games-hero-body">
            <h2>Conflux Stories</h2>
            <p>Where will your story go? Interactive fiction powered by AI — every choice shapes the narrative.</p>
            <span className="hero-hint">"Your adventure awaits..."</span>
          </div>
          <button className="games-hero-cta" onClick={(e) => { e.stopPropagation(); handleSelectGame('stories'); }}>
            Begin →
          </button>
        </div>

        {/* ── Classic Games ── */}
        <div className="games-section-label">Classic Games</div>
        <div className="games-grid">
          {GAMES.filter(g => g.id !== 'stories').map((game) => {
            const gameClass = game.id.replace(/-/g, '');
            return (
              <div
                key={game.id}
                className={`game-card ${gameClass} ${game.status === 'coming-soon' ? 'locked' : ''}`}
                onClick={() => { if (game.status === 'available') handleSelectGame(game.id); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && game.status === 'available') {
                    handleSelectGame(game.id);
                  }
                }}
              >
                {game.status === 'coming-soon' && (
                  <div className="game-card-badge">Coming Soon</div>
                )}
                <div className="game-card-body">
                  <span className="game-card-icon">{game.icon}</span>
                  <span className="game-card-name">{game.name}</span>
                  <span className="game-card-subtitle">{game.subtitle}</span>
                </div>
                {game.status === 'available' && (
                  <div className="game-card-cta">▶ Play</div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Active Sessions ── */}
        {activeSessions.length > 0 && (
          <div className="games-active-section">
            <div className="games-section-label">Continue Playing</div>
            <div className="games-active-list">
              {activeSessions.map(session => (
                <div key={session.id} className="active-game-item">
                  <span className="active-game-icon">{session.icon}</span>
                  <div className="active-game-info">
                    <div className="active-game-name">{session.name}</div>
                    <div className="active-game-meta">{session.meta}</div>
                  </div>
                  <button
                    className="active-game-resume"
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
    </div>
  );
}