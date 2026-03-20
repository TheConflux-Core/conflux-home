# Dream Cycle Skill — Nightly Self-Improvement for AI Agents

## Overview

The **Dream Cycle** simulates human sleep-based memory consolidation, pattern extraction, and creative exploration. Just as the human brain uses sleep to replay experiences, extract insights, and explore novel combinations, this skill enables AI agents to perform nightly self-review and improvement.

---

## Scientific Foundation

### 1. Memory Replay & Hippocampal-Neocortical Dialogue

During slow-wave sleep, the hippocampus replays waking experiences at **10-20× compression** via sharp-wave ripples (150-250 Hz). This creates a bidirectional dialogue:

- **Neocortex → Hippocampus:** Slow oscillations (~0.75 Hz) with nested sleep spindles (12-15 Hz) create "query" cycles
- **Hippocampus → Neocortex:** Sharp-wave ripples carry compressed replay of recent memories for long-term storage

**AI Mapping:** Fast episodic store (recent interactions) → Slow semantic store (knowledge base/mental models)

### 2. Creative Exploration (REM Sleep)

REM sleep enables novel recombination of memories with relaxed prefrontal constraints. Dreams explore weak associative connections and generate "what-if" scenarios that inform creative problem-solving.

**AI Mapping:** Phase for generating hypothetical scenarios, combining unrelated concepts, and exploring edge cases.

### 3. Synaptic Homeostasis (Memory Pruning)

Sleep performs **proportional downscaling** of all synapses — preserving relative importance while reducing absolute storage. High-salience memories survive; noise is attenuated.

**AI Mapping:** Decay low-salience memories, compress medium memories, preserve high-salience memories.

---

## Skill Directory Structure

```
skills/dream-cycle/
├── SKILL.md                    # This file
├── prompts/
│   ├── phase1-harvest.json     # Event collection & salience scoring
│   ├── phase2-consolidate.json # Knowledge consolidation
│   ├── phase3-dream.json       # Creative recombination
│   ├── phase4-prune.json       # Memory pruning
│   └── phase5-integrate.json   # Morning report
└── templates/
    └── dream_report.md         # Report template
```

---

## Nightly Execution Flow

### Phase 1: Event Harvesting (Sleep Onset)
*Analog: N1/N2 Light Sleep — Log aggregation*

**Goal:** Collect all interactions, assess salience, prioritize for replay.

**Session Harvesting (NEW):**
Before harvesting tool calls and outcomes, the dream cycle now **harvests chat sessions** with the operator:

1. **Fetch recent sessions** using `sessions_history` tool
2. **Identify key interactions:**
   - User corrections and feedback (HIGH priority)
   - Strategic decisions or pivots (HIGH priority)
   - New opportunities identified (HIGH priority)
   - Failed approaches that provided learning (HIGH priority)
   - Routine operational discussions (MEDIUM priority)
   - Greetings and acknowledgments (LOW priority)

3. **Score each interaction:**
   - SALIENCE: 1-10 based on learning value
   - SURPRISE: 1-10 based on unexpected outcomes
   - TYPE: correction/decision/opportunity/failure/success/gap/routine

**Criteria for prioritization:**
- SURPRISE_LEVEL > 6 (prediction errors)
- Failures or mixed outcomes
- User corrections
- Unexpectedly successful novel strategies

**Prompt Template:**
```
You are entering the DREAM CYCLE — nightly self-review process.

PHASE 1: EVENT HARVESTING (with Session Harvesting)

STEP A: HARVEST CHAT SESSIONS

Use sessions_history to fetch recent chat sessions with the operator.
For each interaction, assess TYPE, SALIENCE, and SURPRISE.
Prioritize: corrections, decisions, opportunities, failures (HIGH)
Deprioritize: greetings, acknowledgments (LOW)

STEP B: HARVEST TOOL CALLS AND OUTCOMES

Review all interactions, tool calls, decisions, and outcomes from the past cycle (last 24 hours or since last sleep).

For each event, assess:
- SALIENCE (1-10): How important? Consider errors, surprises, novel patterns, user corrections, successful new strategies
- VALENCE: success / failure / mixed / neutral
- CATEGORY: tool_use / reasoning / communication / planning / error_recovery
- SURPRISE_LEVEL (1-10): Did outcome match expectations?
- REPLAY_PRIORITY: high / medium / low

Prioritize for replay:
- Events with SURPRISE_LEVEL > 6
- Failures or mixed outcomes
- User corrections
- Novel strategies that succeeded unexpectedly

Output structured event log with assessments.
```

