---
phase: 07-polish
plan: 01
subsystem: database, ui
tags: [drizzle, drift, toast, fog, bloom, r3f, postgres]

requires:
  - phase: 02-data-layer
    provides: Drizzle schema with tasks table (driftCount, targetDateLatest, needsRefinement)
  - phase: 03-3d-scene
    provides: HorizonScene, FogSetup, Bloom post-processing, scene-constants
  - phase: 06-task-interactions
    provides: TaskDetail panel, SceneLoader prop pipeline
provides:
  - Server-side drift recalculation on page load with double-count prevention
  - DriftNotification toast component for drift awareness
  - Adaptive fog density based on task count
  - Tuned bloom constants for depth hierarchy readability
  - needsRefinement auto-flagging at 3+ drifts
affects: [07-02, 07-03, 07-04]

tech-stack:
  added: []
  patterns:
    - "RSC-level data mutation before render (drift increment in page.tsx)"
    - "Double-count prevention via targetDateLatest advance after increment"
    - "Adaptive fog density scaling: baseDensity + min(taskCount * 0.0002, 0.008)"

key-files:
  created:
    - src/components/DriftNotification.tsx
  modified:
    - src/app/page.tsx
    - src/components/SceneLoader.tsx
    - src/components/HorizonScene.tsx
    - src/lib/scene-constants.ts

key-decisions:
  - "RSC on-load drift check chosen over cron/client-mount (simplest, resolves Phase 6 architecture question)"
  - "targetDateLatest advanced by window duration (or 7-day minimum) to prevent double-counting"
  - "DriftNotification z-index 105 (above SnapToPresent 100, below InputBubble 110)"
  - "Bloom luminance threshold lowered from 1.0 to 0.15 for broader glow coverage"

patterns-established:
  - "Drift increment pattern: UPDATE with .returning() then secondary UPDATE for needsRefinement flagging"
  - "Adaptive scene property: base constant + task-count-scaled delta with cap"

duration: 2min
completed: 2026-02-27
---

# Phase 7 Plan 1: Drift Recalculation and Notification Summary

**Server-side drift increment on page load with double-count prevention via targetDateLatest advance, amber DriftNotification toast, adaptive fog density, and tuned bloom constants**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-28T01:51:45Z
- **Completed:** 2026-02-28T01:54:03Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Drift recalculation runs on every page load: active tasks with expired targetDateLatest get driftCount incremented, targetDateLatest advanced to prevent double-counting
- Tasks reaching 3+ drifts automatically flagged with needsRefinement=true
- Non-blocking amber toast shows drift count, auto-dismisses after 5 seconds with fade animation
- Fog density adapts to task count (baseDensity + min(count * 0.0002, 0.008))
- Bloom tuned: intensity 1.8, luminance threshold 0.15, smoothing 0.015 for clear depth hierarchy

## Task Commits

Each task was committed atomically:

1. **Task 1: RSC drift recalculation with double-count prevention** - `f35ffbf` (feat)
2. **Task 2: SceneLoader driftSummary prop + DriftNotification toast + adaptive fog** - `4675fca` (feat)
3. **Task 3: Bloom post-processing tuning** - `5b7ea62` (feat)

## Files Created/Modified

- `src/app/page.tsx` - RSC drift increment logic with SQL UPDATE + returning, needsRefinement auto-flagging, driftSummary prop
- `src/components/DriftNotification.tsx` (NEW) - Amber glass toast with fade-in/out animation, auto-dismiss after 5s
- `src/components/SceneLoader.tsx` - Added driftSummary prop, passes through to HorizonScene
- `src/components/HorizonScene.tsx` - Accepts driftSummary, renders DriftNotification, adaptive FogSetup with taskCount, SceneContents passes taskCount
- `src/lib/scene-constants.ts` - Bloom intensity 1.8, luminance threshold 0.15, smoothing 0.015

## Decisions Made

- RSC on-load drift check chosen (resolves the architecture question noted in Phase 6 blockers: "Drift increment trigger -- RSC on-load check (simplest) vs cron vs client mount")
- targetDateLatest advance uses GREATEST of (latest - earliest) window duration or 7-day minimum, preventing degenerate zero-width windows
- Bloom luminance threshold dropped from 1.0 to 0.15 (original value of 1.0 was too restrictive, only toneMapped=false materials caught bloom; now broader coverage gives better depth hierarchy)
- DriftNotification added pointerEvents: 'none' so the toast never blocks interaction with scene elements

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added driftSummary prop to SceneLoaderProps in Task 1**
- **Found during:** Task 1 (RSC drift recalculation)
- **Issue:** page.tsx passes driftSummary to SceneLoader but SceneLoaderProps didn't have the prop yet (Task 2's responsibility). TypeScript compilation failed.
- **Fix:** Added `driftSummary?: { count: number } | null` to SceneLoaderProps in Task 1 to unblock compilation.
- **Files modified:** src/components/SceneLoader.tsx
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** f35ffbf (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minimal scope shift; prop was planned for Task 2, added early to maintain per-task compilation.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Drift recalculation foundation is in place for remaining Phase 7 plans
- DriftNotification toast pattern can be extended for other notifications
- needsRefinement flagging is server-side, ready for refinement UI in 07-02
- Bloom and fog tuning provides baseline for any further visual adjustments

---
*Phase: 07-polish*
*Completed: 2026-02-27*
