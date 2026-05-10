/**
 * The Awakening — Canvas Engine
 *
 * Full-screen canvas that renders the awakening sequence:
 *   Phase 1: Void        — pure black, then a single breathing photon
 *   Phase 2: Signal       — photon grows, energy tendrils branch outward
 *   Phase 3: Breath       — brain form breathes, agent-colored particles drift
 *   Phase 4: Question     — "Who are you?" + light-beam input (HTML overlay)
 *   Phase 5: Ignition     — name absorbed, shockwave, team assembly
 */

import {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import {
  initAwakeningAudio, startDrone, modulateDrone, playTendrilSpark,
  startBreathPad, setBreathIntensity, setDroneBreath,
  playKeystroke, setDroneQuestionMode,
  playIgnition, playAgentTone, playResolutionChord,
  fadeOutAll, stopAwakeningAudio, fadeOutPad,
} from './AwakeningAudio';
import '../../styles/awakening.css';

// ── Types ──────────────────────────────────────────────────

interface Props {
  onComplete: (name: string) => void;
}

type Phase = 'void' | 'signal' | 'breath' | 'question' | 'ignition';

interface Tendril {
  x: number; y: number;
  vx: number; vy: number;
  speed: number;
  width: number;
  length: number;
  maxLength: number;
  alpha: number;
  hue: number;
  branches: TendrilBranch[];
  branchTimer: number;
  path: { x: number; y: number }[];
  done: boolean;
}

interface TendrilBranch {
  x: number; y: number;
  vx: number; vy: number;
  width: number;
  length: number;
  maxLength: number;
  alpha: number;
  hue: number;
  path: { x: number; y: number }[];
  done: boolean;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  color: string;
  alpha: number;
  fadeRate: number;
  life: number;
}

interface Ripple {
  x: number; y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

// ── Constants ──────────────────────────────────────────────

const AGENT_COLORS = ['#10b981', '#f59e0b', '#a78bfa', '#3b82f6', '#ec4899', '#ef4444', '#06b6d4'];
const AGENT_NAMES = ['Conflux', 'Helix', 'Pulse', 'Hearth', 'Echo', 'Aegis', 'Viper'];
const AGENT_COUNT = AGENT_COLORS.length; // 7 real nodes;
const PHASE_TIMINGS = { void: 2000, signal: 3000, breath: 3000, question: 8000, ignition: 4000 };
const HEARTBEAT_BPM = 72;
const HEARTBEAT_PERIOD = 60000 / HEARTBEAT_BPM;

// ── Generate shuffled connection pairs for the web ──

function generateConnectionPairs(): { from: number; to: number; alpha: number; drawn: boolean }[] {
  const pairs: { from: number; to: number; alpha: number; drawn: boolean }[] = [];
  const n = AGENT_COUNT; // 7 real nodes
  const center = n; // index 7 = center virtual node

  // All pairs between real nodes
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      pairs.push({ from: i, to: j, alpha: 0, drawn: false });
    }
  }
  // Each real node ↔ center
  for (let i = 0; i < n; i++) {
    pairs.push({ from: i, to: center, alpha: 0, drawn: false });
  }
  // Shuffle (Fisher-Yates)
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs;
}

// ── Component ──────────────────────────────────────────────

