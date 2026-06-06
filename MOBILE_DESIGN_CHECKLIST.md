# Mobile Design Master Checklist

> Every app is its own world. This is the audit and action plan for making
> each one perfect on mobile (≤ 768px). Desktop is untouched.

---

## How This Works

Each app gets **one focused pass** — not a rush job. The process per app:

1. **Audit** — Screenshot on mobile viewport. Note every issue (overflow, tiny text, broken layout, missing touch targets, visual regressions).
2. **Fix CSS** — Add/update rules in `styles-mobile-layout.css` (768px + 480px breakpoints). Use `!important` only to beat inline styles.
3. **Fix components** — If inline styles fight CSS, refactor to className-based so mobile overrides work cleanly.
4. **Test** — TypeScript compiles (`npx tsc --noEmit`). Visual check at 375px, 414px, 768px.
5. **Sign off** — Mark complete in this doc with date + notes.

**Rules:**
- All mobile CSS lives in `styles-mobile-layout.css` inside `@media (max-width: 768px)` / `@media (max-width: 480px)`
- Desktop is never touched
- Each app has its own section in the CSS (numbered 35+, currently up to 37)
- Inline `paddingBottom: '150px'` / `paddingLeft: '121px'` from desktop views is already overridden generically via `.immersive-content > div`
- Safe area insets respected: `env(safe-area-inset-*)`
- Bottom clearance: container-level `padding-bottom: calc(100px + safe-area)` handles it — views should NOT add their own bottom padding

---

## The Apps

### 1. 🏠 Home / Dashboard (`dashboard`)
**File:** `App.tsx` (inline desktop widgets grid)
**CSS:** `styles-mobile-layout.css` §36 (desktop widgets)
**Current state:** Widgets grid goes to 2-column on 768px, 1-column on 480px. Looks reasonable.
**Issues to audit:**
- [ ] Widget card text sizing — are titles/descriptions readable?
- [ ] Widget tap targets — minimum 44px?
- [ ] Widget grid spacing on small phones (375px)
- [ ] Status orb positioning on mobile
- [ ] Any overflow from widget content (agent names, timestamps)

**Priority:** Medium
**Estimated effort:** Small CSS tweaks

---

### 2. 💰 Budget / Pulse (`pulse`)
**Files:** `PulseWrapper.tsx`, `BudgetTab.tsx`, `StocksTab.tsx`, `PortfolioTab.tsx`, `SpeakToPulseTab.tsx`
**CSS:** `styles/pulse-tabs.css`, `styles-mobile-layout.css` §35c, §39–47
**Current state:** ✅ Full mobile design pass complete 2026-06-05
**Issues to audit:**
- [x] **Tab bar** — Brand text hidden, tabs scroll horizontally, 44px touch targets, score ring shrunk
- [x] **Budget tab** — Cockpit gauges horizontal-scroll, NLP bar full-width, matrix grid 600px min horizontal-scroll, controls stack & wrap, transaction history responsive
- [x] **Stocks tab** — Padding reduced, ticker zone margins fixed, grid single-column, cards compact, add stock modal full-screen
- [x] **Portfolio tab** — Padding reduced, hero row single-column, health score card row layout, donut charts stacked, form single-column, holdings table card layout, confirm dialog full-width
- [x] **Speak to Pulse tab** — Side-by-side → stacked (health banner hidden), chat full-width, input bar mobile-sized, voice/send buttons 40px, sessions view responsive
- [x] **Onboarding flow** — Already had mobile CSS from previous pass (§38d)
- [x] **Stock detail modal** — Full-screen on mobile
- [x] **QuickLogModal** — Full-screen on mobile, input 16px (no iOS zoom)
- [x] **TransactionLogModal** — Full-screen on mobile, bucket selector wraps, buttons stack
- [x] **Budget form** — Single-column inputs, 16px font (no iOS zoom), type buttons 44px

**Priority:** High (core app, first thing users see)
**Estimated effort:** Medium — DONE 2026-06-05
**Notes:** Added §39–47 in styles-mobile-layout.css. All input fields set to 16px to prevent iOS zoom. Tab bar shrinks to 52px (48px at 480px). All modals go full-screen. Holdings table converts to card layout. Speak tab health banner hidden to maximize chat space.

---

### 3. 🍳 Kitchen / Hearth (`hearth`)
**Files:** `KitchenView.tsx`, `HearthOnboarding.tsx`, `HearthNutritionistView.tsx`
**CSS:** `styles/kitchen-hearth.css`, `styles-mobile-layout.css` §(existing)
**Current state:** ✅ Full mobile design pass complete 2026-06-05
**Issues to audit:**
- [x] **Home tab** — Meal cards, weekly plan, fridge status — digest card compact, nudges responsive, What Can I Make section sized, home menu single-column, restaurant menu responsive
- [x] **Inventory tab** — Fridge scanner, item list, categories — location cards single-column, stats bar compact, header actions full-width, intel section responsive, add-item modal single-column form
- [x] **Recipes tab** — Recipe cards, search, filters — AI add bar stacks vertically (input + button), genre/filter buttons horizontal-scroll, browse cards single-column, mic button repositioned
- [x] **Meal planner** — Weekly grid, drag-drop (if any), meal picker — 7-col grid → stacked day cards, summary bar wraps, week nav compact, slot picker bottom-sheet
- [x] **Onboarding** — Agent intro, preference setup, dietary questions — ✅ Already done in §38d (previous pass)
- [x] **Fridge scan modal** — Camera/text input, results display — full-screen on mobile, textarea 16px, actions stack
- [x] **Grocery list** — Item list, add input, categories — header actions wrap, category groups responsive, item cards compact, generate/shop buttons full-width
- [x] **Recipe detail** — Ingredients, steps, nutrition info — meal detail modal bottom-sheet (92vh), photo area constrained, stats grid 2-col, photo actions wrap
- [x] **Nutritionist** — Chat view, sessions view, tips sidebar — side-by-side → stacked (tips sidebar hidden on mobile), chat full-width, input area mobile-sized, voice/send buttons 44px, sessions list responsive
- [x] **Empty state** — First run welcome — card padding reduced, autoFocus removed, input 16px, button 48px
- [x] **Cooking mode** — Overlay full-screen-ish, step cards compact, nav buttons 44px

