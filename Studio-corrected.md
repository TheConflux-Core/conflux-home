### Studio Application Deep-Dive (Corrected Brief)

**Context from user (Don Ziglioni):**
> "Studio application deep dive. All-in-all, it looks like crap compared to the other apps. It makes sense, but we have improved upon every aspect of AI that people are used to in the other apps. We should brainstorm how a user is going to be using each tab, and we can probably consolidate this into a main power studio app of some sort."

**Core correction:** Studio is **not** a power-user app for managing agents or viewing telemetry. **Studio is Conflux Home's creative generative workspace** — the hub where users create visual, audio, and interactive content using AI. It's the "make things" app, not the "manage things" app.

---

## What Studio Actually Is

Studio is a **multi-modal content creation suite** with 6 generation modules:

| Module | Icon | Purpose |
|--------|------|---------|
| **Image** | 🖼️ | Generate, edit, and transform images from text prompts |
| **Video** | 🎬 | Create and animate video content (placeholder → real) |
| **Music** | 🎵 | Compose music and sound effects (placeholder → real) |
| **Voice** | 🗣️ | Clone voices and generate speech (ElevenLabs integrated) |
| **Code/Web** | 💻 | Build websites and web apps from descriptions |
| **Design** | 🎨 | Create logos, templates, and brand assets |

Current implementation (StudioView.tsx, StudioPromptBar.tsx, useStudio hook):
- Tab-based module switching (6 tabs)
- Prompt input per module
- Output preview with image/audio player
- Generation history (thumbnail strip)
- Save to Vault, Remix actions
- Credit tracking

**The problem:** It works, but feels like a dashboard panel. Compare to:
- **Hearth** (Kitchen): heat-shimmer canvas, floating embers, recipe card reveal
- **Pulse** (Budget): emerald particle field, glowing heart pulse, budget initialization flow
- **Dreams** (Horizon): constellation scatter, goal card morph, future-self visualization

Studio needs that same **cinematic quality bar** — it should feel like entering a creative laboratory, not a form.

---

## User Workflows (How People Actually Use Studio)

| Scenario | User Intent | Current Experience | Target Experience |
|----------|-------------|-------------------|-------------------|
| **A. "I need a cover image"** | Quick asset for a project | Tab → prompt → wait → save | One-step "Create" button on desktop → modal → done |
| **B. "I'm exploring an idea"** | Iterative generation/remix | Manual tab switching, history scroll | Gallery view with instant remix, side-by-side comparison |
| **C. "I want a voice for my project"** | Voice cloning + narration | Voice tab → text → TTS | Voice studio with sample playback, tone adjustment, persona linking |
| **D. "I'm building a website"** | Code generation for a full page | Code tab → description → wait | Component palette + live preview + iterative editing |
| **E. "I'm making a video"** | Storyboard → clips → music → final | Video tab (mock) → placeholder | Real video generation with timeline, clips, music sync |
| **F. "I want consistent branding"** | Design system generation | Design tab → generic prompts | Brand kit: colors, fonts, logos, templates in one flow |

**Key insight:** Studio is the **producer's toolkit**. It needs speed, iteration, and a "playground" feel — not linear tab-per-task.

---

## Requirements for Cinematic Studio Redesign

### 1. Design Metaphor — "The Creative Laboratory"
**What does Studio feel like?**
- A **luminous gradient-mesh workspace** with floating tool palettes
- Tools materialize when needed, not clutter the interface
- Every generation feels like an **experiment coming to life**
- Color story: Electric purple + electric cyan + deep void black (already partially in styles-studio.css)

**Reference palette from existing styles:**
- `--studio-bg: #080c14` (deep charcoal/blue-black)
- `--studio-accent-purple: #a855f7`
- `--studio-accent-cyan: #06b6d4`
- Use mesh gradients, glassmorphism, subtle grid overlays

### 2. Studio Onboarding — "The First Creation"
**Goal:** First-time user generates something meaningful within 90 seconds.

**Phases** (matching Hearth/Pulse pattern):
1. **Welcome** — Full-screen canvas: "What do you want to create today?" with 6 glowing module orbs (image/video/music/voice/code/design)
2. **Intent** — User picks module → presents module-specific starter prompt (not blank textarea)
3. **Interpretation** — AI parses intent, shows preview card with "This is what I heard" + adjustable parameters
4. **First Generation** — One-click generate, immersive animation showing creation process
5. **Save/Remix** — "Save to Vault" or "Remix" — user owns their first creation immediately

**Implementation:**
- StudioOnboarding.tsx — fullscreen overlay, dismissible but recommended
- Canvas-based particle system per module:
  - Image: floating color swatches, shape morphing
  - Voice: audio waveform bloom, soundwave particles
  - Code: syntax-highlighted snippets gently streaming
- Use Framer Motion for card transitions
- Persist via `studio-onboarding-completed` in localStorage

### 3. New Primary View — The Studio Dashboard
**Replace current tab-based layout with a creative workspace:**