export default function AwakeningCanvas({ onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<Phase>('void');
  const timeRef = useRef(0);
  const phaseStartTimeRef = useRef(0);
  const animFrameRef = useRef(0);

  // Visual state
  const photonRef = useRef({ radius: 2, targetRadius: 2, glow: 20 });
  const tendrilsRef = useRef<Tendril[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const breathPhaseRef = useRef({ inhale: true, progress: 0 });
  const sparkTimerRef = useRef(0);

  // Ignition state
  const ignitionRef = useRef({
    progress: 0,
    shockwaveRadius: 0,
    shockwaveAlpha: 0,
    flashAlpha: 0,
    agentNodes: [] as {
      x: number; y: number; radius: number; alpha: number; targetRadius: number;
      nameAlpha: number;
    }[],
    connectionAlpha: 0,
    connectionQueue: [] as { from: number; to: number; alpha: number; drawn: boolean }[],
    connectionIndex: 0,
    lastConnectionTime: 0,
    handoffDone: false, // guard: only call onComplete once
  });

  // Guard: only fire ignition completion once
  const ignitionCompleteRef = useRef(false);
  // Track when the canvas fade actually started (for overlay alpha calc)
  const fadeStartTimeRef = useRef(0);

  // Refs for callbacks used in the animation loop (avoids useEffect re-runs)
  const advancePhaseRef = useRef<() => void>(() => {});
  const spawnTendrilRef = useRef<(angle: number) => void>(() => {});
  const spawnExhaleRef = useRef<() => void>(() => {});
  const fadingOutRef = useRef(false);

  // Name input state
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputValueRef = useRef('');
  const keyCountRef = useRef(0);

  // Fade out state
  const [fadingOut, setFadingOut] = useState(false);
  // Keep ref in sync for animation loop closure
  fadingOutRef.current = fadingOut;
  // Keep inputValue ref in sync (animation loop reads from ref, not stale closure)
  inputValueRef.current = inputValue;

  // Canvas dimensions
  const dimensionsRef = useRef({ w: window.innerWidth, h: window.innerHeight });

  // ── Phase transitions ──

  const advancePhase = useCallback(() => {
    const current = phaseRef.current;
    const now = performance.now();

    switch (current) {
      case 'void':
        phaseRef.current = 'signal';
        photonRef.current.targetRadius = 30;
        startDrone();
        break;

      case 'signal':
        phaseRef.current = 'breath';
        startBreathPad();
        break;

      case 'breath':
        phaseRef.current = 'question';
        setDroneQuestionMode();
        fadeOutPad();
        setShowInput(true);
        setTimeout(() => inputRef.current?.focus(), 1200);
        break;

      case 'question':
        // Only advance on explicit user action (Enter key)
        return;

      case 'ignition':
        // Ignition completes → fade out and call onComplete
        fadeOutAll();
        setFadingOut(true);
        setTimeout(() => {
          stopAwakeningAudio();
          onComplete(inputValueRef.current.trim() || 'Friend');
        }, 800);
        return;
    }

    phaseStartTimeRef.current = now;
  }, [inputValue, onComplete]);

  // Keep refs in sync with latest callbacks
  advancePhaseRef.current = advancePhase;

  // ── Handle name submission ──

  const handleSubmit = useCallback(() => {
    if (!inputValue.trim()) return;
    phaseRef.current = 'ignition';
    phaseStartTimeRef.current = performance.now();
    setShowInput(false);

    // Disintegrate input text into particles (visual effect handled in render)
    ignitionCompleteRef.current = false;
    fadeStartTimeRef.current = 0;
    ignitionRef.current = {
      progress: 0,
      shockwaveRadius: 0,
      shockwaveAlpha: 0,
      flashAlpha: 0,
      agentNodes: AGENT_COLORS.map((_, i) => {
        const angle = (i / AGENT_COLORS.length) * Math.PI * 2 - Math.PI / 2;
        const orbitRadius = Math.min(dimensionsRef.current.w, dimensionsRef.current.h) * 0.22;
        return {
          x: dimensionsRef.current.w / 2 + Math.cos(angle) * orbitRadius,
          y: dimensionsRef.current.h / 2 + Math.sin(angle) * orbitRadius,
          radius: 0,
          alpha: 0,
          targetRadius: 14,
          nameAlpha: 0,
        };
      }),
      connectionAlpha: 0,
      connectionQueue: [],
      connectionIndex: 0,
      lastConnectionTime: 0,
      handoffDone: false,
    };

    playIgnition();
  }, [inputValue]);

  // ── Keystroke handler ──

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      handleSubmit();
      return;
    }

    keyCountRef.current += 1;
    playKeystroke();

    // Spawn ripple at center (canvas coordinates)
    const { w, h } = dimensionsRef.current;
    ripplesRef.current.push({
      x: w / 2 + (Math.random() - 0.5) * 100,
      y: h / 2 + (Math.random() - 0.5) * 100,
      radius: 0,
      maxRadius: 60 + Math.random() * 40,
      alpha: 0.4,
    });
  }, [inputValue, handleSubmit]);

  // ── Spawn tendrils ──

  const spawnTendril = useCallback((angle: number) => {
    const { w, h } = dimensionsRef.current;
    const cx = w / 2;
    const cy = h / 2;
    const speed = 1.2 + Math.random() * 0.8;
    const hue = 190 + Math.random() * 40; // cyan → blue range

    tendrilsRef.current.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      speed,
      width: 1.5 + Math.random(),
      length: 0,
      maxLength: Math.min(w, h) * (0.3 + Math.random() * 0.2),
      alpha: 0.8,
      hue,
      branches: [],
      branchTimer: 0,
      path: [{ x: cx, y: cy }],
      done: false,
    });
  }, []);

  // ── Spawn agent-colored particles ──

  const spawnExhaleParticles = useCallback(() => {
    const { w, h } = dimensionsRef.current;
    const cx = w / 2;
    const cy = h / 2;
    const count = 4 + Math.floor(Math.random() * 4);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.5;
      const color = AGENT_COLORS[Math.floor(Math.random() * AGENT_COLORS.length)];

      particlesRef.current.push({
        x: cx + (Math.random() - 0.5) * 100,
        y: cy + (Math.random() - 0.5) * 100,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 1 + Math.random() * 2,
        color,
        alpha: 0.5 + Math.random() * 0.4,
        fadeRate: 0.0005 + Math.random() * 0.001,
        life: 1,
      });
    }
  }, []);

  // Keep refs in sync
  spawnTendrilRef.current = spawnTendril;
  spawnExhaleRef.current = spawnExhaleParticles;

  // ── Main animation loop ──

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    initAwakeningAudio();

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dimensionsRef.current = { w: window.innerWidth, h: window.innerHeight };
    };
    resize();
    window.addEventListener('resize', resize);

    phaseStartTimeRef.current = phaseStartTimeRef.current || performance.now();
    timeRef.current = timeRef.current || 0;
    let lastExhaleSpawn = 0;
    let lastFrameTime = performance.now();

    // ── Phase auto-advancement timers ──
    const phaseTimers: ReturnType<typeof setTimeout>[] = [];
    let cumulative = 0;
    for (const [phase, duration] of Object.entries(PHASE_TIMINGS)) {
      if (phase === 'question' || phase === 'ignition') continue; // user-triggered
      cumulative += duration;
      phaseTimers.push(setTimeout(() => advancePhaseRef.current(), cumulative));
    }

    const animate = () => {
      const now = performance.now();
      const dt = now - lastFrameTime;
      lastFrameTime = now;
      timeRef.current += dt;
      const t = timeRef.current;
      const phaseElapsed = now - phaseStartTimeRef.current;
      const phase = phaseRef.current;
      const { w, h } = dimensionsRef.current;
      const cx = w / 2;
      const cy = h / 2;

      // Clear
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      // ── PHASE: VOID ──
      if (phase === 'void') {
        const photon = photonRef.current;
        const heartbeat = Math.sin((t / HEARTBEAT_PERIOD) * Math.PI * 2);
        const beatScale = 1 + heartbeat * 0.3;
        const r = photon.radius * beatScale;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 212, 255, 0.6)';
        ctx.shadowBlur = 20 + heartbeat * 10;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = '#00d4ff';
        ctx.fill();
        ctx.restore();
      }

      // ── PHASE: SIGNAL ──
      if (phase === 'signal') {
        const p = Math.min(phaseElapsed / PHASE_TIMINGS.signal, 1);
        const photon = photonRef.current;

        // Smooth radius growth
        photon.radius += (photon.targetRadius - photon.radius) * 0.02;

        // Draw photon
        const heartbeat = Math.sin((t / HEARTBEAT_PERIOD) * Math.PI * 2);
        const r = photon.radius * (1 + heartbeat * 0.15);

        ctx.save();
        ctx.shadowColor = `rgba(0, 212, 255, ${0.5 + p * 0.3})`;
        ctx.shadowBlur = 25 + p * 15;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        gradient.addColorStop(0, '#00d4ff');
        gradient.addColorStop(0.5, 'rgba(0, 212, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.6)');
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();

        // Spawn tendrils over time
        sparkTimerRef.current += dt;
        if (sparkTimerRef.current > 120 && tendrilsRef.current.length < 12) {
          sparkTimerRef.current = 0;
          const angle = Math.random() * Math.PI * 2;
          spawnTendrilRef.current(angle);
          playTendrilSpark();
        }
      }

      // ── PHASE: BREATH ──
      if (phase === 'breath') {
        const p = Math.min(phaseElapsed / PHASE_TIMINGS.breath, 1);
        const photon = photonRef.current;
        photon.radius += (35 - photon.radius) * 0.015;

        // Breathing cycle (3s period)
        const breathProgress = (t % 3000) / 3000;
        const inhale = breathProgress < 0.5;
        const breathT = inhale ? breathProgress * 2 : (1 - breathProgress) * 2;
        breathPhaseRef.current = { inhale, progress: breathT };

        // Modulate audio
        setBreathIntensity(breathT);
        setDroneBreath(breathT);

        // Spawn particles on exhale
        if (!inhale && t - lastExhaleSpawn > 300) {
          lastExhaleSpawn = t;
          spawnExhaleRef.current();
        }

        // Draw breathing photon
        const breathScale = 0.95 + breathT * 0.1;
        const r = photon.radius * breathScale;

        ctx.save();
        ctx.shadowColor = `rgba(0, 212, 255, ${0.4 + breathT * 0.3})`;
        ctx.shadowBlur = 30 + breathT * 20;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        gradient.addColorStop(0, `rgba(0, 212, 255, ${0.9 + breathT * 0.1})`);
        gradient.addColorStop(0.6, `rgba(99, 102, 241, ${0.6 + breathT * 0.2})`);
        gradient.addColorStop(1, `rgba(167, 139, 250, ${0.3 + breathT * 0.2})`);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();

        // Radial pulse wave (every exhale peak)
        if (breathT > 0.8 && inhale === false) {
          ripplesRef.current.push({
            x: cx, y: cy,
            radius: 0,
            maxRadius: Math.max(w, h) * 0.5,
            alpha: 0.15,
          });
        }
      }

      // ── PHASE: QUESTION ──
      if (phase === 'question') {
        // Dimmed background — tendrils and particles drift slowly
        const photon = photonRef.current;
        photon.radius += (30 - photon.radius) * 0.01;

        // Slow heartbeat
        const heartbeat = Math.sin((t / (HEARTBEAT_PERIOD * 1.3)) * Math.PI * 2);
        const r = photon.radius * (1 + heartbeat * 0.08);

        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.shadowColor = 'rgba(0, 212, 255, 0.3)';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = '#00d4ff';
        ctx.fill();
        ctx.restore();

        // Keystroke-driven particle bursts (handled in handleKeyDown)
      }

      // ── PHASE: IGNITION ──
      if (phase === 'ignition') {
        const ig = ignitionRef.current;
        const elapsed = phaseElapsed;

        // Flash (0-200ms)
        if (elapsed < 200) {
          ig.flashAlpha = Math.sin((elapsed / 200) * Math.PI);
        } else {
          ig.flashAlpha = Math.max(0, ig.flashAlpha - 0.05);
        }

        // Shockwave (100-800ms)
        if (elapsed > 100 && elapsed < 800) {
          const sp = (elapsed - 100) / 700;
          ig.shockwaveRadius = sp * Math.max(w, h);
          ig.shockwaveAlpha = 1 - sp;
        } else if (elapsed >= 800) {
          ig.shockwaveAlpha = 0;
        }

        // Agent nodes — staggered appearance, each animates over 400ms
        ig.agentNodes.forEach((node, i) => {
          const nodeDelay = 1000 + i * 350;
          if (elapsed > nodeDelay) {
            const nodeP = Math.min((elapsed - nodeDelay) / 400, 1);
            node.radius = node.targetRadius * nodeP;
            node.alpha = nodeP;
            // Name tooltip fades in after node is fully visible
            if (nodeP >= 1) {
              node.nameAlpha = Math.min((elapsed - nodeDelay - 400) / 400, 1);
            }
            // Play tone on first appearance
            if (nodeP > 0.01 && nodeP < 0.05) {
              playAgentTone(i);
            }
          }
        });

        // ── EVENT: All nodes fully visible → start connection web ──
        const allNodesReady = ig.agentNodes.length > 0 &&
          ig.agentNodes.every(n => n.alpha >= 1);

        if (allNodesReady && ig.connectionQueue.length === 0) {
          ig.connectionQueue = generateConnectionPairs();
          ig.lastConnectionTime = elapsed;
        }

        // Draw connections one at a time, accelerating
        if (ig.connectionQueue.length > 0 && ig.connectionIndex < ig.connectionQueue.length) {
          const baseGap = 400;
          const gap = Math.max(80, baseGap * Math.pow(0.7, ig.connectionIndex));
          if (elapsed - ig.lastConnectionTime > gap) {
            ig.connectionQueue[ig.connectionIndex].drawn = true;
            ig.connectionQueue[ig.connectionIndex].alpha = 0.5;
            ig.connectionIndex++;
            ig.lastConnectionTime = elapsed;

            // Refill queue when running low — keeps the web growing
            if (ig.connectionIndex >= ig.connectionQueue.length - 2) {
              const more = generateConnectionPairs();
              ig.connectionQueue.push(...more);
            }
          }
        }

        // Fade in drawn connections
        ig.connectionQueue.forEach(conn => {
          if (conn.drawn && conn.alpha < 0.5) {
            conn.alpha = Math.min(conn.alpha + 0.02, 0.5);
          }
        });

        // Fade out names + connections during canvas fade
        if (fadingOutRef.current) {
          ig.agentNodes.forEach(node => { node.nameAlpha = Math.max(0, node.nameAlpha - 0.008); });
          ig.connectionQueue.forEach(conn => { conn.alpha = Math.max(0, conn.alpha - 0.006); });
        }

        // ── After enough time with connections, start the fade ──
        // Connections start ~3.4s into ignition. Give them 4s of drawing, then fade.
        if (!fadingOutRef.current && !ignitionCompleteRef.current && allNodesReady && elapsed > 7400) {
          ignitionCompleteRef.current = true;
          fadeStartTimeRef.current = elapsed;
          fadingOutRef.current = true;
          fadeOutAll();
          setFadingOut(true);
        }

        // ── When overlay is fully black, hand off to team intro ──
        if (fadingOutRef.current && fadeStartTimeRef.current > 0 && !ig.handoffDone) {
          const fadeProgress = Math.min((elapsed - fadeStartTimeRef.current) / 2000, 1);
          if (fadeProgress >= 1) {
            ig.handoffDone = true;
            stopAwakeningAudio();
            onComplete(inputValueRef.current.trim() || 'Friend');
          }
        }

        // Resolution chord
        if (elapsed > 3200 && elapsed < 3250) {
          playResolutionChord();
        }

        // Render

        // Flash
        if (ig.flashAlpha > 0) {
          ctx.save();
          ctx.fillStyle = `rgba(0, 212, 255, ${ig.flashAlpha * 0.6})`;
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
        }

        // Background glow
        const bgP = Math.min(elapsed / 2000, 1);
        if (bgP > 0) {
          const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
          gradient.addColorStop(0, `rgba(0, 212, 255, ${bgP * 0.08})`);
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.save();
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
        }

        // Central photon (reborn, brighter)
        if (elapsed > 500) {
          const rebirthP = Math.min((elapsed - 500) / 500, 1);
          const r = 25 * rebirthP;
          ctx.save();
          ctx.shadowColor = `rgba(0, 212, 255, ${rebirthP * 0.8})`;
          ctx.shadowBlur = 40;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          grad.addColorStop(0, `rgba(0, 212, 255, ${rebirthP})`);
          grad.addColorStop(1, `rgba(99, 102, 241, ${rebirthP * 0.5})`);
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.restore();
        }

        // Connection lines (from queue)
        ctx.save();
        ctx.lineCap = 'round';
        ig.connectionQueue.forEach(conn => {
          if (!conn.drawn || conn.alpha <= 0) return;
          const fromNode = conn.from === AGENT_COUNT ? null : ig.agentNodes[conn.from];
          const toNode = conn.to === AGENT_COUNT ? null : ig.agentNodes[conn.to];
          const fromX = fromNode ? fromNode.x : cx;
          const fromY = fromNode ? fromNode.y : cy;
          const toX = toNode ? toNode.x : cx;
          const toY = toNode ? toNode.y : cy;
          if (!fromNode && conn.from !== AGENT_COUNT) return;
          if (!toNode && conn.to !== AGENT_COUNT) return;
          ctx.beginPath();
          ctx.moveTo(fromX, fromY);
          ctx.lineTo(toX, toY);
          ctx.strokeStyle = `rgba(0, 212, 255, ${conn.alpha})`;
          ctx.lineWidth = 1;
          ctx.shadowColor = `rgba(0, 212, 255, ${conn.alpha * 0.5})`;
          ctx.shadowBlur = 4;
          ctx.stroke();
        });
        ctx.restore();

        // Agent nodes + name tooltips
        ig.agentNodes.forEach((node, i) => {
          if (node.radius < 0.5) return;

          // Node circle
          ctx.save();
          ctx.shadowColor = AGENT_COLORS[i];
          ctx.shadowBlur = 15;
          ctx.globalAlpha = node.alpha;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.fillStyle = AGENT_COLORS[i];
          ctx.fill();
          ctx.restore();

          // Name tooltip
          if (node.nameAlpha > 0 && AGENT_NAMES[i]) {
            ctx.save();
            ctx.globalAlpha = node.nameAlpha;
            ctx.font = '600 11px Inter, sans-serif';
            ctx.textAlign = 'center';

            const isBottom = node.y > cy;
            const labelY = isBottom ? node.y + node.radius + 18 : node.y - node.radius - 8;
            const pointerY = isBottom ? node.y + node.radius + 3 : node.y - node.radius - 3;

            // Pointer line
            ctx.beginPath();
            ctx.moveTo(node.x, pointerY);
            ctx.lineTo(node.x, labelY + (isBottom ? -4 : 10));
            ctx.strokeStyle = AGENT_COLORS[i];
            ctx.lineWidth = 1;
            ctx.globalAlpha = node.nameAlpha * 0.5;
            ctx.stroke();

            // Label background
            const textWidth = ctx.measureText(AGENT_NAMES[i]).width;
            const padX = 8;
            const padY = 4;
            const bgX = node.x - textWidth / 2 - padX;
            const bgY = labelY - 8 - padY;
            const bgW = textWidth + padX * 2;
            const bgH = 16 + padY * 2;

            ctx.globalAlpha = node.nameAlpha * 0.85;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.roundRect(bgX, bgY, bgW, bgH, 4);
            ctx.fill();

            // Label text
            ctx.globalAlpha = node.nameAlpha;
            ctx.fillStyle = AGENT_COLORS[i];
            ctx.fillText(AGENT_NAMES[i], node.x, labelY);
            ctx.restore();
          }
        });

        // Shockwave (on top of everything)
        if (ig.shockwaveAlpha > 0) {
          ctx.save();
          ctx.strokeStyle = `rgba(255, 255, 255, ${ig.shockwaveAlpha * 0.8})`;
          ctx.lineWidth = 2;
          ctx.shadowColor = `rgba(0, 212, 255, ${ig.shockwaveAlpha * 0.5})`;
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(cx, cy, ig.shockwaveRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Black overlay — LAST thing drawn, covers everything for fade-to-black
        if (fadingOutRef.current && fadeStartTimeRef.current > 0) {
          const fadeElapsed = elapsed - fadeStartTimeRef.current;
          const fadeAlpha = Math.min(fadeElapsed / 2000, 1);
          ctx.save();
          ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
        }
      }

      // ── RENDER TENDRILS (all phases except void) ──
      if (phase !== 'void') {
        const isDimmed = phase === 'question' || phase === 'ignition';
        const baseAlpha = isDimmed ? 0.12 : 1;

        tendrilsRef.current.forEach(tendril => {
          if (tendril.done) return;

          // Grow
          if (tendril.length < tendril.maxLength) {
            // Add wobble to direction
            const wobble = (Math.random() - 0.5) * 0.15;
            const angle = Math.atan2(tendril.vy, tendril.vx) + wobble;
            tendril.vx = Math.cos(angle) * tendril.speed;
            tendril.vy = Math.sin(angle) * tendril.speed;

            tendril.x += tendril.vx;
            tendril.y += tendril.vy;
            tendril.length += tendril.speed;
            tendril.path.push({ x: tendril.x, y: tendril.y });

            // Branching
            tendril.branchTimer += dt;
            if (tendril.branchTimer > 500 && tendril.branches.length < 2 &&
                tendril.length > tendril.maxLength * 0.3) {
              tendril.branchTimer = 0;
              const bAngle = angle + (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.6);
              tendril.branches.push({
                x: tendril.x, y: tendril.y,
                vx: Math.cos(bAngle) * tendril.speed * 0.8,
                vy: Math.sin(bAngle) * tendril.speed * 0.8,
                width: tendril.width * 0.6,
                length: 0,
                maxLength: tendril.maxLength * 0.5,
                alpha: 0.5,
                hue: tendril.hue + (Math.random() - 0.5) * 30,
                path: [{ x: tendril.x, y: tendril.y }],
                done: false,
              });
            }
          } else {
            tendril.done = true;
          }

          // Render main tendril
          if (tendril.path.length > 1) {
            ctx.save();
            ctx.globalAlpha = baseAlpha;
            ctx.lineCap = 'round';

            // Trail (gradient from tip to origin)
            for (let i = 1; i < tendril.path.length; i++) {
              const segAlpha = (i / tendril.path.length) * tendril.alpha;
              ctx.beginPath();
              ctx.moveTo(tendril.path[i - 1].x, tendril.path[i - 1].y);
              ctx.lineTo(tendril.path[i].x, tendril.path[i].y);
              ctx.strokeStyle = `hsla(${tendril.hue}, 80%, 60%, ${segAlpha * 0.4})`;
              ctx.lineWidth = tendril.width * (i / tendril.path.length);
              ctx.stroke();
            }

            // Bright tip
            const tip = tendril.path[tendril.path.length - 1];
            ctx.beginPath();
            ctx.arc(tip.x, tip.y, tendril.width + 1, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${tendril.hue}, 90%, 70%, ${tendril.alpha})`;
            ctx.shadowColor = `hsla(${tendril.hue}, 90%, 60%, 0.8)`;
            ctx.shadowBlur = 8;
            ctx.fill();

            ctx.restore();
          }

          // Render branches
          tendril.branches.forEach(branch => {
            if (branch.done) return;

            if (branch.length < branch.maxLength) {
              const wobble = (Math.random() - 0.5) * 0.2;
              const angle = Math.atan2(branch.vy, branch.vx) + wobble;
              branch.vx = Math.cos(angle) * tendril.speed * 0.8;
              branch.vy = Math.sin(angle) * tendril.speed * 0.8;
              branch.x += branch.vx;
              branch.y += branch.vy;
              branch.length += tendril.speed * 0.8;
              branch.path.push({ x: branch.x, y: branch.y });
            } else {
              branch.done = true;
            }

            if (branch.path.length > 1) {
              ctx.save();
              ctx.globalAlpha = baseAlpha;
              ctx.lineCap = 'round';
              for (let i = 1; i < branch.path.length; i++) {
                const segAlpha = (i / branch.path.length) * branch.alpha;
                ctx.beginPath();
                ctx.moveTo(branch.path[i - 1].x, branch.path[i - 1].y);
                ctx.lineTo(branch.path[i].x, branch.path[i].y);
                ctx.strokeStyle = `hsla(${branch.hue}, 70%, 55%, ${segAlpha * 0.3})`;
                ctx.lineWidth = branch.width * (i / branch.path.length);
                ctx.stroke();
              }

              const tip = branch.path[branch.path.length - 1];
              ctx.beginPath();
              ctx.arc(tip.x, tip.y, branch.width + 0.5, 0, Math.PI * 2);
              ctx.fillStyle = `hsla(${branch.hue}, 80%, 65%, ${branch.alpha})`;
              ctx.shadowColor = `hsla(${branch.hue}, 80%, 55%, 0.6)`;
              ctx.shadowBlur = 6;
              ctx.fill();
              ctx.restore();
            }
          });
        });
      }

      // ── RENDER PARTICLES ──
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.fadeRate;
        if (p.life <= 0) return;

        const alpha = p.alpha * p.life;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();
      });

      // ── RENDER RIPPLES ──
      ripplesRef.current = ripplesRef.current.filter(r => r.alpha > 0.01);
      ripplesRef.current.forEach(ripple => {
        ripple.radius += 2;
        ripple.alpha *= 0.96;

        ctx.save();
        ctx.strokeStyle = `rgba(0, 212, 255, ${ripple.alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      phaseTimers.forEach(clearTimeout);
      window.removeEventListener('resize', resize);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="awakening-root">
      <canvas ref={canvasRef} className="awakening-canvas" />

      {/* Logo + Title (appears during signal phase) */}
      <img src="/logo_icon_cropped.png" alt="" className="awakening-logo" />
      <div className="awakening-title">Conflux Home</div>

      {/* Name input overlay (question phase) */}
      {showInput && (
        <div className="awakening-name-overlay">
          <div className="awakening-question-text">Who are you?</div>
          <div className="awakening-input-wrap">
            <input
              ref={inputRef}
              className="awakening-input"
              type="text"
              placeholder="Your name..."
              value={inputValue}
              onChange={e => {
                setInputValue(e.target.value);
                if (!showHint && e.target.value.length > 0) setShowHint(true);
              }}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <div className="awakening-input-beam" />
          </div>
          <div className={`awakening-submit-hint${showHint ? ' visible' : ''}`}>
            Press <kbd>Enter</kbd> to awaken your team
          </div>
        </div>
      )}
    </div>
  );
}
