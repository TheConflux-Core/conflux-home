// Conflux Home — Audio Player Hook
// ElevenLabs TTS playback via tts_speak Tauri command

import { useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

let _audioCtx: AudioContext | null = null;
let _activeSource: AudioBufferSourceNode | null = null;

export const ECHO_VOICE_ID = 'EST9Ui6982FZPSi7gCHi';
export const HEARTH_VOICE_ID = 'W7iR5kTNHozpIl2Jqq15';

function getAudioCtx(): AudioContext {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

function stopAudio() {
  try { _activeSource?.stop(); } catch (_) { /* already stopped */ }
  _activeSource = null;
}

export function useAudioPlayer() {
  // playingId = which message id is currently being spoken (for per-button highlight)
  const [playingId, setPlayingId] = useState<string | null>(null);
  const playingIdRef = useRef<string | null>(null);

  const speak = useCallback(async (text: string, msgId: string, voiceId = ECHO_VOICE_ID) => {
    // Stop any current speech first
    stopAudio();
    setPlayingId(msgId);
    playingIdRef.current = msgId;

    try {
      const result = await invoke<{ audio_base64: string }>('tts_speak', {
        text,
        voice: voiceId,
      });

      // Check we're still supposed to be speaking (user might have hit stop)
      if (playingIdRef.current !== msgId) return;

      const ctx = getAudioCtx();
      const binaryString = atob(result.audio_base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const buffer = await ctx.decodeAudioData(bytes.buffer);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      _activeSource = source;

      source.onended = () => {
        _activeSource = null;
        if (playingIdRef.current === msgId) {
          setPlayingId(null);
          playingIdRef.current = null;
        }
      };
      source.start(0);
    } catch (err) {
      console.error('TTS playback error:', err);
      if (playingIdRef.current === msgId) {
        setPlayingId(null);
        playingIdRef.current = null;
      }
    }
  }, []);

  const stop = useCallback(() => {
    stopAudio();
    setPlayingId(null);
    playingIdRef.current = null;
  }, []);

  // isPlaying = true if anything is currently playing (for stop-all button)
  const isPlaying = playingId !== null;

  return { speak, stop, playingId, isPlaying };
}