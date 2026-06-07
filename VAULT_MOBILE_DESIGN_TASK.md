# TASK: Deep Mobile Design Pass — Vault (File Browser)

## The Question

If you downloaded "Vault" from the App Store — a standalone file browser with project organization, search, favorites, tags, and multi-view layouts — would the current mobile experience be acceptable?

**Answer: No.** The sidebar is crammed into a horizontal scroll strip. The grid is a shrunken desktop layout. Navigation between sections feels like scrolling through a toolbar, not browsing a file system. It works, but it doesn't feel like a *mobile app*.

## The Mission

Reimagine Vault as a **standalone mobile application**. Not "a desktop app squeezed onto a phone screen." A real mobile file browser that happens to be powered by Conflux.

---

## STEP 1: Read Everything

Start with these files:

1. `MASTER_INSPIRATION_PROMPT.md` — The design philosophy. Every app is its own world. Read it.
2. `src/components/VaultView.tsx` — Main view. The hero, sidebar, main area, modals, all of it.
3. `src/components/VaultSidebar.tsx` — Sidebar with Browse (Recent/Favorites/All), File Types (5 categories), Projects (list + CRUD), Tags.
4. `src/components/VaultFileCard.tsx` — File card with thumbnail, type badge, favorite, name, size, agent indicator, download.
5. `src/components/VaultToolbar.tsx` — View mode toggle (grid/list/timeline), create project button.
6. `src/components/VaultSearchBar.tsx` — Search input.
7. `src/styles-vault.css` — The base design system (Obsidian Glassmorphism).
8. `src/styles-mobile-layout.css` — §133–145 (existing mobile rules for Vault). Also §27/27b for the global padding override rules.
9. `MOBILE_DESIGN_CHECKLIST.md` — The Vault section for current state.

---

## STEP 2: Inventory Everything Vault Does

Map every feature, every interaction, every screen:

### Navigation / Browsing
- **Browse sections:** Recent (last 50), Favorites, All Files
- **File type filters:** Images, Audio, Video, Code, Documents
- **Projects:** User-created folders. Rename, delete, move files between projects. File count per project.
- **Tags:** Color-coded tag cloud. Filter by tag.

### File Display
- **Grid view:** Cards with thumbnail, type badge, favorite star, name, size, agent badge, download button. Double-click to open in OS.
- **List view:** Table with checkbox, icon, type, name, size, modified, agent. Hidden columns on mobile.
- **Timeline view:** Grouped by date, horizontal scroll of cards per date group.

### File Actions
- Select/deselect files (checkbox on card)
- Toggle favorite
- Delete (single + bulk)
- Download / Save As
- Open in OS (double-click)
- Move to project (bulk — opens project picker modal)

### Search
- Full-text search across file names
- Results replace current view

### Modals
- Project picker (for move-to-project)
- Input modal (create project, rename project)
- File preview (if implemented)

### Stats Bar
- Total files, total size, total projects

### Hero Header
- Vault icon with glow animation, title, subtitle, Studio button

---

## STEP 3: Research Mobile File Browsers

Look at how real mobile apps handle file browsing:

- **iOS Files app** — Sidebar becomes a tab bar or drill-down navigation. Bottom tab bar for Browse/Recents/Favorites/Search.
- **Google Drive** — Bottom tab bar (Home, Starred, Spaces, Notifications). Hamburger menu for folders.
- **Dropbox** — Bottom tab bar (Home, Files, Create, Notifications). Grid/list toggle in toolbar.
- **Notion** — Bottom tab bar. Sidebar is a slide-out drawer, not always visible.
- **Obsidian Mobile** — Sidebar is a bottom sheet or hamburger. File explorer is a separate view.
- **Spotify** — Library section uses a filter bar at top (Playlists, Artists, Albums) + bottom nav. No sidebar.

**Key patterns:**
1. **Bottom tab bar** for top-level navigation (never a sidebar)
2. **Filter chips or segmented controls** for sub-categories
3. **Search is a dedicated screen** or top-level action
4. **FAB or bottom sheet** for create/add actions
5. **Pull-to-refresh** for content updates
6. **Long-press context menus** for file actions (not hover)

---

## STEP 4: Design the Mobile Vault

### What Needs to Change

**Sidebar → Bottom tab bar or filter system:**
The current approach (sidebar → horizontal scroll strip) is wrong. On mobile, you don't browse files by scrolling a tiny tab strip. You use a bottom nav or a filter system.

