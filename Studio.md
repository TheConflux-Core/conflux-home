# Studio — Conflux Home's Creative Generative Workspace

**Tagline:** *Describe it. Generate it. Ship it.*

Studio is the **make** app — Conflux Home's multi-modal creative suite where users generate visual, audio, and interactive content using AI. It is not an agent-management dashboard or telemetry viewer. It is a **creative laboratory**.

---

## What Studio Is

Studio is a **multi-modal content creation suite** with six generation modules:

| Module | Icon | Purpose |
|--------|------|---------|
| **Image** | 🖼️ | Generate, edit, and transform images from text prompts |
| **Video** | 🎬 | Create and animate video content |
| **Music** | 🎵 | Compose music and sound effects |
| **Voice** | 🗣️ | Clone voices and generate speech (ElevenLabs integrated) |
| **Code/Web** | 💻 | Build websites and web apps from descriptions |
| **Design** | 🎨 | Create logos, templates, and brand assets |

**Core identity:** Studio is where ideas become real. It should feel as alive and intentional as Hearth (food), Pulse (money), Orbit (time), Dreams (goals), and Echo (feelings).

---

## User Workflows

| Scenario | Intent | Current Experience | Target Experience |
|----------|--------|-------------------|-------------------|
| **A. \"I need a cover image\"** | Quick asset | Tab → prompt → wait → save | One-step Create button → modal → done |
| **B. \"I'm exploring an idea\"** | Iterative generation | Manual tab switching, history scroll | Gallery view with instant remix, side-by-side comparison |
| **C. \"I want a voice for my project\"** | Voice cloning + narration | Voice tab → text → TTS | Voice studio with sample playback, tone adjustment, persona linking |
| **D. \"I'm building a website\"** | Code generation for full page | Code tab → description → wait | Component palette + live preview + iterative editing |
| **E. \"I'm making a video\"** | Storyboard → clips → music → final | Video tab (mock) → placeholder | Real video generation with timeline, clips, music sync |
| **F. \"I want consistent branding\"** | Design system generation | Design tab → generic prompts | Brand kit: colors, fonts, logos, templates in one flow |

**Key insight:** Studio is the **producer's toolkit**. It needs speed, iteration, and a \"playground\" feel — not linear tab-per-task.

---

## Cinematic Quality Bar

Studio must match the immersive polish of Hearth, Pulse, and Dreams:

- **Design metaphor:** *The Creative Laboratory* — a luminous gradient-mesh workspace with floating tool palettes
- **Color story:** Electric purple (#a855f7) + electric cyan (#06b6d4) + deep void black (#080c14)
- **Visual language:** Mesh gradients, glassmorphism, subtle grid overlays, Framer Motion transitions
- **Ambient life:** Background animation alive but never distracting

---

## Redesign Pillars

### 1. Studio Onboarding — "The First Creation"

**Goal:** First-time user generates something meaningful within 90 seconds.

**Phases:**
1. **Welcome** — Full-screen canvas: \"What do you want to create today?\" with 6 glowing module orbs
2. **Intent** — User picks module → module-specific starter prompt (not blank)
3. **Interpretation** — AI shows preview card: \"This is what I heard\" + adjustable parameters
4. **First Generation** — One-click generate, immersive creation animation
5. **Save/Remix** — \"Save to Vault\" or \"Remix\" — user owns their creation immediately

**Implementation:**
- `StudioOnboarding.tsx` — fullscreen overlay, dismissible but recommended
- Canvas-based particle system per module (floating color swatches for Image, audio waveform bloom for Voice, syntax highlights for Code)
- Framer Motion for card transitions
- Persist via `localStorage` flag: `studio-onboarding-completed`

---

### 2. Studio Dashboard — The Main Workspace

**Replace tab-based layout with a creative workspace:**

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
- Left: persistent module palette (icons only, slim, collapsible)
- Top-center: current module name + quick settings (style strength, aspect ratio, etc.)
- Center: large preview area with adjustment sliders (not buried in menus)
- Bottom: horizontal scrolling history strip (draggable cards, instant remix)
- Right (optional expandable): properties panel when item selected

---

### 3. Consolidated Module Detail View

**Pattern:** Selecting a module updates the tool palette and adjustment panel — not the entire page. The preview area stays consistent; just the controls change. Framer Motion cross-fade for module switch (500ms).

**Module-specific quick controls:**
- **Image:** style selector (realistic/artistic/cartoon), aspect ratio, variations count
- **Voice:** voice selector (cloned voices first), speed, emotion slider
- **Code:** framework selector, responsiveness toggle, \"Run Preview\" button
- **Music:** genre, mood, duration, instruments
- **Video:** timeline scrubber, clip trim, speed
- **Design:** format selector (logo/banner/card), color palette lock

---

### 4. Gallery / Project View

When user clicks history item → opens **Project Mode**:
- Full-screen preview
- Side panel: prompt history, remix tree, version history
- Export options: download, share, publish
- \"Branch\" button to create variant (saves parent-child relationship)

---

### 5. Analytics Panel (Optional, Power-User)

Toggle behind `⋮ → Analytics` menu to avoid cluttering creative flow:
- Credit usage over time (per module)
- Generation speed metrics
- Most-used prompts (word cloud)
- Success rate by model

---

## What to KEEP (Existing Functionality)

All existing Tauri commands and data flows must be preserved:

- `studio_create_generation`, `studio_generate_image`, `studio_generate_voice`
- `studio_save_to_vault`, `studio_delete_generation`, `studio_upsert_prompt`
- History loading/selection (`studio_get_generations`)
- Credit display & refresh
- Remix flow (pre-fills prompt from existing)
- Reference image upload (for image module)
- Multi-module support (6 modules already wired)

---

## Visual Design System

### Canvas Background

**Mesh gradient + particle system:**
- 2-3 radial gradients that drift slowly (25s cycle)
- Floating particles (12-18 per module theme) — low opacity, never distracting
- Subtle grid overlay at 5% opacity

**CSS custom properties:**
```css
--studio-bg: #080c14
--studio-surface: rgba(2, 10, 20, 0.6)
--studio-surface-hover: rgba(2, 10, 20, 0.75)
--studio-border: rgba(139, 92, 246, 0.1)
--studio-border-hover: rgba(6, 182, 212, 0.4)
--studio-accent-purple: #a855f7
--studio-accent-cyan: #06b6d4
--studio-accent-white: #f0f0ff
--studio-gradient: linear-gradient(135deg, #a855f7, #06b6d4)
--studio-gradient-vivid: linear-gradient(135deg, #c084fc, #22d3ee)
--studio-text: #e8e6f0
--studio-text-dim: #7a7590
--studio-text-bright: #ffffff
--studio-card-radius: 14px
```

### Glassmorphism

All panels:
- `backdrop-filter: blur(16px)`
- Border: 1px semi-transparent gradient
- Hover: glow with `--studio-gradient`

### Typography

- Headings: Inter 600-700
- Body: Inter 400
- Monospace (code): JetBrains Mono
- All tracking: +0.02em for UI labels

### Transitions (Framer Motion)

- Panel crossfade: 400ms ease-out
- History card scale on select: 0.95 → 1.05 → 1
- Preview reveal: slide up + fade, 500ms
- Button hover: scale(1.02) + glow pulse

---

## Module-Specific Visual Themes

**Image (🖼️):** Floating color swatches that drift and blend. Preview card has subtle \"wet paint\" shimmer on generation. Templates: Portrait, Landscape, Square, Wallpaper, Thumbnail.

**Video (🎬):** Timeline snippets floating as particles. Preview shows loading bar with frame thumbnails. Quick edits: trim handles, speed slider.

**Music (🎵):** Floating piano keys/notes. Preview shows animated waveform/spectrogram. Presets: Lo-fi beats, Cinematic, Ambient, Upbeat.

**Voice (🗣️):** Soundwave pulses radiating. Preview shows animated equalizer bars. Voice picker shows cloned voices first, then ElevenLabs defaults.

**Code (💻):** Falling code symbols (`{ } [ ] ;`). Preview: live-render iframe for simple sites. Templates: Landing page, Dashboard, Blog, App.

**Design (🎨):** Floating geometric shapes (circle, square, triangle). Preview: artboard mockup (phone/mockup/large format). Templates: Logo, Business card, Social banner, Icon set.

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
   - ToolPalette (left, icons only, collapsible)
   - PreviewCanvas (center, responsive)
   - AdjustmentPanel (right, context-aware)
   - HistoryStrip (bottom, scrollable)
2. **StudioControls.tsx** — unified control panel that swaps based on `activeModule`
3. **StudioPreview.tsx** — large output display with modal fullscreen
4. Update `useStudio.ts` to support new state: `activeProjectId`, `showAdjustments`, `isGalleryMode`

### Phase 3: Module UX Polish

For each module, add:
- **Presets/Templates** (Image: \"product photo\", \"avatar\", \"landscape\"; Voice: \"narrator\", \"character\", \"announcer\")
- **Quick-adjust sliders** (creativity, detail level, aspect ratio)
- **Reference image upload** (already exists for image, extend to others where useful)
- **Batch generation** (generate 4 at once → user picks/remixes)
- **In-place editing** (crop, trim, adjust) — future iteration

### Phase 4: Gallery & Project Management

1. **StudioGallery.tsx** — grid view of all generations with filters (module, date, vaulted)
2. **StudioProject.tsx** — single project view with branches, versions, exports
3. **Bulk actions:** select multiple → save to vault, delete, export zip

### Phase 5: Analytics Panel (Optional, V2)

1. **StudioAnalytics.tsx** — credit usage charts, generation stats
2. Hook into existing `useCredits`, track per-module usage in DB

---

## File Reference Map

### Existing files to modify:
- `src/components/StudioView.tsx` → replace with Dashboard layout, or rename to `StudioDashboard.tsx` and make `StudioView` a thin shell
- `src/components/StudioPromptBar.tsx` → refactor into `StudioControls.tsx` (prompt + settings)
- `src/components/StudioOutput.tsx` → becomes `StudioPreview.tsx`
- `src/components/StudioHistory.tsx` → becomes `StudioHistoryStrip.tsx` (bottom bar)
- `src/components/StudioTabs.tsx` → deprecate; replace with icon palette
- `src/styles-studio.css` → expand with dashboard layout rules, new animation classes

### New files to create:
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
- `src/components/StudioToolPalette.tsx` — left icon palette
- `src/components/StudioAdjustmentPanel.tsx` — right context-aware controls

### Hooks to extend:
- `useStudio.ts` → add: `currentProject`, `projects`, `adjustments`, `toggleFullscreen`, `enterGallery`
- New `useStudioAnalytics.ts` (optional): credit consumption, gen count

---

## Success Criteria

When Studio is done, user should think:

> *"This is where my ideas become real. I can create anything visual, audio, or interactive here — fast, iterative, and beautiful."*

**Checklist:**
- [ ] First-run onboarding generates a creation in <90 seconds
- [ ] Main dashboard feels like a workspace, not a form
- [ ] Every module has its own personality but shares visual language
- [ ] History browse is instant, remix is one click
- [ ] Background animation alive but not distracting
- [ ] Credit balance always visible but not obtrusive
- [ ] Desktop-first (mobile later)

---

## Executive Summary for ZigBot / Don

**Problem:** Studio currently feels like a dashboard panel — tab-based, form-driven, underwhelming compared to Hearth/Pulse/Dreams cinematic bar.

**Goal:** Transform Studio into a **creative laboratory** — an immersive, multi-modal generative workspace where creating feels like conducting experiments in a luminous lab.

**Approach:**
1. Cinematic onboarding that generates first creation in <90s
2. Dashboard layout replacing tabs: tool palette (left) + canvas (center) + adjustments (right) + history strip (bottom)
3. Context-aware controls per module (presets, sliders, batch gen)
4. Gallery/project view for managing creations
5. Optional analytics behind menu

**No agent management** — Studio is purely for content generation. Agent management belongs in the main Conflux Home dashboard. Telemetry belongs in an analytics panel, not the primary UI.

**Existing backend commands preserved** — all Tauri commands (`studio_*`) remain unchanged. This is a frontend UX/UI transformation only.

**Visual identity:** Electric purple/cyan gradient mesh, glassmorphism panels, floating particles per module, Framer Motion transitions. Match the quality bar set by Hearth, Pulse, Dreams.