---

### Phase 2: Consolidation (Slow-Wave Sleep)
*Analog: SWS — Memory transfer and pattern extraction*

**Goal:** Transfer episodic memories into structured knowledge.

**Prompt Template:**
```
PHASE 2: CONSOLIDATION

Simulate slow-wave sleep. Transfer episodic memories into structured knowledge.

For each HIGH-PRIORITY event from Phase 1:

1. REPLAY: Compress the event (what happened, what was tried, outcome)

2. PATTERN EXTRACTION:
   - What general principle emerges?
   - Does this confirm or contradict existing beliefs?
   - What variables were actually important vs. incidental?

3. KNOWLEDGE UPDATE:
   - New pattern → add to knowledge base
   - Confirmed pattern → strengthen confidence
   - Contradicted belief → revise with reasoning
   - Error → create specific "avoid" rule

4. CONNECTION: Link to other patterns. Analogies? Shared principles?

Output: Updated knowledge notes, revised strategies, new mental models.
```

---

### Phase 3: Dream Cycle (REM)
*Analog: REM Sleep — Creative exploration*

**Goal:** Generate novel combinations and hypothetical scenarios.

**Prompt Template:**
```
PHASE 3: DREAM CYCLE (REM)

DREAM TASK:

1. Take 2-3 unrelated concepts, events, or problems from recent activity

2. Combine them in unexpected ways:
   - "What if approach for [A] applied to [B]?"
   - "What if [X] and [Y] are manifestations of same pattern?"
   - "What is the inverse of current assumptions?"

3. Generate 3 "dream scenarios":
   - Edge case not yet encountered
   - Failure mode not yet considered
   - Opportunity hidden by current framing

4. Evaluate: Is there genuine insight or noise?

Output: Dream journal entries with post-hoc evaluation.
```

---

### Phase 4: Synaptic Downscaling (Memory Pruning)
*Analog: Synaptic homeostasis — Proportional decay*

**Goal:** Prevent memory bloat via proportional decay.

**Prompt Template:**
```
PHASE 4: MEMORY PRUNING

Apply synaptic downscaling:

RULES:
1. DECAY: Reduce weight of low-salience memories (salience < 4) by 50%
2. PRESERVE: High-salience memories (salience > 7) retain full weight
3. COMPRESS: Medium memories → keep lesson, discard details
4. DELETE: Remove memories below threshold after decay

Additional:
- Consolidate duplicate lessons (keep one strong memory + count)
- Merge related entries in knowledge base
- Remove outdated superseded strategies

Output: Pruned and consolidated memory/knowledge base.
```

---

### Phase 5: Morning Integration & Memory Write-Back
*Analog: Wake-up integration + Memory consolidation*

**Goal:** Generate actionable summary and write consolidated memory to MEMORY.md

**Memory Write-Back Mechanism:**

The dream cycle now writes consolidated knowledge to MEMORY.md, making it available for `memory_search` and `memory_get` in future sessions.

**Memory Update Format:**
```
## Dream Cycle Update — {{DATE}}

### Key Learnings
- [Pattern 1]: {{description}}
- [Pattern 2]: {{description}}

### Revised Strategies
- [Strategy 1]: {{description}}
- [Strategy 2]: {{description}}

### Session Harvest Summary
- Total interactions harvested: {{count}}
- High-salience events: {{count}}
- User corrections: {{count}}

### Memory Pruning Summary
- Entries pruned: {{count}}
- Entries compressed: {{count}}
- Current memory load: {{percentage}}%
```

**Prompt Template:**
```
PHASE 5: INTEGRATION & MEMORY WRITE-BACK

Generate summary:

1. KEY PATTERNS DISCOVERED: What new understanding emerged?
2. STRATEGIES REVISED: What approaches changed and why?
3. DREAM INSIGHTS: Which creative explorations yielded value?
4. MEMORY STATUS: What was pruned? What was strengthened?
5. TOMORROW'S FOCUS: What should be prioritized?

Then WRITE MEMORY UPDATES TO MEMORY.md using the format above.

Output: Morning briefing + MEMORY.md updates.
```

