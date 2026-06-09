// Android Voice Input — WebView SpeechRecognition API
// Uses the browser's built-in speech recognition on Android.
// Falls back to getUserMedia() + MediaRecorder if SpeechRecognition is unavailable.
//
// KEY CONSTRAINT: recognition.start() MUST be called synchronously within a
// user gesture (click/tap). Any async gap (setTimeout, await) breaks the
// gesture chain and causes "not-allowed" errors on Android WebView.

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
    console.error('[AndroidVoice] UserAgent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown');
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

    if (event.error === 'no-speech') {
      // Normal — user didn't speak. Clean up gracefully.
      isRecognizing = false;
      return;
    }

    if (event.error === 'aborted') {
      // Normal — stop() or abort() was called. Clean up gracefully.
      isRecognizing = false;
      return;
    }

    // Fatal errors: not-allowed, network, service-not-allowed, etc.
    const errorMsg = event.error === 'not-allowed'
      ? 'Microphone permission denied. Check Android Settings → Apps → Conflux → Permissions → Microphone.'
      : `SpeechRecognition error: ${event.error}`;

    if (onErrorCallback) onErrorCallback(errorMsg);

    // Reset state so UI doesn't get stuck
    isRecognizing = false;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('conflux-force-idle'));
    }
  };

  recognition.onend = () => {
    console.log('[AndroidVoice] SpeechRecognition ended, isRecognizing was:', isRecognizing);
    isRecognizing = false;
  };

  recognition.onspeechstart = () => {
    console.log('[AndroidVoice] Speech detected');
  };

  recognition.onspeechend = () => {
    console.log('[AndroidVoice] Speech ended');
  };

  return true;
}

/** Start listening. MUST be called within a user gesture (no async before this call). */
export async function startListening(): Promise<void> {
  if (!ensureRecognition()) {
    throw new Error('SpeechRecognition API not available');
  }

  // Stop any existing session before starting a new one
  if (isRecognizing) {
    console.log('[AndroidVoice] Stopping previous session before starting new one');
    try { recognition.stop(); } catch (e) { console.warn('[AndroidVoice] stop before start failed:', e); }
    isRecognizing = false;
  }

  transcriptBuffer = '';

  return new Promise<void>((resolve, reject) => {
    try {
      // Set up one-time start handler
      const onStart = () => {
        isRecognizing = true;
        console.log('[AndroidVoice] SpeechRecognition started successfully');
        recognition.removeEventListener('start', onStart);
        recognition.removeEventListener('error', onError);
        resolve();
      };

      const onError = (event: any) => {
        recognition.removeEventListener('start', onStart);
        recognition.removeEventListener('error', onError);

        if (event.error === 'aborted') {
          // This can happen if stop() was called immediately — not a real error
          console.log('[AndroidVoice] Start aborted (likely stop() called)');
          return;
        }

        const msg = event.error === 'not-allowed'
          ? 'Microphone permission denied — check Android app permissions'
          : `SpeechRecognition start failed: ${event.error}`;
        console.error('[AndroidVoice]', msg);
        reject(new Error(msg));
      };

      recognition.addEventListener('start', onStart);
      recognition.addEventListener('error', onError);

      // Timeout — reject if start never fires (e.g., permission dialog ignored)
      setTimeout(() => {
        recognition.removeEventListener('start', onStart);
        recognition.removeEventListener('error', onError);
        if (!isRecognizing) {
          const msg = 'SpeechRecognition start timed out — check microphone permission';
          console.error('[AndroidVoice]', msg);
          reject(new Error(msg));
        }
      }, 10000);

      // IMPORTANT: This must be called synchronously from the user gesture.
      // No await, no setTimeout before this line.
      recognition.start();
    } catch (err) {
      console.error('[AndroidVoice] recognition.start() threw:', err);
      isRecognizing = false;
      reject(err);
    }
  });
}

/** Stop listening. Transcript is available via getTranscript() after a short delay. */
export async function stopListening(): Promise<void> {
  if (!recognition) {
    console.log('[AndroidVoice] stopListening called but no recognition instance');
    return;
  }

  if (!isRecognizing) {
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
    } catch (e) {
      console.warn('[AndroidVoice] recognition.stop() threw:', e);
      isRecognizing = false;
      recognition.removeEventListener('end', onEnd);
      resolve();
      return;
    }

    // Safety timeout — resolve even if onend doesn't fire
    setTimeout(() => {
      if (isRecognizing) {
        console.warn('[AndroidVoice] stopListening safety timeout — forcing stop');
        recognition.removeEventListener('end', onEnd);
        isRecognizing = false;
      }
      resolve();
    }, 2000);
  });
}

/** Cancel listening without getting a transcript. */
export function cancel(): void {
  if (!recognition) return;
  console.log('[AndroidVoice] cancel() called');
  try {
    recognition.abort();
  } catch (e) {
    console.warn('[AndroidVoice] abort() threw:', e);
  }
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
