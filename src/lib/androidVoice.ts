// Android Voice Input — getUserMedia + MediaRecorder
// Records audio in the WebView, then sends to Tauri backend for STT.
// This replaces the broken SpeechRecognition API approach.
//
// getUserMedia triggers the standard onPermissionRequest flow in
// RustWebChromeClient, which properly handles RECORD_AUDIO runtime permission.
// SpeechRecognition bypassed this and always threw "not-allowed".

const isAndroidPlatform = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

// Native logger — calls Android's Log.d() via JavaScriptInterface.
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

let mediaStream: MediaStream | null = null;
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let isRecordingActive = false;

/** Start recording audio via getUserMedia. Triggers permission dialog if needed. */
export async function startListening(): Promise<void> {
  if (isRecordingActive) {
    nativeLog('AndroidVoice', 'Already recording — stopping first');
    await stopListening();
  }

  nativeLog('AndroidVoice', 'Requesting microphone via getUserMedia...');
  audioChunks = [];

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    nativeLog('AndroidVoice', 'getUserMedia granted — mic stream active');
  } catch (err: any) {
    nativeError('AndroidVoice', 'getUserMedia failed:', err.name, err.message);
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      throw new Error('Microphone permission denied — grant it in Android Settings → Apps → Conflux → Permissions');
    }
    throw new Error(`getUserMedia failed: ${err.name}`);
  }

  // Prefer webm/opus if available, fall back to whatever the browser supports
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : '';  // Let the browser pick

  nativeLog('AndroidVoice', 'Using MIME type:', mimeType || '(browser default)');

  mediaRecorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined);

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      audioChunks.push(e.data);
      nativeLog('AndroidVoice', 'Audio chunk:', e.data.size, 'bytes');
    }
  };

  mediaRecorder.onstop = () => {
    nativeLog('AndroidVoice', 'MediaRecorder stopped. Chunks:', audioChunks.length);
    isRecordingActive = false;
  };

  mediaRecorder.onerror = (e) => {
    nativeError('AndroidVoice', 'MediaRecorder error:', e);
    isRecordingActive = false;
  };

  mediaRecorder.start(250); // Collect chunks every 250ms
  isRecordingActive = true;
  nativeLog('AndroidVoice', 'MediaRecorder started');
}

/** Stop recording and return audio blob. */
export async function stopListening(): Promise<Blob | null> {
  nativeLog('AndroidVoice', 'stopListening called. isRecording:', isRecordingActive);

  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    nativeLog('AndroidVoice', 'MediaRecorder already inactive');
    cleanup();
    return null;
  }

  return new Promise<Blob | null>((resolve) => {
    const timeout = setTimeout(() => {
      nativeLog('AndroidVoice', 'Stop timeout — forcing cleanup');
      cleanup();
      resolve(null);
    }, 3000);

    mediaRecorder!.onstop = () => {
      clearTimeout(timeout);
      const blob = new Blob(audioChunks, { type: mediaRecorder?.mimeType || 'audio/webm' });
      nativeLog('AndroidVoice', 'Recording complete. Blob size:', blob.size, 'bytes');
      cleanup();
      resolve(blob);
    };

    mediaRecorder!.stop();
  });
}

/** Cancel recording without returning audio. */
export function cancel(): void {
  nativeLog('AndroidVoice', 'cancel() called');
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try { mediaRecorder.stop(); } catch {}
  }
  cleanup();
}

/** Clean up media resources. */
function cleanup() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => {
      try { t.stop(); } catch {}
    });
    mediaStream = null;
  }
  mediaRecorder = null;
  audioChunks = [];
  isRecordingActive = false;
}

/** Check if getUserMedia is available. */
export function isAvailable(): boolean {
  return typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia === 'function';
}

/** Whether we're currently recording. */
export function isListening(): boolean {
  return isRecordingActive;
}

/** Get accumulated audio chunks (for debugging). */
export function getChunks(): Blob[] {
  return [...audioChunks];
}

/** Platform check — true if running on Android. */
export { isAndroidPlatform as isAndroid };
