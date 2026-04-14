// PantryHeatmap — Inventory freshness view
// Shows all pantry/fridge/freezer items with color-coded freshness + location badge

import { PantryHeatItem } from '../types';

const LOCATION_LABEL: Record<string, string> = {
  fridge:  '🧊 Fridge',
  freezer: '❄️ Freezer',
  pantry:  '🏠 Pantry',
};

export default function PantryHeatmap({ items }: { items: PantryHeatItem[] }) {
  return (
    <div className="pantry-heatmap">
      <h3 className="pantry-heatmap-title">🌡️ Inventory — {items.length} item{items.length !== 1 ? 's' : ''}</h3>
      <div className="pantry-heatmap-grid">
        {items.map((item, i) => {
          const hue = item.freshness * 120; // red(0) → green(120)
          const isUrgent = item.days_until_expiry !== null && item.days_until_expiry <= 3;
          const isExpired = item.days_until_expiry !== null && item.days_until_expiry < 0;
          const locBadge = LOCATION_LABEL[item.location ?? 'pantry'] ?? LOCATION_LABEL.pantry;
          return (
            <div key={i} className={`pantry-heat-item ${isUrgent ? 'urgent' : ''} ${isExpired ? 'expired' : ''}`} style={{ borderColor: `hsl(${hue}, 70%, 50%)` }}>
              <div className="pantry-heat-bar" style={{ width: `${item.freshness * 100}%`, background: `hsl(${hue}, 70%, 50%)` }} />
              <div className="pantry-heat-top">
                <span className="pantry-heat-name">{item.name}</span>
                <span className="pantry-heat-location">{locBadge}</span>
              </div>
              <span className="pantry-heat-days">
                {item.days_until_expiry !== null
                  ? isExpired ? `⚠️ expired` : `${item.days_until_expiry}d left`
                  : '✓ fresh'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
