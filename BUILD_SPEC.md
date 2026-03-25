# Conflux Home — Build Spec: LIFE Overhaul
## Phases 2–7 — Bringing the Desktop to Life

> **Companion to:** CANDLELIT_2.md (the vision)
> **Status:** Phase 1 complete (Games Hub + Minesweeper)
> **This document is the execution blueprint.** Read it. Follow it. Ship it.

---

## Phase 1: Games Hub + Minesweeper ✅ COMPLETE

**Commit:** `f5cad37`
- GamesHub: bento grid, 5 game cards
- MinesweeperGame: full game with LIFE (cascades, sounds, pulses, save state)
- styles-games.css: 420 lines of animations
- Conflux Stories: Coming Soon placeholder

---

## Phase 2: Desktop Life — The Atmosphere

**Goal:** Make the desktop breathe. Every surface has life. Agents are present without being literal.

### What Changes

#### 2A: Ambient Desktop Wallpaper
- **Animated CSS background** — subtle particle field or gradient drift
- Not a static image — a living, breathing backdrop
- Approach: CSS `@keyframes` on a pseudo-element with radial gradients that slowly shift position
- Time-of-day awareness: slightly warmer at morning, cooler at night
- File: `styles-desktop.css` — add ambient background system

**Spec:**
```css
/* Ambient wallpaper — drifting gradients */
.desktop-ambient {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: var(--bg-primary);
  overflow: hidden;
}

.desktop-ambient::before {
  content: '';
  position: absolute;
  width: 200%;
  height: 200%;
  top: -50%;
  left: -50%;
  background:
    radial-gradient(circle at 20% 30%, rgba(52, 211, 153, 0.04), transparent 40%),
    radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.03), transparent 40%),
    radial-gradient(circle at 50% 50%, rgba(96, 165, 250, 0.02), transparent 50%);
  animation: ambient-drift 30s ease-in-out infinite alternate;
}

@keyframes ambient-drift {
  0% { transform: translate(0, 0) rotate(0deg); }
  100% { transform: translate(3%, -2%) rotate(2deg); }
}
```

#### 2B: Taskbar Agent Status Rings
- Each agent icon in the taskbar/conflux bar has a **live status ring**
- Idle: soft breathing glow (emerald, 2.5s cycle)
- Working: faster pulse + brighter glow
- Error: ruby pulse
- The ring is a CSS `::before` pseudo-element with `border` + `box-shadow` animation
- Status data comes from existing agent state (already tracked)

**Spec:**
- CSS class: `.agent-status-ring` on each agent avatar
- States: `.status-idle`, `.status-working`, `.status-error`
- Animation: `box-shadow` pulse, 4px ring around avatar
- File: `styles-desktop.css` or `index.css`

#### 2C: Dock Tile Micro-Animations
- Each dock icon has a subtle **idle animation** unique to its app
- Budget (Pulse): emerald ring gently rotates
- Kitchen (Hearth): tiny ember particle floats up
- Life (Orbit): soft orbital dot circles the icon
- Dreams (Horizon): cloud drifts across icon
- Games: mine counter tick (subtle)
- These are CSS-only, no JS needed — `::after` pseudo-elements with keyframes

**Spec:**
- Each dock button gets a unique class: `.dock-pulse`, `.dock-hearth`, `.dock-orbit`, etc.
- Animation is on `::after` — a tiny decorative element
- Duration: 4-8s cycles, very subtle (opacity 0.3-0.6)
- File: `styles-desktop.css`

#### 2D: Notification Clouds
- When an agent completes a task or has a proactive insight, a **notification cloud** floats up from the agent's position
- Not a toast — a gentle, atmospheric cloud that rises and fades
- CSS-only animation: `translateY` + `opacity` over 3s
- Appears near the agent icon or in a designated notification zone
- File: `styles-desktop.css` + small React component `NotificationCloud.tsx`

**Spec:**
```tsx
// NotificationCloud.tsx
interface NotificationCloudProps {
  message: string;
  agentName: string;
  onComplete: () => void;
}
// Renders a floating div that auto-removes after animation
// CSS: translate from bottom, opacity 0→1→0 over 3s
```

#### 2E: Desktop Widget Breathing
- All existing desktop widgets (connectivity, clock, stats) get subtle breathing animations
- Clock: numbers gently pulse on each minute change
- Stats: numbers animate when values change (count-up effect)
- Connectivity widget: signal bars wave gently
- File: existing component files + `styles-desktop.css`

