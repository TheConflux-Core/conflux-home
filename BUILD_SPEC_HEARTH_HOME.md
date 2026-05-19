# Hearth Home Screen — Build Spec
## The Conflux Home v0.1.x | Kitchen App (Hearth)
**Date:** 2026-05-17
**Status:** Draft — Ready for Build
**Priority:** 🔴 HIGH

---

## Context

The Kitchen/Hearth app currently shows a dead "Chef's Specials" section on the home tab. The `kitchen_home_menu` Rust command is a stub that returns the first 5 meals with static fake data. Clicking items works but has no real intelligence behind it.

Three redesign decisions were made in collaboration with Don:

1. **Home tab → "Tonight's Menu" Hero (Option A)** — Intelligent meal recommendations based on pantry + nutritional goals
2. **Inventory tab → "What's In Your Kitchen?" Intelligence View (Option B)** — Fridge/pantry visualization with AI nudges
3. **Week Plan tab → "The Weekly Digest" Magazine (Option C)** — Beautiful weekly digest / magazine cover for meals

This spec covers **Home tab only** — the other two are separate specs.

---

## Build Spec: Home Tab — "Tonight's Menu" Hero

### 1. Concept & Vision

**"Your kitchen knows what's for dinner."**

The moment you open Hearth, it shows you what to cook tonight — not a list, but a *decision* made by an AI that's been watching your pantry, your preferences, and your week. Warm, cinematic, appetizing. The kind of screen that makes you want to cook.

This is the **intelligence layer made visible.**

---

### 2. Design Language

**Aesthetic:** Warm amber / copper / hearth-fire glow. Like opening a farmhouse kitchen at golden hour. Deep dark backgrounds with warm light emanating from the food. Steam rising. The feeling of "something good is happening here."

**Color Palette (extend existing Hearth tokens):**
- Background: `#1C1917` (existing)
- Card surface: `#292524` (existing)
- **Hero warm glow:** `#F59E0B` → `#FCD34D` radial gradient
- **Primary accent:** `#F59E0B` (amber-500)
- **Secondary accent:** `#EF4444` (urgent/expiring red)
- **Success/expiring-soon:** `#22C55E`
- Text: `#FEF3C7` (existing)

**Typography:**
- Headings: "Playfair Display" (Google Font) — elegant, editorial
- Body/UI: "DM Sans" (Google Font) — clean, warm sans
- Monospace accents (times, temps): "JetBrains Mono"

**Motion Philosophy:**
- Hero card entrance: scale from 0.95 → 1.0 + fade in, 500ms ease-out
- Staggered children: 80ms delay between items
- Hover: gentle lift (translateY -4px) + shadow deepen
- Steam animation: subtle CSS float upward, looped, 3s
- "Chef's Specials" items: slide in from right with stagger

---

### 3. Layout

