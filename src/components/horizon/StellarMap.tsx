import { useState, useRef, useCallback, useEffect } from 'react';
import type { DreamMilestone } from '../../types';

interface StellarMapProps {
  milestones: DreamMilestone[];
  selectedMilestoneId: string | null;
  onSelectMilestone: (milestoneId: string | null) => void;
  isGenerating?: boolean;
}

interface StarPosition {
  milestone: DreamMilestone;
  x: number;
  y: number;
}

function genPositions(milestones: DreamMilestone[]): StarPosition[] {
  if (milestones.length === 0) return [];
  if (milestones.length === 1) {
    return [{ milestone: milestones[0], x: 400, y: 250 }];
  }
  if (milestones.length === 2) {
    return [
      { milestone: milestones[0], x: 300, y: 200 },
      { milestone: milestones[1], x: 500, y: 300 },
    ];
  }
  if (milestones.length === 3) {
    return [
      { milestone: milestones[0], x: 400, y: 140 },
      { milestone: milestones[1], x: 240, y: 320 },
      { milestone: milestones[2], x: 560, y: 320 },
    ];
  }
  // 4+ — spread in a beautiful arc constellation
  const cx = 400;
  const cy = 280;
  const baseRadius = 180;
  return milestones.map((m, i) => {
    // Create a semi-circle arc (upper half) with slight organic variation
    const totalSlots = milestones.length;
    const angle = Math.PI - (i / (totalSlots - 1)) * Math.PI;
    const r = baseRadius + ((i % 2) * 2 - 1) * 40 + (Math.sin(i * 1.3) * 25);
    const x = cx + Math.cos(angle) * r;
    const y = cy - Math.abs(Math.sin(angle)) * 80 - Math.sin(angle * 2) * 20;
    return { milestone: m, x, y };
  });
}

