// KitchenInventory — Hearth Inventory Tab
// "Your kitchen, x-rayed" — live fridge/freezer/pantry visualization

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { KitchenInventoryItem, Meal } from '../types';

interface Props {
  items: KitchenInventoryItem[];
  onAddItem: (location: string) => void;
  onSelectMeal: (meal: Meal) => void;
  meals: Meal[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getFreshnessColor(freshness: number): string {
  if (freshness > 0.66) return '#22c55e';  // green
  if (freshness > 0.33) return '#fbbf24';  // amber
  return '#ef4444';                        // red
}

function computeFreshness(expiryDate: string | null): { freshness: number; daysUntil: number | null } {
  if (!expiryDate) return { freshness: 1.0, daysUntil: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate + 'T00:00:00');
  const days = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const freshness = Math.max(0, Math.min(1, days / 30));
  return { freshness, daysUntil: days };
}

function getFreshnessLabel(daysUntil: number | null): string {
  if (daysUntil === null) return '✓ Fresh';
  if (daysUntil < 0) return '⚠️ Expired';
  if (daysUntil <= 2) return '🔥 Use Soon';
  if (daysUntil <= 7) return `⏱ ${daysUntil}d left`;
  return `${daysUntil}d left`;
}

// ── Location config ────────────────────────────────────────────────────────────

const LOCATIONS = [
  { key: 'fridge',  label: 'Fridge',  emoji: '🧊', color: '#38bdf8', bgGradient: 'rgba(56, 189, 248, 0.10)', bgCard: 'rgba(56, 189, 248, 0.04)' },
  { key: 'freezer', label: 'Freezer', emoji: '❄️', color: '#a5f3fc', bgGradient: 'rgba(165, 243, 252, 0.08)', bgCard: 'rgba(165, 243, 252, 0.03)' },
  { key: 'pantry',  label: 'Pantry',  emoji: '🏠', color: '#fbbf24', bgGradient: 'rgba(251, 191, 36, 0.10)', bgCard: 'rgba(251, 191, 36, 0.04)' },
] as const;

// ── Sub-components ─────────────────────────────────────────────────────────────

function FreshnessBar({ freshness, urgent }: { freshness: number; urgent: boolean }) {
  const color = getFreshnessColor(freshness);
  return (
    <div className="inv-freshness-track">
      <div
        className={`inv-freshness-fill ${urgent ? 'inv-freshness-fill--urgent' : ''}`}
        style={{ width: `${freshness * 100}%`, background: color }}
      />
    </div>
  );
}

function LocationCard({
  config,
  items,
  onSelectMeal,
  meals,
  onAddItem,
}: {
  config: typeof LOCATIONS[number];
  items: KitchenInventoryItem[];
  onSelectMeal: (meal: Meal) => void;
  meals: Meal[];
  onAddItem: (location: string) => void;
}) {
  // Sort: expiring first, then by name
  const sorted = [...items].sort((a, b) => {
    const aD = a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity;
    const bD = b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity;
    return aD - bD;
  });

  const urgent = sorted.filter(i => {
    const { daysUntil } = computeFreshness(i.expiry_date);
    return daysUntil !== null && daysUntil <= 3 && daysUntil >= 0;
  });
  const expired = sorted.filter(i => {
    const { daysUntil } = computeFreshness(i.expiry_date);
    return daysUntil !== null && daysUntil < 0;
  });
  const alertCount = urgent.length + expired.length;

  return (
    <div className="location-card" style={{ '--loc-color': config.color } as React.CSSProperties}>
      {/* Ambient glow */}
      <div className="location-card-glow" style={{ background: config.bgGradient }} />

      {/* Header */}
      <div
        className="location-card-header"
        style={{ borderTopColor: config.color, background: config.bgGradient }}
      >
        <div className="location-card-header-left">
          <span className="location-emoji">{config.emoji}</span>
          <div className="location-info">
            <span className="location-label">{config.label}</span>
            <span className="location-count">{items.length} items</span>
          </div>
        </div>
        {alertCount > 0 && (
          <span
            className="location-alert-badge"
            style={{ background: `${config.color}22`, color: config.color }}
          >
            {alertCount} urgent
          </span>
        )}
      </div>

      {/* Add Item — top of list */}
      <button
        className="location-add-btn"
        onClick={() => onAddItem(config.key)}
      >
        + {config.label}
      </button>

      {/* Items */}
      <div className="location-items">
        {sorted.length === 0 ? (
          <div className="location-empty">
            <span className="location-empty-emoji">{config.emoji}</span>
            <span className="location-empty-text">Nothing here yet</span>
          </div>
        ) : (
          sorted.map((item, idx) => {
            const { freshness, daysUntil } = computeFreshness(item.expiry_date);
            const color = getFreshnessColor(freshness);
            const isUrgent = daysUntil !== null && daysUntil <= 3 && daysUntil >= 0;
            const isExpired = daysUntil !== null && daysUntil < 0;
            const label = getFreshnessLabel(daysUntil);

            return (
              <div
                key={item.id || idx}
                className={`location-item ${isUrgent ? 'location-item--urgent' : ''} ${isExpired ? 'location-item--expired' : ''}`}
              >
                {/* Freshness bar (full width, behind content) */}
                <div
                  className="location-item-bar"
                  style={{ background: color, width: `${freshness * 100}%` }}
                />

                {/* Content */}
                <div className="location-item-content">
                  <div className="location-item-left">
                    <span className="location-item-name">{item.name}</span>
                    {item.quantity != null && (
                      <span className="location-item-qty">
                        {item.quantity} {item.unit ?? ''}
                      </span>
                    )}
                  </div>
                  <div className="location-item-right">
                    <span
                      className={`location-item-days ${isUrgent ? 'location-item-days--urgent' : ''} ${isExpired ? 'location-item-days--expired' : ''}`}
                      style={{ color: isUrgent || isExpired ? color : undefined }}
                    >
                      {label}
                    </span>
                  </div>
                </div>

                {/* Urgent pulse dot */}
                {isUrgent && <span className="location-item-pulse" />}
                {isExpired && <span className="location-item-expired-dot" />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Kitchen Intel ──────────────────────────────────────────────────────────────

function KitchenIntel({ items, meals, onSelectMeal }: {
  items: KitchenInventoryItem[];
  meals: Meal[];
  onSelectMeal: (meal: Meal) => void;
}) {
  // Find expiring-in-3-days items
  const expiring = items.filter(i => {
    const { daysUntil } = computeFreshness(i.expiry_date);
    return daysUntil !== null && daysUntil <= 3 && daysUntil >= 0;
  });

  if (expiring.length === 0) {
    return (
      <div className="kitchen-intel kitchen-intel--all-fresh">
        <div className="intel-header">
          <span className="intel-title">🧠 Kitchen Intel</span>
        </div>
        <div className="intel-body">
          <span className="intel-all-fresh-emoji">✨</span>
          <p className="intel-all-fresh-text">
            Your kitchen is in great shape — nothing expiring soon.
          </p>
        </div>
      </div>
    );
  }

  // Simple keyword match: find meals whose ingredients contain expiring item names
  const expiringNames = expiring.map(i => i.name.toLowerCase());
  const matchingMeals = meals.filter(m => {
    // We don't have ingredients here, so we match by meal name keywords
    // In v2 this uses kitchen_inventory_suggestions with real ingredient data
    const nameWords = m.name.toLowerCase().split(/\s+/);
    return nameWords.some(w => expiringNames.some(en => en.includes(w) || w.includes(en)));
  }).slice(0, 3);

  return (
    <div className="kitchen-intel">
      <div className="intel-header">
        <span className="intel-title">🧠 Kitchen Intel</span>
        <span className="intel-subtitle">Based on what you have</span>
      </div>
      <div className="intel-alerts">
        {expiring.slice(0, 3).map((item, idx) => {
          const { daysUntil } = computeFreshness(item.expiry_date);
          return (
            <div key={item.id || idx} className="intel-alert-item">
              <span className="intel-alert-emoji">🧊</span>
              <div className="intel-alert-body">
                <span className="intel-alert-name">{item.name}</span>
                <span className="intel-alert-detail">
                  {daysUntil === 0 ? 'Expires today' : daysUntil === 1 ? 'Expires tomorrow' : `Expires in ${daysUntil} days`}
                  {matchingMeals.length > 0 && ` — ${matchingMeals.length} recipe${matchingMeals.length > 1 ? 's' : ''} match`}
                </span>
              </div>
              {matchingMeals.length > 0 && (
                <button
                  className="intel-recipe-btn"
                  onClick={() => onSelectMeal(matchingMeals[0])}
                >
                  View Recipe
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function KitchenInventory({ items, onAddItem, onSelectMeal, meals }: Props) {
  // Partition items by location
  const byLocation: Record<string, KitchenInventoryItem[]> = {
    fridge: items.filter(i => (i.location || 'pantry') === 'fridge'),
    freezer: items.filter(i => (i.location || 'pantry') === 'freezer'),
    pantry: items.filter(i => (i.location || 'pantry') === 'pantry'),
  };

  const total = items.length;
  const fresh = items.filter(i => {
    const { daysUntil } = computeFreshness(i.expiry_date);
    return daysUntil === null || daysUntil > 7;
  }).length;
  const expiring = items.filter(i => {
    const { daysUntil } = computeFreshness(i.expiry_date);
    return daysUntil !== null && daysUntil <= 3 && daysUntil >= 0;
  }).length;
  const expired = items.filter(i => {
    const { daysUntil } = computeFreshness(i.expiry_date);
    return daysUntil !== null && daysUntil < 0;
  }).length;

  return (
    <div className="kitchen-inventory">
      {/* Stats bar */}
      <div className="inventory-stats-bar">
        <div className="inv-stat inv-stat-total">
          <span className="inv-stat-val">{total}</span>
          <span className="inv-stat-lbl">Items</span>
        </div>
        <div className="inv-stat-divider" />
        <div className="inv-stat inv-stat-fresh">
          <span className="inv-stat-val">{fresh}</span>
          <span className="inv-stat-lbl">Fresh</span>
        </div>
        <div className="inv-stat-divider" />
        <div className="inv-stat inv-stat-warning">
          <span className="inv-stat-val">{expiring}</span>
          <span className="inv-stat-lbl">Expiring</span>
        </div>
        <div className="inv-stat-divider" />
        <div className="inv-stat inv-stat-danger">
          <span className="inv-stat-val">{expired}</span>
          <span className="inv-stat-lbl">Expired</span>
        </div>

        {/* Kitchen health indicator */}
        <div className="inv-health-bar-wrap">
          <div
            className="inv-health-bar"
            style={{
              width: total > 0 ? `${(fresh / total) * 100}%` : '0%',
              background: expiring === 0 && expired === 0 ? '#22c55e' : expiring > 0 ? '#fbbf24' : '#ef4444',
            }}
          />
        </div>
        <span className="inv-health-label">Kitchen Health</span>
      </div>

      <button className="inv-add-btn" onClick={() => onAddItem('pantry')}>
        + Add Item to Inventory
      </button>

      {/* Location Cards */}
      <div className="location-cards-grid">
        {LOCATIONS.map(loc => (
          <LocationCard
            key={loc.key}
            config={loc}
            items={byLocation[loc.key] ?? []}
            onSelectMeal={onSelectMeal}
            meals={meals}
            onAddItem={onAddItem}
          />
        ))}
      </div>

      {/* Kitchen Intel */}
      <KitchenIntel items={items} meals={meals} onSelectMeal={onSelectMeal} />
    </div>
  );
}