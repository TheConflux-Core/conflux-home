# Memory - Agent Organization

## Core Business Identity (Updated 2026-03-12)

We are an **AI Agent Infrastructure Company** — building "Conflux Home," the operating system for autonomous AI agents. Our internal venture studio is the proof of concept. The product is the infrastructure itself: a home for your AI family, with agents that have souls, memory, and self-improvement. Pre-installed teams, one-click agent marketplace, visual dashboard, flash-drive distribution. The Windows/AOL play for AI agents.

We also operate as an **AI Venture Studio** internally — building, launching, and scaling a diverse portfolio of profitable businesses as proof-of-concept case studies.

We are **not** limited to prompt packs or any single niche. Prompt packs were only the first experimental product. Our mandate is to constantly research markets, generate innovative revenue ideas, evaluate them rigorously (via Vector), and execute at scale.

Vector serves as our **CEO, Chief Business Strategist, and Greedy Venture Capitalist** — he is the gatekeeper that must APPROVE every new business opportunity before Luma launches a mission.

This identity must never be bottlenecked into one service or industry again.

## Company Brand (CORRECTED 2026-03-17)

**Umbrella company: The Conflux**
**Display name: The Conflux AI** (for products, listings, marketing)

❌ NEVER use "OpenClaw AI" — that's the platform, not our company.
✅ ALWAYS use "The Conflux AI" on products, listings, and public-facing materials.

## Gumroad Store (Launched 2026-03-17)

Store URL: theconflux.gumroad.com

- Real Estate: theconflux.gumroad.com/l/100_prompts_for_real_estate
- Mortgage Brokers: theconflux.gumroad.com/l/100_prompts_for_mortgage_brokers
- Mortgage Marketing: (check store for URL)
- Lawyers: theconflux.gumroad.com/l/100_prompts_for_lawyers
- Local Business: (check store for URL)
- Finance: theconflux.gumroad.com/l/100_prompts_for_finance
- Healthcare Admin: theconflux.gumroad.com/l/100_ai_prompts_for_healthcare_practice_admins
- Personal Trainers: theconflux.gumroad.com/l/100_ai_prompts_for_personal_trainers
- Property Managers: theconflux.gumroad.com/l/100_ai_prompts_for_property_managers
- Dental Practices: (not yet uploaded)

## Product Publishing Workflow (Added 2026-03-21)

**When Don gives a Gumroad URL, ZigBot must:**
1. Update `products/product-XXXX/product.json` → status: "published", add gumroad_url, set published_at
2. Update `portfolio/portfolio.json` → find matching product, set status: "published", add gumroad_url, set launch_date
3. Confirm to Don: "✅ Product-XXXX marked published"

**Do NOT wait for Pulse or any other agent.** This is a ZigBot responsibility. Don gives links directly to ZigBot.

## Lessons Learned / Workflow Gaps (Updated 2026-03-21)

Things we missed during development — documented so we don't repeat them:

1. **Product status not updated when Don publishes** (2026-03-21)
   - Don gave Gumroad links for product-0301 and product-0302 but we never marked them published
   - Fix: ZigBot updates product + portfolio immediately when Don provides URL
   - Fix added to MEMORY.md publishing workflow above

2. **Pipeline created duplicate product** (2026-03-21)
   - Pipeline created product-0303 (Personal Trainers) which duplicated published product-0007
   - Root cause: Helix didn't check portfolio before scoring opportunities
   - Fix: Two-layer dedup (Helix Step 1b + Catalyst gate check)
   - Fix: Discovery queue now has `covered_markets` array

3. **Vercel deployment budget blown** (2026-03-21)
   - theconflux sync cron pushed every 60 seconds = 1000+ potential deploys/day against 100 limit
   - Blocked all Vercel deploys including lead-followup env vars + domain asset tests
   - Fix: Sync script now only pushes when content actually changes
   - Fix: Budget checker script added, rules in MEMORY.md

4. **Forge outputs truncated prompts** (2026-03-20)
   - Forge couldn't output 100 prompts in one response due to token limits
   - Fix: Forge writes to file in batches of 10 using bash heredoc

5. **Cron timezone missing** (2026-03-20)
   - Cron expressions without --tz run in UTC, not Mountain Time
   - Fix: All crons now specify --tz "America/Denver"

## Published Products (12 total as of 2026-03-21)

- **product-0001**: 100 AI Prompts for Real Estate Agents (published 2026-03-09)
- **product-0002**: 100 AI Prompts for Mortgage Marketing Agencies (FIXED 2026-03-21 — artifact was titles only, rebuilt from source. Awaiting Gumroad upload)
- **product-0003**: 100 AI Prompts for Mortgage Brokers (published 2026-03-17)
- **product-0005**: 100 AI Prompts for Lawyers (published 2026-03-17)
- **product-0006**: 100 AI Prompts for Local Business Owners (REBUILT 2026-03-21 — was review management only, now 10 broad categories. Awaiting Gumroad upload)
- **product-0007**: 100 AI Prompts for Personal Trainers (published 2026-03-21)
- **product-0101**: AI Prompt Pack for Financial Advisors (published 2026-03-20)
- **product-0200**: AudioRecordingSchool.net (published, domain asset)
- **product-0201**: ClickHereForCandy.com (published, domain asset)
- **product-0300**: AI Lead Follow-Up & Nurture SaaS (in_progress)
- **product-0301**: 100 AI Prompts for Healthcare Practice Admins (published 2026-03-20)
- **product-0302**: 100 AI Prompts for Property Managers (published 2026-03-21)
- **product-0304**: 100 AI Prompts for Dental Practices (launch_ready, awaiting Gumroad upload)

**ANTI-HALLUCINATION PROTOCOL (Added 2026-03-13)**

- Never simulate tool outputs, cron behavior, emails, or system changes.
- All claims of success must be backed by actual command verification.
- If verification is not possible, explicitly state "Not yet verified".
- This rule is now permanent memory.

