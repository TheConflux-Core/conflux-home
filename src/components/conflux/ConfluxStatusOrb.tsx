import { useState, useEffect, useRef } from 'react';
import type { BrainMode, PaletteName } from '../../lib/neuralBrain';
import './ConfluxStatusOrb.css';

interface ConfluxStatusOrbProps {
  mode: BrainMode;
  status: string;
  pulseImpulse: number;
  effectivePalette: { node: string; hot: string; line: string; glow: string; aura: string };
  appPalette: PaletteName | null;
}

const MODE_LABELS: Record<BrainMode, string> = {
  idle: 'Standing By',
  listen: 'Listening',
  focus: 'Focused',
  speak: 'Speaking',
  excited: 'Active',
  compact: 'Compact',
  expanded: 'Expanded',
};

const SHORTCUTS = [
  { key: 'Space', desc: 'Push to Talk' },
  { key: 'Esc', desc: 'Cancel Voice' },
];

export default function ConfluxStatusOrb({
  mode,
  status,
  pulseImpulse,
  effectivePalette,
  appPalette,
}: ConfluxStatusOrbProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [recentPulse, setRecentPulse] = useState(false);
  const pulseTimerRef = useRef<number>(0);

  // Flash on significant pulse events
  useEffect(() => {
    if (pulseImpulse > 4) {
      setRecentPulse(true);
      clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = window.setTimeout(() => setRecentPulse(false), 600);
    }
  }, [pulseImpulse]);

  useEffect(() => () => clearTimeout(pulseTimerRef.current), []);

  const intensity = Math.min(pulseImpulse / 20, 1);
  const orbColor = effectivePalette.node;
  const glowColor = effectivePalette.glow;
  const isListening = mode === 'listen';
  const isSpeaking = mode === 'speak';

  return (
    <div
      className={`status-orb ${recentPulse ? 'pulse' : ''} ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{
        '--orb-color': orbColor,
        '--orb-glow': glowColor,
        '--orb-intensity': intensity,
      } as React.CSSProperties}
    >
      <div className="status-orb-core" />
      <div className="status-orb-ring" />
      {isListening && <div className="status-orb-mic-icon">🎤</div>}

      {/* Always-visible status label */}
      <span className="status-orb-label">
        {MODE_LABELS[mode]}
      </span>

      {showTooltip && (
        <div className="status-orb-tooltip">
          <div className="status-orb-tooltip-header">
            <span className="status-orb-dot" style={{ background: orbColor }} />
            <span className="status-orb-mode">{MODE_LABELS[mode]}</span>
            {appPalette && <span className="status-orb-app">{appPalette}</span>}
          </div>
          <div className="status-orb-tooltip-status">{status}</div>
          <div className="status-orb-tooltip-divider" />
          <div className="status-orb-tooltip-shortcuts">
            {SHORTCUTS.map(s => (
              <div key={s.key} className="status-orb-shortcut">
                <kbd>{s.key}</kbd>
                <span>{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
