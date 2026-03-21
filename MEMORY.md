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
- Lawyers: theconflux.gumroad.com/l/100_prompts_for_lawyers

## Published Products

- **product-0001**: 100 AI Prompts for Real Estate Agents (published 2026-03-09, gold standard)
- **product-0003**: 100 AI Prompts for Mortgage Brokers (published 2026-03-17, v2 rebuild)
- **product-0005**: 100 AI Prompts for Lawyers (published 2026-03-17, v2 new market)

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

## GitHub Integration (2026-03-16)

- Account: `TheConflux-Core` (theconflux303@gmail.com)
- Git author: `ZigBot-Core <theconflux303@gmail.com>`
- `gh auth setup-git` needed for HTTPS push to work
- Full scopes granted (repo, workflow, admin, etc.)

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

## Pipeline Cron Jobs (22 total registered as of 2026-03-18)

**Gated pipeline v2 (7 jobs + Dream Cycle):** Rebuilt 2026-03-20. All on openrouter/xiaomi/mimo-v2-flash, all to #mission-control, all America/Denver timezone, all `--exact`:

- 5:00 AM: Helix — Opportunity Discovery (research + score ONE opp, status→"scored")
- 5:15 AM: Vector — Opportunity Approval (auto-approve ≥20, reject <20)
- 5:25 AM: Prism — Mission Creation (approved opp → mission + product skeleton)
- 5:35 AM: Spectra — Task Decomposition (planning mission → task graph)
- 5:45 AM: Forge — Artifact Build (queued tasks / building products → artifacts, git push)
- 6:15 AM: Quanta — QA Verification (qa_pending → verified or back to Forge)
- 6:25 AM: Pulse — Launch & Publish (verified → social posts, Buffer, email Don, mark "launch_ready")
- 11:30 PM: ZigBot Dream Cycle (nightly self-improvement, DO NOT CHANGE)

**Pipeline design:** Each agent has a gate condition — exits idle if no work. Sequential with 10-30 min gaps for file sync. Full cycle takes ~90 min if Helix finds a niche. Total idle time ~30 sec if nothing to do.

**AudioRecordingSchool daily pipeline (10 jobs):** Registered 2026-03-18

- All run daily, all announce to #mission-control
- All use openrouter/xiaomi/mimo-v2-flash
- Workflow: Content creation, review, formatting, image generation, SEO, Buffer queue, publish
- Mission-0200 automated daily content publishing

**Digital product platforms (6 jobs):** Status checks for ClickHereForCandy, AudioRecordingSchool, LeadFollowUp

- Daily 8:00 AM, weekly Monday 8:00 AM checks
- All to #mission-control

**Previous gates (still registered, 6 jobs):** Helix, Vector, Prism, Spectra gates (9AM cycle)

- May be deprecated soon (replaced by new 6-9 AM pipeline)

(Previous "AI Agency building prompt-pack products" description has been retired.)

---

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
