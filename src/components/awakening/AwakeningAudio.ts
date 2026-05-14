/**
 * Awakening Audio Engine — Procedural Web Audio for The Awakening
 * 
 * All sounds are synthesized in real-time using Web Audio API.
 * No external files to load. Zero latency. Perfect sync with visuals.
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let droneOsc1: OscillatorNode | null = null;
let droneOsc2: OscillatorNode | null = null;
let droneGain: GainNode | null = null;
let padOscs: OscillatorNode[] = [];
let padGain: GainNode | null = null;
let isInitialized = false;

/** Create a gain node at a specific dB level */
function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

/** Create and connect an oscillator with gain */
function createOsc(
  type: OscillatorType,
  freq: number,
  gainDb: number,
  destination: AudioNode
): { osc: OscillatorNode; gain: GainNode } {
  const osc = ctx!.createOscillator();
  const gain = ctx!.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = dbToGain(gainDb);
  osc.connect(gain);
  gain.connect(destination);
  osc.start();
  return { osc, gain };
}

/** Initialize audio context (call on first user interaction) */
export function initAwakeningAudio(): void {
  if (isInitialized) return;
  
  ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Master output
  masterGain = ctx.createGain();
  masterGain.gain.value = 1.0;
  masterGain.connect(ctx.destination);
  
  isInitialized = true;
}

/** Ensure context is running (needed after user gesture) */
function ensureRunning(): void {
  if (ctx?.state === 'suspended') {
    ctx.resume();
  }
}

// ── Phase 1: Drone ──────────────────────────────────────────

/** Start the sub-bass drone (fades in over 2s) */
export function startDrone(): void {
  if (!ctx || !masterGain) return;
  ensureRunning();
  
  // Drone gain — starts silent, fades in
  droneGain = ctx.createGain();
  droneGain.gain.value = 0;
  droneGain.connect(masterGain);
  
  // Oscillator 1: fundamental at 60Hz (sine)
  const osc1 = createOsc('sine', 60, 0, droneGain);
  droneOsc1 = osc1.osc;
  
  // Oscillator 2: 3rd harmonic at 180Hz (sine, softer)
  const osc2 = createOsc('sine', 180, -12, droneGain);
  droneOsc2 = osc2.osc;
  
  // Fade in over 2 seconds (from -inf to -20dB)
  droneGain.gain.setValueAtTime(0, ctx.currentTime);
  droneGain.gain.linearRampToValueAtTime(dbToGain(-20), ctx.currentTime + 2);
}

/** Modulate drone pitch subtly (called during signal phase) */
export function modulateDrone(targetFreq: number): void {
  if (!droneOsc1 || !ctx) return;
  droneOsc1.frequency.linearRampToValueAtTime(targetFreq, ctx.currentTime + 2);
}

// ── Phase 2: Tendril Spark ──────────────────────────────────

