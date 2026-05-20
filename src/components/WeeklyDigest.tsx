// WeeklyDigest — The Hearth Week Plan tab, redesigned as a magazine-style weekly spread.
// Replaces the old spreadsheet-style plan grid.

import { useState } from 'react';
import type { WeeklyPlan, Meal } from '../types';
import { MEAL_CATEGORY_EMOJI } from '../types';

interface Props {
  plan: WeeklyPlan;
  meals: Meal[];
  loading: boolean;
  onSetEntry: (dayOfWeek: number, mealSlot: string, mealId: string | null) => void;
  onShuffle: () => void;
  weekStart: string;
  onWeekChange: (newWeekStart: string) => void;
}

const SLOT_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];

function formatDate(weekStart: string, dayOfWeek: number): string {
  // DB stores 0=Monday, 6=Sunday; week starts Sunday
  const offset = (dayOfWeek + 1) % 7;
  const d = new Date(weekStart + 'T12:00:00');
  d.setDate(d.getDate() + offset);
  return d.getDate().toString();
}

function formatCost(n: number | null): string {
  if (n == null) return '—';
  return `$${n.toFixed(2)}`;
}

function MealSlotPicker({
  slot,
  currentMeal,
  meals,
  onPick,
  onClose,
}: {
  slot: string;
  currentMeal: Meal | null;
  meals: Meal[];
  onPick: (mealId: string | null) => void;
  onClose: () => void;
}) {
  return (
    <div className="slot-picker-overlay" onClick={onClose}>
      <div className="slot-picker" onClick={e => e.stopPropagation()}>
        <div className="slot-picker-header">
          <span>{MEAL_CATEGORY_EMOJI[slot] ?? '🍽️'} {slot}</span>
          <button className="slot-picker-close" onClick={onClose}>✕</button>
        </div>
        {currentMeal && (
          <button
            className="slot-picker-remove"
            onClick={() => onPick(null)}
          >
            ✕ Remove
          </button>
        )}
        <div className="slot-picker-list">
          {meals.map(m => (
            <button
              key={m.id}
              className={`slot-picker-item ${currentMeal?.id === m.id ? 'active' : ''}`}
              onClick={() => onPick(m.id)}
            >
              <span className="slot-picker-emoji">
                {m.category ? MEAL_CATEGORY_EMOJI[m.category] ?? '🍽️' : '🍽️'}
              </span>
              <span className="slot-picker-name">{m.name}</span>
              {(m.prep_time_min ?? 0) + (m.cook_time_min ?? 0) > 0 && (
                <span className="slot-picker-time">
                  ~{(m.prep_time_min ?? 0) + (m.cook_time_min ?? 0)}min
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DayCard({
  day,
  weekStart,
  meals,
  onSetEntry,
  isToday,
}: {
  day: WeeklyPlan['days'][0];
  weekStart: string;
  meals: Meal[];
  onSetEntry: (dayOfWeek: number, mealSlot: string, mealId: string | null) => void;
  isToday: boolean;
}) {
  const [pickerSlot, setPickerSlot] = useState<string | null>(null);

  const offset = (day.day_of_week + 1) % 7;
  const dayDate = new Date(weekStart + 'T12:00:00');
  dayDate.setDate(dayDate.getDate() + offset);

  const slotMap = Object.fromEntries(day.slots.map(s => [s.meal_slot, s]));

  return (
    <div className={`day-card ${isToday ? 'day-card--today' : ''}`}>
      {/* Card header */}
      <div className="day-card-header">
        <span className="day-card-name">{day.day_name}</span>
        <span className="day-card-date">{formatDate(weekStart, day.day_of_week)}</span>
        {isToday && <span className="day-card-today-badge">TODAY</span>}
      </div>

      {/* Meal slots */}
      <div className="day-card-slots">
        {SLOT_ORDER.map(slotName => {
          const slot = slotMap[slotName];
          const meal = slot?.meal;
          return (
            <div key={slotName} className={`day-slot ${meal ? 'day-slot--filled' : 'day-slot--empty'}`}>
              <span className="day-slot-label">
                {MEAL_CATEGORY_EMOJI[slotName] ?? '🍽️'} {slotName}
              </span>
              {meal ? (
                <button
                  className="day-meal-chip"
                  onClick={() => setPickerSlot(slotName)}
                  title={meal.name}
                >
                  <span className="day-meal-name">{meal.name}</span>
                  {meal.cost_per_serving != null && (
                    <span className="day-meal-cost">{formatCost(meal.cost_per_serving)}</span>
                  )}
                </button>
              ) : (
                <button
                  className="day-add-btn"
                  onClick={() => setPickerSlot(slotName)}
                >
                  + Add
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Picker overlay */}
      {pickerSlot && (
        <MealSlotPicker
          slot={pickerSlot}
          currentMeal={slotMap[pickerSlot]?.meal ?? null}
          meals={meals}
          onPick={(mealId) => {
            onSetEntry(day.day_of_week, pickerSlot, mealId);
            setPickerSlot(null);
          }}
          onClose={() => setPickerSlot(null)}
        />
      )}
    </div>
  );
}

export default function WeeklyDigest({ plan, meals, loading, onSetEntry, onShuffle, weekStart, onWeekChange }: Props) {
  if (loading) {
    return (
      <div className="weekly-digest">
        <div className="weekly-digest-loading">
          <div className="weekly-loading-grid">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="day-card-skeleton shimmer" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Determine which day is "today"
  // weekStart is Sunday. Today is Wednesday May 20 2026.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // DB day_of_week: 0=Monday, 1=Tue, ..., 6=Sunday
  // JS getDay(): 0=Sun, 1=Mon, ..., 6=Sat
  // Map: DB = (getDay() + 6) % 7
  const todayDB = (today.getDay() + 6) % 7;

  // Count filled slots
  const filledSlots = plan.days.reduce((acc, day) =>
    acc + day.slots.filter(s => s.meal != null).length, 0);

  const avgCostPerMeal = filledSlots > 0
    ? plan.total_estimated_cost / filledSlots
    : 0;

  return (
    <div className="weekly-digest">
      {/* Magazine header */}
      <div className="weekly-header">
        <div className="weekly-header-left">
          <div className="weekly-nav">
            <button
              className="weekly-nav-btn"
              onClick={() => {
                const d = new Date(weekStart + 'T12:00:00');
                d.setDate(d.getDate() - 7);
                onWeekChange(d.toISOString().split('T')[0]);
              }}
              title="Previous week"
            >
              ←
            </button>
            <button
              className="weekly-nav-btn"
              onClick={() => {
                const d = new Date(weekStart + 'T12:00:00');
                d.setDate(d.getDate() + 7);
                onWeekChange(d.toISOString().split('T')[0]);
              }}
              title="Next week"
            >
              →
            </button>
          </div>
          <span className="weekly-edition">WEEKLY DIGEST</span>
          <h2 className="weekly-title">
            Week of {new Date(weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </h2>
        </div>
        <div className="weekly-header-right">
          <button className="btn-weekly-shuffle" onClick={onShuffle} title="Shuffle week (coming soon)">
            🎲 Shuffle
          </button>
        </div>
      </div>

      {/* Stats bar — moved above the grid */}
      <div className="weekly-summary">
        <div className="weekly-summary-item">
          <span className="summary-value">🍽️ {filledSlots}</span>
          <span className="summary-label">meals planned</span>
        </div>
        <div className="weekly-summary-divider" />
        <div className="weekly-summary-item">
          <span className="summary-value">💰 {formatCost(plan.total_estimated_cost)}</span>
          <span className="summary-label">estimated</span>
        </div>
        {filledSlots > 0 && (
          <>
            <div className="weekly-summary-divider" />
            <div className="weekly-summary-item">
              <span className="summary-value">~{formatCost(avgCostPerMeal)}</span>
              <span className="summary-label">per meal avg</span>
            </div>
          </>
        )}
        <div className="weekly-summary-spacer" />
        <span className="weekly-summary-hint">Click a day to edit</span>
      </div>

      {/* Day cards grid — Sunday first, then Mon–Sat */}
      <div className="weekly-day-grid">
        {[...plan.days]
          .sort((a, b) => {
            const order = [6, 0, 1, 2, 3, 4, 5]; // Sunday=6 → first, Mon=0 → second, ...
            return order.indexOf(a.day_of_week) - order.indexOf(b.day_of_week);
          })
          .map(day => (
            <DayCard
              key={day.day_of_week}
              day={day}
              weekStart={weekStart}
              meals={meals}
              onSetEntry={onSetEntry}
              isToday={day.day_of_week === todayDB}
            />
          ))}
      </div>
    </div>
  );
}