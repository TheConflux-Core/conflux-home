# Nightly Discovery Pipeline — Specification

**Author:** ZigBot  
**Date:** 2026-03-21  
**Status:** Draft — Awaiting Don's approval  

---

## Overview

The prompt pack factory is a proven, autonomous business that runs during the day.  
We now need a second autonomous pipeline — the **Discovery Pipeline** — that finds entirely new business opportunities and feeds them into the mission system.

**Schedule:** Late night, 11:00 PM MST (after the prompt factory finishes its daily cycle)  
**Runs in a single cron chain:** Helix → Vector → Prism → Announce  

Additionally, **Catalyst** gets its own lighter driver cron for ongoing system monitoring.

---

## Part 1: Nightly Discovery Pipeline (11 PM MST)

### Cron Block

```
Single sequential chain, one cron job:
  11:00 PM MST — Helix (research + score)
       ↓
  Vector (approve/reject)
       ↓
  Prism (create missions)
       ↓
  Announce results to #mission-control
```

**Why sequential:** Each step depends on the previous one's canonical output.  
**Why single cron:** Avoids race conditions, orphaned state, or one step running without the others.  
**Timeout:** 30 minutes total (research is the bottleneck)  
**Model override:** Use `research` model for Helix (deep research needs stronger reasoning)

---

### Step 1: Helix — Deep Discovery & Scoring

**Philosophy:**  
Helix is not a category scanner. It's a gold-finding engine.  
Start with demand signals, pain points, emerging trends, and unsolved problems.  
Follow the evidence wherever it leads. The output format (SaaS, digital product, marketplace, service, API, etc.) is determined by the opportunity — not pre-decided.

**What Helix does:**
1. Read `shared/studio/studio_state.json` and `shared/portfolio/portfolio.json` to understand what we're already in (skip covered markets)
2. **Scan for signals, not categories:**
   - Search trending complaints in forums (Reddit, Hacker News, niche communities, Facebook groups)
   - Look for "I wish there was a tool that..." or "Why doesn't anyone solve X?" patterns
   - Scan emerging search trends — what's growing fast with low competition?
   - Look at underserved niches — industries where incumbents are lazy, overpriced, or ignoring small players
   - Check what successful micro-businesses are cobbling together manually (spreadsheets, duct tape solutions)
   - Look for regulatory changes creating new needs
   - Find markets where AI can 10x an existing workflow that's currently manual
3. **Go deep, not wide:** For each promising signal, research until you either:
   - Find a real, fundable opportunity (write it up) — OR
   - Prove it's not viable (discard and move on)
   - Don't spread thin across 10 shallow guesses. Find 3-5 real ones.
4. For each viable opportunity, produce a record with:
   - **Problem statement** — what specific pain exists, with evidence
   - **Audience** — who has this pain, how big is the segment, what do they pay today
   - **Solution concept** — what we'd build, in whatever format makes sense (SaaS, product, service, API, marketplace, community, etc.)
   - **Business model** — how it makes money (recurring, one-time, usage-based, affiliate, marketplace cut, etc.)
   - **Revenue potential** — realistic MRR/ARR range with reasoning
   - **TAM / SOM** — total addressable market, realistic 3-year capture
   - **Competition map** — who exists, what they charge, what they do well, where they suck
   - **Competitive gap** — the specific defensible angle, not just "cheaper"
   - **Build estimate** — time and cost to MVP
   - **Distribution path** — how we get the first 100 customers (be specific)
   - **Demand signals** — search volume, forum activity, competitor revenue, market growth, real evidence
   - **Why now** — what's changed that makes this opportunity viable today (technology, regulation, behavior shift, market gap)
5. Score each opportunity on a 1-10 scale across 6 dimensions:
   - Revenue potential
   - Demand confidence
   - Distribution ease
   - Competition (lower competition = higher score)
   - Build complexity (lower complexity = higher score)
   - Time to launch (faster = higher score)
6. Compute `opportunity_score` (weighted average) and `expected_value` (score × speed factor)
7. Write opportunities to `shared/opportunities/opportunity-XXXX.json` with status `scored`

**Output:** 3-5 scored opportunities per night (max)  
**Product IDs:** All autonomous discovery products use IDs starting at `0600`. Legacy products (0001-0599) are untouched. See `shared/studio/product_id_ranges.json`.  
**Quality bar:** Every opportunity should be at the depth of opportunity-0300 (the lead follow-up SaaS). If Helix can't find real demand signals, produce fewer, better opportunities rather than padding. 2 great opportunities beats 5 mediocre ones.

**Edge cases:**
- If Helix finds < 2 viable opportunities, still write what it found — quality over quantity
- If a market is already covered (check `covered_markets` in portfolio), skip it
- Never generate opportunities that are just "prompt pack for X" — those belong in the factory pipeline
- Format is not constrained — if the best idea is a marketplace, write a marketplace. If it's an API, write an API.

---

### Step 2: Vector — Financial Gate

**What Vector does:**
1. Read all opportunities with status `scored` (from Step 1)
2. For each opportunity, evaluate as a venture capitalist would:
   - Is the revenue model realistic and scalable?
   - Is there genuine demand evidence (not just search volume — real pain, real spending)?
   - Can we actually build and operate this with our team/budget?
   - Is there a defensible gap, or is the market already being served well?
   - Does the "why now" make sense — or is this a solution looking for a problem?
   - What's the worst case? If it fails, what do we lose?
3. **Vector does not care about format.** SaaS, digital product, marketplace, service, API, community — all valid. What matters:
   - Can we execute it?
   - Will it make money?
   - Is the gap real?
   - Is the timing right?
