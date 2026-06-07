# Security Policy

## Secrets Management

### Rules
1. **NEVER commit API keys, tokens, or secrets** to git — not even in history
2. **All secrets go in `.env` files** which are gitignored
3. **Use `.env.example`** to document required variables (with placeholder values)
4. **Rotate any key** that was accidentally committed — treat it as compromised

### Environment Files
| File | Purpose | Tracked? |
|------|---------|----------|
| `.env.example` | Template for required env vars | ✅ Yes |
| `.env` | Local dev secrets | ❌ No (gitignored) |
| `.env.local` | Local overrides | ❌ No (gitignored) |
| `.env.router` | Router API keys | ❌ No (gitignored) |
| `.env.router.example` | Router template | ✅ Yes |
| `src-tauri/.env` | Tauri backend secrets | ❌ No (gitignored) |

### Pre-commit Hook
A gitleaks pre-commit hook is installed to prevent secret commits:
```bash
# Install (one-time):
gitleaks protect --pre-commit --staged
```

### If You Accidentally Commit a Secret
1. **Rotate the key immediately** — it's compromised
2. **Remove from git history** using `git filter-repo`
3. **Notify the team** so they update their local `.env` files

### CI Security
GitHub Actions runs `gitleaks detect` on every PR. PRs with secrets will be blocked.

## Reporting Security Issues
Contact Don Ziglioni directly. Do NOT open public GitHub issues for security vulnerabilities.
