import { createContext, useContext } from 'react';
import type { BrainMode, BrainCommand, PaletteName } from '../../lib/neuralBrain';
import type { ConfluxStatusSource } from './types';

export interface ConfluxContextValue {
  command: BrainCommand;
  mode: BrainMode;
  pulseImpulse: number;
  pulseEvent: { id: number; lobe?: string; lobes?: string[]; route?: string[]; strength?: number; bursts?: number; edgeIndex?: number } | undefined;
  signalCount: number;
  status: string;
  transparent: boolean;
  appPalette: PaletteName | null;
  effectivePalette: { node: string; hot: string; line: string; glow: string; aura: string };
  setMode: (mode: BrainMode, source?: ConfluxStatusSource, status?: string) => void;
  triggerPulse: (strength?: number, status?: string) => void;
  routePulse: (detail: any, status?: string, opts?: { updateStatus?: boolean }) => void;
  setAppPaletteMode: (palette: PaletteName) => void;
  applyEvent: (event: any, source?: ConfluxStatusSource) => void;
  reset: () => void;
}

export const ConfluxContext = createContext<ConfluxContextValue | null>(null);

export function useConflux(): ConfluxContextValue {
  const ctx = useContext(ConfluxContext);
  if (!ctx) throw new Error('useConflux must be used within ConfluxContext.Provider');
  return ctx;
}
