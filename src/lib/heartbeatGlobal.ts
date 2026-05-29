// HeartbeatGlobal — module-level singleton for heartbeat interval
// Persists across React component unmounts/mounts.
// Any component subscribes via subscribe(); all share the same ticking clock.

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

// Track whether a chain is actively running so fireBeat() doesn't duplicate.
let _chainActive = false;

// ── Normalize + route Rust beat events through beatBus ───────────────────────
// heartbeatGlobal registers its Tauri listener at MODULE LOAD time (before
// any React component mounts). This ensures the normalization handler is
// always ready before the first event can fire.
//
// App.tsx must NOT dispatch conflux:beat-event to beatBus — heartbeatGlobal
// handles the full flow: Tauri event → normalize → emitBeat → beatBus.
let _tauriListenerRegistered = false;

async function registerTauriListener() {
  if (_tauriListenerRegistered) return;
  _tauriListenerRegistered = true;

  // Listen for real chain step beats from Rust.
  // Normalize snake_case (Rust) → camelCase (beatBus) and route to beatBus.
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
  }).catch(e => console.warn('[HeartbeatGlobal] Tauri listener error:', e));

  // Track chain active state for fireBeat() deduplication
  listen('conflux:chain-started', () => { _chainActive = true; }).catch(() => {});
  listen('conflux:chain-complete', () => { _chainActive = false; }).catch(() => {});
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
let tickInterval: ReturnType<typeof setInterval> | null = null;
let rustIntervalMs: number | null = null;
let beatCount = 0;

// ── Helpers ────────────────────────────────────────────────────────────────────

function stopTick() {
  if (tickInterval !== null) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

function fireBeat(): void {
  // Always fire the frontend timer beat — it's a visual indicator.
  // Real chain beats from Rust flow through conflux:beat-event and overlay naturally.
  beatCount++;
  config.lastBeatMs = Date.now();
  const ts = config.lastBeatMs;
  const intervalMin = Math.round(config.intervalMs / 60000);
  emitBeat({
    agentId: 'conflux',
    agentLabel: 'Conflux',
    action: `Heartbeat ${beatCount} complete`,
    detail: `System scan · ${intervalMin}-min interval`,
    type: 'info',
  });

  listeners.forEach(l => {
    try { l.onBeat(ts); } catch (e) { console.warn('[HeartbeatGlobal]', e); }
  });
  syncFromRust();
}

async function syncFromRust(): Promise<void> {
  try {
    const rustMs: number = await invoke('engine_get_heartbeat_interval');
    if (rustMs !== rustIntervalMs) {
      rustIntervalMs = rustMs;
      if (rustMs !== config.intervalMs) {
        config.intervalMs = rustMs;
        startTick();
      }
    }
    const stored = await invoke<string>('engine_get_heartbeat_last_beat').catch(() => null);
    if (stored && !isNaN(Number(stored))) {
      config.lastBeatMs = Number(stored);
    }
  } catch {
    // Non-fatal — keep ticking with local state
  }
}

function startTick(): void {
  stopTick();
  if (config.intervalMs === 0) return;

  const elapsed = Date.now() - config.lastBeatMs;
  const remaining = config.intervalMs - elapsed;

  if (remaining <= 0) {
    fireBeat();
  }

  tickInterval = setInterval(fireBeat, config.intervalMs);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function initHeartbeatGlobal(): Promise<void> {
  // Register Tauri listener at module load — before any component mounts.
  // This ensures the beat-normalization handler is ready before first event.
  await registerTauriListener();

  try {
    const rustMs: number = await invoke('engine_get_heartbeat_interval');
    rustIntervalMs = rustMs;
    config.intervalMs = rustMs;
    try {
      const stored = await invoke<string>('engine_get_heartbeat_last_beat');
      if (stored && !isNaN(Number(stored))) {
        config.lastBeatMs = Number(stored);
      } else {
        config.lastBeatMs = Date.now();
      }
    } catch {
      config.lastBeatMs = Date.now();
    }
    startTick();
  } catch (e) {
    console.warn('[HeartbeatGlobal] Failed to init:', e);
    startTick();
  }
}

export function setHeartbeatInterval(ms: number): void {
  config.intervalMs = ms;
  startTick();
}

export function pulseBeat(): void {
  config.lastBeatMs = Date.now();
  fireBeat();
}

export function subscribe(onBeat: (timestamp: number) => void): () => void {
  const id = `beat_${Date.now()}_${Math.random()}`;
  listeners.push({ id, onBeat });
  onBeat(config.lastBeatMs);
  return () => {
    listeners = listeners.filter(l => l.id !== id);
    if (listeners.length === 0) {
      stopTick();
    }
  };
}

export function getHeartbeatConfig(): HeartbeatConfig {
  return { ...config };
}