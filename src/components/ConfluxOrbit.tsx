import { motion } from 'framer-motion';
import { ConfluxPresence, useConfluxController, attachTauriConfluxListeners } from './conflux';
import type { ConfluxTauriListen } from './conflux';
import { View } from '../types';
import { useEffect, useRef, useState, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

interface ConfluxOrbitProps {
  view: View;
  immersiveView: View | null;
  chatOpen: boolean;
  voiceChatOpen: boolean;
  isPushToTalkActive: boolean;
}

// Magnetic Zones: target coordinates for each app view
// Conflux "zips" to the right spot instead of floating randomly
const MAGNETIC_ZONES: Record<string, { x: number; y: number; scale?: number }> = {
  budget: { x: 0, y: 0.5, scale: 0.7 },    // Left-center for Budget
  kitchen: { x: 0.95, y: 0.35, scale: 0.7 }, // Top-right for Kitchen
  life: { x: 0.95, y: 0.5, scale: 0.7 },     // Right-center for Life
  home: { x: 0.95, y: 0.5, scale: 0.7 },     // Right-center for Home Health
  dreams: { x: 0.5, y: 0.2, scale: 0.8 },    // Top-center for Dream Builder
  games: { x: 0.05, y: 0.5, scale: 0.7 },    // Left-center for Games
  feed: { x: 0.5, y: 0.5, scale: 0.7 },      // Center for Feed
  marketplace: { x: 0.5, y: 0.5, scale: 0.7 }, // Center for Marketplace
  echo: { x: 0.05, y: 0.5, scale: 0.7 },     // Left-center for Echo
  vault: { x: 0.05, y: 0.5, scale: 0.7 },    // Left-center for Vault
  studio: { x: 0.05, y: 0.5, scale: 0.7 },   // Left-center for Studio
  settings: { x: 0.95, y: 0.5, scale: 0.7 }, // Right-center for Settings
  dashboard: { x: 0.95, y: 0.9, scale: 1 },  // Bottom-right for Dashboard
  agents: { x: 0.05, y: 0.5, scale: 0.7 },   // Left-center for Agents
  'api-dashboard': { x: 0.05, y: 0.5, scale: 0.7 },
};

// App-to-lobe mapping for routePulse
// Each app triggers specific Conflux lobes (from valid LobeName type)
const APP_LOBE_MAP: Record<string, string> = {
  budget: 'reasoning',
  kitchen: 'memory',
  life: 'tools',
  home: 'perception',
  dreams: 'speech',
  games: 'memory',
  feed: 'perception',
  marketplace: 'tools',
  echo: 'memory',
  vault: 'perception',
  studio: 'tools',
  settings: 'tools',
  agents: 'tools',
  'api-dashboard': 'perception',
};

export default function ConfluxOrbit({ view, immersiveView, chatOpen, voiceChatOpen, isPushToTalkActive }: ConfluxOrbitProps) {

  // Audio Context for TTS playback
  const audioContextRef = useRef<AudioContext | null>(null);
  const playTTS = useCallback((base64: string, sampleRate: number) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Decode MP3 (browser native) - note: browser decodeAudioData expects compressed audio (mp3/wav/etc)
    ctx.decodeAudioData(bytes.buffer).then((audioBuffer) => {
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start(0);
      
      // Trigger the fairy to speak visually when audio starts
      conflux.setMode('speak', 'backend', 'Speaking...');
      console.log('[ConfluxOrbit] Playing TTS audio');

      // Reset to idle when audio finishes
      source.onended = () => {
        console.log('[ConfluxOrbit] TTS finished, returning to idle');
        conflux.setMode('idle', 'backend', 'Ready');
      };
    }).catch(e => console.error('TTS Decode Error:', e));
  }, []);
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

    attachTauriConfluxListeners(
      tauriListen, 
      (event, source) => {
        // Log raw payload to diagnose STT pipeline
        console.log('[ConfluxOrbit] conflux:state event received:', JSON.stringify(event));
        console.log('[ConfluxOrbit] Event source:', source);
        
        // Handle new conflux:state event format
        const stateEvent = event as any;
        if (stateEvent.state) {
          console.log('[ConfluxOrbit] State transition:', stateEvent.state, 'Source:', stateEvent.source || 'unknown');
          switch (stateEvent.state) {
            case 'Listening':
              conflux.setMode('listen', 'backend', 'Listening...');
              break;
            case 'Thinking':
              conflux.setMode('focus', 'backend', 'Thinking...');
              // Start continuous very vibrant pulse every 500ms while thinking
              const pulseIntervalId = setInterval(() => {
                if (conflux.mode === 'focus') {
                  conflux.triggerPulse(15, 'Thinking...'); // Strong recurring pulse
                } else {
                  clearInterval(pulseIntervalId);
                }
              }, 500); // Fast pulses
              break;
            case 'Speaking':
              conflux.setMode('speak', 'backend', 'Speaking...');
              break;
            case 'Idle':
              conflux.setMode('idle', 'backend', 'Ready');
              break;
            case 'Error':
              conflux.setMode('idle', 'backend', stateEvent.message || 'Error');
              break;
          }
        }
        
        if (event.listeningCadence) {
          console.log('[ConfluxOrbit] listeningCadence tokens:', event.listeningCadence.tokens);
        }
        applyEventRef.current(event, source);
      },
      // Handle TTS audio playback via Web Audio API
      (audioData) => {
        console.log('[ConfluxOrbit] TTS audio received');
        playTTS(audioData.audio_base64, audioData.sample_rate);
      }
    ).then((bridge) => {
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
      // Trigger a pulsing ripple effect to indicate the fairy is ready
      conflux.triggerPulse(5, 'PTT Engaged');
    };
    const handlePTTEnd = () => {
      // Don't go idle yet — stay in listen mode while transcription is processing.
      // The 'conflux-transcription-done' event will handle the final reset.
      console.log('[ConfluxOrbit] PTT End - keeping listen mode during transcription');
    };
    const handleTranscriptionDone = () => {
      console.log('[ConfluxOrbit] Transcription done - staying in listen mode, waiting for thinking state');
      conflux.triggerPulse(10, 'Transcription complete');
      // Don't reset to idle - the 'conflux:state' Thinking event will handle the transition
      // If Thinking state doesn't arrive, stay in listen until TTS starts
    };

    window.addEventListener('push-to-talk-start', handlePTTStart);
    window.addEventListener('push-to-talk-end', handlePTTEnd);
    window.addEventListener('conflux-transcription-done', handleTranscriptionDone);
    window.addEventListener('conflux-thinking', (e: any) => {
      console.log('[ConfluxOrbit] Thinking...', e.detail?.text);
      conflux.setMode('focus', 'backend', 'Thinking...');
    });

    return () => {
      window.removeEventListener('push-to-talk-start', handlePTTStart);
      window.removeEventListener('push-to-talk-end', handlePTTEnd);
      window.removeEventListener('conflux-transcription-done', handleTranscriptionDone);
      window.removeEventListener('conflux-thinking', () => {});
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

  // Builder Mode state: detect user typing/interaction
  const [isBuilderMode, setIsBuilderMode] = useState(false);
  const builderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Builder Mode: currently disabled (removed keydown/click listeners)

  // App Awareness: monitor immersiveView and trigger routePulse with specific lobes
  useEffect(() => {
    if (!immersiveView) {
      // Return to idle when leaving an app - reset to default
      console.log('[ConfluxOrbit] Leaving app, resetting to default palette');
      conflux.setMode('idle', 'manual', 'Ready');
      return;
    }

    const lobe = APP_LOBE_MAP[immersiveView];
    if (lobe) {
      console.log(`[ConfluxOrbit] App changed to ${immersiveView}, triggering lobe: ${lobe}`);
      // Pass lobe as the 'lobe' property for single-lobe targeting
      conflux.routePulse({ lobe: lobe as any }, `Navigating to ${immersiveView}`);
    }
    
    // Set app-specific palette
    // Map view name to valid palette name
    const paletteMap: Record<string, string> = {
      budget: 'budget',
      kitchen: 'kitchen',
      life: 'life',
      dreams: 'dreams',
      agents: 'agents',
      feed: 'feed',
      games: 'games',
      marketplace: 'marketplace',
      settings: 'settings',
      studio: 'studio',
      vault: 'vault',
      echo: 'echo',
      home: 'home',
      dashboard: 'dashboard',
      google: 'google',
      'api-dashboard': 'api-dashboard'
    };
    
    const paletteName = paletteMap[immersiveView] || 'dashboard';
    console.log(`[ConfluxOrbit] Setting app palette for: ${immersiveView} -> ${paletteName}`);
    conflux.setAppPaletteMode(paletteName as any);
    
    // Log the effective palette for debugging
    console.log(`[ConfluxOrbit] Effective palette:`, conflux.effectivePalette);
  }, [immersiveView]);

  // Logic for "Fairy" positioning with Magnetic Zones
  let targetX = dimensions.width - 350;
  let targetY = dimensions.height - 350;
  let scale = 1;

  const isSpeaking = conflux.mode === 'speak';
  const isThinking = conflux.mode === 'focus';

  if (isPushToTalkActive || isSpeaking) {
    // When listening (PTT) or Speaking, fly to the center and grow
    targetX = dimensions.width / 2 - 250;
    targetY = dimensions.height / 2 - 250;
    scale = 1.8;
  } else if (isThinking) {
    // When thinking, fly to center and use larger scale for visibility
    targetX = dimensions.width / 2 - 250;
    targetY = dimensions.height / 2 - 250;
    scale = 1.6;
  } else if (chatOpen) {
    // Retreat behavior: move to bottom-left corner when chat is open
    targetX = (dimensions.width - 300) * 0.05;
    targetY = (dimensions.height - 300) * 0.9;
    scale = 0.6;
  } else if (immersiveView) {
    // Magnetic Zones: use pre-defined coordinates for each app view
    const zone = MAGNETIC_ZONES[immersiveView];
    if (zone) {
      targetX = (dimensions.width - 300) * zone.x;
      targetY = (dimensions.height - 300) * zone.y;
      scale = zone.scale ?? 0.7;
    } else {
      // Fallback for unknown views
      targetX = dimensions.width - 350;
      targetY = 50;
      scale = 0.75;
    }
  } else if (view === 'dashboard') {
    // Idle state: hovering near the dock (ConfluxBarV2)
    targetX = dimensions.width - 320;
    targetY = dimensions.height - 320;
    scale = 1;
  }

  // Builder Mode overrides: Gold pulse, slightly larger, higher z-index
  if (isBuilderMode) {
    scale = Math.max(scale, 0.85);
  }

  // Fly-Over Animation: curved bezier flight path using spring physics
  // Instead of linear interpolation, use a spring with bezier offset for organic movement
  const getTransitionConfig = () => {
    const isBuilderModeTransition = isBuilderMode;
    
    return {
      type: 'spring' as const,
      stiffness: isBuilderModeTransition ? 120 : 80, // Snappier in builder mode
      damping: isBuilderModeTransition ? 20 : 18,
      mass: isBuilderModeTransition ? 0.4 : 0.6,    // Lighter feels more responsive
      bounce: 0.3,
      duration: 0.8,
    };
  };

  // Add bezier offset for curved flight path
  const [bezierOffset, setBezierOffset] = useState({ x: 0, y: 0 });
  const prevImmersiveViewRef = useRef(immersiveView);

  useEffect(() => {
    if (immersiveView !== prevImmersiveViewRef.current && immersiveView) {
      // Trigger a brief "fly-over" curve when entering a new app
      const curveDirection = Math.random() > 0.5 ? 1 : -1;
      setBezierOffset({ x: 100 * curveDirection, y: -80 });
      
      const timer = setTimeout(() => {
        setBezierOffset({ x: 0, y: 0 });
      }, 600);
      
      return () => clearTimeout(timer);
    }
    prevImmersiveViewRef.current = immersiveView;
  }, [immersiveView]);

  if (dimensions.width === 0) return null;

  // Builder Mode: apply gold visual indicator via filter
  // Builder Mode: currently disabled - always return none
  const builderModeFilter = 'none';

  return (
    <>
      <motion.div
        initial={false}
        animate={{ 
          x: targetX + bezierOffset.x, 
          y: targetY + bezierOffset.y, 
          scale,
          filter: builderModeFilter,
        }}
        transition={getTransitionConfig()}
        style={{
          position: 'fixed',
          zIndex: isBuilderMode ? 110 : 100, // Higher z-index in builder mode
          pointerEvents: 'none',
          top: 0,
          left: 0,
        }}
      >
        <ConfluxPresence
          command={conflux.command}
          pulseImpulse={conflux.pulseImpulse}
          pulseEvent={conflux.pulseEvent}
          transparent={conflux.transparent}
          effectivePalette={conflux.effectivePalette}
          style={{ width: 300, height: 300 }}
        />
      </motion.div>
      

    </>
  );
}