**Priority:** High
**Estimated effort:** Medium-Large — DONE 2026-06-05
**Notes:** Added §48–59 in styles-mobile-layout.css (768px) + 480px refinements. Key changes: kitchen tab bar horizontal-scroll with 44px targets, AI add bar stacks vertically, meal detail modal bottom-sheet, weekly digest 7-col→1-col stacked cards, inventory location cards 1-column, nutritionist chat stacked (tips sidebar hidden), grocery actions wrap, all modals full-screen/bottom-sheet, all inputs 16px to prevent iOS zoom. Removed autoFocus from KitchenEmptyState.tsx.

---

### 4. 📋 Life / Orbit (`orbit`)
**Files:** `LifeAutopilotView.tsx`, `OrbitOnboarding.tsx`, `MissionManifest.tsx`, `AgentBoard.tsx`, `AgentActivityFeed.tsx`, `MissionControlHeader.tsx`
**CSS:** `styles/orbit-mission-control.css`, `styles/orbit-activity-feed.css`, `styles-mobile-layout.css` §60–73
**Current state:** ✅ Full mobile design pass complete 2026-06-05
**Issues to audit:**
- [x] **Mission control home** — Header stacks vertically, stats wrap, momentum gauge scales down, NL input stacks vertically (full-width input + full-width submit button)
- [x] **Tab switcher** — Refactored from inline styles to classNames (`.orbit-tab-switcher`, `.orbit-tab-btn`), 44px min-height touch targets
- [x] **Activity feed** — Timeline cards compact, agent dots scaled, dismiss button always visible (not hover-only on mobile), action pills larger touch targets, skeleton/empty states scaled
- [x] **Task list** — Task rows padded for touch (48px min-height), checkboxes 24px, delete button 44px touch target, form stacks vertically (input full-width, selects wrap)
- [x] **Agent board** — Refactored from inline styles to classNames (`.orbit-agent-card`, `.orbit-status-col`, `.orbit-board-filter`), filter buttons 44px touch target, agent cards mobile-sized
- [x] **Onboarding** — Already done in §38d (orbit-onboard-root, orbit-onboard-card, orbit-onboard-btn)
- [x] **Focus cards** — Stack vertically, float animation disabled on mobile, padding reduced
- [x] **Telemetry grid** — Single column, panels compact
- [x] **Habit grid** — Single column, log buttons 40px
- [x] **Alert console** — Padding reduced, dismiss button 36px touch target
- [x] **Insights section** — Cards compact, action buttons 40px
- [x] **Momentum gauge** — Scaled to 80px on mobile
- [x] **Heatmap** — Cells wrap, 28px sizing
- [x] **Toast notifications** — Repositioned above ConfluxBar, max-width constrained

**Priority:** High
**Estimated effort:** Medium — DONE 2026-06-05
**Notes:** Added §60–73 in styles-mobile-layout.css (768px) + 480px refinements. Key changes: refactored LifeAutopilotView tab switcher, MissionManifest add form, and AgentBoard from inline styles to classNames for clean CSS override. Header stacks vertically, NL input full-width with stacked layout, focus cards stack vertically (animation disabled), activity feed dismiss button always-visible on mobile, all touch targets ≥44px. All inputs 16px to prevent iOS zoom.

---

### 5. 🌄 Dreams / Horizon (`horizon`)
**Files:** `DreamBuilderView.tsx`, `HorizonOnboarding.tsx`
**CSS:** `styles/horizon-hopes.css`, `styles/horizon-stellar.css`, `styles-mobile-layout.css` §74–86
**Current state:** ✅ Full mobile design pass complete 2026-06-05
**Issues to audit:**
- [x] **Dream list view** — Hero banner stacks vertically, velocity ring scaled down, stats wrap, dream cards → single-column row layout (horizontal cards with constellation + title + progress), new constellation button full-width
- [x] **Goal detail view** — Back button 44px touch target, AI planning section stacks (input + button full-width), stellar map single-column grid, legend wraps, orbital velocity scaled down
- [x] **Milestone view** — Milestone list items 44px touch targets, task list items 44px touch targets, add milestone form stacks vertically
- [x] **Progress form** — Inputs 16px (no iOS zoom), buttons 44px, form rows stack vertically, mic button repositioned
- [x] **Edit/Delete forms** — All inputs 16px, selects 16px, form rows stack, buttons full-width
- [x] **Context help cards** — Single column on mobile
- [x] **Mission control panel** — Single column, mission log responsive
- [x] **Star Milestone Modal** — Near full-width on mobile, touch-friendly task list
- [x] **Activity Log + Tasks sections** — Added classNames (`stellar-activity-log`, `stellar-tasks-section`), inline padding overridden via CSS
- [x] **Constellation generating state** — Scaled down for mobile
- [x] **Empty + Loading states** — Scaled for mobile
- [x] **Constellation selector** — Horizontal scroll, items compact
- [x] **Onboarding** — Already done in §38d (horizon-onboard-root, horizon-onboard-center, horizon-onboard-input, etc.)

