// Conflux Home — Audio Player Hook
// ElevenLabs TTS playback via tts_speak Tauri command

import { useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

let _audioCtx: AudioContext | null = null;
let _activeSource: AudioBufferSourceNode | null = null;

const ECHO_VOICE_ID = 'EST9Ui6982FZPSi7gCHi';

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
  const [speaking, setSpeaking] = useState(false);
  const speakingRef = useRef(false);
  const currentTextRef = useRef<string>('');

  const speak = useCallback(async (text: string, voiceId = ECHO_VOICE_ID) => {
    // Stop any current speech first
    stopAudio();
    setSpeaking(true);
    speakingRef.current = true;
    currentTextRef.current = text;

    try {
      const result = await invoke<{ audio_base64: string }>('tts_speak', {
        text,
        voice: voiceId,
      });

      // Check we're still supposed to be speaking (user might have hit stop)
      if (!speakingRef.current) return;

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
        if (speakingRef.current) {
          setSpeaking(false);
          speakingRef.current = false;
        }
      };
      source.start(0);
    } catch (err) {
      console.error('TTS playback error:', err);
      setSpeaking(false);
      speakingRef.current = false;
    }
  }, []);

  const stop = useCallback(() => {
    stopAudio();
    setSpeaking(false);
    speakingRef.current = false;
  }, []);

  return { speak, stop, speaking };
}