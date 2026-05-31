// HeartbeatGlobal — module-level singleton for heartbeat state
// Rust scheduler is the SINGLE source of truth for heartbeat timing.
// Frontend listens for conflux:heartbeat-beat from Rust and syncs state.
// No independent frontend timer — prevents double-firing and timer drift.

import { invoke } from '@tauri-apps/api/core';
import { emitBeat } from './beatBus';
import { listen } from '@tauri-apps/api/event';

// ── Chain step metadata (mirrors heartbeat_chain config) ──────────────────────
const CHAIN_AGENTS: Record<string, { label: string; emoji: string }> = {
  aegis:   { label: 'Aegis',   emoji: '🛡️' },
  helix:   { label: 'Helix',   emoji: '🔬' },
  pulse:   { label: 'Pulse',   emoji: '💚' },
  viper:   { label: 'Viper',   emoji: '🐍' },
  horizon: { label: 'Horizon', emoji: '🎯' },
  orbit:   { label: 'Orbit',   emoji: '🧠' },
  hearth:  { label: 'Hearth',  emoji: '🔥' },
  echo:    { label: 'Echo',    emoji: '🫂' },
  conflux: { label: 'Conflux', emoji: '🤖' },
  forge:   { label: 'Forge',   emoji: '🔨' },
  quanta:  { label: 'Quanta',  emoji: '🔍' },
};

// ── Normalize + route Rust beat events through beatBus ───────────────────────
let _tauriListenerRegistered = false;

async function registerTauriListeners() {
  if (_tauriListenerRegistered) return;
  _tauriListenerRegistered = true;

  // Listen for the main heartbeat tick from Rust scheduler.
  // This is the SINGLE source of truth for when a heartbeat fires.
  listen<number>('conflux:heartbeat-beat', (event) => {
    const now = event.payload || Date.now();
    console.log('[HeartbeatGlobal] Rust heartbeat-beat received:', now);
    config.lastBeatMs = now;
    beatCount++;
    const intervalMin = Math.round(config.intervalMs / 60000);
    emitBeat({
      agentId: 'conflux',
      agentLabel: 'Conflux',
      action: `Heartbeat ${beatCount} complete`,
      detail: `System scan · ${intervalMin}-min interval`,
      type: 'info',
    });
    listeners.forEach(l => {
      try { l.onBeat(now); } catch (e) { console.warn('[HeartbeatGlobal]', e); }
    });
  }).catch(e => console.warn('[HeartbeatGlobal] heartbeat-beat listener error:', e));

  // Listen for interval changes from Rust (when user adjusts the knob)
  listen<number>('conflux:heartbeat-interval-changed', (event) => {
    const newMs = event.payload;
    console.log('[HeartbeatGlobal] Interval changed:', newMs);
    config.intervalMs = newMs;
    config.lastBeatMs = Date.now();
    listeners.forEach(l => {
      try { l.onBeat(config.lastBeatMs); } catch (e) { console.warn('[HeartbeatGlobal]', e); }
    });
  }).catch(e => console.warn('[HeartbeatGlobal] interval-changed listener error:', e));

  // Listen for real chain step beats from Rust.
  listen<any>('conflux:beat-event', (event) => {
    const raw = event.payload;
    console.log('[HeartbeatGlobal] conflux:beat-event:', JSON.stringify(raw));
    const agentId = raw.agent_id ?? raw.agentId ?? 'conflux';
    const meta = CHAIN_AGENTS[agentId] ?? { label: agentId, emoji: '⚡' };
    emitBeat({
      agentId,
      agentLabel: meta.label,
      action: raw.action ?? '',
      detail: raw.detail ?? '',
      type: (raw.event_type ?? raw.type ?? 'info') as 'info' | 'success' | 'warn',
    });
  }).catch(e => console.warn('[HeartbeatGlobal] beat-event listener error:', e));

  // Track chain active state
  listen('conflux:chain-started', () => { /* chain active */ }).catch(() => {});
  listen('conflux:chain-complete', () => { /* chain done */ }).catch(() => {});
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface HeartbeatConfig {
  intervalMs: number;
  lastBeatMs: number;
}

interface Listener {
  id: string;
  onBeat: (timestamp: number) => void;
}

// ── Singleton State ────────────────────────────────────────────────────────────

let config: HeartbeatConfig = {
  intervalMs: 30 * 60 * 1000,
  lastBeatMs: Date.now(),
};

let listeners: Listener[] = [];
let beatCount = 0;

// ── Public API ────────────────────────────────────────────────────────────────

export async function initHeartbeatGlobal(): Promise<void> {
  // Register all Tauri event listeners
  await registerTauriListeners();

  // Sync initial config from Rust
  try {
    const rustMs: number = await invoke('engine_get_heartbeat_interval');
    if (rustMs > 0) {
      config.intervalMs = rustMs;
    }
  } catch (e) {
    console.warn('[HeartbeatGlobal] Failed to get interval:', e);
  }

  try {
    const stored = await invoke<string>('engine_get_heartbeat_last_beat');
    if (stored && !isNaN(Number(stored))) {
      config.lastBeatMs = Number(stored);
    }
  } catch {
    // Non-fatal
  }

  console.log('[HeartbeatGlobal] Initialized — interval:', config.intervalMs, 'lastBeat:', config.lastBeatMs);
}

export function setHeartbeatInterval(ms: number): void {
  config.intervalMs = ms;
  // Persist to Rust — it will emit conflux:heartbeat-interval-changed back to us
  invoke('engine_set_heartbeat_interval', { ms }).catch(e => {
    console.warn('[HeartbeatGlobal] Failed to set interval:', e);
  });
}

export function pulseBeat(): void {
  // Manual beat trigger (e.g., from UI)
  config.lastBeatMs = Date.now();
  beatCount++;
  const intervalMin = Math.round(config.intervalMs / 60000);
  emitBeat({
    agentId: 'conflux',
    agentLabel: 'Conflux',
    action: `Heartbeat ${beatCount} complete`,
    detail: `Manual trigger · ${intervalMin}-min interval`,
    type: 'info',
  });
  listeners.forEach(l => {
    try { l.onBeat(config.lastBeatMs); } catch (e) { console.warn('[HeartbeatGlobal]', e); }
  });
}

export function subscribe(onBeat: (timestamp: number) => void): () => void {
  const id = `beat_${Date.now()}_${Math.random()}`;
  listeners.push({ id, onBeat });
  // Immediately report current state
  onBeat(config.lastBeatMs);
  return () => {
    listeners = listeners.filter(l => l.id !== id);
  };
}

export function getHeartbeatConfig(): HeartbeatConfig {
  return { ...config };
}