**Priority:** Medium
**Estimated effort:** Medium — DONE 2026-06-05
**Notes:** Added §74–86 in styles-mobile-layout.css (768px) + 480px refinements. Key changes: stellar-view padding fully overridden (including inline 121px sides), hero banner stacks vertically, dream cards convert from pill-shaped vertical cards to horizontal row cards (constellation + text + progress bar), AI planning section stacks vertically, stellar map and mission control panel single-column, all inputs 16px to prevent iOS zoom, all buttons 44px+ touch targets, form rows stack vertically. Added `stellar-activity-log` and `stellar-tasks-section` classNames to JSX for cleaner CSS targeting. TypeScript compiles clean.

---

### 6. 🪞 Diary / Mirror (`mirror`)
**Files:** `EchoCounselorView.tsx`, `EchoView.tsx`, `EchoOnboarding.tsx`, `AgentDiaryView.tsx`
**CSS:** `styles-echo.css`, `styles-echo-onboarding.css`, `styles-mobile-layout.css` §35d, §87–99
**Current state:** ✅ Full mobile design pass complete 2026-06-05
**Issues to audit:**
- [x] **Tab bar** — 5 tabs (session, sessions, journal, tools, letter) horizontal scroll, 44px touch targets, compact sizing
- [x] **Session view** — Chat bubbles 92% width, readable text (0.9rem), input 16px (no iOS zoom), mic/end/send buttons 44px, session info stacked below input
- [x] **Sessions list** — Session cards compact (14px padding), dates/meta scaled, reflection previews readable
- [x] **Journal view** — Journal entries compact, reflection content readable, expanded messages responsive
- [x] **Tools view** — Gratitude widget inputs 16px, grounding cards compact, evening reminder selects 16px, all buttons 44px+
- [x] **Weekly letter** — Full-width, tabs compact, letter content padded, generate button 44px, past items responsive
- [x] **Onboarding** — Already done in §38d, extended with §echo-onboard-root, orb sizing, pillar layout, begin button 48px
- [x] **Chat bubbles** — Wider on mobile (92%), padding reduced, speak button always visible (not hover-only), meta text scaled
- [x] **Agent Diary view** — Diary view padding overridden, mood strip horizontal scroll, agent shelf horizontal scroll, entry cards compact, topics/expand hint scaled
- [x] **Crisis banner** — Wraps on mobile, view resources button 36px
- [x] **No session state** — Empty icon scaled, start button full-width 48px

**Priority:** Medium
**Estimated effort:** Medium — DONE 2026-06-05
**Notes:** Added §87–99 in styles-mobile-layout.css (768px) + 480px refinements. Key changes: echo-counselor-view inline padding (121px sides, 125px bottom) fully overridden with !important, tab bar converts to horizontal-scroll with flex-none tabs, chat window height becomes responsive (max-height 55vh instead of fixed 500px), all inputs 16px to prevent iOS zoom, all buttons 44px+ touch targets, speak buttons always visible on mobile (not hover-only), AgentDiaryView diary-view/mood-strip/agent-shelf get horizontal scroll, diary entry cards compact. TypeScript compiles clean.

---

### 7. 📰 Feed / Radar (`radar`)
**Files:** `RadarView.tsx`, `FeedView.tsx`, `RadarOnboarding.tsx`
**CSS:** `styles/feed-radar.css`, `styles-mobile-layout.css` §114–120
**Current state:** ✅ Full mobile design pass complete 2026-06-05
**Issues to audit:**
- [x] **Feed stream** — Article cards (SignalCard) full-width, padding reduced, action buttons 44px touch targets with wrapping layout, category badges/typography scaled
- [x] **Sidebar** — Cognitive sidebar stacks below radar (grid → single column), padding compact, stat values readable, trend chart 50px height, category items scaled
- [x] **Article detail** — Signal card expanded detail readable (0.78rem body, 0.65rem heading)
- [x] **Cognitive sidebar** — AI summary compact, sidebar title 0.78rem, stat values 1.3rem
- [x] **Onboarding** — Already done in §38d (radar-onboard-root, radar-onboard-card, radar-onboard-title/body/btn)
- [x] **Briefing overlay** — Full-screen safe, panel 92vh max-height, padding reduced, items compact, close button 36px, generate button 48px
- [x] **Header bar** — Added `.feed-radar-header-bar` className to JSX, stacks vertically on mobile to prevent overflow
- [x] **Threads section** — Added `.feed-radar-threads` className to JSX, padding reduced to 12px on mobile
- [x] **Empty + Loading states** — Container height reduced to 200px, padding/text scaled
- [x] **Radar SVG** — Max-width 320px (260px at 480px), centered, no overflow
- [x] **Briefing trigger button** — 44px touch target, compact font

**Priority:** Low-Medium
**Estimated effort:** Small-Medium — DONE 2026-06-05
**Notes:** Added §114–120 in styles-mobile-layout.css (768px) + 480px refinements. Key changes: feed-radar grid stacks to single column with 16px gap, radar SVG constrained to 320px max-width, signal cards have 44px action buttons that wrap to 2-column grid, cognitive sidebar stacks below radar with compact padding, briefing overlay goes full-screen (92vh max-height), header bar stacks vertically to prevent space-between overflow. Added `.feed-radar-header-bar` and `.feed-radar-threads` classNames to FeedView.tsx JSX to override inline styles. Radar onboarding already covered by §38d. TypeScript compiles clean.

---

