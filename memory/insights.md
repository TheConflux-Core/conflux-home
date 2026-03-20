# Insights & Patterns

## Technical Patterns
- **Cron chaining works** — Staggering jobs 10-15 min apart creates effective pipelines without event-driven triggers
- **50/50 prompt split** — Generating 100 prompts in one 15-min session risks timeout. Two passes of 50 is safer.
- **gogcli file keyring bug (#377)** — Tokens corrupt over time on Linux. Must re-auth periodically. Consider service account as permanent fix.
- **UTC timezone trap** — Calendar events need explicit local timezone (`-06:00`) or RRULE interprets wrong day
- **Node version matters** — openclaw CLI requires Node v22+ (`nvm use 22`)

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