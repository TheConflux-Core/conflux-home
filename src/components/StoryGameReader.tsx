// Conflux Home — Story Game Reader
// Interactive adventure puzzle game UI. Reads chapters, presents choices, handles puzzles.

import { useState, useEffect, useRef, useCallback } from 'react';
import type { StoryGame, StoryChapter, StoryChoice, StoryPuzzle } from '../types';
import { GENRE_CONFIG } from '../types';

interface StoryGameReaderProps {
  game: StoryGame;
  chapters: StoryChapter[];
  currentChapter: StoryChapter | null;
  onChoose: (chapterId: string, choiceId: string) => Promise<void>;
  onSolvePuzzle: (chapterId: string) => Promise<void>;
  onClose: () => void;
  onGenerateNext: (gameId: string, choiceId: string) => Promise<void>;
}

export default function StoryGameReader({
  game, chapters, currentChapter, onChoose, onSolvePuzzle, onClose, onGenerateNext,
}: StoryGameReaderProps) {
  const [puzzleAnswer, setPuzzleAnswer] = useState('');
  const [puzzleError, setPuzzleError] = useState('');
  const [generating, setGenerating] = useState(false);
  const storyRef = useRef<HTMLDivElement>(null);
  const puzzleRef = useRef<HTMLInputElement>(null);

  const genreConfig = GENRE_CONFIG[game.genre];

  // Parse choices from current chapter
  const choices: StoryChoice[] = currentChapter
    ? (() => { try { return JSON.parse(currentChapter.choices); } catch { return []; } })()
    : [];

  // Parse puzzle from current chapter
  const puzzle: StoryPuzzle | null = currentChapter?.puzzle
    ? (() => { try { return JSON.parse(currentChapter.puzzle); } catch { return null; } })()
    : null;

  const hasPuzzle = puzzle && !currentChapter?.puzzle_solved;
  const hasChosen = !!currentChapter?.chosen_choice_id;
  const showChoices = !hasPuzzle && !hasChosen && choices.length > 0;

  // Auto-scroll to bottom on new content
  useEffect(() => {
    if (storyRef.current) {
      storyRef.current.scrollTop = storyRef.current.scrollHeight;
    }
  }, [chapters.length, hasPuzzle, hasChosen]);

  // Focus puzzle input when puzzle appears
  useEffect(() => {
    if (hasPuzzle && puzzleRef.current) {
      puzzleRef.current.focus();
    }
  }, [hasPuzzle]);

  const handleChoice = useCallback(async (choiceId: string) => {
    if (!currentChapter || generating) return;
    setGenerating(true);
    try {
      await onChoose(currentChapter.id, choiceId);
      await onGenerateNext(game.id, choiceId);
    } finally {
      setGenerating(false);
    }
  }, [currentChapter, generating, onChoose, onGenerateNext, game.id]);

  const handlePuzzleSubmit = useCallback(async () => {
    if (!currentChapter || !puzzle) return;
    const correct = puzzleAnswer.trim().toLowerCase() === puzzle.answer.toLowerCase();
    if (correct) {
      setPuzzleError('');
      await onSolvePuzzle(currentChapter.id);
      // After solving, show choices
    } else {
      setPuzzleError('Not quite! Try again.');
      setPuzzleAnswer('');
    }
  }, [currentChapter, puzzle, puzzleAnswer, onSolvePuzzle]);

  const puzzleSolved = currentChapter?.puzzle_solved;

  return (
    <div className="story-reader-overlay">
      <div className="story-reader">
        {/* Header */}
        <div className="story-header">
          <div className="story-title-section">
            <span className="story-genre-badge">{genreConfig.emoji} {genreConfig.label}</span>
            <h2>{game.title}</h2>
            <span className="story-chapter-badge">Chapter {game.current_chapter}</span>
          </div>
          <button className="story-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Story Content */}
        <div className="story-content" ref={storyRef}>
          {chapters.map((chapter, idx) => (
            <div key={chapter.id} className="story-chapter">
              {chapter.title && <h3 className="chapter-title">{chapter.title}</h3>}
              <div className="chapter-narrative">{chapter.narrative}</div>

              {/* Scene Image */}
              {chapter.image_url && (
                <img src={chapter.image_url} alt="Scene" className="chapter-image" />
              )}

              {/* Choices (for past chapters, show what was chosen) */}
              {chapter.chosen_choice_id && idx < chapters.length - 1 && (
                <div className="chosen-path">
                  ✓ {(() => {
                    try {
                      const ch: StoryChoice[] = JSON.parse(chapter.choices);
                      return ch.find(c => c.id === chapter.chosen_choice_id)?.text ?? '';
                    } catch { return ''; }
                  })()}
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator while generating */}
          {generating && (
            <div className="story-generating">
              <div className="generating-dots">
                <span></span><span></span><span></span>
              </div>
              <p>The story continues...</p>
            </div>
          )}
        </div>

        {/* Puzzle Section */}
        {hasPuzzle && !puzzleSolved && (
          <div className="story-puzzle">
            <div className="puzzle-badge">🧩 Puzzle: {puzzle.puzzle_type}</div>
            <div className="puzzle-question">{puzzle.question}</div>
            <div className="puzzle-input-row">
              <input
                ref={puzzleRef}
                type="text"
                value={puzzleAnswer}
                onChange={e => setPuzzleAnswer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePuzzleSubmit()}
                placeholder="Your answer..."
                className="puzzle-input"
              />
              <button onClick={handlePuzzleSubmit} className="puzzle-submit">Submit</button>
            </div>
            {puzzleError && <div className="puzzle-error">{puzzleError}</div>
            }
            {puzzle.hint && (
              <button
                className="puzzle-hint-btn"
                onClick={() => setPuzzleError(`💡 Hint: ${puzzle.hint}`)}
              >
                💡 Need a hint?
              </button>
            )}
          </div>
        )}

        {/* Choices Section */}
        {showChoices && !generating && (
          <div className="story-choices">
            <div className="choices-label">What do you do?</div>
            {choices.map(choice => (
              <button
                key={choice.id}
                className="story-choice-btn"
                onClick={() => handleChoice(choice.id)}
              >
                <span className="choice-arrow">▸</span>
                {choice.text}
              </button>
            ))}
          </div>
        )}

        {/* Puzzle solved — show choices now */}
        {puzzleSolved && showChoices && !generating && (
          <div className="story-choices">
            <div className="puzzle-solved-badge">✅ Puzzle solved!</div>
            <div className="choices-label">What do you do next?</div>
            {choices.map(choice => (
              <button
                key={choice.id}
                className="story-choice-btn"
                onClick={() => handleChoice(choice.id)}
              >
                <span className="choice-arrow">▸</span>
                {choice.text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
