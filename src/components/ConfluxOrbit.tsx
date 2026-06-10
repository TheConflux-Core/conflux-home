/**
 * ConfluxOrbit — Invisible Brain Layer
 *
 * Manages the ConfluxController state machine and Tauri event bridge.
 * Renders NO visual elements — all visuals are handled by separate components:
 * - ConfluxStatusOrb (TopBar)
 * - DockGlow (Dock)
 * - VoiceFAB (App level)
 * - NudgeToast (App level)
 *
 * This separation keeps the intelligence layer stable while visual components
 * can be swapped without affecting the brain.
 */

import { useConfluxController, attachTauriConfluxListeners, ConfluxContext } from './conflux';
import type { ConfluxTauriListen } from './conflux';
import { View } from '../types';
import { useEffect, useRef, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';

// App-to-lobe mapping for routePulse
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

interface ConfluxOrbitProps {
  view: View;
  immersiveView: View | null;
  chatOpen: boolean;
  voiceChatOpen: boolean;
  isPushToTalkActive: boolean;
  children: React.ReactNode;
}

export default function ConfluxOrbit({
  view,
  immersiveView,
  chatOpen,
  voiceChatOpen,
  isPushToTalkActive,
  children,
}: ConfluxOrbitProps) {
  const conflux = useConfluxController({
    initialMode: 'idle',
    initialTransparent: true,
    initialStatus: 'System Online',
  });

  // ── TTS Playback ──────────────────────────────────────────────────────
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const playTTS = useCallback((base64: string, sampleRate: number) => {
    try { activeSourceRef.current?.stop(); } catch (_) { /* already stopped */ }
    activeSourceRef.current = null;

    // Recreate AudioContext if closed (happens on Android after getUserMedia/PTT)
    if (audioContextRef.current && audioContextRef.current.state === 'closed') {
      audioContextRef.current = null;
    }
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error('[ConfluxOrbit] AudioContext creation failed:', e);
        return;
      }
    }
    const ctx = audioContextRef.current;
    // Resume if suspended (common on Android after user interaction)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    ctx.decodeAudioData(bytes.buffer).then((audioBuffer) => {
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = 1.0;
      source.connect(ctx.destination);
      activeSourceRef.current = source;
      source.start(0);

      conflux.setMode('speak', 'backend', 'Speaking...');
      console.log('[ConfluxOrbit] Playing TTS audio');

      source.onended = () => {
        console.log('[ConfluxOrbit] TTS finished, returning to idle');
        activeSourceRef.current = null;
        conflux.setMode('idle', 'backend', 'Ready');
      };
    }).catch(e => {
      console.error('[ConfluxOrbit] TTS Decode Error:', e);
      conflux.setMode('idle', 'backend', 'Ready');
    });
  }, []);

  // ── Tauri Event Bridge ────────────────────────────────────────────────
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
        console.log('[ConfluxOrbit] conflux:state event received:', JSON.stringify(event));

        const stateEvent = event as any;
        if (stateEvent.state) {
          console.log('[ConfluxOrbit] State transition:', stateEvent.state, 'Source:', stateEvent.source || 'unknown');
          switch (stateEvent.state) {
            case 'Listening':
              conflux.setMode('listen', 'backend', 'Listening...');
              break;
            case 'Thinking':
              conflux.setMode('focus', 'backend', 'Thinking...');
              const pulseIntervalId = setInterval(() => {
                if (conflux.mode === 'focus') {
                  conflux.triggerPulse(15, 'Thinking...');
                } else {
                  clearInterval(pulseIntervalId);
                }
              }, 500);
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

        applyEventRef.current(event, source);
      },
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

  // ── Push-to-Talk Events ──────────────────────────────────────────────
  useEffect(() => {
    const handlePTTStart = () => {
      console.log('[ConfluxOrbit] PTT Start - switching to listen mode');
      conflux.setMode('listen', 'manual', 'Listening...');
      conflux.triggerPulse(5, 'PTT Engaged');
    };
    const handlePTTEnd = () => {
      console.log('[ConfluxOrbit] PTT End - keeping listen mode during transcription');
    };
    const handleTranscriptionDone = () => {
      console.log('[ConfluxOrbit] Transcription done - staying in listen mode');
      conflux.triggerPulse(10, 'Transcription complete');
    };
    const handleForceIdle = () => {
      console.log('[ConfluxOrbit] Force idle — PTT cancelled');
      conflux.setMode('idle', 'manual', 'Ready');
    };

    window.addEventListener('push-to-talk-start', handlePTTStart);
    window.addEventListener('push-to-talk-end', handlePTTEnd);
    window.addEventListener('conflux-transcription-done', handleTranscriptionDone);
    window.addEventListener('conflux-force-idle', handleForceIdle);
    window.addEventListener('conflux-thinking', (e: any) => {
      console.log('[ConfluxOrbit] Thinking...', e.detail?.text);
      conflux.setMode('focus', 'backend', 'Thinking...');
    });

    return () => {
      window.removeEventListener('push-to-talk-start', handlePTTStart);
      window.removeEventListener('push-to-talk-end', handlePTTEnd);
      window.removeEventListener('conflux-transcription-done', handleTranscriptionDone);
      window.removeEventListener('conflux-force-idle', handleForceIdle);
      window.removeEventListener('conflux-thinking', () => {});
    };
  }, []);

  // ── App Awareness (palette + lobe routing) ───────────────────────────
  useEffect(() => {
    if (!immersiveView) {
      console.log('[ConfluxOrbit] Leaving app, resetting to default palette');
      conflux.setMode('idle', 'manual', 'Ready');
      return;
    }

    const lobe = APP_LOBE_MAP[immersiveView];
    if (lobe) {
      console.log(`[ConfluxOrbit] App changed to ${immersiveView}, triggering lobe: ${lobe}`);
      conflux.routePulse({ lobe: lobe as any }, `Navigating to ${immersiveView}`);
    }

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
      'api-dashboard': 'api-dashboard',
    };

    const paletteName = paletteMap[immersiveView] || 'dashboard';
    console.log(`[ConfluxOrbit] Setting app palette for: ${immersiveView} -> ${paletteName}`);
    conflux.setAppPaletteMode(paletteName as any);
  }, [immersiveView]);

  // ── Fairy Expression (drives StatusOrb visual state) ─────────────────
  useEffect(() => {
    if (voiceChatOpen) { conflux.setMode('listen', 'manual', 'Voice chat active'); return; }
    if (chatOpen) { conflux.setMode('focus', 'manual', 'Chat open'); return; }
  }, [voiceChatOpen, chatOpen]);

  return (
    <ConfluxContext.Provider value={conflux}>
      {children}
    </ConfluxContext.Provider>
  );
}
