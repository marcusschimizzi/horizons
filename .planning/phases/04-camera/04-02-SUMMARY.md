---
phase: 04-camera
plan: 02
subsystem: ui
tags: [r3f, zustand, camera, parallax, snap-to-present, mouse-tracking, three.js]

# Dependency graph
requires:
  - phase: 04-camera plan 01
    provides: Camera store with scroll/tick, CameraRig with Z-axis damping, scene-constants.ts
provides:
  - Snap-to-present button (DOM overlay) with fade visibility based on Z distance
  - Home key shortcut for snap-to-present
  - Mouse-follow parallax on camera X/Y axes with depth stratification
  - Camera store extended with parallax targets and snapToPresent action
  - Complete camera system satisfying all 5 CAM requirements
affects: [05-input phase (camera context for interactions), future drag/hover phases]

# Tech tracking
tech-stack:
  added: []
  patterns: [DOM overlay button bridging to R3F canvas via store subscription, combined damp3 on 3 axes for unified parallax+scroll easing, pointer-event-driven parallax with gentle reset on pointerleave]

key-files:
  created:
    - src/components/SnapToPresent.tsx
  modified:
    - src/stores/camera-store.ts
    - src/components/CameraRig.tsx
    - src/components/HorizonScene.tsx
    - src/lib/scene-constants.ts

key-decisions:
  - "SnapToPresent is a plain DOM overlay (not R3F) — rendered as sibling to Canvas, uses cameraStore subscription for visibility"
  - "Combined damp3 on [parallaxX, parallaxY, targetZ] — single call handles both parallax and scroll simultaneously"
  - "DOM-to-Canvas invalidation bridge via cameraStore.subscribe in CameraRig — triggers invalidate() when isAnimating becomes true"
  - "Inline styles for SnapToPresent (consistent with DebugOverlay pattern for overlay components)"
  - "WebkitBackdropFilter included for Safari compatibility on snap button"

patterns-established:
  - "DOM-to-Canvas bridge: store subscription in useEffect triggers invalidate() for demand-mode rendering from DOM events"
  - "Pointer parallax pattern: pointermove normalized to [-1,1], multiplied by max offsets, stored as targets, damped in useFrame"
  - "Multi-axis settle detection: all three camera axes must be within epsilon before stopping invalidation loop"

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 4 Plan 2: Snap-to-Present and Parallax Summary

**SnapToPresent pill button with Home key shortcut plus mouse-follow depth-stratified parallax on camera X/Y axes**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T18:20:00Z
- **Completed:** 2026-02-27T18:23:35Z
- **Tasks:** 2 (1 auto + 1 checkpoint)
- **Files modified:** 5

## Accomplishments
- SnapToPresent DOM overlay button that fades in when camera is >1.5 Z-units from present, with dark-space pill aesthetic (backdrop blur, muted colors, SVG chevron-up icon)
- Mouse-follow parallax shifting camera X/Y based on pointer position, creating natural depth stratification via perspective projection
- Home key shortcut and button click both trigger smooth snap-to-present animation
- Camera store extended with targetParallaxX/Y, snapToPresent(), and setParallax() actions
- CameraRig updated with combined 3-axis damp3, pointer event handlers, keyboard shortcut, and DOM-to-Canvas invalidation bridge
- All 5 CAM requirements verified: CAM-01 (scroll Z), CAM-02 (lerp/momentum), CAM-03 (boundaries), CAM-04 (snap-to-present), CAM-05 (parallax)

## Task Commits

Each task was committed atomically:

1. **Task 1: Snap-to-present button, Home key shortcut, and mouse parallax** - `a9ff984` (feat)
2. **Task 2: Checkpoint human-verify** - User approved: "Nice! This looks good. approved"

## Files Created/Modified
- `src/components/SnapToPresent.tsx` - DOM overlay pill button: fades in when camera away from present, triggers snapToPresent on click, SVG chevron-up icon, dark-space aesthetic with backdrop blur
- `src/stores/camera-store.ts` - Extended with targetParallaxX/Y state, snapToPresent() action (resets targetZ to rest), setParallax(x, y) action for pointer-driven targets
- `src/components/CameraRig.tsx` - Added pointermove/pointerleave handlers for parallax, Home key shortcut, combined damp3 on [parallaxX, parallaxY, targetZ], multi-axis settle detection, cameraStore subscription for DOM-to-Canvas invalidation
- `src/components/HorizonScene.tsx` - Wired SnapToPresent as DOM sibling to Canvas
- `src/lib/scene-constants.ts` - Added parallaxMaxX (0.8), parallaxMaxY (0.5), parallaxSmoothTime (0.3), snapDistanceThreshold (1.5)

## Decisions Made
- SnapToPresent rendered as plain DOM overlay (not inside R3F Canvas) -- consistent with DebugOverlay pattern, enables standard React/CSS transitions
- Combined damp3 target [parallaxX, parallaxY, targetZ] in single call -- simpler than separate per-axis damping, parallax and scroll ease together naturally
- DOM-to-Canvas invalidation bridge via cameraStore.subscribe(isAnimating) in CameraRig useEffect -- solves the problem of DOM button clicks needing to wake up the demand-mode render loop
- Pointer parallax uses normalized [-1,1] mouse coordinates multiplied by max offsets -- depth stratification comes free from perspective projection (no per-object parallax needed)
- Inline styles for SnapToPresent consistent with project pattern for overlay components (drei Html, DebugOverlay)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Complete camera system (all 5 CAM requirements) ready for Phase 5 (input/interaction)
- Camera store is extensible for future features (drag, focus-on-task, etc.)
- Parallax pattern established for any future pointer-driven camera effects
- Phase 4 complete -- both plans (04-01 scroll + damping, 04-02 snap + parallax) delivered

---
*Phase: 04-camera*
*Completed: 2026-02-27*
