// Android Voice Input — WebView SpeechRecognition API
// Uses the browser's built-in speech recognition on Android.
// Falls back to getUserMedia() + MediaRecorder if SpeechRecognition is unavailable.
//
// KEY CONSTRAINT: recognition.start() MUST be called synchronously within a
// user gesture (click/tap). Any async gap (setTimeout, await) breaks the
// gesture chain and causes "not-allowed" errors on Android WebView.

const isAndroidPlatform = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

// Native logger — calls Android's Log.d() via JavaScriptInterface.
// Survives release builds where console.log is stripped by bundler.
function nativeLog(tag: string, msg: string, ...args: any[]) {
  const fullMsg = args.length > 0 ? `${msg} ${args.join(' ')}` : msg;
  try { (window as any).AndroidLog?.log(tag, fullMsg); } catch {}
  try { console.log(`[${tag}]`, fullMsg); } catch {}
}
function nativeError(tag: string, msg: string, ...args: any[]) {
  const fullMsg = args.length > 0 ? `${msg} ${args.join(' ')}` : msg;
  try { (window as any).AndroidLog?.error(tag, fullMsg); } catch {}
  try { console.error(`[${tag}]`, fullMsg); } catch {}
}

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
    nativeError('AndroidVoice', 'SpeechRecognition API not available');
    nativeError('AndroidVoice', 'UserAgent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown');
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
      nativeLog('AndroidVoice', 'Final transcript chunk:', finalText.trim());
      if (onResultCallback) onResultCallback(transcriptBuffer);
    }
  };

  recognition.onerror = (event: any) => {
    nativeError('AndroidVoice', 'SpeechRecognition error:', event.error);

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
    nativeLog('AndroidVoice', 'SpeechRecognition ended, isRecognizing was:', isRecognizing);
    isRecognizing = false;
  };

  recognition.onspeechstart = () => {
    nativeLog('AndroidVoice', 'Speech detected');
  };

  recognition.onspeechend = () => {
    nativeLog('AndroidVoice', 'Speech ended');
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
    nativeLog('AndroidVoice', 'Stopping previous session before starting new one');
    try { recognition.stop(); } catch (e) { nativeLog('AndroidVoice', '[WARN] stop before start failed:', e); }
    isRecognizing = false;
  }

  transcriptBuffer = '';

  return new Promise<void>((resolve, reject) => {
    try {
      // Set up one-time start handler
      const onStart = () => {
        isRecognizing = true;
        nativeLog('AndroidVoice', 'SpeechRecognition started successfully');
        recognition.removeEventListener('start', onStart);
        recognition.removeEventListener('error', onError);
        resolve();
      };

      const onError = (event: any) => {
        recognition.removeEventListener('start', onStart);
        recognition.removeEventListener('error', onError);

        if (event.error === 'aborted') {
          // This can happen if stop() was called immediately — not a real error
          nativeLog('AndroidVoice', 'Start aborted (likely stop() called)');
          return;
        }

        const msg = event.error === 'not-allowed'
          ? 'Microphone permission denied — check Android app permissions'
          : `SpeechRecognition start failed: ${event.error}`;
        nativeError('AndroidVoice', msg);
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
          nativeError('AndroidVoice', msg);
          reject(new Error(msg));
        }
      }, 10000);

      // IMPORTANT: This must be called synchronously from the user gesture.
      // No await, no setTimeout before this line.
      recognition.start();
    } catch (err) {
      nativeError('AndroidVoice', 'recognition.start() threw:', err);
      isRecognizing = false;
      reject(err);
    }
  });
}

/** Stop listening. Transcript is available via getTranscript() after a short delay. */
export async function stopListening(): Promise<void> {
  if (!recognition) {
    nativeLog('AndroidVoice', 'stopListening called but no recognition instance');
    return;
  }

  if (!isRecognizing) {
    nativeLog('AndroidVoice', 'stopListening called but not recognizing');
    return;
  }

  return new Promise<void>((resolve) => {
    const onEnd = () => {
      isRecognizing = false;
      recognition.removeEventListener('end', onEnd);
      nativeLog('AndroidVoice', 'Stopped. Buffer:', transcriptBuffer);
      resolve();
    };

    recognition.addEventListener('end', onEnd);

    try {
      recognition.stop();
    } catch (e) {
      nativeLog('AndroidVoice', '[WARN] recognition.stop() threw:', e);
      isRecognizing = false;
      recognition.removeEventListener('end', onEnd);
      resolve();
      return;
    }

    // Safety timeout — resolve even if onend doesn't fire
    setTimeout(() => {
      if (isRecognizing) {
        nativeLog('AndroidVoice', '[WARN] stopListening safety timeout — forcing stop');
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
  nativeLog('AndroidVoice', 'cancel() called');
  try {
    recognition.abort();
  } catch (e) {
    nativeLog('AndroidVoice', '[WARN] abort() threw:', e);
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
