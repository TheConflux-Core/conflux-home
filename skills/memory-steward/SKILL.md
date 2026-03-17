---
name: memory-steward
description: Audit, organize, and maintain agent memory across sessions. Use for memory hygiene, session transcript mining, short/medium/long-term memory management, QMD backup, and continuous learning. Triggers on phrases like "audit memory", "memory cleanup", "organize memory", "review sessions", "memory backup", "what did we learn", "memory maintenance", "self-improvement", "update memory", "consolidate memory".
---

# Memory Steward

Maintain agent memory as a living, evolving knowledge base. Promotes learning from session transcripts, organizes memory into tiers, and ensures continuity across sessions.

## Memory Tiers

| Tier | File | Purpose | Retention |
|------|------|---------|-----------|
| Short-term | `memory/YYYY-MM-DD.md` | Daily logs, session notes | 30 days, then prune or promote |
| Medium-term | `memory/insights.md` | Patterns, lessons, recurring solutions | Indefinite, reviewed monthly |
| Long-term | `MEMORY.md` | Core identity, decisions, durable facts | Permanent |

## Workflow: Full Memory Audit

1. **Read current state**: `MEMORY.md`, `memory/insights.md`, today's + yesterday's daily logs
2. **Scan sessions**: Use `sessions_list` and `sessions_history` to review recent conversations
3. **Extract learnings**: Identify decisions, preferences, facts, patterns not yet captured
4. **Promote**: Move durable items from daily logs → insights or MEMORY.md
5. **Prune**: Archive or summarize daily logs older than 30 days
6. **Record**: Write audit summary to today's daily log

## Workflow: Session Mining

Review recent sessions for durable knowledge:

1. List active sessions: `sessions_list(activeMinutes=10080)` (last 7 days)
2. For each relevant session, fetch history: `sessions_history(sessionKey, limit=50)`
3. Extract:
   - Decisions made
   - User preferences expressed
   - Technical solutions that worked
   - Errors and how they were resolved
   - Agent role behaviors and boundaries learned
4. Write findings to today's `memory/YYYY-MM-DD.md`
5. Promote critical items to `MEMORY.md` or `memory/insights.md`

## Workflow: Memory Hygiene

Periodic cleanup to prevent bloat:

1. Read all files in `memory/` directory
2. For daily logs older than 30 days:
   - Extract any unique insights → append to `memory/insights.md`
   - Delete or archive the daily log
3. For `memory/insights.md`:
   - Remove outdated items
   - Consolidate duplicates
   - Keep under 200 lines
4. For `MEMORY.md`:
   - Remove stale information
   - Update outdated facts
   - Keep under 150 lines (critical path context)

## Workflow: QMD Backup

When QMD is configured (`memory.backend = "qmd"`):

1. Verify QMD binary: `which qmd`
2. Check indexed collections: `qmd collection list`
3. Force index refresh: `qmd update && qmd embed`
4. Verify search works: `qmd search "test" --json`

If QMD is not installed, note this in today's daily log.

## Memory Writing Rules

- **Facts over narration**: "GitHub account: TheConflux-Core" not "We discussed GitHub"
- **Dates on everything**: Include `YYYY-MM-DD` in entries
- **One topic per block**: Don't mix unrelated facts
- **Source references**: Note which session/event produced the insight
- **Anti-hallucination**: Never write unverified claims as facts

## Self-Improvement Protocol

Track agent growth over time:

1. **Error patterns**: Log repeated errors and their fixes
2. **Successful strategies**: Note what worked well
3. **User feedback**: Capture explicit preferences and corrections
4. **Capability gaps**: Record tasks that required escalation or failed
5. **Efficiency wins**: Note workflow improvements discovered

Store in `memory/insights.md` under categorized headings:
- `## Technical Patterns`
- `## User Preferences`
- `## Error Resolutions`
- `## Workflow Optimizations`

## Scripts

- `scripts/audit_memory.sh` — Quick memory file stats and age report
- `scripts/backup_memory.sh` — Git-based memory backup

## Integration with Venture Studio

Memory steward feeds the studio's learning loop:
- Agent run telemetry → `memory/YYYY-MM-DD.md`
- Mission outcomes → `memory/insights.md`
- Strategic decisions → `MEMORY.md`
- Error patterns → `telemetry/errors.jsonl` + memory notes
