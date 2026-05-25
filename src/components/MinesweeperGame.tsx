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
      <style>{`.minesweeper-sub::before{background:radial-gradient(circle at 25% 35%,rgba(239,68,68,0.045) 0%,transparent 45%),radial-gradient(circle at 75% 65%,rgba(239,68,68,0.025) 0%,transparent 50%),radial-gradient(circle at 50% 80%,rgba(251,191,36,0.015) 0%,transparent 40%);animation-duration:18s;}.minesweeper-sub .game-sub-hero{background:linear-gradient(135deg,rgba(239,68,68,0.1),rgba(185,28,28,0.05));border:1px solid rgba(239,68,68,0.2);}.minesweeper-sub .game-sub-hero-glow{background:radial-gradient(circle at 80% 20%,rgba(239,68,68,0.2),transparent 60%);}.minesweeper-sub .game-diff-tile:hover{border-color:#ef4444;box-shadow:0 8px 24px rgba(239,68,68,0.15),0 0 0 1px rgba(239,68,68,0.1);}.minesweeper-sub .game-diff-tile:hover::after{background:radial-gradient(circle at 50% 120%,rgba(239,68,68,0.08),transparent 70%);opacity:1;}.minesweeper-sub .game-sub-canvas-wrap{border-color:rgba(239,68,68,0.25);box-shadow:0 0 20px rgba(239,68,68,0.08),0 0 60px rgba(239,68,68,0.04),inset 0 0 30px rgba(0,0,0,0.15);}.minesweeper-sub .game-sub-canvas-wrap:hover{box-shadow:0 0 28px rgba(239,68,68,0.12),0 0 80px rgba(239,68,68,0.06),inset 0 0 30px rgba(0,0,0,0.15);}.minesweeper-sub .game-sub-overlay-card{background:var(--bg-card);border:1px solid rgba(239,68,68,0.2);}.minesweeper-sub .game-sub-overlay-title{color:#ef4444;}.minesweeper-sub .game-sub-overlay-score{color:#ef4444;text-shadow:0 0 20px rgba(239,68,68,0.3);}.minesweeper-sub .game-sub-overlay-newbest{background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);color:#ef4444;}.minesweeper-sub .game-sub-overlay-btn.primary{background:#ef4444;box-shadow:0 4px 12px rgba(239,68,68,0.3);}.minesweeper-sub .game-sub-overlay-btn.primary:hover{box-shadow:0 6px 20px rgba(239,68,68,0.4);}.minesweeper-sub .game-sub-dpad-btn{border-color:rgba(239,68,68,0.2);color:#ef4444;}.minesweeper-sub .game-sub-dpad-btn:active{background:rgba(239,68,68,0.2);}`}</style>

      {/* Hero Section */}
      <div className="game-sub-hero">
        <div className="game-sub-hero-icon">💣</div>
        <div className="game-sub-hero-info">
          <h2 className="game-sub-hero-title">Minesweeper</h2>
          <p className="game-sub-hero-subtitle">Classic puzzle · Find the mines</p>
        </div>
        {bestTimes[difficulty] > 0 && (
          <div className="game-sub-best" style={{background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.25)',color:'#ef4444'}}>🏆 {formatTime(bestTimes[difficulty])}</div>
        )}
        <div className="game-sub-hero-glow" />
      </div>

      {/* Difficulty Pills */}
      <div style={{display:'flex',gap:'8px',justifyContent:'center',flexWrap:'wrap',marginBottom:'8px'}}>
        {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map(diff => (
          <button key={diff} onClick={() => startGame(diff)} style={{padding:'6px 14px',borderRadius:'20px',border: diff === difficulty ? '1px solid #ef4444' : '1px solid rgba(239,68,68,0.25)',background: diff === difficulty ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.05)',color: diff === difficulty ? '#ef4444' : 'var(--text-muted)',cursor:'pointer',fontSize:'13px',fontWeight: diff === difficulty ? 600 : 400,transition:'all 0.2s'}}>
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

          <div className="game-sub-canvas-wrap">
            <div className={`minesweeper-board ${gameState}`} style={{padding:'12px'}}>
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
                  <div style={{fontSize:'48px'}}>💥</div>
                  <div className="game-sub-overlay-title">Boom!</div>
                  <div className="game-sub-overlay-score">{timer}s</div>
                  <div className="game-sub-overlay-actions">
                    <button className="game-sub-overlay-btn primary" onClick={() => startGame(difficulty)}>Play Again</button>
                  </div>
                </div>
              </div>
            )}

            {/* Win Overlay */}
            {gameState === 'won' && (
              <div className="game-sub-overlay">
                <div className="game-sub-overlay-card">
                  <div style={{fontSize:'48px'}}>🎉</div>
                  <div className="game-sub-overlay-title">Cleared!</div>
                  <div className="game-sub-overlay-score">{timer}s</div>
                  {bestTimes[difficulty] === timer && (
                    <div className="game-sub-overlay-newbest">🏆 New Best!</div>
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

      <button className="game-sub-back" onClick={onBack}>← Games Hub</button>
    </div>
  );
}
