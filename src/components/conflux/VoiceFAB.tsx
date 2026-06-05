import { useState, useCallback, useRef } from 'react';
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

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (activeRef.current) return;
    activeRef.current = true;
    onStartPTT();
  }, [onStartPTT]);

  const handlePointerUp = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    onStopPTT();
  }, [onStopPTT]);

  // Safety: if pointer leaves while held, stop recording
  const handlePointerLeave = useCallback(() => {
    setShowTooltip(false);
    if (activeRef.current) {
      activeRef.current = false;
      onStopPTT();
    }
  }, [onStopPTT]);

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
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={handlePointerLeave}
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
            <span>Hold to talk · <kbd>Space</kbd> too</span>
          </div>
        </div>
      )}
    </div>
  );
}