### 8. 🎮 Games (`games` / `story`)
**Files:** `GamesPage.tsx`, `GamesHub.tsx`, `MinesweeperGame.tsx`, `SnakeGame.tsx`, `PacmanGame.tsx`, `SolitaireGame.tsx`, `NaniSolitaireGame.tsx`, `JohnnySolitaireGame.tsx`, `StoryGameReader.tsx`
**CSS:** `styles-games-hub.css`, `styles-nani-solitaire.css`, `styles-johnny-solitaire.css`, `styles-mobile-layout.css` §35 + §121–132
**Current state:** ✅ Full mobile design pass complete 2026-06-05 (all games + story reader)
**Issues to audit:**
- [x] **Games hub** — Game cards 2-col grid, hover disabled on touch, 44px+ tap targets, header stacked, hero stacked ✅ §121–125
- [x] **Minesweeper** — Cells 36px, HUD wraps, difficulty pills scroll, face/hub buttons 44px, bottom bar hidden ✅ §126
- [x] **Snake** — Canvas max-width 100vw, HUD compact, D-pad 56px buttons, overlay responsive ✅ §127
- [x] **Pac-Man** — Canvas max-width 100vw, HUD compact, D-pad 56px buttons, overlay responsive ✅ §128
- [x] **Solitaire** — Canvas scales to viewport (width: 100%, height: auto), HUD compact, hero wraps, touch-action: none on canvas, back button 44px, overlay responsive ✅ §129
- [x] **Nani Solitaire** — Grid fits viewport, cards ≥40px, piles compact, back/new buttons 44px, rules overlay responsive, game-over/win overlays scaled ✅ §130
- [x] **Johnny Solitaire** — 8 columns fit viewport (56px cards at 768px, 42px at 480px), header wraps, back/new buttons 44px, overlay responsive, actions stack vertically ✅ §131
- [x] **Story reader** — Full-screen overlay, text 16px, close button 44px, puzzle input 16px (no iOS zoom), puzzle submit full-width 44px, choice buttons 44px, images scale to viewport, illustrations capped at 200px ✅ §132
- [x] **Back navigation** — All games have 44px+ back buttons ✅ §121–132

**Priority:** Medium
**Estimated effort:** Large — DONE 2026-06-05
**Notes:** Added §129–132 in styles-mobile-layout.css (768px) + 480px refinements in games section. Key changes: Solitaire canvas uses width:100% + height:auto + touch-action:none for proper mobile touch handling. Nani Solitaire grid adapts to viewport with ≥40px card slots. Johnny Solitaire 8-column layout scales cards from 56px (768px) to 42px (480px) while maintaining tappability. Story reader goes full-screen with readable 16px text, 44px touch targets on all buttons, puzzle input stacks vertically, images scale to viewport. All inputs 16px to prevent iOS zoom. TypeScript compiles clean.

---

### 9. 🔐 Vault (`vault`)
**Files:** `VaultView.tsx`, `VaultSidebar.tsx`, `VaultToolbar.tsx`, `VaultFileCard.tsx`
**CSS:** `styles-vault.css`, `styles-mobile-layout.css` §133–145 (768px) + existing 480px
**Current state:** ✅ Complete mobile design pass done. Desktop untouched.
**Mobile changes:**
- [x] **Container** — Padding 12px 10px, overflow-x hidden, overflow-y auto
- [x] **Hero header** — Compact (icon 44px, title 20px), Studio button repositioned
- [x] **Sidebar → horizontal tabs** — Folder tree + projects as scrollable row, titles hidden
- [x] **Body → column stack** — Sidebar above main, gap 0
- [x] **Search bar** — 16px input (no iOS zoom), compact padding
- [x] **Toolbar** — Flex-wrap, view buttons 36px, gap 4px
- [x] **File grid** — 2-column responsive, cards 10px gap, no hover transform
- [x] **File cards** — Compact (12px name, 10px meta), favorites always visible
- [x] **List view** — Hide Modified + Agent columns (4-col grid), 44px row height
- [x] **Timeline view** — Tighter padding, 140px card width
- [x] **Selection bar** — Wrap buttons, compact sizing
- [x] **Modals** — Full-width (calc(100vw - 24px)), 80vh max-height
- [x] **Preview modal** — Full screen on mobile
- [x] **Stats bar** — Wrap, compact 11px text
- [x] **Empty state** — Scaled down (48px icon, 16px title)
- [x] **Input modal** — 16px input, stacked actions, 44px buttons
- [x] **No horizontal overflow** — overflow-x: hidden on container

**Priority:** Low-Medium
**Estimated effort:** Small

---

### 10. 🎙️ Studio (`studio`)
**Files:** `StudioView.tsx`, `StudioDashboard.tsx`, `StudioOnboarding.tsx`, `StudioUpgradeModal.tsx`
**CSS:** `styles-studio.css`, `styles-studio-upgrade.css`, `styles-mobile-layout.css` §155–171 (768px) + 480px refinements
**Current state:** ✅ Full mobile design pass complete 2026-06-05
**Issues to audit:**
- [x] **Dashboard container** — 150px bottom padding removed, overflow-x hidden
- [x] **Header** — Compact padding, breadcrumb hidden (too wide), credits badge compact (label hidden), project select constrained, all header buttons 44px touch targets
- [x] **Main layout** — Stacks vertically (tool palette → preview → adjustments)
- [x] **Tool palette** — Converts from 200px vertical sidebar to horizontal scroll strip, items flex-shrink:0 with 44px min-height, descriptions hidden, header hidden
- [x] **Preview canvas** — Full width, 12px padding, min-height 200px, preview images max-height 50vh
- [x] **Adjustment panel** — Hidden on mobile (maximizes preview space)
- [x] **Preview states** — Generating, placeholder, empty, error, voice, music, writing all scaled for mobile
- [x] **Reference row** — Full-width buttons (44px), compact image preview (60px), audio name truncated
- [x] **Action buttons** — Full-width flex, 44px touch targets, 13px font
- [x] **History strip** — Max-height 80px, items 48px (42px at 480px), compact padding
- [x] **Prompt bar** — Stacks vertically (header → input → actions), textarea 16px (no iOS zoom), 48px min-height, generate button 44px, batch button 44px square, keyboard hint hidden
- [x] **Analytics panel** — Full-width, max-height 60vh
- [x] **Upgrade modal** — Comparison grid single-column, actions stack vertically, buttons 44px full-width, padding/radius reduced
- [x] **Onboarding** — Enhanced mobile (extends §38): orb grid centered, module orbs 60px, enter studio button full-width 48px, subtitle scaled
- [x] **Background** — Opacity reduced to 0.5 on mobile (performance)
- [x] **Web preview** — iframe/container max-width 100%
- [x] **Gallery/Project** — 12px padding, overflow-x hidden
- [x] **No horizontal overflow** — Container and all children constrained to 100vw
- [x] **480px refinements** — Further size reductions for small phones