export default function StellarMap({
  milestones,
  selectedMilestoneId,
  onSelectMilestone,
  isGenerating = false,
}: StellarMapProps) {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const positions = genPositions(milestones);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => Math.max(0.4, Math.min(3, prev - e.deltaY * 0.001)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  }, [panX, panY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleZoomIn = useCallback(() => setZoom((p) => Math.min(3, p + 0.25)), []);
  const handleZoomOut = useCallback(() => setZoom((p) => Math.max(0.4, p - 0.25)), []);
  const handleReset = useCallback(() => { setZoom(1); setPanX(0); setPanY(0); }, []);

  const getStarRadius = (m: DreamMilestone) => {
    if (m.is_completed) return 18;
    if (selectedMilestoneId === m.id) return 16;
    if (hoveredId === m.id) return 15;
    return 13;
  };

  const getStarColor = (m: DreamMilestone) => {
    if (m.is_completed) return '#fbbf24';
    if (selectedMilestoneId === m.id) return '#67e8f9';
    if (hoveredId === m.id) return '#a5b4fc';
    return '#6366f1';
  };

  const getGlowColor = (m: DreamMilestone) => {
    if (m.is_completed) return '#fbbf24';
    if (selectedMilestoneId === m.id) return '#06b6d4';
    return '#818cf8';
  };

  if (isGenerating) {
    return (
      <div className="stellar-map stellar-map-generating">
        <div className="stellar-generating-orbs">
          <div className="stellar-generating-orb" />
          <div className="stellar-generating-orb" />
          <div className="stellar-generating-orb" />
          <div className="stellar-generating-orb" />
        </div>
        <p className="stellar-generating-text">Charting your constellation...</p>
        <p className="stellar-generating-subtext">AI is crafting milestones from your dream</p>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="stellar-map stellar-map-empty">
        <div className="stellar-map-empty-content">
          <div className="stellar-map-empty-icon">✦</div>
          <p className="stellar-map-empty-title">Your Constellation Awaits</p>
          <p className="stellar-map-empty-text">
            Your journey begins the moment you chart the stars.<br/>
            Add milestones above to map your path.
          </p>
          <p className="stellar-map-empty-hint">✨ Use "Break It Down" to auto-generate your constellation</p>
        </div>
      </div>
    );
  }

  const svgTransform = `scale(${zoom})`;
  const innerPanX = panX / zoom;
  const innerPanY = panY / zoom;

  return (
    <div className="stellar-map">
      <svg
        ref={svgRef}
        className="stellar-map-svg"
        viewBox="0 0 800 500"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          {/* Nebula gradient for depth */}
          <radialGradient id="nebulaGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="rgba(139,92,246,0.06)" />
            <stop offset="100%" stopColor="rgba(6,182,212,0.02)" />
          </radialGradient>
          {/* Star glow filter */}
          <filter id="starGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Soft glow for lines */}
          <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Space background */}
        <rect width="800" height="500" fill="url(#nebulaGrad)" />

        {/* Faint grid lines for cosmic depth */}
        {Array.from({ length: 8 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 70 + 35} x2="800" y2={i * 70 + 35}
            stroke="rgba(99,102,241,0.05)" strokeWidth="1" />
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <line key={`v${i}`} x1={i * 70 + 35} y1="0" x2={i * 70 + 35} y2="500"
            stroke="rgba(99,102,241,0.05)" strokeWidth="1" />
        ))}

        {/* Transform group — applies zoom + pan */}
        <g transform={`translate(${innerPanX}, ${innerPanY}) ${svgTransform}`} style={{ transformOrigin: '400px 250px' }}>

          {/* Constellation connecting lines */}
          {positions.map((pos, i) => {
            if (i === 0) return null;
            const prev = positions[i - 1];
            const completed = pos.milestone.is_completed && prev.milestone.is_completed;
            return (
              <line
                key={`line-${i}`}
                x1={prev.x}
                y1={prev.y}
                x2={pos.x}
                y2={pos.y}
                stroke={completed ? 'rgba(251,191,36,0.5)' : 'rgba(6,182,212,0.35)'}
                strokeWidth={completed ? 2 : 1.5}
                strokeDasharray={completed ? '0' : '5 5'}
                filter={completed ? 'url(#lineGlow)' : 'none'}
                style={{ transition: 'stroke 0.5s, stroke-width 0.3s' }}
              />
            );
          })}

          {/* Stars (milestones) */}
          {positions.map(({ milestone: m, x, y }) => {
            const r = getStarRadius(m);
            const color = getStarColor(m);
            const glow = getGlowColor(m);
            const isSelected = selectedMilestoneId === m.id;
            const isHovered = hoveredId === m.id;
            const isCompleted = m.is_completed;

            return (
              <g
                key={m.id}
                className={`stellar-star ${isSelected ? 'selected' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => onSelectMilestone(isSelected ? null : m.id)}
                onMouseEnter={() => setHoveredId(m.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Outer glow ring for selected */}
                {isSelected && (
                  <circle cx={x} cy={y} r={r + 12} fill="none" stroke={glow} strokeWidth="1.5" opacity="0.35"
                    style={{ animation: 'pulse-ring 2s ease-in-out infinite' }} />
                )}

                {/* Star core glow */}
                <circle cx={x} cy={y} r={r + 5} fill={glow} opacity="0.2"
                  className="stellar-star-glow"
                  style={{ transition: 'opacity 0.25s ease' }} />

                {/* Main star */}
                <circle cx={x} cy={y} r={r} fill={color}
                  className="stellar-star-main"
                  style={{ filter: 'url(#starGlow)', transition: 'filter 0.25s ease' }} />

                {/* Inner bright center for completed stars */}
                {isCompleted && (
                  <circle cx={x} cy={y} r={r * 0.45} fill="white" opacity="0.7" />
                )}

                {/* Checkmark for completed */}
                {isCompleted && (
                  <text x={x} y={y + r + 18} textAnchor="middle" fill="rgba(251,191,36,0.9)"
                    fontSize="11" fontFamily="Inter" style={{ pointerEvents: 'none' }}>
                    ✦ Illuminated
                  </text>
                )}

                {/* Star label */}
                <text
                  x={x}
                  y={y + r + 10}
                  textAnchor="middle"
                  fill={isCompleted ? 'rgba(251,191,36,0.85)' : 'rgba(226,232,240,0.85)'}
                  fontSize="11"
                  fontFamily="Inter, sans-serif"
                  fontWeight={isSelected ? '700' : '400'}
                  style={{ pointerEvents: 'none', transition: 'fill 0.3s' }}
                >
                  {m.title.length > 18 ? m.title.slice(0, 18) + '…' : m.title}
                </text>

                {/* Target date for selected */}
                {isSelected && m.target_date && (
                  <text x={x} y={y + r + 24} textAnchor="middle" fill="rgba(148,163,184,0.7)"
                    fontSize="9" fontFamily="Inter" style={{ pointerEvents: 'none' }}>
                    📅 {m.target_date}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom Controls */}
      <div className="stellar-map-controls">
        <button onClick={handleZoomIn} className="stellar-map-btn" title="Zoom In">+</button>
        <button onClick={handleZoomOut} className="stellar-map-btn" title="Zoom Out">−</button>
        <button onClick={handleReset} className="stellar-map-btn" title="Reset">↺</button>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.15; }
        }
      `}</style>
    </div>
  );
}