```
┌─────────────────────────────────────────────────────────────┐
│  🔥 Hearth                              [6 tabs]            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ╔═══════════════════════════════════════════════════════╗  │
│  ║          TONIGHT'S MENU  (hero section)                ║  │
│  ║                                                        ║  │
│  ║   🥘 [AI hero meal — large card with photo/emoji]      ║  │
│  ║                                                        ║  │
│  ║   "Suggested for you tonight"                          ║  │
│  ║   [Meal Name] · 35min · 2 servings                    ║  │
│  ║   Uses: chicken, lemon, garlic                        ║  │
│  ║                                                        ║  │
│  ║   [ 🍳 Start Cooking ]   [ ↻ Swap ]                   ║  │
│  ╚═══════════════════════════════════════════════════════╝  │
│                                                             │
│  ── Chef's Specials ──────────────────────────────────    │
│  [Card] [Card] [Card] [Card]  (horizontal scroll on mobile)  │
│                                                             │
│  ── Your Regulars ──────────────────────────────────────    │
│  [Starred meal chips, horizontal scroll]                     │
│                                                             │
│  ── Kitchen Intel ──────────────────────────────────────    │
│  "🧊 Chicken expiring in 3 days"  nudge card               │
│  "📊 You hit 73% of your weekly protein goal"               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Sections (top → bottom):**
1. **Hero: Tonight's Menu** — AI decision, large card, primary CTA
2. **Chef's Specials** — Horizontally scrollable cards, genuinely intelligent
3. **Your Regulars** — Starred favorites, quick re-order
4. **Kitchen Intel** — Nudge cards (expiring, goal progress, insights)

---

### 4. Hero: Tonight's Menu

**Rust command (`kitchen_home_menu` → rebuild as `kitchen_tonights_menu`):**

Input:
- User ID
- (Optional) constraints: exclude already-planned meals for today

Logic:
1. Fetch inventory items with expiry dates near today (±3 days)
2. Fetch favorites / frequently cooked meals
3. Fetch user's nutritional goals (protein, calories, etc.)
4. Score all meals against: (a) uses expiring ingredients, (b) aligns with nutrition goals, (c) not already planned for today
5. Return top recommendation + reasoning

Output (Rust struct):
```rust
struct TonightMeal {
    meal_id: String,
    name: String,
    emoji: String,
    photo_url: Option<String>,
    reason: String,          // "Uses the chicken expiring Thursday"
    prep_time_min: i32,
    cook_time_min: i32,
    servings: i32,
    nutrition_tags: Vec<String>,
    uses_expiring: Vec<String>,   // ["chicken", "lemon"]
    confidence: f32,          // 0.0-1.0, for "how sure we are"
}
```

**Frontend (React):**
- Fetches `kitchen_tonights_menu` on mount
- Shows skeleton loader while loading
- Shows empty state if no meals in library yet
- "Swap" button calls again with a shuffle hint
- "Start Cooking" opens CookingModeEnhanced with the meal_id

---

### 5. Chef's Specials (Rebuilt)

**Rust command:** `kitchen_chefs_specials(member_id, limit)`

Logic:
1. Score all meals by: freshness score of matching inventory + favorited + nutrition alignment
2. Return top 5 that are NOT tonight's top recommendation
3. Each item includes real `reason` ("High protein, uses pantry chicken")

**Frontend:**
- Reuses `RestaurantMenu` component but with real data
- Horizontal scroll on mobile, grid on desktop
- Each card shows: emoji/photo, name, time, reason on hover/tap
- Click → opens meal detail

---

### 6. Your Regulars

- Fetch starred/favorite meals
- Display as horizontal chip scroll
- Click → meal detail
- If none: hide section entirely

---

### 7. Kitchen Intel (Nudges)

Reuses existing `KitchenNudges` but:
- Show top 2-3 nudges only on home (not full list)
- New nudge type: `expiring_ingredient` with ingredient name + days remaining
- Links: nudge → opens relevant tab

---

### 8. Component Inventory

| Component | File | New/Modified |
|-----------|------|-------------|
| `TonightHero` | `components/TonightHero.tsx` | NEW |
| `RestaurantMenu` | `components/RestaurantMenu.tsx` | MODIFIED (real data) |
| `ChefSpecials` | `components/ChefSpecials.tsx` | EXTRACTED/NEW |
| `YourRegulars` | `components/YourRegulars.tsx` | NEW |
| `KitchenIntel` | `components/KitchenNudges.tsx` | MODIFIED (home variant) |

---

### 9. Rust Commands Required

| Command | File | Notes |
|---------|------|-------|
| `kitchen_tonights_menu` | `commands.rs` | New — replaces `kitchen_home_menu` stub |
| `kitchen_chefs_specials` | `commands.rs` | New — real intelligence |
| `kitchen_get_inventory_with_expiry` | `commands.rs` | Extend existing — include expiry near today |

---

### 10. Acceptance Criteria

- [ ] Home tab shows a real AI recommendation for "tonight" within 2s of load
- [ ] Recommendation shows a reason ("Uses chicken expiring in 3 days")
- [ ] "Start Cooking" opens CookingModeEnhanced
- [ ] "Swap" loads a different recommendation
- [ ] Chef's Specials shows meals with real reasons (not "Ready to cook")
- [ ] No onClick does nothing — every interactive element responds
- [ ] All animations intentional, no jank
- [ ] TypeScript compiles clean
- [ ] Rust `cargo check` passes

---

## Specs for Other Tabs (Deferred)

### Option B — Inventory Tab ("What's In Your Kitchen?")
See separate spec. Fridge/pantry visualization, ingredient-level expiry tracking, dish suggestions from inventory.

### Option C — Week Plan Tab ("The Weekly Digest")
See separate spec. Magazine-style weekly overview, day cards, estimated cost, nutrition summary, quick-swap.

---

_This spec is the source of truth. Update before changing direction._