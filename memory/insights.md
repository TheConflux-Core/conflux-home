# Agent Insights — Medium-Term Memory

Accumulated patterns, lessons, and learnings from sessions. Organized by category.

## Technical Patterns

- **Tailwind v4 Migration**: Configuration lives in CSS `@theme` block, not `tailwind.config.ts`. The config file is ignored by v4. Use `@import "tailwindcss"` and `@plugin` directives.
- **Next.js AdSense Integration**: Use `next/script` component with `strategy="afterInteractive"`. Also need meta tag via metadata API `other` field and `ads.txt` in `public/`.
- **Git Push Mandatory**: Every Forge run MUST end with `git add -A && git commit && git push origin master` — no exceptions.
- **Node Version**: System default is Node 18 at `/usr/bin/node`. Need to set PATH to use nvm's Node 22: `export PATH="/home/calo/.nvm/versions/node/v22.22.0/bin:$PATH"`.

## User Preferences

- **Currency Format**: Always use cents via `toFixed(2)`. Large round numbers use "$1.2M" style.
- **Direct Responses**: Don prefers actionable responses over lengthy explanations.
- **Verification Required**: Never simulate tool outputs or system state. Always verify with real commands.
- **Late Night Active**: Don often works 12-6 AM MST.
- **Channel Delivery**: Prefers channel delivery over DM for agent communications.

## Error Resolutions

- **JSX.Element Type Error**: In React 19/Next.js 16, `JSX.Element` is not a global namespace. Use `React.ReactElement` or `React.ReactNode` instead.
- **Git Auth**: `gh auth setup-git` needed for HTTPS push to work after GitHub token setup.
- **Vercel Auth Wall**: Staging deployments may require Vercel login. Dashboard URL is more reliable than direct staging URL.

## Workflow Optimizations

- **Audit Script**: Run `skills/memory-steward/scripts/audit_memory.sh` for quick memory health check.
- **QMD Status**: QMD binary is installed but returns no version. Search uses built-in SQLite fallback.
- **Memory Search**: Configured with hybrid search (0.7 vector + 0.3 BM25). Local provider.

## Venture Studio Learnings

- **Mission-0200**: audiorecordingschool.net domain asset workflow validated the full pipeline (intake → eval → plan → build → QA → deploy).
- **Monetization Setup**: Amazon Associates (donziglioni-20), Beatport group (a_aid=61ecdbcd0bb85), AdSense (ca-pub-9010847486693166).
- **SEO Foundation**: Google Search Console + Bing Webmaster Tools verified. Sitemap submitted, 17 pages indexed.
