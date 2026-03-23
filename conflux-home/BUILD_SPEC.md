# Conflux Home — Ecosystem Build Spec
## Session: 2026-03-23, 6:50 AM - 11:00 AM MST

### Goal
Transform Conflux Home from a desktop chat app into a family AI ecosystem.

---

## PHASE 1: Schema Extensions (30 min)

### 1.1 Family Profiles Table
```sql
CREATE TABLE family_members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER,
    age_group TEXT NOT NULL,  -- 'toddler' | 'preschool' | 'kid' | 'teen' | 'young_adult' | 'adult'
    avatar TEXT,              -- emoji or image path
    color TEXT DEFAULT '#6366f1',
    default_agent_id TEXT REFERENCES agents(id),
    parent_id TEXT REFERENCES family_members(id),  -- NULL = head of household
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (now),
    updated_at TEXT DEFAULT (now)
);
```

### 1.2 Story Game Tables
```sql
CREATE TABLE story_games (
    id TEXT PRIMARY KEY,
    member_id TEXT REFERENCES family_members(id),
    agent_id TEXT NOT NULL,
    title TEXT NOT NULL,
    genre TEXT NOT NULL,      -- 'adventure' | 'mystery' | 'fantasy' | 'scifi' | 'horror'
    age_group TEXT NOT NULL,
    status TEXT DEFAULT 'active',  -- 'active' | 'completed' | 'paused'
    current_chapter INTEGER DEFAULT 1,
    story_state TEXT,         -- JSON: full story state
    created_at TEXT DEFAULT (now),
    updated_at TEXT DEFAULT (now)
);

CREATE TABLE story_chapters (
    id TEXT PRIMARY KEY,
    game_id TEXT REFERENCES story_games(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    title TEXT,
    narrative TEXT NOT NULL,  -- the story text
    choices TEXT NOT NULL,    -- JSON array: [{id, text, consequence}]
    puzzle TEXT,              -- JSON: puzzle data if any
    puzzle_solved INTEGER DEFAULT 0,
    image_prompt TEXT,        -- for DALL-E scene generation
    image_url TEXT,
    chosen_choice_id TEXT,    -- what the player chose
    created_at TEXT DEFAULT (now)
);
```

### 1.3 Agent Templates Table
```sql
CREATE TABLE agent_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    description TEXT NOT NULL,
    age_group TEXT NOT NULL,
    soul TEXT NOT NULL,
    instructions TEXT NOT NULL,
    model_alias TEXT DEFAULT 'conflux-fast',
    category TEXT NOT NULL,   -- 'education' | 'productivity' | 'creative' | 'wellness' | 'companion'
    is_system INTEGER DEFAULT 0,  -- 1 = built-in, not deletable
    created_at TEXT DEFAULT (now)
);
```

---

## PHASE 2: Agent Templates (batch generate with MiMo)

### Age Groups & Templates

**Toddler (1-2):**
- 🧸 Tiny Learner — ABCs, 123s, shapes, colors, animal sounds

**Preschool (2-5):**
- 🌈 Story Buddy — Interactive stories, counting games, vocabulary building
- 🎵 Sing-Along — Songs, rhymes, music exploration

**Kid (5-13):**
- 🎮 PlayPal — Homework disguised as fun, coding basics, science experiments
- 🔍 Explorer — Nature, history, space — curiosity-driven learning
- 🎨 Creator — Drawing prompts, creative writing, music making

**Teen (13-18):**
- 📚 StudyBuddy — Test prep, essay help, college planning
- 💡 LifeSkills — Budgeting, cooking, first job prep

**Young Adult (19-29):**
- 💼 CareerCoach — Resume, interview, networking, career planning
- 💰 FinanceGuru — Budgeting, credit, investing basics, taxes

**Adult (30+):**
- 🏠 HomeBase — Meal planning, household, family calendar, life admin

---

## PHASE 3: Conflux Stories Game Engine

### Core Concept
An infinite, AI-generated interactive adventure puzzle game.
- Player makes choices that shape the story
- AI generates puzzles (logic, pattern, word, riddle) integrated into narrative
- Story remembers all choices (persistent state in SQLite)
- Each playthrough is unique
- Player's real memory/files CAN influence story (opt-in via agent memory)

### Game Flow
1. Player selects genre + difficulty
2. AI generates opening chapter with 2-3 choices
3. Player reads narrative, makes choice
4. Some chapters include puzzles (must solve to progress)
5. AI generates next chapter based on choice
6. Story continues infinitely or until player completes arc

### Puzzle Types
- **Riddle** — AI generates riddle, player types answer
- **Pattern** — sequence completion (2, 4, 8, 16, ?)
- **Logic** — deduction puzzles (who did it, which door, etc.)
- **Word** — anagrams, crosswords, word association
- **Code** — simple cipher decoding

### UI
- Story text in center (like reading a book)
- Choice buttons at bottom (3 options typically)
- Puzzle overlay when puzzle appears
- Chapter progress bar
- Scene illustration (DALL-E generated, optional)

---

## PHASE 4: UI Components

### 4.1 Family Switcher
- Top bar shows family member avatars
- Click to switch active family member
- Agent list filters/shows relevant agents for that member's age group

### 4.2 Agent Template Browser
- "Add Agent" button on desktop
- Browse templates by category/age group
- One-click install creates agent from template

### 4.3 Story Game UI
- New "Games" tab on desktop
- Story reader component
- Puzzle interaction component
- Game history/save slots

---

## BUILD ORDER (parallel where possible)

1. Schema extensions (Rust migration) — Forge
2. Agent template batch generation — MiMo API calls
3. Family profiles CRUD (Rust + React) — Forge
4. Story engine module (Rust) — Forge
5. Story game UI (React) — Forge
6. Family switcher UI (React) — Forge
7. Integration testing — Quanta

## BUDGET
- MiMo: FREE (batch all content now)
- OpenAI DALL-E: Up to $5 for story scene images
- Time: 4 hours hard stop

## SUCCESS CRITERIA
- [ ] Family profiles table exists, CRUD works
- [ ] 10+ agent templates seeded in DB
- [ ] Can create a story game and play 3+ chapters
- [ ] Puzzles appear and are solvable
- [ ] Family switcher shows in UI
- [ ] All tests pass
