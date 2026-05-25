import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  playMinesweeperReveal,
  playMinesweeperFlag,
  playMinesweeperExplode,
  playMinesweeperCascade,
  playMinesweeperWin,
} from '../lib/sound';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Tile {
  row: number;
  col: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
  cascadeDelay?: number;
  isExploded?: boolean;
}

type GameState = 'idle' | 'playing' | 'won' | 'lost';
type Difficulty = 'beginner' | 'intermediate' | 'expert';

interface MinesweeperGameProps {
  onBack: () => void;
}

// ─── Difficulty Config ───────────────────────────────────────────────────────

const DIFFICULTY_CONFIG: Record<Difficulty, { rows: number; cols: number; mines: number; label: string; meta: string }> = {
  beginner:     { rows: 9,  cols: 9,  mines: 10, label: 'Beginner',     meta: '9×9 · 10 mines' },
  intermediate: { rows: 16, cols: 16, mines: 40, label: 'Intermediate', meta: '16×16 · 40 mines' },
  expert:       { rows: 16, cols: 30, mines: 99, label: 'Expert',       meta: '16×30 · 99 mines' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createEmptyBoard(rows: number, cols: number): Tile[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      row: r,
      col: c,
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacentMines: 0,
    }))
  );
}

function getNeighbors(row: number, col: number, rows: number, cols: number): [number, number][] {
  const neighbors: [number, number][] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        neighbors.push([nr, nc]);
      }
    }
  }
  return neighbors;
}

function placeMines(board: Tile[][], safeRow: number, safeCol: number, mineCount: number): Tile[][] {
  const rows = board.length;
  const cols = board[0].length;
  const safeZone = new Set<string>();

  // Exclude clicked cell and its neighbors
  safeZone.add(`${safeRow},${safeCol}`);
  for (const [nr, nc] of getNeighbors(safeRow, safeCol, rows, cols)) {
    safeZone.add(`${nr},${nc}`);
  }

  // Collect valid positions
  const positions: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!safeZone.has(`${r},${c}`)) {
        positions.push([r, c]);
      }
    }
  }

  // Shuffle and pick mine positions
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  const minesToPlace = Math.min(mineCount, positions.length);
  const newBoard = board.map(row => row.map(tile => ({ ...tile })));

  for (let i = 0; i < minesToPlace; i++) {
    const [r, c] = positions[i];
    newBoard[r][c].isMine = true;
  }

  // Calculate adjacent mine counts
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (newBoard[r][c].isMine) continue;
      let count = 0;
      for (const [nr, nc] of getNeighbors(r, c, rows, cols)) {
        if (newBoard[nr][nc].isMine) count++;
      }
      newBoard[r][c].adjacentMines = count;
    }
  }

  return newBoard;
}

