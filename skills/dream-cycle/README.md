# Dream Cycle Skill

Nightly self-improvement framework based on human sleep neuroscience.

## Quick Start

Run the dream cycle manually:

```bash
# Execute full 5-phase dream cycle
openclaw dream-cycle --full

# Execute specific phase
openclaw dream-cycle --phase 1  # Harvest events (includes session harvesting)
openclaw dream-cycle --phase 2  # Consolidate knowledge
openclaw dream-cycle --phase 3  # Creative dreams
openclaw dream-cycle --phase 4  # Prune memory
openclaw dream-cycle --phase 5  # Morning integration + MEMORY.md write-back
```

## Memory Integration

**After dream cycle runs:**
- Consolidated knowledge is written to `MEMORY.md`
- `memory_search` and `memory_get` can query this information
- Session history is preserved across future sessions

**Example memory query after dream cycle:**
```
memory_search("strategic decisions")  # Finds patterns from dream cycle consolidation
```

## Nightly Automation

Add to cron for automatic nightly execution:

```cron
# Run dream cycle at 2 AM every day
0 2 * * * openclaw dream-cycle --full --announce --to channel:1479285742915031080
```

## Memory Budget

Default limits:
- **Max memory entries:** 1000
- **Daily decay rate:** 5%
- **Archive threshold:** 30 days unreinforced

Adjust in `dream_config.json`:
```json
{
  "memory": {
    "max_entries": 1000,
    "daily_decay": 0.05,
    "archive_days": 30,
    "salience_threshold": {
      "preserve": 7,
      "compress": 4
    }
  }
}
```

## Phase Details

| Phase | Name | Purpose | Duration |
|-------|------|---------|----------|
| 1 | Event Harvesting | Collect & prioritize interactions | ~2 min |
| 2 | Consolidation | Extract patterns & update knowledge | ~5 min |
| 3 | Dream Cycle (REM) | Creative recombination & insights | ~5 min |
| 4 | Memory Pruning | Proportional decay & compression | ~3 min |
| 5 | Morning Integration | Generate actionable summary | ~3 min |

**Total:** ~18-20 minutes

## Integration Points

### With Venture Studio

- Dream insights feed into Helix market research patterns
- Creative scenarios inform opportunity evaluation
- Memory patterns update Vector's decision criteria

### With Agent Workflow

- Luma triggers dream cycle via queue at end of day
- Output delivered to operator channel
- Next-day priorities set based on insights

## Scientific Basis

This skill is based on:
- **Synaptic Homeostasis Hypothesis** (Tononi & Cirelli, 2003)
- **Systems Consolidation** (Born & Wilhelm, 2012)
- **Sharp-Wave Ripple Replay** (Klinzing et al., 2019)
- **Dream Creativity Research** (Northwestern 2026)

## Files

- `SKILL.md` — Complete skill documentation
- `prompts/` — Phase-specific prompt templates
- `templates/dream_report.md` — Report template
- `dream_config.json` — Configuration file

## Version

v1.0 — Initial release based on Helix research (2026-03-19)