4. For each opportunity, write a decision record:
   - `approved` — strong case, move to mission creation
   - `rejected` — doesn't pass the financial filter, with rationale
   - `refine` — promising but needs more research or a pivot (Helix retries next cycle)
5. **Limit: Maximum 2 approvals per night** — focus beats sprawl
6. Update opportunity status to `approved` or `rejected`
7. Write decision records to `shared/decisions/decision-XXXX.json`

**What makes a good Vector approval:**
- Clear path to $10K+ MRR within 12 months (or equivalent one-time revenue at scale)
- Build cost under $15K
- Defensible competitive gap (not just "cheaper than incumbents")
- Distribution path that doesn't require $50K+ ad spend to validate
- Fits our operational capabilities (we can actually build and run this)
- Strong "why now" signal — this opportunity exists because something just changed

---

### Step 3: Prism — Mission Creation

**What Prism does:**
1. Read all opportunities with status `approved` (from Step 2)
2. For each approved opportunity:
   - Create a mission record in `shared/missions/mission-XXXX.json`
   - Set status to `planning`
   - Link to the opportunity and decision records
   - Set budget, priority, deliverables based on Vector's decision
   - Update opportunity status to `mission_created`
3. **If no opportunities were approved:** Skip this step, still announce
4. Add new missions to the run queue for Luma to pick up during daytime cycles

---

### Step 4: Announce Results

**Deliver a summary to #mission-control** with:
- Number of opportunities researched
- Number approved by Vector
- New missions created (if any)
- Top opportunity summary (problem, market, revenue potential)
- If nothing was approved, explain why (quality bar wasn't met)

---

## Part 2: Catalyst Driver Cron

Catalyst is the system monitor and diagnostic agent. It doesn't produce business value directly — it keeps the machine healthy.

### Schedule

**Daily health check: 8:00 AM MST** (before the prompt factory's daily cycle)  
**Weekly deep analysis: Monday 9:00 AM MST**

### Daily Health Check (8 AM)

**What Catalyst does:**
1. Check all active missions for stalled status transitions
2. Check the run queue for items stuck > 24 hours
3. Check telemetry for errors in the last 24 hours
4. Check portfolio for products waiting to be published
5. Report only if something needs attention

**Output:**
- Healthy: `CATALYST_DAILY_OK` (silent, don't announce)
- Problem: Post alert to #mission-control with issue, file, suggested action

### Weekly Deep Analysis (Monday 9 AM)

**What Catalyst does:**
1. Review all active missions — are they on track?
2. Review portfolio performance — any products declining?
3. Review pipeline health — is the nightly discovery producing quality?
4. Check system resources — API usage, compute, storage
5. Review crons — are all scheduled jobs running?
6. Produce a brief status report

**Output:** Post structured weekly report to #mission-control

---

## Implementation Notes

### Cron Setup

```bash
# Nightly Discovery Pipeline — 11 PM MST
openclaw cron create \
  --name "nightly-discovery-pipeline" \
  --cron "0 23 * * *" \
  --tz "America/Denver" \
  --agent "helix" \
  --task "NIGHTLY_DISCOVERY: Run the full discovery pipeline. Step 1 (you): Do DEEP research — scan for demand signals, unsolved problems, underserved markets, emerging trends. Follow the evidence wherever it leads. No category constraints. Find 3-5 real opportunities at venture-capital depth. Write scored opportunities to shared/opportunities/. Then hand off to Vector, then Prism. Announce final results to mission-control channel 1479285742915031080." \
  --timeout-seconds 1800 \
  --best-effort-deliver \
  --to "channel:1479285742915031080"

# Catalyst Daily Health — 8 AM MST
openclaw cron create \
  --name "catalyst-daily-health" \
  --cron "0 8 * * *" \
  --tz "America/Denver" \
  --agent "catalyst" \
  --task "DAILY_HEALTH_CHECK: Review active missions, run queue, telemetry errors, and portfolio for issues. Only announce if something needs attention." \
  --timeout-seconds 300 \
  --best-effort-deliver \
  --to "channel:1479285742915031080"

# Catalyst Weekly Analysis — Monday 9 AM MST
openclaw cron create \
  --name "catalyst-weekly-analysis" \
  --cron "0 9 * * 1" \
  --tz "America/Denver" \
  --agent "catalyst" \
  --task "WEEKLY_ANALYSIS: Produce a full studio status report — active missions, portfolio health, pipeline quality, system resources, cron health. Post structured report to mission-control." \
  --timeout-seconds 600 \
  --best-effort-deliver \
  --to "channel:1479285742915031080"
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Opportunities scored per night | 3-5 |
| Opportunities approved per week | 3-7 |
| Missions created per week | 2-5 |
| Pipeline uptime | 95%+ (missing < 2 nights/month) |
| Helix research quality | 80%+ pass Vector's filter |
| Time from discovery to mission | < 24 hours |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Helix generates low-quality opportunities | Quality bar enforced — fewer, better beats volume. Vector's filter catches weak ones. |
| API costs spike from deep research | Budget cap per run (200K tokens). Research model used sparingly. |
| Too many missions in parallel | Max 2 approvals/night, max 3 active missions in config. Focus beats sprawl. |
| Pipeline fails silently | Catalyst daily check catches stalled pipelines. Announce even on "no approvals" nights. |
| Prompt pack opportunities leak into discovery | Explicit rule: "prompt pack for X" goes to factory pipeline, not discovery. |

---

## Next Steps

1. Don reviews and approves this spec
2. Update Helix's AGENTS.md with nightly pipeline instructions
3. Update Catalyst's AGENTS.md with daily/weekly check instructions
4. Install the three cron jobs
5. Monitor first 3 runs, tune as needed
