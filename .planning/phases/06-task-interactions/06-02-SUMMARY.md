---
phase: 06-task-interactions
plan: 02
subsystem: ui
tags: [r3f, particles, zustand, animations, three.js, drizzle-orm]

# Dependency graph
requires:
  - phase: 06-task-interactions/01
    provides: TaskDetail panel with stub Complete/Drop buttons, selectedTaskId store state
  - phase: 02-data-layer
    provides: PATCH /api/tasks/[id] endpoint, tasks schema with status column
provides:
  - CompletionBurst R3F particle effect (white/gold burst at task position)
  - Dissolution animations on TaskCard (CSS) and TaskSprite (useFrame)
  - Complete action with undo toast and deferred PATCH persistence
  - Drop action with instant PATCH persistence and no undo
  - GET /api/tasks filtered to status=active only
  - Store tracks completingTaskIds and droppingTaskIds for animation state
affects: [06-task-interactions/03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optimistic removal with undo: start animation immediately, defer PATCH, restore on undo/failure"
    - "Burst management via store subscription in R3F component (useEffect + subscribe)"
    - "Dissolution detection via dissolvingRef + dissolveStartRef in useFrame (no React re-renders)"

key-files:
  created:
    - src/components/CompletionBurst.tsx
  modified:
    - src/stores/task-store.tsx
    - src/components/HorizonScene.tsx
    - src/components/TaskDetail.tsx
    - src/components/TaskCard.tsx
    - src/components/TaskSprite.tsx
    - src/app/api/tasks/route.ts

key-decisions:
  - "4-second undo window before PATCH persists completion to server"
  - "Drop has no undo -- immediate PATCH, instant shrink, clinical feel"
  - "CompletionBurst uses delta-based timing (not performance.now) for R3F compatibility"
  - "Burst position sourced from positionMap in TaskNodes via store subscription"

patterns-established:
  - "Optimistic removal pattern: startCompletion -> animation -> finishCompletion -> removeTask"
  - "Store subscription in R3F for cross-boundary event detection (prevCompletingRef diffing)"

# Metrics
duration: 4min
completed: 2026-02-27
---

# Phase 6 Plan 2: Complete/Drop Actions Summary

**Complete and Drop buttons fully wired with white/gold particle burst dissolution, undo toast for complete, instant clinical removal for drop, and GET endpoint filtered to active tasks only**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-27T22:19:02Z
- **Completed:** 2026-02-27T22:23:04Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- CompletionBurst R3F particle effect with 24 particles in white-to-gold gradient, 0.8s burst animation
- Complete action triggers dissolution animation + particle burst + undo toast (4s window) + deferred PATCH
- Drop action triggers instant shrink animation + immediate PATCH + no undo (emotionally distinct)
- GET /api/tasks now returns only active tasks (completed/dropped tasks disappear on refresh)
- Store extended with completingTaskIds/droppingTaskIds sets and 6 new actions

## Task Commits

Each task was committed atomically:

1. **Task 1: CompletionBurst particle effect + dissolution animations on TaskNode** - `c5ad962` (feat)
2. **Task 2: Wire Complete and Drop buttons in TaskDetail + undo toast + server persistence + GET filter** - `e3fc0cc` (feat)

## Files Created/Modified
- `src/components/CompletionBurst.tsx` - R3F Points particle burst effect (24 particles, white-gold gradient, 0.8s duration)
- `src/stores/task-store.tsx` - Added completingTaskIds/droppingTaskIds state, 6 new actions, useIsCompleting/useIsDropping selectors
- `src/components/HorizonScene.tsx` - Burst management state in TaskNodes, renders CompletionBurst at task position
- `src/components/TaskDetail.tsx` - handleComplete with undo toast, handleDrop with instant removal, success overlays
- `src/components/TaskCard.tsx` - CSS dissolution (fade+shrink for complete, abrupt shrink for drop)
- `src/components/TaskSprite.tsx` - useFrame dissolution (opacity+scale for complete, scale-only for drop)
- `src/app/api/tasks/route.ts` - GET filtered with eq(tasks.status, 'active')

## Decisions Made
- 4-second undo window before completion PATCH fires (balances undo convenience with data consistency)
- Drop is immediate with no undo -- this is intentional for emotional contrast (clinical vs celebratory)
- CompletionBurst uses delta-based timing rather than performance.now for better R3F frameloop compatibility
- Burst positions resolved from positionMap via store subscription, avoiding prop drilling through R3F tree

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Complete and Drop actions are fully functional with animations and persistence
- Reschedule button remains a console.log stub (deferred to 06-03)
- Ready for Phase 6 Plan 3 (reschedule flow)

---
*Phase: 06-task-interactions*
*Completed: 2026-02-27*
