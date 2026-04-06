// Weekly Insights Card Component
// Reusable card for individual insights with glassmorphism styling

import React from 'react';
import '../styles/weekly-insights.css';

interface InsightData {
  icon: string;
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

interface InsightsCardProps {
  data: InsightData;
  index?: number;
}

export default function InsightsCard({ data, index = 0 }: InsightsCardProps) {
  const { icon, title, value, subtitle, trend, color } = data;

  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '•';
  const trendClass = trend === 'up' ? 'trend-up' : trend === 'down' ? 'trend-down' : 'trend-neutral';

  return (
    <div
      className="insights-card"
      style={{
        animationDelay: `${index * 0.08}s`,
        borderLeft: color ? `3px solid ${color}` : undefined,
      }}
    >
      <div className="insights-card-icon">{icon}</div>
      <div className="insights-card-content">
        <div className="insights-card-title">{title}</div>
        <div className="insights-card-value">
          <span className="value-text">{value}</span>
          {trend && (
            <span className={`trend-indicator ${trendClass}`}>
              {trendIcon}
            </span>
          )}
        </div>
        {subtitle && (
          <div className="insights-card-subtitle">{subtitle}</div>
        )}
      </div>
    </div>
  );
}
