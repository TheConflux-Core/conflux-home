import { createContext, useContext, ReactNode } from 'react';
import { useStudioState } from '../hooks/useStudio';
import type { StudioGeneration, StudioModule } from '../types';

// The context value type matches what useStudio returns
type StudioContextType = ReturnType<typeof useStudioState>;

const StudioContext = createContext<StudioContextType | null>(null);

export function StudioProvider({ children }: { children: ReactNode }) {
  const state = useStudioState();
  return (
    <StudioContext.Provider value={state}>
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio(): StudioContextType {
  const ctx = useContext(StudioContext);
  if (!ctx) {
    throw new Error('useStudio must be used within a <StudioProvider>');
  }
  return ctx;
}
