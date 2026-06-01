import { useEffect, useRef, useState } from 'react';
import type { BrainMode, PaletteName } from '../../lib/neuralBrain';
import './DockGlow.css';

interface DockGlowProps {
  mode: BrainMode;
  pulseImpulse: number;
  effectivePalette: { node: string; hot: string; line: string; glow: string; aura: string };
  appPalette: PaletteName | null;
  children: React.ReactNode;
}

export default function DockGlow({
  mode,
  pulseImpulse,
  effectivePalette,
  appPalette,
  children,
}: DockGlowProps) {
  const [ripple, setRipple] = useState(false);
  const prevPulseRef = useRef(pulseImpulse);
  const rippleTimerRef = useRef<number>(0);

  // Fire ripple on significant pulse increases
  useEffect(() => {
    if (pulseImpulse - prevPulseRef.current > 5) {
      setRipple(true);
      clearTimeout(rippleTimerRef.current);
      rippleTimerRef.current = window.setTimeout(() => setRipple(false), 700);
    }
    prevPulseRef.current = pulseImpulse;
  }, [pulseImpulse]);

  useEffect(() => () => clearTimeout(rippleTimerRef.current), []);

  const intensity = Math.min(pulseImpulse / 24, 1);
  const isListening = mode === 'listen';
  const isSpeaking = mode === 'speak';

  return (
    <div
      className={`dock-glow-wrapper ${ripple ? 'dock-glow-ripple' : ''} ${isListening ? 'dock-glow-listening' : ''} ${isSpeaking ? 'dock-glow-speaking' : ''}`}
      style={{
        '--dock-color': effectivePalette.node,
        '--dock-glow': effectivePalette.glow,
        '--dock-aura': effectivePalette.aura,
        '--dock-intensity': intensity,
      } as React.CSSProperties}
    >
      <div className="dock-glow-ambient" />
      {children}
    </div>
  );
}
