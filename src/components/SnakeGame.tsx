import { useState, useCallback, useRef, useEffect } from 'react';
import {
  playSnakeEat,
  playSnakeTurn,
  playSnakeDeath,
  playSnakeNewBest,
  playSnakeSpeedUp,
} from '../lib/sound';

// ─── Types ───────────────────────────────────────────────────────────────────

type SnakeDifficulty = 'classic' | 'zen' | 'challenge' | 'speedrun';
type GameStatus = 'idle' | 'playing' | 'paused' | 'dead';

interface SnakeGameConfig {
  gridSize: number;
  cellSize: number;
  baseSpeed: number;
  speedIncrement: number;
  minSpeed: number;
  wallsKill: boolean;
  hasObstacles: boolean;
  label: string;
  meta: string;
  icon: string;
}

interface SnakeGameProps {
  onBack: () => void;
}

type Direction = 'up' | 'down' | 'left' | 'right';

interface Position {
  x: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
}

interface TrailSegment {
  x: number;
  y: number;
  createdAt: number;
}

// ─── Difficulty Config ───────────────────────────────────────────────────────

const DIFFICULTY_CONFIG: Record<SnakeDifficulty, SnakeGameConfig> = {
  classic:   { gridSize: 20, cellSize: 20, baseSpeed: 150, speedIncrement: 3, minSpeed: 60, wallsKill: true,  hasObstacles: false, label: 'Classic',    meta: 'Walls kill · Speeds up', icon: '🐍' },
  zen:       { gridSize: 20, cellSize: 20, baseSpeed: 120, speedIncrement: 0, minSpeed: 120, wallsKill: false, hasObstacles: false, label: 'Zen',        meta: 'Wrap around · Chill',    icon: '🧘' },
  challenge: { gridSize: 20, cellSize: 20, baseSpeed: 140, speedIncrement: 4, minSpeed: 70,  wallsKill: true,  hasObstacles: true,  label: 'Challenge',  meta: 'Obstacles · Speeds up',  icon: '⚡' },
  speedrun:  { gridSize: 20, cellSize: 20, baseSpeed: 80,  speedIncrement: 2, minSpeed: 50,  wallsKill: true,  hasObstacles: false, label: 'Speedrun',   meta: 'Starts fast · Faster',   icon: '🏎️' },
};

const CANVAS_SIZE = DIFFICULTY_CONFIG.classic.gridSize * DIFFICULTY_CONFIG.classic.cellSize; // 400

const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };
const DELTA: Record<Direction, Position> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadBestScores(): Record<string, number> {
  try {
    const saved = localStorage.getItem('conflux_snake_best');
    return saved ? JSON.parse(saved) : { classic: 0, zen: 0, challenge: 0, speedrun: 0 };
  } catch {
    return { classic: 0, zen: 0, challenge: 0, speedrun: 0 };
  }
}

function saveBestScores(scores: Record<string, number>) {
  localStorage.setItem('conflux_snake_best', JSON.stringify(scores));
}

function isOnSnake(pos: Position, snake: Position[]): boolean {
  return snake.some(s => s.x === pos.x && s.y === pos.y);
}

function isOnObstacle(pos: Position, obstacles: Position[]): boolean {
  return obstacles.some(o => o.x === pos.x && o.y === pos.y);
}

function randomFreeCell(gridSize: number, snake: Position[], obstacles: Position[]): Position {
  let attempts = 0;
  while (attempts < 1000) {
    const pos = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
    if (!isOnSnake(pos, snake) && !isOnObstacle(pos, obstacles)) return pos;
    attempts++;
  }
  return { x: Math.floor(gridSize / 2), y: 0 };
}

