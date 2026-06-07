# Vault Mobile Redesign — Master Plan

## Executive Summary

The current Vault mobile experience is a desktop layout squeezed onto a phone screen. The sidebar becomes a cramped horizontal scroll strip, the file grid is a shrunken desktop grid, and all interactions rely on hover states that don't exist on touch devices. This plan reimagines Vault as a **standalone mobile file browser** — the kind of app you'd download from the App Store and actually want to use.

---

## 1. THE NEW NAVIGATION MODEL

### Current (Broken)
```
┌─────────────────────────────────┐
│ [Hero Header — 80px+]           │
│ [Horizontal scroll strip]       │ ← Sidebar crammed into tabs
│ [Search Bar]                    │
│ [Toolbar: Grid|List|Timeline]   │
│ [File Grid — 2 col]            │
│ [Stats Bar]                     │
└─────────────────────────────────┘
```
**Problem:** The sidebar-as-horizontal-strip forces users to scroll tiny tabs to switch between Recent, Favorites, All, 5 file types, and N projects. It's a toolbar, not navigation.

### Proposed (Mobile-Native)
```
┌─────────────────────────────────┐
│ [Compact Title Bar — 48px]      │  ← Vault ✦ | Studio btn
│ [Active Filter Chips — 36px]    │  ← Recent | Favorites | All | Images...
│─────────────────────────────────│
│                                 │
│ [File Grid / List / Timeline]   │  ← Main content area
│                                 │
│                                 │
│─────────────────────────────────│
│ [Bottom Tab Bar — 56px]         │  ← Browse | Projects | Search | Stats
└─────────────────────────────────┘
```

### Bottom Tab Bar (4 tabs)
| Tab | Icon | Purpose |
|-----|------|---------|
| **Browse** | 📁 | Main file browser with filter chips (Recent, Favorites, All, file types) |
| **Projects** | 📂 | Project grid/list with CRUD |
| **Search** | 🔍 | Dedicated search screen with results |
| **Stats** | 📊 | Stats bar + settings (compact) |

**Why 4 tabs:** Matches iOS Files (Browse/Recents/Favorites/Search), Google Drive (Home/Starred/Spaces/Notifications). 4 is the sweet spot — enough for clear separation, few enough to be scannable.

**Positioning:** The bottom tab bar sits INSIDE the Vault view, ABOVE the ConfluxBar. The ConfluxBar is the app-level navigation; Vault's tab bar is the view-level navigation. They don't conflict because they serve different purposes.

### Filter Chips (Browse tab only)
When the Browse tab is active, a horizontal scrollable filter chip bar appears below the title:
- **Recent** (default) — Last 50 files
- **Favorites** — Starred files
- **All** — All files
- **Images** 🖼️
- **Audio** 🎵
- **Video** 🎬
- **Code** 💻
- **Documents** 📄

These replace the sidebar's "Browse" and "File Types" sections. One tap to switch, no scrolling through a cramped strip.

### Hierarchy
```
Browse Tab
├── Filter Chips (Recent / Favorites / All / type filters)
├── File Grid (cards with thumbnails)
├── File List (compact rows)
└── Timeline (date-grouped cards)

Projects Tab
├── Project Cards (grid)
│   ├── Tap → Drill into project (shows files)
│   └── Long-press → Context menu (rename, delete)
├── + New Project button (FAB or inline)
└── Empty state

Search Tab
├── Search Input (auto-focused)
├── Recent Searches (if any)
└── Results Grid

Stats Tab
├── Total files / total size / total projects
├── Storage breakdown
└── Quick actions (scan, etc.)
```

---

## 2. THE NEW FILE BROWSING EXPERIENCE

### Title Bar (replaces Hero)
**Kill the hero on mobile.** The SVG shield, glow animation, subtitle, and Studio button eat 80-100px of vertical space. On a phone, that's precious.

**Replace with:**
```
┌─────────────────────────────────────┐
│ 🛡️ Vault              [✨ Studio]  │  48px total
└─────────────────────────────────────┘
```
- Left: Shield icon (20px) + "Vault" title (16px, bold, gradient text)
- Right: Studio button (compact, same style)
- Background: Subtle radial gradient (the glow lives on, just smaller)
- **Scrolls away** — as user scrolls down, the title bar collapses or sticks at top

### File Grid (Browse tab main content)
**2-column card grid with larger thumbnails.** The current grid is fine conceptually but the cards need to be touch-optimized:

- **Thumbnail area:** `aspect-ratio: 4/3` (taller than current 16/10) — more visual real estate
- **Card gap:** 10px (current: 10px — keep it)
- **Touch target:** Entire card is tappable (min 44px height)
- **Favorite star:** Always visible on mobile (opacity: 0.7, not hidden until hover)
- **Type badge:** Keep (top-left, small)
- **File name:** 13px, single line ellipsis
- **Meta:** Size + agent badge, 10px

### File List View
Keep the current approach but ensure 44px row height. Hide Modified + Agent columns on mobile (already done in §139). Add swipe-to-reveal actions? (Future enhancement — not in this pass.)

### Timeline View
Keep as-is with tighter spacing. Works well for chronological browsing.

---

## 3. THE NEW INTERACTION MODEL

### Current (Desktop UX on mobile)
- **Click** = select (toggle checkbox)
- **Double-click** = open in OS
- **Hover** = show favorite star, download button
- **Selection bar** appears with bulk actions

### Proposed (Touch-native)
- **Tap** = open/preview file (primary action)
- **Long-press** = context menu (secondary actions)
- **Long-press + tap others** = multi-select mode
- **Favorite star** = always visible, tap to toggle

### Long-Press Context Menu
When user long-presses a file card, show a bottom sheet context menu:

```
┌─────────────────────────────────────┐
│ filename.png                        │
│ 2.4 MB · Image · 2 hours ago       │
│─────────────────────────────────────│
│ ⭐ Favorite                        │
│ 📂 Move to Project                 │
│ ⬇️ Download                        │
│ 🔗 Open in OS                      │
│ 🗑️ Delete                          │
│─────────────────────────────────────│
│ ✕ Cancel                           │
└─────────────────────────────────────┘
```

This is the iOS Files / Google Drive pattern. One gesture reveals all actions. No hover required.

### Multi-Select Mode
1. Long-press one file → enters multi-select mode
2. Selected file gets checkmark overlay
3. Tap other files to add to selection
4. Action bar appears at bottom: Move to Project | Delete | Cancel
5. Tap "Cancel" or empty area to exit multi-select

### Implementation
- Add `onLongPress` handler to `VaultFileCard` using `touchstart`/`touchend` timers (500ms)
- Create new `VaultContextMenu` component (bottom sheet)
- Add `multiSelectMode` state to `VaultView`
- The existing `selectedIds` + `vault-selection-bar` can be repurposed for multi-select mode

---

## 4. THE NEW PROJECT EXPERIENCE

### Projects Tab
When user taps the Projects tab:

```
┌─────────────────────────────────────┐
│ Projects                    [+ New] │
│─────────────────────────────────────│
│ ┌─────────────┐ ┌─────────────┐    │
│ │ 📂 Project1 │ │ 📂 Project2 │    │
│ │ 12 files    │ │ 5 files     │    │
│ │ 24.3 MB     │ │ 8.1 MB      │    │
│ └─────────────┘ └─────────────┘    │
│ ┌─────────────┐ ┌─────────────┐    │
│ │ 📂 Project3 │ │ 📂 Project4 │    │
│ │ 3 files     │ │ 28 files    │    │
│ │ 1.2 MB      │ │ 56.7 MB     │    │
│ └─────────────┘ └─────────────┘    │
└─────────────────────────────────────┘
```

- 2-column grid of project cards
- Each card shows: icon, name, file count, total size
- **Tap** → Drill into project (shows files in that project, replaces the grid)
- **Long-press** → Context menu (rename, delete)
- **+ New** button in header (opens InputModal)
- **Back button** when drilled into a project

### Drill-Down Navigation
When user taps a project:
- Title bar changes to show project name + back arrow
- Filter chips disappear (not relevant inside a project)
- File grid shows only project files
- "Back" returns to project list

This is the iOS Files / Google Drive folder drill-down pattern.

---

## 5. WHAT TO KEEP VS WHAT TO KILL (§133–145)

### KEEP
| Section | Rule | Reason |
|---------|------|--------|
| §133 | `.vault-container` padding, overflow, flex-direction | Base container rules are solid |
| §134 | `.vault-studio-btn` compact sizing | Studio button moves to title bar |
| §135 | `.vault-body` flex-direction: column | Still stacks vertically |
| §136 | `.vault-tag-cloud` horizontal scroll | Tags still scroll horizontally |
| §137 | `.vault-main` sizing | Still needed |
| §137 | `.vault-toolbar` flex-wrap | Toolbar still exists in Browse tab |
| §138 | `.vault-content-area` padding | Still needed |
| §138 | `.vault-grid` 2-column | Keep, but increase thumbnail aspect ratio |
| §138 | `.vault-file-card` compact | Keep, add touch targets |
| §138 | `.vault-file-favorite` always visible | Already done |
| §139 | `.vault-list-view` hidden columns | Still needed |
| §140 | `.vault-timeline` tighter | Still needed |
| §142 | `.vault-modal` responsive | Still needed |
| §143 | `.vault-stats-bar` wrap | Moves to Stats tab |
| §144 | `.vault-empty` compact | Still needed |
| §145 | `.vault-modal-input` 16px | Still needed |

