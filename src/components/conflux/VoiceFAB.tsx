import { useState, useCallback, useRef, useEffect } from 'react';
import './VoiceFAB.css';

interface VoiceFABProps {
  isPushToTalkActive: boolean;
  onStartPTT: () => void;
  onStopPTT: () => void;
  pulseImpulse: number;
  effectivePalette: { node: string; hot: string; glow: string; aura: string };
}

export default function VoiceFAB({
  isPushToTalkActive,
  onStartPTT,
  onStopPTT,
  pulseImpulse,
  effectivePalette,
}: VoiceFABProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const pointerTypeRef = useRef<string>('mouse');

  // ── Click-to-toggle: works for both desktop and mobile ──────────
  // Previous hold-to-talk on desktop broke when cursor drifted off the
  // tiny FAB button (pointerleave fired → recording stopped after ~2s).
  // Now everything is tap-to-toggle: click to start, click again to stop.

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Track pointer type for the minor touch delay below
    if ('pointerType' in e) {
      pointerTypeRef.current = (e as React.PointerEvent).pointerType;
    }

    if (isPushToTalkActive) {
      // Second tap — stop and send
      onStopPTT();
    } else {
      // Start recording. Touch events need a tiny delay to avoid
      // double-fire from the pointer→click event sequence.
      const isTouch = pointerTypeRef.current === 'touch';
      if (isTouch) {
        setTimeout(() => onStartPTT(), 50);
      } else {
        onStartPTT();
      }
    }
  }, [isPushToTalkActive, onStartPTT, onStopPTT]);

  const intensity = Math.min(pulseImpulse / 16, 1);

  return (
    <div
      className={`voice-fab ${isPushToTalkActive ? 'active ptt' : ''}`}
      style={{
        '--fab-color': effectivePalette.node,
        '--fab-glow': effectivePalette.glow,
        '--fab-intensity': intensity,
      } as React.CSSProperties}
      onClick={handleClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="voice-fab-bg" />
      <div className="voice-fab-icon">
        {isPushToTalkActive ? '🔴' : '🎤'}
      </div>
      {isPushToTalkActive && <div className="voice-fab-ptt-ring" />}

      {showTooltip && !isPushToTalkActive && (
        <div className="voice-fab-tooltip">
          <div className="voice-fab-tooltip-title">Talk to Conflux</div>
          <div className="voice-fab-tooltip-hint">
            <span>Click to talk · <kbd>Space</kbd> too</span>
          </div>
        </div>
      )}
    </div>
  );
}
