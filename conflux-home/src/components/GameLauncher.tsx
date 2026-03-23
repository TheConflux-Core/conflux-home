// Conflux Home — Game Launcher
// Browse story seeds and start a new game.

import { useState } from 'react';
import type { StorySeed, StoryGame, AgeGroup, StoryGenre, CreateStoryGameRequest } from '../types';
import { GENRE_CONFIG, AGE_GROUP_CONFIG } from '../types';

interface GameLauncherProps {
  seeds: StorySeed[];
  memberAgeGroup?: AgeGroup;
  onCreateGame: (req: CreateStoryGameRequest) => Promise<StoryGame>;
  onClose: () => void;
}

export default function GameLauncher({ seeds, memberAgeGroup, onCreateGame, onClose }: GameLauncherProps) {
  const [genre, setGenre] = useState<StoryGenre | 'all'>('all');
  const [creating, setCreating] = useState<string | null>(null);

  const filteredSeeds = seeds.filter(s => {
    if (genre !== 'all' && s.genre !== genre) return false;
    if (memberAgeGroup && s.age_group !== memberAgeGroup) return false;
    return true;
  });

  const handleStart = async (seed: StorySeed) => {
    setCreating(seed.id);
    try {
      await onCreateGame({
        title: seed.title,
        genre: seed.genre,
        age_group: seed.age_group,
        difficulty: seed.difficulty as any,
      });
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content game-launcher" onClick={e => e.stopPropagation()}>
        <div className="launcher-header">
          <h2>📖 Start a New Story</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Genre Filter */}
        <div className="genre-filter">
          <button
            className={`genre-btn ${genre === 'all' ? 'active' : ''}`}
            onClick={() => setGenre('all')}
          >
            All
          </button>
          {(Object.entries(GENRE_CONFIG) as [StoryGenre, typeof GENRE_CONFIG[StoryGenre]][]).map(
            ([key, config]) => (
              <button
                key={key}
                className={`genre-btn ${genre === key ? 'active' : ''}`}
                onClick={() => setGenre(key)}
              >
                {config.emoji} {config.label}
              </button>
            )
          )}
        </div>

        {/* Story Seeds */}
        <div className="seeds-grid">
          {filteredSeeds.length === 0 ? (
            <div className="seeds-empty">
              <p>No stories available for this selection.</p>
              <p className="seeds-hint">More stories are generated automatically!</p>
            </div>
          ) : (
            filteredSeeds.map(seed => (
              <div key={seed.id} className="seed-card">
                <div className="seed-header">
                  <span className="seed-genre">{GENRE_CONFIG[seed.genre].emoji}</span>
                  <span className="seed-difficulty" title={seed.difficulty}>
                    {seed.difficulty === 'easy' ? '⭐' : seed.difficulty === 'hard' ? '⭐⭐⭐' : '⭐⭐'}
                  </span>
                </div>
                <h3>{seed.title}</h3>
                <p className="seed-preview">{seed.opening.slice(0, 120)}...</p>
                <div className="seed-meta">
                  <span>{AGE_GROUP_CONFIG[seed.age_group].emoji} {AGE_GROUP_CONFIG[seed.age_group].label}</span>
                </div>
                <button
                  className="btn-primary seed-start-btn"
                  onClick={() => handleStart(seed)}
                  disabled={creating !== null}
                >
                  {creating === seed.id ? 'Starting...' : 'Begin Adventure →'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