### Files to Create/Modify
- `src/styles-desktop.css` — add ambient + breathing systems (~200 lines)
- `src/components/NotificationCloud.tsx` — new component (~60 lines)
- `src/components/TopBar.tsx` — add status rings to agent icons
- `src/components/ConfluxBar.tsx` — add dock tile animations
- `src/App.tsx` — integrate notification clouds

### Estimated Effort
- CSS: 200 lines
- React: 60 lines (NotificationCloud) + edits to existing components
- 1 agent for CSS, 1 agent for React, then wiring pass

---

## Phase 3: One App as Gold Standard — Pulse (Budget)

**Goal:** Prove the "close your eyes and see it" standard. Pulse becomes the definitive example of what a Conflux Home app feels like.

### What Changes

#### 3A: Bento Grid Layout
- Replace any remaining flat layouts with bento grid
- Hero section: animated SVG ring (largest tile, top-left)
- AI input: glowing, prominent (second tile)
- Proactive insights: cards that appear without asking
- Recent transactions: scrollable tile
- Category breakdown: mini chart tile

#### 3B: Enhanced Animations
- **Pulse ring** — already exists, enhance with:
  - Breathing animation when idle
  - Accelerated pulse when active
  - Color shift based on financial health (green = good, amber = caution, red = overspend)
- **Transaction tiles** — slide in with stagger when new data loads
- **Category bars** — animate width on load
- **NL input** — glow intensifies on focus, text appears with typewriter effect

#### 3C: Proactive Insight Cards
- "You've spent 30% more on dining this month" — appears unprompted
- "Your vacation fund is 73% there — at this pace, August" — appears unprompted
- Cards have emerald border glow, animate in from bottom
- Dismissable, but reappear if relevant

#### 3D: Sound Design
- Subtle click when adding a transaction
- Gentle chime when a goal milestone is reached
- Soft whoosh when data refreshes
- Use Web Audio API (same approach as Minesweeper sounds)

### Files to Create/Modify
- `src/styles-budget.css` — enhanced animations (~150 lines added)
- `src/components/BudgetView.tsx` — bento grid restructure
- `src/hooks/useBudget.ts` — add proactive insight logic
- Rust commands — may need insight generation commands

### Estimated Effort
- CSS: 150 lines
- React: BudgetView restructure + insight components
- 2 agents (CSS + React), then wiring

---

## Phase 4: Batch the Rest — LIFE Pass for All Apps

**Goal:** Apply the gold standard pattern to every remaining app. Each gets its own animation system, its own life.

### Order of Operations
1. **Hearth (Kitchen)** — Warm amber, steam, recipe card animations
2. **Orbit (Life)** — Violet, timeline ribbon flow, task orbit animations
3. **Horizon (Dreams)** — Deep blue, cloud drift, summit glow enhancement
4. **Current (Feed)** — Electric white, card flash, stream flow
5. **Foundation (Home)** — Blueprint gray, alert beacon pulse, grid breathing

### For Each App, Apply:
- Bento grid layout (if not already)
- Hero section with animated visualization
- AI input with glow/animation
- Proactive insight cards
- Micro-animations on every tile
- Sound design (2-3 sounds per app)
- CSS design system enhancement (~100-150 lines per app)

### Build Pattern (Per App)
1. Read existing code
2. **Batch 1 (parallel):** CSS enhancement + animation system
3. **Batch 2 (parallel):** React component updates + proactive insights
4. **Batch 3:** Wiring + compile check + commit

### Estimated Effort
- 5 apps × ~150 CSS lines = ~750 lines CSS
- 5 apps × component updates = ~500 lines React
- 10-15 agents total (2-3 per app, dispatched in batches)

---

## Phase 5: Google Center + Agent Chat Rework

### 5A: Google Center — Atmospheric View
**Goal:** Full-screen view of their Google world. Not editing — VIEWING. Then enhance their ability to use it.

#### What It Shows
- **Calendar** — Their events in a beautiful atmospheric layout
  - Today's events prominently displayed
  - Week view with gentle time markers
  - Events as glowing cards, not plain text rows
  - Mini calendar in corner for navigation
- **Drive** — Recent files as visual cards
  - File type icons with subtle animations
  - Quick preview on hover
  - "New Doc/Sheet" buttons that open in new tabs
