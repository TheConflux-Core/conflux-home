// SoundManager — Web Audio API sound system for Conflux Home
// Phase 1: UI Sounds Foundation
// All sounds are synthesized — no external audio files needed

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SoundSettings {
  master: number;    // 0-100
  ui: number;        // 0-100
  agents: number;    // 0-100
  games: number;     // 0-100
  onboarding: number; // 0-100
  muted: boolean;
}

export type SoundCategory = 'ui' | 'agents' | 'games' | 'onboarding';

const DEFAULT_SETTINGS: SoundSettings = {
  master: 80,
  ui: 80,
  agents: 80,
  games: 80,
  onboarding: 80,
  muted: false,
};

const STORAGE_KEY = 'conflux-sound-settings';

// ---------------------------------------------------------------------------
// SoundManager Class
// ---------------------------------------------------------------------------

class SoundManager {
  private ctx: AudioContext | null = null;
  private settings: SoundSettings;
  private preloaded = false;
  private loading = false;

  // Gain nodes per category
  private masterGain: GainNode | null = null;
  private categoryGains: Map<SoundCategory, GainNode> = new Map();

  constructor() {
    this.settings = this.loadSettings();
  }

  // ── Audio Context ──

  private getAudioContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.setupGainNodes();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private setupGainNodes(): void {
    if (!this.ctx) return;

    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.updateMasterGain();

    const categories: SoundCategory[] = ['ui', 'agents', 'games', 'onboarding'];
    for (const cat of categories) {
      const gain = this.ctx.createGain();
      gain.connect(this.masterGain);
      this.categoryGains.set(cat, gain);
      this.updateCategoryGain(cat);
    }
  }

  private updateMasterGain(): void {
    if (!this.masterGain) return;
    const vol = this.settings.muted ? 0 : this.settings.master / 100;
    this.masterGain.gain.setValueAtTime(vol, this.ctx!.currentTime);
  }

  private updateCategoryGain(cat: SoundCategory): void {
    const gain = this.categoryGains.get(cat);
    if (!gain) return;
    gain.gain.setValueAtTime(this.settings[cat] / 100, this.ctx!.currentTime);
  }

  // ── Settings Persistence ──

  private loadSettings(): SoundSettings {
    if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch { /* ignore */ }

    // Migrate from old keys if they exist
    const migrated = { ...DEFAULT_SETTINGS };
    try {
      const oldVol = localStorage.getItem('conflux-sound-volume');
      const oldEnabled = localStorage.getItem('conflux-sound-enabled');
      if (oldVol !== null) {
        const v = parseFloat(oldVol);
        if (!isNaN(v)) migrated.master = Math.round(v * 100);
      }
      if (oldEnabled === 'false') migrated.muted = true;
    } catch { /* ignore */ }

    return migrated;
  }

  private saveSettings(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch { /* ignore */ }
  }

  // ── Public Settings API ──

  getSettings(): SoundSettings {
    return { ...this.settings };
  }

  setVolume(category: 'master' | SoundCategory, level: number): void {
    const clamped = Math.min(100, Math.max(0, Math.round(level)));
    this.settings[category] = clamped;

    if (category === 'master') {
      this.updateMasterGain();
    } else {
      this.updateCategoryGain(category as SoundCategory);
    }

    this.saveSettings();
  }

  setMuted(muted: boolean): void {
    this.settings.muted = muted;
    this.updateMasterGain();
    this.saveSettings();
  }

  toggleMute(): boolean {
    this.settings.muted = !this.settings.muted;
    this.updateMasterGain();
    this.saveSettings();
    return this.settings.muted;
  }

  isMuted(): boolean {
    return this.settings.muted;
  }

  // ── Preload (call on app start) ──

  async preload(): Promise<void> {
    if (this.preloaded || this.loading) return;
    this.loading = true;
    // Synthesized sounds don't need file preloading,
    // but we initialize the AudioContext here
    this.getAudioContext();
    this.preloaded = true;
    this.loading = false;
  }

  // ── Synthesized Sound Effects ──

