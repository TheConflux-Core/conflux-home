// MenuGenerator — Hearth 2.0 Weekly Menu Card
// Renders the current week's meal plan as a beautiful shareable/printable menu.
// Style: Rustic Farmhouse (warm parchment, Playfair Display, amber accents)

import { useRef } from 'react';
import type { WeeklyPlan, Meal } from '../types';

const SLOT_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const CATEGORY_EMOJI: Record<string, string> = {
  breakfast: '🥞', lunch: '🥗', dinner: '🍝', snack: '🍪', dessert: '🍰', main: '🍽️',
};

function getMealEmoji(meal: Meal | null): string {
  if (!meal) return '';
  return CATEGORY_EMOJI[meal.category ?? ''] ?? '🍽️';
}

function formatCost(c: number | null | undefined): string {
  if (c == null) return '';
  return `$${c.toFixed(2)}`;
}

interface Props {
  plan: WeeklyPlan;
  onClose: () => void;
}

export default function MenuGenerator({ plan, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const weekOf = new Date(plan.week_start + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const handlePrint = () => {
    if (!cardRef.current) return;
    // Show only the menu card for printing
    const original = document.body.innerHTML;
    document.body.innerHTML = '';
    document.body.appendChild(cardRef.current.cloneNode(true));
    window.print();
    document.body.innerHTML = original;
    window.location.reload();
  };

  // Share as image using Canvas
  const handleShareImage = async () => {
    if (!cardRef.current) return;
    try {
      // Dynamically import html2canvas only when needed
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#F5E6D3',
        scale: 2,
        useCORS: true,
      });
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `hearth-menu-${plan.week_start}.png`;
      link.href = url;
      link.click();
    } catch (e) {
      console.error('Failed to generate image:', e);
    }
  };

  // Count filled slots
  let totalMeals = 0;
  let filledMeals = 0;
  plan.days.forEach(day => {
    day.slots.forEach(slot => {
      totalMeals++;
      if (slot.meal) filledMeals++;
    });
  });

  return (
    <div className="menu-gen-backdrop" onClick={onClose}>
      <div className="menu-gen-sheet" onClick={e => e.stopPropagation()}>

        {/* Toolbar */}
        <div className="menu-gen-toolbar">
          <div className="menu-gen-toolbar-left">
            <span className="menu-gen-title-bar">📋 Weekly Menu</span>
          </div>
          <div className="menu-gen-actions">
            <button className="menu-gen-btn menu-gen-btn-secondary" onClick={handleShareImage}>
              📤 Share Image
            </button>
            <button className="menu-gen-btn menu-gen-btn-primary" onClick={handlePrint}>
              📄 Download PDF
            </button>
            <button className="menu-gen-btn-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Menu Card (the printable/shareable artifact) */}
        <div className="menu-gen-scroll">
          <div ref={cardRef} className="menu-card">
            {/* Header */}
            <div className="menu-card-header">
              <div className="menu-card-flame">🔥</div>
              <h1 className="menu-card-title">The Hearth Kitchen</h1>
              <p className="menu-card-subtitle">Week of {weekOf}</p>
              <div className="menu-card-divider">
                <span className="menu-divider-ornament">✦</span>
              </div>
            </div>

            {/* Week summary */}
            <div className="menu-card-stats">
              <span>🍽️ {filledMeals} of {totalMeals} meals planned</span>
              {plan.total_estimated_cost > 0 && (
                <span>💰 Est. {formatCost(plan.total_estimated_cost)}</span>
              )}
            </div>

            {/* Days */}
            {plan.days.map((day) => {
              const hasMeals = day.slots.some(s => s.meal);
              if (!hasMeals && filledMeals > 0) return null; // skip empty days if there are some meals

              return (
                <div key={day.day_of_week} className="menu-day">
                  <div className="menu-day-header">{day.day_name}</div>
                  <div className="menu-day-slots">
                    {day.slots.map((slot) => {
                      if (!slot.meal) {
                        return (
                          <div key={slot.meal_slot} className="menu-slot menu-slot-empty">
                            <span className="menu-slot-label">{SLOT_LABELS[slot.meal_slot] ?? slot.meal_slot}</span>
                            <span className="menu-slot-empty-text">—</span>
                          </div>
                        );
                      }
                      const m = slot.meal!;
                      return (
                        <div key={slot.meal_slot} className="menu-slot">
                          <span className="menu-slot-label">{SLOT_LABELS[slot.meal_slot] ?? slot.meal_slot}</span>
                          <span className="menu-slot-emoji">{getMealEmoji(m)}</span>
                          <span className="menu-slot-name">{m.name}</span>
                          {m.estimated_cost != null && (
                            <span className="menu-slot-cost">{formatCost(m.estimated_cost)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Footer */}
            <div className="menu-card-footer">
              <div className="menu-divider-ornament">✦</div>
              <p className="menu-footer-text">Generated by Hearth · The Conflux</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
