// HeartbeatGlobal — module-level singleton for heartbeat interval
// Persists across React component unmounts/mounts.
// Any component subscribes via subscribe(); all share the same ticking clock.

import { invoke } from '@tauri-apps/api/core';
import { emitBeat } from './beatBus';

// ── Chain step metadata (mirrors heartbeat_chain config) ──────────────────────
// Used to properly label beats from the Rust chain so they display with the
// correct agent emoji/color instead of generic Conflux lightning.
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

// Track whether a chain is actively running so fireBeat() doesn't emit a
// duplicate conflux beat on top of the real chain-step beats.
let _chainActive = false;

// Listen for chain started/stopped events from Rust backend.
if (typeof window !== 'undefined') {
  window.addEventListener('conflux:chain-started', () => { _chainActive = true; });
  window.addEventListener('conflux:chain-complete', () => { _chainActive = false; });

  // Re-emit Rust chain step beats through beatBus with correct agent metadata.
  // ChainTimeline receives Tauri IPC events for step dots.
  // This listener bridges to beatBus so BeatRow/IntelView get styled events.
  const chainHandler = (e: Event) => {
    const step = (e as CustomEvent).detail as {
      agentId: string;
      agentLabel: string;
      action: string;
      detail: string;
      status: string;
    };
    const meta = CHAIN_AGENTS[step.agentId] ?? { label: step.agentId, emoji: '⚡' };
    const isComplete = step.status === 'complete';
    emitBeat({
      agentId: step.agentId,
      agentLabel: meta.label,
      action: step.action,
      detail: step.detail,
      type: isComplete ? 'success' : 'info',
    });
  };
  window.addEventListener('conflux:chain-event', chainHandler as EventListener);
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface HeartbeatConfig {
  intervalMs: number;      // current interval (0 = off)
  lastBeatMs: number;      // timestamp of last beat (from Rust backend)
}

interface Listener {
  id: string;
  onBeat: (timestamp: number) => void;
}

// ── Singleton State ────────────────────────────────────────────────────────────

let config: HeartbeatConfig = {
  intervalMs: 30 * 60 * 1000, // default: 30 min
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
  // If a chain is running, its step beats go through the chain-event listener
  // above. Don't emit a duplicate conflux beat on top of real agent beats.
  if (_chainActive) {
    syncFromRust();
    return;
  }

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

/**
 * Initialize the global heartbeat from the Rust backend.
 * Call once at app startup.
 */
export async function initHeartbeatGlobal(): Promise<void> {
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

/**
 * Update the interval — called from PulseKnob when user changes the setting.
 */
export function setHeartbeatInterval(ms: number): void {
  config.intervalMs = ms;
  startTick();
}

/**
 * Force a beat (e.g., when Rust fires a heartbeat event).
 */
export function pulseBeat(): void {
  config.lastBeatMs = Date.now();
  fireBeat();
}

/**
 * Subscribe to beat events. Returns an unsubscribe function.
 */
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

/**
 * Get current config for any one-off reads.
 */
export function getHeartbeatConfig(): HeartbeatConfig {
  return { ...config };
}