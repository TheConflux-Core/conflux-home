import { useState, useCallback } from 'react';
import StudioDashboard from './StudioDashboard';
import StudioOnboarding from './StudioOnboarding';
import { StudioProvider } from '../context/StudioContext';
import { StudioModule } from '../types';

export default function StudioView() {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem('conflux-studio-onboarded') !== 'true';
  });
  const [initialModule, setInitialModule] = useState<StudioModule | undefined>(undefined);

  const handleOnboardingComplete = useCallback((module?: StudioModule) => {
    if (module) {
      setInitialModule(module);
    }
    setShowOnboarding(false);
    localStorage.setItem('conflux-studio-onboarded', 'true');
  }, []);

  return (
    <StudioProvider>
      {!showOnboarding && <StudioDashboard initialModule={initialModule} />}
      {showOnboarding && <StudioOnboarding onComplete={handleOnboardingComplete} />}
    </StudioProvider>
  );
}
