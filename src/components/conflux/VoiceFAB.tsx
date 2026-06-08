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
  const activeRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobileRef = useRef(false);
  const pointerTypeRef = useRef<string>('mouse');

  // Detect touch device — check multiple signals for Tauri mobile compatibility
  useEffect(() => {
    isMobileRef.current =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;
  }, []);

  // ── Desktop: hold-to-talk via pointer events ────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Use the event's own pointerType for reliable mobile detection
    pointerTypeRef.current = e.pointerType;
    const isTouch = e.pointerType === 'touch';
    if (isTouch) return; // Mobile uses click handler
    e.preventDefault();
    if (activeRef.current) return;
    activeRef.current = true;
    onStartPTT();
  }, [onStartPTT]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (!activeRef.current) return;
    activeRef.current = false;
    onStopPTT();
  }, [onStopPTT]);

  const handlePointerLeave = useCallback((e: React.PointerEvent) => {
    setShowTooltip(false);
    if (e.pointerType === 'touch') return;
    if (activeRef.current) {
      activeRef.current = false;
      onStopPTT();
    }
  }, [onStopPTT]);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
    if (isMobileRef.current) return;
    if (activeRef.current) {
      activeRef.current = false;
      onStopPTT();
    }
  }, [onStopPTT]);

  // ── Mobile: tap to toggle (start on first tap, stop+send on second) ──

  const handleClick = useCallback(() => {
    // Use both event-derived and mount-detected mobile checks
    const isTouchDevice =
      pointerTypeRef.current === 'touch' || isMobileRef.current;
    if (!isTouchDevice) return;

    if (isPushToTalkActive) {
      // Second tap — stop and send
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      onStopPTT();
    } else {
      // First tap — start recording
      // Brief delay to distinguish tap from potential hold (prevents accidental triggers)
      holdTimerRef.current = setTimeout(() => {
        holdTimerRef.current = null;
        onStartPTT();
      }, 50);
    }
  }, [isPushToTalkActive, onStartPTT, onStopPTT]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  const intensity = Math.min(pulseImpulse / 16, 1);

  return (
    <div
      className={`voice-fab ${isPushToTalkActive ? 'active ptt' : ''}`}
      style={{
        '--fab-color': effectivePalette.node,
        '--fab-glow': effectivePalette.glow,
        '--fab-intensity': intensity,
      } as React.CSSProperties}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={handleMouseLeave}
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
            <span>{isMobileRef.current ? 'Tap to talk' : 'Hold to talk · <kbd>Space</kbd> too'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