**Priority:** Low → DONE
**Estimated effort:** Medium — DONE 2026-06-05
**Notes:** Added §155–171 in styles-mobile-layout.css (768px) + 480px refinements. Key changes: tool palette converts from 200px vertical sidebar to horizontal scroll strip (the most impactful change), adjustment panel hidden to maximize preview space, prompt bar stacks vertically with 16px textarea (prevents iOS zoom), header breadcrumb hidden, all buttons 44px+ touch targets. No JSX changes needed — all classNames already present. TypeScript compiles clean.

---

### 11. 🌲 Grove (`grove`)
**Files:** `GroveView.tsx`
**CSS:** `styles/grove.css`, `styles-mobile-layout.css` §20, §146–154
**Current state:** ✅ Full mobile design pass complete 2026-06-05
**Issues to audit:**
- [x] **Hero section** — Tree SVG scales to 140px (120px at 480px), stats compact (22px numbers, 9px labels), tagline 12px, top padding reduced to 16px
- [x] **Tab bar** — Horizontal scroll with 44px touch targets, flex-none items, compact font
- [x] **Agent filter** — Stacks vertically (label above select), select 16px with 44px touch target
- [x] **Content area** — Bottom padding set to 40px (was 32px)
- [x] **Skill cards** — Compact padding (10px 12px), emoji 20px, desc clamped to 2 lines, footer wraps badges
- [x] **Browse grid** — Single column on mobile (was 260px min), type filters horizontal-scroll with 36px targets, search input 16px (no iOS zoom), toggle/delete buttons 44px
- [x] **Marketplace** — Single column grid, toggle button 44px, install buttons 40px, compact text
- [x] **Detail overlay** — Bottom-sheet (92vh, rounded top), close button 44px, title 18px, markdown code blocks 11px, delete buttons 44px, confirm delete wraps
- [x] **Timeline** — Filters horizontal-scroll with 36px targets, event dots 8px, compact text, emoji 14px
- [x] **Section headers** — Compact (emoji 16px, title 14px, count 10px)
- [x] **Empty states** — Reduced padding (16px 12px), text 12px
- [x] **Garden sections** — Gap reduced to 20px (was 28px)
- [x] **480px refinements** — Further scaling for tree (120px), stats (20px), cards (8px padding), detail card (20px 14px), browse gap (6px)
- [x] **No horizontal overflow** — All content contained
- [x] **All inputs 16px** — Search input prevents iOS zoom
- [x] **Touch targets** — All buttons ≥44px, tabs 44px, filter chips 36px

**Priority:** Low
**Estimated effort:** Small-Medium — DONE 2026-06-05
**Notes:** Added §146–154 in styles-mobile-layout.css (768px) + 480px refinements. Key changes: hero section compacted (tree SVG scaled, stats reduced), tab bar horizontal-scroll with 44px targets, agent filter stacks vertically, skill cards compact with 2-line desc clamp, browse grid single-column, marketplace grid single-column, detail overlay becomes bottom-sheet (92vh), timeline filters horizontal-scroll with 36px targets, all inputs 16px to prevent iOS zoom. No JSX changes needed — all classNames already present. TypeScript compiles clean.

---

### 12. 🔍 Google Integration (`google`)
**Files:** `GoogleView.tsx`
**CSS:** `styles/google.css`, `styles-mobile-layout.css` §32 (768px + 480px)
**Current state:** ✅ Full mobile design pass complete 2026-06-05
**Issues to audit:**
- [x] **Main view** — Padding reduced (16px→12px), hero compact (icon 52px, title 22px), tabs horizontal-scroll with 12px font, badge compact
- [x] **NL command bar** — Stacks vertically (full-width input + full-width send button), input 16px (no iOS zoom), result panel compact
- [x] **Overview grid** — Single column, cards compact (16px radius, 14px header padding), all row items (event/email/file/task) reduced padding and font sizes
- [x] **Calendar detail** — Event cards stack (time info above body), 14px radius, title 14px, description clamped to 2 lines
- [x] **Gmail detail** — Email cards compact (12px padding, 12px radius), from/subject 12px, labels 9px
- [x] **Drive detail** — File cards 2-column grid, 14px radius, icon 28px, name 11px
- [x] **Tasks detail** — Task cards compact (12px padding, 12px radius), title 13px, check icon 18px
- [x] **Section headers** — Stack vertically (title + refresh button full-width), title 16px
- [x] **Loading/empty/error states** — All scaled for mobile, padding reduced
- [x] **480px refinements** — Further padding reductions, icon/title sizing, tab compact
- [x] **No horizontal overflow** — All content contained within viewport
- [x] **All inputs 16px** — NL input prevents iOS zoom
- [x] **Touch targets** — Refresh button 40px, NL send 44px, card actions 32px+

**Priority:** Low
**Estimated effort:** Small — DONE 2026-06-05
**Notes:** Extended §32 in styles-mobile-layout.css (768px) + 480px refinements. Key changes: NL command bar stacks vertically, overview grid single-column, all cards reduced padding/radius/font, section headers stack, calendar event cards convert to stacked layout (time above body), drive files 2-column grid, all inputs 16px to prevent iOS zoom. No JSX changes needed — all classNames already present. TypeScript compiles clean.

