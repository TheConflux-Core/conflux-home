// Conflux Home — Security Welcome Animation
// "The Shield Awakens" — cinematic first launch experience for Security app
//
// LocalStorage: 'security-welcome-completed' (permanent — one time only)

import { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/security.css';

const WELCOME_DONE_KEY = 'security-welcome-completed';

export function hasCompletedSecurityWelcome(): boolean {
  return localStorage.getItem(WELCOME_DONE_KEY) === 'true';
}

interface Props {
  onComplete: () => void;
}

type Phase = 'intro' | 'aegis' | 'viper' | 'watchtower' | 'shield';

const PHASES: Array<{ id: Phase; icon: string; title: string; subtitle: string; color: string }> = [
  { id: 'intro', icon: '🛡️', title: 'Your Security Center', subtitle: 'Three guardians protecting your system around the clock', color: '#22c55e' },
  { id: 'aegis', icon: '🛡️', title: 'Aegis — Blue Team', subtitle: 'Audits your system for unlocked doors and weak settings', color: '#06b6d4' },
  { id: 'viper', icon: '🐍', title: 'Viper — Red Team', subtitle: 'Hunts for vulnerabilities before attackers find them', color: '#ef4444' },
  { id: 'watchtower', icon: '👁️', title: 'Watchtower — SIEM', subtitle: 'Correlates events across all security systems', color: '#8b5cf6' },
  { id: 'shield', icon: '✨', title: 'Shield Active', subtitle: 'Your defense system is online and monitoring', color: '#22c55e' },
];

export default function SecurityWelcome({ onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [visible, setVisible] = useState(true);
  const [particles, setParticles] = useState<Array<{ x: number; y: number; vx: number; vy: number; r: number; alpha: number; color: string; life: number }>>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<typeof particles>([]);
  const phaseRef = useRef<Phase>('intro');
  const rafRef = useRef<number | undefined>(undefined);
  const phaseTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Keep refs in sync
  useEffect(() => { particlesRef.current = particles; }, [particles]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let t = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 1;

      if (particlesRef.current.length === 0) {
        const currentColor = PHASES.find(p => p.id === phaseRef.current)?.color ?? '#22c55e';
        particlesRef.current = Array.from({ length: 60 }, () => ({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          r: Math.random() * 2 + 1,
          alpha: Math.random() * 0.5 + 0.2,
          color: currentColor,
          life: Math.random() * 200,
        }));
        setParticles([...particlesRef.current]);
      }

      particlesRef.current = particlesRef.current.map(p => {
        const moved = { ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.5 };
        if (moved.life <= 0 || moved.x < 0 || moved.x > canvas.width || moved.y < 0 || moved.y > canvas.height) {
          return { ...p, x: Math.random() * canvas.width, y: Math.random() * canvas.height, life: Math.random() * 200 + 100 };
        }
        return moved;
      });

      particlesRef.current.forEach(p => {
        const flicker = Math.sin(t * 0.05 + p.life * 0.1) * 0.2 + 0.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        const alphaHex = Math.floor(p.alpha * flicker * 255).toString(16).padStart(2, '0');
        ctx.fillStyle = p.color + alphaHex;
        ctx.fill();
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Phase progression
  useEffect(() => {
    // Clear any previous timers
    phaseTimersRef.current.forEach(clearTimeout);
    phaseTimersRef.current = [];

    if (phase === 'intro') {
      const timer = setTimeout(() => setPhase('aegis'), 2200);
      phaseTimersRef.current.push(timer);
    } else if (phase === 'aegis') {
      const timer = setTimeout(() => setPhase('viper'), 2200);
      phaseTimersRef.current.push(timer);
    } else if (phase === 'viper') {
      const timer = setTimeout(() => setPhase('watchtower'), 2200);
      phaseTimersRef.current.push(timer);
    } else if (phase === 'watchtower') {
      const timer = setTimeout(() => setPhase('shield'), 2200);
      phaseTimersRef.current.push(timer);
    } else if (phase === 'shield') {
      const timer = setTimeout(() => {
        setVisible(false);
        localStorage.setItem(WELCOME_DONE_KEY, 'true');
        // Small delay so the fade-out completes
        setTimeout(onComplete, 400);
      }, 2000);
      phaseTimersRef.current.push(timer);
    }

    return () => {
      phaseTimersRef.current.forEach(clearTimeout);
    };
  }, [phase, onComplete]);

  const handleSkip = useCallback(() => {
    phaseTimersRef.current.forEach(clearTimeout);
    setVisible(false);
    localStorage.setItem(WELCOME_DONE_KEY, 'true');
    setTimeout(onComplete, 400);
  }, [onComplete]);

  const currentPhaseData = PHASES.find(p => p.id === phase)!;
  const phaseIndex = PHASES.findIndex(p => p.id === phase);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        backgroundImage: "url('/backgrounds/themes/aegis.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
        pointerEvents: visible ? 'auto' : 'none',
        overflow: 'hidden',
      }}
    >
      {/* Dark overlay for readability over Aegis wallpaper */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(2, 6, 23, 0.75)', pointerEvents: 'none' }} />

      {/* Canvas particle layer */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />

      {/* Grid overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(${currentPhaseData.color}06 1px, transparent 1px),
          linear-gradient(90deg, ${currentPhaseData.color}06 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
        pointerEvents: 'none',
      }} />

      {/* Radial glow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse at 50% 35%, ${currentPhaseData.color}14 0%, transparent 55%)`,
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '0 24px',
        maxWidth: 560,
        width: '100%',
      }}>
        {/* Phase icon */}
        <div style={{
          fontSize: 88,
          marginBottom: 28,
          animation: 'secFloat 3s ease-in-out infinite',
          filter: `drop-shadow(0 0 32px ${currentPhaseData.color}88)`,
        }}>
          {currentPhaseData.icon}
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: 42,
          fontWeight: 800,
          color: '#f1f5f9',
          margin: '0 0 14px 0',
          letterSpacing: '-0.5px',
          animation: 'secSlideIn 0.5s ease-out',
        }}>
          {currentPhaseData.title}
        </h2>

        {/* Subtitle */}
        <p style={{
          fontSize: 20,
          color: '#94a3b8',
          lineHeight: 1.6,
          margin: '0 0 36px 0',
          animation: 'secSlideIn 0.5s ease-out 0.1s both',
        }}>
          {currentPhaseData.subtitle}
        </p>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 44 }}>
          {PHASES.map((p, i) => (
            <div
              key={p.id}
              style={{
                width: i === phaseIndex ? 36 : 10,
                height: 10,
                borderRadius: 5,
                background: i <= phaseIndex ? currentPhaseData.color : '#1e293b',
                transition: 'all 0.4s ease',
              }}
            />
          ))}
        </div>

        {/* Skip */}
        <button
          onClick={handleSkip}
          style={{
            background: 'transparent',
            border: '1px solid #1e293b',
            color: '#64748b',
            padding: '8px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 12,
            transition: 'all 0.15s',
          }}
        >
          Skip →
        </button>
      </div>
    </div>
  );
}