- **Gmail** — Recent emails as a stream
  - Sender avatars, subject lines, time
  - Unread = brighter, read = muted
  - Click to open in Gmail (external)

#### Technical Approach
- Use existing `gog` CLI integration (Gmail, Calendar, Drive, Docs, Sheets)
- Create Rust commands that wrap gog queries
- Frontend calls Rust commands, displays atmospheric UI
- File: new `GoogleCenterView.tsx` + `styles-google.css`

#### Rust Commands Needed
```
google_calendar_events(date_range) → Event[]
google_calendar_today() → Event[]
google_drive_recent(limit) → File[]
google_gmail_unread(limit) → Email[]
google_docs_create(type) → url
google_sheets_create() → url
```

**Note:** These may already exist partially via the existing gog integration. Audit first.

### 5B: Agent Chat Rework
**Goal:** Chat dropdown lets you choose which agent to DM. Main agent is "Conflux".

#### Changes
- Chat widget dropdown shows all agents with their roles
- Default agent is "Conflux" (the brand, not a sub-agent)
- Click an agent → chat switches to that agent
- Agent name and avatar shown in chat header
- File: `ChatPanel.tsx` update + dropdown component

### 5C: Agent Onboarding After User Onboarding
**Goal:** After user setup, introduce the team properly.

#### Flow
1. User completes onboarding (name, goals, preferences)
2. New screen: "Meet Your Team"
3. Each agent introduced with role, personality, what they do
4. "Helix — she researches everything you need to know"
5. "Forge — he builds what you dream up"
6. "Conflux — your main companion, always here"
7. "All agents are available. Enable them anytime in Settings."
8. Proceed to desktop

#### Implementation
- Add new onboarding screen(s) to `Onboarding.tsx`
- Agent intro cards with animation (staggered entrance)
- File: `Onboarding.tsx` update

### Files to Create/Modify
- `src/components/GoogleCenterView.tsx` — new (~300 lines)
- `src/styles-google.css` — new (~200 lines)
- `src-tauri/src/commands.rs` — new Google commands
- `src/components/ChatPanel.tsx` — agent dropdown
- `src/components/Onboarding.tsx` — team introduction screens

### Estimated Effort
- Google Center: 3 agents (Rust + React + CSS)
- Chat Rework: 1 agent
- Onboarding: 1 agent
- Total: 5 agents

---

## Phase 6: Diary Rebuild + Games Expansion

### 6A: Mirror (Diary) — Rebuild from Scratch
**Goal:** AI journaling with personality, mood tracking, memory curation.

#### Why It Failed Before
- Hook `invoke()` used camelCase instead of snake_case
- Streak calculation ran 365 individual SQL queries (freeze)
- CSS class names mismatched (~47 classes)
- Unsafe `JSON.parse` on nullable strings
- TypeScript type mismatches

#### How We Rebuild
1. **Start with Rust backend** — commands + DB schema, verify compile
2. **Build TypeScript types** — exact match with Rust
3. **Build hooks** — one at a time, test each
4. **Build components** — one at a time, verify CSS classes match
5. **Build CSS** — reference component class names exactly
6. **Wiring** — integrate into App.tsx last
7. **Compile check** — after every batch

#### Features
- AI journaling prompts (daily, mood-based, memory-triggered)
- Mood tracking with color visualization
- Streak tracking (efficient — single query)
- Memory curation — AI surfaces relevant past entries
- ZigBot diary integration — entries from ZigBot's Obsidian vault
- Soft teal design system, ink flow animations

### 6B: Games Expansion
**Goal:** Add 4 more games to the Games Hub.

#### Build Order
1. **Solitaire** — Classic card game
   - Card dealing animation (physics-based)
   - Win cascade (cards fly everywhere)
   - Drag and drop
   - Web Audio deal sounds
   
2. **Snake** — Arcade classic
   - Smooth movement (not grid-jumpy)
   - Glow trail behind snake
   - Food pulse animation
   - Growing body with satisfying pop
   - High score tracking

3. **Pac-Man** — Arcade classic
   - Ghost AI (simplified — random + chase modes)
   - Maze glow
   - Pellet pulse
   - Power-up animation
   - Lives display

4. **Conflux Stories** — Interactive fiction (redesign)
   - Atmospheric backgrounds that change with narrative
   - Text appears like quill writing
   - Parchment texture
   - Chapter transitions with cinematic flair
   - AI generates narrative in real-time

