// Android Voice Input — WebView SpeechRecognition API
// Uses the browser's built-in speech recognition on Android.
// No native audio code needed — the WebView handles everything.

const isAndroidPlatform = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

type VoiceCallback = (text: string) => void;
type ErrorCallback = (error: string) => void;

let recognition: any = null;
let isRecognizing = false;
let transcriptBuffer = '';
let onResultCallback: VoiceCallback | null = null;
let onErrorCallback: ErrorCallback | null = null;

function getSpeechRecognition(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

function ensureRecognition(): boolean {
  if (recognition) return true;

  const SR = getSpeechRecognition();
  if (!SR) {
    console.error('[AndroidVoice] SpeechRecognition API not available');
    return false;
  }

  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    let finalText = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalText += event.results[i][0].transcript;
      }
    }
    if (finalText) {
      transcriptBuffer += (transcriptBuffer ? ' ' : '') + finalText.trim();
      console.log('[AndroidVoice] Final transcript chunk:', finalText.trim());
      if (onResultCallback) onResultCallback(transcriptBuffer);
    }
  };

  recognition.onerror = (event: any) => {
    console.error('[AndroidVoice] SpeechRecognition error:', event.error);
    // 'no-speech' and 'aborted' are normal stop conditions
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      if (onErrorCallback) onErrorCallback(event.error);
    }
  };

  recognition.onend = () => {
    isRecognizing = false;
    console.log('[AndroidVoice] SpeechRecognition ended');
  };

  recognition.onspeechstart = () => {
    console.log('[AndroidVoice] Speech detected');
  };

  return true;
}

/** Start listening. Returns immediately. */
export async function startListening(): Promise<void> {
  if (!ensureRecognition()) {
    throw new Error('SpeechRecognition API not available');
  }

  // Stop any existing session before starting a new one
  if (isRecognizing) {
    try { recognition.stop(); } catch {}
    isRecognizing = false;
  }

  transcriptBuffer = '';

  return new Promise<void>((resolve, reject) => {
    try {
      // Set up one-time start handler
      const onStart = () => {
        isRecognizing = true;
        console.log('[AndroidVoice] SpeechRecognition started');
        recognition.removeEventListener('start', onStart);
        resolve();
      };

      const onError = (event: any) => {
        recognition.removeEventListener('error', onError);
        // Only reject on real errors, not 'aborted' from stop()
        if (event.error !== 'aborted') {
          reject(new Error(`SpeechRecognition start failed: ${event.error}`));
        }
      };

      recognition.addEventListener('start', onStart);
      recognition.addEventListener('error', onError);

      // Clean up error handler after 5s (in case it never fires)
      setTimeout(() => {
        recognition.removeEventListener('error', onError);
      }, 5000);

      recognition.start();
    } catch (err) {
      reject(err);
    }
  });
}

/** Stop listening. Transcript is available via getTranscript() after a short delay. */
export async function stopListening(): Promise<void> {
  if (!recognition || !isRecognizing) {
    console.log('[AndroidVoice] stopListening called but not recognizing');
    return;
  }

  return new Promise<void>((resolve) => {
    const onEnd = () => {
      isRecognizing = false;
      recognition.removeEventListener('end', onEnd);
      console.log('[AndroidVoice] Stopped. Buffer:', transcriptBuffer);
      resolve();
    };

    recognition.addEventListener('end', onEnd);

    try {
      recognition.stop();
    } catch {
      isRecognizing = false;
      resolve();
    }

    // Safety timeout — resolve even if onend doesn't fire
    setTimeout(() => {
      recognition.removeEventListener('end', onEnd);
      isRecognizing = false;
      resolve();
    }, 2000);
  });
}

/** Cancel listening without getting a transcript. */
export function cancel(): void {
  if (!recognition) return;
  try {
    recognition.abort();
  } catch {}
  isRecognizing = false;
  transcriptBuffer = '';
}

/** Get the accumulated transcript from the current/last session. */
export function getTranscript(): string {
  return transcriptBuffer;
}

/** Register a callback for transcript updates (called on each final result). */
export function onResult(callback: VoiceCallback): void {
  onResultCallback = callback;
}

/** Register a callback for errors. */
export function onError(callback: ErrorCallback): void {
  onErrorCallback = callback;
}

/** Check if SpeechRecognition is available. */
export function isAvailable(): boolean {
  return getSpeechRecognition() !== null;
}

/** Whether we're currently listening. */
export function isListening(): boolean {
  return isRecognizing;
}

/** Platform check — true if running on Android. */
export { isAndroidPlatform as isAndroid };
