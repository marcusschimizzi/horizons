---
phase: 03-3d-scene
plan: 01
subsystem: ui
tags: [r3f, three.js, postprocessing, bloom, fog, zustand, canvas]

# Dependency graph
requires:
  - phase: 02-data-layer
    provides: "Zustand task store, TaskStoreProvider, useTasksWithHorizon"
  - phase: 02-data-layer
    provides: "spatial.ts with getTaskPosition and applyOverlapAvoidance"
provides:
  - "Full R3F Canvas with fog, bloom, stars, and demand-mode rendering"
  - "SCENE_CONSTANTS single source of truth for all 3D visual parameters"
  - "Zustand store subscription invalidation pattern"
  - "TaskStoreContext export for direct store access"
affects: [03-02-task-sprites, 03-03-task-cards, 03-04-debug-overlay]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "frameloop=demand with store.subscribe invalidate pattern"
    - "Imperative fog setup via useEffect (React 19 workaround)"
    - "SCENE_CONSTANTS as static const object for visual tuning"

key-files:
  created:
    - src/lib/scene-constants.ts
  modified:
    - src/components/HorizonScene.tsx
    - src/stores/task-store.tsx

key-decisions:
  - "Imperative FogExp2 via useEffect rather than declarative JSX (React 19 compatibility)"
  - "TaskStoreContext exported from task-store.tsx for SceneInvalidator direct store subscription"

patterns-established:
  - "SceneInvalidator pattern: useContext(TaskStoreContext) + store.subscribe + invalidate"
  - "FogSetup pattern: imperative scene.fog assignment in useEffect"
  - "TaskPlaceholders: useMemo over applyOverlapAvoidance for position stability"

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 3 Plan 1: 3D Scene Foundation Summary

**R3F Canvas with FogExp2, static stars, bloom pipeline, and Zustand invalidation pattern rendering placeholder task spheres at spatial positions**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T15:20:42Z
- **Completed:** 2026-02-27T15:22:45Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created SCENE_CONSTANTS as single source of truth for all 3D visual tuning parameters (fog, bloom, stars, LOD, sprites, cards)
- Replaced HorizonScene stub with full R3F Canvas: FogExp2, ambient light, static Stars, Bloom postprocessing
- Wired Zustand store subscription to R3F invalidate() for demand-mode rendering
- Placeholder white spheres render at deterministic task positions with overlap avoidance

## Task Commits

Each task was committed atomically:

1. **Task 1: Create scene-constants.ts** - `3e3fd92` (feat)
2. **Task 2: Replace HorizonScene stub with full R3F Canvas** - `10d00e1` (feat)

## Files Created/Modified
- `src/lib/scene-constants.ts` - All tunable 3D scene parameters (fog, bloom, stars, LOD, sprites, cards)
- `src/components/HorizonScene.tsx` - Full R3F Canvas with fog, bloom, stars, lights, invalidation, and task placeholders
- `src/stores/task-store.tsx` - Added TaskStoreContext to exports (single-line change)

## Decisions Made
- Used imperative FogExp2 assignment via useEffect rather than declarative `<fogExp2>` JSX to work around React 19 declarative attach issues
- Exported TaskStoreContext from task-store.tsx to enable SceneInvalidator to subscribe directly to the vanilla Zustand store

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Canvas foundation is ready for TaskSprite (03-02), TaskCard (03-03), and debug overlay (03-04)
- Placeholder spheres at correct spatial positions confirm position pipeline works end-to-end
- Bloom pipeline wired but not visually triggering yet (no toneMapped=false materials until sprites arrive)
- FogExp2 will visually dim distant placeholders, confirming depth-based atmosphere

---
*Phase: 03-3d-scene*
*Completed: 2026-02-27*
