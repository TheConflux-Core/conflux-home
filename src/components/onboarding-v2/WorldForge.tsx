/**
 * World Forge — Build step with agent-driven construction
 * 
 * Instead of a progress bar, each app constructs itself with particles
 * as agents "build" their respective domains. Completes with a
 * triumphant transition.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playBuildComplete } from '../../lib/onboarding-sounds';

interface Props {
  selectedApps: string[];
  onComplete: () => void;
  userName: string;
}

// ── App definitions with their builder agent ───────────────

interface AppDef {
  id: string;
  name: string;
  emoji: string;
  color: string;
  builder: string;
  builderEmoji: string;
}

const APP_REGISTRY: AppDef[] = [
  { id: 'pulse', name: 'Budget', emoji: '💰', color: '#10b981', builder: 'Pulse', builderEmoji: '💚' },
  { id: 'hearth', name: 'Kitchen', emoji: '🍳', color: '#f59e0b', builder: 'Hearth', builderEmoji: '🍳' },
  { id: 'horizon', name: 'Dreams', emoji: '✨', color: '#3b82f6', builder: 'Helix', builderEmoji: '🔬' },
  { id: 'orbit', name: 'Life', emoji: '🏠', color: '#a78bfa', builder: 'Echo', builderEmoji: '🫂' },
  { id: 'mirror', name: 'Diary', emoji: '📝', color: '#06b6d4', builder: 'Echo', builderEmoji: '🫂' },
  { id: 'foundation', name: 'Home', emoji: '🏡', color: '#6b7280', builder: 'Aegis', builderEmoji: '🛡️' },
];

// ── Particle burst effect ──────────────────────────────────

function ConstructionParticles({ color, active }: { color: string; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<{
    x: number; y: number; vx: number; vy: number;
    r: number; life: number; maxLife: number;
  }[]>([]);

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Spawn particles
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      particlesRef.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 1 + Math.random() * 2,
        life: 1,
        maxLife: 0.5 + Math.random() * 0.5,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);

      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02; // gravity
        p.life -= 0.015;

        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();
      });

      if (particlesRef.current.length > 0) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => cancelAnimationFrame(animRef.current);
  }, [active, color]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
      }}
    />
  );
}

// ── Single App Build Card ──────────────────────────────────

function AppBuildCard({
  app,
  isBuilding,
  isDone,
}: {
  app: AppDef;
  isBuilding: boolean;
  isDone: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '20px 16px',
        borderRadius: 16,
        background: isDone
          ? `linear-gradient(135deg, rgba(${hexToRgb(app.color)}, 0.15), rgba(${hexToRgb(app.color)}, 0.05))`
          : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isDone ? app.color : 'rgba(255,255,255,0.08)'}`,
        minWidth: 100,
        transition: 'all 0.5s ease',
        overflow: 'hidden',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: isDone ? `0 0 20px rgba(${hexToRgb(app.color)}, 0.15)` : 'none',
      }}
    >
      {/* Construction particles */}
      <ConstructionParticles color={app.color} active={isBuilding} />

      {/* Builder agent indicator */}
      {isBuilding && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            fontSize: 20,
            filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))',
            animation: 'builderFloat 1.5s ease-in-out infinite',
          }}
        >
          {app.builderEmoji}
        </motion.div>
      )}

      {/* App icon */}
      <div style={{
        fontSize: 32,
        opacity: isDone ? 1 : isBuilding ? 0.7 : 0.3,
        transition: 'opacity 0.5s ease',
        filter: isDone ? `drop-shadow(0 0 8px ${app.color})` : 'none',
      }}>
        {app.emoji}
      </div>

      {/* App name */}
      <div style={{
        fontSize: 12,
        fontWeight: 600,
        color: isDone ? '#fff' : 'rgba(255,255,255,0.4)',
        transition: 'color 0.5s ease',
      }}>
        {app.name}
      </div>

      {/* Status indicator */}
      <div style={{
        fontSize: 10,
        color: isDone ? app.color : isBuilding ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
        transition: 'color 0.3s ease',
      }}>
        {isDone ? '✓ Ready' : isBuilding ? 'Building...' : 'Queued'}
      </div>
    </motion.div>
  );
}

// ── Confetti Burst on completion ───────────────────────────

