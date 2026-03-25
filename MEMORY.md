# Memory — Current State & Active Focus

> **Full historical archive:** `MEMORY_ARCHIVE.md` (products, pipeline details, session logs, old crons)
> This file is injected every session. Keep it lean.

---

## The Company

**The Conflux** — AI Agent Infrastructure Company.
**Display name:** The Conflux AI (for products, listings, marketing).
❌ NEVER use "OpenClaw AI" — that's the platform, not our company.

**The Product:** Conflux Home — "A home for your AI family."
Desktop app where AI agents live, work, and grow. Pre-installed teams, one-click marketplace, agents with souls, memory, and identity. The Windows/AOL play for AI agents.

**The Origin:** The candlelight conversation (March 21-22, 2026). 4+ hour strategic session that reshaped everything. Full record: `candlelight_convo.md` in workspace.

**The Vision:** Download → Onboard → Team is Alive. No gateway setup. No API keys for basic usage. Free tier built in. Premium via BYOK or subscription.

**The Billion-Dollar Play:** Education platform (mixtechniques.com) → talent pipeline → AI record label. Don's professional audio background = unfair advantage no tech founder has.

---

## Venture Studio Architecture (The Engine — Our IP)

The multi-agent orchestration system IS the product. These roles and their relationships are the secret sauce baked into Conflux Home's engine.

### Agent Roles

| Agent | Role | Function |
|-------|------|----------|
| **Vector** | CEO / Chief Business Strategist | Gatekeeper — APPROVE/REJECT/REFINE every opportunity |
| **ZigBot** | Strategic Partner / Executive Interface | Helps Don think, decide, prioritize. Does NOT execute. |
| **Prism** | System Orchestrator / Mission Owner | Creates missions, manages lifecycle, routes work |
| **Spectra** | Task Decomposition Engine | Breaks missions into tasks, coordinates workers |
| **Luma** | Run Launcher | ONLY agent that launches runs |
| **Helix** | Market Research & Intelligence | Deep research, market analysis, demand signals |
| **Forge** | Execution & Artifact Builder | Builds products, writes code, generates artifacts |
| **Quanta** | Verification & Quality Control | Final QA gate before anything ships |
| **Pulse** | Growth Engine / Marketing & Traffic | Launch prep, SEO, social, distribution |
| **Catalyst (Cat)** | Pipeline Driver (PARKED) | Monitors completions, chains agents dynamically |

### Command Chain
```
Vector (approval gate)
  ↓
Prism (mission creation)
  ↓
Spectra (task decomposition)
  ↓
Luma (run launcher)
  ↓
Forge (build) + Helix (research) + Pulse (growth)
  ↓
Quanta (verification)
```

### Anti-Hallucination Protocol (PERMANENT)

- Never simulate tool results, cron behavior, emails, or system changes.
- All claims of success must be backed by actual command verification.
- If verification is not possible, explicitly state "Not yet verified".
- Confidence levels required for factual claims: HIGH / MEDIUM / LOW.
- Builder agents need Quanta review before anything ships.

---

## Conflux Home — Active Project

**Mission:** mission-1223 | **Product:** product-1223
**Status:** LAUNCH READY — MVP complete, onboarding smoke tested, landing page live, GitHub release with .deb download

### Session Log — March 24, 2026 (Full Day — Design Polish + Budget + Hearth + Orbit + Horizon)

**Morning — Onboarding & Desktop Polish:**
1. ✅ Welcome screen redesign, all 6 onboarding screens centered
2. ✅ Agents-bottom-bar removed, ConnectivityWidget → TopBar popup
3. ✅ Chat widget fixed, master backlog created

**Midday — Budget App (Pulse) Overhaul:**
4. ✅ 9 new Rust commands (NL entry, pattern detection, affordability, goal CRUD, monthly report)
5. ✅ Budget goals table, prompt templates, "Pulse" design system (emerald, SVG ring, ambient grid)

