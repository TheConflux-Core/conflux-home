// Conflux Home — GamesHub
// Canonical games hub: widget-grid layout (same as DesktopQuadrants sub-folder),
// with its own themed background and identity.
// Used by direct navigation and the Discover → Games sub-folder.

import { useState, useCallback } from 'react';
import '../styles-games-hub.css';

export interface GameItem {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  status: 'available' | 'coming-soon';
}

// ── Built-in games (ship with the app) ─────────────────────────────────────

const BUILT_IN_GAMES: GameItem[] = [
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
    id: 'pacman',
    name: 'Pac-Man',
    icon: '🟡',
    subtitle: 'Arcade Classic',
    status: 'available',
  },
  {
    id: 'snake',
    name: 'Snake',
    icon: '🐍',
    subtitle: 'Arcade Classic',
    status: 'available',
  },
  {
    id: 'nani-solitaire',
    name: "Nani Solitaire",
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

// ── Props ─────────────────────────────────────────────────────────────────────

interface GamesHubProps {
  /** Pass additional games (e.g. from marketplace downloads) to append */
  extraGames?: GameItem[];
  /** Called when a game is selected */
  onSelectGame: (gameId: string) => void;
  /** Called when the user wants to go back */
  onBack?: () => void;
  /** What to show in the back button label */
  backLabel?: string;
  /** Accent color for this instance */
  accentColor?: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function GamesHub({
  extraGames = [],
  onSelectGame,
  onBack,
  backLabel = 'Discover',
  accentColor = '#f59e0b',
}: GamesHubProps) {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem('conflux_sound_enabled') !== 'false'; }
    catch { return true; }
  });

  const allGames = [...BUILT_IN_GAMES, ...extraGames];

  const handleToggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem('conflux_sound_enabled', String(next));
      return next;
    });
  }, []);

  return (
    <div className="games-hub-root" style={{ '--hub-accent': accentColor } as React.CSSProperties}>
      {/* Ambient background */}
      <div className="games-hub-bg" />
      <div className="games-hub-bg-gradient" />

      <div className="games-hub-inner">
        {/* ── Header ── */}
        <div className="games-hub-header">
          <div className="games-hub-header-left">
            {onBack && (
              <button className="games-hub-back-btn" onClick={onBack}>
                ← {backLabel}
              </button>
            )}
            <div className="games-hub-title-row">
              <span className="games-hub-icon">🎮</span>
              <div>
                <h1 className="games-hub-title">Games</h1>
                <p className="games-hub-subtitle">Play, compete, and unwind</p>
              </div>
            </div>
          </div>
          <div className="games-hub-header-actions">
            <button
              className="games-hub-sound-btn"
              onClick={handleToggleSound}
              title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
          </div>
        </div>

        {/* ── Widget Grid ── */}
        <div className="games-hub-grid">
          {allGames.map((game) => (
            <div
              key={game.id}
              className={`games-hub-widget ${game.status === 'coming-soon' ? 'games-hub-widget-locked' : ''}`}
              onClick={() => {
                if (game.status === 'available') {
                  onSelectGame(game.id);
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (game.status === 'available') onSelectGame(game.id);
                }
              }}
            >
              {/* Accent bar */}
              <div className="games-hub-widget-accent" />

              {/* Locked badge */}
              {game.status === 'coming-soon' && (
                <div className="games-hub-widget-badge">Coming Soon</div>
              )}

              {/* Breathing glow for locked */}
              {game.status === 'coming-soon' && (
                <div className="games-hub-widget-glow" />
              )}

              {/* Widget body */}
              <div className="games-hub-widget-body">
                <span className="games-hub-widget-icon">{game.icon}</span>
                <span className="games-hub-widget-name">{game.name}</span>
                <span className="games-hub-widget-subtitle">{game.subtitle}</span>
              </div>

              {/* Play CTA (available only) */}
              {game.status === 'available' && (
                <div className="games-hub-widget-cta">▶ Play</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}