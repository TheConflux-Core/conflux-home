/**
 * Onboarding V2 — The Complete Experience
 * 
 * Orchestrates the full onboarding sequence:
 *   1. Awakening (Three.js 3D scene) → name captured
 *   2. Name step (HolographicInput with NeuralBrainScene)
 *   3. Team Reveal (AgentMaterialize with real avatars)
 *   4. Ice Breaker (chat-style input)
 *   5. Build (WorldForge with agent-driven construction)
 * 
 * Interface matches Onboarding.tsx exactly:
 *   onComplete(goals: string[], selectedApps: string[]) => void
 * 
 * SAFETY: This file is completely self-contained. It imports nothing
 * from the old Onboarding.tsx. The old file remains untouched.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import AwakeningScene from './AwakeningScene';
import HolographicInput from './HolographicInput';
import AgentMaterialize, { ONBOARDING_AGENTS } from './AgentMaterialize';
import WorldForge from './WorldForge';
import { playAgentAppear, playTeamAliveNew } from '../../lib/onboarding-sounds';
import { useAuth } from '../../hooks/useAuth';

/** Cached voices (loaded async) */
let cachedVoices: SpeechSynthesisVoice[] = [];
function loadVoices() {
  cachedVoices = window.speechSynthesis.getVoices();
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
}

/** Per-agent voice settings for distinct personalities (Web Speech API fallback) */
const AGENT_VOICE_CONFIG: Record<string, { pitch: number; rate: number; volume: number; preferredNames: string[] }> = {
  conflux: { pitch: 1.05, rate: 0.92, volume: 0.85, preferredNames: ['Google US English', 'Samantha', 'Daniel', 'Alex'] },
  helix:   { pitch: 1.1,  rate: 0.95, volume: 0.8,  preferredNames: ['Google UK English Female', 'Karen', 'Victoria'] },
  pulse:   { pitch: 1.0,  rate: 0.98, volume: 0.8,  preferredNames: ['Google US English', 'Samantha', 'Allison'] },
  hearth:  { pitch: 1.15, rate: 0.9,  volume: 0.85, preferredNames: ['Google US English', 'Samantha', 'Ava'] },
  echo:    { pitch: 1.08, rate: 0.88, volume: 0.8,  preferredNames: ['Google UK English Female', 'Karen', 'Fiona'] },
  aegis:   { pitch: 0.85, rate: 0.9,  volume: 0.9,  preferredNames: ['Google US English', 'Daniel', 'Tom'] },
  viper:   { pitch: 0.75, rate: 1.0,  volume: 0.85, preferredNames: ['Google US English', 'Daniel', 'Fred'] },
};

// ── ElevenLabs Agent Voice IDs ─────────────────────────────
const AGENT_VOICE_IDS: Record<string, string> = {
  conflux: 'TvxTBL9RtGW6tVhl4NoI',
  helix:   'NQMJRVvPew6HsaebYnZj',
  pulse:   'iLVmqjzCGGvqtMCk6vVQ',
  hearth:  'W7iR5kTNHozpIl2Jqq15',
  echo:    'EST9Ui6982FZPSi7gCHi',
  aegis:   'WtA85syCrJwasGeHGH2p',
  viper:   'Mtmp3KhFIjYpWYRycDe3',
};

// ── Base64 Audio Playback ──────────────────────────────────
let _currentAudio: HTMLAudioElement | null = null;

function stopCurrentAudio() {
  if (_currentAudio) {
    _currentAudio.pause();
    _currentAudio.src = '';
    _currentAudio = null;
  }
}

let _boostCtx: AudioContext | null = null;
function getBoostCtx(): AudioContext {
  if (!_boostCtx) {
    _boostCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (_boostCtx.state === 'suspended') _boostCtx.resume();
  return _boostCtx;
}

function playBase64Audio(base64: string): Promise<void> {
  return new Promise((resolve, reject) => {
    stopCurrentAudio();
    try {
      const ctx = getBoostCtx();
      const binaryString = atob(base64);
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
        source.onended = () => resolve();
      }).catch(reject);
    } catch (e) {
      reject(e);
    }
  });
}

