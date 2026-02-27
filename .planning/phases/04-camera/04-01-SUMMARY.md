---
phase: 04-camera
plan: 01
subsystem: ui
tags: [r3f, zustand, camera, scroll, damping, maath, three.js]

# Dependency graph
requires:
  - phase: 03-3d-scene
    provides: Canvas with demand frameloop, SceneInvalidator, scene-constants.ts, HorizonScene component
provides:
  - Zustand vanilla camera store with scroll/tick actions and rubber-band boundary math
  - CameraRig R3F component with frame-rate-independent Z-axis damping
  - Scene constants for camera boundaries, smooth times, and scroll sensitivity
  - normalize-wheel-es for cross-browser scroll normalization
affects: [04-camera plan 02 (parallax/pointer), future interaction phases]

# Tech tracking
tech-stack:
  added: [normalize-wheel-es, maath/easing (transitive via drei)]
  patterns: [vanilla Zustand store for non-reactive R3F reads, damp3 frame-rate-independent easing, rubber-band overscroll with exponential decay]

key-files:
  created:
    - src/stores/camera-store.ts
    - src/components/CameraRig.tsx
  modified:
    - src/lib/scene-constants.ts
    - src/components/HorizonScene.tsx
    - package.json

key-decisions:
  - "Vanilla Zustand store (createStore) for camera state — enables non-reactive getState() reads in useFrame without React re-renders"
  - "Exponential rubber-band formula for near boundary overscroll — maxOverscroll * (1 - exp(-overscroll/maxOverscroll))"
  - "Spring-back triggered when velocity drops below 0.5 while past nearBoundary — prevents spring-back during active scroll"

patterns-established:
  - "Vanilla Zustand store pattern: createStore from zustand/vanilla for R3F hot-loop state, useStore wrapper for React subscriptions"
  - "Demand-mode invalidation chain: wheel event -> invalidate() -> useFrame -> damp3 -> invalidate() if not settled -> stops when settled"
  - "iOS-style overscroll: exponential decay rubber-band with faster springBackSmoothTime for snap-back"

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 4 Plan 1: Camera System Summary

**Scroll-driven Z-axis camera with damp3 easing, rubber-band overscroll at Z=10, and hard clamp at Z=-120**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T17:06:44Z
- **Completed:** 2026-02-27T17:08:34Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Vanilla Zustand camera store with scroll/tick actions and exponential rubber-band boundary math
- CameraRig component wiring wheel events to frame-rate-independent Z-axis camera movement via maath damp3
- iOS-style spring-back overscroll at near boundary (Z=10) with faster smooth time
- Hard clamp at far boundary (Z=-120, someday depth)
- Clean settle detection stopping the demand render loop when camera is at rest

## Task Commits

Each task was committed atomically:

1. **Task 1: Camera store + scene constants + dependency install** - `385c68f` (feat)
2. **Task 2: CameraRig component + HorizonScene integration** - `0dbbc46` (feat)

## Files Created/Modified
- `src/stores/camera-store.ts` - Vanilla Zustand store with targetZ/currentZ state, scroll action with rubber-band math, tick action for settle detection
- `src/components/CameraRig.tsx` - R3F component: wheel handler with normalize-wheel-es, useFrame loop with damp3 damping, spring-back and settle logic
- `src/lib/scene-constants.ts` - Added 7 camera constants (cameraRestZ, nearBoundary, farBoundary, maxOverscroll, zSmoothTime, zUnitsPerPixel, springBackSmoothTime)
- `src/components/HorizonScene.tsx` - Imported CameraRig, added to SceneContents, updated Canvas camera prop to use SCENE_CONSTANTS.cameraRestZ
- `package.json` - Added normalize-wheel-es dependency

## Decisions Made
- Vanilla Zustand store (createStore from zustand/vanilla) for camera state -- enables non-reactive getState() reads in useFrame without triggering React re-renders on every frame
- Exponential rubber-band formula for near boundary overscroll rather than linear clamping -- gives natural iOS-feel resistance
- Spring-back triggers when velocity drops below 0.5 (not immediately) so users feel the elastic resistance while actively scrolling
- Settle threshold of 0.01 Z-units to prevent infinite invalidation loops while being visually imperceptible

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Camera Z-axis movement complete, ready for Plan 02 (pointer parallax, XY drift)
- CameraRig component structured to accept additional useFrame logic for parallax
- Camera store can be extended with additional state for pointer tracking

---
*Phase: 04-camera*
*Completed: 2026-02-27*
