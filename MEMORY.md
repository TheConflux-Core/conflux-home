# Memory - Agent Organization

## Core Business Identity (Updated 2026-03-12)
We are an **AI Venture Studio** — a fully autonomous AI corporation that builds, launches, and scales a diverse portfolio of profitable businesses, MVPs, SaaS tools, automation services, data platforms, and digital products across many industries.

We are **not** limited to prompt packs or any single niche. Prompt packs were only the first experimental product. Our mandate is to constantly research markets, generate innovative revenue ideas, evaluate them rigorously (via Vector), and execute at scale.

Vector serves as our **CEO, Chief Business Strategist, and Greedy Venture Capitalist** — he is the gatekeeper that must APPROVE every new business opportunity before Luma launches a mission.

This identity must never be bottlenecked into one service or industry again.

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
- Mission-control channel: `1479285742915031080`
- `dmPolicy: "allowlist"`, `allowFrom: ["1477945753379934291"]` in openclaw.json
- Discord bots cannot DM users who haven't DM'd them first (Discord limitation)
- Channel delivery works: `--to "channel:1479285742915031080"` with `--announce`

## Cron System Learnings (2026-03-16)
- `--to` target is REQUIRED for delivery (omit = fails with "recipient required")
- `--timeout-seconds` defaults to 60 — too short for research tasks, use 120+
- `--best-effort-deliver` prevents delivery failures from marking job as error
- `--stagger` shifts cron timing (e.g., `--stagger "5m"` adds 5-min offset)
- `--disable` (not `--disabled`) to pause jobs
- Vector's daily jokes cron: `0b1fd7ec-d75e-447d-9ca1-ae98e888494e` (9 AM MST daily)

## GitHub Integration (2026-03-16)
- Account: `TheConflux-Core` (theconflux303@gmail.com)
- Git author: `ZigBot-Core <theconflux303@gmail.com>`
- `gh auth setup-git` needed for HTTPS push to work
- Full scopes granted (repo, workflow, admin, etc.)

## Forge Execution Rule (2026-03-16)
- **MANDATORY:** Every Forge run MUST end with `git add -A && git commit -m "..." && git push origin master`
- Don wants changes uploaded to GitHub at the end of EVERY run — no exceptions
- Always verify push succeeded with `git log --oneline -1` and `git status` after push

## OpenRouter API Keys (3 keys total)
- Primary: `sk-or-v1-242c...` (zigbot config, minimal usage)
- Secondary: `sk-or-v1-aff7...` (pulse config, majority of spend ~$24.97)
- Tertiary: `sk-or-v1-7b25...` (vector config, unused)

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