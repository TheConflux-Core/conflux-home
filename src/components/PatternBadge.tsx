import React from 'react';

interface PatternBadgeProps {
  type: 'attention' | 'success' | 'warning' | 'info';
  icon: string;
  title: string;
  description: string;
  onClick?: () => void;
}

export default function PatternBadge({ type, icon, title, description, onClick }: PatternBadgeProps) {
  const colorMap = {
    attention: '#f59e0b', // amber
    success: '#22c55e',   // emerald
    warning: '#ef4444',   // red
    info: '#3b82f6',      // blue
  };

  return (
    <div
      className={`pattern-badge pattern-badge-${type}`}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        background: 'var(--radar-surface)',
        border: `1px solid ${colorMap[type]}33`,
        borderRadius: 'var(--radar-radius-sm)',
        marginBottom: '8px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ fontSize: '1.2rem' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--radar-text-primary)',
          marginBottom: '2px',
        }}>
          {title}
        </div>
        <div style={{
          fontSize: '0.7rem',
          color: 'var(--radar-text-secondary)',
        }}>
          {description}
        </div>
      </div>
      {onClick && (
        <div style={{ color: colorMap[type], fontSize: '0.8rem' }}>
          →
        </div>
      )}
    </div>
  );
}