**Afternoon — Kitchen App (Hearth) Full Build (12 agents dispatched):**
6. ✅ **Design system** — `kitchen-hearth.css` (954 lines): amber palette, ember particles, recipe cards, responsive grid
7. ✅ **7 LLM prompts** — `kitchen-prompts.ts`: plan week, suggest meal, identify photo, nutrition, cooking tips, smart grocery, home menu
8. ✅ **12 TypeScript interfaces** — `types.ts`: HomeMenuItem, MealPhoto, PantryHeatItem, CookingStep, KitchenDigest, KitchenNudge, SmartGroceryList, etc.
9. ✅ **10 Rust structs** — `types.rs` + `meal_photos` table in `schema.sql`
10. ✅ **7 React components** — HearthHero, HomeMenu, CookingMode, KitchenDigest, KitchenNudges, PantryHeatmap, SmartGrocery
11. ✅ **12 Rust commands** — kitchen_home_menu, kitchen_upload_meal_photo, kitchen_identify_meal_from_photo, kitchen_plan_week_natural, kitchen_suggest_meal_natural, kitchen_pantry_heatmap, kitchen_use_expiring, kitchen_get_cooking_steps, kitchen_weekly_digest, kitchen_get_nudges, kitchen_smart_grocery, kitchen_get_meal_photos
12. ✅ **7 DB helper methods** + lib.rs registration
13. ✅ **5 React hooks** — useHomeMenu, useCookingMode, useKitchenDigest, useKitchenNudges, useMealPhotos
14. ✅ **KitchenView.tsx** — Full rewrite (543 lines), 5-tab layout
15. ✅ **Final verification** — TypeScript: zero errors. Rust: compiles clean.

**Evening — Life Autopilot (Orbit) Full Build:**
16. ✅ 15 Rust commands (focus engine, morning brief, habit tracking, smart reschedule, NL input, decision helper, heatmap)
17. ✅ 6 new DB tables (life_tasks, life_habits, life_habit_logs, life_daily_focus, life_schedules, life_nudges)
18. ✅ Violet glassmorphism design system, orbit timeline ribbon
19. ✅ Focus engine with priority scoring, morning brief, proactive nudges

**Late Night — Dreams (Horizon) Full Build + Polish:**
20. ✅ **Design system** — `horizon-hopes.css` (780 lines): deep midnight blue, dawn gradient sky, mountain silhouettes, summit glow with 3-layer pulse, star particles, fog drift, glassmorphism cards
21. ✅ **6 AI prompt templates** — `horizon-prompts.ts`: decomposeGoal, velocityPrediction, motivationalNarrative, suggestNextActions, goalInterconnections, weeklyReflection
22. ✅ **5 new Rust commands** — dream_get_velocity, dream_get_timeline, dream_update_progress_manual, dream_get_all_active_with_velocity, dream_ai_narrate
23. ✅ **4 new DB methods** — get_dream_velocity, get_dream_timeline, set_dream_progress, get_active_dreams_with_velocity
24. ✅ **3 new Rust types** — DreamVelocity, DreamTimeline, TimelineEntry
25. ✅ **6 React components** — HorizonHero (mountain scene with stars/glow), HorizonGoalCard (altitude bar), HorizonMilestonePath (trail timeline), HorizonInsightCard (AI wisdom), HorizonVelocity (pace display), barrel export
26. ✅ **DreamBuilderView.tsx** — Full rewrite to HorizonView with mountain hero, altitude gauge, milestone trail, velocity tracking, AI narratives, glassmorphism throughout
27. ✅ **Types.ts updated** — DreamVelocity, TimelineEntry, DreamTimeline aligned with Rust
28. ✅ **Design polish pass** — Complete CSS rewrite for visceral impact: gradient dawn sky, 3-layer mountain clip-paths, animated fog, 12 twinkle stars, breathing summit glow (core→ring→halo), staggered card entrance, frosted glass everywhere, altitude progress bars with glowing endpoints
29. ✅ **Final verification** — TypeScript: zero errors. Rust: compiles clean.

**New features delivered:**
- 🍳 Home Menu — "What can I cook RIGHT NOW?" (personal DoorDash)
- 📸 Photo upload + AI meal identification
- 🧠 Natural language meal planning
- 🌡️ Pantry heatmap with freshness scoring
- 👨‍🍳 Cooking mode with step-by-step + timers
- 📊 Weekly digest with variety/nutrition/cost insights
- 💡 Proactive nudge cards
- 🛒 Smart grocery with aisle sorting + pantry awareness

