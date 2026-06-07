# Security Cleanup Log — conflux-home

**Date:** 2026-06-07
**Initiated by:** Don Ziglioni
**Executed by:** ZigBot + Viper findings

---

## Phase 1: Inventory ✅

**Gitleaks scan result:** 56 secrets found across git history (1009 commits scanned)

### Currently Tracked Files with Secrets (FIXED in Phase 2):
| File | Secret Type | Status |
|------|------------|--------|
| `scripts/test-elevenlabs-wss.js` | ElevenLabs API key hardcoded | ✅ Removed — now uses env var |
| `src-tauri/scripts/test-elevenlabs-wss.js` | Same ElevenLabs key (copy) | ✅ Removed — now uses env var |
| `src-tauri/schema.sql` | Groq, Mistral, Cloudflare keys in seed INSERT | ✅ Replaced with placeholders |
| `MEMORY_ARCHIVE_2026-06-05.md` | MiniMax API key | ✅ Redacted |

### Secrets in Git History Only (removed from working tree):
| File | Secret Type | Status |
|------|------------|--------|
| `src-tauri/tests/integration.rs` | OpenAI + Anthropic keys | Was removed in commit `7f598e24` |
| `memory/2026-03-28-stripe-webhook-setup.md` | Stripe test key | Not tracked (deleted) |
| `memory/2026-04-01-stripe-live-migration.md` | Stripe price ID | Not tracked (deleted) |
| `memory/2026-03-28-financial-inventory.md` | OpenRouter key | Not tracked (deleted) |
| `memory/2026-03-30-model-pricing-audit.md` | JWTs | Not tracked (deleted) |
| `memory/2026-04-03-conflux-real.md` | Cloudflare keys (x4) | Not tracked (deleted) |
| `test_api_key_generation.ts` | JWTs | Not tracked (deleted) |
| `delete_user.mjs` | JWT | Not tracked (deleted) |
| `seed_test_data.mjs` | JWT | Not tracked (deleted) |
| `model-catalog/` | Anthropic keys | Not tracked (deleted) |
| `.env.router` | Groq, Mistral, Cloudflare keys | Not tracked (deleted) |

### Build Artifacts (gitignored):
- `src-tauri/target/` — contains copies of secrets from build process
- `src-tauri/gen/android/` — ElevenLabs key copied into Android build

---

## Phase 2: Remove Secrets from Tracked Files ✅

**Actions taken:**
1. `scripts/test-elevenlabs-wss.js` — Removed hardcoded key, now requires `ELEVENLABS_API_KEY` env var
2. `src-tauri/scripts/test-elevenlabs-wss.js` — Same fix (duplicate file)
3. `src-tauri/schema.sql` — Replaced 4 hardcoded API keys with `REPLACE_*` placeholders
4. `MEMORY_ARCHIVE_2026-06-05.md` — Redacted MiniMax API key

**Verified:** `grep -rn` on source files shows zero real secrets remaining.

---

## Phase 3: Git History Cleanup ⏳ PENDING DON'S APPROVAL

**Plan:** Use `git-filter-repo` to purge secrets from all git history.

**What will be purged:**
- API key patterns: `sk_live_*`, `sk_test_*`, `sk_*`, `sk-or-v1*`, `gsk_*`, `sk-cp-*`
- Stripe keys, webhook secrets, JWTs
- The `.env.router` file (was committed then deleted)

**⚠️ THIS REWRITES GIT HISTORY — REQUIRES FORCE PUSH**
- All commit hashes will change
- Anyone with existing clones will need to re-clone
- GitHub deploy keys / CI may need reconfiguration

---

## Phase 4: Key Rotation Checklist ⏳ PENDING DON'S ACTION

After history is cleaned, these keys MUST be rotated (they were exposed publicly):

| Service | Key Type | How to Rotate |
|---------|----------|---------------|
| **Stripe** | Live secret key (`STRIPE_LIVE_KEY_REDACTED...`) | Dashboard → Developers → API Keys → Roll key |
| **Stripe** | Webhook secret (`whsec_PcWLf...`) | Dashboard → Developers → Webhooks → Signing secret |
| **ElevenLabs** | API key (`sk_8ab82e...`) | Profile → API Keys → Regenerate |
| **MiniMax** | API key (`sk-cp-Axy...`) | Portal → API Keys → Create new |
| **Groq** | API key (`gsk_hjKso...`) | Console → API Keys → Create new |
| **Mistral** | API key (`H24a3c...`) | Console → API Keys → Create new |
| **Cloudflare** | API key (`cfut_Ufh...`) | Dashboard → My Profile → API Tokens → Create new |
| **Cloudflare** | Account ID (`36d37d...`) | Dashboard → right sidebar → Account ID |
| **OpenRouter** | API key (`sk-or-v1...`) | Settings → API Keys → Create new |
| **OpenAI** | Project API key (`sk-proj-...`) | Platform → API Keys → Create new |
| **Anthropic** | API key (`sk-ant-...`) | Console → API Keys → Create new |

---

## Phase 5: Harden Going Forward ⏳

- [x] `.gitignore` updated with comprehensive patterns
- [ ] Pre-commit gitleaks hook
- [ ] CI check (GitHub Actions) for secret scanning
- [ ] `SECURITY.md` documentation
