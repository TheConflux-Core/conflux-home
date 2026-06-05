import { useState, useCallback } from 'react';
import './VoiceFAB.css';

interface VoiceFABProps {
  isPushToTalkActive: boolean;
  voiceChatOpen: boolean;
  onTogglePushToTalk: () => void;
  pulseImpulse: number;
  effectivePalette: { node: string; hot: string; glow: string; aura: string };
}

export default function VoiceFAB({
  isPushToTalkActive,
  voiceChatOpen,
  onTogglePushToTalk,
  pulseImpulse,
  effectivePalette,
}: VoiceFABProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = useCallback(() => {
    onTogglePushToTalk();
  }, [onTogglePushToTalk]);

  const intensity = Math.min(pulseImpulse / 16, 1);
  const isActive = isPushToTalkActive || voiceChatOpen;

  return (
    <div
      className={`voice-fab ${isActive ? 'active' : ''} ${isPushToTalkActive ? 'ptt' : ''} ${voiceChatOpen ? 'voice-chat' : ''}`}
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
        {voiceChatOpen ? '🔊' : isPushToTalkActive ? '🔴' : '🎤'}
      </div>
      {isPushToTalkActive && <div className="voice-fab-ptt-ring" />}

      {showTooltip && !isActive && (
        <div className="voice-fab-tooltip">
          <div className="voice-fab-tooltip-title">Talk to Conflux</div>
          <div className="voice-fab-tooltip-hint">
            <span>Click or <kbd>Space</kbd> = Push to Talk</span>
          </div>
        </div>
      )}
    </div>
  );
}
