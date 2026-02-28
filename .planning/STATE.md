# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** The spatial view must make you feel your future — if the 3D scene doesn't feel meaningfully different from a list, nothing else matters.
**Current focus:** Phase 7 — Polish (In progress)

## Current Position

Phase: 7 of 7 (Polish)
Plan: 4 of 4 in phase
Status: Phase complete
Last activity: 2026-02-27 — Completed 07-04-PLAN.md (List View and Toggle Integration)

Progress: [██████████████████████████████] 100% (21 plans of 21 total)

## Performance Metrics

**Velocity:**
- Total plans completed: 21
- Average duration: 2 min
- Total execution time: 52 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3/3 | 10 min | 3 min |
| 02-data-layer | 2/2 | 9 min | 5 min |
| 03-3d-scene | 4/4 | 5 min | 1 min |
| 04-camera | 2/2 | 5 min | 3 min |
| 05-capture | 3/3 | ~20 min | ~7 min |
| 06-task-interactions | 3/3 | 9 min | 3 min |
| 07-polish | 4/4 | 10 min | 3 min |

**Recent Trend:**
- Last 5 plans: 07-01 (2 min), 07-02 (2 min), 07-03 (3 min), 07-04 (3 min)
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
- zodOutputFormat with messages.parse() for guaranteed schema-compliant AI extraction (no retry logic)
- Module-level Anthropic client singleton in route handler (reused across requests)
- System prompt includes dynamic today date for relative date resolution
- TaskDetail z-index 120 (panel) / 119 (backdrop) above InputBubble 110 and SnapToPresent 100
- Panel always in DOM with CSS transform toggle for smooth slide-in (no mount/unmount)
- Action buttons (Complete, Drop, Reschedule) are stubs in 06-01 — wiring deferred to 06-02
- 4-second undo window before completion PATCH persists to server
- Drop has no undo — immediate PATCH, instant shrink, clinical feel (emotionally distinct from complete)
- CompletionBurst uses delta-based timing for R3F demand frameloop compatibility
- Optimistic removal pattern: startCompletion -> animation -> finishCompletion -> removeTask
- Undo toast z-index 130 (above TaskDetail panel 120)
- Reschedule pills replace old stub button; horizon band selector between textarea and action bar
- Camera auto-pans to rescheduled horizon when >20 z-units away from current view
- damp3 position drift smooth time 0.4s for TaskNode animated group wrapper
- Dirty refs prevent spurious PATCH on panel open — auto-save only fires when user has actually edited
- Debounced auto-save pattern: 1s debounce + immediate save on blur for title and rawInput
- RSC on-load drift check chosen over cron/client-mount (simplest approach, resolves architecture question)
- targetDateLatest advanced by window duration (or 7-day minimum) to prevent double-counting
- DriftNotification z-index 105 (above SnapToPresent 100, below InputBubble 110)
- Bloom luminance threshold lowered from 1.0 to 0.15 for broader glow coverage
- Adaptive fog density: baseDensity + min(taskCount * 0.0002, 0.008)
- hardDeadline amber pulse takes priority over needsRefinement blue pulse on cards
- Deadline ring at 1.2-1.35x radius, refinement ring at 1.4-1.6x radius for visual separation on sprites
- Drift desaturation uses graduated lerp from 0.25 base to 0.7 max toward ETHEREAL_TARGET
- handleReschedule same-horizon guard removed to allow Recommit action (resetting dates within same horizon)
- Refinement fetch useEffect uses cancellation flag to prevent stale responses updating wrong task
- List view toggle button z-index 100, positioned fixed top:20 left:20
- Canvas display:none (not unmount) for list view — preserves WebGL context
- SnapToPresent hidden in list view (camera navigation irrelevant)
- ListView quick complete skips undo window — list view is for fast triage
- display:'contents' for visible Canvas wrapper — preserves layout as if wrapper doesn't exist

### Pending Todos

None.

### Blockers/Concerns

- RESOLVED: Drift increment trigger — RSC on-load check chosen (simplest). Implemented in 07-01.
- RESOLVED: Haiku JSON reliability — using zodOutputFormat with messages.parse() (GA in SDK 0.78.0). No fallback to tool use needed.

## Session Continuity

Last session: 2026-02-27
Stopped at: Completed 07-04-PLAN.md (List View and Toggle Integration) - ALL PHASES COMPLETE
Resume file: None