### KILL
1. **§136 (sidebar horizontal tabs)** — `.vault-sidebar`, `.vault-folder-tree`, `.vault-project-list` horizontal rules. Replace with bottom tab bar + filter chips.
2. **§134 (hero rules)** — `.vault-hero`, `.vault-hero-glow`, `.vault-hero-icon`, `.vault-hero-title`, `.vault-hero-sub`, `.vault-hero-content`. Replace with compact title bar.
3. **§137 (search bar rules)** — `.vault-search-bar`, `.vault-search-input`, `.vault-search-icon`. Search moves to dedicated tab.

### ADD (new)
1. Vault bottom tab bar styles
2. Vault title bar styles
3. Vault filter chips bar styles
4. Vault context menu (bottom sheet) styles
5. Vault project cards grid styles
6. Vault search screen styles
7. Touch interaction handler styles

---

## 6. CSS CHANGES — Specific Rules

### File: `src/styles-mobile-layout.css`

#### A. Remove §136 (lines ~8354–8490)
The entire block that makes `.vault-sidebar` horizontal. This includes:
- `.vault-sidebar` → horizontal scroll, flex-direction: row
- `.vault-sidebar-section` → flex-shrink: 0
- `.vault-sidebar-title` → display: none
- `.vault-folder-tree` → display: flex, gap
- `.vault-folder-item` → horizontal tabs style
- `.vault-project-list` → display: flex
- `.vault-project-item` → horizontal tabs style
- `.vault-new-project-btn` → compact in row
- `.vault-tag-cloud` → keep (but move out of §136)

#### B. Replace §134 hero rules
Replace with title bar rules (`.vault-title-bar`, `.vault-title-bar-left`, `.vault-title-bar-icon`, `.vault-title-bar-text`).

#### C. Add new sections after §145

**§146. VAULT BOTTOM TAB BAR**
```css
.vault-bottom-tabs { ... }
.vault-tab-btn { ... }
.vault-tab-btn.active { ... }
.vault-tab-icon { ... }
.vault-tab-label { ... }
```

**§147. VAULT FILTER CHIPS BAR**
```css
.vault-filter-bar { ... }
.vault-filter-chip { ... }
.vault-filter-chip.active { ... }
```

**§148. VAULT CONTEXT MENU (bottom sheet)**
```css
.vault-context-overlay { ... }
.vault-context-menu { ... }
.vault-context-header { ... }
.vault-context-action { ... }
.vault-context-cancel { ... }
```

**§149. VAULT PROJECT CARDS GRID**
```css
.vault-projects-grid-mobile { ... }
.vault-project-card-mobile { ... }
```

**§150. VAULT SEARCH SCREEN**
```css
.vault-search-screen { ... }
.vault-search-screen-input { ... }
.vault-search-results { ... }
```

**§151. VAULT MOBILE CONTAINER UPDATES**
```css
.vault-container { /* updated */ }
.vault-view-mobile { ... }
.vault-content-wrapper { ... }
```

### Specificity Strategy
All new rules use `!important` (matching the codebase pattern) and target `.immersive-content > .vault-container` children where needed to win the specificity war against §27/§27b.

---

## 7. COMPONENT CHANGES

### A. `VaultView.tsx` — Major refactor

**New state:**
```tsx
const [activeTab, setActiveTab] = useState<'browse' | 'projects' | 'search' | 'stats'>('browse');
const [contextMenu, setContextMenu] = useState<{ file: VaultFile } | null>(null);
const [multiSelectMode, setMultiSelectMode] = useState(false);
const [drilledProject, setDrilledProject] = useState<VaultProject | null>(null);
```

**Mobile render structure:**
- Title bar (replaces hero)
- Content wrapper (switches based on activeTab)
  - Browse: filter chips + file grid/list/timeline
  - Projects: project grid or drilled-in file grid
  - Search: search input + results
  - Stats: stats view
- Bottom tab bar
- Context menu overlay (when active)

**Desktop:** Keep existing layout unchanged. Use CSS media queries or `window.matchMedia` to switch.

### B. `VaultFileCard.tsx` — Add touch interactions

**New props:**
```tsx
onLongPress?: () => void;
onTap?: () => void;
```

