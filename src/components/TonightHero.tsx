// TonightHero — Hearth Home Hero
// Single contained hero unit: visual + info + CTAs unified in one composition.
// Compact, cinematic, feels like one piece — not two columns forced together.

import { useState } from 'react';
import type { TonightMeal } from '../types';
import { playSuccess } from '../lib/sound';

interface Props {
  tonight: TonightMeal | null;
  loading: boolean;
  onStartCooking: (mealId: string) => void;
  onSwap: () => void;
}

function MealSkeleton() {
  return (
    <div className="th-skeleton">
      <div className="th-sk-emoji shimmer" />
      <div className="th-sk-lines">
        <div className="th-sk-line shimmer" style={{ width: '55%' }} />
        <div className="th-sk-line shimmer" style={{ width: '38%' }} />
        <div className="th-sk-tags">
          <span className="th-sk-tag shimmer" />
          <span className="th-sk-tag shimmer" />
        </div>
      </div>
    </div>
  );
}

export default function TonightHero({ tonight, loading, onStartCooking, onSwap }: Props) {
  const [imgError, setImgError] = useState(false);

  if (loading) {
    return (
      <div className="th-hero th-hero--loading">
        <div className="th-eyebrow">🔥 Tonight's Menu</div>
        <MealSkeleton />
      </div>
    );
  }

  if (!tonight) {
    return (
      <div className="th-hero th-hero--empty">
        <div className="th-eyebrow">🔥 Tonight's Menu</div>
        <div className="th-empty-state">
          <span className="th-empty-emoji">🍽️</span>
          <p>Add meals to your library and Hearth will find the perfect match.</p>
        </div>
      </div>
    );
  }

  const totalTime = (tonight.prep_time_min ?? 0) + (tonight.cook_time_min ?? 0);
  const totalMinutes = totalTime > 0 ? `${totalTime} min` : '? min';

  return (
    <div className="th-hero th-hero--active">
      {/* Ambient atmosphere */}
      <div className="th-glow" />
      <div className="th-glow-2" />
      <div className="th-grid" />

      {/* Eyebrow */}
      <div className="th-eyebrow">🔥 Tonight's Menu</div>

      {/* ── ONE unified body ── */}
      <div className="th-body">

        {/* LEFT: Visual anchor */}
        <div className="th-visual-wrap">
          {tonight.photo_url && !imgError ? (
            <img
              src={tonight.photo_url}
              alt={tonight.name}
              className="th-photo"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="th-emoji">{tonight.emoji || '🍽️'}</span>
          )}
          {/* Steam rising */}
          <div className="th-steam">
            <span className="th-sp" />
            <span className="th-sp" />
            <span className="th-sp" />
          </div>
          {/* Floating time badge */}
          <div className="th-time-badge">
            <span>⏱</span>
            <span>{totalMinutes}</span>
          </div>
        </div>

        {/* RIGHT: Info + CTAs — tight vertical stack */}
        <div className="th-info">

          {/* Reason line */}
          <p className="th-reason">{tonight.reason}</p>

          {/* Meal name — big */}
          <h3 className="th-name">{tonight.name}</h3>

          {/* Meta row */}
          <div className="th-meta">
            <span className="th-meta-item">🍽 {tonight.servings} servings</span>
            <span className="th-meta-sep" />
            <span className="th-meta-item">{Math.round(tonight.confidence * 100)}% match</span>
          </div>

          {/* Tags */}
          {tonight.nutrition_tags.length > 0 && (
            <div className="th-tags">
              {tonight.nutrition_tags.slice(0, 3).map(tag => (
                <span key={tag} className="th-tag">{tag}</span>
              ))}
            </div>
          )}

          {/* Expiring alert */}
          {tonight.uses_expiring.length > 0 && (
            <div className="th-expiring">
              <span>🧊</span>
              <span>Uses expiring: <strong>{tonight.uses_expiring.join(', ')}</strong></span>
            </div>
          )}

          {/* CTAs */}
          <div className="th-ctas">
            <button
              className="th-btn-cook"
              onClick={() => { playSuccess(); onStartCooking(tonight.meal_id); }}
            >
              🍳 Start Cooking
            </button>
            <button className="th-btn-swap" onClick={onSwap} title="Get another suggestion">
              ↻
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}