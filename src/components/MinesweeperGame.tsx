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

type GameState = 'playing' | 'won' | 'lost';
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
  const [board, setBoard] = useState<Tile[][]>(() => createEmptyBoard(9, 9));
  const [mineCount, setMineCount] = useState(10);
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

  // ── Difficulty Pills ─────────────────────────────────────────────────────

  const difficultyPills = (
    <div style={{
      display: 'flex',
      gap: '8px',
      justifyContent: 'center',
      flexWrap: 'wrap',
    }}>
      {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map(diff => (
        <button
          key={diff}
          onClick={() => startGame(diff)}
          style={{
            background: diff === difficulty ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${diff === difficulty ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: diff === difficulty ? 600 : 400,
            color: diff === difficulty ? '#ef4444' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {DIFFICULTY_CONFIG[diff].label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="game-sub-container minesweeper-sub">
      {/* Enhanced Visual Styles for Minesweeper */}
      <style>{`
        /* Tile States */
        .minesweeper-tile {
          transition: all 0.15s ease;
          position: relative;
          overflow: hidden;
        }
        
        .minesweeper-tile.tile-hidden {
          background: linear-gradient(145deg, #2d2d2d 0%, #1a1a1a 100%);
          border: 1px solid #3d3d3d;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .minesweeper-tile.tile-hidden:hover {
          background: linear-gradient(145deg, #3d3d3d 0%, #2a2a2a 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 0 15px rgba(239,68,68,0.2), 0 2px 4px rgba(0,0,0,0.3);
          transform: translateY(-1px);
        }
        
        .minesweeper-tile.tile-hidden::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        
        .minesweeper-tile.tile-hidden:hover::after {
          opacity: 1;
        }
        
        .minesweeper-tile.tile-flagged {
          background: linear-gradient(145deg, #2d2d2d 0%, #1a1a1a 100%);
          border: 1px solid #ef4444;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 0 10px rgba(239,68,68,0.3);
        }
        
        .minesweeper-tile.tile-revealed {
          background: linear-gradient(145deg, #1f1f1f 0%, #151515 100%);
          border: 1px solid #2a2a2a;
          box-shadow: inset 0 1px 0 rgba(0,0,0,0.3);
        }
        
        /* Number Colors - Premium Palette */
        .minesweeper-tile.tile-num-1 { color: #5b9bd5; }
        .minesweeper-tile.tile-num-2 { color: #70ad47; }
        .minesweeper-tile.tile-num-3 { color: #ff6b6b; }
        .minesweeper-tile.tile-num-4 { color: #9b59b6; }
        .minesweeper-tile.tile-num-5 { color: #e74c3c; }
        .minesweeper-tile.tile-num-6 { color: #1abc9c; }
        .minesweeper-tile.tile-num-7 { color: #f39c12; }
        .minesweeper-tile.tile-num-8 { color: #95a5a6; }
        
        /* Mine States */
        .minesweeper-tile.tile-mine {
          background: linear-gradient(145deg, #8b0000 0%, #5a0000 100%);
          border: 1px solid #ff4444;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 0 15px rgba(239,68,68,0.4);
        }
        
        .minesweeper-tile.tile-mine-exploded {
          background: linear-gradient(145deg, #ff0000 0%, #cc0000 100%);
          border: 1px solid #ff6666;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 0 25px rgba(255,0,0,0.6);
          animation: mine-explode 0.3s ease-out;
        }
        
        @keyframes mine-explode {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        
        /* Screen Shake Animation */
        @keyframes screen-shake {
          0%, 100% { transform: translateX(0) translateY(0); }
          10% { transform: translateX(-2px) translateY(1px); }
          20% { transform: translateX(2px) translateY(-1px); }
          30% { transform: translateX(-2px) translateY(1px); }
          40% { transform: translateX(2px) translateY(-1px); }
          50% { transform: translateX(-1px) translateY(2px); }
          60% { transform: translateX(1px) translateY(-2px); }
          70% { transform: translateX(-1px) translateY(1px); }
          80% { transform: translateX(1px) translateY(-1px); }
          90% { transform: translateX(-1px) translateY(1px); }
        }
        
        .minesweeper-board.lost {
          animation: screen-shake 0.5s ease-in-out;
        }
        
        /* Overlay Styles */
        .game-sub-overlay-card {
          background: linear-gradient(145deg, rgba(30,30,30,0.95) 0%, rgba(20,20,20,0.98) 100%);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          box-shadow: 0 25px 50px rgba(0,0,0,0.5), 0 0 100px rgba(239,68,68,0.1);
          animation: overlay-card-in 0.4s ease forwards;
        }
        
        @keyframes overlay-card-in {
          0% { opacity: 0; transform: scale(0.9) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        
        .game-sub-overlay-title {
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(135deg, #fff 0%, #ccc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
        }
        
        .game-sub-overlay-newbest {
          background: linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.1) 100%);
          border: 1px solid rgba(239,68,68,0.4);
          border-radius: 8px;
          padding: 8px 16px;
          color: #ef4444;
          font-weight: 600;
          margin: 12px 0;
          animation: pulse-glow 2s ease-in-out infinite;
        }
        
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 10px rgba(239,68,68,0.3); }
          50% { box-shadow: 0 0 20px rgba(239,68,68,0.5); }
        }
        
        /* Cascade Animation */
        .minesweeper-tile.tile-revealed {
          animation: cascade-reveal 0.15s ease-out;
        }
        
        @keyframes cascade-reveal {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Hero Section */}
      <div className="game-sub-hero">
        <div className="game-sub-hero-icon">💣</div>
        <div className="game-sub-hero-info">
          <h2 className="game-sub-hero-title">Minesweeper</h2>
          <p className="game-sub-hero-subtitle">Classic grid · Find the safe path</p>
        </div>
        {bestTimes[difficulty] != null && (
          <div className="game-sub-best">🏆 {formatTime(bestTimes[difficulty])}</div>
        )}
        <div className="game-sub-hero-glow" />
      </div>

      {/* Difficulty Pills — always visible */}
      <div style={{ padding: '8px 0' }}>
        {difficultyPills}
      </div>

      {/* HUD */}
      <div className="game-sub-hud">
        <div className="game-sub-hud-left">
          <span className="game-sub-hud-label">Mines</span>
          <span className="game-sub-hud-value">💣 {mineCount - flagCount}</span>
        </div>
        <div className="game-sub-hud-center">
          <button className="game-sub-overlay-btn primary" onClick={() => startGame(difficulty)} style={{fontSize:'13px',padding:'8px 18px'}}>New Game</button>
        </div>
        <div className="game-sub-hud-right">
          <span className="game-sub-hud-label">Time</span>
          <span className="game-sub-hud-value">⏱ {formatTime(timer)}</span>
        </div>
      </div>

      {/* Board */}
      <div style={{ position: 'relative' }}>
        <div className={`game-sub-canvas-wrap minesweeper-board ${gameState === 'lost' ? 'lost' : ''}`}>
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

        {/* Won / Lost Overlay — with inline difficulty pills */}
        {showOverlay && (
          <div className="game-sub-overlay" style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.8)',backdropFilter:'blur(8px)',zIndex:10,borderRadius:'16px',animation:'overlay-in 0.4s ease forwards'}}>
            <div className="game-sub-overlay-card" style={{padding:'28px 36px'}}>
              <div style={{fontSize:'48px'}}>{gameState === 'won' ? '🎉' : '💥'}</div>
              <div className="game-sub-overlay-title">
                {gameState === 'won' ? 'Field Cleared!' : 'Game Over'}
              </div>
              <div className="game-sub-overlay-sub" style={{color:'var(--text-muted)'}}>
                {gameState === 'won' ? `Time: ${formatTime(timer)}` : 'Hit a mine!'}
              </div>
              {gameState === 'won' && bestTimes[difficulty] && (
                <div className="game-sub-overlay-newbest">🏆 Best: {formatTime(bestTimes[difficulty])}</div>
              )}
              <div className="game-sub-overlay-actions">
                <button className="game-sub-overlay-btn primary" onClick={() => startGame(difficulty)}>
                  {gameState === 'won' ? 'Play Again' : 'Try Again'}
                </button>
              </div>
              {/* Inline difficulty pills on overlay */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Switch Difficulty
                </div>
                {difficultyPills}
              </div>
            </div>
          </div>
        )}
      </div>

      <button className="back-to-hub" onClick={onBack}>← Games Hub</button>
    </div>
  );
}
