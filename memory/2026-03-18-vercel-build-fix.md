# 2026-03-18 — Vercel Build Fix Session

## Session Summary
Fixed a stubborn Vercel build failure on the lead-followup-app (mission-0006). The app was live from last night's GitHub import but broke on a new build this morning.

## Root Causes Found & Fixed

### 1. Node.js Version (`.nvmrc`)
- Project had no `.nvmrc` or `engines` field
- Vercel defaulted to older Node, Next.js 15 requires >= 20.9.0
- **Fix:** Added `.nvmrc` (22) and `engines` field in package.json

### 2. Client Reference Manifest ENOENT
- Error: `ENOENT: no such file or directory, lstat '/vercel/path0/.next/server/app/(public)/page_client-reference-manifest.js'`
- Root page imported from `(public)/page` via cross-route-group reference
- Next.js 15's build tracer couldn't resolve the manifest path
- **Fix:** Extracted landing page to `src/components/LandingPage.tsx`. Removed `(public)/page.tsx` entirely. Root page is now the only landing page.

### 3. Supabase Env Vars Missing at Build Time
- Auth pages, API routes, middleware all called `createServerClient()` which used `!` assertions on env vars
- During build (no env vars), this crashed
- **Fix:** Made `createClient()` return null when env vars missing. Created `requireServerClient()` for runtime API routes. Updated middleware, auth pages, callback route to handle null gracefully.

### 4. Multiple Lockfiles Warning
- `/home/calo/package-lock.json` confused Vercel's output file tracing
- **Fix:** Added `outputFileTracingRoot: __dirname` to `next.config.ts`

### 5. Old Vercel Project Cache
- The original project had cached state from Node 18 builds
- Don deleted the project and created fresh import — combined with code fixes, build succeeded

## Deployment
- **URL:** `https://lead-followup-bvkg9uoha-theconflux303-2630s-projects.vercel.app`
- Vercel token with admin permissions was provided (vcp_4C3f...)
- Deployed via `vercel --prod --yes --token <token>`

## Key Files Changed
- `.nvmrc` — Node 22
- `package.json` — added engines field
- `next.config.ts` — added outputFileTracingRoot
- `src/components/LandingPage.tsx` — extracted from (public)/page.tsx
- `src/app/page.tsx` — now the only root page (imports LandingPage)
- `src/app/(public)/page.tsx` — DELETED
- `src/lib/supabase/client.ts` — returns null when env vars missing
- `src/lib/supabase/server.ts` — returns null, added requireServerClient()
- `src/lib/supabase/middleware.ts` — skips auth when env vars missing
- `src/lib/auth.ts` — handles null supabase client
- `src/app/(auth)/callback/route.ts` — handles null client
- All API routes — switched from createServerClient to requireServerClient
- Auth pages (login, signup, forgot-password) — lazy client creation
- `src/app/onboarding/page.tsx` — removed unused supabase import

## Notes
- Redis (BullMQ) ECONNREFUSED errors during build are non-fatal noise
- Vercel env vars still need to be added for the app to function at runtime
- Webhook URLs (Twilio, Stripe) need to be updated to new deployment URL
