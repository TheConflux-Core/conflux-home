#!/usr/bin/env bash
# backup_memory.sh — Git-based memory backup
# Usage: bash backup_memory.sh [workspace_dir] [commit_message]

set -euo pipefail

WORKSPACE="${1:-$HOME/.openclaw/workspace}"
MSG="${2:-"memory: periodic backup $(date -u '+%Y-%m-%d %H:%M UTC')"}"

cd "$WORKSPACE"

# Check if git repo
if [[ ! -d ".git" ]]; then
  echo "ERROR: No git repo at $WORKSPACE"
  echo "Run: git init && git remote add origin <url>"
  exit 1
fi

# Stage memory files only
git add MEMORY.md memory/ 2>/dev/null || true

# Check if there are changes
if git diff --cached --quiet; then
  echo "No memory changes to backup."
  exit 0
fi

# Show what's being backed up
echo "=== Memory Backup ==="
git diff --cached --stat
echo ""

# Commit and push
git commit -m "$MSG"
git push origin "$(git branch --show-current)" 2>/dev/null || echo "WARNING: push failed (no remote?)"

echo ""
echo "Backup complete: $(git log --oneline -1)"
