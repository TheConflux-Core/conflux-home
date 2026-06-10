/**
 * ConfluxShell — Renders the new lightweight visual components
 * that replace the WebGL NeuralBrain fairy.
 *
 * Must be rendered inside ConfluxOrbit (provides ConfluxContext).
 * Renders: StatusOrb (TopBar area), DockGlow (ambient glow), VoiceFAB (bottom-right).
 * Accepts children for the dock content (ConfluxBarV2 or ConfluxBar).
 */

import { useConflux } from './conflux';
import ConfluxStatusOrb from './conflux/ConfluxStatusOrb';
import DockGlow from './conflux/DockGlow';
import VoiceFAB from './conflux/VoiceFAB';
import { useGlobalClickSound } from '../hooks/useGlobalClickSound';

interface ConfluxShellProps {
  /** Dock content (ConfluxBarV2 or ConfluxBar) — wrapped with DockGlow */
  children: React.ReactNode;
  /** Voice control props */
  isPushToTalkActive: boolean;
  onStartPTT: () => void;
  onStopPTT: () => void;
}

export default function ConfluxShell({
  children,
  isPushToTalkActive,
  onStartPTT,
  onStopPTT,
}: ConfluxShellProps) {
  const conflux = useConflux();
  useGlobalClickSound();

  return (
    <>
      {/* Status Orb — CSS-driven positioning (no inline styles so mobile overrides work) */}
      <div className="topbar-center-orb">
        <ConfluxStatusOrb
          mode={conflux.mode}
          status={conflux.status}
          pulseImpulse={conflux.pulseImpulse}
          effectivePalette={conflux.effectivePalette}
          appPalette={conflux.appPalette}
        />
      </div>

      {/* Dock with reactive glow */}
      <DockGlow
        mode={conflux.mode}
        pulseImpulse={conflux.pulseImpulse}
        effectivePalette={conflux.effectivePalette}
        appPalette={conflux.appPalette}
      >
        {children}
      </DockGlow>

      {/* Voice FAB — hold to talk, release to send */}
      <VoiceFAB
        isPushToTalkActive={isPushToTalkActive}
        onStartPTT={onStartPTT}
        onStopPTT={onStopPTT}
        pulseImpulse={conflux.pulseImpulse}
        effectivePalette={conflux.effectivePalette}
      />
    </>
  );
}