---

### 13. 🛡️ Security Hub (`security`)
**Files:** `SecurityDashboard.tsx`, `AegisDashboard.tsx`, `ViperDashboard.tsx`, `SIEMDashboard.tsx`, `AgentAuditDashboard.tsx`
**CSS:** `styles/security.css`, `styles-mobile-layout.css` §19 (existing responsive rules) + §19b (new mobile pass)
**Current state:** ✅ Full mobile design pass complete 2026-06-05
**Issues to audit:**
- [x] **Overview tab** — Stats grid → 2-col, stat cards compact, risk items readable, event rows compact, chart containers responsive
- [x] **Aegis tab** — Category cards single-column, finding cards readable, filter row stacks, history rows compact, scan buttons stack + 44px touch, score ring + stats wrap
- [x] **Viper tab** — Same pattern as Aegis: findings, filters, history all mobile-optimized
- [x] **Watchtower tab** — Hero bar stacks (`.sec-wt-hero`), panel tabs 44px (`.sec-wt-panel-tabs`), process table scrollable (`.sec-wt-process-table`), process rows tappable (`.sec-wt-process-row`), connection rows readable (`.sec-wt-conn-row`), file rows readable (`.sec-wt-file-row`)
- [x] **Tab bar** — 9 tabs horizontal-scroll with flex-shrink:0, 2px gap, 12px font, compact padding
- [x] **Alert cards** — Compact padding, action buttons 44px+ touch targets
- [x] **Activity log** — Live indicator, event rows compact with smaller fonts, NEW badge works
- [x] **Sentinel tab** — Quarantine levels wrap (`.sec-quarantine-levels`), level chips compact (`.sec-quarantine-level-chip`), actions stack on mobile (`.sec-sentinel-actions`), escalate modal full-width (`.sec-escalate-modal`)
- [x] **Network tab** — Hero compact (`.sec-network-hero`), device grid single-column (`.sec-device-grid`), scan button full-width (`.sec-network-scan-btn`)
- [x] **Permissions tab** — Profile grid single-column, cards compact, mode buttons 44px, range sliders bigger thumb
- [x] **Pending tab** — Prompt cards compact, buttons wrap 2-col with 44px touch targets
- [x] **Global** — All inputs 16px (no iOS zoom), all buttons 44px+, no horizontal overflow, safe area padding, box-sizing border-box on all sec-app children

**Priority:** Low (dev/power-user tool)
**Estimated effort:** Medium — DONE 2026-06-05
**Notes:** Added §19b in styles-mobile-layout.css (768px block). Key changes: stat cards 2-col grid, category/profile/device grids single-column, event/finding/alert/history rows compact with smaller fonts, all buttons 44px min-height touch targets, filter rows stack vertically, chart containers responsive, prompt buttons wrap 2-col, toast full-width, scan types stack, range sliders 24px thumb, safe area bottom padding, box-sizing border-box on all children. JSX classNames added: `.sec-wt-hero`, `.sec-wt-panel-tabs`, `.sec-wt-process-table`, `.sec-wt-process-row`, `.sec-wt-conn-row`, `.sec-network-hero`, `.sec-network-scan-btn`, `.sec-device-grid`, `.sec-quarantine-levels`, `.sec-quarantine-level-chip`, `.sec-escalate-modal`. TypeScript compiles clean.

---

### 14. 🤖 Agents (`agents`)
**Files:** `AgentsView.tsx`
**CSS:** `styles-agents.css`, `styles-mobile-layout.css` §35b, §100
**Current state:** ✅ Full mobile design pass complete 2026-06-05
**Issues to audit:**
- [x] **Agent grid** — 2-column grid on mobile, cards compact (14px padding), avatars 40px, names 13px, taglines clamped to 2 lines, footer stacks vertically (toggle + edit button full-width), edit button full-width 36px, toggle has 44px touch target area
- [x] **Tabs** — Horizontal scroll with flex-none tabs, 44px min-height touch targets, compact text
- [x] **Persona editor** — Basics grid → single column, model cards stack vertically, all inputs 16px (no iOS zoom), save button full-width 44px, agent row horizontal-scroll
- [x] **Files viewer** — Tabs compact, file card padding reduced, content font scaled, max-height 300px
- [x] **Manage section** — Actions full-width 48px touch targets, stats compact, heading scaled
- [x] **Onboarding** — Already done in §38d (previous pass)
- [x] **Agent marketplace** — N/A (opens as separate view, not part of AgentsView.tsx)

**Priority:** Medium
**Estimated effort:** Medium — DONE 2026-06-05
**Notes:** Added §100 in styles-mobile-layout.css (768px) + 480px refinements. Key changes: agent grid 2-column on mobile (was auto-fill minmax 280px), cards compact with 2-line tagline clamp, footer stacks vertically so edit button gets full width, persona basics grid single-column, model cards stack vertically, all inputs 16px to prevent iOS zoom, tabs horizontal-scroll with 44px touch targets, toggle switch has 44px touch target area. Identity preserved (Conflux purple, gold accents, avatar gallery, pulse dots). TypeScript compiles clean.

---

