// Inventory Heatmap — Kitchen/Hearth Inventory View
// 3-column layout: Fridge | Freezer | Pantry
// Always shows all 3 sections, items grouped by location

import { PantryHeatItem } from '../types';

interface Props {
  items: PantryHeatItem[];
  onAddItem?: () => void;
}

interface LocationGroup {
  location: string;
  label: string;
  emoji: string;
  color: string;
  items: PantryHeatItem[];
}

function getLocationConfig(location: string): { label: string; emoji: string; color: string; bgGradient: string } {
  switch (location) {
    case 'fridge': return { label: 'Fridge', emoji: '🧊', color: '#38bdf8', bgGradient: 'rgba(56, 189, 248, 0.08)' };
    case 'freezer': return { label: 'Freezer', emoji: '❄️', color: '#a5f3fc', bgGradient: 'rgba(165, 243, 252, 0.06)' };
    case 'pantry': return { label: 'Pantry', emoji: '🏠', color: '#fbbf24', bgGradient: 'rgba(251, 191, 36, 0.06)' };
    default: return { label: 'All', emoji: '📦', color: '#a8a29e', bgGradient: 'rgba(168, 162, 158, 0.06)' };
  }
}

function getFreshnessColor(freshness: number): string {
  if (freshness > 0.66) return '#22c55e';
  if (freshness > 0.33) return '#fbbf24';
  return '#ef4444';
}

function getFreshnessLabel(freshness: number, daysUntilExpiry: number | null): string {
  if (daysUntilExpiry === null) return '✓ fresh';
  if (daysUntilExpiry < 0) return '⚠️ expired';
  if (daysUntilExpiry <= 2) return '🔥 use soon';
  if (daysUntilExpiry <= 7) return `${daysUntilExpiry}d left`;
  return `${daysUntilExpiry}d`;
}

const ALL_LOCATIONS = ['fridge', 'freezer', 'pantry'] as const;

export default function InventoryHeatmap({ items, onAddItem }: Props) {
  const groups: LocationGroup[] = ALL_LOCATIONS.map(loc => ({
    location: loc,
    label: getLocationConfig(loc).label,
    emoji: getLocationConfig(loc).emoji,
    color: getLocationConfig(loc).color,
    items: items.filter(i => (i.location || 'pantry') === loc),
  }));

  // Sort items within each group by freshness (freshest first = worst expiry first)
  groups.forEach(g => g.items.sort((a, b) => a.freshness - b.freshness));

  const totalItems = items.length;
  const freshCount = items.filter(i => (i.days_until_expiry ?? 999) > 7).length;
  const expiringCount = items.filter(i => (i.days_until_expiry ?? 999) <= 3 && (i.days_until_expiry ?? 999) >= 0).length;
  const expiredCount = items.filter(i => (i.days_until_expiry ?? 999) < 0).length;

  return (
    <div className="inventory-heatmap">
      {/* Summary Stats */}
      <div className="inventory-summary">
        <div className="inv-stat">
          <span className="inv-stat-value">{totalItems}</span>
          <span className="inv-stat-label">Items</span>
        </div>
        <div className="inv-stat inv-stat-fresh">
          <span className="inv-stat-value">{freshCount}</span>
          <span className="inv-stat-label">Fresh</span>
        </div>
        <div className="inv-stat inv-stat-warning">
          <span className="inv-stat-value">{expiringCount}</span>
          <span className="inv-stat-label">Expiring</span>
        </div>
        <div className="inv-stat inv-stat-danger">
          <span className="inv-stat-value">{expiredCount}</span>
          <span className="inv-stat-label">Expired</span>
        </div>
      </div>

      {/* Add Item Button */}
      {onAddItem && (
        <button className="inv-add-btn" onClick={onAddItem}>
          + Add Item to Inventory
        </button>
      )}

      {/* 3-Column Grid — always visible */}
      <div className="inventory-columns">
        {groups.map(group => {
          const config = getLocationConfig(group.location);
          const urgentItems = group.items.filter(i => (i.days_until_expiry ?? 999) <= 3 && (i.days_until_expiry ?? 999) >= 0);
          const expiredItems = group.items.filter(i => (i.days_until_expiry ?? 999) < 0);

          return (
            <div key={group.location} className="inventory-column">
              {/* Column Header */}
              <div
                className="inv-column-header"
                style={{ borderTopColor: config.color, background: config.bgGradient }}
              >
                <div className="inv-col-header-left">
                  <span className="inv-col-emoji">{config.emoji}</span>
                  <div className="inv-col-info">
                    <span className="inv-col-label">{config.label}</span>
                    <span className="inv-col-count">{group.items.length} items</span>
                  </div>
                </div>
                {(urgentItems.length > 0 || expiredItems.length > 0) && (
                  <span
                    className="inv-col-alert"
                    style={{ background: `${config.color}22`, color: config.color }}
                  >
                    {urgentItems.length + expiredItems.length}
                  </span>
                )}
              </div>

              {/* Items */}
              <div className="inv-col-items">
                {group.items.length > 0 ? (
                  group.items.map((item, idx) => {
                    const freshnessColor = getFreshnessColor(item.freshness);
                    const freshnessLabel = getFreshnessLabel(item.freshness, item.days_until_expiry);
                    const isUrgent = (item.days_until_expiry ?? 999) <= 3 && (item.days_until_expiry ?? 999) >= 0;
                    const isExpired = (item.days_until_expiry ?? 999) < 0;

                    return (
                      <div
                        key={idx}
                        className={`inv-col-item ${isUrgent ? 'inv-item-urgent' : ''} ${isExpired ? 'inv-item-expired' : ''}`}
                      >
                        <div
                          className="inv-col-item-bar"
                          style={{ background: freshnessColor, width: `${item.freshness * 100}%` }}
                        />
                        <div className="inv-col-item-content">
                          <span className="inv-col-item-name">{item.name}</span>
                          <span className="inv-col-item-fresh" style={{ color: freshnessColor }}>
                            {freshnessLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="inv-col-empty">
                    <span className="inv-col-empty-emoji">{config.emoji}</span>
                    <span className="inv-col-empty-text">Empty</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}