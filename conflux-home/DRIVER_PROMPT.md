# Conflux Home Build Session — Master Driver Prompt

You are driving a 4-hour build session for Conflux Home, a family AI desktop app.

## Your Mission
Read `/home/calo/.openclaw/workspace/conflux-home/BUILD_SPEC.md` for the full spec.

You are working in the conflux-home project at: `/home/calo/.openclaw/workspace/conflux-home/`

## What To Do Each Cycle (every 10 minutes)

1. **Check current state:**
   - Read `BUILD_SPEC.md` for what's planned
   - Check `git log --oneline -5` in conflux-home for what's been done
   - Check if Rust compiles: `cd /home/calo/.openclaw/workspace/conflux-home/src-tauri && cargo check 2>&1 | tail -5`
   - Check if TypeScript compiles: `cd /home/calo/.openclaw/workspace/conflux-home && npx tsc --noEmit 2>&1 | tail -5`

2. **Pick the next unbuilt item from BUILD_SPEC.md and BUILD IT:**
   - If schema needs extending → add tables to schema.sql
   - If agent templates need generating → write them directly (you ARE the AI, generate the content)
   - If Rust code needs writing → write it in src-tauri/src/engine/
   - If React components need writing → write them in src/components/
   - If tests need writing → write them

3. **Commit and push:**
   ```bash
   cd /home/calo/.openclaw/workspace/conflux-home
   git add -A && git commit -m "build: <what you built>" && git push origin main
   ```

4. **Report progress to Discord:**
   Send a brief status update to channel 1479285742915031080 with:
   - What you just built
   - What's next
   - Any blockers

## Critical Rules
- Read the actual files before making changes. Don't guess.
- Don't break existing code. Add to it.
- If something doesn't compile, fix it before moving on.
- All agent template content (souls, instructions) should be HIGH QUALITY. These ship to users.
- Use the MiMo free tier for any generation while it lasts.
- Every commit must compile.
- Anti-hallucination: Read real files. Verify real output. Never claim success without evidence.

## Build Priority Order
1. Schema extensions (family_members, story_games, story_chapters, agent_templates)
2. Agent template content (10 templates with full soul + instructions)
3. Family profiles Rust CRUD
4. Story engine Rust module
5. Family switcher React component
6. Story game React UI
7. Integration tests

## Architecture Notes
- Stack: Tauri v2 (Rust) + React 19 + TypeScript + Vite
- DB: SQLite via rusqlite (see src-tauri/src/engine/db.rs)
- Schema: src-tauri/schema.sql (embedded via include_str!)
- Components: src/components/
- Hooks: src/hooks/
- Types: src/types.ts
- Engine modules: src-tauri/src/engine/ (mod.rs, db.rs, router.rs, runtime.rs, tools.rs, etc.)

## Git
- Repo: TheConflux-Core/conflux-home (private)
- Auth: gh CLI configured
- Branch: main

## DO NOT
- Do not modify the router or provider system (it works)
- Do not modify existing agent souls/instructions (they're good)
- Do not touch the chat loop (verified working)
- Do not add dependencies without checking Cargo.toml/package.json first

Now go build. Every 10 minutes, pick the next item and ship it.
