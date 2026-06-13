# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**KasirKu** — an Indonesian POS (Point of Sale) web app at [kasirku.biz.id](https://kasirku.biz.id). Multi-tenant, supporting cafes/retail with menu management, stock tracking, transaction processing, expense tracking, analytics, and promotions. PWA with offline support.

## Commands

```bash
pnpm dev          # Development server (Next.js)
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # ESLint
```

No test runner is configured yet (`pnpm test` does not exist). Rate-limit test scripts exist but are `.gitignore`d (they contain credentials).

## Project Skills

This repo includes agent skills for Supabase — invoke via `/skill-name` or `Skill` tool:

- **`supabase`** — Use for any Supabase task: Database, Auth, Edge Functions, Realtime, Storage, SSR, RLS, migrations, CLI/MCP. Always verify against current changelog before implementing.
- **`supabase-postgres-best-practices`** — Postgres performance optimization: indexing, query patterns, schema design, connection management, locking, monitoring. Apply when writing/optimizing SQL queries or schema changes.

Both installed at `.agents/skills/`.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui (New York style) + Framer Motion
- **Package manager**: pnpm (lockfile is `pnpm-lock.yaml`)
- **Database**: Supabase PostgreSQL (migrated from Cloudflare D1/SQLite)
- **Auth**: Supabase Auth — `@supabase/ssr` for server-side, `@supabase/supabase-js` for client
- **State**: React Context (Auth, Cart, Loading) + SWR for server-state caching
- **Image storage**: Cloudflare R2 (S3-compatible via `@aws-sdk/client-s3`)
- **Rate limiting**: Redis sliding-window
- **Hosting**: Vercel
- **Time zone**: Asia/Jakarta (GMT+7) — enforced in `next.config.mjs` and `lib/format.ts`

## Architecture

### Request flow

```
Browser → Vercel Edge → proxy.ts (middleware) → App Router → API Routes → Supabase
```

`proxy.ts` is the **sole middleware** (no separate `middleware.ts`). It:
1. Passes through static files and public routes (`/login`, `/signup`, `/api/auth/*`, etc.)
2. Exchanges Supabase cookies via `@supabase/ssr` `createServerClient`
3. Redirects unauthenticated users to `/login?redirect=<path>`
4. Sets `Cache-Control: no-store, max-age=0` on all API routes (POS data must always be fresh), except `/api/image-proxy` which gets 1-hour cache

### Multi-tenancy

Data is scoped by `cafe_id` (integer, references `cafes` table). Every API request and DB query must filter by `cafe_id`. The user's `cafe_id` comes from their `user_profiles` record.

### Roles

Three roles defined as a PostgreSQL enum: `superadmin`, `admin`, `cashier`.
- **superadmin**: platform-wide access, can see all cafes/users
- **admin**: cafe owner — full access to their cafe
- **cashier**: restricted — POS + transactions only, hidden nav links for reports/expenses/promotions/statistics

Server-side role checks via `requireRole()` in `lib/auth-server.ts`. Client-side via `AppShell` nav link filtering.

### API structure

```
app/api/
├── auth/          # login, signup, logout, me, forgot-password, reset-password, callback
├── rest/          # CRUD REST endpoints — menu, transactions, transaction_items, product_variants, users
├── cafes/         # Cafe management (superadmin)
├── cafe_settings/ # Per-cafe settings
├── categories/    # Category CRUD + reorder
├── finance/       # Expenses, targets, summary
├── notifications/ # Push notification processing
├── promotions/    # Promotion CRUD
├── push-subscriptions/  # Web push subscription management
├── stock/         # Stock mutations + opname
├── upload/        # Image upload to R2
└── image-proxy/   # Proxies R2 images with caching
```

`lib/api.ts` is the client-side API wrapper — all frontend code calls these functions, never raw `fetch`. It maps snake_case DB fields to camelCase TypeScript interfaces. Types are defined in `types.ts` at the project root.

### Data layer

- **`lib/supabase-server.ts`**: `supabaseAdmin` (service_role client for server-only operations) + `getAuthenticatedUser()` which reads cookies via `next/headers` then fetches the user profile from `user_profiles`
- **`lib/auth-server.ts`**: Alternative `getAuthenticatedUser()` with in-memory caching (5s TTL, LRU eviction at 100 entries). Used by newer API routes.
- **`lib/auth-context.tsx`**: Client-side AuthContext — manages `user`, `userData`, `loading`, `signIn`, `signUp`, `signOutUser`. Guards against concurrent `checkSession()` calls and throttles re-checks on tab focus to avoid token-refresh storms.
- **`lib/fetch-client.ts`**: Fetch wrapper with 30s timeout, connection quality tracking (moving-average latency, Network Information API integration), user-facing error messages in Indonesian.
- **SWR config** (`lib/swr-config.ts`): Global config — 60s dedup, no auto-refresh. Specialized configs for transactions (15s refresh) and static data (5min dedup).

### Key client-side patterns

- **`contexts/cart-context.tsx`**: Full POS cart state — `addToCart`, `checkout` (creates transaction via API, triggers SWR revalidation), stock-aware quantity limits, per-item discount/note.
- **`hooks/use-cafe-data.ts`**: SWR hooks for cafe settings, menu, categories, transactions — consumed throughout the app.
- **`components/app-shell.tsx`**: Main layout wrapper — sidebar nav, user dropdown, notification bell, status indicator. Used by all authenticated pages.
- **`lib/promo-matcher.ts`**: Client-side promo rules engine — evaluates cart items against active promotions (percent/flat, min-subtotal thresholds, category/item targeting).

### Database notes

- Migrations are in `migrations/` (applied to Supabase) and `supabase/migrations/`.
- The old `schema.sql` is a SQLite dump from the D1 era — **not** the active PostgreSQL schema. The active schema lives on Supabase; reference it via the Supabase MCP tools or the docs in `docs/database-schema.md`.
- `types/supabase.ts` is the generated Supabase Database type (42KB) — import `Database` from there when typing Supabase queries.
- Snake_case in DB, camelCase in TypeScript. API routes handle mapping. Some older code and `types.ts` carry both variants to handle transitional states.
- Soft deletes: most tables have `deleted_at` columns. Queries should filter `WHERE deleted_at IS NULL`.

### API route conventions

- All API routes must authenticate the user and extract `cafe_id` from their profile.
- Use `cafeId` from the authenticated user (never trust a client-supplied `cafe_id` for writes).
- Response format: `{ success: boolean, data?: T, error?: string }`.
- Set `Cache-Control: no-store` on responses (inherited from proxy.ts, but be explicit in route handlers too).

### Important constraints

- The `.env` file is in `.gitignore`. Use `.env.example` for reference.
- `typescript.ignoreBuildErrors: true` in `next.config.mjs` — the project builds despite TS errors. Fix TS errors when you encounter them, but the build won't block you.
- Image optimization is enabled (`unoptimized: false`) with aggressive caching (1 year minimum TTL).
- All dates/times should use Asia/Jakarta (GMT+7). `lib/format.ts` provides `getJakartaNow()`.
- The app is Indonesian-language throughout. UI strings, error messages, and user-facing text are in Bahasa Indonesia.
- Currency formatting always in IDR using `Intl.NumberFormat("id-ID")`.
