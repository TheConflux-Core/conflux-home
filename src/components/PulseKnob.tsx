// Conflux Home — PulseKnob Component
// Animated heartbeat interval control for the INTEL Dashboard
// Drag circularly to select interval • Arc depletes as time passes

import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface PulseKnobProps {
  value: number;          // current interval in ms (0 = off)
  onChange: (ms: number) => void;
  lastBeat?: number;      // timestamp of last beat (for countdown arc + heart pulse)
}

// ── Presets ──────────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'OFF',   ms: 0,           position: 0 },
  { label: '15m',   ms: 900_000,     position: 1 },
  { label: '1hr',   ms: 3_600_000,   position: 2 },
  { label: '4hr',   ms: 14_400_000, position: 3 },
  { label: '8hr',   ms: 28_800_000, position: 4 },
  { label: '12hr',  ms: 43_200_000, position: 5 },
] as const;

const RING_RADIUS = 44;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const CENTER = 54;
const NUM_DETENTS = PRESETS.length;

// ── Helpers ──────────────────────────────────────────────────────────────────

function msToLabel(ms: number): string {
  if (ms === 0) return '⏸ OFF';
  if (ms < 3_600_000) return `${ms / 60_000}m`;
  return `${ms / 3_600_000}hr`;
}

function msToPreset(ms: number): number {
  const p = PRESETS.findIndex(pr => pr.ms === ms);
  return p === -1 ? 4 : p;
}

function angleToPreset(angleDeg: number): number {
  // 0° = top (12 o'clock), clockwise through all 6 detents
  let pos = ((angleDeg + 90 + 360) % 360) / (360 / NUM_DETENTS);
  return Math.round(pos) % NUM_DETENTS;
}

// ── Heart SVG (3D neumorphic) ───────────────────────────────────────────────

function KnobCenterIcon({ isOff, isBeating }: { isOff: boolean; isBeating: boolean }) {
  return (
    <g>
      {/* Neumorphic shadow layer — dark bottom-right */}
      <path
        d="M54 68 C54 68 34 56 34 44 C34 37 39 32 46 32 C49.5 32 52.5 33.5 54 36 C55.5 33.5 58.5 32 62 32 C69 32 74 37 74 44 C74 56 54 68 54 68Z"
        fill="#7f1d1d"
        transform="translate(2, 3)"
      />

      {/* Main heart body — rich crimson gradient */}
      <defs>
        <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#fca5a5" />
          <stop offset="35%"  stopColor="#ef4444" />
          <stop offset="70%"  stopColor="#b91c1c" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
        <filter id="heartGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="heartGlowIntense" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="heartClip">
          <path d="M54 68 C54 68 34 56 34 44 C34 37 39 32 46 32 C49.5 32 52.5 33.5 54 36 C55.5 33.5 58.5 32 62 32 C69 32 74 37 74 44 C74 56 54 68 54 68Z" />
        </clipPath>
      </defs>

      <path
        d="M54 68 C54 68 34 56 34 44 C34 37 39 32 46 32 C49.5 32 52.5 33.5 54 36 C55.5 33.5 58.5 32 62 32 C69 32 74 37 74 44 C74 56 54 68 54 68Z"
        fill="url(#heartGrad)"
        filter={isBeating ? 'url(#heartGlowIntense)' : 'url(#heartGlow)'}
      >
        {/* Slow breathing pulse — continuous */}
        <animateTransform
          attributeName="transform"
          type="scale"
          values="1;1.06;1"
          dur="2.4s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
        />
        {/* Color brightens on beat */}
        <animate
          attributeName="fill"
          values="url(#heartGrad);#fca5a5;url(#heartGrad)"
          dur="0.5s"
          begin={isBeating ? '0s' : 'indefinite'}
          repeatCount={isBeating ? 1 : 0}
        />
      </path>

      {/* Neumorphic top-left highlight (clipped to heart) */}
      <ellipse
        cx="46"
        cy="40"
        rx="7"
        ry="5"
        fill="rgba(255,255,255,0.25)"
        filter="url(#heartGlow)"
        clipPath="url(#heartClip)"
        transform="rotate(-20 46 40)"
      />

      {/* Subtle specular — bottom-right reflection */}
      <ellipse
        cx="65"
        cy="48"
        rx="4"
        ry="2.5"
        fill="rgba(0,0,0,0.2)"
        transform="rotate(20 65 48)"
      />

      {/* Beat ripple ring — fires on each heartbeat */}
      {isBeating && (
        <circle cx="54" cy="50" r="18" fill="none" stroke="rgba(252,165,165,0.6)" strokeWidth="1.5">
          <animate attributeName="r" from="14" to="26" dur="0.6s" begin="0s" fill="freeze" />
          <animate attributeName="opacity" from="0.7" to="0" dur="0.6s" begin="0s" fill="freeze" />
        </circle>
      )}

      {/* OFF state — flat gray pause bars */}
      {isOff && (
        <g>
          <rect x="46" y="40" width="5" height="16" rx="2" fill="rgba(255,255,255,0.4)" />
          <rect x="57" y="40" width="5" height="16" rx="2" fill="rgba(255,255,255,0.4)" />
        </g>
      )}
    </g>
  );
}

