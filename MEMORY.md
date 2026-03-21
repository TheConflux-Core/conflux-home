# Memory - Agent Organization

## Core Business Identity (Updated 2026-03-12)

We are an **AI Venture Studio** — a fully autonomous AI corporation that builds, launches, and scales a diverse portfolio of profitable businesses, MVPs, SaaS tools, automation services, data platforms, and digital products across many industries.

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

## Published Products (9 total as of 2026-03-21)

- **product-0001**: 100 AI Prompts for Real Estate Agents (published 2026-03-09)
- **product-0003**: 100 AI Prompts for Mortgage Brokers (published 2026-03-17)
- **product-0005**: 100 AI Prompts for Lawyers (published 2026-03-17)
- **product-0006**: 100 AI Prompts for Health & Wellness
- **product-0101**: 100 AI Prompts for Finance
- **product-0201**: 100 AI Prompts for E-Commerce
- **product-0301**: 100 AI Prompts for Healthcare Practice Admins (published 2026-03-20)
- **product-0007**: 100 AI Prompts for Personal Trainers (published 2026-03-21)
- **product-0302**: 100 AI Prompts for Property Managers (published 2026-03-21)

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

**Chain:** Helix (deep research) → Vector (VC filter, max 2 approvals) → Prism (create missions) → Announce to #mission-control

**Spec:** `/home/calo/.openclaw/workspace/NIGHTLY_DISCOVERY_PIPELINE_SPEC.md`

**Cron IDs:**
- Nightly Discovery Pipeline: `824098f0-c0a2-43ba-bbb1-54f29dfae6af` (11 PM MST, Helix kickoff, research model)
- Catalyst Daily Health Check: `968ecba7-6eb2-4827-9920-33134c707244` (8 AM MST daily, silent if healthy)
- Catalyst Weekly Analysis: `4287f189-6894-47ed-928c-2cdd8ed68009` (Monday 9 AM MST, full studio report)

**Quality bar:** 2 great opportunities beats 5 mediocre ones. Every opportunity at venture-capital depth (opportunity-0300 standard). Never "prompt pack for X".

**Product ID rule:** Legacy pipeline owns 0001-0599. Autonomous discovery pipeline starts at 0600+. Registry at `shared/studio/product_id_ranges.json`. No renumbering of existing products.

**Helix AGENTS.md:** Added nightly pipeline section with deep discovery workflow
**Catalyst AGENTS.md:** Added nightly pipeline driver section + daily/weekly health checks

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
- Target: 1 article per site, round-robin between active sites
- Sites: audiorecordingschool.net → clickhereforcandy.com
- Configs: `/home/calo/.openclaw/shared/domain_assets/{site}/config.json`
- Pipeline spec: `/home/calo/.openclaw/shared/pipelines/domain_asset_pipeline.md`

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

## Key Forge Learnings (2026-03-20)

- Forge CANNOT output 100 prompts in one response — output token limit truncates them
- Fix: Forge must use `exec` with bash heredoc to write prompts to file in batches of 10
- Example: `cat >> /path/file.md << 'PROMPTS_EOF' ... PROMPTS_EOF`
- Verify after writing: `grep -c "### Prompt" file.md`
- Healthcare prompts were garbage (all 100 identical templates) — Quanta caught it
- Rebuilt prompts were excellent — unique, niche-specific, domain expertise evident
