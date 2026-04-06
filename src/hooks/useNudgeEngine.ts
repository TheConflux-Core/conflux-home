import { useState, useEffect, useCallback, useRef } from 'react';
import type { NudgeType, NudgeData } from '../types';

// Configuration
const IDLE_THRESHOLD = 300000; // 5 minutes in ms
const NUDGE_COOLDOWN = 30 * 60 * 1000; // 30 minutes in ms
const NUDGE_TTL = 15 * 60 * 1000; // 15 minutes (how long a nudge stays visible)

interface NudgePreferences {
  budget_uncategorized: boolean;
  kitchen_expiry: boolean;
  dream_overdue: boolean;
  habit_streak: boolean;
}

interface UseNudgeEngineReturn {
  activeNudges: NudgeData[];
  isUserIdle: boolean;
  lastNudgeTime: number | null;
  dismissNudge: (id: string, permanent?: boolean) => void;
  takeAction: (id: string, type: NudgeType) => void;
}

// Generate a unique ID for nudges
const generateId = (): string => {
  return `nudge-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Get current time formatted as string
const getTimestamp = (): string => {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Check if nudge should trigger based on time and conditions
const shouldTriggerNudge = (type: NudgeType, lastNudgeTime: number | null, preferences: NudgePreferences): boolean => {
  // Check if this nudge type is disabled by user
  if (!preferences[type]) return false;

  // Check cooldown period
  const now = Date.now();
  if (lastNudgeTime && (now - lastNudgeTime) < NUDGE_COOLDOWN) return false;

  // Time-based rules
  const hour = new Date().getHours();
  const day = new Date().getDay(); // 0 = Sunday

  switch (type) {
    case 'budget_uncategorized':
      // Evening only (5 PM - 11 PM)
      return hour >= 17 && hour <= 23;

    case 'kitchen_expiry':
      // Around meal times (7-9 AM, 12-2 PM, 5-7 PM)
      return (hour >= 7 && hour <= 9) || (hour >= 12 && hour <= 14) || (hour >= 17 && hour <= 19);

    case 'dream_overdue':
      // Monday morning
      return day === 1 && hour >= 8 && hour <= 11;

    case 'habit_streak':
      // Any time, but more likely during active hours
      return hour >= 8 && hour <= 22;

    default:
      return false;
  }
};

export function useNudgeEngine(): UseNudgeEngineReturn {
  const [activeNudges, setActiveNudges] = useState<NudgeData[]>([]);
  const [isUserIdle, setIsUserIdle] = useState(false);
  const [lastNudgeTime, setLastNudgeTime] = useState<number | null>(null);
  const [preferences, setPreferences] = useState<NudgePreferences>({
    budget_uncategorized: true,
    kitchen_expiry: true,
    dream_overdue: true,
    habit_streak: true,
  });

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Generate mock nudge data (in production, this would fetch from backend)
  const generateNudge = useCallback((type: NudgeType): NudgeData | null => {
    const messages: Record<NudgeType, string> = {
      budget_uncategorized:
        'You have 3 uncategorized transactions. Want me to sort them?',
      kitchen_expiry:
        'Chicken expires tomorrow. Want a recipe?',
      dream_overdue:
        'Your goal is 2 weeks behind. Adjust the timeline?',
      habit_streak:
        '5-day streak! Keep it up!',
    };

    return {
      id: generateId(),
      type,
      message: messages[type],
      timestamp: getTimestamp(),
      data: { unread: type === 'budget_uncategorized' ? 3 : undefined },
    };
  }, []);

  // Check for nudges to trigger based on idle state
  const checkForNudges = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;

    // Only trigger nudges if user has been idle for threshold
    if (timeSinceLastActivity < IDLE_THRESHOLD) return;

    // Try to trigger a nudge
    const nudgeTypes: NudgeType[] = ['budget_uncategorized', 'kitchen_expiry', 'dream_overdue', 'habit_streak'];

    for (const type of nudgeTypes) {
      if (shouldTriggerNudge(type, lastNudgeTime, preferences)) {
        const nudge = generateNudge(type);
        if (nudge) {
          setActiveNudges(prev => {
            // Check if this nudge type is already visible
            const alreadyVisible = prev.some(n => n.type === type);
            if (alreadyVisible) return prev;

            return [...prev, nudge];
          });
          setLastNudgeTime(now);
          break;
        }
      }
    }
  }, [lastNudgeTime, preferences, generateNudge]);

  // Monitor user activity
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsUserIdle(false);

    // Clear existing idle timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    // Set new idle timer
    idleTimerRef.current = setTimeout(() => {
      setIsUserIdle(true);
      checkForNudges();
    }, IDLE_THRESHOLD);
  }, [checkForNudges]);

  // Set up activity listeners
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial activity setup
    handleActivity();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [handleActivity]);

  // Clean up expired nudges
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setActiveNudges(prev =>
        prev.filter(nudge => {
          // Parse the timestamp (rough estimate for cleanup)
          const [hours, minutes] = nudge.timestamp.split(':').map(Number);
          const nudgeDate = new Date();
          nudgeDate.setHours(hours, minutes, 0, 0);
          const age = now - nudgeDate.getTime();

          // Remove if older than TTL
          return age < NUDGE_TTL;
        })
      );
    }, 60000); // Check every minute

    return () => clearInterval(cleanup);
  }, []);

  // Dismiss a nudge
  const dismissNudge = useCallback((id: string, permanent: boolean = false) => {
    const nudge = activeNudges.find(n => n.id === id);
    if (nudge && permanent) {
      // Update preferences to not show this type again
      setPreferences(prev => ({
        ...prev,
        [nudge.type]: false,
      }));
    }

    setActiveNudges(prev => prev.filter(n => n.id !== id));
  }, [activeNudges]);

  // Handle action on a nudge
  const takeAction = useCallback((id: string, type: NudgeType) => {
    // In production, this would trigger the relevant app action
    console.log(`Taking action on nudge: ${type} (${id})`);

    switch (type) {
      case 'budget_uncategorized':
        // Would open budget app with uncategorized transactions filter
        console.log('Opening budget app...');
        break;
      case 'kitchen_expiry':
        // Would open kitchen with recipe suggestions
        console.log('Opening kitchen recipes...');
        break;
      case 'dream_overdue':
        // Would open dream builder with timeline adjustment
        console.log('Opening dream builder...');
        break;
      case 'habit_streak':
        // Would open life autopilot for habit tracking
        console.log('Opening life autopilot...');
        break;
    }

    // Remove the nudge after action
    setActiveNudges(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    activeNudges,
    isUserIdle,
    lastNudgeTime,
    dismissNudge,
    takeAction,
  };
}
