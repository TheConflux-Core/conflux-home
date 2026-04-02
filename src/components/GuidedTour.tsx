import { useEffect, useState, useCallback } from 'react';
import TourSpotlight from './TourSpotlight';
import TourTooltip from './TourTooltip';
import { useTourState } from '../hooks/useTourState';
import { playNavSwish } from '../lib/sound';

interface TourStep {
  id: string;
  targetId: string | null; // data-tour-id, null for full-screen overlay
  title: string;
  text: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    targetId: null,
    title: 'Welcome Home',
    text: "Welcome to Conflux Home! This is your AI team's home. Let me show you around — it'll take 60 seconds.",
  },
  {
    id: 'dock',
    targetId: 'dock',
    title: 'Your Dock',
    text: 'This is your command center. Quick access to your agents, apps, and settings. It follows you everywhere.',
  },
  {
    id: 'apps',
    targetId: 'apps',
    title: 'Your Apps',
    text: '16 built-in apps — Budget, Kitchen, Creative Studio, Games, and more. Each one is powered by your agents.',
  },
  {
    id: 'intel',
    targetId: 'intel',
    title: 'Intel Dashboard',
    text: 'Live system stats, agent status, and credit balance at a glance. Your mission control.',
  },
  {
    id: 'chat',
    targetId: 'chat',
    title: 'Talk to Your Agents',
    text: 'Click the chat button to start a conversation. Your agents remember everything and get smarter over time.',
  },
  {
    id: 'home',
    targetId: 'home-btn',
    title: 'Home Button',
    text: 'Takes you back to the desktop from anywhere. Always one click away.',
  },
  {
    id: 'complete',
    targetId: null,
    title: "You're Ready!",
    text: "That's the tour! You can replay it anytime from Settings. Now go build something amazing.",
  },
];

interface GuidedTourProps {
  onComplete: () => void;
}

export default function GuidedTour({ onComplete }: GuidedTourProps) {
  const { currentStep, nextStep, completeTour, skipTour } = useTourState();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isActive, setIsActive] = useState(true);

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const isFirst = currentStep === 0;

  // Get target element rect
  useEffect(() => {
    if (!step || !isActive) return;

    const updateRect = () => {
      if (step.targetId) {
        const el = document.querySelector(`[data-tour-id="${step.targetId}"]`);
        setTargetRect(el?.getBoundingClientRect() ?? null);
      } else {
        setTargetRect(null);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(updateRect, 100);

    // Update on resize
    window.addEventListener('resize', updateRect);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRect);
    };
  }, [step, currentStep, isActive]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isActive, currentStep]);

  const handleNext = useCallback(() => {
    playNavSwish('forward');
    if (isLast) {
      setIsActive(false);
      completeTour();
      onComplete();
    } else {
      nextStep();
    }
  }, [isLast, nextStep, completeTour, onComplete]);

  const handleSkip = useCallback(() => {
    setIsActive(false);
    skipTour();
    onComplete();
  }, [skipTour, onComplete]);

  if (!isActive || !step) return null;

  return (
    <div className="guided-tour">
      <TourSpotlight targetRect={targetRect} />
      <TourTooltip
        targetRect={targetRect}
        title={step.title}
        text={step.text}
        step={currentStep}
        total={TOUR_STEPS.length}
        onNext={handleNext}
        onSkip={handleSkip}
        isLast={isLast}
        isFirst={isFirst}
      />
    </div>
  );
}