  // UI: Click
  playClick(): void {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;
    const gain = this.categoryGains.get('ui');
    if (!gain) return;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.03);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.4, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(env);
    env.connect(gain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // UI: Toggle on
  playToggleOn(): void {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;
    const gain = this.categoryGains.get('ui');
    if (!gain) return;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.3, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(env);
    env.connect(gain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  // UI: Toggle off
  playToggleOff(): void {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;
    const gain = this.categoryGains.get('ui');
    if (!gain) return;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(500, now + 0.08);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.3, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(env);
    env.connect(gain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  // UI: Navigation swish
  playNavSwish(direction: 'forward' | 'back' = 'forward'): void {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;
    const gain = this.categoryGains.get('ui');
    if (!gain) return;

    const startFreq = direction === 'forward' ? 400 : 800;
    const endFreq = direction === 'forward' ? 900 : 300;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.15, now + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(env);
    env.connect(gain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  // UI: Notification chime
  playNotification(): void {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;
    const gain = this.categoryGains.get('ui');
    if (!gain) return;

    const notes = [880, 1100]; // A5, C#6
    notes.forEach((freq, i) => {
      const startAt = now + i * 0.1;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startAt);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, startAt);
      env.gain.linearRampToValueAtTime(0.25, startAt + 0.01);
      env.gain.exponentialRampToValueAtTime(0.001, startAt + 0.3);

      osc.connect(env);
      env.connect(gain);
      osc.start(startAt);
      osc.stop(startAt + 0.32);
    });
  }

  // UI: Modal open (whoosh up)
  playModalOpen(): void {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;
    const gain = this.categoryGains.get('ui');
    if (!gain) return;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.12, now + 0.03);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(env);
    env.connect(gain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  // UI: Modal close (whoosh down)
  playModalClose(): void {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;
    const gain = this.categoryGains.get('ui');
    if (!gain) return;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.12);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.12, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(env);
    env.connect(gain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  // UI: Error buzz
  playError(): void {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;
    const gain = this.categoryGains.get('ui');
    if (!gain) return;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.15, now);
    env.gain.linearRampToValueAtTime(0, now + 0.2);

    osc.connect(env);
    env.connect(gain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  // UI: Success ding
  playSuccess(): void {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;
    const gain = this.categoryGains.get('ui');
    if (!gain) return;

    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const startAt = now + i * 0.08;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startAt);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, startAt);
      env.gain.linearRampToValueAtTime(0.2, startAt + 0.01);
      env.gain.exponentialRampToValueAtTime(0.001, startAt + 0.35);

      osc.connect(env);
      env.connect(gain);
      osc.start(startAt);
      osc.stop(startAt + 0.37);
    });
  }

  // Onboarding: Welcome chime
  playWelcomeChime(): void {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;
    const gain = this.categoryGains.get('onboarding');
    if (!gain) return;

    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const startAt = now + i * 0.1;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startAt);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, startAt);
      env.gain.linearRampToValueAtTime(0.3, startAt + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, startAt + 0.4);

      osc.connect(env);
      env.connect(gain);
      osc.start(startAt);
      osc.stop(startAt + 0.42);
    });
  }

  // Onboarding: Heartbeat
  playHeartbeat(): void {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;
    const gain = this.categoryGains.get('onboarding');
    if (!gain) return;

    // "Lub"
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(60, now);
    const env1 = ctx.createGain();
    env1.gain.setValueAtTime(0, now);
    env1.gain.linearRampToValueAtTime(0.4, now + 0.01);
    env1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc1.connect(env1);
    env1.connect(gain);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // "Dub"
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(50, now + 0.15);
    const env2 = ctx.createGain();
    env2.gain.setValueAtTime(0, now + 0.15);
    env2.gain.linearRampToValueAtTime(0.3, now + 0.16);
    env2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc2.connect(env2);
    env2.connect(gain);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.27);
  }

  // Agents: Wake tone (unique per agent index)
  playAgentWake(agentIndex: number): void {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;
    const gain = this.categoryGains.get('agents');
    if (!gain) return;

    const freq = 300 + agentIndex * 50;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.25, now + 0.015);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(env);
    env.connect(gain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  // Boot-up tone
  playBootUp(): void {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;
    const gain = this.categoryGains.get('onboarding');
    if (!gain) return;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.8);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.25, now);
    env.gain.linearRampToValueAtTime(0.25, now + 0.65);
    env.gain.linearRampToValueAtTime(0, now + 0.8);

    osc.connect(env);
    env.connect(gain);
    osc.start(now);
    osc.stop(now + 0.85);
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

export const soundManager = new SoundManager();

// Convenience functions for quick use in components
export const playClick = () => soundManager.playClick();
export const playToggleOn = () => soundManager.playToggleOn();
export const playToggleOff = () => soundManager.playToggleOff();
export const playNavSwish = (dir?: 'forward' | 'back') => soundManager.playNavSwish(dir);
export const playNotification = () => soundManager.playNotification();
export const playModalOpen = () => soundManager.playModalOpen();
export const playModalClose = () => soundManager.playModalClose();
export const playError = () => soundManager.playError();
export const playSuccess = () => soundManager.playSuccess();
export const playWelcomeChime = () => soundManager.playWelcomeChime();
export const playHeartbeat = () => soundManager.playHeartbeat();
export const playAgentWake = (idx: number) => soundManager.playAgentWake(idx);
export const playBootUp = () => soundManager.playBootUp();

// Backwards compat with old sounds.ts
export const playUIClick = playClick;
export const playHeartbeatPulse = playHeartbeat;
export const playBootUpTone = playBootUp;
