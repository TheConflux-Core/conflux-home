# Hearth Inventory Tab — Build Spec
## The Conflux Home v0.1.x | Kitchen App (Hearth)
**Date:** 2026-05-17
**Status:** Draft → Ready for Build
**Priority:** 🔴 HIGH — "best tab so far"

---

## Concept & Vision

**"Your kitchen, x-rayed."**

This is the tab that shows what's actually in your home — not a list, but a *living visualization* of your fridge, freezer, and pantry. Items breathe. Expiring ingredients pulse with urgency. The AI quietly watches your inventory and surfaces: "Chicken breast expiring in 3 days — here's what you can make."

The Home tab answers: *"What should I cook tonight?"*
This tab answers: *"What do I have, what's urgent, and what can I make?"*

This is Hearth's intelligence layer at its most visible.

---

## Design Direction

**Aesthetic: Cold-storage intelligence** — deep blues and steel grays for fridge/freezer, warm amber for pantry. A feeling of looking into a well-organized kitchen from the outside in. Think: a premium smart fridge interface crossed with a mission control dashboard.

**Core metaphor:** The fridge/freezer/pantry as a living system — not a static list.

**Visual hooks:**
1. **Location Cards** (Fridge / Freezer / Pantry) — each with its own color personality and ambient "breathing" animation
2. **Expiry urgency** — items expiring ≤3 days get a pulsing red dot + "USE SOON" badge
3. **Item freshness bars** — horizontal progress bars (green → amber → red) per item
4. **Intelligence layer** — at the bottom, an AI "Kitchen Intel" card that shows matching meal suggestions based on what's in your inventory
5. **Add item** — prominent, warm, always accessible

**Stats bar (top):**
- Total items | Fresh (>7d) | Expiring (≤3d) | Expired
- A visual "health score" for the whole kitchen

---

## Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  YOUR KITCHEN                    [summary stats bar]            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  🧊 FRIDGE  │  │  ❄️ FREEZER  │  │  🏠 PANTRY  │              │
│  │  12 items  │  │   6 items   │  │  18 items  │              │
│  │            │  │            │  │            │              │
│  │  [items    │  │  [items    │  │  [items    │              │
│  │   with      │  │   with      │  │   with      │              │
│  │   freshness │  │   freshness │  │   freshness │              │
│  │   bars]     │  │   bars]     │  │   bars]     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  KITCHEN INTEL                                                  │
│  "🧊 Chicken expiring in 3 days — 2 recipes match"            │
│  [ View Recipes ]                                               │
│                                                                 │
│  [ + Add Item to Inventory ]                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Inventory

| Component | File | Note |
|-----------|------|------|
| `KitchenInventory` | `KitchenInventory.tsx` | New — replaces `InventoryHeatmap` usage in KitchenView |
| `LocationCard` | inline in `KitchenInventory.tsx` | Fridge / Freezer / Pantry card |
| `InventoryItem` | inline | Single item row with freshness bar |
| `KitchenIntel` | inline | AI suggestions from inventory (bottom section) |
| `AddInventoryModal` | existing `showAddPantryItem` state | Already exists in KitchenView |

---

## Data

The existing `kitchen_get_inventory` Rust command returns `KitchenInventoryItem[]` with:
- `name`, `quantity`, `unit`, `category`
- `expiry_date` (YYYY-MM-DD)
- `location` ('fridge' | 'freezer' | 'pantry')
- `freshness` (computed client-side as `days_until_expiry / 30`)

**Rust command to add:** `kitchen_inventory_suggestions(member_id)` → returns meals from the library whose ingredients match items in inventory. First pass: simple keyword match on ingredient names vs inventory names. Second pass (deferred): LLM-powered semantic matching.

---

## Acceptance Criteria

- [ ] 3 location cards (Fridge / Freezer / Pantry) with distinct color themes
- [ ] Each card shows items with freshness bars (green/amber/red)
- [ ] Items expiring ≤3 days get a pulsing "USE SOON" indicator
- [ ] Stats bar at top shows total / fresh / expiring / expired counts
- [ ] "Kitchen Intel" section at bottom with AI suggestion ("2 recipes use chicken")
- [ ] Add Item button opens existing modal
- [ ] Responsive: 3-col → 1-col on mobile
- [ ] TypeScript compiles clean

---

## Deferred

- Real `kitchen_inventory_suggestions` with LLM matching
- Photo capture for barcodes / receipt scanning
- "Restock" quick action
- Drag-to-reorder within locations

---

_This spec is the source of truth. Update before changing direction._