**New handlers:**
- `handleTouchStart` — Start 500ms long-press timer
- `handleTouchEnd` — Clear timer, call onTap if not long-press
- `handleTouchMove` — Cancel long-press if finger moves >10px
- `onContextMenu` — `preventDefault()` to block browser menu

### C. `VaultSidebar.tsx` — Hide on mobile

On mobile, render `null` (or a minimal version). The sidebar's functionality is replaced by bottom tabs + filter chips. Desktop layout unchanged.

### D. `VaultSearchBar.tsx` — Adapt for search screen

On mobile (search screen), auto-focus input. Hide the inline search bar in the toolbar on mobile.

### E. `VaultToolbar.tsx` — Simplify on mobile

Show only view mode toggle (grid/list/timeline). Hide "New Project" button (it's in the Projects tab header).

### F. New: `VaultContextMenu.tsx` — Bottom sheet component

```tsx
interface Props {
  file: VaultFile;
  onClose: () => void;
  onFavorite: () => void;
  onMoveToProject: () => void;
  onDownload: () => void;
  onOpen: () => void;
  onDelete: () => void;
}
```

Renders a bottom sheet with file info header + action buttons + cancel.

---

## 8. IMPLEMENTATION ORDER

### Phase 1: CSS Foundation
1. Add new CSS rules (§146–151) to `styles-mobile-layout.css`
2. Remove/rewrite §134, §136, §137 rules
3. Update §133 container rules

### Phase 2: Component Refactor
1. Add mobile state to `VaultView.tsx` (activeTab, contextMenu, etc.)
2. Create mobile render path (title bar + content + bottom tabs)
3. Hide sidebar on mobile
4. Create filter chips inline component
5. Create project grid inline component
6. Create search screen inline component

### Phase 3: Touch Interactions
1. Add long-press to `VaultFileCard.tsx`
2. Create `VaultContextMenu.tsx`
3. Implement multi-select mode
4. Wire tap-to-open

### Phase 4: Polish
1. Animations (tab switch, context menu slide-up, card stagger)
2. Empty states per tab
3. Loading states
4. Back button for project drill-down
5. Test on mobile

---

## 9. RISK ASSESSMENT

| Risk | Mitigation |
|------|------------|
| Bottom tab bar conflicts with ConfluxBar | Vault tabs are INSIDE vault view, ConfluxBar is outside. Different z-index layers. |
| Specificity wars with §27/§27b | Use `.immersive-content > .vault-container` specificity. New rules come AFTER §27b in source order. |
| Desktop layout breaks | All new rules inside `@media (max-width: 768px)`. Desktop is NEVER touched. |
| Long-press conflicts with browser context menu | `preventDefault()` on `contextmenu` event. Use touch events, not mouse events. |
| iOS zoom on input focus | All inputs use `font-size: 16px` (codebase pattern). |
| Performance (many files) | Existing lazy loading on images. Consider windowed list for 100+ files if needed. |

---

## 10. DESIGN TOKENS — Vault's World

Vault is **dark, encrypted, Obsidian glassmorphism.** Every design decision must honor this:

- **Background:** Deep space black (#080c14) with purple/blue radial gradients
- **Surface:** Frosted glass (rgba(20, 15, 35, 0.8) with backdrop-filter: blur)
- **Accent:** Violet (#8b5cf6) with glow effects
- **Text:** Off-white (#e2e0ea), dim (#8a8694), bright (#ffffff)
- **Borders:** Subtle purple (rgba(128, 90, 213, 0.15))
- **Animations:** Breathe, fade-in, slide-up — nothing gratuitous
- **Vibe:** Encrypted vault, not a file manager. Dark, moody, powerful.

The bottom tab bar should feel like it belongs in this world — dark glass with purple accent indicators, not a generic iOS tab bar.

---

## Summary of Changes

| File | Type of Change |
|------|---------------|
| `src/styles-mobile-layout.css` | Remove §136, rewrite §134, add §146–151 |
| `src/styles-vault.css` | May need mobile additions (title bar, bottom tabs base styles) |
| `src/components/VaultView.tsx` | Major refactor — mobile layout with bottom tabs, filter chips, project grid, search screen |
| `src/components/VaultFileCard.tsx` | Add touch handlers (long-press, tap) |
| `src/components/VaultSidebar.tsx` | Hide on mobile (render null) |
| `src/components/VaultSearchBar.tsx` | Minor — auto-focus on mobile search screen |
| `src/components/VaultToolbar.tsx` | Simplify on mobile (view toggle only) |
| `src/components/VaultContextMenu.tsx` | **NEW** — Bottom sheet context menu |
