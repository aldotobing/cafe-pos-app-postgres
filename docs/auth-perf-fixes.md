# Auth Performance Fixes — 2026-06-05

## Problem
1. **Login felt slow and heavy** — ~1.5s of unnecessary delays
2. **503 errors during page navigation** — pages opened but API data failed

## Root Causes
- `simulatePhases()` added 1s of artificial delay (600ms + 400ms) on every login
- After login, `signIn()` called `GET /api/auth/me` redundantly — re-verifying the same JWT with Supabase GoTrue
- Every API route called `getAuthenticatedUser()` which did a fresh `supabase.auth.getUser()` (GoTrue round trip). A single page navigation fired 5+ simultaneous API calls, each hitting GoTrue independently
- Supabase returned 503 when hammered with concurrent `getUser()` calls from the same token

## Fixes

### 1. Remove artificial login delay
**File**: `app/login/page.tsx`
- Removed `simulatePhases()` function (600ms + 400ms setTimeout)
- Removed `LoadingPhase` type, `loadingPhase` state, `loadingMessages` object
- Simplified loading overlay to a simple spinner while `loading` is true

### 2. Skip redundant `/api/auth/me` after login
**Files**: `app/api/auth/login/route.ts`, `lib/auth-context.tsx`
- Login route now returns `userData` in the same shape as `/api/auth/me` (with `...profile` spread)
- `signIn()` uses the login response directly — sets `user` and `userData` state from the response instead of making a redundant GoTrue verification
- Saves ~300-500ms per login

### 3. Token-based auth cache
**File**: `lib/auth-server.ts`
- `getAuthenticatedUser()` now caches results per JWT token for 5 seconds
- When 5+ API routes fire on a single page navigation, only the first hits GoTrue — subsequent calls hit the cache
- Cache auto-prunes when it exceeds 100 entries
- Security: same isolated per-user auth; cache is keyed by the full JWT token, TTL is short (5s)

## Net Result
- **Login**: ~1.5s faster (1s artificial + ~500ms redundant GoTrue call eliminated)
- **Page navigation**: 5+ `getUser()` GoTrue calls → 1 actual call + cache hits. Eliminates 503 flood from concurrent GoTrue requests