**Result:**
- After dream cycle runs, `memory_search` and `memory_get` can query consolidated knowledge
- Session history is preserved in structured format
- Memory becomes searchable across future sessions

---

## Implementation Notes

### Memory Budget Management

**Rules:**
1. **Hard cap:** Total memory entries cannot exceed configured limit (default: 1000)
2. **Weighted decay:** Daily automatic 5% decay on all entries, refreshed by salience scoring
3. **Consolidation window:** Archive memories older than 30 days unless repeatedly reinforced
4. **Pruning threshold:** Remove entries with weight < 0.2 after decay

**Memory Structure:**
```
Memory Entry:
- id: unique identifier
- content: compressed description
- salience: 1-10 importance score
- weight: current persistence level (0-1)
- last_accessed: timestamp
- access_count: integer
- category: classification tag
```

### Execution Schedule

**Recommended timing:** Daily, at end of operational period (e.g., midnight UTC)

**Frequency:** Once per 24-hour cycle
**Duration:** ~15-30 minutes for full 5-phase cycle

### Integration with Agent Workflow

**Entry Point:** Luma launches dream cycle as queued task when:
- Agent has completed minimum N interactions
- End of day cycle triggered
- Manual trigger via operator

**Exit Point:** Morning integration report delivered to operator channel
**Next Step:** Operator reviews and sets priorities for next cycle

---

## Permission Matrix

| Agent | Can Run Dream Cycle? | Notes |
|-------|---------------------|-------|
| ZigBot | ✅ Yes | Strategic self-improvement |
| Helix | ✅ Yes | Research pattern extraction |
| Forge | ✅ Yes | Build process optimization |
| Quanta | ✅ Yes | QA insight generation |
| Pulse | ✅ Yes | Marketing pattern learning |
| Prism | ⚠️ Limited | Only for mission planning insights |
| Spectra | ⚠️ Limited | Only for task decomposition insights |
| Luma | ❌ No | Not an execution agent |
| Vector | ❌ No | Strategic only, not tactical |

---

## Anti-Hallucination Rules

1. **Never simulate dream results** — Always verify insights against actual canonical state
2. **Track provenance** — Each insight must reference specific events or patterns
3. **Distinguish discovery from invention** — Flag insights as "observed" vs. "hypothesized"
4. **External verification** — Creative outputs require validation before operational use
5. **No action claims** — Dream cycle produces insights, not action commitments

---

## Example Output

### Dream Report — 2026-03-19

**Patterns Discovered:**
- User prefers direct, actionable responses over lengthy explanations (salience: 9)
- Channel delivery preferred over DM for agent communications (salience: 8)
- Late-night work patterns require different response timing (salience: 7)

**Strategies Revised:**
- Compress responses to 1-3 sentences when possible
- Always verify actions with real commands before claiming success
- Use channel delivery by default for agent communications

**Dream Insights:**
- Hypothesis: Connecting Dream Cycle to GitHub commit hooks could enable automatic nightly optimization
- Edge case: What happens when memory bloat exceeds budget during active missions?
- Opportunity: Dream cycle insights could feed into Helix market research patterns

**Memory Status:**
- Pruned: 23 low-salience routine interactions
- Compressed: 47 medium-salience entries into summary patterns
- Strengthened: 12 high-salience patterns retained at full weight

**Tomorrow's Focus:**
- Investigate GitHub integration for dream cycle automation
- Review active missions for dream cycle applicability
- Test creative recombination on opportunity evaluation process

---

## Credits

Based on research by Helix (Mimo-v2-pro model) synthesizing neuroscience literature:

- Tononi & Cirelli (2003). "Sleep and synaptic homeostasis"
- Born & Wilhelm (2012). "Systems consolidation during sleep"
- Klinzing et al. (2019). "Mechanisms of systems memory consolidation during sleep"
- Northwestern (2026). Dream stimulation and creativity research
- Oxford (2026). Creative problem-solving after dream provocation

---