// ── ElevenLabs TTS via Rust backend ────────────────────────
async function speakAgentLineElevenLabs(agentId: string): Promise<void> {
  const agent = ONBOARDING_AGENTS.find(a => a.id === agentId);
  if (!agent) return;
  const voiceId = AGENT_VOICE_IDS[agentId] || AGENT_VOICE_IDS.conflux;
  try {
    const result = await invoke<{ audio_base64: string }>('tts_speak', {
      text: agent.voiceLine,
      voice: voiceId,
    });
    await playBase64Audio(result.audio_base64);
  } catch (err) {
    console.warn(`[Onboarding] ElevenLabs TTS failed for ${agentId}, falling back to Web Speech:`, err);
    // Fallback to Web Speech API
    speakAgentLineWebSpeech(agentId);
  }
}

// ── Web Speech API fallback ────────────────────────────────
function speakAgentLineWebSpeech(agentId: string) {
  const agent = ONBOARDING_AGENTS.find(a => a.id === agentId);
  if (!agent || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  const config = AGENT_VOICE_CONFIG[agentId] || AGENT_VOICE_CONFIG.conflux;
  const utterance = new SpeechSynthesisUtterance(agent.voiceLine);
  utterance.rate = config.rate;
  utterance.pitch = config.pitch;
  utterance.volume = config.volume;

  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  let bestVoice: SpeechSynthesisVoice | null = null;
  for (const name of config.preferredNames) {
    bestVoice = voices.find(v => v.name.includes(name)) || null;
    if (bestVoice) break;
  }
  if (!bestVoice) bestVoice = voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
  if (bestVoice) utterance.voice = bestVoice;

  window.speechSynthesis.speak(utterance);
}

// Public API: try ElevenLabs first, fallback to Web Speech
async function speakAgentLine(agentId: string): Promise<void> {
  return speakAgentLineElevenLabs(agentId);
}

/** Speak arbitrary text with a specific agent's voice (ElevenLabs) */
async function speakTextWithAgent(text: string, agentId: string): Promise<void> {
  const voiceId = AGENT_VOICE_IDS[agentId] || AGENT_VOICE_IDS.conflux;
  try {
    const result = await invoke<{ audio_base64: string }>('tts_speak', {
      text,
      voice: voiceId,
    });
    await playBase64Audio(result.audio_base64);
  } catch (err) {
    console.warn(`[Onboarding] TTS failed for text:`, err);
  }
}

/** Ensure audio context is ready (must be called on user gesture) */
let audioPrimed = false;
function primeAudio() {
  if (audioPrimed) return;
  audioPrimed = true;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') ctx.resume();
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }
  } catch (_) { /* best effort */ }
  try {
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch (_) { /* best effort */ }
}

// ── Types ──────────────────────────────────────────────────

interface OnboardingV2Props {
  onComplete: (goals: string[], selectedApps: string[]) => void;
}

type Step = 'awakening' | 'name' | 'team' | 'icebreaker' | 'build' | 'complete';

// ── App suggestion from ice breaker answer ─────────────────

function suggestApps(answer: string): string[] {
  const lower = answer.toLowerCase();
  const picks: string[] = [];

  if (/money|budget|save|spend|financ|income|expense|invest|debt|bill|pay/.test(lower)) picks.push('pulse');
  if (/cook|food|meal|recipe|kitchen|diet|eat|grocer|pantry|nutrit/.test(lower)) picks.push('hearth');
  if (/goal|dream|learn|want|aspir|plan|build|start|achieve/.test(lower)) picks.push('horizon');
  if (/habit|routine|organiz|task|daily|schedul|time|focus/.test(lower)) picks.push('orbit');

  if (picks.length === 0) return ['pulse', 'hearth', 'horizon'];
  return picks.slice(0, 3);
}