```
┌─────────────────────────────────────────────────────────┐
│  Studio — Your Creative Laboratory                      │
├──────────────┬───────────────────────────────────────────┤
│              │                                           │
│  TOOL PALETTE│  MAIN CANVAS — live preview of selected │
│  (collapsible)│  generation with layer stack, controls  │
│              │                                           │
│  [🖼️] [🎬]   │  ┌───────────────────────────────────┐  │
│  [🎵] [🗣️]   │  │   Preview Card — image/video/audio │  │
│  [💻] [🎨]   │  │   with adjustment knobs, quick actions│ │
│              │  └───────────────────────────────────┘  │
│              │                                           │
│  QUICK ACTIONS│  HISTORY PANEL (bottom, scrollable)    │
│  • New Project │  Recent generations as draggable cards │
│  • Templates   │                                           │
│  • Styles      │                                           │
└──────────────┴───────────────────────────────────────────┘
```

**Key changes:**
- Left: persistent module palette (icons only, slim)
- Top-center: current module name + quick settings (style strength, aspect ratio, etc.)
- Center: large preview area with adjustment sliders (not buried in menus)
- Bottom: horizontal scrolling history strip (improved from current)
- Right (optional): properties panel (when item selected)

### 4. Consolidated Module Detail View
**Current:** Tabs swap entire UI. **Target:** Unified canvas with context-aware controls.

**Pattern:**
- Selecting a module updates the **tool palette** and **adjustment panel**, not the entire page
- The preview area stays consistent — just the controls change
- Framer Motion cross-fade for module switch (500ms)

**Module-specific quick controls:**
- **Image**: style selector (realistic/artistic/cartoon), aspect ratio, variations count
- **Voice**: voice selector (cloned voices first), speed, emotion slider
- **Code**: framework selector, responsiveness toggle, "Run Preview" button
- **Music**: genre, mood, duration, instruments

### 5. Gallery / Project View
When user clicks history item → opens **Project Mode**:
- Full-screen preview
- Side panel: prompt history, remix tree, version history
- Export options: download, share, publish
- "Branch" button to create variant (saves parent-child relationship)

### 6. Telemetry & Analytics (Power-User Dashboard)
Optional advanced panel (toggle-able):
- Credit usage over time (per module)
- Generation speed metrics
- Most-used prompts (word cloud)
- Success rate by model

**Not the primary UI** — this lives behind a "⋮ → Analytics" menu to avoid cluttering main creative flow.

---

## What to KEEP (Existing Functionality)

✅ All existing functionality must be preserved:
- `studio_create_generation`, `studio_generate_image`, `studio_generate_voice` Tauri commands
- `studio_save_to_vault`, `studio_delete_generation`, `studio_upsert_prompt`
- History loading/selection (`studio_get_generations`)
- Credit display & refresh
- Remix flow (pre-fills prompt from existing)
- Reference image upload (for image module)
- Multi-module support (6 modules already wired)

---

## Technical Implementation Plan

### Phase 1: Onboarding & Visual Foundation
1. **StudioOnboarding.tsx** — fullscreen multi-phase flow
   - Canvas particle system (simple, like Hearth embers)
   - Module selection → starter prompt → first generate
   - `localStorage` flag: `studio-onboarding-completed`
2. **Background mesh** — add `<canvas>` layer in StudioView, animate gradient particles matching studio color palette
3. **Transition library** — Framer Motion page transitions between Dashboard ↔ Module Detail ↔ Gallery

### Phase 2: Dashboard Layout (Core UX Rewrite)
1. **StudioDashboard.tsx** — new primary layout
   - ToolPalette (left, icons)
   - PreviewCanvas (center, responsive)
   - AdjustmentPanel (right, context-aware)
   - HistoryStrip (bottom, scrollable)
2. **StudioControls.tsx** — unified control panel that swaps based on `activeModule`
3. **StudioPreview.tsx** — large output display with modal fullscreen
4. **Update useStudio** to support new state: `activeProjectId`, `showAdjustments`, `isGalleryMode`

### Phase 3: Module UX Polish
For each module, add:
- **Presets/Templates** (Image: "product photo", "avatar", "landscape"; Voice: "narrator", "character", "announcer")
- **Quick-adjust sliders** (creativity, detail level, aspect ratio)
- **Reference image upload** (already exists for image, extend to others where useful)
- **Batch generation** (generate 4 at once → user picks/remixes)
- **In-place editing** (crop, trim, adjust) — eventually

### Phase 4: Gallery & Project Management
1. **StudioGallery.tsx** — grid view of all generations with filters (module, date, vaulted)
2. **StudioProject.tsx** — single project view with branches, versions, exports
3. **Bulk actions**: select multiple → save to vault, delete, export zip

### Phase 5: Analytics Panel (Optional, V2)
1. **StudioAnalytics.tsx** — credit usage charts, generation stats
2. Hook into existing `useCredits`, track per-module usage in DB

---

## File Reference Map

