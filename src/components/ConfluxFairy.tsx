// ConfluxFairy — Ambient companion sprite for Conflux Home
// Always present, always alive, softly reactive to context

import { useState, useEffect, useRef } from 'react';
import { playFairyChime } from '../lib/sound';
import './styles-fairy.css';

export type FairyExpression = 'idle' | 'listening' | 'thinking' | 'working' | 'alert' | 'night';

export interface FairyNudge {
  id: string;
  text: string;
  app?: string;
  priority?: 'info' | 'warn' | 'urgent';
}

interface ConfluxFairyProps {
  expression?: FairyExpression;
  activeNudge?: FairyNudge | null;
  onNudgeClick?: (nudge: FairyNudge) => void;
  visible?: boolean;
}

const STORAGE_KEY = 'conflux-fairy-position';

function loadPosition(): { x: number; y: number } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { x: 24, y: window.innerHeight - 140 };
}

export default function ConfluxFairy({
  expression: externalExpression,
  activeNudge,
  onNudgeClick,
  visible = true,
}: ConfluxFairyProps) {
  const [pos, setPos] = useState(loadPosition);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showBubble, setShowBubble] = useState(false);
  const prevNudgeRef = useRef<FairyNudge | null>(null);
  const fairyRef = useRef<HTMLDivElement>(null);
  const expression = externalExpression ?? 'idle';

  // Determine if it's night time (after 9pm)
  const [isNight] = useState(() => {
    const h = new Date().getHours();
    return h >= 21 || h < 6;
  });

  // React to nudge prop changes
  useEffect(() => {
    if (activeNudge && activeNudge !== prevNudgeRef.current) {
      prevNudgeRef.current = activeNudge;
      setShowBubble(true);
      playFairyChime();
      const timer = setTimeout(() => setShowBubble(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [activeNudge]);

  // Drag handlers
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 64, e.clientX - dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - 80, e.clientY - dragOffset.y)),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, dragOffset]);

  // Persist position
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  }, [pos]);

  if (!visible) return null;

  const fairyClass = [
    'conflux-fairy',
    `fairy-expr-${isNight && expression === 'idle' ? 'night' : expression}`,
    dragging ? 'fairy-dragging' : '',
    activeNudge ? 'fairy-nudging' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={fairyRef}
      className={fairyClass}
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={onMouseDown}
      title="Conflux Fairy — drag to move"
    >
      {/* Core orb */}
      <div className="fairy-orb">
        <div className="fairy-orb-inner" />
        <div className="fairy-orb-glow" />
      </div>

      {/* Orbit dots for thinking/working */}
      {(expression === 'thinking' || expression === 'working') && (
        <div className="fairy-orbit">
          <div className="fairy-orbit-dot" />
          <div className="fairy-orbit-dot" />
          <div className="fairy-orbit-dot" />
        </div>
      )}

      {/* Alert ring */}
      {expression === 'alert' && <div className="fairy-alert-ring" />}

      {/* Nudge speech bubble */}
      {activeNudge && showBubble && (
        <div
          className={`fairy-bubble fairy-bubble-${activeNudge.priority ?? 'info'}`}
          onClick={() => {
            onNudgeClick?.(activeNudge);
            setShowBubble(false);
          }}
        >
          <div className="fairy-bubble-text">{activeNudge.text}</div>
          {activeNudge.app && <div className="fairy-bubble-hint">Click to open →</div>}
        </div>
      )}
    </div>
  );
}

// Expose a global nudge trigger for the heartbeat / cron system
export function triggerFairyNudge(nudge: FairyNudge) {
  window.dispatchEvent(new CustomEvent('conflux:fairy-nudge', { detail: nudge }));
}
