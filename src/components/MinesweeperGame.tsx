import { useState, useCallback, useRef, useEffect } from 'react';
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

// Number colors — warm candlelight palette
const NUMBER_COLORS: Record<number, string> = {
  1: '#e8c86a',  // antique gold
  2: '#d4956a',  // warm copper
  3: '#e07858',  // ember
  4: '#c86878',  // rose
  5: '#a85860',  // deep rose
  6: '#8890a8',  // steel
  7: '#687898',  // slate
  8: '#888078',  // ash
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

  safeZone.add(`${safeRow},${safeCol}`);
  for (const [nr, nc] of getNeighbors(safeRow, safeCol, rows, cols)) {
    safeZone.add(`${nr},${nc}`);
  }

  const positions: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!safeZone.has(`${r},${c}`)) {
        positions.push([r, c]);
      }
    }
  }

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
    tile.cascadeDelay = dist * 25;

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
  const [bestTimes] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('conflux_minesweeper_best');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [isShaking, setIsShaking] = useState(false);
  const [flashOverlay, setFlashOverlay] = useState<'none' | 'explode' | 'win'>('none');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Timer ───────────────────────────────────────────────────────────────

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

  // ── Save Best Time ─────────────────────────────────────────────────────

  const saveBestTime = useCallback((diff: string, time: number) => {
    try {
      const saved = localStorage.getItem('conflux_minesweeper_best');
      const current: Record<string, number> = saved ? JSON.parse(saved) : {};
      if (!current[diff] || time < current[diff]) {
        localStorage.setItem('conflux_minesweeper_best', JSON.stringify({ ...current, [diff]: time }));
      }
    } catch { /* ignore */ }
  }, []);

  // ── Game Actions ───────────────────────────────────────────────────────

  const resetGame = useCallback(() => {
    stopTimer();
    setGameState('playing');
    setBoard([]);
    setTimer(0);
    setFlagCount(0);
    setFirstClick(true);
    setFlashOverlay('none');
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
    setFlashOverlay('none');
    setIsShaking(false);
    stopTimer();
  }, [stopTimer]);

  const handleLoss = useCallback((row: number, col: number, currentBoard: Tile[][]) => {
    const newBoard = currentBoard.map(r => r.map(t => ({ ...t })));
    newBoard[row][col].isRevealed = true;
    newBoard[row][col].isExploded = true;
    newBoard.forEach(r => r.forEach(t => { if (t.isMine) t.isRevealed = true; }));
    setBoard(newBoard);
    setGameState('lost');
    setIsShaking(true);
    setFlashOverlay('explode');
    setTimeout(() => setIsShaking(false), 400);
    setTimeout(() => setFlashOverlay('none'), 600);
    stopTimer();
    playMinesweeperExplode();
  }, [stopTimer]);

  const handleLeftClick = useCallback((row: number, col: number) => {
    if (gameState !== 'playing') return;
    const tile = board[row]?.[col];
    if (!tile || tile.isRevealed || tile.isFlagged) return;

    if (firstClick) {
      const config = DIFFICULTY_CONFIG[difficulty];
      const newBoard = placeMines(board, row, col, config.mines);
      setFirstClick(false);
      startTimer();

      const clickedTile = newBoard[row][col];
      if (clickedTile.isMine) {
        handleLoss(row, col, newBoard);
        return;
      }

      let revealedBoard: Tile[][];
      if (clickedTile.adjacentMines === 0) {
        revealedBoard = floodReveal(newBoard, row, col);
        playMinesweeperCascade();
      } else {
        revealedBoard = newBoard.map(r => r.map(t => ({ ...t })));
        revealedBoard[row][col].isRevealed = true;
        playMinesweeperReveal();
      }

      setBoard(revealedBoard);

      if (checkWin(revealedBoard)) {
        setGameState('won');
        stopTimer();
        playMinesweeperWin();
        setFlashOverlay('win');
        setTimeout(() => setFlashOverlay('none'), 800);
        saveBestTime(difficulty, 0);
      }
      return;
    }

    if (tile.isMine) {
      handleLoss(row, col, board);
      return;
    }

    let newBoard: Tile[][];
    if (tile.adjacentMines === 0) {
      newBoard = floodReveal(board, row, col);
      playMinesweeperCascade();
    } else {
      newBoard = board.map(r => r.map(t => ({ ...t })));
      newBoard[row][col].isRevealed = true;
      playMinesweeperReveal();
    }

    setBoard(newBoard);

    if (checkWin(newBoard)) {
      setGameState('won');
      stopTimer();
      playMinesweeperWin();
      setFlashOverlay('win');
      setTimeout(() => setFlashOverlay('none'), 800);
      saveBestTime(difficulty, timer);
    }
  }, [gameState, board, firstClick, difficulty, timer, startTimer, stopTimer, handleLoss, saveBestTime]);

  const handleRightClick = useCallback((row: number, col: number) => {
    if (gameState !== 'playing') return;
    const tile = board[row]?.[col];
    if (!tile || tile.isRevealed) return;

    const newBoard = board.map(r => r.map(t => ({ ...t })));
    newBoard[row][col].isFlagged = !newBoard[row][col].isFlagged;
    setBoard(newBoard);

    const newFlagCount = newBoard.flat().filter(t => t.isFlagged).length;
    setFlagCount(newFlagCount);
    playMinesweeperFlag();
  }, [gameState, board]);

  // ── Tile content ───────────────────────────────────────────────────────

  const getTileContent = useCallback((tile: Tile): string => {
    if (tile.isFlagged && !tile.isRevealed) return '🚩';
    if (!tile.isRevealed) return '';
    if (tile.isMine) return '💣';
    if (tile.adjacentMines > 0) return String(tile.adjacentMines);
    return '';
  }, []);

  // ── Init ───────────────────────────────────────────────────────────────

  useEffect(() => {
    startGame('beginner');
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────

  const config = DIFFICULTY_CONFIG[difficulty];
  const remainingMines = mineCount - flagCount;
  const faceEmoji = gameState === 'lost' ? '💥' : gameState === 'won' ? '🏆' : '💣';
  const isNewBest = gameState === 'won' && bestTimes[difficulty] === timer;
  const hasBest = bestTimes[difficulty] != null && bestTimes[difficulty] > 0;

  return (
    <div className="ms-container">
      <style>{`
/* ═══════════════════════════════════════════════════════════════════
   MINESWEEPER — "The Minefield"
   Burgundy / Parchment / Candlelight world.
   The board IS the hero. Everything else is atmospheric.
   ═══════════════════════════════════════════════════════════════════ */

.ms-container {
  position: fixed;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(165deg, #1a1510 0%, #2a1f18 40%, #1e1512 100%);
  font-family: 'Georgia', 'Times New Roman', serif;
  box-sizing: border-box;
  padding: 12px;
}

/* ── Atmosphere: candlelight glow ── */
.ms-atmosphere {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

/* Parchment texture overlay */
.ms-atmosphere::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('/backgrounds/minesweeper-bg.webp');
  background-size: cover;
  background-position: center;
  opacity: 0.5;
  animation: ms-candle-drift 18s ease-in-out infinite alternate;
}

/* Faint grid */
.ms-atmosphere::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(200,160,100,0.012) 1px, transparent 1px),
    linear-gradient(90deg, rgba(200,160,100,0.012) 1px, transparent 1px);
  background-size: 48px 48px;
}

@keyframes ms-candle-drift {
  0%   { opacity: 0.6; transform: translate(0, 0) scale(1); }
  50%  { opacity: 1;   transform: translate(-1%, 0.5%) scale(1.02); }
  100% { opacity: 0.7; transform: translate(0.5%, -0.5%) scale(0.99); }
}

/* ── Screen flash ── */
.ms-flash-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 50;
  animation: ms-flash-fade 0.6s ease-out forwards;
}
.ms-flash-overlay.explode { background: radial-gradient(ellipse at center, rgba(200,60,40,0.35) 0%, rgba(80,20,15,0.2) 40%, transparent 70%); }
.ms-flash-overlay.win    { background: radial-gradient(ellipse at center, rgba(220,180,100,0.2) 0%, rgba(180,140,60,0.08) 40%, transparent 70%); }

@keyframes ms-flash-fade {
  0% { opacity: 1; }
  100% { opacity: 0; }
}

/* ── Content layer ── */
.ms-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
  max-width: 1000px;
  padding: 40px 0 150px;
  box-sizing: border-box;
}

/* ── Compact HUD strip ── */
.ms-hud {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 10px 16px;
  margin-bottom: 12px;
  background: rgba(40,24,20,0.6);
  border: 1px solid rgba(200,160,100,0.1);
  border-radius: 12px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(200,160,100,0.04);
  flex-shrink: 0;
}

.ms-hud-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-variant-numeric: tabular-nums;
}

.ms-hud-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: rgba(200,160,100,0.35);
  font-family: 'Georgia', serif;
  font-weight: 400;
}

.ms-hud-value {
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #c8a064;
  min-width: 32px;
  text-align: center;
  letter-spacing: 1px;
}

.ms-hud-separator {
  width: 1px;
  height: 20px;
  background: rgba(200,160,100,0.12);
}

/* Back to Hub button — prominent, in the HUD */
.ms-hub-btn {
  background: rgba(200,160,100,0.12);
  border: 1px solid rgba(200,160,100,0.25);
  border-radius: 8px;
  color: #c8a064;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 700;
  font-family: 'Georgia', serif;
  cursor: pointer;
  transition: all 0.15s ease;
  letter-spacing: 0.5px;
  margin-left: 8px;
}
.ms-hub-btn:hover {
  background: rgba(200,160,100,0.2);
  border-color: rgba(200,160,100,0.4);
  color: #e0b878;
}

/* Face button — compact, warm */
.ms-face-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(200,160,100,0.2);
  background: rgba(200,160,100,0.06);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.ms-face-btn:hover {
  background: rgba(200,160,100,0.12);
  border-color: rgba(200,160,100,0.35);
  transform: scale(1.1);
}
.ms-face-btn:active { transform: scale(0.9); }

/* ── Difficulty pills ── */
.ms-diff-bar {
  display: flex;
  gap: 4px;
  margin-left: 4px;
}

.ms-diff-pill {
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid rgba(200,160,100,0.12);
  background: transparent;
  color: rgba(200,160,100,0.3);
  font-size: 10px;
  font-weight: 600;
  font-family: 'Georgia', serif;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
}
.ms-diff-pill:hover {
  border-color: rgba(200,160,100,0.25);
  color: rgba(200,160,100,0.5);
}
.ms-diff-pill.active {
  border-color: rgba(200,160,100,0.3);
  background: rgba(200,160,100,0.08);
  color: #c8a064;
  font-weight: 700;
}

/* ── Board frame — the stage ── */
.ms-board-frame {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  position: relative;
  overflow: auto;
  background: rgba(20,14,12,1);
  border: 1px solid rgba(200,160,100,0.1);
  border-radius: 12px;
}

/* Ornamental border */
.ms-board-frame::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid rgba(200,160,100,0.06);
  border-radius: 12px;
  pointer-events: none;
}

/* ── Board grid — fixed cell sizes ── */
.ms-board {
  --cell-size: 28px;
  --cell-gap: 1px;
  display: grid;
  gap: var(--cell-gap);
  position: relative;
  flex-shrink: 0;
}

.ms-board.shake {
  animation: ms-shake 0.4s ease-out;
}

@keyframes ms-shake {
  0%, 100% { transform: translate(0, 0); }
  15% { transform: translate(-3px, 2px); }
  30% { transform: translate(3px, -2px); }
  45% { transform: translate(-2px, 1px); }
  60% { transform: translate(2px, -1px); }
  75% { transform: translate(-1px, 0); }
}

/* ── Tiles ── */
.ms-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--cell-size);
  height: var(--cell-size);
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  user-select: none;
  font-weight: 700;
  border-radius: 3px;
  transition: background 0.1s ease;
  position: relative;
  box-sizing: border-box;
  flex-shrink: 0;
  font-size: 13px;
}

/* Hidden tile — parchment feel, subtle 3D */
.ms-tile.ms-hidden {
  background: linear-gradient(145deg, rgba(90,65,50,0.45) 0%, rgba(65,45,35,0.55) 100%);
  border: 1px solid rgba(0,0,0,0.8);
  box-shadow:
    inset 0 1px 0 rgba(180,140,100,0.08),
    inset 0 -1px 0 rgba(0,0,0,0.15);
}
.ms-tile.ms-hidden:hover {
  background: linear-gradient(145deg, rgba(110,80,60,0.55) 0%, rgba(80,55,40,0.6) 100%);
  border-color: rgba(180,140,100,0.3);
  box-shadow:
    inset 0 1px 0 rgba(200,160,120,0.1),
    inset 0 -1px 0 rgba(0,0,0,0.12),
    0 0 8px rgba(200,160,100,0.06);
}
.ms-tile.ms-hidden:active {
  background: linear-gradient(145deg, rgba(60,40,30,0.6) 0%, rgba(50,30,25,0.7) 100%);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
}

/* Flagged */
.ms-tile.ms-flagged {
  background: linear-gradient(145deg, rgba(160,80,50,0.25) 0%, rgba(120,55,35,0.35) 100%);
  border: 1px solid rgba(200,120,80,0.3);
  box-shadow: inset 0 1px 0 rgba(200,140,100,0.06);
}
.ms-tile.ms-flagged:hover {
  background: linear-gradient(145deg, rgba(180,90,55,0.3) 0%, rgba(140,65,40,0.4) 100%);
}

/* Revealed */
.ms-tile.ms-revealed {
  background: rgba(20,14,12,0.6);
  border: 1px solid rgba(80,55,40,0.15);
  cursor: default;
}

/* Mine — warm danger */
.ms-tile.ms-mine {
  background: rgba(160,45,30,0.35);
  border: 1px solid rgba(200,60,40,0.35);
}

/* Exploded mine */
.ms-tile.ms-exploded {
  background: radial-gradient(circle at center, rgba(220,80,50,0.7) 0%, rgba(160,40,25,0.5) 50%, rgba(120,30,20,0.35) 100%);
  border: 1px solid rgba(240,100,70,0.5);
  box-shadow: 0 0 12px rgba(200,60,40,0.4), inset 0 0 8px rgba(240,100,60,0.2);
  animation: ms-explode-pulse 0.6s ease-out;
}

@keyframes ms-explode-pulse {
  0%   { transform: scale(1.15); box-shadow: 0 0 24px rgba(240,80,40,0.6); }
  100% { transform: scale(1);    box-shadow: 0 0 12px rgba(200,60,40,0.4); }
}

/* Number styling */
.ms-tile.ms-number {
  cursor: default;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-weight: 800;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

/* Cascade reveal animation */
.ms-tile.ms-cascade-reveal {
  animation: ms-cascade-in 0.2s ease-out backwards;
}

@keyframes ms-cascade-in {
  0%   { background: rgba(200,160,100,0.15); transform: scale(0.92); }
  100% { background: rgba(20,14,12,0.6);      transform: scale(1); }
}

/* ── Overlays: win / loss ── */
.ms-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  animation: ms-overlay-in 0.4s ease-out;
}

.ms-overlay.win {
  background: radial-gradient(ellipse at center, rgba(200,160,80,0.12) 0%, rgba(10,8,6,0.85) 60%);
}

.ms-overlay.loss {
  background: radial-gradient(ellipse at center, rgba(160,40,30,0.1) 0%, rgba(10,8,6,0.88) 60%);
}

@keyframes ms-overlay-in {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}

.ms-overlay-card {
  text-align: center;
  padding: 28px 36px;
  animation: ms-card-rise 0.5s ease-out 0.1s backwards;
}

@keyframes ms-card-rise {
  0%   { opacity: 0; transform: translateY(16px) scale(0.96); }
  100% { opacity: 1; transform: translateY(0)    scale(1); }
}

.ms-overlay-emoji {
  font-size: 44px;
  margin-bottom: 8px;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4));
}

.ms-overlay-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.ms-overlay-title.win { color: #d4a854; }
.ms-overlay-title.loss { color: #c06040; }

.ms-overlay-time {
  font-size: 42px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  letter-spacing: 2px;
  margin-bottom: 2px;
}

.ms-overlay-time.win { color: #d4a854; text-shadow: 0 0 20px rgba(200,160,80,0.3); }
.ms-overlay-time.loss { color: #c06040; }

.ms-overlay-sub {
  font-size: 13px;
  color: rgba(200,160,100,0.35);
  font-style: italic;
  margin-bottom: 4px;
}

.ms-overlay-newbest {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 20px;
  background: rgba(212,168,84,0.1);
  border: 1px solid rgba(212,168,84,0.25);
  color: #d4a854;
  font-size: 12px;
  font-weight: 700;
  margin-top: 6px;
  animation: ms-best-glow 2s ease-in-out infinite;
}

@keyframes ms-best-glow {
  0%, 100% { box-shadow: 0 0 8px rgba(212,168,84,0.1); }
  50%      { box-shadow: 0 0 16px rgba(212,168,84,0.25); }
}

.ms-overlay-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 16px;
}

.ms-overlay-btn {
  padding: 8px 22px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: 'Georgia', serif;
  letter-spacing: 0.3px;
}

.ms-overlay-btn.primary {
  background: linear-gradient(135deg, rgba(200,160,80,0.2), rgba(180,140,60,0.15));
  border: 1px solid rgba(200,160,80,0.35);
  color: #d4a854;
}

.ms-overlay-btn.primary:hover {
  background: linear-gradient(135deg, rgba(200,160,80,0.3), rgba(180,140,60,0.25));
  border-color: rgba(200,160,80,0.5);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(200,160,80,0.15);
}

.ms-overlay-btn.secondary {
  background: transparent;
  border: 1px solid rgba(200,160,100,0.12);
  color: rgba(200,160,100,0.4);
}

.ms-overlay-btn.secondary:hover {
  border-color: rgba(200,160,100,0.25);
  color: rgba(200,160,100,0.6);
}

/* ── Bottom bar ── */
.ms-bottom-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 8px 16px;
  flex-shrink: 0;
  background: rgba(40,24,20,0.6);
  border: 1px solid rgba(200,160,100,0.1);
  border-radius: 12px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(200,160,100,0.04);
}

.ms-hint {
  font-size: 10px;
  color: rgba(200,160,100,0.2);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  font-family: 'Georgia', serif;
}

.ms-back-btn {
  background: transparent;
  border: 1px solid rgba(200,160,100,0.1);
  border-radius: 6px;
  color: rgba(200,160,100,0.25);
  padding: 4px 12px;
  font-size: 11px;
  cursor: pointer;
  font-family: 'Georgia', serif;
  transition: all 0.15s ease;
  letter-spacing: 0.5px;
}
.ms-back-btn:hover {
  border-color: rgba(200,160,100,0.25);
  color: rgba(200,160,100,0.5);
}

/* ── Best time badge ── */
.ms-best-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 12px;
  background: rgba(200,160,80,0.06);
  border: 1px solid rgba(200,160,80,0.12);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: rgba(200,160,80,0.4);
  font-weight: 600;
  margin-left: 8px;
}

.ms-best-badge .best-label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.6;
}
`}</style>

      {/* ── Atmosphere ── */}
      <div className="ms-atmosphere" />

      {/* ── Screen flash ── */}
      {flashOverlay !== 'none' && (
        <div className={`ms-flash-overlay ${flashOverlay}`} />
      )}

      {/* ── Content ── */}
      <div className="ms-content">

        {/* ── Compact HUD ── */}
        <div className="ms-hud">
          {/* Mines remaining */}
          <div className="ms-hud-item">
            <span className="ms-hud-label">Mines</span>
            <span className="ms-hud-value">{String(remainingMines).padStart(2, '0')}</span>
          </div>

          <div className="ms-hud-separator" />

          {/* Face / reset */}
          <button
            className="ms-face-btn"
            onClick={() => resetGame()}
            title="New game"
          >
            {faceEmoji}
          </button>

          <div className="ms-hud-separator" />

          {/* Timer */}
          <div className="ms-hud-item">
            <span className="ms-hud-label">Time</span>
            <span className="ms-hud-value">{formatTime(timer)}</span>
          </div>

          {/* Best time (if exists) */}
          {hasBest && (
            <>
              <div className="ms-hud-separator" />
              <div className="ms-best-badge">
                <span className="best-label">Best</span>
                <span>{formatTime(bestTimes[difficulty])}</span>
              </div>
            </>
          )}

          <div className="ms-hud-separator" />

          {/* Difficulty pills */}
          <div className="ms-diff-bar">
            {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map(diff => (
              <button
                key={diff}
                className={`ms-diff-pill ${diff === difficulty ? 'active' : ''}`}
                onClick={() => startGame(diff)}
              >
                {DIFFICULTY_CONFIG[diff].label}
              </button>
            ))}
          </div>

          {/* Back to Hub — prominent */}
          <button className="ms-hub-btn" onClick={onBack}>← Hub</button>
        </div>

        {/* ── The Board — the hero ── */}
        <div className="ms-board-frame">
          <div
            className={`ms-board${isShaking ? ' shake' : ''}`}
            style={{
              gridTemplateColumns: `repeat(${config.cols}, var(--cell-size))`,
              gridTemplateRows: `repeat(${config.rows}, var(--cell-size))`,
            }}
          >
            {board.flat().map((tile, idx) => {
              const numColor = tile.adjacentMines > 0 ? NUMBER_COLORS[tile.adjacentMines] : undefined;
              const classes = ['ms-tile'];
              if (tile.isFlagged && !tile.isRevealed) classes.push('ms-flagged');
              else if (!tile.isRevealed) classes.push('ms-hidden');
              else if (tile.isMine) classes.push(tile.isExploded ? 'ms-exploded' : 'ms-mine');
              else {
                classes.push('ms-revealed');
                if (tile.adjacentMines > 0) {
                  classes.push('ms-number');
                }
                if (tile.cascadeDelay !== undefined && tile.cascadeDelay > 0) {
                  classes.push('ms-cascade-reveal');
                }
              }

              return (
                <button
                  key={idx}
                  data-row={tile.row}
                  data-col={tile.col}
                  className={classes.join(' ')}
                  style={{
                    color: numColor,
                    animationDelay: tile.cascadeDelay ? `${tile.cascadeDelay}ms` : undefined,
                  }}
                  onClick={() => handleLeftClick(tile.row, tile.col)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleRightClick(tile.row, tile.col);
                  }}
                >
                  {getTileContent(tile)}
                </button>
              );
            })}
          </div>

          {/* ── Win overlay ── */}
          {gameState === 'won' && (
            <div className="ms-overlay win">
              <div className="ms-overlay-card">
                <div className="ms-overlay-emoji">🏆</div>
                <div className="ms-overlay-title win">Field Cleared</div>
                <div className="ms-overlay-time win">{formatTime(timer)}</div>
                <div className="ms-overlay-sub">{DIFFICULTY_CONFIG[difficulty].meta}</div>
                {isNewBest && <div className="ms-overlay-newbest">✦ New Best Time</div>}
                <div className="ms-overlay-actions">
                  <button className="ms-overlay-btn primary" onClick={() => startGame(difficulty)}>Play Again</button>
                  <button className="ms-overlay-btn secondary" onClick={onBack}>Back to Hub</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Loss overlay ── */}
          {gameState === 'lost' && (
            <div className="ms-overlay loss">
              <div className="ms-overlay-card">
                <div className="ms-overlay-emoji">💥</div>
                <div className="ms-overlay-title loss">Mine Hit</div>
                <div className="ms-overlay-time loss">{formatTime(timer)}</div>
                <div className="ms-overlay-sub">Watch your step out there</div>
                <div className="ms-overlay-actions">
                  <button className="ms-overlay-btn primary" onClick={() => startGame(difficulty)}>Try Again</button>
                  <button className="ms-overlay-btn secondary" onClick={onBack}>Back to Hub</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom bar ── */}
        <div className="ms-bottom-bar">
          <span className="ms-hint">Click to reveal · Right-click to flag</span>
        </div>
      </div>
    </div>
  );
}
