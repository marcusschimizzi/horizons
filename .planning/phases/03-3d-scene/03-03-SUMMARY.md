---
phase: 03-3d-scene
plan: 03
subsystem: ui
tags: [react-three-fiber, drei, html-overlay, frosted-glass, 3d-cards]

requires:
  - phase: 03-01
    provides: "R3F Canvas, scene-constants.ts with htmlDistanceFactor"
  - phase: 02-02
    provides: "Task type with horizon, driftCount, hardDeadline fields"
provides:
  - "TaskCard component for rendering near-horizon tasks as frosted-glass HTML cards in 3D space"
affects: [03-04, 06-interactions]

tech-stack:
  added: []
  patterns:
    - "drei Html with inline styles for 3D-positioned CSS overlays"
    - "Conditional box-shadow for visual state indicators"
    - "CSS filter + opacity for progressive visual degradation"

key-files:
  created:
    - src/components/TaskCard.tsx
  modified: []

key-decisions:
  - "WebkitBackdropFilter included alongside backdropFilter for Safari compatibility"
  - "Inline styles only (no Tailwind) per accumulated decision — drei Html renders outside normal DOM"

patterns-established:
  - "TaskCard pattern: group > Html > div with inline styles for all drei HTML overlays"
  - "Visual state mapping: hardDeadline -> amber boxShadow, driftCount -> saturate filter + opacity"

duration: 1min
completed: 2026-02-27
---

# Phase 3 Plan 3: TaskCard Summary

**Frosted-glass drei Html card with amber deadline glow ring and progressive drift desaturation for near-horizon tasks**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-27T15:26:06Z
- **Completed:** 2026-02-27T15:26:43Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- TaskCard renders near-horizon tasks as frosted-glass HTML cards in 3D space via drei Html
- Hard-deadline tasks display a steady amber/orange glow ring (box-shadow)
- Drifted tasks progressively desaturate and dim based on driftCount
- Cards are display-only (pointerEvents: none) and scale with camera distance via distanceFactor

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TaskCard.tsx with drei Html, deadline ring, and drift indicator** - `d440383` (feat)

## Files Created/Modified
- `src/components/TaskCard.tsx` - drei Html card for near-horizon tasks with frosted-glass styling, deadline amber glow, and drift desaturation

## Decisions Made
- Added WebkitBackdropFilter for Safari backdrop-filter support alongside standard property
- Followed accumulated decision: inline styles only for drei Html components (no Tailwind)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TaskCard ready for integration into TaskNode (Plan 03-04)
- Component accepts Task + position props, ready for spatial placement
- Visual indicators (deadline ring, drift) will work automatically based on task data

---
*Phase: 03-3d-scene*
*Completed: 2026-02-27*
