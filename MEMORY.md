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
- **212+ Rust commands** (155 base + 9 budget + 12 kitchen + 15 orbit + 5 horizon + 8 current + 8 echo/agents)
- **82+ DB tables** (55 base + budget_goals + meal_photos + life_tasks + life_habits + life_habit_logs + life_daily_focus + life_schedules + life_nudges + dreams + dream_milestones + dream_tasks + dream_progress + daily_briefings + ripples + signal_threads + questions + reading_patterns + echo tables)
- **Budget (Pulse):** 9 commands, emerald design system, NL entry, pattern detection, goals
- **Kitchen (Hearth):** 12 commands, amber design system, home menu, cooking mode, pantry intelligence
- **Life Autopilot (Orbit):** 15 commands, violet glassmorphism, focus engine, morning brief, habit tracking, smart reschedule, NL input, decision helper, heatmap
- **Dreams (Horizon):** 15 commands, deep blue mountain design, summit glow, AI goal decomposition, velocity tracking, milestone trail, motivational narratives, altitude gauge
- **Feed (Current):** 8 commands, electric white design system, daily briefing, ripple radar, signal threads, NL Q&A, cognitive patterns

### Apps Completed
1. ✅ **Budget (Pulse)** — Dark emerald, SVG ring, NL entry, pattern detection, goals
2. ✅ **Kitchen (Hearth)** — Warm amber, ember particles, home menu, cooking mode, pantry AI
3. ✅ **Life Autopilot (Orbit)** — Soft violet, focus engine, morning brief, habits, smart reschedule, NL input, nudges, decision helper, heatmap. **FREEZE BUG FIXED** (`755ab3f`)
4. ✅ **Dreams (Horizon)** — Deep blue, mountain visualization, summit glow, AI goal decomposition, velocity tracking, milestone trail, altitude gauge, motivational narratives
5. ⏸️ **Diary (Mirror)** — ATTEMPTED + ROLLED BACK (see notes below). Widget removed from UI. Rust code preserved.
6. ✅ **Feed (Current)** — Electric white, glassmorphism, 3-tab dashboard (Briefing/Feed/Intelligence), daily briefing, ripple radar, signal threads, NL Q&A engine, cognitive pattern analysis
7. ✅ **Games Hub + Minesweeper** — Green/white classic, 3 difficulties, cascade reveal, flagging, best times, sound effects
8. ✅ **Snake** — Emerald serpent, neon glow on black, 4 modes (Classic/Zen/Challenge/Speedrun), 60fps canvas, pulsing gold food, death particles, 5 sound effects, direction queue, d-pad mobile (`5b29822`)
9. ✅ **Home (Foundation)** — Blueprint gray, 10 Rust commands, 6 components, 6 hooks, 5 tabs (Overview/Diagnose/Calendar/Vault/Chat), 3 DB tables + 48 seasonal seed tasks, keyword-based AI (ready for LLM swap). Committed `2dc9c63`
10. ✅ **Pac-Man** — Neon yellow on black, 4 ghosts with classic AI, 3 difficulty modes, power pellets, death particles. Committed `c27ddb2`
11. ✅ **Solitaire** — Golden Deck, full Klondike, drag-and-drop, double-click auto-move, score/timer/moves, win cascade. Committed `b03be7a`
12. ✅ **Agents + Market (Family/Bazaar)** — Conflux purple + gold, 4-tab AgentsView, marketplace overhaul, discovery AI, recommendation engine. Committed `755ab3f`
13. ✅ **Echo** — Communication hub, electric blue design, messaging threads. Committed `755ab3f`

### Apps Remaining
- **Settings** — Clean organization, better UX
- **Conflux Stories v2** — AI interactive fiction, parchment aesthetic (last Games Hub game)

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
6. **App-by-app AI + design passes** — 4 done (Pulse, Hearth, Orbit, Horizon), remaining apps to go
7. **Agent life template** — how to breathe life/soul into applications
8. **Guided tour** — post-WelcomeOverlay desktop walkthrough
9. **Conflux Stories v2** — last planned game for Games Hub, AI interactive fiction

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
| LIFE Pass Driver — Pulse Check | Every 10 min | `53608c7a-1b1a-467c-8ce1-e8ab05ceaed7` |
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
2. Snake ✅ COMPLETE (`5b29822`) — emerald serpent, 4 modes, canvas rendering
3. Desktop Life — ambient animations, status rings, dock breathing
   → EVOLVED INTO: Neural Mesh — agent orbs, voice activation, hands-free mode
   → Vision doc: `/home/calo/.openclaw/workspace/NEURAL_MESH_VISION.md`
3. One app as gold standard (Pulse/Budget)
4. Batch the rest (Hearth, Orbit, Horizon, Current, Foundation)
5. Google Center + Agent Chat Rework
6. Diary Rebuild + Games Expansion (Stories v2)
7. Agents + Market (Family, Bazaar, Customizer)