function floodReveal(board: Tile[][], row: number, col: number): Tile[][] {
  const rows = board.length;
  const cols = board[0].length;
  const newBoard = board.map(r => r.map(t => ({ ...t })));

  const queue: [number, number, number][] = [[row, col, 0]];
  const visited = new Set<string>();
  visited.add(`${row},${col}`);

  while (queue.length > 0) {
    const [r, c, dist] = queue.shift()!;
    const tile = newBoard[r][c];
    if (tile.isRevealed || tile.isFlagged) continue;
    tile.isRevealed = true;
    tile.cascadeDelay = dist * 30;

    if (tile.adjacentMines === 0 && !tile.isMine) {
      for (const [nr, nc] of getNeighbors(r, c, rows, cols)) {
        const key = `${nr},${nc}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push([nr, nc, dist + 1]);
        }
      }
    }
  }

  return newBoard;
}

function checkWin(board: Tile[][]): boolean {
  for (const row of board) {
    for (const tile of row) {
      if (!tile.isMine && !tile.isRevealed) return false;
    }
  }
  return true;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MinesweeperGame({ onBack }: MinesweeperGameProps) {
  const [gameState, setGameState] = useState<GameState>('playing');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [board, setBoard] = useState<Tile[][]>([]);
  const [mineCount, setMineCount] = useState(0);
  const [flagCount, setFlagCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [firstClick, setFirstClick] = useState(true);
  const [muted, setMuted] = useState(false);
  const [bestTimes, setBestTimes] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('conflux_minesweeper_best');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTargetRef = useRef<{ row: number; col: number } | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // ── Timer Management ─────────────────────────────────────────────────────

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Sound Effects ────────────────────────────────────────────────────────

  const playSound = useCallback((type: 'reveal' | 'flag' | 'explode' | 'win' | 'cascade') => {
    if (muted) return;
    switch (type) {
      case 'reveal': playMinesweeperReveal(); break;
      case 'flag': playMinesweeperFlag(); break;
      case 'explode': playMinesweeperExplode(); break;
      case 'cascade': playMinesweeperCascade(); break;
      case 'win': playMinesweeperWin(); break;
    }
  }, [muted]);

  // ── Save Best Time ───────────────────────────────────────────────────────

  const saveBestTime = useCallback((diff: string, time: number) => {
    setBestTimes(prev => {
      const current = prev[diff];
      if (!current || time < current) {
        const updated = { ...prev, [diff]: time };
        localStorage.setItem('conflux_minesweeper_best', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
  }, []);

  // ── Game Actions ─────────────────────────────────────────────────────────

  const resetGame = useCallback(() => {
    stopTimer();
    setGameState('playing');
    setBoard([]);
    setTimer(0);
    setFlagCount(0);
    setFirstClick(true);
    setShowFlash(false);
    setIsShaking(false);
  }, [stopTimer]);

  const startGame = useCallback((diff: Difficulty) => {
    const config = DIFFICULTY_CONFIG[diff];
    const emptyBoard = createEmptyBoard(config.rows, config.cols);
    setBoard(emptyBoard);
    setDifficulty(diff);
    setMineCount(config.mines);
    setFlagCount(0);
    setTimer(0);
    setFirstClick(true);
    setGameState('playing');
    setShowFlash(false);
    setIsShaking(false);
    stopTimer();
  }, [stopTimer]);

  const handleLeftClick = useCallback((row: number, col: number) => {
    if (gameState !== 'playing') return;
    const tile = board[row]?.[col];
    if (!tile || tile.isRevealed || tile.isFlagged) return;

    // First click: place mines, ensure safe
    if (firstClick) {
      const config = DIFFICULTY_CONFIG[difficulty];
      const newBoard = placeMines(board, row, col, config.mines);
      setFirstClick(false);
      startTimer();

      // Reveal the clicked tile on the new board
      const clickedTile = newBoard[row][col];
      if (clickedTile.isMine) {
        // Shouldn't happen with safe zone, but just in case
        clickedTile.isExploded = true;
        newBoard.forEach(r => r.forEach(t => { if (t.isMine) t.isRevealed = true; }));
        setBoard(newBoard);
        setGameState('lost');
        setIsShaking(true);
        setShowFlash(true);
        setTimeout(() => setIsShaking(false), 400);
        setTimeout(() => setShowFlash(false), 500);
        stopTimer();
        playSound('explode');
        return;
      }

      let revealedBoard: Tile[][];
      if (clickedTile.adjacentMines === 0) {
        revealedBoard = floodReveal(newBoard, row, col);
        playSound('cascade');
      } else {
        revealedBoard = newBoard.map(r => r.map(t => ({ ...t })));
        revealedBoard[row][col].isRevealed = true;
        playSound('reveal');
      }

      setBoard(revealedBoard);

      if (checkWin(revealedBoard)) {
        setGameState('won');
        stopTimer();
        playSound('win');
        saveBestTime(difficulty, 0);
      }
      return;
    }

    // Normal click
    if (tile.isMine) {
      const newBoard = board.map(r => r.map(t => ({ ...t })));
      newBoard[row][col].isRevealed = true;
      newBoard[row][col].isExploded = true;
      // Reveal all mines
      newBoard.forEach(r => r.forEach(t => { if (t.isMine) t.isRevealed = true; }));
      setBoard(newBoard);
      setGameState('lost');
      setIsShaking(true);
      setShowFlash(true);
      setTimeout(() => setIsShaking(false), 400);
      setTimeout(() => setShowFlash(false), 500);
      stopTimer();
      playSound('explode');
      return;
    }

    let newBoard: Tile[][];
    if (tile.adjacentMines === 0) {
      newBoard = floodReveal(board, row, col);
      playSound('cascade');
    } else {
      newBoard = board.map(r => r.map(t => ({ ...t })));
      newBoard[row][col].isRevealed = true;
      playSound('reveal');
    }

    setBoard(newBoard);

    if (checkWin(newBoard)) {
      setGameState('won');
      stopTimer();
      playSound('win');
      saveBestTime(difficulty, timer);
    }
  }, [gameState, board, firstClick, difficulty, timer, startTimer, stopTimer, playSound, saveBestTime]);

  const handleRightClick = useCallback((row: number, col: number) => {
    if (gameState !== 'playing') return;
    const tile = board[row]?.[col];
    if (!tile || tile.isRevealed) return;

    const newBoard = board.map(r => r.map(t => ({ ...t })));
    newBoard[row][col].isFlagged = !newBoard[row][col].isFlagged;
    setBoard(newBoard);

    const newFlagCount = newBoard.flat().filter(t => t.isFlagged).length;
    setFlagCount(newFlagCount);
    playSound('flag');
  }, [gameState, board, playSound]);

  // ── Long-press to flag ───────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // left click only
    const target = e.currentTarget as HTMLElement;
    const row = parseInt(target.dataset.row ?? '-1', 10);
    const col = parseInt(target.dataset.col ?? '-1', 10);
    if (row < 0 || col < 0) return;

    longPressTargetRef.current = { row, col };
    longPressTimerRef.current = setTimeout(() => {
      // Long press triggered — flag the tile
      handleRightClick(row, col);
      longPressTargetRef.current = null;
    }, 300);
  }, [handleRightClick]);

  const handleMouseUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressTargetRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  // ── Tile Rendering ───────────────────────────────────────────────────────

  const getTileClass = useCallback((tile: Tile): string => {
    const classes = ['minesweeper-tile'];
    if (tile.isFlagged && !tile.isRevealed) {
      classes.push('tile-flagged');
    } else if (!tile.isRevealed) {
      classes.push('tile-hidden');
    } else if (tile.isMine) {
      classes.push(tile.isExploded ? 'tile-mine-exploded' : 'tile-mine');
    } else {
      classes.push('tile-revealed');
      if (tile.adjacentMines > 0) {
        classes.push(`tile-num-${tile.adjacentMines}`);
      }
    }
    return classes.join(' ');
  }, []);

  const getTileContent = useCallback((tile: Tile): string => {
    if (tile.isFlagged && !tile.isRevealed) return '🚩';
    if (!tile.isRevealed) return '';
    if (tile.isMine) return '💣';
    if (tile.adjacentMines > 0) return String(tile.adjacentMines);
    return '';
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────

  const config = DIFFICULTY_CONFIG[difficulty];
  const showOverlay = gameState === 'won' || gameState === 'lost';

  // Initialize game on mount
  useEffect(() => {
    startGame('beginner');
  }, []);

  return (
    <div className="game-sub-container minesweeper-sub">
      <style>{`
/* ═══════════════════════════════════════════════════════════
   MINESWEEPER — Deep Design Pass
   The Conflux · Cinematic War Room Experience
   ═══════════════════════════════════════════════════════════ */

/* ── Ambient Background: War Room Atmosphere ── */
.minesweeper-sub {
  padding: 28px 24px 120px;
}
.minesweeper-sub::before {
  background:
    radial-gradient(circle at 25% 35%, rgba(239,68,68,0.07) 0%, transparent 45%),
    radial-gradient(circle at 75% 65%, rgba(185,28,28,0.045) 0%, transparent 50%),
    radial-gradient(circle at 50% 80%, rgba(251,191,36,0.025) 0%, transparent 40%),
    radial-gradient(circle at 10% 90%, rgba(239,68,68,0.03) 0%, transparent 35%);
  animation: minesweeper-ambient-drift 20s ease-in-out infinite;
}
@keyframes minesweeper-ambient-drift {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  33% { transform: translate(2%, -1.5%) rotate(0.8deg); }
  66% { transform: translate(-1.5%, 2%) rotate(-0.6deg); }
}

/* ── Hero: War Room Command Center ── */
.minesweeper-sub .game-sub-hero {
  background: linear-gradient(135deg, rgba(239,68,68,0.14) 0%, rgba(127,29,29,0.08) 50%, rgba(251,191,36,0.04) 100%);
  border: 1px solid rgba(239,68,68,0.28);
  box-shadow:
    0 4px 16px rgba(0,0,0,0.3),
    0 0 40px rgba(239,68,68,0.05),
    inset 0 1px 0 rgba(255,255,255,0.04);
  animation: minesweeper-hero-breathe 6s ease-in-out infinite;
  padding: 16px 20px;
  margin-bottom: 10px;
  min-height: unset;
  gap: 12px;
}
.minesweeper-sub .game-sub-hero-glow {
  display: none;
}
.minesweeper-sub .game-sub-hero-icon {
  filter: drop-shadow(0 0 12px rgba(239,68,68,0.5)) drop-shadow(0 4px 8px rgba(0,0,0,0.4));
  font-size: 28px;
}
.minesweeper-sub .game-sub-hero-title {
  background: linear-gradient(135deg, #fbbf24 0%, #ef4444 40%, #dc2626 70%, #b91c1c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 20px;
}
.minesweeper-sub .game-sub-hero-subtitle {
  font-size: 11px;
  margin: 0;
}
.minesweeper-sub .game-sub-best {
  font-size: 12px;
  padding: 4px 10px;
  animation: minesweeper-best-pulse 3s ease-in-out infinite;
}
.minesweeper-sub .game-sub-back {
  margin: 0;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 700;
  border-radius: 20px;
  border: 1.5px solid rgba(239,68,68,0.6);
  background: rgba(239,68,68,0.2);
  color: #ef4444;
  display: inline-block;
  letter-spacing: 0.5px;
}
.minesweeper-sub .game-sub-back:hover {
  border-color: rgba(239,68,68,0.9);
  background: rgba(239,68,68,0.3);
  transform: scale(1.05);
}

/* ── Canvas Wrap: Minefield Border ── */
.minesweeper-sub .game-sub-canvas-wrap {
  width: 100%;
  margin: 0 auto;
  border-color: rgba(239,68,68,0.3);
  border-width: 2px;
  box-shadow:
    0 0 24px rgba(239,68,68,0.1),
    0 0 72px rgba(239,68,68,0.05),
    0 0 120px rgba(239,68,68,0.02),
    inset 0 0 40px rgba(0,0,0,0.2);
  transition: box-shadow 0.5s ease, border-color 0.5s ease;
}
.minesweeper-sub .game-sub-canvas-wrap:hover {
  border-color: rgba(239,68,68,0.45);
  box-shadow:
    0 0 36px rgba(239,68,68,0.15),
    0 0 100px rgba(239,68,68,0.08),
    0 0 160px rgba(239,68,68,0.03),
    inset 0 0 40px rgba(0,0,0,0.15);
}

/* ── HUD: Brass War Gauges ── */
.minesweeper-sub .game-sub-hud {
  background: linear-gradient(135deg, rgba(30,20,10,0.7), rgba(20,15,8,0.8));
  border: 1px solid rgba(251,191,36,0.15);
  box-shadow:
    0 4px 20px rgba(0,0,0,0.3),
    inset 0 1px 0 rgba(255,255,255,0.04),
    inset 0 -1px 0 rgba(0,0,0,0.2);
  backdrop-filter: blur(24px) saturate(1.2);
  -webkit-backdrop-filter: blur(24px) saturate(1.2);
}
.minesweeper-sub .game-sub-hud-label {
  color: rgba(251,191,36,0.5);
  font-size: 10px;
  letter-spacing: 2px;
}
.minesweeper-sub .game-sub-hud-value {
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
}

/* ── Difficulty Pills: Carved Stone Buttons ── */
.minesweeper-sub .game-sub-diff-pill {
  position: relative;
  box-shadow:
    0 2px 8px rgba(0,0,0,0.3),
    inset 0 1px 0 rgba(255,255,255,0.06),
    inset 0 -2px 0 rgba(0,0,0,0.15);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.minesweeper-sub .game-sub-diff-pill:hover {
  border-color: rgba(239,68,68,0.5);
  background: rgba(239,68,68,0.12);
  box-shadow:
    0 4px 16px rgba(239,68,68,0.15),
    inset 0 1px 0 rgba(255,255,255,0.08);
  transform: translateY(-2px);
}
.minesweeper-sub .game-sub-diff-pill:active {
  transform: scale(0.95);
  box-shadow:
    0 1px 4px rgba(0,0,0,0.3),
    inset 0 2px 4px rgba(0,0,0,0.3);
}
.minesweeper-sub .game-sub-diff-pill.active {
  border-color: #ef4444;
  background: rgba(239,68,68,0.18);
  box-shadow:
    0 0 12px rgba(239,68,68,0.2),
    inset 0 1px 0 rgba(255,255,255,0.08);
}

/* ── Overlay: Cinema Screen Reveal ── */
.minesweeper-sub .game-sub-overlay {
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(16px) saturate(0.8);
  -webkit-backdrop-filter: blur(16px) saturate(0.8);
  animation: minesweeper-overlay-in 0.6s ease forwards;
}
@keyframes minesweeper-overlay-in {
  0% { opacity: 0; }
  40% { opacity: 1; }
}
.minesweeper-sub .game-sub-overlay-card {
  background: linear-gradient(160deg, rgba(15,10,10,0.96), rgba(10,5,5,0.98));
  border: 1px solid rgba(239,68,68,0.25);
  box-shadow:
    0 32px 80px rgba(0,0,0,0.7),
    0 0 60px rgba(239,68,68,0.06),
    inset 0 1px 0 rgba(255,255,255,0.05);
  animation: minesweeper-card-dramatic 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
@keyframes minesweeper-card-dramatic {
  0% { opacity: 0; transform: scale(0.7) translateY(30px); filter: blur(8px); }
  100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
}
.minesweeper-sub .game-sub-overlay-title {
  background: linear-gradient(135deg, #fbbf24, #ef4444);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.minesweeper-sub .game-sub-overlay-title.loss {
  background: linear-gradient(135deg, #ef4444, #991b1b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.minesweeper-sub .game-sub-overlay-score {
  color: #ef4444;
  text-shadow:
    0 0 20px rgba(239,68,68,0.4),
    0 0 60px rgba(239,68,68,0.15);
  animation: minesweeper-score-glow 2s ease-in-out infinite;
}
@keyframes minesweeper-score-glow {
  0%, 100% { text-shadow: 0 0 20px rgba(239,68,68,0.4), 0 0 60px rgba(239,68,68,0.15); }
  50% { text-shadow: 0 0 30px rgba(239,68,68,0.6), 0 0 80px rgba(239,68,68,0.25); }
}
.minesweeper-sub .game-sub-overlay-win-score {
  color: #fbbf24;
  text-shadow:
    0 0 20px rgba(251,191,36,0.4),
    0 0 60px rgba(251,191,36,0.15);
  animation: minesweeper-win-score-glow 2s ease-in-out infinite;
}
@keyframes minesweeper-win-score-glow {
  0%, 100% { text-shadow: 0 0 20px rgba(251,191,36,0.4), 0 0 60px rgba(251,191,36,0.15); }
  50% { text-shadow: 0 0 30px rgba(251,191,36,0.6), 0 0 80px rgba(251,191,36,0.25); }
}
.minesweeper-sub .game-sub-overlay-newbest {
  background: rgba(251,191,36,0.12);
  border: 1px solid rgba(251,191,36,0.35);
  color: #fbbf24;
  box-shadow: 0 0 20px rgba(251,191,36,0.15);
  animation: minesweeper-newbest-burst 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, minesweeper-newbest-glow 2s ease-in-out 0.7s infinite;
}
@keyframes minesweeper-newbest-burst {
  0% { opacity: 0; transform: scale(0.3) rotate(-10deg); }
  60% { transform: scale(1.15) rotate(2deg); }
  100% { opacity: 1; transform: scale(1) rotate(0); }
}
@keyframes minesweeper-newbest-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(251,191,36,0.15); }
  50% { box-shadow: 0 0 32px rgba(251,191,36,0.35), 0 0 60px rgba(251,191,36,0.1); }
}
.minesweeper-sub .game-sub-overlay-btn.primary {
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  color: #fff;
  box-shadow:
    0 6px 20px rgba(239,68,68,0.35),
    0 0 40px rgba(239,68,68,0.1),
    inset 0 1px 0 rgba(255,255,255,0.15);
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.minesweeper-sub .game-sub-overlay-btn.primary:hover {
  background: linear-gradient(135deg, #f87171, #ef4444);
  box-shadow:
    0 8px 28px rgba(239,68,68,0.45),
    0 0 60px rgba(239,68,68,0.15),
    inset 0 1px 0 rgba(255,255,255,0.2);
  transform: scale(1.07) translateY(-2px);
}
.minesweeper-sub .game-sub-overlay-btn.primary:active {
  transform: scale(0.97);
  box-shadow: 0 2px 8px rgba(239,68,68,0.3);
}

/* ── Screen Shake on Loss ── */
.minesweeper-sub .minesweeper-board.shake {
  animation: minesweeper-screen-shake 0.4s ease-out;
}
@keyframes minesweeper-screen-shake {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-4px, 2px); }
  20% { transform: translate(4px, -2px); }
  30% { transform: translate(-3px, 1px); }
  40% { transform: translate(3px, -1px); }
  50% { transform: translate(-2px, 1px); }
  60% { transform: translate(2px, 0); }
}

/* ── Red Flash on Loss ── */
.minesweeper-sub .minesweeper-flash-overlay {
  position: absolute;
  inset: 0;
  background: rgba(239,68,68,0.3);
  z-index: 5;
  pointer-events: none;
  border-radius: 20px;
  animation: minesweeper-red-flash 0.5s ease-out forwards;
}
@keyframes minesweeper-red-flash {
  0% { opacity: 1; }
  100% { opacity: 0; }
}

/* ── D-Pad: Tactile Buttons ── */
.minesweeper-sub .game-sub-dpad-btn {
  border-color: rgba(239,68,68,0.2);
  color: #ef4444;
  background: rgba(239,68,68,0.06);
  box-shadow:
    0 2px 8px rgba(0,0,0,0.3),
    inset 0 1px 0 rgba(255,255,255,0.06),
    inset 0 -2px 0 rgba(0,0,0,0.15);
  transition: all 0.1s ease;
}
.minesweeper-sub .game-sub-dpad-btn:active {
  background: rgba(239,68,68,0.2);
  box-shadow:
    0 0 4px rgba(0,0,0,0.3),
    inset 0 2px 4px rgba(0,0,0,0.3);
  transform: scale(0.92);
}

/* ── Controls Hint ── */
.minesweeper-sub .game-sub-controls {
  color: rgba(239,68,68,0.35);
  letter-spacing: 1.5px;
  font-size: 12px;
}

/* ── Back Button ── */
.minesweeper-sub .game-sub-back {
  border-color: rgba(239,68,68,0.15);
  color: rgba(239,68,68,0.6);
  transition: all 0.25s ease;
}
.minesweeper-sub .game-sub-back:hover {
  border-color: rgba(239,68,68,0.35);
  color: #ef4444;
  box-shadow: 0 4px 16px rgba(239,68,68,0.1);
}

/* ── Dynamic Cell Sizing per Difficulty ── */
.minesweeper-board.beginner .minesweeper-tile {
  width: 40px;
  height: 40px;
  font-size: 16px;
}
.minesweeper-board.intermediate .minesweeper-tile {
  width: 28px;
  height: 28px;
  font-size: 12px;
}
.minesweeper-board.expert .minesweeper-tile {
  width: 20px;
  height: 20px;
  font-size: 10px;
  border-radius: 5px;
}
`}</style>

      {/* Hero Section */}
      {/* Hero Section */}
      <div className="game-sub-hero">
        <button className="game-sub-back" onClick={onBack}>← Hub</button>
        <div className="game-sub-hero-icon">💣</div>
        <div className="game-sub-hero-info">
          <h2 className="game-sub-hero-title">Minesweeper</h2>
          <p className="game-sub-hero-subtitle">Classic puzzle · Find the mines</p>
        </div>
        {bestTimes[difficulty] > 0 && (
          <div className="game-sub-best" style={{background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.25)',color:'#ef4444'}}>🏆 {formatTime(bestTimes[difficulty])}</div>
        )}
      </div>

      {/* Difficulty Pills: Carved Stone Buttons */}
      <div style={{display:'flex',gap:'8px',justifyContent:'center',flexWrap:'wrap',marginBottom:'8px'}}>
        {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map(diff => (
          <button key={diff} onClick={() => startGame(diff)} className={`game-sub-diff-pill${diff === difficulty ? ' active' : ''}`} style={{padding:'7px 16px',borderRadius:'20px',border: diff === difficulty ? '1px solid #ef4444' : '1px solid rgba(239,68,68,0.25)',background: diff === difficulty ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.05)',color: diff === difficulty ? '#ef4444' : 'var(--text-muted)',cursor:'pointer',fontSize:'13px',fontWeight: diff === difficulty ? 700 : 500,letterSpacing:'0.3px'}}>
            {DIFFICULTY_CONFIG[diff].label}
          </button>
        ))}
      </div>

      {/* HUD + Board */}
      {(
        <>
          <div className="game-sub-hud">
            <div className="game-sub-hud-left">
              <span className="game-sub-hud-label">Mines</span>
              <span className="game-sub-hud-value" style={{color:'#ef4444'}}>💣 {mineCount - flagCount}</span>
            </div>
            <div className="game-sub-hud-center">
              <span className="game-sub-hud-value" style={{fontSize:'16px',color:'#ef4444'}}>{config.label}</span>
            </div>
            <div className="game-sub-hud-right">
              <span className="game-sub-hud-label">Time</span>
              <span className="game-sub-hud-value" style={{color:'#fbbf24',fontSize:'16px'}}>⏱ {formatTime(timer)}</span>
            </div>
          </div>

          <div className="game-sub-canvas-wrap" style={{maxWidth: '480px', margin: '0 auto'}}>
            <div className={`minesweeper-board ${difficulty} ${gameState}${isShaking ? ' shake' : ''}`} style={{padding:'0'}}>
              {showFlash && <div className="minesweeper-flash-overlay" />}
              {board.map((row, ri) => (
                <div key={ri} className="minesweeper-row">
                  {row.map((tile, ci) => (
                    <button
                      key={`${ri}-${ci}`}
                      data-row={ri}
                      data-col={ci}
                      className={getTileClass(tile)}
                      style={
                        tile.isRevealed && tile.adjacentMines === 0 && !tile.isMine
                          ? { animationDelay: `${tile.cascadeDelay || 0}ms` }
                          : {}
                      }
                      onClick={() => handleLeftClick(ri, ci)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        handleRightClick(ri, ci);
                      }}
                      onMouseDown={handleMouseDown}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    >
                      {getTileContent(tile)}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Game Over Overlay */}
            {gameState === 'lost' && (
              <div className="game-sub-overlay">
                <div className="game-sub-overlay-card">
                  <div style={{fontSize:'48px',animation:'minesweeper-score-glow 2s ease-in-out infinite'}}>💥</div>
                  <div className="game-sub-overlay-title loss">Game Over</div>
                  <div className="game-sub-overlay-score">{timer}s</div>
                  <div className="game-sub-overlay-sub" style={{color:'var(--text-muted)',fontSize:'14px'}}>Better luck next time, soldier</div>
                  <div className="game-sub-overlay-actions">
                    <button className="game-sub-overlay-btn primary" onClick={() => startGame(difficulty)}>Try Again</button>
                  </div>
                </div>
              </div>
            )}

            {/* Win Overlay */}
            {gameState === 'won' && (
              <div className="game-sub-overlay">
                <div className="game-sub-overlay-card">
                  <div style={{fontSize:'48px',animation:'minesweeper-win-score-glow 2s ease-in-out infinite'}}>🎉</div>
                  <div className="game-sub-overlay-title">Field Cleared!</div>
                  <div className="game-sub-overlay-win-score" style={{fontSize:'64px',fontWeight:950,fontVariantNumeric:'tabular-nums',lineHeight:1,letterSpacing:'-1px'}}>{timer}s</div>
                  {bestTimes[difficulty] === timer && (
                    <div className="game-sub-overlay-newbest">🏆 New Best Time!</div>
                  )}
                  <div className="game-sub-overlay-actions">
                    <button className="game-sub-overlay-btn primary" onClick={() => startGame(difficulty)}>Play Again</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Controls Hint */}
          <div className="game-sub-controls">Left-click to reveal · Right-click to flag</div>
        </>
      )}

      <button className="game-sub-back" onClick={onBack} style={{display:'none'}}>← Games Hub</button>
    </div>
  );
}
