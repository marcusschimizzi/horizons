# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** The spatial view must make you feel your future — if the 3D scene doesn't feel meaningfully different from a list, nothing else matters.
**Current focus:** Phase 3 — 3D Scene

## Current Position

Phase: 2 of 7 (Data Layer)
Plan: 2 of 2 in current phase
Status: Phase complete
Last activity: 2026-02-27 — Completed 02-02-PLAN.md

Progress: [█████████░░░░░░░░░░░] ~25% (5 plans of ~21 estimated total)

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 4 min
- Total execution time: 19 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3/3 | 10 min | 3 min |
| 02-data-layer | 2/2 | 9 min | 5 min |

**Recent Trend:**
- Last 5 plans: 01-02 (2 min), 01-03 (4 min), 02-01 (5 min), 02-02 (4 min)
- Trend: stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Stack locked: Next.js 16 App Router, R3F 9.5.0, Drizzle 0.45.1, Zustand 5, Railway Postgres
- Canvas must use `dynamic(ssr: false)` — not just `"use client"` — or the build crashes
- Zustand store must never be imported by Server Components — hard module boundary required
- `horizon` is NOT a DB column — computed client-side from `targetDate` + `now` every render
- Railway Postgres over Neon — simpler setup, persistent Node server, one dashboard
- three@0.170.0 pinned via npm overrides to prevent duplicate bundles
- Docker Compose Postgres on port 5435 (5432 occupied by existing container)
- Next.js 16.1.6 installed (create-next-app@latest now generates v16, compatible with all deps)
- globalThis singleton pattern for DB Pool to prevent HMR connection exhaustion
- SSL enabled only in production (rejectUnauthorized: false for Railway self-signed certs)
- cuid2 text primary keys via $defaultFn in Drizzle schema
- Pool max connections set to 10
- Boundary values (1, 7, 30, 90, 365 days) inclusive to nearer horizon (<=)
- Past/overdue dates clamp to 'immediate' horizon
- Vitest for testing with TDD red-green-refactor workflow
- Seed script creates standalone DB pool to bypass server-only guard
- npm run db:seed uses node --env-file=.env.local --import=tsx for env loading
- API error shape: { error: string, code: string } with INTERNAL_ERROR, VALIDATION_ERROR, TASK_NOT_FOUND
- PATCH uses allowlist of updatable fields (strips unknown keys)
- Zustand store file must use .tsx extension (contains JSX for Context.Provider)
- Context.Provider accessed via extracted variable (Next.js 16 Turbopack namespace resolution issue)
- React 19 Context-as-JSX pattern not yet supported by Next.js 16 build toolchain

### Pending Todos

None.

### Blockers/Concerns

- Three open architecture questions to resolve during Phase 2-3 planning:
  - LOD distance threshold — at what Z-depth does TaskCard flip to TaskSprite? Expose debug slider during Phase 3.
  - Haiku JSON reliability — tool use vs raw JSON in `/api/parse`? Decide before building Phase 5.
  - Drift increment trigger — RSC on-load check (simplest) vs cron vs client mount. Decide before Phase 7.

## Session Continuity

Last session: 2026-02-27
Stopped at: Completed 02-02-PLAN.md (Zustand store + SceneLoader + page.tsx wiring — Phase 2 complete)
Resume file: None