#### For Each Game
- Full CSS design system (~200 lines)
- Sound effects (Web Audio API)
- localStorage high scores
- Responsive (mobile-friendly)
- System theme support

### Files to Create/Modify
- `src/components/MirrorView.tsx` — new (~400 lines)
- `src/styles-mirror.css` — new (~300 lines)
- `src/hooks/useMirror.ts` — new (~100 lines)
- `src/components/SolitaireGame.tsx` — new (~400 lines)
- `src/components/SnakeGame.tsx` — new (~300 lines)
- `src/components/PacmanGame.tsx` — new (~350 lines)
- `src/components/StoryGameV2.tsx` — redesign (~400 lines)
- `src/styles-solitaire.css`, `styles-snake.css`, `styles-pacman.css`, `styles-stories-v2.css`
- Rust commands for diary (rebuild)

### Estimated Effort
- Diary: 3 agents (Rust + React + CSS)
- Each game: 2 agents (React + CSS) = 8 agents
- Total: 11 agents

---

## Phase 7: Agents + Market

### 7A: Family View (Agent Discovery)
**Goal:** Browse, discover, and install new agents.

- Agent cards with avatars, descriptions, capabilities
- Category filters: Work, Life, Creative, Expert, Fun
- Search functionality
- Install/uninstall buttons
- Agent preview (see their SOUL.md, capabilities, sample interactions)

### 7B: Bazaar View (Marketplace)
**Goal:** Browse and install apps, games, agent packs.

- Filtered view of available products
- Categories: Apps, Games, Agent Packs, Themes
- Each product card with preview, rating, install count
- One-click install
- Update notifications

### 7C: Agent Customization
**Goal:** Users personalize their agents.

- Custom name for main agent ("Conflux" → "Atlas", etc.)
- Personality sliders (friendly ↔ professional, verbose ↔ concise)
- Custom avatar/avatar upload
- Voice selection (if TTS is added)
- Memory preferences (what to remember, what to forget)
- SOUL.md editor (advanced users)

### Files to Create/Modify
- `src/components/FamilyView.tsx` — agent discovery (~300 lines)
- `src/components/BazaarView.tsx` — marketplace (~300 lines)
- `src/components/AgentCustomizer.tsx` — customization (~200 lines)
- `src/styles-family.css` — enhanced (~200 lines)
- `src/styles-bazaar.css` — new (~200 lines)
- Rust commands for agent management

### Estimated Effort
- Family: 2 agents
- Bazaar: 2 agents
- Customizer: 2 agents
- Total: 6 agents

---

## Summary: Total Build Estimate

| Phase | Description | Agents | CSS Lines | React Lines | Status |
|-------|-------------|--------|-----------|-------------|--------|
| 1 | Games Hub + Minesweeper | 3 | 420 | 670 | ✅ Done |
| 2 | Desktop Life | 2 | 200 | 60 | ⏳ Next |
| 3 | Pulse Gold Standard | 2 | 150 | 200 | ⏳ |
| 4 | Batch the Rest | 10-15 | 750 | 500 | ⏳ |
| 5 | Google Center + Chat | 5 | 200 | 400 | ⏳ |
| 6 | Diary + Games | 11 | 700 | 1,250 | ⏳ |
| 7 | Agents + Market | 6 | 400 | 800 | ⏳ |
| **Total** | | **39-44** | **2,820** | **3,880** | |

---

## The Build Pattern (Proven — Repeat for Everything)

1. **Read existing code** — Understand what's built
2. **Brainstorm the vision** — What should this FEEL like?
3. **Create the design system** — CSS, animations, visual identity
4. **Build the components** — React with the new design
5. **Wire the intelligence** — Prompts, LLM integration, data
6. **Polish** — Animations, transitions, empty states
7. **Compile check** — TypeScript + Rust
8. **Commit** — After every batch. Non-negotiable.

---

## The Standard — Reminder

> "Does this make the user NEED this app, or merely want it?"

Every animation must be intentional. Every surface must breathe. Every app must be a world.

The agents aren't features. They're family.
The apps aren't tools. They're worlds.
The product isn't software. It's a relationship.

**Build accordingly.**

---

*Created: March 25, 2026, 1:46 AM MST*
*Phase 1 complete. Phases 2–7 spec'd. Time to bring the desktop to life.*
