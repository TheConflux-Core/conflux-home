# Conflux Admin Panel — Project Scope

## Overview
Local admin panel for monitoring the Conflux Router API platform. Accessible via Twingate (not public-facing). Built on the existing Next.js app at theconflux.com.

## Security Architecture
- **API Routes:** All Supabase queries go through `/api/admin/*` server-side routes using service role key
- **NO client-side Supabase admin:** Service role key NEVER sent to browser
- **Auth:** Basic HTTP auth middleware (username/password via env vars: `ADMIN_USER`, `ADMIN_PASS`)
- **Network:** Localhost + Twingate only — no public exposure

## Pages

### 1. Overview Dashboard (`/admin`)
- **KPI Cards (6):** Total Users, Active Subscriptions, MRR, Credits Consumed, API Calls (24h), Error Rate (24h)
- **Revenue Chart:** 30-day area chart (daily revenue from credit_transactions)
- **Provider Distribution:** Donut chart (requests by provider, last 7 days)
- **Top 10 Models:** Table sorted by requests (30d)
- **Recent Activity:** Last 20 transactions

### 2. Users (`/admin/users`)
- Search by email/user_id
- Filter by plan (free/power/pro)
- Table: email, plan, credits remaining, credits used, joined, last active
- Expandable row: subscription details, recent usage

### 3. Transactions (`/admin/transactions`)
- Filterable by type (purchase/usage/adjustment/grant)
- Searchable by user_id or description
- Paginated (50/page, infinite scroll)
- Summary row: total amounts by type

### 4. Analytics (`/admin/analytics`)
- Usage by model (bar chart, 30d)
- Usage by provider (pie chart, 7d)
- Daily API calls trend (line chart, 30d)
- Latency distribution (if data available)
- Token throughput over time

### 5. Providers (`/admin/providers`)
- List all providers with status indicators
- Edit: enabled/disabled toggle, priority, rate limits
- Base URL display
- Last updated timestamp

### 6. Subscriptions (`/admin/subscriptions`)
- Filter by plan/status
- Table: user, plan, status, credits included, credits used, usage %, reset date
- MRR calculation per row
- Status badges (active/cancelled/past_due)

### 7. System Config (`/admin/config`)
- Credit costs per model tier (view/edit)
- Plan credit allocations (view/edit)
- Provider priority ordering
- Credit pack pricing

## API Routes (all server-side)

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/admin/overview` | GET | KPIs, revenue, providers, models, recent txns |
| `/api/admin/users` | GET | User list with search/filter |
| `/api/admin/transactions` | GET | Transaction log with pagination/filter |
| `/api/admin/analytics` | GET | Usage breakdowns by model/provider/time |
| `/api/admin/providers` | GET/PUT | Provider list + toggle enabled/priority |
| `/api/admin/subscriptions` | GET | Subscription list with plan/status filter |
| `/api/admin/config` | GET/PUT | Credit configs + plan settings |

## Tech Stack
- Next.js 16 (App Router)
- Tailwind CSS 4
- Recharts 3.8 (charts/graphs)
- Supabase JS Client (server-side only)
- TypeScript

## Files to Delete (previous hallucinated build)
- All existing `/admin/` files (replacing with clean implementation)

## Files to Create
- 7 API route files
- 7 page files
- 1 layout
- 1 CSS file
- 1 types file
- 1 auth middleware

## Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` (already set)
- `SUPABASE_SERVICE_ROLE_KEY` (add to .env.local)
- `ADMIN_USER` (admin username)
- `ADMIN_PASS` (admin password)
