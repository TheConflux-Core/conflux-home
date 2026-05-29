import { useState, useCallback } from 'react';
import StudioDashboard from './StudioDashboard';
import StudioOnboarding from './StudioOnboarding';
import { StudioModule } from '../types';

export default function StudioView() {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [initialModule, setInitialModule] = useState<StudioModule | undefined>(undefined);

  const handleOnboardingComplete = useCallback((module?: StudioModule) => {
    if (module) {
      setInitialModule(module);
    }
    setShowOnboarding(false);
  }, []);

  return (
    <>
      {!showOnboarding && <StudioDashboard initialModule={initialModule} />}
      {showOnboarding && <StudioOnboarding onComplete={handleOnboardingComplete} />}
    </>
  );
}
