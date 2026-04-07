import { motion } from 'framer-motion';
import { ConfluxPresence, useConfluxController } from './conflux';
import { View } from '../types';
import { useEffect, useState } from 'react';

interface ConfluxOrbitProps {
  view: View;
  immersiveView: View | null;
  chatOpen: boolean;
  voiceChatOpen: boolean;
  isPushToTalkActive: boolean;
}

export default function ConfluxOrbit({ view, immersiveView, chatOpen, voiceChatOpen, isPushToTalkActive }: ConfluxOrbitProps) {
  const conflux = useConfluxController({
    initialMode: 'idle',
    initialTransparent: true,
    initialStatus: 'System Online',
  });

  // Listen for Push-to-Talk events
  useEffect(() => {
    const handlePTTStart = () => {
      console.log('[ConfluxOrbit] PTT Start - switching to listen mode');
      conflux.setMode('listen', 'manual', 'Listening...');
    };
    const handlePTTEnd = () => {
      console.log('[ConfluxOrbit] PTT End - switching to idle mode');
      conflux.setMode('idle', 'manual', 'Ready');
    };

    window.addEventListener('push-to-talk-start', handlePTTStart);
    window.addEventListener('push-to-talk-end', handlePTTEnd);

    return () => {
      window.removeEventListener('push-to-talk-start', handlePTTStart);
      window.removeEventListener('push-to-talk-end', handlePTTEnd);
    };
  }, [conflux]);

  // Determine position based on app state
  // Using window.innerWidth/Height to handle responsiveness
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // Set initial dimensions immediately
    setDimensions({ width: window.innerWidth, height: window.innerHeight });
    
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Logic for "Fairy" positioning
  let targetX = dimensions.width - 350; // Right side with padding
  let targetY = dimensions.height - 350; // Bottom with padding
  let scale = 1;

  if (isPushToTalkActive) {
    // When listening (Push-to-Talk), fly to the center and grow
    targetX = dimensions.width / 2 - 250; // Centered horizontally
    targetY = dimensions.height / 2 - 250; // Centered vertically
    scale = 1.8; // Much larger to indicate it's "leaning in"
  } else if (immersiveView) {
    // If in an app, move to the top-right of the app view
    targetX = dimensions.width - 350;
    targetY = 50; // Top with padding
    scale = 0.75; // Slightly smaller to not obstruct app UI
  } else if (view === 'dashboard') {
    // Idle state: hovering near the dock (ConfluxBarV2)
    targetX = dimensions.width - 320;
    targetY = dimensions.height - 320;
    scale = 1;
  }

  // Transition animation config
  const transition = {
    type: 'spring' as const,
    stiffness: 60,
    damping: 15,
    mass: 0.8,
  };

  if (dimensions.width === 0) return null;

  return (
    <motion.div
      initial={false}
      animate={{ x: targetX, y: targetY, scale }}
      transition={transition}
      style={{
        position: 'fixed',
        zIndex: 100,
        pointerEvents: 'none', // Let clicks pass through the fairy
        top: 0,
        left: 0,
      }}
    >
      <ConfluxPresence
        command={conflux.command}
        pulseImpulse={conflux.pulseImpulse}
        pulseEvent={conflux.pulseEvent}
        transparent={conflux.transparent}
        style={{ width: 300, height: 300 }}
      />
    </motion.div>
  );
}
