import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STUDIO_MODULES, StudioModule } from '../types';
import './studio-onboarding.css';

// ── Particle Canvas Component ──
type ParticleCanvasProps = {
  module: StudioModule;
};

function ParticleCanvas({ module }: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<Array<Particle>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const count = 60;
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      switch (module) {
        case 'image': {
          const hue = Math.random() * 360;
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.4,
            size: 15 + Math.random() * 35,
            color: `hsla(${hue}, 80%, 60%, 0.15)`,
            type: 'circle',
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.02,
          });
          break;
        }
        case 'voice': {
          const col = Math.floor(Math.random() * 20);
          particles.push({
            x: (canvas.width / 20) * col + (Math.random() * (canvas.width / 20)),
            y: canvas.height * 0.5 + (Math.random() - 0.5) * 200,
            vx: 0,
            vy: (Math.random() - 0.5) * 1.5,
            size: 4 + Math.random() * 24,
            color: `hsla(${180 + Math.random() * 40}, 90%, 60%, 0.3)`,
            type: 'bar',
            rotation: 0,
            rotSpeed: 0,
            phase: Math.random() * Math.PI * 2,
            speed: 0.02 + Math.random() * 0.04,
          });
          break;
        }
        case 'code': {
          const chars = ['{', '}', '[', ']', '(', ')', ';', '<', '>', '/'];
          particles.push({
            x: Math.random() * canvas.width,
            y: -20 - Math.random() * 200,
            vx: (Math.random() - 0.5) * 0.3,
            vy: 1 + Math.random() * 2,
            size: 12 + Math.random() * 16,
            color: `hsla(${140 + Math.random() * 60}, 85%, 65%, 0.25)`,
            type: 'char',
            char: chars[Math.floor(Math.random() * chars.length)],
            rotation: (Math.random() - 0.5) * 0.2,
            rotSpeed: (Math.random() - 0.5) * 0.01,
          });
          break;
        }
        case 'video': {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.3,
            size: 20 + Math.random() * 40,
            color: 'rgba(6, 182, 212, 0.1)',
            type: 'rect',
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.015,
          });
          break;
        }
        case 'music': {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: 10 + Math.random() * 50,
            color: `hsla(${280 + Math.random() * 40}, 80%, 65%, 0.15)`,
            type: 'ring',
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.01,
            ringWidth: 2,
            expansion: 0,
          });
          break;
        }
        case 'writing': {
          const types: Array<'circle' | 'rect' | 'triangle'> = ['circle', 'rect', 'triangle'];
          const t = types[Math.floor(Math.random() * types.length)];
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.7,
            vy: (Math.random() - 0.5) * 0.4,
            size: 15 + Math.random() * 30,
            color: `hsla(${Math.random() * 360}, 70%, 60%, 0.12)`,
            type: t,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.02,
          });
          break;
        }
      }
    }

    particlesRef.current = particles;

    let time = 0;
    const animate = () => {
      time += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const waveformTime = Date.now() * 0.002;

      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        p.rotation += p.rotSpeed || 0;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.type === 'circle' || p.type === 'ring') {
          ctx.beginPath();
          if (p.type === 'ring') {
            ctx.arc(0, 0, p.size * (0.5 + Math.sin(time * 2 + (p.expansion ?? 0)) * 0.3), 0, Math.PI * 2);
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.ringWidth || 2;
            ctx.stroke();
          } else {
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (p.type === 'bar') {
          const height = p.size * (0.5 + 0.5 * Math.sin(waveformTime + (p.x / 50)));
          ctx.fillRect(-p.size / 2, -height / 2, p.size / 4, height);
        } else if (p.type === 'char') {
          ctx.font = `${p.size}px monospace`;
          ctx.fillText(p.char as string, -p.size / 2, p.size / 3);
        } else if (p.type === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
        } else if (p.type === 'triangle') {
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 2, p.size / 2);
          ctx.lineTo(-p.size / 2, p.size / 2);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [module]);

  return <canvas ref={canvasRef} className="particle-canvas" />;
}

// ── Main Onboarding Component ──
// Simplified: just a module picker. No prompt flow, no generation.
// Clicking a module opens the Studio dashboard on that tab.
export default function StudioOnboarding({ onComplete }: { onComplete?: (module?: StudioModule) => void }) {
  const [selectedModule, setSelectedModule] = useState<StudioModule>('image');

  // On mount: check if a module was pre-selected from the Creator category
  useEffect(() => {
    const stored = localStorage.getItem('conflux-studio-initial-module');
    if (stored && stored in STUDIO_MODULES) {
      // A module was pre-selected — skip the picker entirely
      localStorage.removeItem('conflux-studio-initial-module');
      onComplete?.(stored as StudioModule);
    }
  }, [onComplete]);

  const handleSelectModule = (module: StudioModule) => {
    setSelectedModule(module);
    onComplete?.(module);
  };

  const handleEnterStudio = () => {
    onComplete?.(selectedModule);
  };

  return (
    <motion.div
      className="studio-onboarding-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <ParticleCanvas module={selectedModule} />

      <AnimatePresence mode="wait">
        <motion.div
          key="picker"
          className="phase-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <h1 className="onboarding-title">What do you want to create today?</h1>
          <p className="onboarding-subtitle">Choose a creative module to get started</p>

          <div className="orb-grid">
            {(Object.entries(STUDIO_MODULES) as [StudioModule, { icon: string; label: string; description: string }][]).map(([id, mod]) => (
              <motion.button
                key={id}
                className={`module-orb ${selectedModule === id ? 'selected' : ''}`}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSelectModule(id as StudioModule)}
                data-module={id}
                title={mod.description}
              >
                <span className="orb-icon">{mod.icon}</span>
                <span className="orb-label">{mod.label}</span>
              </motion.button>
            ))}
          </div>
          <button className="enter-studio-btn" onClick={handleEnterStudio}>
            Enter Studio
          </button>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// ── Particle Types ──
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  type: 'circle' | 'bar' | 'char' | 'rect' | 'ring' | 'triangle';
  rotation: number;
  rotSpeed: number;
  char?: string;
  phase?: number;
  speed?: number;
  ringWidth?: number;
  expansion?: number;
}
