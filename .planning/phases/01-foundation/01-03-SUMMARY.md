---
phase: 01-foundation
plan: 03
subsystem: math
tags: [vitest, tdd, horizon-computation, spatial-positioning, prng, cyrb53, mulberry32]

requires:
  - phase: 01-foundation/01-01
    provides: Project scaffold with TypeScript and path aliases
provides:
  - Shared TypeScript types (TaskRow, Task, DateRange, TagCategory, TAG_COLORS)
  - Horizon computation (getHorizon, getZDepth, getZDepthRange, HORIZON_BANDS)
  - Deterministic spatial positioning (getTaskPosition, applyOverlapAvoidance, SPREAD_CONFIG)
  - Vitest test infrastructure with 49 passing tests
affects: [03-scene, 04-interactions, 06-gestures]

tech-stack:
  added: [vitest]
  patterns: [TDD red-green-refactor, cyrb53 hash + mulberry32 PRNG for deterministic scatter, horizon-band Z-depth mapping]

key-files:
  created:
    - src/types/task.ts
    - src/lib/horizons.ts
    - src/lib/spatial.ts
    - src/lib/__tests__/horizons.test.ts
    - src/lib/__tests__/spatial.test.ts
    - vitest.config.ts
  modified:
    - package.json

key-decisions:
  - "passWithNoTests: true in vitest config to avoid exit code 1 when running with no test files"
  - "Boundary values (1, 7, 30, 90, 365 days) are inclusive to the nearer horizon (<=)"
  - "Past/overdue dates clamp to immediate horizon — overdue tasks appear closest to user"

patterns-established:
  - "TDD workflow: write failing tests first, implement to pass, commit each phase separately"
  - "Pure functions for all math: no side effects, no DOM, no React — fully testable in isolation"
  - "Deterministic positioning: cyrb53 hash of task ID seeds mulberry32 PRNG for reproducible x/y/z"

duration: 4min
completed: 2026-02-27
---

# Phase 1 Plan 3: Horizon Math and Spatial Positioning Summary

**TDD-driven horizon computation (date-to-depth mapping), deterministic scatter algorithm (cyrb53+mulberry32), and shared TypeScript types with 49 passing Vitest tests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-27T06:32:39Z
- **Completed:** 2026-02-27T06:36:12Z
- **Tasks:** 5 (1 setup + 2 TDD features x 2 phases each)
- **Files modified:** 7

## Accomplishments
- Vitest test infrastructure configured with path alias support and globals
- Shared TypeScript types defined: TaskRow, Task, DateRange, TagCategory, TAG_COLORS
- Horizon math: getHorizon maps date ranges to 6 temporal horizons, getZDepth/getZDepthRange map horizons to 3D Z-depth bands
- Spatial positioning: getTaskPosition produces deterministic x/y/z from task ID using cyrb53 hash + mulberry32 PRNG
- Overlap avoidance: applyOverlapAvoidance nudges same-horizon tasks apart with configurable minDistance
- 49 tests covering all horizons, boundaries, edge cases, determinism, and overlap behavior

## Task Commits

Each task was committed atomically:

1. **Task 1: Set up Vitest and define shared TypeScript types** - `2a0bf72` (chore)
2. **Horizon Math RED: Failing tests for getHorizon, getZDepth, getZDepthRange** - `c66c4c8` (test)
3. **Horizon Math GREEN: Implement horizon computation** - `b582421` (feat)
4. **Spatial Positioning RED: Failing tests for getTaskPosition, applyOverlapAvoidance** - `445ce62` (test)
5. **Spatial Positioning GREEN: Implement deterministic scatter** - `216ecc3` (feat)

## Files Created/Modified
- `vitest.config.ts` - Vitest config with path aliases and globals
- `package.json` - Added vitest devDep, test and test:watch scripts
- `src/types/task.ts` - TaskRow, Task, DateRange, TagCategory, TAG_COLORS
- `src/lib/horizons.ts` - Horizon type, HORIZON_BANDS, getHorizon, getZDepth, getZDepthRange
- `src/lib/spatial.ts` - TaskPosition, SPREAD_CONFIG, getTaskPosition, applyOverlapAvoidance (cyrb53 + mulberry32)
- `src/lib/__tests__/horizons.test.ts` - 29 tests for horizon computation
- `src/lib/__tests__/spatial.test.ts` - 20 tests for spatial positioning

## Decisions Made
- Added `passWithNoTests: true` to vitest config so `vitest run` exits cleanly when no test files exist yet
- Boundary values use `<=` (e.g., exactly 7 days = this-week, not this-month) matching the research spec
- Past/overdue dates (negative daysOut) clamp to 'immediate' horizon — overdue tasks appear closest to user

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All pure-function foundations are tested and ready for the 3D scene layer (Phase 3)
- Types are importable from `@/types/task` and `@/lib/horizons`
- Spatial functions are importable from `@/lib/spatial`
- The horizon math is the thesis of the app (time = depth) and is now proven correct with 49 tests

---
*Phase: 01-foundation*
*Completed: 2026-02-27*
