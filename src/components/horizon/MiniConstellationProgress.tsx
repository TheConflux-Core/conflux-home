// Mini star cluster representing dream progress inside constellation cards

interface Props {
  progress: number; // 0-100
  category: string;
}

const CATEGORY_COLORS: Record<string, { main: string; glow: string }> = {
  housing:    { main: '#3b82f6', glow: '#60a5fa' },
  education:  { main: '#8b5cf6', glow: '#a78bfa' },
  health:     { main: '#10b981', glow: '#34d399' },
  career:     { main: '#f59e0b', glow: '#fbbf24' },
  travel:     { main: '#06b6d4', glow: '#67e8f9' },
  family:     { main: '#ec4899', glow: '#f472b6' },
  personal:   { main: '#f97316', glow: '#fb923c' },
  financial:  { main: '#14b8a6', glow: '#2dd4bf' },
  creative:   { main: '#a855f7', glow: '#c084fc' },
};

export default function MiniConstellationProgress({ progress, category }: Props) {
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.travel;

  // Determine how many stars are "lit" based on progress
  // 0-20%: 1 star, 21-45%: 2 stars, 46-70%: 3 stars, 71-90%: 4 stars, 91-100%: 5 stars
  const litCount = progress >= 95 ? 5 : progress >= 75 ? 4 : progress >= 50 ? 3 : progress >= 25 ? 2 : 1;

  // Cluster layout — 5 stars in a loose gathering
  // Coordinates: [x, y] in a ~80x80 viewBox
  const starPositions = [
    [40, 15],  // top center — brightest for progress
    [20, 35],  // upper left
    [60, 30],  // upper right
    [25, 60],  // lower left
    [55, 58],  // lower right
    [40, 45],  // center
  ];

  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id={`cg-${category}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id={`sg-${category}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={colors.main} stopOpacity="0.9" />
          <stop offset="100%" stopColor={colors.glow} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background glow — the "constellation atmosphere" */}
      <circle cx="40" cy="40" r="32" fill={`url(#sg-${category})`} opacity={0.15 + (progress / 100) * 0.2} />

      {/* Stars */}
      {starPositions.map(([x, y], i) => {
        const isLit = i < litCount;
        const isCenter = i === 5;
        const r = isCenter ? 6 : isLit ? 4.5 : 3.5;

        return (
          <g key={i}>
            {/* Glow for lit stars */}
            {isLit && (
              <circle
                cx={x}
                cy={y}
                r={r + 4}
                fill={colors.main}
                opacity="0.25"
                filter={`url(#cg-${category})`}
              />
            )}
            {/* Star core */}
            <circle
              cx={x}
              cy={y}
              r={r}
              fill={isLit ? colors.glow : 'rgba(255,255,255,0.15)'}
              style={{
                filter: isLit ? `drop-shadow(0 0 ${r}px ${colors.main})` : 'none',
                transition: 'all 0.4s ease',
              }}
            />
            {/* Bright center for lit stars */}
            {isLit && (
              <circle cx={x} cy={y} r={r * 0.4} fill="white" opacity="0.6" />
            )}
          </g>
        );
      })}
    </svg>
  );
}