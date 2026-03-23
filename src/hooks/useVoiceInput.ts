// Conflux Home — Voice Input Hook
// Uses browser SpeechRecognition for hands-free input.

import { useState, useCallback, useRef, useEffect } from 'react';

interface VoiceInputOptions {
  language?: string;     // BCP 47 language tag, default 'en-US'
  continuous?: boolean;  // keep listening after result
  interimResults?: boolean; // show results while still speaking
}

export function useVoiceInput(options?: VoiceInputOptions) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SpeechRecognition);
  }, []);

  const startListening = useCallback(() => {
    if (!supported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = options?.language ?? 'en-US';
    recognition.continuous = options?.continuous ?? false;
    recognition.interimResults = options?.interimResults ?? true;

    recognition.onstart = () => {
      setListening(true);
      setError(null);
      finalTranscriptRef.current = '';
      setTranscript('');
      setInterimTranscript('');
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) {
        finalTranscriptRef.current += final;
        setTranscript(finalTranscriptRef.current);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      setError(event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [supported, options?.language, options?.continuous, options?.interimResults]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }, [listening, startListening, stopListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
  }, []);

  return {
    listening,
    transcript,
    interimTranscript,
    supported,
    error,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
  };
}