/** Play a soft spark sound when a tendril spawns */
export function playTendrilSpark(): void {
  if (!ctx || !masterGain) return;
  ensureRunning();
  
  const now = ctx.currentTime;
  
  // High-frequency ping (1200-2400Hz randomized)
  const freq = 1200 + Math.random() * 1200;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  
  osc.type = 'sine';
  osc.frequency.value = freq;
  
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = 8;
  
  gain.gain.setValueAtTime(dbToGain(-35), now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  
  osc.start(now);
  osc.stop(now + 0.1);
}

// ── Phase 3: Breathing Pad ──────────────────────────────────

/** Start the ambient pad chord (F major: F3, A3, C4) */
export function startBreathPad(): void {
  if (!ctx || !masterGain) return;
  ensureRunning();
  
  padGain = ctx.createGain();
  padGain.gain.value = 0;
  padGain.connect(masterGain);
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  filter.Q.value = 0.5;
  filter.connect(padGain);
  
  // F major chord — very soft (pitched down 7 half-steps from C-E-G)
  const notes = [174.61, 220.00, 261.63]; // F3, A3, C4
  padOscs = notes.map(freq => {
    const osc = ctx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(filter);
    osc.start();
    return osc;
  });
  
  // Fade in
  padGain.gain.setValueAtTime(0, ctx.currentTime);
  padGain.gain.linearRampToValueAtTime(dbToGain(-32), ctx.currentTime + 2);
}

/** Modulate pad volume with breathing (0.0 = inhale, 1.0 = exhale) */
export function setBreathIntensity(exhaleAmount: number): void {
  if (!padGain || !ctx) return;
  // Oscillate between -35dB (inhale) and -28dB (exhale)
  const db = -35 + (exhaleAmount * 7);
  padGain.gain.linearRampToValueAtTime(dbToGain(db), ctx.currentTime + 0.1);
}

// ── Phase 3: Drone Breathing ────────────────────────────────

/** Modulate drone volume with breathing */
export function setDroneBreath(exhaleAmount: number): void {
  if (!droneGain || !ctx) return;
  // Oscillate between -23dB (inhale) and -17dB (exhale)
  const db = -23 + (exhaleAmount * 6);
  droneGain.gain.linearRampToValueAtTime(dbToGain(db), ctx.currentTime + 0.1);
}

// ── Phase 4: Keystroke ──────────────────────────────────────

/** Play a crystalline click for each keystroke */
export function playKeystroke(): void {
  if (!ctx || !masterGain) return;
  ensureRunning();
  
  const now = ctx.currentTime;
  
  // Two oscillators for richness
  const freqs = [2000 + Math.random() * 1000, 3500 + Math.random() * 500];
  
  freqs.forEach(freq => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(dbToGain(-35), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(now);
    osc.stop(now + 0.05);
  });
}

/** Set drone to question-phase volume */
export function setDroneQuestionMode(): void {
  if (!droneGain || !ctx) return;
  droneGain.gain.linearRampToValueAtTime(dbToGain(-25), ctx.currentTime + 1);
}

/** Fade out the pad chord over 2 seconds, then stop oscillators */
export function fadeOutPad(): void {
  if (!padGain || !ctx) return;
  padGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
  // Stop oscillators after fade completes
  const oscs = [...padOscs];
  setTimeout(() => {
    oscs.forEach(o => { try { o.stop(); } catch (_) { /* */ } });
  }, 2200);
}

// ── Phase 5: Ignition ───────────────────────────────────────

/** Play the ignition flash + shockwave sound */
export function playIgnition(): void {
  if (!ctx || !masterGain) return;
  ensureRunning();
  
  const now = ctx.currentTime;
  
  // 1. Sub-bass impact (30Hz, 200ms)
  const impactOsc = ctx.createOscillator();
  const impactGain = ctx.createGain();
  impactOsc.type = 'sine';
  impactOsc.frequency.value = 30;
  impactGain.gain.setValueAtTime(dbToGain(-10), now);
  impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  impactOsc.connect(impactGain);
  impactGain.connect(masterGain);
  impactOsc.start(now);
  impactOsc.stop(now + 0.35);
  
  // 2. White noise sweep (shockwave)
  const bufferSize = ctx.sampleRate * 0.6;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }
  
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.Q.value = 1;
  noiseFilter.frequency.setValueAtTime(200, now + 0.05);
  noiseFilter.frequency.exponentialRampToValueAtTime(8000, now + 0.4);
  noiseFilter.frequency.exponentialRampToValueAtTime(200, now + 0.6);
  
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(dbToGain(-18), now + 0.05);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
  
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);
  noiseSource.start(now + 0.05);
  noiseSource.stop(now + 0.65);
}

/** Play an ascending pentatonic tone for agent node appearance (0-6) */
export function playAgentTone(index: number): void {
  if (!ctx || !masterGain) return;
  ensureRunning();
  
  // Pentatonic scale: C5, D5, E5, G5, A5, C6, D6
  const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66];
  const freq = pentatonic[index] || pentatonic[0];
  const now = ctx.currentTime;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(dbToGain(-22), now);
  gain.gain.exponentialRampToValueAtTime(dbToGain(-30), now + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.45);
}

/** Play the final resolution chord (C-E-G-C major) */
export function playResolutionChord(): void {
  if (!ctx || !masterGain) return;
  ensureRunning();
  
  const now = ctx.currentTime;
  const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
  
  notes.forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    
    const startGain = dbToGain(-24);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(startGain, now + 0.1 + i * 0.05);
    gain.gain.setValueAtTime(startGain, now + 1.5);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3.5);
    
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(now + i * 0.05);
    osc.stop(now + 3.5);
  });
}

/** Fade out all audio (called when awakening ends) */
export function fadeOutAll(): void {
  if (!ctx || !masterGain) return;
  masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
}

/** Stop and clean up all audio */
export function stopAwakeningAudio(): void {
  try {
    droneOsc1?.stop();
    droneOsc2?.stop();
    padOscs.forEach(o => { try { o.stop(); } catch (_) { /* */ } });
  } catch (_) { /* already stopped */ }
  
  droneOsc1 = null;
  droneOsc2 = null;
  droneGain = null;
  padOscs = [];
  padGain = null;
  
  if (ctx && ctx.state !== 'closed') {
    ctx.close().catch(() => {});
  }
  ctx = null;
  masterGain = null;
  isInitialized = false;
}
