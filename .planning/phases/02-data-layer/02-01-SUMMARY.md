---
phase: 02-data-layer
plan: 01
subsystem: api
tags: [nextjs, drizzle, postgres, crud, rest, seed, server-only]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Drizzle schema, DB connection, task types, horizon math
provides:
  - CRUD API routes (GET list, POST, GET single, PATCH, DELETE) at /api/tasks
  - Destructive seed script with 36 representative tasks via npm run db:seed
  - server-only guard on DB module
affects: [02-data-layer (plan 02 store hydration), 03-3d-scene, 05-ai-parse, 06-mutations]

# Tech tracking
tech-stack:
  added: [server-only]
  patterns: [REST CRUD routes with { error, code } error shape, Next.js 16 async params, destructive seed with relative date computation]

key-files:
  created:
    - src/app/api/tasks/route.ts
    - src/app/api/tasks/[id]/route.ts
    - src/db/seed.ts
  modified:
    - src/db/index.ts
    - package.json

key-decisions:
  - "Seed script creates its own DB pool to bypass server-only guard in db/index.ts"
  - "npm run db:seed uses node --env-file=.env.local --import=tsx for env var loading"
  - "Error shape standardized as { error: string, code: string } with codes INTERNAL_ERROR, VALIDATION_ERROR, TASK_NOT_FOUND"
  - "PATCH strips unknown fields via allowlist of updatable columns"

patterns-established:
  - "API error shape: { error: string, code: string } with appropriate HTTP status"
  - "Next.js 16 params pattern: params is Promise, must await inside handler"
  - "Seed scripts bypass server-only by creating standalone DB pool"

# Metrics
duration: 5min
completed: 2026-02-27
---

# Phase 2 Plan 1: CRUD API + Seed Summary

**REST CRUD routes for tasks at /api/tasks with server-only guard and 36-task destructive seed script spanning all 6 horizons**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-27T07:33:43Z
- **Completed:** 2026-02-27T07:38:15Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Five API endpoints (GET list, POST create, GET single, PATCH update, DELETE remove) with proper status codes and error shapes
- Destructive seed script producing 36 realistic tasks across all 6 horizons with organic distribution of special states
- server-only guard on DB module preventing accidental client-side import

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CRUD API route handlers and add server-only guard** - `8e5e3b2` (feat)
2. **Task 2: Create destructive seed script with ~35 representative tasks** - `783575a` (feat)

## Files Created/Modified
- `src/app/api/tasks/route.ts` - GET (list all) and POST (create) handlers
- `src/app/api/tasks/[id]/route.ts` - GET (single), PATCH (update), DELETE (remove) handlers
- `src/db/seed.ts` - Destructive seed script inserting 36 tasks with relative date computation
- `src/db/index.ts` - Added server-only import as first line
- `package.json` - Added server-only dep, updated db:seed script for env loading

## Decisions Made
- Seed script creates its own standalone DB pool instead of importing from `./index` to avoid the `server-only` guard that blocks non-Next.js execution contexts
- Updated `db:seed` npm script to use `node --env-file=.env.local --import=tsx` instead of bare `tsx` to ensure DATABASE_URL loads from .env.local
- PATCH handler uses an explicit allowlist of updatable fields rather than passing body directly to Drizzle

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Seed script bypasses server-only guard with standalone DB pool**
- **Found during:** Task 2 (seed script creation)
- **Issue:** `server-only` package throws when imported outside Next.js server context; `tsx src/db/seed.ts` is not a Next.js server context
- **Fix:** Seed script creates its own `Pool` + `drizzle()` instance directly instead of importing from `./index`
- **Files modified:** src/db/seed.ts
- **Verification:** `npm run db:seed` runs successfully
- **Committed in:** 783575a (Task 2 commit)

**2. [Rule 3 - Blocking] Updated db:seed npm script for env var loading**
- **Found during:** Task 2 (seed script creation)
- **Issue:** `tsx` does not auto-load `.env.local` files; DATABASE_URL was undefined causing connection failure
- **Fix:** Changed npm script from `tsx src/db/seed.ts` to `node --env-file=.env.local --import=tsx src/db/seed.ts`
- **Files modified:** package.json
- **Verification:** `npm run db:seed` loads DATABASE_URL and connects successfully
- **Committed in:** 783575a (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for seed script to function. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- API routes ready for store hydration (Plan 02-02)
- Seed data provides 36 tasks for 3D scene rendering (Phase 3)
- All 6 tag categories and special states represented for visual testing
- camelCase field names confirmed in API responses

---
*Phase: 02-data-layer*
*Completed: 2026-02-27*
