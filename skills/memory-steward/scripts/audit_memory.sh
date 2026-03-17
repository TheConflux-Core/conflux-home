#!/usr/bin/env bash
# audit_memory.sh — Quick memory file stats and age report
# Usage: bash audit_memory.sh [workspace_dir]

set -uo pipefail

shopt -s nullglob
WORKSPACE="${1:-$HOME/.openclaw/workspace}"
MEMORY_DIR="$WORKSPACE/memory"
MEMORY_MD="$WORKSPACE/MEMORY.md"
INSIGHTS="$MEMORY_DIR/insights.md"

echo "=== Memory Audit Report ==="
echo "Date: $(date -u '+%Y-%m-%d %H:%M UTC')"
echo "Workspace: $WORKSPACE"
echo ""

# MEMORY.md stats
if [[ -f "$MEMORY_MD" ]]; then
  LINES=$(wc -l < "$MEMORY_MD")
  SIZE=$(du -h "$MEMORY_MD" | cut -f1)
  MOD=$(stat -c '%y' "$MEMORY_MD" 2>/dev/null | cut -d. -f1 || stat -f '%Sm' "$MEMORY_MD")
  echo "MEMORY.md: $LINES lines, $SIZE, last modified: $MOD"
else
  echo "MEMORY.md: NOT FOUND"
fi
echo ""

# Memory directory stats
if [[ -d "$MEMORY_DIR" ]]; then
  FILE_COUNT=$(find "$MEMORY_DIR" -name "*.md" -type f | wc -l)
  TOTAL_SIZE=$(du -sh "$MEMORY_DIR" 2>/dev/null | cut -f1)
  echo "memory/ directory: $FILE_COUNT files, $TOTAL_SIZE total"
  echo ""

  echo "--- Daily Logs ---"
  TODAY=$(date -u '+%Y-%m-%d')
  WEEK_AGO=$(date -u -d '7 days ago' '+%Y-%m-%d' 2>/dev/null || python3 -c "from datetime import date,timedelta; print((date.today()-timedelta(days=7)).isoformat())")
  MONTH_AGO=$(date -u -d '30 days ago' '+%Y-%m-%d' 2>/dev/null || python3 -c "from datetime import date,timedelta; print((date.today()-timedelta(days=30)).isoformat())")

  RECENT=0
  WEEK_OLD=0
  MONTH_OLD=0
  STALE=0

  for f in "$MEMORY_DIR"/*.md; do
    [[ -f "$f" ]] || continue
    BASENAME=$(basename "$f")
    # Extract date from YYYY-MM-DD-*.md or YYYY-MM-DD.md pattern
    if [[ "$BASENAME" =~ ^([0-9]{4}-[0-9]{2}-[0-9]{2}) ]]; then
      FILE_DATE="${BASH_REMATCH[1]}"
      if [[ "$FILE_DATE" > "$WEEK_AGO" || "$FILE_DATE" == "$WEEK_AGO" ]]; then
        ((RECENT++))
      elif [[ "$FILE_DATE" > "$MONTH_AGO" || "$FILE_DATE" == "$MONTH_AGO" ]]; then
        ((WEEK_OLD++))
      else
        ((STALE++))
      fi
    else
      # Non-dated file (like insights.md)
      LINES=$(wc -l < "$f")
      echo "  [reference] $BASENAME ($LINES lines)"
    fi
  done

  echo "  Last 7 days: $RECENT files"
  echo "  8-30 days: $WEEK_OLD files"
  echo "  30+ days (candidates for pruning): $STALE files"

  if [[ $STALE -gt 0 ]]; then
    echo ""
    echo "  Stale files:"
    for f in "$MEMORY_DIR"/*.md; do
      [[ -f "$f" ]] || continue
      BASENAME=$(basename "$f")
      if [[ "$BASENAME" =~ ^([0-9]{4}-[0-9]{2}-[0-9]{2}) ]]; then
        FILE_DATE="${BASH_REMATCH[1]}"
        if [[ ! "$FILE_DATE" > "$MONTH_AGO" && "$FILE_DATE" != "$MONTH_AGO" ]]; then
          echo "    - $BASENAME"
        fi
      fi
    done
  fi
else
  echo "memory/ directory: NOT FOUND"
fi
echo ""

# QMD status
if command -v qmd &>/dev/null; then
  echo "QMD: installed ($(qmd --version 2>/dev/null || echo 'unknown version'))"
else
  echo "QMD: not installed (search uses built-in SQLite)"
fi
echo ""

# Git backup status
if [[ -d "$WORKSPACE/.git" ]]; then
  cd "$WORKSPACE"
  LAST_COMMIT=$(git log --oneline -1 2>/dev/null || echo "no commits")
  echo "Git backup: repo exists, last commit: $LAST_COMMIT"
else
  echo "Git backup: no git repo in workspace"
fi

echo ""
echo "=== End Audit ==="