function generateObstacles(count: number, gridSize: number, snake: Position[], existingObstacles: Position[], food: Position): Position[] {
  const newObs: Position[] = [];
  let attempts = 0;
  while (newObs.length < count && attempts < 500) {
    const pos = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
    if (!isOnSnake(pos, snake) && !isOnObstacle(pos, [...existingObstacles, ...newObs]) && !(pos.x === food.x && pos.y === food.y)) {
      newObs.push(pos);
    }
    attempts++;
  }
  return newObs;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SnakeGame({ onBack }: SnakeGameProps) {
  const [status, setStatus] = useState<GameStatus>('playing');
  const [difficulty, setDifficulty] = useState<SnakeDifficulty>('classic');
  const [score, setScore] = useState(0);
  const [bestScores, setBestScores] = useState<Record<string, number>>(loadBestScores);
  const bestScoresRef = useRef(bestScores);
  useEffect(() => { bestScoresRef.current = bestScores; }, [bestScores]);
  const [isNewBest, setIsNewBest] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const tickAccumRef = useRef<number>(0);
  const initMid = Math.floor(DIFFICULTY_CONFIG.classic.gridSize / 2);
  const snakeRef = useRef<Position[]>([
    { x: initMid, y: initMid },
    { x: initMid - 1, y: initMid },
    { x: initMid - 2, y: initMid },
  ]);
  const foodRef = useRef<Position>({ x: initMid + 3, y: initMid });
  const dirRef = useRef<Direction>('right');
  const dirQueueRef = useRef<Direction[]>([]);
  const obstaclesRef = useRef<Position[]>([]);
  const scoreRef = useRef<number>(0);
  const speedRef = useRef<number>(DIFFICULTY_CONFIG.classic.baseSpeed);
  const gameStatusRef = useRef<GameStatus>('playing');
  const particlesRef = useRef<Particle[]>([]);
  const trailsRef = useRef<TrailSegment[]>([]);
  const foodSpawnTimeRef = useRef<number>(performance.now());
  const touchStartRef = useRef<Position | null>(null);
  const dyingRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { gameStatusRef.current = status; }, [status]);

  // ── Sound Effects ────────────────────────────────────────────────────────

  const playSound = useCallback((type: 'eat' | 'turn' | 'speedup' | 'death' | 'newbest') => {
    switch (type) {
      case 'eat': playSnakeEat(); break;
      case 'turn': playSnakeTurn(); break;
      case 'speedup': playSnakeSpeedUp(); break;
      case 'death': playSnakeDeath(); break;
      case 'newbest': playSnakeNewBest(); break;
    }
  }, []);

  // ── Spawn Death Particles ────────────────────────────────────────────────

  const spawnDeathParticles = useCallback((snake: Position[], cellSize: number) => {
    const particles: Particle[] = [];
    const colors = ['#10b981', '#059669', '#047857', '#fbbf24', '#ef4444'];
    for (const seg of snake) {
      const cx = seg.x * cellSize + cellSize / 2;
      const cy = seg.y * cellSize + cellSize / 2;
      for (let i = 0; i < 4; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 0.5 + Math.random() * 0.5,
          radius: 2 + Math.random() * 3,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    }
    particlesRef.current = particles;
  }, []);

  // ── Save Best Score ──────────────────────────────────────────────────────

  const maybeSaveBestScore = useCallback((diff: SnakeDifficulty, newScore: number): boolean => {
    const current = bestScoresRef.current[diff] || 0;
    if (newScore > current) {
      const updated = { ...bestScoresRef.current, [diff]: newScore };
      setBestScores(updated);
      saveBestScores(updated);
      return true;
    }
    return false;
  }, []);

  // ── Reset Game ───────────────────────────────────────────────────────────

  const resetGame = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setStatus('idle');
    setScore(0);
    setIsNewBest(false);
    snakeRef.current = [];
    foodRef.current = { x: 0, y: 0 };
    dirRef.current = 'right';
    dirQueueRef.current = [];
    obstaclesRef.current = [];
    scoreRef.current = 0;
    speedRef.current = DIFFICULTY_CONFIG[difficulty].baseSpeed;
    particlesRef.current = [];
    trailsRef.current = [];
    tickAccumRef.current = 0;
  }, [difficulty]);

  // ── Start Game ───────────────────────────────────────────────────────────

  const startGame = useCallback((diff: SnakeDifficulty) => {
    const config = DIFFICULTY_CONFIG[diff];
    const mid = Math.floor(config.gridSize / 2);
    const initialSnake = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ];

    setDifficulty(diff);
    setScore(0);
    setIsNewBest(false);
    snakeRef.current = initialSnake;
    dirRef.current = 'right';
    dirQueueRef.current = [];
    scoreRef.current = 0;
    speedRef.current = config.baseSpeed;
    particlesRef.current = [];
    trailsRef.current = [];
    tickAccumRef.current = 0;
    dyingRef.current = false;

    let obs: Position[] = [];
    if (config.hasObstacles) {
      obs = generateObstacles(5, config.gridSize, initialSnake, [], { x: -1, y: -1 });
    }
    obstaclesRef.current = obs;

    foodRef.current = randomFreeCell(config.gridSize, initialSnake, obs);
    foodSpawnTimeRef.current = performance.now();

    lastTimeRef.current = performance.now();
    setStatus('playing');
  }, []);

  // ── Direction Handling ───────────────────────────────────────────────────

  const queueDirection = useCallback((newDir: Direction) => {
    const queue = dirQueueRef.current;
    const lastQueued = queue.length > 0 ? queue[queue.length - 1] : dirRef.current;
    if (newDir === OPPOSITE[lastQueued]) return; // can't reverse
    if (newDir === lastQueued) return; // same direction
    if (queue.length < 2) {
      queue.push(newDir);
      playSound('turn');
    }
  }, [playSound]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameStatusRef.current !== 'playing') return;

    const keyMap: Record<string, Direction> = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right',
    };

    const dir = keyMap[e.key];
    if (dir) {
      e.preventDefault();
      queueDirection(dir);
    }

    if (e.key === 'Escape') {
      setStatus(prev => prev === 'playing' ? 'paused' : prev);
    }
  }, [queueDirection]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Touch / Swipe ────────────────────────────────────────────────────────

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (gameStatusRef.current !== 'playing') return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (gameStatusRef.current !== 'playing' || !touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      queueDirection(dx > 0 ? 'right' : 'left');
    } else {
      queueDirection(dy > 0 ? 'down' : 'up');
    }
  }, [queueDirection]);

  // ── D-pad Handler ────────────────────────────────────────────────────────

  const handleDpad = useCallback((dir: Direction) => {
    if (gameStatusRef.current !== 'playing') return;
    queueDirection(dir);
  }, [queueDirection]);

  // ── Game Loop ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (status !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config = DIFFICULTY_CONFIG[difficulty];
    const size = config.gridSize * config.cellSize;

    let running = true;

    const gameLoop = (timestamp: number) => {
      if (!running) return;

      const dt = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Tick accumulator for game logic
      tickAccumRef.current += dt;
      while (tickAccumRef.current >= speedRef.current) {
        tickAccumRef.current -= speedRef.current;
        // Advance game state
        if (dirQueueRef.current.length > 0) {
          const next = dirQueueRef.current.shift()!;
          if (next !== OPPOSITE[dirRef.current]) {
            dirRef.current = next;
          }
        }

        const head = snakeRef.current[0];
        const delta = DELTA[dirRef.current];
        let newHead = { x: head.x + delta.x, y: head.y + delta.y };

        // Wall handling
        if (config.wallsKill) {
          if (newHead.x < 0 || newHead.x >= config.gridSize || newHead.y < 0 || newHead.y >= config.gridSize) {
            // Death — defer status change so particles render
            playSound('death');
            spawnDeathParticles(snakeRef.current, config.cellSize);
            const finalScore = scoreRef.current;
            const wasNewBest = maybeSaveBestScore(difficulty, finalScore);
            setIsNewBest(wasNewBest);
            if (wasNewBest) playSound('newbest');
            dyingRef.current = true;
            break;
          }
        } else {
          // Wrap
          newHead.x = ((newHead.x % config.gridSize) + config.gridSize) % config.gridSize;
          newHead.y = ((newHead.y % config.gridSize) + config.gridSize) % config.gridSize;
        }

        // Self collision
        if (isOnSnake(newHead, snakeRef.current)) {
          playSound('death');
          spawnDeathParticles(snakeRef.current, config.cellSize);
          const finalScore = scoreRef.current;
          const wasNewBest = maybeSaveBestScore(difficulty, finalScore);
          setIsNewBest(wasNewBest);
          if (wasNewBest) playSound('newbest');
          dyingRef.current = true;
          break;
        }

        // Obstacle collision
        if (isOnObstacle(newHead, obstaclesRef.current)) {
          playSound('death');
          spawnDeathParticles(snakeRef.current, config.cellSize);
          const finalScore = scoreRef.current;
          const wasNewBest = maybeSaveBestScore(difficulty, finalScore);
          setIsNewBest(wasNewBest);
          if (wasNewBest) playSound('newbest');
          dyingRef.current = true;
          break;
        }

        // Add trail for tail before moving
        const tail = snakeRef.current[snakeRef.current.length - 1];
        trailsRef.current.push({ x: tail.x, y: tail.y, createdAt: timestamp });

        // Move snake
        snakeRef.current = [newHead, ...snakeRef.current];

        // Check food
        if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
          // Eat — don't remove tail
          scoreRef.current += 1;
          setScore(scoreRef.current);
          playSound('eat');

          // Speed up
          const newSpeed = Math.max(config.minSpeed, speedRef.current - config.speedIncrement);
          if (newSpeed < speedRef.current && config.speedIncrement > 0 && scoreRef.current % 5 === 0) {
            playSound('speedup');
          }
          speedRef.current = newSpeed;

          // Spawn new food
          foodRef.current = randomFreeCell(config.gridSize, snakeRef.current, obstaclesRef.current);
          foodSpawnTimeRef.current = timestamp;

          // Challenge mode: add obstacles every 5 points
          if (config.hasObstacles && scoreRef.current % 5 === 0 && obstaclesRef.current.length < 15) {
            const newObs = generateObstacles(
              Math.min(2, 15 - obstaclesRef.current.length),
              config.gridSize,
              snakeRef.current,
              obstaclesRef.current,
              foodRef.current,
            );
            obstaclesRef.current = [...obstaclesRef.current, ...newObs];
          }
        } else {
          snakeRef.current.pop();
        }
      }

      // ── Render ───────────────────────────────────────────────────────────

      // Clear
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, size, size);

      // Subtle grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= config.gridSize; i++) {
        const p = i * config.cellSize;
        ctx.beginPath();
        ctx.moveTo(p, 0);
        ctx.lineTo(p, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, p);
        ctx.lineTo(size, p);
        ctx.stroke();
      }

      // Draw trails (fading afterglow)
      const trailDuration = 300; // ms
      trailsRef.current = trailsRef.current.filter(t => timestamp - t.createdAt < trailDuration);
      for (const trail of trailsRef.current) {
        const age = (timestamp - trail.createdAt) / trailDuration;
        const alpha = (1 - age) * 0.3;
        ctx.fillStyle = `rgba(16, 185, 129, ${alpha})`;
        const pad = 2;
        ctx.beginPath();
        ctx.roundRect(
          trail.x * config.cellSize + pad,
          trail.y * config.cellSize + pad,
          config.cellSize - pad * 2,
          config.cellSize - pad * 2,
          3,
        );
        ctx.fill();
      }

      // Draw obstacles
      for (const obs of obstaclesRef.current) {
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(obs.x * config.cellSize + 1, obs.y * config.cellSize + 1, config.cellSize - 2, config.cellSize - 2);
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 1;
        ctx.strokeRect(obs.x * config.cellSize + 1, obs.y * config.cellSize + 1, config.cellSize - 2, config.cellSize - 2);
      }

      // Draw snake
      const snake = snakeRef.current;
      for (let i = snake.length - 1; i >= 0; i--) {
        const seg = snake[i];
        const t = snake.length > 1 ? i / (snake.length - 1) : 0;

        if (i === 0) {
          // Head — bright emerald with glow
          ctx.save();
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.roundRect(
            seg.x * config.cellSize + 1,
            seg.y * config.cellSize + 1,
            config.cellSize - 2,
            config.cellSize - 2,
            4,
          );
          ctx.fill();
          ctx.restore();

          // Eyes
          const dir = dirRef.current;
          const cx = seg.x * config.cellSize + config.cellSize / 2;
          const cy = seg.y * config.cellSize + config.cellSize / 2;
          const eyeOffset = 4;
          const eyeRadius = 2.5;
          let eye1x: number, eye1y: number, eye2x: number, eye2y: number;

          switch (dir) {
            case 'right':
              eye1x = cx + 4; eye1y = cy - eyeOffset; eye2x = cx + 4; eye2y = cy + eyeOffset;
              break;
            case 'left':
              eye1x = cx - 4; eye1y = cy - eyeOffset; eye2x = cx - 4; eye2y = cy + eyeOffset;
              break;
            case 'up':
              eye1x = cx - eyeOffset; eye1y = cy - 4; eye2x = cx + eyeOffset; eye2y = cy - 4;
              break;
            case 'down':
              eye1x = cx - eyeOffset; eye1y = cy + 4; eye2x = cx + eyeOffset; eye2y = cy + 4;
              break;
          }

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(eye1x, eye1y, eyeRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(eye2x, eye2y, eyeRadius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Body — gradient from emerald to darker
          const r = Math.round(16 + (4 - 16) * t);
          const g = Math.round(185 + (120 - 185) * t);
          const b = Math.round(129 + (80 - 129) * t);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          const pad = 2;
          ctx.beginPath();
          ctx.roundRect(
            seg.x * config.cellSize + pad,
            seg.y * config.cellSize + pad,
            config.cellSize - pad * 2,
            config.cellSize - pad * 2,
            3,
          );
          ctx.fill();
        }
      }

      // Draw food with pulsing glow
      const food = foodRef.current;
      const pulsePhase = ((timestamp - foodSpawnTimeRef.current) % 1000) / 1000;
      const glow = 8 + Math.sin(pulsePhase * Math.PI * 2) * 8;

      // Food spawn scale animation (0-200ms)
      const spawnAge = timestamp - foodSpawnTimeRef.current;
      let foodScale = 1;
      if (spawnAge < 200) {
        const t = spawnAge / 200;
        // Overshoot easing
        foodScale = t < 1 ? 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2) : 1;
      }

      ctx.save();
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = glow;
      const foodCx = food.x * config.cellSize + config.cellSize / 2;
      const foodCy = food.y * config.cellSize + config.cellSize / 2;
      const foodRadius = (config.cellSize / 2 - 3) * foodScale;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(foodCx, foodCy, foodRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw particles
      const dtSec = dt / 1000;
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dtSec / p.maxLife;
        p.vx *= 0.98;
        p.vy *= 0.98;
        return p.life > 0;
      });

      for (const p of particlesRef.current) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // If dying, render this final frame with particles then transition
      if (dyingRef.current) {
        dyingRef.current = false;
        setStatus('dead');
        return;
      }

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [status, difficulty, spawnDeathParticles]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────

  const config = DIFFICULTY_CONFIG[difficulty];

  return (
    <div className="game-sub-container snake-sub">
      <style>{`
/* ═══════════════════════════════════════════════════════════
   SNAKE — Deep Design Pass
   The Conflux · Cinematic Arcade Experience
   ═══════════════════════════════════════════════════════════ */

/* ── Ambient Background ── */
.snake-sub {
  padding: 28px 24px 120px;
}
.snake-sub::before {
  background:
    radial-gradient(circle at 20% 20%, rgba(16,185,129,0.06) 0%, transparent 40%),
    radial-gradient(circle at 80% 30%, rgba(251,191,36,0.035) 0%, transparent 35%),
    radial-gradient(circle at 50% 75%, rgba(16,185,129,0.04) 0%, transparent 50%),
    radial-gradient(circle at 15% 85%, rgba(251,191,36,0.02) 0%, transparent 40%);
  animation: snake-ambient-drift 22s ease-in-out infinite;
}
@keyframes snake-ambient-drift {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  33% { transform: translate(2%, -1.5%) rotate(0.8deg); }
  66% { transform: translate(-1.5%, 2%) rotate(-0.6deg); }
}

/* ── Hero: Ancient Terminal Header ── */
.snake-sub .game-sub-hero {
  background: linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(6,78,59,0.08) 50%, rgba(251,191,36,0.04) 100%);
  border: 1px solid rgba(16,185,129,0.25);
  box-shadow:
    0 8px 32px rgba(0,0,0,0.3),
    0 0 60px rgba(16,185,129,0.04),
    inset 0 1px 0 rgba(255,255,255,0.04);
  animation: snake-hero-breathe 6s ease-in-out infinite;
}
@keyframes snake-hero-breathe {
  0%, 100% { box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 60px rgba(16,185,129,0.04), inset 0 1px 0 rgba(255,255,255,0.04); }
  50% { box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 80px rgba(16,185,129,0.08), inset 0 1px 0 rgba(255,255,255,0.06); }
}
.snake-sub .game-sub-hero-glow {
  background:
    radial-gradient(circle at 80% 20%, rgba(16,185,129,0.2) 0%, transparent 50%),
    radial-gradient(circle at 20% 80%, rgba(251,191,36,0.06) 0%, transparent 40%);
  animation: snake-hero-glow-pulse 8s ease-in-out infinite;
}
@keyframes snake-hero-glow-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
.snake-sub .game-sub-hero-icon {
  filter: drop-shadow(0 0 16px rgba(16,185,129,0.5)) drop-shadow(0 4px 12px rgba(0,0,0,0.4));
}
.snake-sub .game-sub-hero-title {
  background: linear-gradient(135deg, #10b981 0%, #34d399 50%, #6ee7b7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.snake-sub .game-sub-best {
  animation: snake-best-pulse 3s ease-in-out infinite;
}
@keyframes snake-best-pulse {
  0%, 100% { box-shadow: 0 0 6px rgba(251,191,36,0.3); }
  50% { box-shadow: 0 0 24px rgba(251,191,36,0.6), 0 0 48px rgba(251,191,36,0.2); }
}

/* ── Canvas Wrap: Ancient Terminal Screen ── */
.snake-sub .game-sub-canvas-wrap {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  border-color: rgba(16,185,129,0.3);
  border-width: 2px;
  box-shadow:
    0 0 24px rgba(16,185,129,0.1),
    0 0 72px rgba(16,185,129,0.05),
    0 0 120px rgba(16,185,129,0.02),
    inset 0 0 40px rgba(0,0,0,0.2);
  transition: box-shadow 0.5s ease, border-color 0.5s ease;
}
.snake-sub .game-sub-canvas-wrap:hover {
  border-color: rgba(16,185,129,0.45);
  box-shadow:
    0 0 36px rgba(16,185,129,0.15),
    0 0 100px rgba(16,185,129,0.08),
    0 0 160px rgba(16,185,129,0.03),
    inset 0 0 40px rgba(0,0,0,0.15);
}
.snake-canvas {
  display: block;
}

/* ── HUD: Brass Gauges ── */
.snake-sub .game-sub-hud {
  background: linear-gradient(135deg, rgba(30,20,10,0.7), rgba(20,15,8,0.8));
  border: 1px solid rgba(251,191,36,0.15);
  box-shadow:
    0 4px 20px rgba(0,0,0,0.3),
    inset 0 1px 0 rgba(255,255,255,0.04),
    inset 0 -1px 0 rgba(0,0,0,0.2);
  backdrop-filter: blur(24px) saturate(1.2);
  -webkit-backdrop-filter: blur(24px) saturate(1.2);
}
.snake-sub .game-sub-hud-label {
  color: rgba(251,191,36,0.5);
  font-size: 10px;
  letter-spacing: 2px;
}
.snake-sub .game-sub-hud-value {
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
}

/* ── Overlay: Cinema Screen Reveal ── */
.snake-sub .game-sub-overlay {
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(16px) saturate(0.8);
  -webkit-backdrop-filter: blur(16px) saturate(0.8);
  animation: snake-overlay-in 0.6s ease forwards;
}
@keyframes snake-overlay-in {
  0% { opacity: 0; }
  40% { opacity: 1; }
}
.snake-sub .game-sub-overlay-card {
  background: linear-gradient(160deg, rgba(15,15,20,0.95), rgba(10,10,14,0.98));
  border: 1px solid rgba(16,185,129,0.25);
  box-shadow:
    0 32px 80px rgba(0,0,0,0.7),
    0 0 60px rgba(16,185,129,0.06),
    inset 0 1px 0 rgba(255,255,255,0.05);
  animation: snake-card-dramatic 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
@keyframes snake-card-dramatic {
  0% { opacity: 0; transform: scale(0.7) translateY(30px); filter: blur(8px); }
  100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
}
.snake-sub .game-sub-overlay-title {
  background: linear-gradient(135deg, #10b981, #34d399);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.snake-sub .game-sub-overlay-score {
  color: #10b981;
  text-shadow:
    0 0 20px rgba(16,185,129,0.4),
    0 0 60px rgba(16,185,129,0.15);
  animation: snake-score-glow 2s ease-in-out infinite;
}
@keyframes snake-score-glow {
  0%, 100% { text-shadow: 0 0 20px rgba(16,185,129,0.4), 0 0 60px rgba(16,185,129,0.15); }
  50% { text-shadow: 0 0 30px rgba(16,185,129,0.6), 0 0 80px rgba(16,185,129,0.25); }
}
.snake-sub .game-sub-overlay-newbest {
  background: rgba(251,191,36,0.12);
  border: 1px solid rgba(251,191,36,0.35);
  color: #fbbf24;
  box-shadow: 0 0 20px rgba(251,191,36,0.15);
  animation: snake-newbest-burst 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, snake-newbest-glow 2s ease-in-out 0.7s infinite;
}
@keyframes snake-newbest-burst {
  0% { opacity: 0; transform: scale(0.3) rotate(-10deg); }
  60% { transform: scale(1.15) rotate(2deg); }
  100% { opacity: 1; transform: scale(1) rotate(0); }
}
@keyframes snake-newbest-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(251,191,36,0.15); }
  50% { box-shadow: 0 0 32px rgba(251,191,36,0.35), 0 0 60px rgba(251,191,36,0.1); }
}
.snake-sub .game-sub-overlay-btn.primary {
  background: linear-gradient(135deg, #10b981, #059669);
  box-shadow:
    0 6px 20px rgba(16,185,129,0.35),
    0 0 40px rgba(16,185,129,0.1),
    inset 0 1px 0 rgba(255,255,255,0.15);
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.snake-sub .game-sub-overlay-btn.primary:hover {
  background: linear-gradient(135deg, #34d399, #10b981);
  box-shadow:
    0 8px 28px rgba(16,185,129,0.45),
    0 0 60px rgba(16,185,129,0.15),
    inset 0 1px 0 rgba(255,255,255,0.2);
  transform: scale(1.07) translateY(-2px);
}
.snake-sub .game-sub-overlay-btn.primary:active {
  transform: scale(0.97);
  box-shadow: 0 2px 8px rgba(16,185,129,0.3);
}

/* ── D-Pad: Tactile Arcade Buttons ── */
.snake-sub .game-sub-dpad-btn {
  border-color: rgba(16,185,129,0.2);
  color: #10b981;
  background: rgba(16,185,129,0.06);
  box-shadow:
    0 2px 8px rgba(0,0,0,0.3),
    inset 0 1px 0 rgba(255,255,255,0.06),
    inset 0 -2px 0 rgba(0,0,0,0.15);
  transition: all 0.1s ease;
}
.snake-sub .game-sub-dpad-btn:active {
  background: rgba(16,185,129,0.2);
  box-shadow:
    0 0 4px rgba(0,0,0,0.3),
    inset 0 2px 4px rgba(0,0,0,0.3);
  transform: scale(0.92);
}

/* ── Controls Hint ── */
.snake-sub .game-sub-controls {
  color: rgba(16,185,129,0.35);
  letter-spacing: 1.5px;
  font-size: 12px;
}

/* ── Back Button ── */
.snake-sub .game-sub-back {
  border-color: rgba(16,185,129,0.15);
  color: rgba(16,185,129,0.6);
  transition: all 0.25s ease;
}
.snake-sub .game-sub-back:hover {
  border-color: rgba(16,185,129,0.35);
  color: #10b981;
  box-shadow: 0 4px 16px rgba(16,185,129,0.1);
}
`}</style>

      {/* Hero Section */}
      <div className="game-sub-hero">
        <div className="game-sub-hero-icon">🐍</div>
        <div className="game-sub-hero-info">
          <h2 className="game-sub-hero-title">Snake</h2>
          <p className="game-sub-hero-subtitle">Classic arcade · Eat, grow, survive</p>
        </div>
        {bestScores[difficulty] > 0 && (
          <div className="game-sub-best" style={{background:'rgba(52,211,153,0.12)',border:'1px solid rgba(52,211,153,0.25)',color:'#10b981'}}>🏆 {bestScores[difficulty]}</div>
        )}
        <div className="game-sub-hero-glow" />
      </div>

      {/* Mode Pills */}
      <div style={{display:'flex',gap:'8px',justifyContent:'center',flexWrap:'wrap',marginBottom:'8px'}}>
        {(Object.keys(DIFFICULTY_CONFIG) as SnakeDifficulty[]).map(diff => (
          <button key={diff} onClick={() => startGame(diff)} style={{padding:'6px 14px',borderRadius:'20px',border: diff === difficulty ? '1px solid #10b981' : '1px solid rgba(52,211,153,0.25)',background: diff === difficulty ? 'rgba(52,211,153,0.15)' : 'rgba(52,211,153,0.05)',color: diff === difficulty ? '#10b981' : 'var(--text-muted)',cursor:'pointer',fontSize:'13px',fontWeight: diff === difficulty ? 600 : 400,transition:'all 0.2s'}}>
            {DIFFICULTY_CONFIG[diff].icon} {DIFFICULTY_CONFIG[diff].label}
          </button>
        ))}
      </div>

      {/* HUD + Canvas */}
      {(
        <>
          <div className="game-sub-hud">
            <div className="game-sub-hud-left">
              <span className="game-sub-hud-label">Score</span>
              <span className="game-sub-hud-value" style={{color:'#10b981'}}>🍎 {score}</span>
            </div>
            <div className="game-sub-hud-center">
              <span className="game-sub-hud-value" style={{fontSize:'16px',color:'#10b981'}}>{config.label}</span>
            </div>
            <div className="game-sub-hud-right">
              <span className="game-sub-hud-label">Best</span>
              <span className="game-sub-hud-value" style={{color:'#fbbf24',fontSize:'16px'}}>🏆 {bestScores[difficulty] || 0}</span>
            </div>
          </div>

          <div className="game-sub-canvas-wrap"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <canvas
              ref={canvasRef}
              className="snake-canvas"
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              style={{ width: '100%', maxWidth: CANVAS_SIZE, aspectRatio: '1' }}
            />

            {/* Game Over Overlay */}
            {status === 'dead' && (
              <div className="game-sub-overlay">
                <div className="game-sub-overlay-card">
                  <div style={{fontSize:'48px'}}>💀</div>
                  <div className="game-sub-overlay-title">Game Over</div>
                  <div className="game-sub-overlay-score">{score}</div>
                  {isNewBest && <div className="game-sub-overlay-newbest">🎉 New Best!</div>}
                  <div className="game-sub-overlay-actions">
                    <button className="game-sub-overlay-btn primary" onClick={() => startGame(difficulty)}>Play Again</button>
                  </div>
                </div>
              </div>
            )}

            {/* Paused Overlay */}
            {status === 'paused' && (
              <div className="game-sub-overlay">
                <div className="game-sub-overlay-card">
                  <div style={{fontSize:'48px'}}>⏸</div>
                  <div className="game-sub-overlay-title">Paused</div>
                  <div className="game-sub-overlay-actions">
                    <button className="game-sub-overlay-btn primary" onClick={() => setStatus('playing')}>Resume</button>
                    <button className="game-sub-overlay-btn secondary" onClick={resetGame}>Quit</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Controls Hint */}
          <div className="game-sub-controls">Arrow keys / WASD / Swipe</div>

          {/* D-pad for mobile */}
          <div className="game-sub-dpad">
            <button className="game-sub-dpad-btn game-sub-dpad-up" onClick={() => handleDpad('up')}>▲</button>
            <button className="game-sub-dpad-btn game-sub-dpad-left" onClick={() => handleDpad('left')}>◀</button>
            <button className="game-sub-dpad-btn game-sub-dpad-right" onClick={() => handleDpad('right')}>▶</button>
            <button className="game-sub-dpad-btn game-sub-dpad-down" onClick={() => handleDpad('down')}>▼</button>
          </div>
        </>
      )}

      <button className="game-sub-back" onClick={onBack}>← Games Hub</button>
    </div>
  );
}
