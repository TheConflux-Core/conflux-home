# Memory Architecture Reference

## How OpenClaw Memory Works

OpenClaw uses **plain Markdown files** as the source of truth. The model only "remembers" what's written to disk.

### File Layout

```
~/.openclaw/workspace/
├── MEMORY.md              # Long-term curated knowledge
└── memory/
    ├── YYYY-MM-DD.md      # Daily logs (short-term)
    ├── insights.md        # Medium-term patterns and lessons
    └── *.md               # Other reference files
```

### Memory Tools

- `memory_search` — semantic + keyword hybrid search over indexed snippets
- `memory_get` — targeted read of specific file/line range

### Search Backends

1. **Built-in SQLite** — default, stores embeddings in `~/.openclaw/memory/<agentId>.sqlite`
2. **QMD** — local-first BM25 + vectors + reranking sidecar (experimental)

### Indexing

- Only Markdown files: `MEMORY.md` + `memory/**/*.md`
- Watcher auto-reindexes on file changes (debounced 1.5s)
- Session transcripts optionally indexed when `memorySearch.experimental.sessionMemory = true`

### Hybrid Search (BM25 + Vector)

Configured in `openclaw.json`:
```json
{
  "memorySearch": {
    "enabled": true,
    "provider": "local",
    "query": {
      "hybrid": {
        "enabled": true,
        "vectorWeight": 0.7,
        "textWeight": 0.3
      }
    }
  }
}
```

- Vector: semantic similarity (paraphrase matching)
- BM25: exact keyword matching (IDs, codes, names)
- Combined score: `0.7 × vector + 0.3 × BM25`

### QMD Backend

Configured in `openclaw.json`:
```json
{
  "memory": {
    "backend": "qmd",
    "citations": "auto",
    "qmd": {
      "includeDefaultMemory": true,
      "sessions": { "enabled": true },
      "update": { "interval": "5m" }
    }
  }
}
```

When QMD is active:
- Session transcripts are exported and searchable
- `memory_search` results include source citations
- Falls back to built-in SQLite if QMD fails

### Temporal Decay (optional)

Older memories score lower automatically:
```json
{
  "query": {
    "hybrid": {
      "temporalDecay": {
        "enabled": true,
        "halfLifeDays": 30
      }
    }
  }
}
```

- 30-day half-life: score halves every month
- `MEMORY.md` and non-dated files never decayed
- Daily logs fade naturally over time

### MMR Diversity (optional)

Prevents near-duplicate results:
```json
{
  "query": {
    "hybrid": {
      "mmr": {
        "enabled": true,
        "lambda": 0.7
      }
    }
  }
}
```

## Memory Writing Best Practices

### MEMORY.md (Long-term)
- Core identity and business rules
- Durable decisions and their rationale
- User preferences that persist
- API keys (masked), account IDs, channel configs
- Anti-hallucination protocols
- Keep under 150 lines

### memory/insights.md (Medium-term)
- Technical patterns that work
- Error resolutions
- Workflow optimizations
- User feedback patterns
- Capability discoveries
- Organized by category with `##` headings

### memory/YYYY-MM-DD.md (Short-term)
- What happened today
- Decisions made in this session
- Specific tool outputs or results
- Temporary context for continuation
- Keep focused and factual

## Session Mining Protocol

1. Use `sessions_list` to find recent sessions
2. Use `sessions_history` to read conversation turns
3. Extract: decisions, preferences, solutions, errors, patterns
4. Write to daily log
5. Promote durable items to insights or MEMORY.md

## Backup Strategy

### Git Backup
- Memory files tracked in workspace git repo
- Periodic commits via `backup_memory.sh`
- Push to remote for disaster recovery

### QMD Index
- Session transcripts indexed automatically
- Provides searchable history across sessions
- Survives workspace resets via QMD sidecar

### Manual Export
- `openclaw sessions --json` for full session dump
- JSONL transcripts in `~/.openclaw/agents/<id>/sessions/`
