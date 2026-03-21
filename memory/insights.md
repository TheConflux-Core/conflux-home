# Insights & Patterns

## Technical Patterns
- **Cron chaining works** — Staggering jobs 10-15 min apart creates effective pipelines without event-driven triggers
- **50/50 prompt split** — Generating 100 prompts in one 15-min session risks timeout. Two passes of 50 is safer.
- **gogcli file keyring bug (#377)** — Tokens corrupt over time on Linux. Must re-auth periodically. Consider service account as permanent fix.
- **UTC timezone trap** — Calendar events need explicit local timezone (`-06:00`) or RRULE interprets wrong day
- **Node version matters** — openclaw CLI requires Node v22+ (`nvm use 22`)
- **CSS > R3F for orbital animation** — CSS + requestAnimationFrame cleaner and more reliable than Three.js for 2D orbital systems
- **R3F JSX `<line>` conflict** — Three.js Line conflicts with SVG line in JSX; use imperative `new THREE.Line()` instead
- **Vercel token types** — `vck_` tokens are CLI-only; API calls need `vca_` tokens from auth.json
- **Vercel env var API** — Returns `{created: {...}, failed: []}` not a direct object; parse accordingly
- **Pipeline cron vs code deploys** — Cron running every minute can race with code pushes; script must only `git add` its own file
- **`styled-jsx` unavailable in App Router** — Use standard `<style>` tags for CSS keyframes in Next.js App Router

## User Preferences
- **Don manages openclaw.json manually** — Never modify it via scripts
- **All agents use Hunter Alpha** — Default model for everything
- **No forced answers** — Discovery engine must be merit-based, not hand-fed
- **Retry > Wait** — If QA fails, fix immediately, don't wait for next day cycle
- **Currency format** — Always use `$X.XX` with cents (toFixed(2))

## Error Resolutions
- **gog auth "aes.KeyUnwrap(): integrity check failed"** — Known bug, re-auth fixes it. Ensure GOG_KEYRING_PASSWORD is set on every command.
- **Cron `--prompt-file` unknown** — Use `--message` with file path embedded in the message text
- **openclaw cron update** — Doesn't exist. Use `openclaw cron edit <id> --cron '...'`

## Workflow Optimizations
- **Buffer workflow already existed** — Always search before building. `scripts/send_buffer_queue.py` + `shared/marketing/buffer_publish_queue.jsonl`
- **Social post drafts per product** — `products/product-XXXX/marketing/social-linkedin.md` and `social-x.md`
- **Pulse generates social drafts** — Auto-creates LinkedIn (5 posts) and X (10 posts) for each new product
- **ZigBot monitoring as training wheels** — Two checkpoints during pipeline run. Remove once proven.
- **Affiliate verification flows** — FlexOffers needs meta tag + HTML file; AWIN needs recovery code saved
- **Domain linking on Vercel** — Works instantly with custom domains, no DNS propagation delay
- **Daily content pipelines** — 10-job chain for AudioRecordingSchool: create → review → format → image → SEO → queue → publish
- **Save recovery codes immediately** — AWIN recovery code (Y89AWYEY9PV4LZ2YPGGHMYAJ) saved to TOOLS.md and MEMORY.md
- **Affiliate approval timing** — FlexOffers and AWIN typically take 3-5 business days

## Workflow Optimizations
- **Collapsible group headings for schedule board** — Group schedules by `relatedMission`, default collapsed, arrow rotation indicates state, selected badge shows highlighted task within group.
- **Block-specific dropdowns** — Replace generic mission filter with three dropdowns each listing only that block's tasks, enabling quick navigation without filtering the entire board.
- **Agent name capitalization consistency** — Update root `agent` field and `payload.displayName` in cron jobs JSON to ensure proper display across dashboard.
- **Google Calendar integration for daily blocks** — Recurring 3-hour event (5:00–8:00 AM) for digital product line work, color-coded green.

## Technical Patterns
- **Cronjobs schedule multiple blocks** — Each block contains 10 sequential steps with proper agent assignment; steps run within 60-minute windows with appropriate timeouts.
- **Memory steward audit workflow** — Session mining, daily log updates, insights promotion, and hygiene checks ensure continuity and learning across sessions.
## Error Resolutions
- **Forge prompt truncation** — Outputting all 100 prompts in model response gets truncated. Solution: exec with bash heredocs in batches of 10.
- **Helix hollow "discovered" opps** — Old cron runs skipped research+scoring, creating empty stubs. Solution: rewritten prompt forces full workflow ending at "scored" status.
- **Cat fast heartbeat too narrow** — `*/5 5-6 * * *` only fired during 5-6 AM. Off-hours pipeline runs had no driver. Fix: `*/5 0-22 * * *`.

## Workflow Optimizations
- **Catalyst replaces 6 fixed crons** — One agent driver (Cat) with chaining logic replaces Vector/Prism/Spectra/Forge/Quanta/Pulse crons. Fewer moving parts, faster execution.
- **Pipeline v3 architecture** — 4 total crons: Helix kickoff, Cat fast (all day), Cat overnight (11 PM), Dream Cycle. Pipeline event-driven, not clock-driven.
- **Cat's AGENTS.md as operational spec** — Full chaining logic, failure handling, agent trigger messages all in one file. Single source of truth for Cat's behavior.
- **Pulse "launch_ready" not "published"** — Don publishes manually after receiving Gumroad link. Pulse marks launch_ready, Don sends URL, ZigBot marks published.

## Strategic Insights
- **Don's vision: "We should ALWAYS dream bigger than ANYONE"** — Billions of agents, billions of businesses, one conflux.
- **theconflux.com as the flagship** — Branded consulting/agency site with live agent status indicator showing real pipeline activity.
- **Focus beats sprawl** — Finish current work before adding new initiatives. Only the human operator can override focus discipline.