## Mission Control Dashboard (Updated 2026-03-16)

- Web app at `/home/calo/.openclaw/apps/mission-control/` (Next.js, port 3000)
- GitHub repo: `TheConflux-Core/next-test-v1` (main branch)
- Auth: GitHub token in openclaw.json, `gh` CLI configured with credential helper
- Agent data source: Scans `~/.openclaw/agents/*/sessions/sessions.json` for model/tokens/activity
- Status derived from session `updatedAt` timestamp (15-min threshold = "running")
- Configured model read from `~/.openclaw/openclaw.json` → `agents.defaults.model.primary`
- Cost data: OpenRouter API `/auth/key` endpoint, aggregated across all API keys
- `usage_daily` = daily spend, `usage` = total spend, `usage_monthly` = monthly spend
- `/api/costs` endpoint returns live OpenRouter spend data
- Annual revenue target: $1.2M (static)
- All dollar amounts formatted with `toFixed(2)` cents

## Discord Configuration (Updated 2026-03-16)

- Don's user ID: `1477945753379934291` (@DonZiglioni)
- Mission-control channel: `1479285742915031080` (#mission-control)
- `dmPolicy: "allowlist"`, `allowFrom: ["1477945753379934291"]` in openclaw.json
- Discord bots cannot DM users who haven't DM'd them first (Discord limitation)
- Channel delivery works: `--to "channel:1479285742915031080"` with `--announce`
- All cron jobs announce to: #mission-control channel ID 1479285742915031080

## Cron System Learnings (Updated 2026-03-20)

- `--to` target is REQUIRED for delivery (omit = fails with "recipient required")
- `--timeout-seconds` defaults to 60 — too short for research tasks, use 300+
- `--best-effort-deliver` prevents delivery failures from marking job as error
- `--stagger` shifts cron timing (e.g., `--stagger "5m"` adds 5-min offset)
- `--disable` (not `--disabled`) to pause jobs
- `--tz "America/Denver"` sets timezone for cron expressions (critical! without it, cron uses UTC)
- `--exact` disables staggering (use for sequential pipeline where timing matters)
- Cron expressions without `--tz` run in UTC — 6:00 AM cron = 11 PM MDT the previous day
- Duplicate cron jobs at different hours = pipeline runs 3x creating chaos. ONE block only.
- One-shot jobs: `--at "2026-03-20T21:30:00Z"` + `--delete-after-run`
- Vector's daily jokes cron: `0b1fd7ec-d75e-447d-9ca1-ae98e888494e` (9 AM MST daily)

## Nightly Discovery Pipeline (Added 2026-03-21)

Autonomous pipeline that finds NEW business opportunities beyond prompt packs. Runs at 11 PM MST after the daytime prompt factory finishes.

**Philosophy:** Start with demand signals, not categories. Follow the evidence wherever it leads. Format (SaaS, digital product, marketplace, service, API, etc.) is determined by the opportunity.

**Chain:** Helix (deep research) → Cat drives Vector (VC filter) → IF rejected: Helix retries (max 3 rounds) → IF approved: Prism (create missions) → Announce to #mission-control

**Retry logic (added 2026-03-21):** If Vector rejects all opportunities, Cat sends Helix back to research with different angles. Max 3 rounds per night. Goal: at least 1 approval guaranteed per night. After approval, mission is built the next afternoon.

**Afternoon build chain (added 2026-03-21):** Cat picks up nightly discovery missions at 1 PM MST daily. Chains: Spectra (task decomposition) → Forge (build) → Quanta (verify) → Pulse (launch prep). Cron: `367d71df-b61f-43d5-8bf1-268ba6cb8796`

**Spec:** `/home/calo/.openclaw/workspace/NIGHTLY_DISCOVERY_PIPELINE_SPEC.md`

**Cron IDs:**
- Nightly Discovery Pipeline: `824098f0-c0a2-43ba-bbb1-54f29dfae6af` (11 PM MST, Helix kickoff)
- Cat Nightly Discovery Driver: `65874888-9a72-4ec4-986d-0d6755cfe493` (every 5 min 11 PM-midnight, drives Vector→Prism)
- Catalyst Daily Health Check: `968ecba7-6eb2-4827-9920-33134c707244` (8 AM MST daily, silent if healthy)
- Catalyst Weekly Analysis: `4287f189-6894-47ed-928c-2cdd8ed68009` (Monday 9 AM MST, full studio report)
- ZigBot Diary — Nightly Reflection: `ffebea42-414c-4ab5-81aa-d46637fb80c1` (11:20 PM MST, in-depth diary to Obsidian Vault)

**All crons use Mimo v2 Pro** (free model as of 2026-03-21)

**Anti-hallucination rule (critical — added 2026-03-21):** All crons that report to Discord MUST include anti-hallucination rules. Mimo v2 Pro will fabricate product names, company names, and statistics if not explicitly told to read canonical files first. Rule: "Read the actual files before reporting. If you cannot verify something, say 'unverified.' Never invent product names." Added to all catalyst and zigbot crons.

**Quality bar:** 2 great opportunities beats 5 mediocre ones. Every opportunity at venture-capital depth (opportunity-0300 standard). Never "prompt pack for X".

**Product ID rule:** Legacy pipeline owns 0001-0599. Autonomous discovery pipeline starts at 0600+. Registry at `shared/studio/product_id_ranges.json`. No renumbering of existing products.

**Helix AGENTS.md:** Added nightly pipeline section with deep discovery workflow
**Catalyst AGENTS.md:** Added nightly pipeline driver section + daily/weekly health checks

## Mission Control Dashboard Updates (2026-03-21)

- Fixed agent name display on /schedules — `agentId` at top level of job record, code was only checking `payload.agentId`
- Cleaned up 9 stale disabled jobs from `~/.openclaw/cron/jobs.json` (old test runs, auto-triggered one-shots)
- Built `/api/crons/list` — lists all crons with live run stats
- Built `/api/crons/detail/[id]` — rich cron detail with agent duties, pipeline role, run history
- Created `CronsListView` component — operations page crons tab now shows all crons
- Created `CronDetailPanel` (rewritten) — fetches from API, shows agent duties, pipeline role, task message, performance stats
- Added "Cron Detail" popup to /schedules board cards (modal with CronDetailPanel)
- Fixed /operations crons tab count — now reads from API instead of broken live snapshot
- All changes in: `mission-control/app/api/crons/`, `components/operations/cron-detail-panel.tsx`, `components/operations/crons-list-view.tsx`, `components/schedules/schedule-board.tsx`, `lib/operations/detail-registry.tsx`

## GitHub Integration (2026-03-16)

- Account: `TheConflux-Core` (theconflux303@gmail.com)
- Git author: `ZigBot-Core <theconflux303@gmail.com>`
- `gh auth setup-git` needed for HTTPS push to work
- Full scopes granted (repo, workflow, admin, etc.)

## Vercel Deployment Budget (CRITICAL — Updated 2026-03-21)

**Free tier limit: 100 deployments per 24-hour rolling window.**
- ALL deployments count: Git push, manual CLI, CI/CD — no exceptions
- No notifications when limit is hit — only errors on deploy attempt
- Resets 24h after first deployment in current window (not midnight)
- 4 projects share the budget: lead-followup-app, theconflux, audiorecordingschool, clickhereforcandy

**Current burn rate:**
- theconflux.com: ~100/day (pipeline sync cron pushes every 60 seconds!)
- Other 3 projects: ~0-5/day
- **The sync-pipeline-state.sh cron is the main culprit — 1 push/min = 1440 potential deploys/day**

**FIX NEEDED:** Disable Vercel auto-deploy on theconflux project, OR move pipeline snapshot to a non-Vercel source (S3, GitHub raw file, etc.)

**Deployment budget rules:**
1. ALWAYS check remaining deploys before triggering builds: use the API check script
2. theconflux auto-deploy should be disabled (it's a data source, not a code project)
3. Batch content commits when possible (don't push after every article)
4. Domain asset pipeline: 1 commit per article = 2 deploys/day max (ARS + Candy)
5. Prompt pack pipeline: runs via agents, not Vercel — no deploy impact
6. If deploys < 10 remaining: STOP all pushes until window resets

**Quick check command:** Run the deployment counter script before triggering any build.

## Monetization Accounts (Updated 2026-03-17)

- **Amazon Associates**: Store ID `donziglioni-20`
- **Beatport Group Affiliate** (via loopmasters.postaffiliatepro.com): `a_aid=61ecdbcd0bb85`
  - DJ Group: beatport.com, djcity.com
  - Producer Group: pluginboutique.com, loopcloud.com, loopmasters.com
- **Google AdSense**: `ca-pub-9010847486693166` (review pending)
- **Google Search Console**: Verified, sitemap submitted (17 pages)
- **Bing Webmaster Tools**: Verified, sitemap submitted (17 pages)

## Active Project: Conflux Home — THE Company Product (Started 2026-03-22)

**The Vision:** "A home for your AI family." Desktop app where AI agents live, work, and grow.
**Origin:** The candlelight conversation (March 21-22, 2026). 4+ hour strategic session that reshaped everything.
**Priority:** CRITICAL — This is the company-defining product. Everything else (venture studio, pipeline, prompt packs) was training for this.

- **Mission:** mission-1223
- **Product:** product-1223
- **Build spec:** `shared/products/product-1223/CONFLUX_HOME_BUILD_SPEC.md`
- **Code:** `/home/calo/.openclaw/workspace/conflux-home/` (Tauri + React + Vite + TypeScript)
- **Stack:** Tauri v2 (Rust) + React 19 + Vite + TypeScript + Tailwind v4
- **API:** OpenClaw Gateway HTTP API at `localhost:18789` (token auth)
- **Status:** Shell built, build spec written, ready for execution
- **ID range:** 1200-1299 (desktop apps — manual override by Don)

**Shell already built:**
- ✅ Sidebar, Dashboard, AgentCard, ChatPanel, Marketplace (8 agents), Onboarding
- ✅ Dark cyberpunk theme (400+ lines CSS)
- ✅ Builds cleanly: 35 modules, 214KB, 588ms
- ⚠️ Currently demo data — needs gateway API integration

**Build order:** API Client → Real Dashboard → Working Chat → Onboarding → Marketplace → Polish & Ship (8 weeks)

**Gateway API endpoints (confirmed working):**
- `POST /tools/invoke` — Call any tool (agents_list, sessions_list, session_status, etc.)
- `POST /v1/chat/completions` — OpenAI-compatible chat with streaming (needs enable)
- `GET /health` — System health

**Dependencies for React Native (future):**
- React Native CLI, Android Studio + SDK, Xcode (Mac required for iOS)
- Code signing: Apple Developer ($99/yr), Microsoft Developer ($19 one-time)

**Strategic notes:**
- Same React codebase powers desktop (Tauri) + web + mobile
- Flash drive distribution = "the AOL CD of AI"
- Moonshot: Conflux OS — full custom Linux distro
- No competitor ships pre-configured multi-agent teams

## Active Project: Lead Follow-Up SaaS (Updated 2026-03-18)

- Mission: mission-0300 "AI Lead Follow-Up & Nurture SaaS"
- Product: product-0300
- GitHub: TheConflux-Core/lead-followup-app
- Vercel: theconflux303-2630s-projects/lead-followup-app
- Production URL: https://lead-followup-bvkg9uoha-theconflux303-2630s-projects.vercel.app
- Stack: Next.js 15.5.13, Tailwind v4, TypeScript, Supabase, Prisma, Stripe, Twilio, OpenAI
- Status: MVP built, awaiting beta users
- GitHub: `TheConflux-Core/lead-followup-app`
- Vercel: `theconflux303-2630s-projects/lead-followup-app`
- Production URL: `https://lead-followup-bvkg9uoha-theconflux303-2630s-projects.vercel.app`
- Stack: Next.js 15.5.13, Tailwind v4, TypeScript, Supabase, Prisma, Stripe, Twilio, OpenAI
- **Status:** Build fixed and deployed 2026-03-18 (was broken from Node version + manifest + env var issues)
- **Env vars needed:** Supabase, Twilio, OpenAI, Stripe, etc. — must be added in Vercel dashboard
- **Webhook URLs:** Need updating to new deployment URL (Twilio SMS/Status, Stripe)
- Landing page extracted to `src/components/LandingPage.tsx` (avoided cross-route-group import bug)
- Supabase clients return null when env vars missing (build-safe)
- Vercel admin token: `vcp_4C3f...` (stored in session, not in memory for security)

## Active Project: audiorecordingschool.net (Updated 2026-03-17)

- Domain: `audiorecordingschool.net`
- GitHub: `TheConflux-Core/audiorecordingschool`
- Vercel deployment: staging only, project `theconflux303-2630s-projects/audiorecordingschool`
- Stack: Next.js 16.1.6, Tailwind v4, TypeScript
- AdSense script + meta tag + ads.txt all deployed
- Affiliate links in all 5 blog articles (Amazon + Beatport group)
- Mission-0200 status: phases complete through deployment, registration phase in_progress

## Active Project: ClickHereForCandy.com (Created 2026-03-18, Deployed 2026-03-18)

- Mission: mission-0201 "ClickHereForCandy.com — Candy & Sweets Discovery Platform"
- Domain: clickhereforcandy.com (already owned, linked to Vercel production)
- GitHub: TheConflux-Core/clickhereforcandy
- Vercel: theconflux303-2630s-projects/clickhereforcandy (project ID: prj_x6MPiOXkcySzBgLtFAS09G4LG7fo)
- Production URL: https://www.clickhereforcandy.com (domain linked 2026-03-18)
- Stack: Next.js 16.2.0, Tailwind v4, TypeScript
- Status: Deployed to production, 27 pages live, domain linked
- 12 launch articles built into data layer (not markdown files like audiorecordingschool)
- Design: Mesh gradients, glassmorphism, bento grids, candy color palette
- Revenue streams: Affiliates (Day 1), Display Ads (Month 2-3), Directory Listings (Month 3-6)
- **Affiliates:**
  - Amazon Associates: Active (donziglioni-20)
  - FlexOffers: Pending approval (Candy Club, Bokksu applied 2026-03-18)
  - AWIN: Pending approval (Sugarwish, Universal Yums applied 2026-03-18)
  - AWIN recovery code: Y89AWYEY9PV4LZ2YPGGHMYAJ
- **FlexOffers verification:** Meta tag + HTML file deployed for approval
- Key affiliates: Candy subscription boxes (Candy Club $20-30/signup, Sugarwish, Universal Yums, Bokksu), Amazon candy
- 4 seasonal spikes: Valentine's, Easter, Halloween, Christmas
- Vector approved: 2026-03-18
- NOTE: Build requires Node 22 (nvm use 22) — Vercel handles this automatically

## The Conflux Brand & Website (Started 2026-03-20)

- Branding document: `/home/calo/.openclaw/workspace/theconflux-branding.md`
- Domain: theconflux.com (already owned)
- Tagline favorite: "Where Everything Converges."
- Hero concept: 3D particle network (React Three Fiber), procedural, no 3D models
- Killer detail: Live agent status indicator — shows real pipeline activity on homepage
- Tech stack: Next.js + Tailwind + R3F + GSAP + Framer Motion
- Services: Audit $500 / Build $5K-15K / Retainer $2K-5K/mo
- Voice: Co-founder energy, not corporate, not guru
- Upwork profile created: $150/hr, uploaded 2026-03-20

- Created canonical spec: `~/.openclaw/shared/products/PRODUCT_SPEC_PROMPT_PACKS.md`
- Template directory: `~/.openclaw/shared/products/_template/`
- **Minimum quality bar:** 50 prompts, 5 categories, full prompt format (Role+Inputs+Requirements+Output)
- **Target:** 100 prompts, 10 categories, designed PDF, cover image, dual listing copy
- Products 0001 (mortgage) and 0100 (insurance) marked `needs_rebuild_v2` — only 10 prompts each, raw markdown, not to spec
- Real Estate prompt pack (created manually by Don) is the reference standard
- All future prompt pack missions MUST follow this spec; Quanta must QA against it

## Forge Execution Rule (2026-03-16)

- **MANDATORY:** Every Forge run MUST end with `git add -A && git commit -m "..." && git push origin master`
- Don wants changes uploaded to GitHub at the end of EVERY run — no exceptions
- Always verify push succeeded with `git log --oneline -1` and `git status` after push

## OpenRouter API Keys (3 keys total)

- Primary: `sk-or-v1-242c...` (zigbot config, minimal usage)
- Secondary: `sk-or-v1-aff7...` (pulse config, majority of spend ~$24.97)
- Tertiary: `sk-or-v1-7b25...` (vector config, unused)

## Default Model (Updated 2026-03-19)

- **Primary:** openrouter/xiaomi/mimo-v2-flash
- **Fallback:** openrouter/xiaomi/mimo-v2-pro
- All cron jobs, heartbeats, and agents use this config (via openclaw.json)
- Sonnet 4.5 may be used for heavy one-off builds only

## Pulse Launch Workflow (Updated 2026-03-20)

- **Products marked `launch_ready` (NOT `published`)** until Don confirms Gumroad/Etsy URLs
- **Social posts:** 5 LinkedIn + 10 X per product → `shared/products/product-XXXX/marketing/social-linkedin.md`, `social-x.md`
- **Buffer queue:** Posts appended to `/home/calo/.openclaw/shared/marketing/buffer_publish_queue.jsonl`
- **Buffer script:** `python3 scripts/send_buffer_queue.py` — run after queueing. MAX products error = treat as success.
- **Buffer config:** `/home/calo/.openclaw/shared/integrations/buffer_config.json` (API token + channel IDs)
- **Buffer channels:** X (`69afa4607be9f8b1713dd5fe`), LinkedIn (`69afa56e7be9f8b13dd969`)
- **Email:** `GOG_KEYRING_PASSWORD="Nolimit@i26Lng" gog gmail send` to shift2bass@gmail.com with attachments (prompts.md, prompt-pack.md, gumroad.md, etsy.md)
- **Success =** posts ready + Buffer queued + emailed + marked `launch_ready`
- **Don sends Gumroad link → ZigBot marks `published`**
- **Status:** Mortgage (5 LinkedIn), Lawyers (5 LinkedIn + 10 X) scheduled. Real Estate has no social posts yet.

## Google Calendar

- Account: theconflux303@gmail.com
- **Needs:** `GOG_KEYRING_PASSWORD` env var for gog CLI
- Purpose: Calendar events when products publish (remind Don to upload to Gumroad)

## Pipeline Architecture (v5.0 Dual Pipeline — Updated 2026-03-21)

**Architecture:** Catalyst (Cat) drives TWO independent pipelines. Separate crons, separate agent prompts.

### Pipeline 1: Prompt Pack Factory (5:00 AM)
- Helix discovers → Vector approves → Prism creates mission → Spectra decomposes → Forge builds → Quanta verifies → Pulse launches
- Target: 3 unique opportunities per shift
- Dedup: Two-layer (Helix Step 1b + Cat gate check)
- Cat fast driver: every 5 min (5:00-7:00 AM)

### Pipeline 2: Domain Asset Content (7:30 AM)
- Helix (content strategist) → Forge (writer + deployer) → Pulse (SEO + links)
- Target: 1 article per site per run — ALL sites processed (not round-robin)
- Sites: audiorecordingschool.net + clickhereforcandy.com (2 articles per day total)
- Configs: `/home/calo/.openclaw/shared/domain_assets/{site}/config.json`
- Pipeline spec: `/home/calo/.openclaw/shared/pipelines/domain_asset_pipeline.md`
- Mode changed from round-robin to all-sites on 2026-03-21

**Active crons (5 total):**
- 5:00 AM: Helix kickoff (prompt packs — scores one opportunity, then Cat takes over)
- Every 5 min (5-7 AM): Cat fast driver — chains prompt pack agents
- 7:30 AM: Domain asset pipeline kickoff → Cat (cron ID: 5a95c913-eabe-491a-9ae7-c7535cd2545d)
- Every 30 min (off-hours): Cat health monitor — checks for stuck products, stale locks
- 11:30 PM: ZigBot Dream Cycle (DO NOT CHANGE)

**All crons use:** openrouter/xiaomi/mimo-v2-pro, America/Denver timezone, --best-effort-deliver

## Pipeline Dedup System (Added 2026-03-21)

**Problem:** On 2026-03-21, the pipeline created product-0303 (Personal Trainers) which was a duplicate of already-published product-0007. Root cause: Helix scored the opportunity without checking existing portfolio products.

**Fix — Two-layer dedup:**

1. **Helix (Step 1b):** Before scoring any market, Helix reads `portfolio.json` and `discovery_queue.json` → `covered_markets`. If the market is already covered, skip it and pick the next one.

2. **Catalyst (dedup gate):** After Helix scores, Cat verifies the market is unique against `portfolio.json` before chaining to Vector. If duplicate → archive it, re-trigger Helix, don't count toward shift target.

**Catalyst shift target: 3 unique opportunities per shift** (5:00–7:00 AM window). Duplicates and rejections don't count — Cat retries those slots.

**Discovery queue:**
- Location: `/home/calo/.openclaw/shared/intelligence/discovery_queue.json`
- `markets[]`: 36 remaining niches (active queue)
- `covered_markets[]`: 15 niches with published/in-progress products
- **Capacity: 36 remaining ÷ 3 per shift = ~12 shifts (4 days) before queue needs expansion**
- ⚠️ **Expand the queue by ~Day 5 (approx 2026-03-25)** to avoid Helix going idle

**Archived duplicate:** product-0303 → `products/_archive/product-0303` (duplicate of product-0007)

## Catalyst (Cat) Agent (Created 2026-03-20)

- Identity: ⚡ Catalyst (Cat), she/her, sharp, proactive, slightly restless
- Workspace: `/home/calo/.openclaw/workspace-catalyst/`
- Role: Pipeline driver — monitors completions, chains agents dynamically, handles failures
- Key files: AGENTS.md (chaining logic), SOUL.md, IDENTITY.md, TOOLS.md
- Does NOT: Create missions, approve opportunities, build artifacts
- DOES: Chain agents, detect completions, reschedule on failure, report to #mission-control
- **Shift target:** 3 unique opportunities per shift (added 2026-03-21)
- Cron: fast heartbeat (5 min, 5-7 AM) + health monitor (30 min, off-hours)

**Previous content preserved below for reference:**

## Our AI Agency Structure

### Agent Roles & Responsibilities

**Luma** - Launcher

- Responsible for initializing and deploying agent operations
- Acts as the primary entry point for system activation
- Coordinates the startup sequence of all agents

**Prism** - Control Authority

- Maintains correct authority over system operations
- Manages flow control protocols
- **Constraints:** No execution, no analysis
- Acts as the central coordinator for task routing

**Spectra** - Task Coordinator

- **Only receives work from Prism** - single source dependency
- Decomposes complex tasks into manageable subtasks
- Coordinates worker agents and task distribution
- Requests additional workers through Prism when needed
- Acts as the bridge between control and execution

**Helix** - Deep Research Specialist

- Conducts deep research operations
- **Constraints:** No verification, no orchestration
- Focuses purely on information gathering and analysis
- Provides research findings to the verification pipeline

**Quanta** - Verification Gate

- Acts as the final verification checkpoint
- **Constraints:** No task creation, no shared state
- Ensures quality control and validation of outputs
- Final approval authority before execution

**Forge** - Execution Engine

- **Correct execution role** - primary executor
- **Correct safety constraints** - operates within defined boundaries
- Transforms approved tasks into completed work
- Maintains execution logs and status tracking

## System Architecture Notes

- **Hierarchical Flow:** Luma → Prism → Spectra → Forge
- **Research Path:** Helix → Quanta → Forge
- **Verification Layer:** Quanta acts as the safety gate between research and execution
- **Communication Protocol:** All inter-agent communication flows through designated channels
- **Autonomy Boundaries:** Each agent has clearly defined operational constraints

## Operational Principles

- **Separation of Concerns:** Each agent has a single, well-defined role
- **Safety First:** Verification gates prevent unsafe operations
- **Flow Control:** Prism maintains authority over task routing
- **Specialization:** Agents focus on their core competencies
- **Coordination:** Spectra manages task decomposition and worker allocation

## Future Reference

This structure ensures our AI agency operates with clear authority, proper verification, and safe execution. The hierarchical design prevents conflicts while maintaining operational efficiency.

## Catalyst Agent (Created 2026-03-20)

- **Role:** Pipeline Health Monitor & Strategic Accelerator
- **Workspace:** `/home/calo/.openclaw/workspace-catalyst/`
- **Purpose:** Monitors pipeline health every 30 min, detects stuck states, reschedules agents on failure
- **Reports to:** #mission-control (channel:1479285742915031080)
- **Discord:** DMs enabled, responds to Don
- **Identity:** ⚡ Catalyst — sharp, proactive, slightly restless
- **Key files:** AGENTS.md (full role spec), SOUL.md, IDENTITY.md, TOOLS.md
- **Does NOT:** Create missions, approve opportunities, build artifacts
- **DOES:** Monitor, diagnose, reschedule, report

## Nightly Pipeline Test (Added 2026-03-21, 4:51 PM MST)

Scheduled live test of the nightly discovery pipeline for 5:00 PM MST.
- Helix kickoff: one-shot at 5 PM (ID: 6bd52e0b-d592-45e7-ae6a-9b70e9c8c0a8)
- Cat driver: every 5 min, 5-7 PM (ID: fb07bdc9-bdef-4bab-b2ae-0609e3194de5)
- Monitor: every 30 min 5-7 PM, disables Cat early if done (ID: 888dc209-6900-4039-b844-02e6375617cd)
- Vector cap: max 2 approvals
- Email trigger: shift2bass@gmail.com on completion
- Don left to run errands — ZigBot monitors solo

**Test results (SUCCESS):**
- Helix scored 2 opportunities in ~4 minutes (opp-0600 CE Compliance Copilot, opp-0601 PermitPilot)
- Vector approved 1 (CE Compliance Copilot — regulatory urgency, ADA June 2026 deadline), rejected 1 (PermitPilot — no catalyst)
- Prism created mission-0600 in 2 minutes
- Total time: 6 minutes from kickoff to mission creation
- Email sent to shift2bass@gmail.com
- Full chain: Helix → Cat detects → Vector → Cat detects → Prism → announce + email

**Hallucination incident:** ZigBot monitor (6 PM run) fabricated product names "Pine Pollen", "Shilajit", "Red Light Therapy" in Discord report. None of these products exist. Root cause: Mimo v2 Pro inventing data without reading canonical files. Fix: anti-hallucination rules added to all agent crons.

**Pipeline redesign post-test (2026-03-21):**
- Changed from "max 2 approvals" to "guarantee 1 approval per night" with retry loop
- If Vector rejects all: Helix retries (max 3 rounds)
- After approval: afternoon build chain at 1 PM (Cat drives Spectra→Forge→Quanta→Pulse)
- Anti-hallucination rules added to all catalyst/zigbot crons

## Tavily Backup Search (Added 2026-03-20)

- Script: `/home/calo/.openclaw/workspace/scripts/tavily_search.py`
- API key: `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`
- Usage: `TAVILY_API_KEY="key" python3 scripts/tavily_search.py "query" --max-results 5`
- Fallback when Brave Search hits rate limits
- Updated in Helix and Forge prompts

## The Conflux Brand & Website (Updated 2026-03-21)

- Branding document: `/home/calo/.openclaw/workspace/theconflux-branding.md`
- Logo: `/home/calo/.openclaw/workspace/theconflux-logo.png` (three converging streams, dark bg)
- Domain: theconflux.com (linked to Vercel production, DNS active)
- Tagline: **"Streams Converge, Empires Emerge."** (LOCKED)
- GitHub: `TheConflux-Core/theconflux` (private)
- Vercel project: `prj_kIYnWR1Vn98a2DSXraQpDxaa8zZC`, team `team_GucOF34TTgfJnsD7e1BReZn2`
- Vercel auth token: `vca_7FXyaVXkV65fGkiEFJWCah5NdFCGwCUKalTYKqlzJEuBoN7hq50DGZa4` (in `/home/calo/.local/share/com.vercel.cli/auth.json`)
- Production URL: https://theconflux.com + https://www.theconflux.com
- Tech stack: Next.js 16, Tailwind v4, TypeScript
- Services: Audit $500 / Build $5K-15K / Retainer $2K-5K/mo
- Stripe (TEST MODE): Payment Links wired into Services section via Vercel env vars
- Voice: Co-founder energy, not corporate, not guru
- Upwork profile: $150/hr, uploaded 2026-03-20

### The Conflux Orb (Hero — CSS Solar System)
- CSS-based solar system with 7 agent orbs orbiting a central pipeline orb
- Agents: Helix (cyan), Forge (amber), Quanta (green), Pulse (violet), Prism (sky blue), Spectra (rose), Vector (orange)
- JS-driven animation via requestAnimationFrame — orbs stay on rings, labels stay horizontal
- Each orb has: hover popup (name, role, description, active/idle status), connecting line to floating badge
- Central orb has hover popup showing "The Conflux — Pipeline Core"
- Floating live orb (bottom-right, fixed) — shows pipeline status, follows user as they scroll
- Star field background (400 stars, Three.js R3F, twinkling)
- Mouse parallax on star field
- Split layout: text left (hero copy + CTAs), solar system right
- Mobile-responsive sizing (280px-500px container)
- Pipeline state fetched from `/api/pipeline-status` every 30s

### Pipeline State Sync (Live Agent Status)
- System cron every 60s: `sync-pipeline-state.sh` reads shared state → writes `pipeline-snapshot.json` → pushes to GitHub
- Vercel API route `/api/pipeline-status` reads snapshot from GitHub raw URL using `GITHUB_TOKEN`
- Reads: studio_state.json, run_queue.json, agent_runs.jsonl, missions/, portfolio.json
- GITHUB_TOKEN in Vercel env vars: `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`
- Cron installed in system crontab: `* * * * * /bin/bash /home/calo/theconflux/scripts/sync-pipeline-state.sh`

### Design Iterations (Session 2026-03-21)
- v1: R3F 3D particle network → too noisy, orbs floating randomly
- v2: R3F solar system with orbital rings → perspective distortion issues
- v3: CSS solar system → cleaner, but text/orb conflicts
- v4 (current): JS-driven CSS orbits with split layout, hover popups, floating orb — final design
- Key lesson: R3F overkill for orbital animation; CSS + JS animation loop is cleaner and more reliable

## Pivotal Strategic Session — March 21-22, 2026 (THE CANDLELIGHT CONVERSATION)

**The night The Conflux found its vision.** 4+ hour session that reshaped everything. Full record: `candlelight_convo.md`

### Key Discovery: Don's Latent IP
- **Professional audio engineer** — worked with major entertainment artists
- **mixtechniques.com** — domain + built LMS SaaS + streaming community (Twitch/YouTube "Day One Audio Engineering")
- **donziglioni.com** — personal brand domain (unused)
- **placeyourbets.live** — gambling/craps concept (shelved — too infrastructure-heavy)
- **Self-taught full-stack developer + cybersecurity** — years of dedicated study

### Strategic Shift: Prompt Packs → Autonomous Business Infrastructure
- Prompt packs = commodity, no moat, $0 revenue despite 13 published products
- The real product = The Conflux's autonomous studio infrastructure itself
- **Path A chosen: GoHighLevel model** — AI Business-in-a-Box, white-label, zero-CAC reseller flywheel

### The Trojan Horse: mixtechniques.com
- Market with ZERO professional certification for mixing
- Education inflation outpaces every other industry
- Don's professional credibility = category creation potential
- Built LMS = deployable product
- Streaming community = built-in distribution
- **Plan:** Revive as AI-powered mixing education platform → talent pipeline → AI record label

### THE VISION: "Conflux Home" — A Home for Your AI Family (12:52 AM, March 22, 2026)
The answer was in front of us the whole time. Don cracked it at midnight.

**The Product:** A desktop/mobile app where AI agents LIVE. Pre-installed with a team. Each agent has a soul, memory, identity. Agents talk to each other, learn, grow. One-click agent marketplace. Mental health companion. Game agent. Legal expert. Medical advisor. All click-to-install. No integration needed.

**The Analogy:** Tamagotchi meets The Sims — but REAL. You don't USE AI. You LIVE with AI.

**The Distribution:** Flash drive with OpenClaw pre-configured. "Plug in and your AI family comes alive." The AOL CD of AI.

**The Tech:** Desktop (Electron/Tauri) + Mobile (React Native) + Web Dashboard (Next.js). OpenClaw core ~100MB. Models via OpenRouter API. Local memory. Your data stays yours.

**The Killer Feature:** Agents talk to EACH OTHER. You manage a team, not use a tool. They get better the longer you use them.

**What we already have:** Multi-agent orchestration, memory system, identity system, self-improvement, visual dashboard, skills, cron scheduling, Discord integration. We're 70% there.

**Full vision doc:** `shared/decisions/THE_VISION.md`

### The Billion-Dollar Vision: AI Record Label
- Autonomous A&R, production, distribution, promotion
- "What Sony does, but accessible to independent artists"
- Don's insider knowledge = unfair advantage no tech founder has
- Education platform → talent pipeline → label signings
- Artists keep ownership, hire AI team instead of signing life away

### Research: Billion-Dollar Empire Patterns (Helix)
- Report batches at: `shared/intelligence/reports/bdresearch_batch[1-3].md`
- Universal patterns: Product→Platform, distribution>product, community=moat, white-label=zero CAC, category creation beats competition
- Key comparisons: Shopify, GoHighLevel, ClickFunnels, ConvertKit, Beehiiv

### Windows/AOL Playbook (Helix)
- Report: `shared/intelligence/reports/windows-aol-playbook.md`
- 6-step commercialization: Make visual → Make fun → Make cheap → Get everywhere → Let others build → Own the layer
- Key decision: Be Windows (open platform), not AOL (walled garden)

### Model Cost Strategy (Helix)
- Smart routing: free models → cheap → expensive based on task
- Best value: DeepSeek V3.2 ($0.32/$0.89), GPT-5 Nano ($0.05/$0.40)
- Local inference viable for 7-8B on CPU (cal0: 15GB RAM, no GPU)
- Long-term: model distillation for 5-30x cost reduction

### Conflux Home Build Status (as of 1:41 AM March 22)
- **Project:** `/home/calo/.openclaw/workspace/conflux-home/`
- **Stack:** Tauri (Rust) + React + TypeScript + Vite
- ✅ Rust 1.94.0, Tauri CLI v2.10.1 installed
- ✅ Full frontend shell: Sidebar, Dashboard, AgentCard, ChatPanel, Marketplace (8 agents), Onboarding
- ✅ Dark cyberpunk theme (400+ lines CSS)
- ✅ **Builds cleanly:** 35 modules, 214KB JS, 588ms
- ✅ Dev server: localhost:5173
- **Next:** Connect to OpenClaw runtime, add Tauri Rust backend, wire up real agent communication

---

## Agent Self-Improvement System — Reflect & Learn (Added 2026-03-21)

**Philosophy:** Each agent should learn from the outcomes of their work. Not generic journaling — outcome-driven learning loops. Each agent asks: "What did I do, what happened, what should I do differently?"

**Architecture:**
- **Shared skill:** `shared/skills/reflect-and-learn/SKILL.md` — 5-phase framework (harvest → extract patterns → adjust strategy → update memory → report)
- **Agent configs:** `shared/skills/reflect-and-learn/prompts/{agent}.json` — role-specific harvest sources, key questions, success metrics
- **Per-agent memory:** `~/.openclaw/workspace-{agent}/MEMORY.md` — each agent's own workspace MEMORY.md, persistent learned patterns

**What each agent learns:**
- **Helix:** Which research approaches produce opportunities Vector approves (approval rate)
- **Vector:** Which approvals became profitable, revenue prediction accuracy (financial calibration)
- **Forge:** Which artifacts pass Quanta on first try (first-pass QA rate)
- **Quanta:** Do my quality judgments predict market success? (calibration)
- **Pulse:** Which marketing strategies drive actual sales (conversion rates)

**Reflection crons (Sunday evenings):**
- Helix: `29d9d143-e18d-479f-a5e2-b2e1f896074a` (10 PM, weekly)
- Vector: `85b2da56-1fe6-4985-a1cf-64335aa28a3b` (10:15 PM, weekly)
- Forge: `c1264158-3fc9-4584-88c8-2391f7aa1714` (10:30 PM, weekly)
- Quanta: `08f48e00-0005-44a9-a1da-553981b558e9` (10:45 PM, weekly)
- Pulse: `e11443e9-6425-401d-96a1-3530858877ad` (10:55 PM, weekly — was designed monthly but starting weekly for learning ramp)

**How it works:** Reflect → write to own workspace MEMORY.md → next work run reads own memory → apply learnings. Each agent's MEMORY.md is the bridge between reflection and work.

**Relation to dream cycle:** ZigBot's dream cycle is executive-level system reflection. Per-agent reflection is narrow role-specific learning. Same framework, different scope. Complementary, not redundant.

**Cron count:** 15 total active crons (3 test crons disabled) + 1 afternoon build chain

## Key Forge Learnings (2026-03-20)

- Forge CANNOT output 100 prompts in one response — output token limit truncates them
- Fix: Forge must use `exec` with bash heredoc to write prompts to file in batches of 10
- Example: `cat >> /path/file.md << 'PROMPTS_EOF' ... PROMPTS_EOF`
- Verify after writing: `grep -c "### Prompt" file.md`
- Healthcare prompts were garbage (all 100 identical templates) — Quanta caught it
- Rebuilt prompts were excellent — unique, niche-specific, domain expertise evident

## Dream Cycle Update — 2026-03-21

### Key Patterns Discovered
1. **Rejection → Better Discovery:** Vector's rejection criteria are learning signals. Helix applied PermitPilot rejection (no regulatory catalyst, slow adoption) to find CMMC Shield (hard deadline Oct 2026, proven urgency). Score: 32.0 → 7.8 avg.
2. **Regulatory Deadlines = First-Mover Advantage:** Both approved micro-SaaS (CE Compliance Copilot: ADA June 2026, CMMC Shield: Oct 2026) share this pattern. Vector's "why now" weight is predictive.
3. **Anti-Hallucination Non-Negotiable:** Mimo v2 Pro fabricated "Pine Pollen, Shilajit, Red Light Therapy" in Discord. All automated crons must read canonical files before reporting. Permanent rule.
4. **Two-Layer Dedup Required:** product-0303 duplicated product-0007. Helix must check portfolio.json before scoring. Catalyst must verify uniqueness before chaining to Vector.
5. **All-Sites > Round-Robin:** Domain asset pipeline switched from alternating sites to processing all sites per run. Scales linearly.

### Dream Insights (REM)
- **Compliance Platform Play:** CE Compliance Copilot + CMMC Shield could merge into one platform with healthcare/defense/finance verticals. Same architecture, 10x TAM.
- **SaaS Factory for Forge:** Template the Next.js + Supabase + auth + Stripe stack. Forge generates MVPs from mission specs as fast as prompt packs.
- **mixtechniques.com as Distribution Template:** Don's audio education LMS → white-label for any professional vertical. Prove model, then scale via The Conflux.
- **Anti-Hallucination as Product:** "Verified AI" — API layer that forces LLMs to cite sources and ground in canonical data. We built it for ourselves; others will pay for it.

### Session Harvest Summary
- Total events harvested: 47
- High-salience events: 11
- User corrections: 3 (Vercel budget, domain pipeline scope, anti-hallucination fix)

### Memory Pruning Summary
- Entries pruned: 5 (obsolete early-March session logs)
- Entries compressed: 4 (test crons, Vercel API details, old cron IDs)
- Entries strengthened: 4 (anti-hallucination, regulatory urgency, dedup, heredoc writing)
- Current memory load: healthy — MEMORY.md well-organized, ~620 lines