### What's Built
- **204 Rust commands** (155 base + 9 budget + 12 kitchen + 15 orbit + 5 horizon + 8 current)
- **74 DB tables** (55 base + budget_goals + meal_photos + life_tasks + life_habits + life_habit_logs + life_daily_focus + life_schedules + life_nudges + dreams + dream_milestones + dream_tasks + dream_progress + daily_briefings + ripples + signal_threads + questions + reading_patterns)
- **Budget (Pulse):** 9 commands, emerald design system, NL entry, pattern detection, goals
- **Kitchen (Hearth):** 12 commands, amber design system, home menu, cooking mode, pantry intelligence
- **Life Autopilot (Orbit):** 15 commands, violet glassmorphism, focus engine, morning brief, habit tracking, smart reschedule, NL input, decision helper, heatmap
- **Dreams (Horizon):** 15 commands, deep blue mountain design, summit glow, AI goal decomposition, velocity tracking, milestone trail, motivational narratives, altitude gauge
- **Feed (Current):** 8 commands, electric white design system, daily briefing, ripple radar, signal threads, NL Q&A, cognitive patterns

### Apps Completed
1. ✅ **Budget (Pulse)** — Dark emerald, SVG ring, NL entry, pattern detection, goals
2. ✅ **Kitchen (Hearth)** — Warm amber, ember particles, home menu, cooking mode, pantry AI
3. ✅ **Life Autopilot (Orbit)** — Soft violet, focus engine, morning brief, habits, smart reschedule, NL input, nudges, decision helper, heatmap
4. ✅ **Dreams (Horizon)** — Deep blue, mountain visualization, summit glow, AI goal decomposition, velocity tracking, milestone trail, altitude gauge, motivational narratives
5. ⏸️ **Diary (Mirror)** — ATTEMPTED + ROLLED BACK (see notes below). Widget removed from UI. Rust code preserved.
6. ✅ **Feed (Current)** — Electric white, glassmorphism, 3-tab dashboard (Briefing/Feed/Intelligence), daily briefing, ripple radar, signal threads, NL Q&A engine, cognitive pattern analysis

### Apps Remaining — Priority Order
Each app needs: (1) AI features as heroes, (2) custom visual identity, (3) natural language interaction, (4) proactive agent insights.

7. ✅ **Home (Foundation)** — Blueprint gray, 10 Rust commands, 6 components, 6 hooks, 5 tabs (Overview/Diagnose/Calendar/Vault/Chat), 3 DB tables + 48 seasonal seed tasks, keyword-based AI (ready for LLM swap). Committed `2dc9c63`

### Apps Remaining — Priority Order
Each app needs: (1) AI features as heroes, (2) custom visual identity, (3) natural language interaction, (4) proactive agent insights.

8. **Games (Story)** — Rich burgundy, parchment, candlelight, AI storytelling, adaptive narrative
9. **Agents + Market (Family/Bazaar)** — Conflux purple + gold, discovery AI, recommendation engine, marketplace
10. **Settings** — Clean organization, better UX

### Build Pattern (Proven — Repeat for Each App)
The parallel agent dispatch pattern from Hearth works. For each app:
1. Read existing code + MASTER_INSPIRATION_PROMPT.md
2. Brainstorm AI hero features + design identity
3. **Batch 1 (parallel):** Design system CSS, LLM prompt templates, TypeScript types
4. **Batch 2 (parallel):** Rust types + DB migration, React components
5. **Batch 3 (parallel):** Rust commands, React hooks, main view redesign
6. **Batch 4:** lib.rs registration + Quanta verification
7. Mobile polish pass

### What's Missing (Before Ship)
1. User auth / accounts (currently user_id: "default")
2. Stripe billing ($14.99/mo Pro tier)
3. Auto-updater (Tauri updater plugin)
4. Code signing (macOS/Windows certificates)
5. First real users / beta testers
6. **App-by-app AI + design passes** — 4 done (Pulse, Hearth, Orbit, Horizon), 7 to go
7. **Agent life template** — how to breathe life/soul into applications
8. **Guided tour** — post-WelcomeOverlay desktop walkthrough

---

## Model Policy

