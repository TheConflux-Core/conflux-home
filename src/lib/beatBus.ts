// BeatEventBus — shared event system for agent heartbeat beats
// Any component can emit a beat event; any component can subscribe.
// Uses a global window custom event so it's zero-coupling across the codebase.

import { useState, useEffect, useRef } from 'react';

export interface BeatEvent {
  id: string;
  agentId: string;
  agentLabel: string;
  action: string;
  detail?: string;
  type: 'info' | 'success' | 'warn';
  timestamp: number;
  /** Which tools the agent called during this step (Session 6) */
  toolsUsed?: string[];
  /** Whether the agent found something noteworthy (Session 6) */
  hadFindings?: boolean;
}

export const AGENTS = [
  { id: 'conflux', label: 'Conflux', emoji: '🤖', color: '#8b5cf6' },
  { id: 'helix',   label: 'Helix',   emoji: '🔬', color: '#a78bfa' },
  { id: 'pulse',   label: 'Pulse',   emoji: '💚', color: '#34d399' },
  { id: 'hearth',  label: 'Hearth',  emoji: '🔥', color: '#fb923c' },
  { id: 'echo',    label: 'Echo',    emoji: '🫂', color: '#f472b6' },
  { id: 'aegis',   label: 'Aegis',   emoji: '🛡️', color: '#38bdf8' },
  { id: 'viper',   label: 'Viper',   emoji: '🐍', color: '#22c55e' },
  { id: 'forge',   label: 'Forge',   emoji: '🔨', color: '#f97316' },
  { id: 'orbit',   label: 'Orbit',    emoji: '🧠', color: '#e879f9' },
  { id: 'horizon', label: 'Horizon',  emoji: '🎯', color: '#f472b6' },
] as const;

export type AgentId = typeof AGENTS[number]['id'];

// ── Bus ────────────────────────────────────────────────────────────────────────
const BEAT_BUS = 'conflux:beat-event';
let _beatCounter = 0;

// Module-level event store — persists across component unmounts/remounts
// so navigating between apps doesn't wipe the timeline.
let _beatStore: BeatEvent[] = [];
const _beatListeners = new Set<(beat: BeatEvent) => void>();

function _notifyListeners(beat: BeatEvent) {
  _beatListeners.forEach(fn => fn(beat));
}

export function emitBeat(event: Omit<BeatEvent, 'id' | 'timestamp'>) {
  const full: BeatEvent = {
    ...event,
    id: `beat-${Date.now()}-${++_beatCounter}`,
    timestamp: Date.now(),
  };
  console.log('[beatBus] emitBeat:', JSON.stringify(full));
  // Add to persistent store
  _beatStore = [full, ..._beatStore].slice(0, MAX_EVENTS);
  // Notify all listeners (useBeatTimeline hooks)
  _notifyListeners(full);
  // Also dispatch the window event for components that use it directly
  window.dispatchEvent(new CustomEvent(BEAT_BUS, { detail: full }));
}

// ── Timeline hook ──────────────────────────────────────────────────────────────
const MAX_EVENTS = 20;

export function useBeatTimeline() {
  const [events, setEvents] = useState<BeatEvent[]>(_beatStore);
  const prevIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Sync with current store state on mount
    if (_beatStore.length > 0 && prevIdRef.current === null) {
      setEvents(_beatStore);
    }

    const handler = (e: Event) => {
      const beat = (e as CustomEvent<BeatEvent>).detail;
      console.log('[beatBus] useBeatTimeline received:', JSON.stringify(beat));
      if (beat.id === prevIdRef.current) return;
      prevIdRef.current = beat.id;
      setEvents(prev => {
        const next = [beat, ...prev].slice(0, MAX_EVENTS);
        return next;
      });
    };
    window.addEventListener(BEAT_BUS, handler as EventListener);
    return () => window.removeEventListener(BEAT_BUS, handler as EventListener);
  }, []);

  return events;
}

// ── Per-agent last-active hook ────────────────────────────────────────────────
export function useAgentActivity(agentId: string) {
  const [lastActive, setLastActive] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const beat = (e as CustomEvent<BeatEvent>).detail;
      if (beat.agentId !== agentId) return;
      setLastActive(Date.now());
      setIsActive(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setIsActive(false), 3000);
    };
    window.addEventListener(BEAT_BUS, handler as EventListener);
    return () => window.removeEventListener(BEAT_BUS, handler as EventListener);
  }, [agentId]);

  return { lastActive, isActive };
}

// Demo beat generator removed — real chain events flow through heartbeatGlobal.ts