function ConfettiBurst() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#00d4ff', '#6366f1', '#00cc88', '#f59e0b', '#a78bfa', '#22c55e', '#ef4444'];
    const particles = Array.from({ length: 80 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 100,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: -(Math.random() * 10 + 4),
      r: 3 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 15,
      life: 1,
      shape: Math.random() > 0.5 ? 'rect' as const : 'circle' as const,
    }));

    const gravity = 0.15;
    const drag = 0.98;
    let frame = 0;

    const animate = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += gravity;
        p.vx *= drag;
        p.rotation += p.rotSpeed;
        if (frame > 60) p.life *= 0.96;

        if (p.life < 0.02) continue;

        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (frame < 120) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  );
}

// ── Main Component ─────────────────────────────────────────

export default function WorldForge({ selectedApps, onComplete, userName }: Props) {
  const [buildPhase, setBuildPhase] = useState<'intro' | 'building' | 'done'>('intro');
  const [currentAppIndex, setCurrentAppIndex] = useState(-1);
  const [completedApps, setCompletedApps] = useState<Set<string>>(new Set());

  // Resolve apps to build
  const appsToBuild = selectedApps.length > 0
    ? APP_REGISTRY.filter(a => selectedApps.includes(a.id))
    : APP_REGISTRY.slice(0, 3); // default: budget, kitchen, dreams

  // Start build sequence
  useEffect(() => {
    const introTimer = setTimeout(() => {
      setBuildPhase('building');
      setCurrentAppIndex(0);
    }, 1500);

    return () => clearTimeout(introTimer);
  }, []);

  // Progress through apps
  useEffect(() => {
    if (buildPhase !== 'building' || currentAppIndex < 0) return;
    if (currentAppIndex >= appsToBuild.length) {
      // All done
      setBuildPhase('done');
      playBuildComplete();
      return;
    }

    const buildTime = 800 + Math.random() * 400; // 800-1200ms per app
    const timer = setTimeout(() => {
      setCompletedApps(prev => new Set(prev).add(appsToBuild[currentAppIndex].id));
      setCurrentAppIndex(prev => prev + 1);
    }, buildTime);

    return () => clearTimeout(timer);
  }, [buildPhase, currentAppIndex, appsToBuild]);

  // Auto-advance after done
  useEffect(() => {
    if (buildPhase !== 'done') return;
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [buildPhase, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '40px 24px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <AnimatePresence mode="wait">
        {/* Intro phase */}
        {buildPhase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ textAlign: 'center' }}
          >
            <div style={{ fontSize: 48, marginBottom: 24 }}>⚡</div>
            <h2 style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#fff',
              margin: '0 0 12px',
            }}>
              Building Your World
            </h2>
            <p style={{
              fontSize: 16,
              color: 'rgba(255,255,255,0.5)',
            }}>
              Your agents are setting things up, {userName || 'friend'}...
            </p>
          </motion.div>
        )}

        {/* Building phase */}
        {buildPhase === 'building' && (
          <motion.div
            key="building"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 32,
              maxWidth: 500,
              width: '100%',
            }}
          >
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 2,
              color: 'rgba(255,255,255,0.4)',
            }}>
              Agents At Work
            </div>

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 16,
            }}>
              {appsToBuild.map((app, i) => (
                <AppBuildCard
                  key={app.id}
                  app={app}
                  isBuilding={currentAppIndex === i}
                  isDone={completedApps.has(app.id)}
                />
              ))}
            </div>

            {/* Overall progress */}
            <div style={{
              width: '100%',
              maxWidth: 300,
              marginTop: 16,
            }}>
              <div style={{
                height: 4,
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 2,
                overflow: 'hidden',
              }}>
                <motion.div
                  animate={{
                    width: `${(completedApps.size / appsToBuild.length) * 100}%`,
                  }}
                  transition={{ duration: 0.3 }}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #00d4ff, #6366f1)',
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Done phase with confetti */}
        {buildPhase === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
            style={{ textAlign: 'center', position: 'relative' }}
          >
            {/* Confetti burst */}
            <ConfettiBurst />

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              style={{ fontSize: 72, marginBottom: 24 }}
            >
              ✨
            </motion.div>
            <h2 className="hologram-title" style={{
              fontSize: 36,
              fontWeight: 700,
              color: '#fff',
              margin: '0 0 12px',
            }}>
              Your team is ready.
            </h2>
            <p style={{
              fontSize: 18,
              color: 'rgba(255,255,255,0.65)',
            }}>
              Welcome home, {userName || 'friend'}.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes builderFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(5deg); }
        }
      `}</style>
    </motion.div>
  );
}

// ── Helpers ────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '255,255,255';
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}