**Existing files to modify:**
- `src/components/StudioView.tsx` — replace with Dashboard layout, or rename to `StudioDashboard.tsx` and make `StudioView` a thin shell
- `src/components/StudioPromptBar.tsx` — refactor into `StudioControls.tsx` (prompt + settings)
- `src/components/StudioOutput.tsx` → becomes `StudioPreview.tsx`
- `src/components/StudioHistory.tsx` → becomes `StudioHistoryStrip.tsx` (bottom bar)
- `src/components/StudioTabs.tsx` → deprecate; replace with icon palette

**New files to create:**
- `src/components/StudioOnboarding.tsx` — cinematic first-run experience
- `src/components/StudioDashboard.tsx` — main layout
- `src/components/StudioControls.tsx` — unified prompt + settings
- `src/components/StudioPreview.tsx` — large output + adjustments
- `src/components/StudioHistoryStrip.tsx` — bottom horizontal scroll
- `src/components/StudioGallery.tsx` — grid project view
- `src/components/StudioProject.tsx` — single project detail
- `src/hooks/useStudioProject.ts` — project/version state
- `src/styles/studio-onboarding.css` — onboarding animations
- `src/styles/studio-dashboard.css` — layout + mesh gradient

**Hooks to extend:**
- `useStudio.ts` — add: `currentProject`, `projects`, `adjustments`, `toggleFullscreen`, `enterGallery`
- New `useStudioAnalytics.ts` (optional): credit consumption, gen count

---

## Cinematic Treatment Details

### Visual DNA (reusable from other apps)
```
Canvas: animated mesh gradient background
  - 2-3 radial gradients that drift slowly
  - Subtle floating particles (12-18 per module theme)
  - Low opacity, never distracts from content

Glassmorphism:
  - All panels: rgba(2, 10, 20, 0.6) + blur(16px)
  - Border: 1px semi-transparent gradient
  - Hover: glow with --studio-gradient

Typography:
  - Headings: Inter 600-700
  - Body: Inter 400
  - Monospace (code): JetBrains Mono
  - All tracking: +0.02em for UI labels

Transitions (Framer Motion):
  - Panel crossfade: 400ms ease-out
  - History card scale on select: 0.95 → 1.05 → 1
  - Preview reveal: slide up + fade, 500ms
  - Button hover: scale(1.02) + glow pulse
```

### Module-Specific Vibe

**Image (🖼️):**
- Particles: floating color swatches that drift and blend
- Preview card: subtle "wet paint" shimmer on generation
- Templates: "Portrait", "Landscape", "Square", "Wallpaper", "Thumbnail"

**Video (🎬):**
- Particles: timeline snippets floating by
- Preview: loading bar with frame thumbnails
- Quick edits: trim handles, speed slider (eventually)

**Music (🎵):**
- Particles: floating piano keys/notes
- Preview: animated waveform/spectrogram
- Presets: "Lo-fi beats", "Cinematic", "Ambient", "Upbeat"

**Voice (🗣️):**
- Particles: soundwave pulses radiating
- Preview: animated equalizer bars
- Voice picker: show cloned voices first, then ElevenLabs defaults

**Code (💻):**
- Particles: falling code symbols ({ } [ ] ;)
- Preview: live-render iframe for simple sites
- Templates: "Landing page", "Dashboard", "Blog", "App"

**Design (🎨):**
- Particles: floating geometric shapes (circle, square, triangle)
- Preview: artboard mockup (phone/mockup/large format)
- Templates: "Logo", "Business card", "Social banner", "Icon set"

---

## Success Criteria

When Studio is done, user should think:
> "This is where my ideas become real. I can create anything visual, audio, or interactive here — fast, iterative, and beautiful."

**Checklist:**
- [ ] First-run onboarding generates a creation in <90 seconds
- [ ] Main dashboard feels like a workspace, not a form
- [ ] Every module has its own personality but shares visual language
- [ ] History browse is instant, remix is one click
- [ ] Background animation alive but not distracting
- [ ] Credit balance always visible but not obtrusive
- [ ] Mobile-responsive (eventually) — but desktop-first

---

## File to Update

This corrected brief replaces the hallucinated third-line premise. The rest of the original Studio.md (deliverables, consolidation plan, constraints) is mostly salvageable **if you replace "agent management" with "creative content management" and "telemetry" with "generation analytics"**.

**Specifically:**
- ❌ Remove: "Scenario D: install/uninstall agents" → Studio doesn't manage agents
- ❌ Remove: "Agent Detail view with persona/files tabs" → That's the Agent view, not Studio
- ✅ Keep: Dashboard, Gallery, Project view consolidation
- ✅ Keep: Cinematic treatment, Framer Motion, Tailwind CSS
- ✅ Keep: Reference Hearth/Pulse/Dreams for quality bar

---

**Bottom line:** Studio is the **make** app. Pulse/Budget is **money**. Hearth/Kitchen is **food**. Orbit/Life is **time**. Dreams/Horizon is **goals**. Echo is **feelings**. Feed/Current is **information**. Studio is the **creation engine**. It should feel as alive and intentional as the rest.

Write the corrected prompt above into a clean `Studio.md` that accurately reflects this.