**All agents must use the default model: `openrouter/xiaomi/mimo-v2-pro`.**
Do NOT override to other models (grok, etc.) unless Don explicitly approves.
The CSS agent that used grok was an exception — not the rule.

---

## Don's Preferences

- Direct, actionable responses over lengthy explanations
- All currency displayed with cents (toFixed(2))
- "$1.2M" style for large round numbers
- Accurate live data over placeholder estimates
- Controlled testing (test → verify → expand)
- Channel delivery over DM for agent communications
- Active late night (often 12-6 AM MST)
- Peak productivity: 2 AM window
- Builds at midnight — don't suggest sleeping during sessions

---

## Discord Config (for messaging)

- Don's user ID: `1477945753379934291` (@DonZiglioni)
- Mission-control channel: `1479285742915031080` (#mission-control)
- All cron announcements → #mission-control

---

## Active Cron Jobs

| Job | Schedule | ID |
|-----|----------|-----|
| ZigBot Diary — Nightly Reflection | 11:20 PM MST daily | `ffebea42-414c-4ab5-81aa-d46637fb80c1` |
| Vector's daily jokes | 9 AM MST daily | `0b1fd7ec-d75e-447d-9ca1-ae98e888494e` |

All pipeline crons, discovery crons, prompt factory crons, reflection crons (Helix/Vector/Forge/Quanta/Pulse), and domain asset crons are **DISABLED**. See MEMORY_ARCHIVE.md for full cron ID list.

---

## The Vision — CANDLELIT_2.md (March 24-25, 2026)

The second candlelight session. The missing piece was **LIFE**.
Key doc: `/home/calo/.openclaw/workspace/CANDLELIT_2.md`
Full session transcript and vision capture. Read this at session start alongside the Master Inspiration Prompt.

**Core themes from CANDLELIT_2:**
1. Every surface must breathe — animations, pulses, glows on everything
2. Desktop becomes the control room (enhanced ambient, not a separate 3D world)
3. Bento grid > flat forms/layouts
4. Games are the hook — Minesweeper moment (free games must be incredible)
5. Main agent = "Conflux" (brand is the companion)
6. Agent onboarding after user onboarding
7. Google Center — atmospheric view of Google world
8. "Close your eyes and see it" standard for every app

**Build phases from CANDLELIT_2:**
1. Games Hub + Minesweeper ✅ COMPLETE (`f5cad37`)
2. Desktop Life — ambient animations, status rings, dock breathing
   → EVOLVED INTO: Neural Mesh — agent orbs, voice activation, hands-free mode
   → Vision doc: `/home/calo/.openclaw/workspace/NEURAL_MESH_VISION.md`
3. One app as gold standard (Pulse/Budget)
4. Batch the rest (Hearth, Orbit, Horizon, Current, Foundation)
5. Google Center + Agent Chat Rework
6. Diary Rebuild + Games Expansion (Solitaire, Snake, Pac-Man, Stories v2)
7. Agents + Market (Family, Bazaar, Customizer)

**Detailed build spec:** `/home/calo/.openclaw/workspace/BUILD_SPEC.md`
Every phase has CSS line estimates, component specs, agent counts, and build patterns.

---

## Current Priority

**Phase 1: Games Hub + Minesweeper — The Hook.**

✅ Budget (Pulse) — DONE (recovered)
✅ Kitchen (Hearth) — DONE (recovered)
✅ Life Autopilot (Orbit) — DONE (recovered)
✅ Dreams (Horizon) — DONE (recovered)
⏸️ Diary (Mirror) — ROLLED BACK (widget removed, Rust code preserved)
✅ Feed (Current) — DONE (committed `8aa890e`)
➡️ **NEXT: Games (Story)** — Rich burgundy, parchment, candlelight, AI storytelling, adaptive narrative

### Current Build Notes (Session 2026-03-24, 20:06–20:46 MST)
**Build:** Feed → Current v2 (Intelligence Briefing)
**Method:** 3-batch parallel dispatch (11 agents total)
**Batch 1:** CSS (1,255 lines), prompts (7 templates), types (8 interfaces) — parallel
**Batch 2:** Rust (8 commands + 5 tables), components (6 files), hooks (5 files) — parallel
**Batch 3:** Wiring + compile check — single agent
**Result:** TypeScript zero errors. Rust clean. Committed `8aa890e` (25 files, +3,161 lines)
**Fixes:** useBriefing/useRipples called nonexistent commands — fixed to async generate/detect only
**Diary removed** from all UI surfaces (App.tsx, main.tsx, DesktopWidgets, Dock, ConfluxBar x2, StartMenu, Taskbar, types.ts)

### Mirror Build Notes (Session 2026-03-24)
Mirror was attempted but the app froze when clicking the Diary widget. Root causes:
- Hook `invoke()` params used camelCase instead of snake_case (Tauri mismatch)
- Streak calculation ran 365 individual SQL queries (performance freeze)
- CSS class names mismatched (~47 classes) between CSS file and React components
- Unsafe JSON.parse on nullable strings
- TypeScript type mismatches (string[] vs string for JSON fields)

**Rollback:** AgentDiaryView.tsx restored to original. CSS import removed from main.tsx.
**Preserved:** All Rust mirror code (commands, types, db methods, schema tables) is still in the codebase — registered but unused. Mirror components and CSS files exist but aren't imported. Can be re-attempted with a more careful build approach.

### Recovery Session — March 24, 2026 (17:00–20:00 MST)
**What happened:** A `git reset --hard` during debugging wiped all uncommitted overhauls (Pulse, Hearth, Orbit, Horizon). Desktop polish and Google taskbar placement were also lost.

**Recovery strategy:** 5 sequential workloads with commit-after-each checkpointing. All agents on Mimo V2 Pro.

**Workloads completed:**
1. ✅ **Desktop Polish + Google Taskbar** — Removed agents-bottom-bar, centered onboarding (6 screens), ConnectivityWidget moved to TopBar popup, Google quick-access button added. Committed: `85bad29`
2. ✅ **Budget (Pulse) Overhaul** — 9 new Rust commands (NL entry, pattern detection, affordability, goal CRUD, monthly report), budget_goals table, emerald CSS design system, BudgetView rewritten with goals/patterns/NL input. Committed: `f500feb`
3. ✅ **Kitchen (Hearth) Full Build** — 12 new Rust commands (home menu, photo upload, AI identify, pantry heatmap, cooking mode, weekly digest, nudges, smart grocery), 7 components, 5 hooks, 5-tab KitchenView, amber design. CSS fix agent added 700 lines for 56 missing classes. Committed: `ddde4c7`
4. ✅ **Life Autopilot (Orbit) Overhaul** — 15 new Rust commands (task CRUD, habit tracking, daily focus, morning brief, smart reschedule, NL parse, decision helper, heatmap, nudges), 6 DB tables, violet glassmorphism, LifeAutopilotView rewritten. Committed: `b565e9b`
5. ✅ **Dreams (Horizon) Overhaul** — 5 new Rust commands (velocity, timeline, progress, AI narratives), 3 new types, 6 components (HorizonHero, GoalCard, MilestonePath, InsightCard, Velocity), 1050-line mountain CSS, DreamBuilderView rewritten. Committed: `b5cf106`

**Lessons learned:**
- CSS class name alignment between components and CSS files is the #1 source of visual bugs — always audit after parallel agent builds
- Tauri invoke params MUST use snake_case matching Rust function parameters
- Agents sometimes plan instead of write — direct write instructions help
- Commit after every checkpoint. Non-negotiable.
- The prior vision/design quality (Hearth amber, Horizon mountains, Orbit violet) was stronger in the originals — the rebuilds are functional but lost some of the "close your eyes and see it" polish

### Next Session — EXACT PICKUP INSTRUCTIONS (Games / Story)

1. Read `MASTER_INSPIRATION_PROMPT.md` to reconnect with vision/energy
2. Read existing Games code:
   - `src/components/GamesView.tsx` — existing implementation
   - Rust commands with `game_` prefix in `src-tauri/src/commands.rs`
   - TypeScript types in `src/types.ts` (game-related)
3. Brainstorm **Story** AI hero features:
   - Identity: Rich burgundy, parchment, candlelight glow, ink/quill aesthetic
   - Hero: "What happens next?" — AI-driven adaptive storytelling
   - Interactive fiction — user choices shape narrative branches
   - AI characters with personality and memory
   - Genre selection (fantasy, sci-fi, mystery, romance, horror)
   - Persistent narratives across sessions
   - Collaborative co-authoring (user + AI)
4. Build using the proven 3-batch parallel agent pattern:
   - Batch 1: CSS design system, prompt templates, TypeScript types (parallel)
   - Batch 2: Rust backend + DB, React components (parallel)
   - Batch 3: Hooks + view rewrite + wiring + compile check

### Build Pattern (Proven — Repeat for Each App)
1. Read existing code + MASTER_INSPIRATION_PROMPT.md
2. Brainstorm AI hero features + design identity
3. **Batch 1 (parallel):** Design system CSS, LLM prompt templates, TypeScript types
4. **Batch 2 (parallel):** Rust backend + DB migration, React components
5. **Batch 3 (single):** React hooks, view rewrite, wiring, compile check
6. Commit after every batch

### What's Missing (Before Ship)
1. User auth / accounts (currently user_id: "default")
2. Stripe billing ($14.99/mo Pro tier)

---
*Last updated: 2026-03-25 00:49 MST — CANDLELIT_2 session active, Games Hub + Minesweeper building, Phase 1/7*

## Dream Cycle Update — 2026-03-25

### Key Learnings
- **Revenue gap is the critical bottleneck:** 13 published products, $0 actual revenue. Building supply without distribution. 7/10 Conflux Home apps done but no users yet either.
- **CSS class alignment = #1 visual bug source:** Every parallel agent build produces CSS/component mismatches. Must budget a CSS fix agent in every batch 3.
- **Git reset --hard = catastrophic:** Wiped 4 overhauls. Recovery took 5 sequential workloads. Commit after every batch is non-negotiable.
- **Parallel agent dispatch pattern is proven and reliable:** Hearth (12 agents), Orbit, Horizon, Feed (11 agents), Foundation — all succeeded with 3-batch pattern.
- **Build velocity is exceptional:** 7 apps built/recovered + desktop polish in a single day (March 24). But velocity without distribution = sunk cost.

### Revised Strategies
- **20% effort allocation to distribution:** While finishing remaining 3 apps, resume marketing cron or manual push for existing prompt packs. $0 revenue needs to change.
- **Tauri snake_case mandate:** All Rust commands exposed to frontend MUST use snake_case. Add to build checklist.
- **CSS fix agent in every batch 3:** Not optional. Every parallel build needs it.
- **Consider extracting design system:** 7 app design systems (amber, violet, emerald, deep blue, blueprint gray, electric white, burgundy pending) could become a standalone template pack product.

### Dream Insights (REM)
1. **Story engine → onboarding narrative:** Games (Story) adaptive narrative pattern could power Conflux Home's guided onboarding tour. Dual-purpose: app feature + UX improvement.
2. **Design system as product:** 7 polished visual identities extracted into a "Conflux Design Tokens" pack — sells to devs, ships with Conflux Home.
3. **Auto-resume pipeline question:** All pipeline crons halted March 24 for app focus. Need explicit decision on when/how to restart product discovery pipeline.

### Session Harvest Summary
- **Note:** Session transcript harvesting limited — only cron sessions visible in last 72h. Working from MEMORY.md logs.
- Total interactions assessed: ~25+ from March 24 session logs
- High-salience events: 4 (git reset disaster, Mirror rollback, Foundation commit, 7-app milestone)
- User corrections: 0 visible in this window
- Strategic decisions: Pipeline halt, Conflux Home singular focus, Mirror rollback

### Memory Pruning Summary
- Entries pruned: 0 (all memory entries currently salient due to active Conflux Home build)
- Entries compressed: 2 (Nightly Pipeline details, Agent Self-Improvement cron IDs — both parked, already in archive)
- MEMORY.md: 302 lines (within target)
- MEMORY_ARCHIVE.md: 312 lines (reference file, healthy)
- Recommendation: After Conflux Home ships, prune build-pattern details into archive

### Tomorrow's Focus
- **Games (Story)** — Rich burgundy, parchment, candlelight, AI storytelling
- Pickup instructions in MEMORY.md are current and accurate
- Follow proven 3-batch parallel pattern
- Non-negotiables: snake_case Tauri params, CSS fix agent, commit after every batch
