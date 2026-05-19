# Hearth Weekly Tab — Build Spec
## The Conflux Home v0.1.x | Kitchen App (Hearth)
**Date:** 2026-05-17
**Status:** Draft → Ready for Build
**Priority:** 🔴 HIGH

---

## Concept & Vision

**"Your week, as a magazine you'd actually read."**

The Week Plan tab currently shows a functional-but-bland spreadsheet-style grid. It works for power users but has no soul. This redesign transforms it into **The Weekly Digest** — a beautiful editorial layout that makes meal planning feel intentional rather than like filling in a spreadsheet.

The difference from Home's "Tonight's Menu": Home is *today's decision*. Week Plan is the *week at a glance* — a cover story for your upcoming meals.

---

## Design Direction

**Aesthetic:** Warm editorial — like a food magazine's weekly spread. Day cards laid out like a publication. Statistics in magazine-style callouts. A feeling of "this week is going to be good."

**Hero Stats Bar:**
- Meals planned this week (count)
- Estimated cost ($)
- Nutrition highlights (e.g., "High protein 4 days")
- A "✨ Regenerate" or "🎲 Shuffle" button for the whole week

**Day Cards:**
- Each day is a card, not a table cell
- Cards show: day name + date, meal slot chips (breakfast/lunch/dinner), a small "what's cooking" summary
- Click a card → inline edit mode (picker appears)
- If no meals: elegant "What's for [day]?" prompt

**Meal Chips:**
- Emoji + name + time estimate
- Hover: full recipe card preview
- Click: opens meal detail

**Weekly Nutrition Summary (bottom):**
- Collapsible bar chart / summary
- "This week: 14 meals · $63 est. · 4 high-protein days"

---

## Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  WEEKLY DIGEST                    [stats] [shuffle] [generate]   │
│  Week of May 17                                                                
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│ │  MON 18  │ │  TUE 19  │ │  WED 20  │ │  THU 21  │              │
│ │ 🥞        │ │ 🍝        │ │ 🥗        │ │ 🍖        │              │
│ │ Lunch    │ │ Dinner   │ │ Lunch    │ │          │              │
│ │ Pasta    │ │ Chicken  │ │ Salad    │ │ + Add    │              │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                          │
│ │  FRI 22  │ │  SAT 23  │ │  SUN 24  │                          │
│ │ 🍽️        │ │ 🥞        │ │ 🍝        │                          │
│ │ Dinner   │ │ Brunch   │ │ Dinner   │                          │
│ │ Salmon   │ │ Pancakes │ │ Roast    │                          │
│ └──────────┘ └──────────┘ └──────────┘                          │
├─────────────────────────────────────────────────────────────────┤
│  🍽️ 18 meals · 💰 $63 est. · 💪 4 high-protein days             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Wireframes: Component Inventory

| Component | File | Note |
|-----------|------|------|
| `WeeklyDigest` | `WeeklyDigest.tsx` | Main container — replaces plan grid |
| `DayCard` | inline in `WeeklyDigest.tsx` | One card per day |
| `MealChip` | inline | Chip per slot within DayCard |
| `WeekSummary` | inline | Bottom stats bar |

---

## Data Shape (from existing WeeklyPlan)

```typescript
interface WeeklyPlan {
  week_start: string;
  days: DayPlan[];        // 7 days, Mon–Sun
  total_estimated_cost: number;
  meal_count: number;
}
interface DayPlan {
  day_of_week: number;   // 0=Mon … 6=Sun
  day_name: string;      // "Monday" etc.
  slots: PlanSlot[];    // breakfast, lunch, dinner, snack
}
interface PlanSlot {
  meal_slot: string;
  meal: Meal | null;
  notes: string | null;
}
```

---

## Acceptance Criteria

- [ ] Week Plan tab shows day cards instead of spreadsheet grid
- [ ] Day cards show emoji + name for each planned meal
- [ ] Empty slots show "+ Add" prompt
- [ ] Clicking a card / chip opens the meal picker inline
- [ ] Stats bar shows meal count + estimated cost
- [ ] Shuffle button calls `kitchen_shuffle_week` (stub — button visible but logs "coming soon")
- [ ] TypeScript compiles clean
- [ ] No regressions in other tabs

---

## Deferred

- Real AI shuffle: needs `kitchen_shuffle_week(member_id)` that calls LLM to regenerate the week plan
- Nutrition summary: bottom bar with protein/carb/fiber breakdown
- Weekly cost chart: bar chart visualization

---

_This spec is the source of truth. Update before changing direction._