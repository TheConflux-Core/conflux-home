// Conflux Home — TTS Hook
// Uses browser SpeechSynthesis for free, pluggable to OpenAI TTS later.

import { useState, useCallback, useRef } from 'react';

export interface TTSOptions {
  rate?: number;       // 0.1 to 10, default 1
  pitch?: number;      // 0 to 2, default 1
  volume?: number;     // 0 to 1, default 1
  voice?: SpeechSynthesisVoice | null;
}

const DEFAULT_OPTIONS: TTSOptions = {
  rate: 0.95,   // slightly slower feels more natural
  pitch: 1.0,
  volume: 0.8,
};

export function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(
    typeof window !== 'undefined' && 'speechSynthesis' in window
  );
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Get available voices (loaded async in some browsers)
  const getVoices = useCallback((): SpeechSynthesisVoice[] => {
    if (!supported) return [];
    return window.speechSynthesis.getVoices();
  }, [supported]);

  // Pick the best available voice for English
  const getBestVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = getVoices();
    if (voices.length === 0) return null;

    // Prefer Google/Microsoft voices (better quality)
    const premium = voices.find(v =>
      (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Samantha'))
      && v.lang.startsWith('en')
    );
    if (premium) return premium;

    // Fallback to any English voice
    return voices.find(v => v.lang.startsWith('en')) || voices[0];
  }, [getVoices]);

  // Speak text
  const speak = useCallback((text: string, options?: TTSOptions) => {
    if (!supported) return;

    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const opts = { ...DEFAULT_OPTIONS, ...options };

    utterance.rate = opts.rate!;
    utterance.pitch = opts.pitch!;
    utterance.volume = opts.volume!;
    utterance.voice = opts.voice || getBestVoice();

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [supported, getBestVoice]);

  // Stop speaking
  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return {
    speak,
    stop,
    speaking,
    supported,
    getVoices,
    getBestVoice,
  };
}