### 15. 🏡 Home Health / Foundation (`foundation`)
**Files:** `HomeHealthView.tsx`, `FoundationOnboarding.tsx`, `FoundationHero.tsx`, `FoundationChat.tsx`
**CSS:** `styles/foundation.css`, `styles-mobile-layout.css` §24, §38d, §100–113
**Current state:** ✅ Full mobile design pass complete 2026-06-05
**Issues to audit:**
- [x] **Dashboard** — Health score ring scales to 130px (110px at 480px), system cards single-column (JSX className added), stat cards 2-col grid with compact padding, sparkline hidden on mobile, maintenance list readable with compact items
- [x] **Tabs** — Horizontal scroll with 44px touch targets, scrollbar hidden, flex-none items
- [x] **Nudge banner** — Compact padding, smaller text, dismiss button 32px touch target
- [x] **Diagnose tab** — Input 16px (no iOS zoom), diagnose button full-width 44px, diagnosis card compact, recent problems readable
- [x] **Calendar tab** — Month nav buttons 44px touch targets, seasonal card compact padding
- [x] **Vault tab** — Warranty cards compact padding, readable text
- [x] **Chat tab** — Responsive height (max-height 55vh, 50vh at 480px), bubbles 92% width, input 16px (no iOS zoom), send button 44px touch target (JSX className added), input area compact
- [x] **Onboarding** — Already done in §38d. Extended with input 16px font, buttons 44px touch targets, ownership buttons 44px, system/alert buttons compact padding
- [x] **Hero** — System cards grid className added to JSX (`.foundation-hero-systems`) for clean CSS override. Backdrop circle scales down proportionally

**Priority:** Medium
**Estimated effort:** Medium — DONE 2026-06-05
**Notes:** Added §100–113 in styles-mobile-layout.css (768px) + 480px refinements. Key changes: hero score ring SVG scales to 130px/110px, system cards grid goes single-column via new `.foundation-hero-systems` className, stat cards remain 2-col but compact, sparkline SVG hidden (too small to read), tabs horizontal-scroll with 44px targets, all inputs 16px to prevent iOS zoom, chat area max-height 55vh, chat send button gets `.foundation-chat-send` className for 44px touch target. Two JSX changes: FoundationHero.tsx (systems grid className) and FoundationChat.tsx (input area + send button classNames).

---

### 16. ⚙️ Settings
**Files:** `Settings.tsx`, `settings/ProviderSettings.tsx`, `settings/GoogleSettings.tsx`, `settings/NotificationSettings.tsx`, `settings/SecuritySettings.tsx`, `settings/HeartbeatChainSettings.tsx`
**CSS:** `styles/settings.css`, `styles-mobile-layout.css` §172–184 (768px) + 480px refinements
**Current state:** ✅ Full mobile design pass complete 2026-06-05
**Issues to audit:**
- [x] **Settings page** — Full-screen (fixed inset: 0, 100vw, 100dvh), wallpaper/grid/particles hidden on mobile for performance
- [x] **Sidebar → bottom tabs** — Sidebar converts to 56px bottom tab bar (inherits 640px breakpoint + refined z-index/sizing), logo/labels hidden, nav items compact icons + 9px label, active indicator moves to top bar
- [x] **Content area** — Full width (margin-left: 0), 16px 12px 80px padding, scrollable, overflow-x hidden
- [x] **Category header** — Compact (icon 42px, title 18px, desc 12px)
- [x] **Status bar** — 2×2 grid, cards compact (12px padding, icon 36px), no hover transform
- [x] **Section cards** — 16px padding, 14px radius, no hover lift
- [x] **Settings rows** — Stack vertically (label above value), 8px padding, value breaks long text
- [x] **Inputs** — 16px font (no iOS zoom), 44px min-height, full-width
- [x] **Buttons** — 44px min-height, 16px padding, no hover transform, actions stack vertically full-width
- [x] **Toggle switches** — 44px touch target area (46×26px toggle with 11px padding)
- [x] **Accent color picker** — 32px circles (compact but tappable)
- [x] **About section** — Logo 48px, name 18px, links wrap with center justify
- [x] **Confirm bar** — Full-width, buttons stack vertically
- [x] **Token edit** — Stacks vertically
- [x] **Advanced divider** — Compact (9px text, reduced margins)
- [x] **Report header** — Compact (8px padding, 11px buttons, wraps)
- [x] **480px refinements** — Further size reductions for content padding, category header, section cards, status cards, about logo/name

**Priority:** Low → DONE
**Estimated effort:** Small-Medium — DONE 2026-06-05
**Notes:** Added §172–184 in styles-mobile-layout.css (768px) + 480px refinements. Key changes: settings page goes full-screen (fixed positioning), wallpaper/grid/particles hidden for mobile performance, sidebar converts to bottom tab bar with compact icon+label nav items, content area takes full width with proper padding for bottom tabs, all settings rows stack vertically, all inputs 16px to prevent iOS zoom, all buttons 44px+ touch targets, accent circles slightly larger (32px) for tappability, status bar converts to 2×2 grid. No JSX changes needed — all classNames already present. TypeScript compiles clean.

---

### 17. 🔐 Login / Auth (`login`)
**Files:** `LoginScreen.tsx`
**Current state:** `autoFocus` removed. `.login-screen` class added to container. Mobile CSS rules added (§30 expanded + 480px refinements).
**Issues to audit:**
- [x] **Login screen** — Full-bleed, input sizing, button sizing — ✅ CSS overrides for card padding, title font, input font (16px prevents iOS zoom), button sizing
- [x] **Auth callback** — Loading state — inherits mobile card sizing
- [x] **Magic link** — Check email message, resend button — inherits mobile card sizing

**Priority:** High (first thing users see)
**Estimated effort:** Small — DONE 2026-06-05

---

