import { motion } from 'framer-motion';
import { ConfluxPresence, useConfluxController, attachTauriConfluxListeners } from './conflux';
import type { ConfluxTauriListen } from './conflux';
import { View } from '../types';
import { useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

interface ConfluxOrbitProps {
  view: View;
  immersiveView: View | null;
  chatOpen: boolean;
  voiceChatOpen: boolean;
  isPushToTalkActive: boolean;
}

export default function ConfluxOrbit({ view, immersiveView, chatOpen, voiceChatOpen, isPushToTalkActive }: ConfluxOrbitProps) {
  const conflux = useConfluxController({
    initialMode: 'idle',
    initialTransparent: true,
    initialStatus: 'System Online',
  });

  // Wire up Tauri event listeners for conflux:state and conflux:pulse
  // useEventListener ref pattern: useEffectEvent returns a new wrapper each render,
  // so we store it in a ref to keep the dependency array stable.
  const applyEventRef = useRef(conflux.applyEvent);
  applyEventRef.current = conflux.applyEvent;

  useEffect(() => {
    let disposed = false;
    let cleanup: { dispose: () => Promise<void> } | undefined;

    const tauriListen: ConfluxTauriListen = (event, handler) => {
      return listen(event, (e) => handler(e as any));
    };

    attachTauriConfluxListeners(tauriListen, (event, source) => {
      // Log raw payload to diagnose STT pipeline
      console.log('[ConfluxOrbit] conflux:state event received:', JSON.stringify(event));
      console.log('[ConfluxOrbit] Event source:', source);
      if (event.listeningCadence) {
        console.log('[ConfluxOrbit] listeningCadence tokens:', event.listeningCadence.tokens);
      }
      applyEventRef.current(event, source);
    }).then((bridge) => {
      if (disposed) {
        void bridge.dispose();
        return;
      }
      cleanup = bridge;
      console.log('[ConfluxOrbit] Tauri listeners attached');
    });

    return () => {
      disposed = true;
      void cleanup?.dispose();
    };
  }, []);

  // Listen for Push-to-Talk events
  useEffect(() => {
    const handlePTTStart = () => {
      console.log('[ConfluxOrbit] PTT Start - switching to listen mode');
      conflux.setMode('listen', 'manual', 'Listening...');
    };
    const handlePTTEnd = () => {
      // Don't go idle yet — stay in listen mode while transcription is processing.
      // The 'conflux-transcription-done' event will handle the final reset.
      console.log('[ConfluxOrbit] PTT End - keeping listen mode during transcription');
    };
    const handleTranscriptionDone = () => {
      console.log('[ConfluxOrbit] Transcription done - pulsing and resetting to idle');
      conflux.triggerPulse(10, 'Transcription complete');
      conflux.setMode('idle', 'manual', 'Ready');
    };

    window.addEventListener('push-to-talk-start', handlePTTStart);
    window.addEventListener('push-to-talk-end', handlePTTEnd);
    window.addEventListener('conflux-transcription-done', handleTranscriptionDone);

    return () => {
      window.removeEventListener('push-to-talk-start', handlePTTStart);
      window.removeEventListener('push-to-talk-end', handlePTTEnd);
      window.removeEventListener('conflux-transcription-done', handleTranscriptionDone);
    };
  }, []);

  // Determine position based on app state
  // Using window.innerWidth/Height to handle responsiveness
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // Set initial dimensions immediately
    setDimensions({ width: window.innerWidth, height: window.innerHeight });
    
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Logic for "Fairy" positioning
  let targetX = dimensions.width - 350; // Right side with padding
  let targetY = dimensions.height - 350; // Bottom with padding
  let scale = 1;

  if (isPushToTalkActive) {
    // When listening (Push-to-Talk), fly to the center and grow
    targetX = dimensions.width / 2 - 250; // Centered horizontally
    targetY = dimensions.height / 2 - 250; // Centered vertically
    scale = 1.8; // Much larger to indicate it's "leaning in"
  } else if (immersiveView) {
    // If in an app, move to the top-right of the app view
    targetX = dimensions.width - 350;
    targetY = 50; // Top with padding
    scale = 0.75; // Slightly smaller to not obstruct app UI
  } else if (view === 'dashboard') {
    // Idle state: hovering near the dock (ConfluxBarV2)
    targetX = dimensions.width - 320;
    targetY = dimensions.height - 320;
    scale = 1;
  }

  // Transition animation config
  const transition = {
    type: 'spring' as const,
    stiffness: 60,
    damping: 15,
    mass: 0.8,
  };

  if (dimensions.width === 0) return null;

  return (
    <motion.div
      initial={false}
      animate={{ x: targetX, y: targetY, scale }}
      transition={transition}
      style={{
        position: 'fixed',
        zIndex: 100,
        pointerEvents: 'none', // Let clicks pass through the fairy
        top: 0,
        left: 0,
      }}
    >
      <ConfluxPresence
        command={conflux.command}
        pulseImpulse={conflux.pulseImpulse}
        pulseEvent={conflux.pulseEvent}
        transparent={conflux.transparent}
        style={{ width: 300, height: 300 }}
      />
    </motion.div>
  );
}
