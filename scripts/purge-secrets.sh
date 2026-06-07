#!/bin/bash
# ============================================================
# PURGE SECRETS FROM GIT HISTORY
# ⚠️  THIS REWRITES ALL COMMIT HASHES — FORCE PUSH REQUIRED
# ⚠️  Run from the conflux-home repo root
# ============================================================

set -euo pipefail

REPO_DIR="/home/calo/.openclaw/workspace/conflux-home"
cd "$REPO_DIR"

echo "=== Pre-flight checks ==="
echo "Current branch: $(git branch --show-current)"
echo "Remote: $(git remote get-url origin)"
echo "Commits: $(git rev-list --count HEAD)"
echo ""

# Create a backup branch
BACKUP="backup/pre-secrets-purge-$(date +%Y%m%d-%H%M%S)"
git branch "$BACKUP"
echo "✅ Backup branch created: $BACKUP"
echo ""

echo "=== Running git-filter-repo ==="

# Method 1: Replace known secret patterns with REDACTED
# This targets specific key formats found by gitleaks
git filter-repo --replace-text <(cat <<'PATTERNS'
***REMOVED***
STRIPE_LIVE_KEY_REDACTED ==> STRIPE_LIVE_KEY_REDACTED
# Stripe test keys
STRIPE_TEST_KEY_REDACTED ==> STRIPE_TEST_KEY_REDACTED
***REMOVED***
STRIPE_PRICE_ID_REDACTED ==> STRIPE_PRICE_ID_REDACTED
***REMOVED***
OPENROUTER_KEY_REDACTED ==> OPENROUTER_KEY_REDACTED
***REMOVED***
ELEVENLABS_KEY_REDACTED ==> ELEVENLABS_KEY_REDACTED
***REMOVED***
MINIMAX_KEY_REDACTED ==> MINIMAX_KEY_REDACTED
***REMOVED***
gsk_[a-zA-Z0-9]{40,} ==> GROQ_KEY_REDACTED
***REMOVED***
sk-ant-api03-[a-zA-Z0-9_-]{40,} ==> ANTHROPIC_KEY_REDACTED
***REMOVED***
sk-proj-[a-zA-Z0-9_-]{40,} ==> OPENAI_KEY_REDACTED
***REMOVED***
CLOUDFLARE_KEY_REDACTED ==> CLOUDFLARE_KEY_REDACTED
# Mistral keys (pattern: 32+ alphanumeric)
***REMOVED***
whsec_[a-zA-Z0-9]{32,} ==> WEBHOOK_SECRET_REDACTED
# Generic long hex/base64 JWT-like tokens (ey...)
PATTERNS
) --force

echo ""
echo "=== Removing .env.router from history ==="
git filter-repo --path .env.router --invert-paths --force

echo ""
echo "=== Removing memory/ secrets from history ==="
git filter-repo --path memory/ --invert-paths --force

echo ""
echo "=== Removing test scripts with secrets from history ==="
git filter-repo --path test_api_key_generation.ts --invert-paths --force
git filter-repo --path delete_user.mjs --invert-paths --force
git filter-repo --path seed_test_data.mjs --invert-paths --force

echo ""
echo "✅ Filter-repo complete!"
echo ""
echo "=== Post-cleanup ==="
echo "New commit count: $(git rev-list --count HEAD)"
echo ""
echo "NEXT STEPS:"
echo "1. Verify with: gitleaks detect --source . --report-path /tmp/post-cleanup.json"
echo "2. Force push:  git push origin main --force"
echo "3. Notify collaborators to re-clone"
echo ""
echo "⚠️  DO NOT push until Don approves!"
