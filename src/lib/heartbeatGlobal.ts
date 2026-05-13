// HeartbeatGlobal — module-level singleton for heartbeat interval
// Persists across React component unmounts/mounts.
// Any component subscribes via subscribe(); all share the same ticking clock.

import { invoke } from '@tauri-apps/api/core';
import { emitBeat } from './beatBus';

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

// Track whether a chain is actively running.
let _chainActive = false;

// ── Normalize + re-emit Rust chain beats through beatBus ────────────────────
// App.tsx dispatches 'conflux:beat-event' (from Rust's beat-event emit).
// But the Rust BeatEventJson uses snake_case (agent_id, agent_label, event_type).
// The BeatEvent TypeScript interface expects camelCase (agentId, agentLabel, type).
// This listener normalizes the field names so BeatRow finds the right agent emoji.
// Also deduplicates: prevents the raw un-normalized event from reaching beatBus twice.
if (typeof window !== 'undefined') {
  window.addEventListener('conflux:chain-started', () => { _chainActive = true; });
  window.addEventListener('conflux:chain-complete', () => { _chainActive = false; });

  // Normalize Rust beat events before they hit beatBus.
  // App.tsx dispatches the raw Rust event; we intercept + fix field names here.
  const beatNormalizationHandler = (e: Event) => {
    const raw = (e as CustomEvent).detail;
    // Snake_case fields from Rust BeatEventJson → camelCase BeatEvent
    const agentId = raw.agent_id ?? raw.agentId ?? 'conflux';
    const agentLabel = raw.agent_label ?? raw.agentLabel ?? 'Conflux';
    const eventType = raw.event_type ?? raw.type ?? 'info';
    const meta = CHAIN_AGENTS[agentId] ?? { label: agentId, emoji: '⚡' };

    emitBeat({
      agentId,
      agentLabel: meta.label,
      action: raw.action ?? '',
      detail: raw.detail ?? '',
      type: eventType,
    });
  };
  window.addEventListener('conflux:beat-event', beatNormalizationHandler as EventListener);
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
  // Don't emit a conflux beat while chain is running — chain events already going through
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