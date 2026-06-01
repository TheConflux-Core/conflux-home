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
  voiceChatOpen: boolean;
  onTogglePushToTalk: () => void;
  onOpenVoiceChat: () => void;
}

export default function ConfluxShell({
  children,
  isPushToTalkActive,
  voiceChatOpen,
  onTogglePushToTalk,
  onOpenVoiceChat,
}: ConfluxShellProps) {
  const conflux = useConflux();
  useGlobalClickSound();

  return (
    <>
      {/* Status Orb — centered in top bar, replaces "Desktop" text */}
      <div style={{ position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 901 }}>
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

      {/* Voice FAB — bottom-right floating mic button */}
      <VoiceFAB
        isPushToTalkActive={isPushToTalkActive}
        voiceChatOpen={voiceChatOpen}
        onTogglePushToTalk={onTogglePushToTalk}
        onOpenVoiceChat={onOpenVoiceChat}
        pulseImpulse={conflux.pulseImpulse}
        effectivePalette={conflux.effectivePalette}
      />
    </>
  );
}
