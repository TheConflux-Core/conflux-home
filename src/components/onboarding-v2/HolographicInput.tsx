/**
 * Holographic Input — Name step with brain reactivity
 * 
 * The name input feels like writing on glass with a holographic prompt.
 * As the user types, the NeuralBrainScene (already in the app) reacts.
 * We keep the existing NeuralBrainScene — it's already beautiful Three.js.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { NeuralBrainScene } from '../NeuralBrainScene';
import { COMMANDS } from '../../lib/neuralBrain';

interface Props {
  onComplete: (name: string) => void;
  userName?: string;
}

export default function HolographicInput({ onComplete, userName }: Props) {
  const [inputValue, setInputValue] = useState(userName || '');
  const [showHint, setShowHint] = useState(false);
  const [pulseImpulse, setPulseImpulse] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const keyCountRef = useRef(0);

  // No auto-focus — on mobile it pops the keyboard and cuts off content
  // User taps the input when ready

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      handleSubmit();
      return;
    }

    // Each keystroke sends a pulse through the brain
    keyCountRef.current += 1;
    setPulseImpulse(Math.min(5 + keyCountRef.current * 0.5, 20));
  }, [inputValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (!showHint && e.target.value.length > 0) setShowHint(true);
  }, [showHint]);

  const handleSubmit = useCallback(() => {
    if (!inputValue.trim() || isSubmitting) return;
    setIsSubmitting(true);

    // Store name
    localStorage.setItem('conflux-name', inputValue.trim());

    // Brief delay for the dissolve transition
    setTimeout(() => {
      onComplete(inputValue.trim());
    }, 600);
  }, [inputValue, isSubmitting, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
      className="onboarding-v2-name-step"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Neural Brain background — more visible */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600,
        height: 600,
        opacity: 0.28,
        pointerEvents: 'none',
        filter: 'blur(1px)',
      }}>
        <NeuralBrainScene
          command={COMMANDS[0]}
          pulseImpulse={pulseImpulse}
          transparent={true}
        />
      </div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.3, filter: 'blur(12px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ marginBottom: 24, position: 'relative', zIndex: 1 }}
      >
        <img
          src="/logo.png"
          alt="Conflux Home"
          style={{
            width: 100,
            height: 100,
            objectFit: 'contain',
            filter: 'none',
          }}
        />
      </motion.div>

      {/* "Conflux Home" text */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
        style={{
          fontSize: 28,
          fontWeight: 700,
          background: 'linear-gradient(135deg, #00d4ff, #6366f1)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.5px',
          marginBottom: 48,
          position: 'relative',
          zIndex: 1,
        }}
      >
        Conflux Home
      </motion.h1>

      {/* Name input */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          position: 'relative',
          zIndex: 1,
          width: '90%',
          maxWidth: 400,
        }}
      >
        <label style={{
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--text-secondary, rgba(255,255,255,0.6))',
          letterSpacing: 0.3,
        }}>
          What should we call you?
        </label>

        {/* Holographic input container */}
        <div style={{
          position: 'relative',
          width: '100%',
        }}>
          {/* Glow backdrop */}
          <div style={{
            position: 'absolute',
            inset: -8,
            borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(99,102,241,0.08))',
            filter: 'blur(16px)',
            opacity: inputValue ? 1 : 0.3,
            transition: 'opacity 0.5s ease',
            pointerEvents: 'none',
          }} />

          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            placeholder="Your name..."
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              padding: '18px 24px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16,
              outline: 'none',
              fontSize: '1.3rem',
              fontWeight: 500,
              color: '#e2e8f0',
              textAlign: 'center',
              letterSpacing: 0.5,
              caretColor: '#00d4ff',
              transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
              ...(inputValue ? {
                borderColor: 'rgba(0,212,255,0.3)',
                boxShadow: '0 0 20px rgba(0,212,255,0.1), 0 0 40px rgba(0,212,255,0.05)',
              } : {}),
            }}
          />

          {/* Animated beam underline */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: inputValue ? '100%' : '0%',
            height: 2,
            background: 'linear-gradient(90deg, transparent, #00d4ff, #6366f1, #00d4ff, transparent)',
            borderRadius: 1,
            transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 0 10px rgba(0,212,255,0.5), 0 0 20px rgba(0,212,255,0.3)',
          }} />
        </div>

        {/* Submit hint */}
        <div style={{
          fontSize: '0.8rem',
          color: 'rgba(226,232,240,0.3)',
          opacity: showHint ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}>
          Press <kbd style={{
            padding: '2px 8px',
            borderRadius: 4,
            background: 'rgba(0,212,255,0.1)',
            border: '1px solid rgba(0,212,255,0.2)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.75rem',
            color: '#00d4ff',
          }}>Enter</kbd> to continue
        </div>
      </motion.div>

      {/* Heartbeat SVG — more visible, harder pulse */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: inputValue ? 0.8 : 0.35 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '85%',
          maxWidth: 420,
        }}
      >
        <svg viewBox="0 0 400 60" style={{ width: '100%', height: 70 }}>
          <path
            d="M0,30 L60,30 L70,30 L80,15 L90,45 L100,5 L110,55 L120,30 L130,30 L200,30 L210,30 L220,15 L230,45 L240,5 L250,55 L260,30 L270,30 L340,30 L350,30 L360,15 L370,45 L380,5 L390,55 L400,30"
            fill="none"
            stroke="#00d4ff"
            strokeWidth="2"
            strokeLinecap="round"
            style={{
              strokeDasharray: 800,
              strokeDashoffset: 800,
              animation: inputValue ? 'heartbeatDraw 1.5s linear infinite' : 'none',
              filter: 'drop-shadow(0 0 6px rgba(0,212,255,0.6)) drop-shadow(0 0 12px rgba(0,212,255,0.3))',
            }}
          />
        </svg>
      </motion.div>

      {/* Submitting overlay */}
      {isSubmitting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <div style={{
            fontSize: 18,
            color: '#00d4ff',
            fontWeight: 600,
          }}>
            Awakening your team...
          </div>
        </motion.div>
      )}

      <style>{`
        @keyframes heartbeatDraw {
          0% { stroke-dashoffset: 800; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>
    </motion.div>
  );
}