### 18. 🚀 Onboarding (`onboarding`)
**Files:** `Onboarding.tsx`, `onboarding-v2/` (8 files), `HearthOnboarding.tsx`, `HorizonOnboarding.tsx`, `BudgetOnboarding.tsx`, `PulseOnboarding.tsx`, `RadarOnboarding.tsx`, `FoundationOnboarding.tsx`, `OrbitOnboarding.tsx`, `EchoOnboarding.tsx`, `StudioOnboarding.tsx`, `KitchenOnboarding.tsx`, `AgentIntroductions.tsx`, `FamilySetup.tsx`, `MissionManifest.tsx`
**CSS:** `styles-mobile.css` (onboarding-v2 overrides), `styles-mobile-layout.css` §38–38d (new), `styles-echo-onboarding.css`, `styles-agent-introductions.css`, `styles/horizon-onboarding.css`, `styles-agent-boot-cards.css`
**Current state:** Full mobile CSS pass complete. `autoFocus` and auto-focus `setTimeout` removed from all. Class names added for CSS targeting.
**Issues to audit:**
- [x] **V2 Onboarding** — Awakening scene: name input repositioned (bottom 10%), logo scaled down, input font 16px. Name step: min-height (not fixed), scroll enabled, font scaled. Agent selection: card grid sizing, voice button touch targets. Icebreaker: textarea 16px, glow chips sized. Build step: card padding reduced.
- [x] **Agent cards** — Grid layout responsive (§38b). Cards: 90px at 480px, padding/gap reduced. Touch targets: voice buttons min 36px height.
- [x] **Holographic input** — Full-width on mobile. Text 16px (prevents iOS zoom).
- [x] **3D scenes** — AwakeningScene: name input overlay repositioned for mobile. Canvas renders within viewport (fixed positioning).
- [x] **Voice step** — Part of AgentMaterialize, covered by card sizing.
- [x] **Per-app onboardings** — All 10 onboardings have CSS overrides: padding, font sizes, input sizing, button sizing, card sizing. Section 38d in styles-mobile-layout.css.
- [x] **Agent introductions** — Card padding, emblem sizing, name/intro font, badge sizing, action button touch target, skip button positioning.
- [x] **Family setup** — Modal max-width, padding, grid layouts (age groups 3-col→2-col), emoji/color button sizing.

**Priority:** High (first experience for new users)
**Estimated effort:** Large — DONE 2026-06-05

---

## Cross-Cutting Concerns

These apply to ALL apps:

### Typography
- [ ] Minimum body text: 14px on mobile (12px absolute minimum for captions)
- [ ] Headings should scale down proportionally
- [ ] Line height: 1.4-1.6 for readability

### Touch Targets
- [ ] Minimum 44×44px for all interactive elements (Apple HIG)
- [ ] Minimum 8px gap between adjacent touch targets
- [ ] Buttons, links, cards, tabs — all must be tappable without precision

### Spacing
- [ ] Consistent padding: 12-16px on mobile (not 121px desktop values)
- [ ] Section gaps: 16-24px
- [ ] Card internal padding: 12-16px

### Overflow
- [ ] No horizontal scroll on any screen
- [ ] Long text truncates with ellipsis or wraps gracefully
- [ ] Images/videos scale to viewport width
- [ ] Tables scroll horizontally or convert to card layout

### Navigation
- [ ] Back button visible and accessible on every immersive view
- [ ] Tab bars scroll horizontally if they don't fit
- [ ] Modals are full-screen on mobile

### Dark Mode
- [ ] All text has sufficient contrast (4.5:1 minimum)
- [ ] No pure black (#000) backgrounds — use dark grays (#0a0a0a, #111)
- [ ] Glowing elements don't bleed/blur on small screens

---

## Execution Plan

### Approach: One App Per Pass

Don't batch. Each app gets a dedicated, focused pass:

1. **Pick the app** (priority order from the list above)
2. **Read all its files** — components, CSS, types
3. **Open in browser** at 375px viewport — take screenshots
4. **Document issues** — specific, actionable, with line numbers
5. **Write the CSS** — mobile overrides in `styles-mobile-layout.css`
6. **Refactor inline styles** if needed — move to className so CSS can override
7. **Test** — TypeScript compile + visual check at 375px, 414px, 768px
8. **Update this doc** — check off items, note what was done

### Priority Order

**Phase 1 — Core Experience (do first):**
1. Login / Auth
2. Onboarding (v2 + all per-app onboardings)
3. Budget / Pulse
4. Kitchen / Hearth
5. Life / Orbit

**Phase 2 — Important Apps:**
6. Dreams / Horizon
7. Diary / Mirror
8. Home Health / Foundation
9. Agents

**Phase 3 — Supporting Apps:**
10. Feed / Radar
11. Games (all 6+ games)
12. Vault
13. Google Integration

**Phase 4 — Power User:**
14. Security Hub
15. Studio
16. Grove
17. Settings

### Sub-Agent Strategy

For each app, spawn a focused sub-agent with:
- The app's component files (listed above)
- The relevant CSS files
- This checklist's section for that app
- The MASTER_INSPIRATION_PROMPT.md design philosophy
- The mobile layout CSS rules (existing overrides to build on)

The sub-agent should:
1. Read all files
2. Write CSS overrides
3. Refactor inline styles if needed
4. Compile check
5. Report what was done

---

## Notes

- **Inline styles are the #1 enemy.** Desktop views use `style={{ paddingTop: '50px', paddingBottom: '150px', paddingLeft: '121px', paddingRight: '121px' }}`. The generic `.immersive-content > div` override handles these, but view-specific overrides need `!important` to beat them.
- **Each app is its own world.** Don't make them look the same. Pulse should feel like Pulse. Hearth should feel like Hearth. The mobile layout adapts the structure, not the identity.
- **Some apps have 5+ sub-views.** Pulse alone has Budget, Stocks, Portfolio, Speak tabs. Each needs individual attention.
- **Games are the hardest.** Each game has unique layout needs (card games need larger touch targets, canvas games need responsive canvas, etc.)
- **Onboardings are the first impression.** They must be flawless on mobile.

---

*Last updated: 2026-06-05 (Settings mobile design pass)*
