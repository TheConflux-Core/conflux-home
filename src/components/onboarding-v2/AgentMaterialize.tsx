/**
 * Agent Materialization — Cinematic holographic agent reveal
 * 
 * Each agent phases in with a holographic materialization effect:
 * scanlines sweep down, wireframe becomes solid, then glows.
 * Cards have glassmorphism, neon pulse borders, 3D tilt, and particle auras.
 * Uses actual .webp avatar images from /public/avatars/
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';

// ── Types ──────────────────────────────────────────────────

interface AgentInfo {
  id: string;
  name: string;
  emoji: string;
  color: string;
  tagline: string;
  voiceLine: string;
  avatar: string;
  narrative?: string;
}

interface Props {
  agents: AgentInfo[];
  onComplete: () => void;
  onAgentVoice?: (agentId: string) => void;
}

// ── Agent definitions ──────────────────────────────────────

export const ONBOARDING_AGENTS: AgentInfo[] = [
  {
    id: 'conflux',
    name: 'Conflux',
    emoji: '🤖',
    color: '#00d4ff',
    tagline: 'Your co-founder who never sleeps.',
    voiceLine: 'Online. Ready to build.',
    avatar: '/avatars/conflux.webp',
    narrative: "I'm the one who brought us all together.",
  },
  {
    id: 'helix',
    name: 'Helix',
    emoji: '🔬',
    color: '#00cc88',
    tagline: 'Research at the speed of thought.',
    voiceLine: 'I find the signal in the noise.',
    avatar: '/avatars/helix.webp',
    narrative: "Helix — my research powerhouse. Dives deeper than you thought possible.",
  },
  {
    id: 'pulse',
    name: 'Pulse',
    emoji: '💚',
    color: '#10b981',
    tagline: 'Your financial heartbeat.',
    voiceLine: "Let's make your money move smarter.",
    avatar: '/avatars/pulse.webp',
    narrative: "Pulse — your financial heartbeat. Knows your numbers better than you do.",
  },
  {
    id: 'hearth',
    name: 'Hearth',
    emoji: '🍳',
    color: '#f59e0b',
    tagline: 'Your personal nutritionist.',
    voiceLine: 'Good food. Good fuel. Let\'s cook.',
    avatar: '/avatars/hearth.webp',
    narrative: "Hearth — your personal nutritionist. Turns 'what's for dinner' into a plan.",
  },
  {
    id: 'echo',
    name: 'Echo',
    emoji: '🫂',
    color: '#a78bfa',
    tagline: 'Your wellbeing coach.',
    voiceLine: "I'm here. However you're doing.",
    avatar: '/avatars/echo.webp',
    narrative: "Echo — your wellbeing coach. Checks in on the human behind the screen.",
  },
  {
    id: 'aegis',
    name: 'Aegis',
    emoji: '🛡️',
    color: '#6366f1',
    tagline: 'I watch the walls.',
    voiceLine: 'Your fortress is my responsibility.',
    avatar: '/avatars/aegis.webp',
    narrative: "And these two? They protect everything.",
  },
  {
    id: 'viper',
    name: 'Viper',
    emoji: '🐍',
    color: '#22c55e',
    tagline: 'I find the cracks.',
    voiceLine: 'I break things so nothing breaks you.',
    avatar: '/avatars/viper.webp',
    narrative: "Aegis watches the walls. Viper finds the cracks before anyone else does.",
  },
];

// ── Ambient Particle Canvas (behind the whole grid) ────────

function AmbientParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let w = 0, h = 0;

    const resize = () => {
      w = canvas.width = canvas.offsetWidth * 2;
      h = canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * (w / 2),
      y: Math.random() * (h / 2),
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: 1 + Math.random() * 2,
      color: ['#00d4ff', '#6366f1', '#00cc88', '#a78bfa', '#f59e0b'][Math.floor(Math.random() * 5)],
      alpha: 0.1 + Math.random() * 0.3,
      pulse: Math.random() * Math.PI * 2,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, w / 2, h / 2);
      const t = Date.now() * 0.001;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w / 2) p.vx *= -1;
        if (p.y < 0 || p.y > h / 2) p.vy *= -1;

        const alpha = p.alpha * (0.5 + 0.5 * Math.sin(t * 1.5 + p.pulse));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      // Draw faint connections between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = particles[i].color;
            ctx.globalAlpha = 0.05 * (1 - dist / 100);
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="ambient-particles-canvas"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

// ── Particle Aura (per-card floating dots) ─────────────────

function ParticleAura({ color }: { color: string }) {
  const dots = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      left: `${10 + Math.random() * 80}%`,
      top: `${10 + Math.random() * 80}%`,
      size: 2 + Math.random() * 3,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
    })),
    []
  );

  return (
    <div className="particle-aura">
      {dots.map((d, i) => (
        <div
          key={i}
          className="aura-dot"
          style={{
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            background: color,
            boxShadow: `0 0 ${d.size * 3}px ${color}`,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── Holographic Card with 3D tilt ──────────────────────────

function HolographicCard({
  agent,
  index,
  visible,
  materialized,
  isSpeaking,
  onVoiceToggle,
}: {
  agent: AgentInfo;
  index: number;
  visible: boolean;
  materialized: boolean;
  isSpeaking: boolean;
  onVoiceToggle: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  // 3D perspective tilt on hover
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateY = ((x - centerX) / centerX) * 12;
    const rotateX = ((centerY - y) / centerY) * 12;
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.04)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)';
  }, []);

  // All cards land at same height — spiral entry from center
  const totalAgents = 7;
  const centerIndex = (totalAgents - 1) / 2;
  const distFromCenter = Math.abs(index - centerIndex);

  const spiralAngle = (index / totalAgents) * Math.PI * 2 - Math.PI / 2;
  const spiralRadius = 200 + distFromCenter * 40;
  const startRotate = 180 + index * 30;

  return (
    <motion.div
      initial={{
        opacity: 0,
        x: Math.cos(spiralAngle) * spiralRadius,
        y: Math.sin(spiralAngle) * spiralRadius,
        scale: 0.2,
        rotate: startRotate,
      }}
      animate={visible ? {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        rotate: 0,
      } : {
        opacity: 0,
        x: Math.cos(spiralAngle) * spiralRadius,
        y: Math.sin(spiralAngle) * spiralRadius,
        scale: 0.2,
        rotate: startRotate,
      }}
      transition={{
        delay: index * 0.18,
        duration: 1.0,
        type: 'spring',
        stiffness: 80,
        damping: 12,
      }}
      style={{ position: 'relative' }}
    >
      <div
        ref={cardRef}
        className={`holographic-card ${materialized ? 'materialized' : ''}`}
        style={{ '--agent-color': agent.color } as React.CSSProperties}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Flash burst on materialization */}
        {materialized && (
          <div style={{
            position: 'absolute',
            inset: -20,
            borderRadius: 30,
            background: `radial-gradient(circle, ${agent.color}60, transparent 60%)`,
            animation: 'materializeFlash 0.8s ease-out forwards',
            pointerEvents: 'none',
            zIndex: -1,
          }} />
        )}

        {/* Neon glow border */}
        <div
          className="holo-border"
          style={{
            background: `radial-gradient(ellipse at center, ${agent.color}40, transparent 70%)`,
            boxShadow: `0 0 30px ${agent.color}30, inset 0 0 30px ${agent.color}10`,
          }}
        />

        {/* Particle aura */}
        <ParticleAura color={agent.color} />

        {/* Avatar container */}
        <div style={{
          position: 'relative',
          width: 80,
          height: 80,
          borderRadius: 18,
          overflow: 'hidden',
        }}>
          {/* Scanline overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            background: !materialized
              ? `repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  rgba(${hexToRgb(agent.color)}, 0.12) 2px,
                  rgba(${hexToRgb(agent.color)}, 0.12) 4px
                )`
              : 'none',
            opacity: materialized ? 0 : 0.8,
            transition: 'opacity 0.5s ease',
            pointerEvents: 'none',
          }} />

          {/* Sweep line */}
          {!materialized && visible && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: agent.color,
              boxShadow: `0 0 20px ${agent.color}, 0 0 40px ${agent.color}`,
              zIndex: 3,
              animation: 'scanSweep 1s ease-in-out forwards',
              pointerEvents: 'none',
            }} />
          )}

          {/* Avatar image */}
          <img
            src={agent.avatar}
            alt={agent.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: materialized ? 1 : 0.15,
              transition: 'opacity 0.6s ease, filter 0.6s ease',
              filter: materialized
                ? 'none'
                : `hue-rotate(40deg) saturate(0.3) brightness(0.6)`,
            }}
          />

          {/* Wireframe grid overlay (pre-materialization) */}
          {!materialized && (
            <div style={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              backgroundImage: `
                linear-gradient(rgba(${hexToRgb(agent.color)}, 0.15) 1px, transparent 1px),
                linear-gradient(90deg, rgba(${hexToRgb(agent.color)}, 0.15) 1px, transparent 1px)
              `,
              backgroundSize: '8px 8px',
              opacity: 0.6,
            }} />
          )}

          {/* Inner glow border */}
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 24,
            border: `2px solid ${agent.color}`,
            opacity: materialized ? 0.5 : 0,
            transition: 'opacity 0.5s ease 0.3s',
            boxShadow: `inset 0 0 24px rgba(${hexToRgb(agent.color)}, 0.2), 0 0 24px rgba(${hexToRgb(agent.color)}, 0.25)`,
            zIndex: 4,
            pointerEvents: 'none',
          }} />

          {/* Speaking waveform */}
          {isSpeaking && materialized && (
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 28,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: 2,
              padding: '0 10px 6px',
              zIndex: 5,
            }}>
              {Array.from({ length: 14 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 2,
                    background: agent.color,
                    borderRadius: 1,
                    animation: `waveform 0.4s ease-in-out ${i * 0.04}s infinite alternate`,
                    boxShadow: `0 0 4px ${agent.color}`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Name + tagline + narrative */}
        <div style={{ textAlign: 'center', maxWidth: 160 }}>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: agent.color,
            letterSpacing: '-0.3px',
            opacity: materialized ? 1 : 0,
            transform: materialized ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.5s ease 0.2s, transform 0.5s ease 0.2s',
            textShadow: `0 0 20px ${agent.color}40`,
          }}>
            {agent.name}
          </div>
          <div style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
            marginTop: 4,
            opacity: materialized ? 1 : 0,
            transform: materialized ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.5s ease 0.35s, transform 0.5s ease 0.35s',
          }}>
            {agent.tagline}
          </div>
          {/* Narrative removed for compact layout — shows in tooltip on hover */}
        </div>

        {/* Voice toggle button */}
        {materialized && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
            onClick={onVoiceToggle}
            style={{
              background: isSpeaking
                ? `linear-gradient(135deg, ${agent.color}, ${agent.color}cc)`
                : 'rgba(255,255,255,0.06)',
              border: `1px solid ${isSpeaking ? agent.color : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 10,
              padding: '6px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              fontWeight: 600,
              color: isSpeaking ? '#000' : 'rgba(255,255,255,0.5)',
              transition: 'all 0.25s ease',
              boxShadow: isSpeaking ? `0 0 16px ${agent.color}40` : 'none',
            }}
          >
            {isSpeaking ? '🔊' : '🔈'} {isSpeaking ? 'Playing...' : 'Voice'}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────

export default function AgentMaterialize({ agents, onComplete, onAgentVoice }: Props) {
  const [visible, setvisible] = useState(false);
  const [materializedStates, setMaterializedStates] = useState<Record<string, boolean>>({});
  const [speakingAgent, setSpeakingAgent] = useState<string | null>(null);
  const [allRevealed, setAllRevealed] = useState(false);

  // Stagger the reveal
  useEffect(() => {
    const t = setTimeout(() => setvisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  // Conflux introduces the multi-agent system when team reveal starts
  useEffect(() => {
    if (!visible) return;
    const introText = "Conflux Home is a multi-agent system. Each agent has a specialty, and they work together as your team. Here are the first few agents you'll get to know.";
    const t = setTimeout(() => {
      invoke<{ audio_base64: string }>('tts_speak', {
        text: introText,
        voice: 'TvxTBL9RtGW6tVhl4NoI',
      }).then(result => {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const binaryString = atob(result.audio_base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        ctx.decodeAudioData(bytes.buffer).then(buffer => {
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          const gain = ctx.createGain();
          gain.gain.value = 1.0;
          source.connect(gain);
          gain.connect(ctx.destination);
          source.start(0);
        }).catch(() => {});
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [visible]);

  // Materialize each agent with staggered timing
  useEffect(() => {
    if (!visible) return;
    agents.forEach((agent, i) => {
      const delay = i * 300 + 1000; // stagger + base delay
      setTimeout(() => {
        setMaterializedStates(prev => ({ ...prev, [agent.id]: true }));
      }, delay);
    });
  }, [visible, agents]);

  // Track when all agents are revealed
  useEffect(() => {
    if (!visible) return;
    const totalTime = agents.length * 300 + 1800;
    const t = setTimeout(() => setAllRevealed(true), totalTime);
    return () => clearTimeout(t);
  }, [visible, agents.length]);

  const handleVoiceToggle = useCallback((agentId: string) => {
    if (speakingAgent === agentId) {
      setSpeakingAgent(null);
      onAgentVoice?.(agentId); // stop
    } else {
      setSpeakingAgent(agentId);
      onAgentVoice?.(agentId); // start
      // Auto-stop after 5s
      setTimeout(() => setSpeakingAgent(prev => prev === agentId ? null : prev), 5000);
    }
  }, [speakingAgent, onAgentVoice]);

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
        padding: '24px 24px 40px',
        position: 'relative',
        overflow: 'auto',
        zIndex: 1,
      }}
    >
      {/* Ambient particle canvas */}
      <AmbientParticleCanvas />

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{ textAlign: 'center', marginBottom: 20, position: 'relative', zIndex: 2 }}
      >
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 2,
          color: 'rgba(255,255,255,0.4)',
          marginBottom: 12,
        }}>
          Your Team Is Assembling
        </div>
        <h2 className="hologram-title" style={{
          fontSize: 30,
          fontWeight: 700,
          color: '#fff',
          margin: 0,
          letterSpacing: '-0.5px',
        }}>
          Meet Your Agents
        </h2>
      </motion.div>

      {/* Agent grid — arc layout */}
      <div className="onboarding-v2-agent-grid" style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 16,
        maxWidth: 760,
        marginBottom: 28,
        position: 'relative',
        zIndex: 2,
      }}>
        {agents.map((agent, i) => (
          <HolographicCard
            key={agent.id}
            agent={agent}
            index={i}
            visible={visible}
            materialized={!!materializedStates[agent.id]}
            isSpeaking={speakingAgent === agent.id}
            onVoiceToggle={() => handleVoiceToggle(agent.id)}
          />
        ))}
      </div>

      {/* Continue button */}
      <AnimatePresence>
        {allRevealed && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
            onClick={onComplete}
            className="pulse-energy-button"
            style={{
              padding: '18px 48px',
              borderRadius: 18,
              border: 'none',
              background: 'linear-gradient(135deg, #00d4ff, #6366f1)',
              color: '#fff',
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: 0.5,
              transition: 'transform 0.2s ease',
              position: 'relative',
              zIndex: 2,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = '';
            }}
          >
            Continue →
          </motion.button>
        )}
      </AnimatePresence>

      {/* CSS animations */}
      <style>{`
        @keyframes scanSweep {
          0% { top: 0; }
          100% { top: 100%; }
        }
        @keyframes waveform {
          0% { height: 4px; }
          100% { height: 20px; }
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
