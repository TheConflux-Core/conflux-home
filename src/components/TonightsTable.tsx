// Tonight's Table — Hearth 2.0 Hero Card
// The dominant visual anchor on the Hearth home view.
// Shows tonight's planned meal with warm glow, missing ingredients,
// and a clear path to start cooking.

import { useState, useEffect } from 'react';
import type { HomeMenuItem, Meal } from '../types';

interface Props {
  plannedMeal?: {
    day_name: string;
    slot: string;
    meal: Meal;
    missing_ingredients: string[];
  } | null;
  onStartCooking: (mealId: string) => void;
  onAddToPlan: (meal: Meal) => void;
  onSeeAlternatives: () => void;
}

export default function TonightsTable({ plannedMeal, onStartCooking, onAddToPlan, onSeeAlternatives }: Props) {
  const [pulse, setPulse] = useState(0);

  // Glowing pulse animation
  useEffect(() => {
    let frame: number;
    let t = 0;
    const animate = () => {
      t += 0.04;
      setPulse(Math.sin(t) * 0.3 + 0.7);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!plannedMeal?.meal) {
    // No meal planned — show invitation card
    return (
      <div className="tonight-empty">
        <div className="tonight-glow" />
        <div className="tonight-empty-content">
          <span className="tonight-empty-emoji">🔥</span>
          <h3 className="tonight-empty-title">What's for dinner?</h3>
          <p className="tonight-empty-sub">Plan your first meal to see it here.</p>
          <button className="tonight-invite-btn" onClick={onSeeAlternatives}>
            Browse Meals
          </button>
        </div>
      </div>
    );
  }

  const { meal, missing_ingredients, day_name, slot } = plannedMeal;
  const totalTime = (meal.prep_time_min ?? 0) + (meal.cook_time_min ?? 0);

  return (
    <div className="tonight-table">
      {/* Ambient glow behind card */}
      <div
        className="tonight-card-glow"
        style={{
          background: `radial-gradient(ellipse at 50% 90%, rgba(245,158,11,${pulse * 0.22}) 0%, rgba(245,158,11,${pulse * 0.08}) 40%, transparent 70%)`,
        }}
      />

      {/* Card */}
      <div className="tonight-card">
        {/* Header row */}
        <div className="tonight-header">
          <div className="tonight-badge">
            <span className="tonight-badge-dot" />
            Tonight
          </div>
          <span className="tonight-slot-label">{day_name} · {slot}</span>
        </div>

        {/* Meal display */}
        <div className="tonight-meal">
          <span className="tonight-emoji">{meal.category ? getCategoryEmoji(meal.category) : '🍽️'}</span>
          <div className="tonight-meal-info">
            <h2 className="tonight-meal-name">{meal.name}</h2>
            <div className="tonight-meta">
              {totalTime > 0 && (
                <span className="tonight-time-badge">
                  ⏱️ ~{totalTime} min
                </span>
              )}
              {meal.estimated_cost != null && (
                <span className="tonight-cost-badge">
                  💰 ${meal.estimated_cost.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Missing ingredients */}
        {missing_ingredients.length > 0 && (
          <div className="tonight-missing">
            <span className="tonight-missing-label">You'll need:</span>
            <div className="tonight-missing-items">
              {missing_ingredients.map((ing, i) => (
                <span key={i} className="tonight-missing-chip">{ing}</span>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="tonight-actions">
          <button
            className="tonight-cook-btn"
            onClick={() => onStartCooking(meal.id)}
          >
            <span>🔥</span>
            <span>Start Cooking</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>

          <button
            className="tonight-secondary-btn"
            onClick={() => onAddToPlan(meal)}
          >
            📅 Add to Plan
          </button>

          <button
            className="tonight-secondary-btn"
            onClick={onSeeAlternatives}
          >
            🔄 Alternatives
          </button>
        </div>
      </div>
    </div>
  );
}

function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    breakfast: '🥞', lunch: '🥗', dinner: '🍝',
    snack: '🍪', dessert: '🍰', main: '🍽️',
  };
  return map[category] ?? '🍽️';
}