**Detailed build spec:** `/home/calo/.openclaw/workspace/BUILD_SPEC.md`
Every phase has CSS line estimates, component specs, agent counts, and build patterns.

---

## Current Priority

**All primary apps COMPLETE. Conflux Home is feature-rich.**

✅ Budget (Pulse), Kitchen (Hearth), Life Autopilot (Orbit — freeze FIXED), Dreams (Horizon), Feed (Current), Games Hub (Minesweeper + Snake + Pac-Man + Solitaire), Home (Foundation), Agents + Market, Echo
⏸️ Diary (Mirror) — ROLLED BACK (widget removed, Rust code preserved)

### What's Left
1. **Conflux Stories v2** — last game for the hub, AI interactive fiction with parchment aesthetic
2. **Settings** — polish pass
3. **Ship items:** Auth, Stripe billing, auto-updater, code signing, beta testers

### Current Build Notes (Session 2026-03-27)
**Build:** Agents + Marketplace + Echo + Orbit freeze fix
**Commit:** `755ab3f` (30 files, +3,621 lines)
**Result:** TypeScript clean. Rust clean. All uncommitted work saved.

### Previous Build Notes (Session 2026-03-24, 20:06–20:46 MST)
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

### Auto-Updater — WORKING (iterated v0.1.1→v0.1.16+ on March 25-26)
- **Plugin:** `tauri-plugin-updater v2` in Cargo.toml + lib.rs
- **Signing key:** `~/.tauri/conflux-key` (private, no password) / `.pub` (public, in tauri.conf.json)
- **Endpoint:** GitHub Releases — updates.json per release
- **Current version:** v0.1.16+ (auto-update chain working on Windows)
- **Lesson:** Auto-updater has N links in the chain (updates.json URL, signing, GitHub assets, version matching, Tauri config). Debug the whole chain, not individual links.

### Security — API Key Leak (March 26, 2026)
- GitGuardian flagged Mistral, Cerebras, OpenRouter keys exposed in public repo
- Keys rotated. New keys stored in GitHub Secrets + local env vars
- **RULE:** NEVER commit API keys to repos. Use `gh secret set` for CI, env vars for local dev.
- **TODO:** Implement pre-commit hooks + Sentinel (security agent) per ADVICE.md

---
*Last updated: 2026-03-26 23:30 MST — Dream cycle complete. Auto-updater working (v0.1.16), API keys rotated, ADVICE.md created, Windows as primary test platform confirmed.*

## Dream Cycle Update — 2026-03-25 (Nightly)

### Key Learnings
- **Checkpoint discipline confirmed a 3rd time:** LIFE Pass rollback to `edb542b` saved us when immersive background changes broke all 7 apps. Isolated commits = instant recovery. This is a foundational principle now.
- **CSS class alignment = persistent #1 visual bug source:** Snake build reused minesweeper class names — 10 mismatches found by CSS fix agent. Confirmed in 6+ parallel builds. Budget CSS fix agent in every batch 3.
- **Don's visual corrections need clarifying questions:** LIFE pass "no blur, full space" was misinterpreted. His mental model is precise; his verbal descriptions sometimes leave room for interpretation. Ask before guessing.
- **PATH/environment issues masquerade as system failures:** Gateway appeared to crash but was running fine — shell PATH (Node v18) != service binary (Node v22). Verify PID + binary + ports before diagnosing.
- **Build velocity continues to be exceptional:** Snake + Solitaire + Google Center + CI pipeline + auto-updater + app icons — all in one day (March 25).

### Revised Strategies
- **Commit before applying user-requested aesthetic changes:** LIFE pass rollback would have been trivial if we'd committed before changing the immersive background. Checkpoint before every Don-directed visual change.
- **Verify process state before diagnosing crashes:** Check PID, binary path, listening ports before assuming failure. Gateway crashes ≠ CLI environment issues.
- **CSS fix agent in every batch 3:** Not optional. Every parallel build needs it. (Confirmed again — Snake had 10 mismatches.)

### Dream Insights (REM)
1. **Google-first onboarding could be the hook:** What if onboarding was "Connect Google" → instant value (calendar, email, files) → THEN introduce agent teams? Google integration is tangible; agent orchestration is abstract.
2. **Checkpoint discipline as product feature:** "Undo everything" for your digital life. Every action creates a checkpoint. User doesn't like a change → one click to revert. Worth filing for later.
3. **Distribution before infrastructure:** We're building a release pipeline for an app with no users. CI failures (iOS, macOS signing) might be signals to test with a single real user first, then invest in multi-platform CI.

### Session Harvest Summary
- Total interactions assessed: 17 events from 6 Discord sessions (March 25)
- High-salience events: 9 (LIFE rollback, Snake/Solitaire builds, Google Center, gateway confusion, CI failures)
- User corrections: 3 (onboarding centering, emoji animation, LIFE pass direction)
- Strategic decisions: Conflux rename, auto-updater config, CI pipeline setup