Proposal: Replace the sidebar with a **bottom navigation pattern** or a **top filter bar + segmented control**. The user should be able to switch between Browse, Projects, and Search with one tap — not by scrolling a horizontal strip.

**File grid → Mobile-native card layout:**
The current 2-column grid is a shrunken desktop grid. On mobile, consider:
- A single-column list with large touch targets (like iOS Files)
- A 2-column masonry-style grid with larger thumbnails
- A card-based layout where each file is a rich card (not a tiny square)

**File actions → Long-press context menu:**
Hover doesn't exist on mobile. The current "click to select, then use the action bar" pattern is clunky. On mobile:
- **Tap** = open/preview
- **Long-press** = context menu (favorite, delete, move, download, share)
- **Multi-select** = long-press one, then tap others (like iOS Photos)

**Search → Prominent, always accessible:**
Search should be a bottom tab or a persistent top bar, not buried in the toolbar.

**Projects → Dedicated view:**
Projects are the "folders" of Vault. On mobile, they deserve their own screen — not a sidebar list item. Show project cards with file counts, thumbnails, and quick actions.

**Hero header → Compact or removable:**
The hero header (glow animation, SVG icon, title, subtitle) takes up valuable vertical space on mobile. Consider:
- A compact header that scrolls away
- Remove the hero entirely on mobile — use a simple title bar
- Keep the glow as a subtle background effect, not a layout element

---

## STEP 5: Plan of Attack

Come back with:

1. **The new navigation model** — How does the user move between sections on mobile? Bottom tabs? Top filters? Drill-down? Show the hierarchy.

2. **The new file browsing experience** — What does the main screen look like? How are files displayed? How do you interact with them?

3. **The new interaction model** — How do you select, open, favorite, delete, move files? What's tap vs long-press vs swipe?

4. **The new project experience** — How do projects work on mobile? Is it a separate tab? A drill-down view?

5. **What to keep vs what to kill** — Which existing mobile rules (§133–145) are still valid? Which need to be rewritten? Which should be deleted?

6. **CSS changes needed** — Specific rules to add/modify/remove in `styles-mobile-layout.css`. Use `.immersive-content > .vault-container` specificity for any padding overrides (lesson from 2026-06-06).

7. **Component changes needed** — Any JSX refactors needed? Inline styles to classNames?

---

## Lessons from Previous Mobile Passes (CRITICAL)

- **Specificity wins.** `.immersive-content > div` beats single-class selectors. Your app-specific rules MUST use `.immersive-content > .vault-container` (or `.immersive-content > .vault-main`, etc.) to win the specificity war.
- **Don't overcomplicate.** Don said "It's more simple than you think." If something doesn't work from CSS, it's almost always a specificity issue. Test with `background: red !important` to verify rules are applying.
- **Test with DevTools.** The computed style panel is the source of truth. If `padding-bottom: 0px` is computed, something is overriding your rule.
- **`styles-mobile-layout.css` is imported in `App.tsx`.** App-specific CSS (`styles-vault.css`) is imported in component files. Both use `!important`. Specificity is the tiebreaker.
- **The 2026-06-06 padding fix (§27b):** All 15 app wrappers now get `padding-top: 16px` + `padding-bottom: 150px` via `.immersive-content > .app-class` selectors. Don't fight this — work with it.
- **Each app is its own world.** Vault should feel like Vault — dark, encrypted, Obsidian glassmorphism. Don't genericize it. Make it the best file browser on any platform.
- **Mobile ≠ small desktop.** A sidebar on desktop does NOT become a horizontal scroll strip on mobile. It becomes a different navigation pattern entirely.

---

## Files You'll Edit

- `src/styles-mobile-layout.css` — §133–145 (rewrite the Vault mobile section)
- `src/styles-vault.css` — Base design system (may need mobile-specific additions)
- `src/components/VaultView.tsx` — Main view (may need className refactors)
- `src/components/VaultSidebar.tsx` — Sidebar (may need mobile-specific rendering)
- `src/components/VaultFileCard.tsx` — File card (may need touch interaction changes)
- `src/components/VaultToolbar.tsx` — Toolbar (may need mobile layout changes)

## Deliverable

Come back with:
1. **The new mobile navigation model** (wireframe / hierarchy diagram)
2. **Specific CSS changes** to write in `styles-mobile-layout.css`
3. **Specific component changes** (if any)
4. **What to keep / kill** from existing §133–145

Then we execute.
