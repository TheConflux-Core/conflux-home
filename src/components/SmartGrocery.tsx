// SmartGrocery — Redesigned Hearth grocery list
// Card-based with categories, color, depth and smooth check interactions.

import { useState } from 'react';
import type { GroceryItem } from '../types';

interface Props {
  items: GroceryItem[];
  onToggle: (id: string) => void;
}

type Category = 'produce' | 'dairy' | 'meat' | 'pantry' | 'frozen' | 'spice' | 'other';

const CATEGORY_CONFIG: Record<Category, { emoji: string; label: string; color: string; bg: string }> = {
  produce:  { emoji: '🥬', label: 'Produce',  color: '#22c55e', bg: 'rgba(34,197,94,0.10)' },
  dairy:    { emoji: '🥛', label: 'Dairy',     color: '#38bdf8', bg: 'rgba(56,189,248,0.10)' },
  meat:     { emoji: '🥩', label: 'Meat',     color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
  pantry:   { emoji: '🥫', label: 'Pantry',   color: '#fbbf24', bg: 'rgba(251,191,36,0.10)' },
  frozen:   { emoji: '🧊', label: 'Frozen',   color: '#a5f3fc', bg: 'rgba(165,243,252,0.08)' },
  spice:    { emoji: '🌿', label: 'Spices',   color: '#a78bfa', bg: 'rgba(167,139,250,0.10)' },
  other:    { emoji: '📦', label: 'Other',     color: '#a8a29e', bg: 'rgba(168,162,158,0.08)' },
};

function guessCategory(item: GroceryItem): Category {
  const name = item.name.toLowerCase();
  if (/milk|cheese|yogurt|butter|cream|egg/.test(name)) return 'dairy';
  if (/chicken|beef|pork|fish|salmon|steak|burger|bacon|sausage|turkey|shrimp|meat/.test(name)) return 'meat';
  if (/frozen|ice cream/.test(name)) return 'frozen';
  if (/salt|pepper|spice|herb|oregano|basil|thyme|cumin|paprika|seasoning/.test(name)) return 'spice';
  if (/bread|pasta|rice|cereal|flour|sugar|oil|canned|sauce|soup|bean|lentil|noodle/.test(name)) return 'pantry';
  if (/apple|banana|lettuce|tomato|onion|garlic|carrot|broccoli|spinach|fruit|veg|pepper|zucchini|cucumber|celery/.test(name)) return 'produce';
  return 'other';
}

function CategoryGroup({ category, items, onToggle }: { category: Category; items: GroceryItem[]; onToggle: (id: string) => void }) {
  const config = CATEGORY_CONFIG[category];
  const unchecked = items.filter(i => !i.is_checked);
  if (unchecked.length === 0) return null;

  return (
    <div className="grocery-category-group">
      <div className="grocery-category-header" style={{ borderLeftColor: config.color }}>
        <span className="grocery-category-emoji">{config.emoji}</span>
        <span className="grocery-category-label">{config.label}</span>
        <span className="grocery-category-count">{unchecked.length}</span>
      </div>
      {unchecked.map(item => (
        <GroceryCard key={item.id} item={item} config={config} onToggle={onToggle} />
      ))}
    </div>
  );
}

function GroceryCard({ item, config, onToggle }: { item: GroceryItem; config: typeof CATEGORY_CONFIG[Category]; onToggle: (id: string) => void }) {
  const [checking, setChecking] = useState(false);

  const handleClick = () => {
    setChecking(true);
    setTimeout(() => { setChecking(false); onToggle(item.id); }, 220);
  };

  return (
    <div
      className={`grocery-item-card ${checking ? 'grocery-item-card--checking' : ''}`}
      onClick={handleClick}
    >
      <div className="grocery-category-bar" style={{ background: config.color }} />
      <div className={`grocery-check-circle ${item.is_checked ? 'grocery-check-circle--checked' : ''}`}>
        {item.is_checked && <span className="grocery-check-mark">✓</span>}
      </div>
      <div className="grocery-item-content">
        <div className="grocery-item-left">
          <span className="grocery-item-name">{item.name}</span>
        </div>
        <div className="grocery-item-right">
          {item.quantity != null && (
            <span className="grocery-item-qty">
              {item.quantity}{item.unit ? ` ${item.unit}` : ''}
            </span>
          )}
          {item.estimated_cost != null && (
            <span className="grocery-item-cost">${item.estimated_cost.toFixed(2)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SmartGrocery({ items, onToggle }: Props) {
  const unchecked = items.filter(i => !i.is_checked);
  const checked = items.filter(i => i.is_checked);
  const totalCost = unchecked.reduce((sum, i) => sum + (i.estimated_cost ?? 0), 0);

  // Group by category
  const grouped: Partial<Record<Category, GroceryItem[]>> = {};
  unchecked.forEach(item => {
    const cat = guessCategory(item);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  // Order: produce, dairy, meat, pantry, frozen, spice, other
  const catOrder: Category[] = ['produce', 'dairy', 'meat', 'pantry', 'frozen', 'spice', 'other'];
  const activeCategories = catOrder.filter(c => grouped[c] && grouped[c].length > 0);

  return (
    <div className="smart-grocery">
      {/* Header */}
      <div className="smart-grocery-title-row">
        <span className="smart-grocery-emoji">🛒</span>
        <h3 className="smart-grocery-title">Grocery List</h3>
      </div>
      <div className="smart-grocery-meta">
        <span className="smart-grocery-count">{unchecked.length} items left</span>
        {totalCost > 0 && (
          <span className="smart-grocery-cost">~${totalCost.toFixed(2)} est.</span>
        )}
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="grocery-progress">
          <div
            className="grocery-progress-fill"
            style={{ width: `${(checked.length / items.length) * 100}%` }}
          />
        </div>
      )}

      {/* Category groups */}
      {activeCategories.map(cat => (
        <CategoryGroup
          key={cat}
          category={cat}
          items={grouped[cat]!}
          onToggle={onToggle}
        />
      ))}

      {/* Checked items */}
      {checked.length > 0 && (
        <div className="grocery-checked-section">
          <div className="grocery-checked-header">
            <span>✓</span>
            <span>Checked ({checked.length})</span>
          </div>
          {checked.map(item => (
            <div
              key={item.id}
              className="grocery-item-card grocery-item-card--checked"
              onClick={() => onToggle(item.id)}
            >
              <div className="grocery-check-circle grocery-check-circle--checked">
                <span className="grocery-check-mark">✓</span>
              </div>
              <div className="grocery-item-content">
                <span className="grocery-item-name grocery-item-name--checked">{item.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {unchecked.length === 0 && checked.length === 0 && (
        <div className="smart-grocery-empty">
          <span>🛒</span>
          <p>Your grocery list is empty.</p>
        </div>
      )}
    </div>
  );
}