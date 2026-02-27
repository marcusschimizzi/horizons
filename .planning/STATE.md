# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** The spatial view must make you feel your future — if the 3D scene doesn't feel meaningfully different from a list, nothing else matters.
**Current focus:** Phase 5 — Capture (In progress)

## Current Position

Phase: 5 of 7 (Capture)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-02-27 — Completed 05-01-PLAN.md

Progress: [█████████████████████░░] ~57% (12 plans of ~21 estimated total)

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: 2 min
- Total execution time: 31 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3/3 | 10 min | 3 min |
| 02-data-layer | 2/2 | 9 min | 5 min |
| 03-3d-scene | 4/4 | 5 min | 1 min |
| 04-camera | 2/2 | 5 min | 3 min |
| 05-capture | 1/3 | 2 min | 2 min |

**Recent Trend:**
- Last 5 plans: 03-04 (1 min), 04-01 (2 min), 04-02 (3 min), 05-01 (2 min)
- Trend: consistent

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
- Imperative FogExp2 via useEffect rather than declarative JSX (React 19 compatibility)
- TaskStoreContext exported from task-store.tsx for SceneInvalidator direct store subscription
- TaskSprite default color #7c8db5 for untagged tasks, ethereal lerp(#c8d6e5, 0.25) for starlight feel
- DriftCount size scaling capped at 5 drifts (max ~30% radius increase)
- Inline styles only for drei Html components (not Tailwind) — drei Html renders outside normal DOM
- WebkitBackdropFilter included for Safari backdrop-filter compatibility
- Categorical LOD split using Set lookup on cardHorizons, not camera distance
- DebugOverlay rendered as sibling to Canvas (plain DOM), not inside R3F
- TaskNode isCard variable kept explicit for Phase 4 hysteresis extension
- Vanilla Zustand store (createStore) for camera state — non-reactive getState() in useFrame avoids React re-renders
- Exponential rubber-band formula for near boundary overscroll — maxOverscroll * (1 - exp(-overscroll/maxOverscroll))
- Spring-back triggers when velocity < 0.5 while past nearBoundary (not immediately, so user feels resistance)
- SnapToPresent is a plain DOM overlay (not R3F) — rendered as sibling to Canvas, uses cameraStore subscription for visibility
- Combined damp3 on [parallaxX, parallaxY, targetZ] — single call handles parallax and scroll simultaneously
- DOM-to-Canvas invalidation bridge via cameraStore.subscribe in CameraRig — triggers invalidate() when isAnimating becomes true
- InputBubble z-index 110 above SnapToPresent z-index 100, SnapToPresent repositioned to bottom:88
- Injected style tag for CSS keyframes in inline-style-only overlay components

### Pending Todos

None.

### Blockers/Concerns

- Two open architecture questions to resolve during future phase planning:
  - Haiku JSON reliability — tool use vs raw JSON in `/api/parse`? Decide before building Phase 5 Plan 02.
  - Drift increment trigger — RSC on-load check (simplest) vs cron vs client mount. Decide before Phase 7.

## Session Continuity

Last session: 2026-02-27
Stopped at: Completed 05-01-PLAN.md (InputBubble UI shell created and wired into HorizonScene)
Resume file: None
