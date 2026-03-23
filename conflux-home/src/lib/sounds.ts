// Web Audio API sound system for Conflux Home onboarding
// All sounds are synthesized — no external audio files

// ---------------------------------------------------------------------------
// Audio Context (lazy singleton)
// ---------------------------------------------------------------------------

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

// ---------------------------------------------------------------------------
// Preferences (localStorage)
// ---------------------------------------------------------------------------

const VOLUME_KEY = 'conflux-sound-volume';
const ENABLED_KEY = 'conflux-sound-enabled';

function getMasterVolume(): number {
  if (typeof window === 'undefined') return 0.5;
  const stored = localStorage.getItem(VOLUME_KEY);
  if (stored === null) return 0.5;
  const v = parseFloat(stored);
  return isNaN(v) ? 0.5 : Math.min(1, Math.max(0, v));
}

export function setMasterVolume(level: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VOLUME_KEY, String(Math.min(1, Math.max(0, level))));
}

export function muteAllSounds(): void {
  setMasterVolume(0);
}

export function unmuteAllSounds(): void {
  setMasterVolume(0.5);
}

export function getSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ENABLED_KEY) !== 'false';
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ENABLED_KEY, String(enabled));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function effectiveVolume(base: number): number {
  return base * getMasterVolume();
}

// ---------------------------------------------------------------------------
// Sound 1: Heartbeat Pulse
// ---------------------------------------------------------------------------

export function playHeartbeatPulse(): void {
  if (!getSoundEnabled()) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const vol = effectiveVolume(0.15);

  // Gain node for master envelope
  const master = ctx.createGain();
  master.gain.setValueAtTime(vol, now);
  master.connect(ctx.destination);

  // "Lub" — 60 Hz
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(60, now);

  const gain1 = ctx.createGain();
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(1, now + 0.01); // quick attack
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1); // slow decay

  osc1.connect(gain1);
  gain1.connect(master);
  osc1.start(now);
  osc1.stop(now + 0.12);

  // "Dub" — 50 Hz, 150ms later
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(50, now + 0.15);

  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(0, now + 0.15);
  gain2.gain.linearRampToValueAtTime(0.8, now + 0.16);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  osc2.connect(gain2);
  gain2.connect(master);
  osc2.start(now + 0.15);
  osc2.stop(now + 0.27);
}

// ---------------------------------------------------------------------------
// Sound 2: Boot-Up Tone
// ---------------------------------------------------------------------------

export function playBootUpTone(): void {
  if (!getSoundEnabled()) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const vol = effectiveVolume(0.1);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.8);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.65);
  gain.gain.linearRampToValueAtTime(0, now + 0.8);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.85);
}

// ---------------------------------------------------------------------------
// Sound 3: Agent Wake
// ---------------------------------------------------------------------------

export function playAgentWake(agentIndex: number): void {
  if (!getSoundEnabled()) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const vol = effectiveVolume(0.08);
  const freq = 300 + agentIndex * 50;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.015); // quick attack
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2); // quick decay

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.22);
}

// ---------------------------------------------------------------------------
// Sound 4: Welcome Chime
// ---------------------------------------------------------------------------

export function playWelcomeChime(): void {
  if (!getSoundEnabled()) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const vol = effectiveVolume(0.12);

  const notes = [523, 659, 784]; // C5, E5, G5

  notes.forEach((freq, i) => {
    const startAt = now + i * 0.1;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startAt);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(vol, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + 0.42);
  });
}

// ---------------------------------------------------------------------------
// Sound 5: Ambient Hum
// ---------------------------------------------------------------------------

export function startAmbientHum(): { stop: () => void } {
  if (!getSoundEnabled()) {
    return { stop: () => {} };
  }

  const ctx = getAudioContext();
  const vol = effectiveVolume(0.03);

  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(60, ctx.currentTime);

  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(120, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, ctx.currentTime);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start();
  osc2.start();

  return {
    stop: () => {
      const t = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc1.stop(t + 0.55);
      osc2.stop(t + 0.55);
    },
  };
}

// ---------------------------------------------------------------------------
// Sound 6: UI Click
// ---------------------------------------------------------------------------

export function playUIClick(): void {
  if (!getSoundEnabled()) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const vol = effectiveVolume(0.05);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1000, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.06);
}
