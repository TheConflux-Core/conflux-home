import React from 'react';

interface SystemCard {
  name: string;
  icon: string;
  status: 'healthy' | 'warning' | 'critical';
  detail: string;
}

interface FoundationHeroProps {
  healthScore: number;
  systems: SystemCard[];
  alertsCount: number;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

function getStatusStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'healthy': return { background: '#10b98120', color: '#10b981' };
    case 'warning': return { background: '#f59e0b20', color: '#f59e0b' };
    case 'critical': return { background: '#ef444420', color: '#ef4444' };
    default: return { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' };
  }
}

const FoundationHero: React.FC<FoundationHeroProps> = ({ healthScore, systems, alertsCount }) => {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = (healthScore / 100) * circumference;
  const scoreColor = getScoreColor(healthScore);

  return (
    <div className="foundation-hero">
      {/* Blueprint grid background */}
      <div className="foundation-hero-bg" style={{
        position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none',
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(100,116,139,0.3) 59px, rgba(100,116,139,0.3) 60px),
          repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(100,116,139,0.3) 59px, rgba(100,116,139,0.3) 60px)
        `,
      }} />

      {/* Score ring */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <svg width="170" height="170" viewBox="0 0 170 170">
          <circle
            cx="85" cy="85" r={radius}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10"
          />
          <circle
            cx="85" cy="85" r={radius}
            fill="none" stroke={scoreColor} strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            transform="rotate(-90 85 85)"
            style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }}
          />
          <text
            x="85" y="82" textAnchor="middle" dominantBaseline="central"
            className="foundation-score-value"
            fill={scoreColor}
            fontSize="36" fontWeight="700"
          >
            {healthScore}
          </text>
          <text x="85" y="108" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="11">
            Health Score
          </text>
        </svg>
      </div>

      {/* System cards grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
      }}>
        {systems.map((sys, i) => (
          <div key={i} className="foundation-system-card" style={{
            padding: 12, borderRadius: 10,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>{sys.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{sys.name}</span>
            </div>
            <span
              className="foundation-system-status"
              style={{
                display: 'inline-block', fontSize: 11, fontWeight: 600,
                padding: '2px 8px', borderRadius: 100,
                ...getStatusStyle(sys.status),
              }}
            >
              {sys.status}
            </span>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 6 }}>
              {sys.detail}
            </div>
          </div>
        ))}
      </div>

      {/* Alert beacon */}
      {alertsCount > 0 && (
        <div className="foundation-alert-beacon" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          marginTop: 16, padding: '8px 16px', borderRadius: 100,
          background: '#ef444415', border: '1px solid #ef444430',
          fontSize: 13, fontWeight: 600, color: '#ef4444',
        }}>
          <span className="foundation-alert-beacon-dot" style={{
            width: 8, height: 8, borderRadius: '50%', background: '#ef4444',
            animation: 'foundation-pulse 1.5s ease-in-out infinite',
            boxShadow: '0 0 6px #ef444480',
          }} />
          {alertsCount} active {alertsCount === 1 ? 'alert' : 'alerts'}
        </div>
      )}
    </div>
  );
};

export default FoundationHero;
