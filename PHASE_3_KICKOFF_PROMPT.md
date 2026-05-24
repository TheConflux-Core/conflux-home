# Phase 3 Kickoff — Investor Data Package

> Give this prompt to Omni at the start of a fresh session to begin Phase 3 of the capital-raising strategy.

---

## Context

Conflux Home is raising pre-seed capital. The pitch deck is built (Phase 1 complete). The demo video is being storyboarded and livestreams prepared (Phase 2 in progress). You are starting **Phase 3: The Data Package** — the quantitative evidence investors need to make a decision.

The pitch deck sells the *vision*. The data package proves the *business*.

---

## What To Build

### 1. Usage Analytics Dashboard

The app is a Tauri v2 desktop app at `/home/calo/.openclaw/workspace/conflux-home`. It uses SQLite for local state and Supabase for cloud sync. Determine:

- **Current install count** — Check Supabase for user signups (table: `auth.users`), check local SQLite for any analytics tables
- **Daily/Monthly Active Users** — Are we tracking this? If not, what's the earliest we can backfill?
- **Session length** — Any telemetry or timestamps in the database?
- **Credits consumed** — Total credits burned vs. allocated per user. Which models are used most?
- **Conversion rate** — How many free users become Power or Pro subscribers?

Check these sources:
- Supabase: `analytics_events`, `user_profiles`, `subscriptions`, `credit_transactions` tables
- Local SQLite: `/home/calo/.local/share/com.conflux.home/conflux.db`
- Stripe: webhook handler at `/home/calo/.openclaw/workspace/conflux-home/supabase/functions/stripe-webhook/index.ts`
- GitHub repo: Look for any telemetry or analytics hooks in the codebase

If structured analytics don't exist yet, recommend what to instrument and how.

### 2. Unit Economics Report

Calculate or estimate:

- **Cost per credit** — What's the average LLM cost per request across providers (OpenRouter pricing, OpenAI, Anthropic, Groq, local models)? Use the cloud router code in `src-tauri/src/engine/` to trace the credit consumption path.
- **Revenue per user** — At Free/Power/Pro tiers, what's the expected ARPU?
- **Gross margin** — Infrastructure cost vs. subscription revenue
- **Break-even** — How many paid users at each tier covers operating costs?
- **CAC estimate** — What would it cost to acquire a user via ads, content, or referrals?

### 3. Market Sizing

Research and produce a defensible TAM/SAM/SOM:

- **TAM** — Total global market for "AI agent desktop software" (not just chatbots). Sources: Gartner, IDC, PitchBook, market reports from 2025-2026.
- **SAM** — Consumer + SMB segment, English-speaking markets, desktop-first users.
- **SOM** — Realistic first-year capture rate for Conflux Home based on comparable launches.

Compare with comparable companies:
- Character.AI ($1B+ valuation, $20M+ revenue)
- Poe by Quora ($75M raised)
- Claude Desktop (Anthropic's distribution play)
- ChatGPT Desktop (OpenAI)

### 4. Competitive Landscape Matrix

Update the competition slide from the pitch deck with proper sources:

- Feature comparison (multi-agent, persistence, model-agnostic, offline, marketplace, native desktop)
- Funding comparables (who raised what, at what stage)
- Trajectory comparison (what did they have at our stage?)

### 5. Cohort & Retention Analysis

If we have any user data:
- Weekly retention curves
- Feature adoption rates (which agents are used most?)
- Power user profiles (what do the top 10% of users do?)
- Churn signals (when do users stop using the app?)

If we don't have this data, design the analytics schema we need to build.

---

## Deliverables

Create these files in `/home/calo/.openclaw/workspace/conflux-home/`:

| File | Contents |
|------|----------|
| `INVESTOR_DATA_PACKAGE.md` | Master document — all findings in one place |
| `unit_economics.md` | Cost per credit, ARPU, margin, break-even |
| `market_sizing_report.md` | TAM/SAM/SOM with sources |
| `competitive_landscape.md` | Full competitive matrix with funding data |
| `analytics_recommendations.md` | What to instrument and how |

---

## Important Constraints

1. **No hallucination** — Every number must be verifiable. If I can't find actual data, I mark it as "unknown — needs instrumentation" rather than inventing it.
2. **Supabase access** — I have Supabase keys in the repo's environment or config files. Use `terminal` to query Supabase via their REST API or `psql` if available.
3. **Stripe** — The Stripe webhook handler at `supabase/functions/stripe-webhook/index.ts` reveals the billing schema. Read it before making claims about pricing.
4. **LLM costs** — Check OpenRouter pricing at openrouter.ai/docs/pricing for current per-model costs. Use `terminal` with `curl` or `wget`.
5. **Self-contained** — This document is the sole briefing. I don't need prior session context to execute.
6. **Path discipline** — All work happens under `/home/calo/.openclaw/workspace/conflux-home/`. All new files go there.

---

## Phase 2 Status (for continuity)

Phase 2 (Demo Video) is **in progress** — Don is designing a storyboard and preparing livestreams. Phase 1 (Pitch Deck) is **complete** — the deck is at `Conflux_Pitch_Deck.html`. This session is Phase 3.

---

## Verification

Before returning, verify every deliverable file exists and has meaningful content. Report the file sizes and a 2-3 sentence summary of each finding.
