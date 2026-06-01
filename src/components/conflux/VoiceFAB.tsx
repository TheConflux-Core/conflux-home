import { useState, useRef, useCallback, useEffect } from 'react';
import './VoiceFAB.css';

interface VoiceFABProps {
  isPushToTalkActive: boolean;
  voiceChatOpen: boolean;
  onTogglePushToTalk: () => void;
  onOpenVoiceChat: () => void;
  pulseImpulse: number;
  effectivePalette: { node: string; hot: string; glow: string; aura: string };
}

export default function VoiceFAB({
  isPushToTalkActive,
  voiceChatOpen,
  onTogglePushToTalk,
  onOpenVoiceChat,
  pulseImpulse,
  effectivePalette,
}: VoiceFABProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const longPressTimerRef = useRef<number>(0);
  const longPressTriggeredRef = useRef(false);

  const handlePointerDown = useCallback(() => {
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      onOpenVoiceChat();
    }, 500);
  }, [onOpenVoiceChat]);

  const handlePointerUp = useCallback(() => {
    clearTimeout(longPressTimerRef.current);
    if (!longPressTriggeredRef.current) {
      onTogglePushToTalk();
    }
  }, [onTogglePushToTalk]);

  useEffect(() => () => clearTimeout(longPressTimerRef.current), []);

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
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        clearTimeout(longPressTimerRef.current);
        setShowTooltip(false);
      }}
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
            <span>Tap = Push to Talk</span>
            <span>Hold = Voice Chat</span>
          </div>
          <div className="voice-fab-tooltip-kbd">
            <kbd>Space</kbd> for PTT
          </div>
        </div>
      )}
    </div>
  );
}
