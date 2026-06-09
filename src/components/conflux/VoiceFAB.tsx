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
  const lastTapRef = useRef<number>(0);

  // ── Click-to-toggle: works for both desktop and mobile ──────────
  // Tap to start, tap again to stop. No setTimeout — it breaks the
  // user gesture chain required by Android WebView's SpeechRecognition.
  // Use a 300ms debounce to prevent double-fire from pointer→click.

  const handleClick = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) return; // debounce
    lastTapRef.current = now;

    if (isPushToTalkActive) {
      onStopPTT();
    } else {
      onStartPTT();
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