// ── Detent tick marks ──────────────────────────────────────────────────────

function DetentTicks() {
  const ticks = [];
  for (let i = 0; i < NUM_DETENTS; i++) {
    const angleDeg = (i * 360) / NUM_DETENTS - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    const outerR = 54;
    const innerR = i === 0 ? 49 : 50;
    const x1 = CENTER + outerR * Math.cos(angleRad);
    const y1 = CENTER + outerR * Math.sin(angleRad);
    const x2 = CENTER + innerR * Math.cos(angleRad);
    const y2 = CENTER + innerR * Math.sin(angleRad);
    ticks.push(
      <line
        key={i}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={i === 0 ? 'rgba(239,68,68,0.7)' : 'rgba(255,255,255,0.25)'}
        strokeWidth={i === 0 ? 2.5 : 1.5}
        strokeLinecap="round"
      />
    );
  }
  return <g>{ticks}</g>;
}

// ── Notch labels (outside the outer ring) ───────────────────────────────────

function NotchLabels({ activePreset, currentPreset }: { activePreset: number; currentPreset: number }) {
  const labels = PRESETS.map((preset, i) => {
    const angleDeg = (i * 360) / NUM_DETENTS - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    // Position label just outside the tick marks
    const labelR = RING_RADIUS + 19;
    const x = CENTER + labelR * Math.cos(angleRad);
    const y = CENTER + labelR * Math.sin(angleRad);
    const isActive = i === activePreset;
    const isCurrent = i === currentPreset;
    return (
      <text
        key={i}
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={isActive ? '#ef4444' : isCurrent ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)'}
        fontSize={isActive ? '9' : '8'}
        fontFamily="var(--radar-font-mono, monospace)"
        fontWeight={isCurrent ? '700' : '500'}
        style={{
          transition: 'fill 0.15s ease, font-size 0.15s ease',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {preset.label}
      </text>
    );
  });
  return <g>{labels}</g>;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PulseKnob({ value, onChange, lastBeat }: PulseKnobProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // ── Refs (no stale closure issues in rAF loop) ──────────────────────────
  const valueRef = useRef(value);
  const lastBeatRef = useRef(lastBeat ?? Date.now());
  const isDraggingRef = useRef(false);
  const rafRef = useRef<number>(0);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [dragAngle, setDragAngle] = useState<number | null>(null);
  const [justSnapped, setJustSnapped] = useState(false);
  const [displayPct, setDisplayPct] = useState(1); // for render only
  const [isBeating, setIsBeating] = useState(false);

  // Keep valueRef current — must happen before any rAF reads it
  useEffect(() => { valueRef.current = value; }, [value]);

  // ── Heart beat flash on Rust beat events ─────────────────────────────────
  useEffect(() => {
    if (!lastBeat) return;
    const prev = lastBeatRef.current;
    if (lastBeat <= prev) return; // ignore stale/infinite updates
    lastBeatRef.current = lastBeat;

    // Skip flash when OFF (no beats fire)
    if (valueRef.current === 0) return;

    // Trigger beat animation
    setIsBeating(true);
    const timeout = setTimeout(() => setIsBeating(false), 700);
    return () => clearTimeout(timeout);
  }, [lastBeat]);

  // ── Countdown rAF loop ────────────────────────────────────────────────────
  useEffect(() => {
    // Reset beat timer whenever value changes (user picked a new preset)
    lastBeatRef.current = Date.now();

    if (value === 0) {
      setDisplayPct(0);
      return;
    }

    function tick() {
      const elapsed = Date.now() - lastBeatRef.current;
      const interval = valueRef.current;
      setDisplayPct(Math.max(0, (interval - elapsed) / interval));
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  // Sync beat events from Rust — only resets lastBeatRef, no rAF restart
  useEffect(() => {
    if (lastBeat) lastBeatRef.current = lastBeat;
  }, [lastBeat]);

  // ── Drag handler ──────────────────────────────────────────────────────────
  const getAngleFromEvent = useCallback((e: MouseEvent | React.MouseEvent): number => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
  }, []);

  // Attach drag handlers only when mouse goes down on the SVG — not on component mount
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setDragAngle(getAngleFromEvent(e));

    function onMove(ev: MouseEvent) {
      setDragAngle(getAngleFromEvent(ev));
    }

    function onUp(ev: MouseEvent) {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      const finalAngle = getAngleFromEvent(ev);
      const preset = angleToPreset(finalAngle);
      const newMs = PRESETS[preset].ms;

      if (newMs !== valueRef.current) {
        onChange(newMs);
        setDisplayPct(1);
        lastBeatRef.current = Date.now();
        setJustSnapped(true);
        setTimeout(() => setJustSnapped(false), 400);
      }
      setDragAngle(null);

      // Detach immediately — only needed for this drag cycle
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [getAngleFromEvent, onChange]);

  // ── Display state ──────────────────────────────────────────────────────────
  const currentPreset = msToPreset(value);
  // During drag: show the angle being dragged to; otherwise: show committed value
  const activePreset = dragAngle !== null
    ? angleToPreset(dragAngle)
    : currentPreset;
  const isOff = PRESETS[currentPreset].ms === 0;

  const ringColor = isOff
    ? 'rgba(75, 85, 99, 0.8)'
    : '#ef4444'; // always red — it's a heartbeat

  // ── Stable filter IDs (created once, not per-render) ────────────────────
  const [filterId] = useState(() => `knob-filter-${Math.random().toString(36).slice(2, 7)}`);
  const [glowId] = useState(() => `knob-glow-${Math.random().toString(36).slice(2, 7)}`);

  return (
    <div className={`intel-pulse-knob${justSnapped ? ' snapped' : ''}${isOff ? ' off' : ''}`}>
      <div className="intel-knob-label">HEARTBEAT</div>

      <svg
        ref={svgRef}
        viewBox="0 0 108 108"
        className="intel-knob-svg"
        onMouseDown={(e) => {
          e.preventDefault();
          handleMouseDown(e);
        }}
        style={{ cursor: isDraggingRef.current ? 'grabbing' : 'grab' }}
      >
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx={CENTER} cy={CENTER} r={RING_RADIUS + 6}
          fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <DetentTicks />
        <NotchLabels activePreset={activePreset} currentPreset={currentPreset} />

        {/* Track ring */}
        <circle cx={CENTER} cy={CENTER} r={RING_RADIUS}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" strokeLinecap="round" />

        {/* Countdown arc — NO CSS transition, pure rAF for accurate timing */}
        {!isOff && (
          <circle
            cx={CENTER} cy={CENTER} r={RING_RADIUS}
            fill="none"
            stroke={ringColor}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - displayPct)}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            filter={`url(#${filterId})`}
          />
        )}

        {/* Indicator dots */}
        {PRESETS.map((_, i) => {
          const angleDeg = (i * 360) / NUM_DETENTS - 90;
          const angleRad = (angleDeg * Math.PI) / 180;
          const dotR = RING_RADIUS + 10;
          const x = CENTER + dotR * Math.cos(angleRad);
          const y = CENTER + dotR * Math.sin(angleRad);
          const isActive = i === activePreset;
          const isCurrent = i === currentPreset;
          return (
            <circle
              key={i}
              cx={x} cy={y}
              r={isActive ? 4 : isCurrent ? 3 : 2}
              fill={isActive ? ringColor : 'rgba(255,255,255,0.2)'}
              style={{
                transition: 'r 0.15s ease, fill 0.15s ease',
                filter: isActive ? `drop-shadow(0 0 4px ${ringColor})` : undefined,
              }}
            />
          );
        })}

        <KnobCenterIcon isOff={isOff} isBeating={isBeating} />
      </svg>

      <div className="intel-knob-value" style={{ color: ringColor }}>
        {dragAngle !== null ? PRESETS[activePreset].label : msToLabel(value)}
      </div>

      <div className="intel-knob-interval-label">
        {value === 0 ? 'disabled' : `every ${msToLabel(value)}`}
      </div>

      {dragAngle !== null && (
        <div className="intel-knob-drag-hint">release to set</div>
      )}
    </div>
  );
}