### Memory Pruning Summary
- Entries compressed: 4 (routine fixes — auth cleanup, centering, emoji, chat dropdown)
- Entries preserved: 9 (high-salience — LIFE rollback, Snake/Solitaire, Google Center, CI, gateway)
- Patterns strengthened: 2 (checkpoint discipline, CSS alignment)
- New patterns: 2 (Don's correction style, PATH masquerading)
- MEMORY.md: ~310 lines (within target)
- MEMORY_ARCHIVE.md: 312 lines (reference file, healthy)

### Tomorrow's Focus
- **Conflux Stories v2** — last game for the Games Hub. Rich burgundy, parchment, candlelight, AI interactive fiction.
- **CI pipeline** — resolve iOS/macOS failures before first real release.
- **First real user** — Google auth is clean, onboarding is polished, app icons are ready.
- Non-negotiables: snake_case Tauri params, CSS fix agent, commit after every batch, commit before Don-directed visual changes.

## Dream Cycle Update — 2026-03-26 (Nightly)

### Key Learnings
- **API keys in public repos = catastrophic:** GitGuardian caught Mistral, Cerebras, OpenRouter keys in public GitHub. Immediate rotation required. This is now our #1 security rule. Pre-commit hooks and Sentinel agent are overdue.
- **Auto-updater is a chain, not a button:** 16+ versions over 2 days because each fix exposed the next broken link (updates.json URL → signing → GitHub assets → version matching → Tauri config → download format). Debug systems end-to-end.
- **Don tests on Windows. Always.** I assumed Linux multiple times. The app is a Windows desktop app. Windows is the primary test platform unless Don says otherwise.
- **The build→ship→learn loop is extraordinary velocity:** 16 version iterations in 2 days. Don tests → reports → subagent dispatches → fix committed → new build → Don tests again. This is the fastest feedback loop in the studio.
- **Orbit widget has a persistent freeze bug:** Survives across all versions. Likely architectural (infinite hook loop, circular dep, or Tauri command deadlock), not a simple code bug.

### Revised Strategies
- **Security before features:** ADVICE.md crystallized this. 9 agents building, 0 protecting. Sentinel + Aegis must be next agent hires.
- **When Don says "test" or "install" = Windows:** Non-negotiable assumption going forward.
- **Chain-debug complex systems:** Don't fix one link and assume the rest works. Trace the entire pipeline end-to-end before reporting success.
- **Subagent dispatch for infrastructure bugs:** Don't block the main session on CI/auto-updater debugging. Spawn subagents, keep the conversation moving.

### Dream Insights (REM)
1. **Security agent as pre-commit hook:** What if Sentinel existed as a CI gate? Every push → secret scan → dependency audit → vulnerability check → merge. The API key leak would have been caught before push. This is buildable with existing tools (gitleaks, trivy) + a thin agent wrapper.
2. **Auto-updater as a product:** We built release infrastructure that 16+ iterations couldn't break permanently. Other Tauri devs would pay for "auto-update as a service." Interesting but stay focused on Conflux Home.
3. **Orbit freeze as canary:** A bug that survives every rebuild suggests a systemic issue. Investigating it could reveal patterns affecting other widgets silently. Worth a dedicated debugging session.

### Session Harvest Summary
- Total interactions assessed: 62 messages from 1 primary Discord session (March 25-26 marathon)
- High-salience events: 9 (API key leak, auto-updater chain, first Windows install, ADVICE.md, orbit freeze, CI failures, download 404s, chat broken, account system discussion)
- User corrections: 3 (settings gear location, Windows vs Linux assumption, chat broken in v0.1.7)
- Strategic decisions: ADVICE.md agent team expansion, Neon DB for future accounts, lightweight auth architecture

### Memory Pruning Summary
- Entries compressed: 3 (DB cleanup strategy, account system discussion, mobile download)
- Entries preserved: 9 (API leak, auto-updater, first install, ADVICE.md, orbit freeze, CI, 404s, chat break, secrets rotation)
- Patterns strengthened: 2 (security-first, Windows primary platform)
- New patterns: 2 (chain-debugging complex systems, subagent dispatch for infra bugs)
- MEMORY.md: ~330 lines (slightly over target, acceptable given significance)
- MEMORY_ARCHIVE.md: 312 lines (reference file, healthy)

### Active Focus (March 27, 2026)
- ✅ **Orbit freeze** — FIXED (commit `755ab3f`)
- ✅ **Agents + Market** — COMPLETE (commit `755ab3f`)
- ✅ **Echo** — COMPLETE (commit `755ab3f`)
- **Stories v2** — last game for Games Hub, AI interactive fiction
- **CI pipeline** — Windows build reliability
- **Security gates** — pre-commit hooks for secret scanning
- **Auto-updater** — need reliable Windows build
- Non-negotiables: Windows = primary test platform, API keys NEVER in code
