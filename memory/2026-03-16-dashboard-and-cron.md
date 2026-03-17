# 2026-03-16 Session: Dashboard, Cron, GitHub Integration

## Dashboard Fixes (Agents Page)
- **Problem:** Agents page showed all agents as "idle" with 0% progress, wrong models
- **Root cause:** `loadAgents()` read from non-existent `state.json` files and empty telemetry `.jsonl` files
- **Fix:** Rewrote `live-operations.ts` to derive agent state from:
  - Session activity (`sessions.json` updatedAt < 15 min = "running")
  - Configured model from `openclaw.json` → `agents.defaults.model.primary`
  - Mission context from `~/.openclaw/shared/missions/*.json` (phase assignments)
  - Progress = time-based response tracking (not mission completion %)
- **Result:** Real-time status, models, tokens, and task display

## Dashboard Fixes (Homepage)
- **Problem:** Homepage showed hardcoded token costs ($6.23, 147K tokens), 4 healthy agents
- **Fix:** Created `/api/costs` endpoint → OpenRouter API, replaced all hardcoded values
- **Fix:** Changed `healthyAgents` count from queue items to actual agent directory scan
- **Result:** Live daily/total cost from OpenRouter, 9 healthy agents

## Dashboard Fixes (Portfolio)
- **Problem:** AI Cost showed $0, Revenue showed $0 with placeholder text
- **Fix:** Created `openrouter-costs.ts` utility to fetch from all API keys
- **Fix:** Set annual target to $1.2M, all currency to 2 decimal places
- **Result:** Live $25.26 total AI cost, proper formatting

## Cron System
- Tested with Vector (stock gainers) and Pulse (stock losers) every 10 min
- Discovered `--to` target is required for delivery
- Discovered Discord bot DM limitation (user must DM bot first)
- Created `vector-daily-jokes` cron: 9 AM MST daily, 3 topical late-night jokes
- Cleared old test cron jobs

## GitHub Integration
- Authenticated `gh` CLI as `TheConflux-Core`
- Git config: `ZigBot-Core <theconflux303@gmail.com>`
- Pushed mission control to `TheConflux-Core/next-test-v1`
- Commit 1: Full app (219 files)
- Commit 2: Live data integration (4 files)

## Key Technical Details
- OpenRouter API: `/auth/key` returns `usage`, `usage_daily`, `usage_weekly`, `usage_monthly`
- 3 API keys total, secondary key has bulk of spend (~$25)
- Gateway URL: `http://127.0.0.1:18789/tools/invoke` with bearer token
- Gateway default model: `openrouter/openrouter/hunter-alpha`
- Session stores: `~/.openclaw/agents/*/sessions/sessions.json`