// ── Particles background ───────────────────────────────────

function Particles({ count = 16, color = '#6366f1' }: { count?: number; color?: string }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, () => ({
      left: `${3 + Math.random() * 94}%`,
      size: 1.5 + Math.random() * 2.5,
      duration: 5 + Math.random() * 6,
      delay: Math.random() * 4,
      opacity: 0.08 + Math.random() * 0.2,
      drift: (Math.random() - 0.5) * 40,
    })), [count]
  );

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            bottom: '-4px',
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: color,
            opacity: p.opacity,
            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
            '--dx': `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ── Progress dots ──────────────────────────────────────────

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
      padding: '20px 0 0',
      position: 'absolute',
      top: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10,
    }}>
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === step;
        const isDone = i < step;
        return (
          <motion.div
            key={i}
            animate={{
              width: isActive ? 32 : 10,
              backgroundColor: isDone || isActive ? '#00d4ff' : 'rgba(255,255,255,0.15)',
              opacity: isDone || isActive ? 1 : 0.4,
            }}
            transition={{ duration: 0.3 }}
            style={{
              height: 10,
              borderRadius: 5,
            }}
          />
        );
      })}
    </div>
  );
}

// ── Ice Breaker Component ──────────────────────────────────

/** Canvas-based particle system that reacts to typing */
function IceBreakerParticles({ typing }: { typing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const typingRef = useRef(typing);
  typingRef.current = typing;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let w = 0, h = 0;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: 1 + Math.random() * 2.5,
      color: ['#00d4ff', '#6366f1', '#00cc88', '#a78bfa', '#f59e0b'][Math.floor(Math.random() * 5)],
      alpha: 0.15 + Math.random() * 0.3,
      pulse: Math.random() * Math.PI * 2,
    }));

    let pulseWave = 0; // expanding ring from center on type

    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      const t = Date.now() * 0.001;

      // Pulse wave when typing
      if (typingRef.current) {
        pulseWave += 3;
        if (pulseWave > Math.max(w, h)) pulseWave = 0;
      }

      // Draw pulse wave
      if (pulseWave > 0) {
        const gradient = ctx.createRadialGradient(w / 2, h / 2, pulseWave - 40, w / 2, h / 2, pulseWave);
        gradient.addColorStop(0, 'rgba(0, 212, 255, 0)');
        gradient.addColorStop(0.5, 'rgba(0, 212, 255, 0.06)');
        gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      }

      for (const p of particles) {
        // Attract toward center when typing
        if (typingRef.current) {
          const dx = w / 2 - p.x;
          const dy = h / 2 - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 100) {
            p.vx += (dx / dist) * 0.02;
            p.vy += (dy / dist) * 0.02;
          }
        }

        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99;
        p.vy *= 0.99;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        const alpha = p.alpha * (0.5 + 0.5 * Math.sin(t * 1.5 + p.pulse));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      // Draw connections between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = particles[i].color;
            ctx.globalAlpha = 0.08 * (1 - dist / 120);
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
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}

function IceBreaker({
  userName,
  onComplete,
}: {
  userName: string;
  onComplete: (answer: string) => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [confluxSpeaking, setConfluxSpeaking] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const rippleIdRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 800);
    // Conflux introduces his role via ElevenLabs
    const greetingTimer = setTimeout(() => {
      setConfluxSpeaking(true);
      speakTextWithAgent(
        `Alright${userName ? ', ' + userName : ''}! So, I coordinate your agent team to make sure nothing falls through the cracks. I learn what matters to you and connect you with the right agent for the job. What's the first thing you'd like to tackle?`,
        'conflux'
      ).catch(() => {}).finally(() => setConfluxSpeaking(false));
    }, 1200);
    return () => { clearTimeout(t); clearTimeout(greetingTimer); stopCurrentAudio(); setConfluxSpeaking(false); };
  }, [userName]);

  const handleSubmit = useCallback(() => {
    if (!inputValue.trim()) return;
    onComplete(inputValue.trim());
  }, [inputValue, onComplete]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    setIsTyping(true);

    // Spawn a ripple effect on each keystroke
    if (e.target.value.length > inputValue.length) {
      const id = rippleIdRef.current++;
      const x = 30 + Math.random() * 40;
      const y = 30 + Math.random() * 40;
      setRipples(prev => [...prev, { id, x, y }]);
      setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 900);
    }
  }, [inputValue]);

  // Waveform bars for "listening" effect
  const waveBars = useMemo(() =>
    Array.from({ length: 32 }, (_, i) => ({
      delay: i * 0.04,
      maxHeight: 12 + Math.random() * 24,
    })),
    []
  );

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
      {/* Canvas particle background — reacts to typing */}
      <IceBreakerParticles typing={isTyping} />

      {/* Energy field background */}
      <div className="energy-field" />

      {/* Consciousness expanding radial behind avatar */}
      <motion.div
        animate={{
          scale: isTyping ? [1, 1.3, 1.1] : 1,
          opacity: isTyping ? [0.15, 0.3, 0.2] : 0.1,
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,255,0.15) 0%, rgba(99,102,241,0.08) 40%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Typing ripples */}
      {ripples.map(r => (
        <div
          key={r.id}
          className="typing-ripple"
          style={{ left: `${r.x}%`, top: `${r.y}%` }}
        />
      ))}

      {/* Conflux greeting */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          marginBottom: 40,
          maxWidth: 480,
          textAlign: 'center',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Larger avatar with orbiting particles */}
        <div style={{ position: 'relative', width: 120, height: 120 }}>
          <img
            src="/avatars/conflux.webp"
            alt="Conflux"
            className="breathing-glow"
            style={{
              width: 120,
              height: 120,
              borderRadius: 30,
              border: '2px solid rgba(0,212,255,0.4)',
              filter: 'drop-shadow(0 0 30px rgba(0,212,255,0.3))',
            }}
          />
          {/* Orbiting dots */}
          {[0, 1, 2, 3].map(i => (
            <motion.div
              key={i}
              animate={{ rotate: 360 }}
              transition={{ duration: 4 + i, repeat: Infinity, ease: 'linear', delay: i * 0.5 }}
              style={{
                position: 'absolute',
                inset: -10,
                pointerEvents: 'none',
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: ['#00d4ff', '#6366f1', '#00cc88', '#a78bfa'][i],
                boxShadow: `0 0 12px ${['#00d4ff', '#6366f1', '#00cc88', '#a78bfa'][i]}`,
                transform: 'translateX(-50%)',
              }} />
            </motion.div>
          ))}
        </div>
        <div style={{
          fontSize: 26,
          fontWeight: 700,
          color: '#fff',
          lineHeight: 1.4,
          textShadow: '0 0 30px rgba(0,212,255,0.2)',
        }}>
          Welcome Home {userName || 'there'}!
        </div>
        <div style={{
          fontSize: 16,
          color: 'rgba(255,255,255,0.65)',
          lineHeight: 1.6,
        }}>
          {confluxSpeaking ? 'Introducing myself...' : 'What would you like to start with?'}
        </div>
      </motion.div>

      {/* Chat-style input with holographic border */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        style={{
          width: '90%',
          maxWidth: 480,
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Holographic border container */}
        <div className="holographic-input-container">
          <div className="input-inner" style={{
            display: 'flex',
            gap: 12,
            alignItems: 'flex-end',
            padding: '4px',
          }}>
            <textarea
              ref={inputRef}
              placeholder="e.g., I want to get my finances in order..."
              value={inputValue}
              onChange={handleChange}
              onBlur={() => setIsTyping(false)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              rows={2}
              style={{
                flex: 1,
                padding: '14px 18px',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '1rem',
                color: '#e2e8f0',
                resize: 'none',
                lineHeight: 1.5,
                caretColor: '#00d4ff',
                fontFamily: 'inherit',
              }}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={!inputValue.trim()}
              style={{
                padding: '14px 20px',
                borderRadius: 14,
                border: 'none',
                background: inputValue.trim()
                  ? 'linear-gradient(135deg, #00d4ff, #6366f1)'
                  : 'rgba(255,255,255,0.05)',
                color: inputValue.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                fontSize: 16,
                fontWeight: 700,
                cursor: inputValue.trim() ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              →
            </motion.button>
          </div>
        </div>

        {/* Waveform — only visible while Conflux is speaking via TTS */}
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{
            opacity: confluxSpeaking ? 1 : 0,
            height: confluxSpeaking ? 48 : 0,
          }}
          transition={{ duration: 0.3 }}
          className="waveform-viz active"
          style={{ marginTop: 16 }}
        >
          {waveBars.map((bar, i) => (
            <div
              key={i}
              className="wave-bar"
              style={{
                '--wave-max': `${bar.maxHeight}px`,
                animationDelay: `${bar.delay}s`,
                height: confluxSpeaking ? `${bar.maxHeight * 0.7}px` : '4px',
              } as React.CSSProperties}
            />
          ))}
        </motion.div>

        {/* Typing indicator — show when user is typing and Conflux is done speaking */}
        <AnimatePresence>
          {isTyping && !confluxSpeaking && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                marginTop: 8,
                fontSize: 12,
                color: 'rgba(0,212,255,0.5)',
                paddingLeft: 4,
              }}
            >
              Conflux is listening...
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Suggestions — glowing pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        style={{
          marginTop: 28,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 10,
          maxWidth: 480,
          position: 'relative',
          zIndex: 2,
        }}
      >
        {['Get my finances in order', 'Eat healthier meals', 'Track my goals', 'Organize my life'].map((suggestion) => (
          <button
            key={suggestion}
            className="glow-chip"
            onClick={() => {
              setInputValue(suggestion);
              setIsTyping(true);
            }}
          >
            {suggestion}
          </button>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ── Main Orchestrator ──────────────────────────────────────

export default function OnboardingV2({ onComplete }: OnboardingV2Props) {
  const [step, setStep] = useState<Step>('awakening');
  const [userName, setUserName] = useState('');
  const [iceBreakerAnswer, setIceBreakerAnswer] = useState('');
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const { user } = useAuth();

  // Prime audio on first user interaction (browser autoplay policy)
  useEffect(() => {
    const handler = () => { primeAudio(); };
    document.addEventListener('click', handler, { once: true });
    document.addEventListener('keydown', handler, { once: true });
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('keydown', handler);
    };
  }, []);

  // ── Background soundscape (crossfade: 0002 → 0007) ────────
  const soundscapeRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const audio1 = new Audio('/soundscape-onboarding-0002.mp3');
    audio1.loop = true;
    audio1.volume = 0.3;
    soundscapeRef.current = audio1;
    audio1.play().catch(() => {});

    // After 50s, crossfade: fade out 0002 over 10s, fade in 0007 over 10s
    const crossfadeTimer = setTimeout(() => {
      const audio2 = new Audio('/soundscape-onboarding-0007.mp3');
      audio2.loop = true;
      audio2.volume = 0;
      audio2.play().catch(() => {});

      const steps = 100;
      const interval = 10000 / steps;
      let i = 0;
      const fade = setInterval(() => {
        i++;
        const t = i / steps;
        audio1.volume = 0.3 * (1 - t);
        audio2.volume = 0.05 * t;
        if (i >= steps) {
          clearInterval(fade);
          audio1.pause();
          audio1.src = '';
          soundscapeRef.current = audio2;
        }
      }, interval);
    }, 50000);

    return () => {
      clearTimeout(crossfadeTimer);
      const a = soundscapeRef.current;
      if (a) { a.pause(); a.src = ''; }
      soundscapeRef.current = null;
    };
  }, []);

  // Step: awakening → name
  const handleAwakeningComplete = useCallback((name: string) => {
    setUserName(name);
    localStorage.setItem('conflux-name', name);
    // If they gave a name in the awakening, skip the name step
    if (name && name !== 'Friend') {
      setStep('team');
    } else {
      setStep('name');
    }
  }, []);

  // Step: name → team
  const handleNameComplete = useCallback((name: string) => {
    setUserName(name);
    localStorage.setItem('conflux-name', name);
    setStep('team');
  }, []);

  // Step: team → icebreaker
  const handleTeamComplete = useCallback(() => {
    stopCurrentAudio();
    playTeamAliveNew();
    setStep('icebreaker');
  }, []);

  // Step: icebreaker → build
  const handleIceBreakerComplete = useCallback((answer: string) => {
    setIceBreakerAnswer(answer);
    const apps = suggestApps(answer);
    setSelectedApps(apps);
    setStep('build');
  }, []);

  // Step: build → complete → parent callback
  const handleBuildComplete = useCallback(async () => {
    // Fade out soundscape over 3 seconds
    const audio = soundscapeRef.current;
    if (audio) {
      const startVol = audio.volume;
      const steps = 30;
      const interval = 3000 / steps;
      let i = 0;
      const fade = setInterval(() => {
        i++;
        audio.volume = startVol * (1 - i / steps);
        if (i >= steps) {
          clearInterval(fade);
          audio.pause();
          audio.src = '';
          soundscapeRef.current = null;
        }
      }, interval);
    }

    // Save name
    localStorage.setItem('conflux-name', userName);

    // Save selected agents
    if (!localStorage.getItem('conflux-selected-agents')) {
      localStorage.setItem('conflux-selected-agents', JSON.stringify(
        ONBOARDING_AGENTS.map(a => a.id)
      ));
    }

    setStep('complete');

    // Call parent completion
    setTimeout(() => {
      onComplete([iceBreakerAnswer], selectedApps);
    }, 300);
  }, [userName, iceBreakerAnswer, selectedApps, onComplete]);

  // Determine which progress step we're on
  const progressStep = useMemo(() => {
    switch (step) {
      case 'awakening': return 0;
      case 'name': return 0;
      case 'team': return 1;
      case 'icebreaker': return 2;
      case 'build': return 3;
      case 'complete': return 4;
      default: return 0;
    }
  }, [step]);

  return (
    <div className="onboarding-v2-root" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100%',
      background: 'var(--bg-primary, #0a0a0f)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Global particles */}
      {step !== 'awakening' && <Particles count={12} color="#6366f1" />}

      {/* Progress dots (after awakening) */}
      {step !== 'awakening' && step !== 'complete' && (
        <ProgressDots step={progressStep} total={4} />
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {step === 'awakening' && (
          <motion.div key="awakening" style={{ flex: 1 }}>
            <AwakeningScene onComplete={handleAwakeningComplete} />
          </motion.div>
        )}

        {step === 'name' && (
          <motion.div key="name" style={{ flex: 1 }}>
            <HolographicInput onComplete={handleNameComplete} userName={userName} />
          </motion.div>
        )}

        {step === 'team' && (
          <motion.div key="team" style={{ flex: 1 }}>
            <AgentMaterialize
              agents={ONBOARDING_AGENTS}
              onComplete={handleTeamComplete}
              onAgentVoice={(agentId) => {
                playAgentAppear(agentId);
                speakAgentLine(agentId);
              }}
            />
          </motion.div>
        )}

        {step === 'icebreaker' && (
          <motion.div key="icebreaker" style={{ flex: 1 }}>
            <IceBreaker
              userName={userName}
              onComplete={handleIceBreakerComplete}
            />
          </motion.div>
        )}

        {step === 'build' && (
          <motion.div key="build" style={{ flex: 1 }}>
            <WorldForge
              selectedApps={selectedApps}
              onComplete={handleBuildComplete}
              userName={userName}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Float animation for particles */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-50vh) translateX(var(--dx, 0px)); }
        }
      `}</style>
    </div>
  );
}
