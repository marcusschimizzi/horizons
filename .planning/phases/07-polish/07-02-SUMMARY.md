---
phase: 07-polish
plan: 02
subsystem: ui
tags: [r3f, three.js, drift, refinement, deadline, visual-indicators, animation]

requires:
  - phase: 03-3d-scene
    provides: "TaskCard and TaskSprite base components with LOD split"
  - phase: 07-polish-01
    provides: "Drift recalculation and drift notification infrastructure"
provides:
  - "Drift count amber badge on card-tier tasks"
  - "Drift opacity degradation and color desaturation on sprite-tier tasks"
  - "needsRefinement blue pulse animation on cards and blue ring mesh on sprites"
  - "hardDeadline amber pulse animation on cards and amber ring mesh on sprites (VIS-03)"
affects: [07-polish-03, 07-polish-04]

tech-stack:
  added: []
  patterns:
    - "CSS keyframes injected via style tag inside drei Html wrapper for card animations"
    - "useFrame ring material opacity modulation for sprite breathing pulse animations"
    - "Drift-proportional opacity degradation with 0.4 floor for sprite visibility"

key-files:
  created: []
  modified:
    - "src/components/TaskCard.tsx"
    - "src/components/TaskSprite.tsx"

key-decisions:
  - "hardDeadline pulse takes priority over needsRefinement pulse on cards (more urgent signal)"
  - "Deadline ring at 1.2-1.35x radius, refinement ring at 1.4-1.6x radius for visual separation"
  - "Drift desaturation uses lerp toward ETHEREAL_TARGET scaling from 0.25 to max 0.7"

patterns-established:
  - "Ring mesh pattern: ringGeometry with meshBasicMaterial ref, animated via useFrame with invalidate()"
  - "Conditional invalidate() calls only when task has animated indicators (demand frameloop respect)"

duration: 2min
completed: 2026-02-27
---

# Phase 7 Plan 2: Drift and Refinement Indicators Summary

**Drift count badges on cards, opacity degradation on sprites, needsRefinement blue pulse/ring, and hardDeadline amber pulse/ring (VIS-03) across both LOD tiers**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-28T01:52:23Z
- **Completed:** 2026-02-28T01:54:46Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Card-tier tasks show amber drift count badge at top-right corner when driftCount > 0
- Card-tier needsRefinement displays slow-breathing blue box-shadow pulse (3s cycle)
- Card-tier hardDeadline displays slow-breathing amber box-shadow pulse (4s cycle, VIS-03)
- Sprite-tier opacity degrades proportionally with drift (0.08 per drift, floor at 0.4)
- Sprite-tier glowColor desaturates more with higher drift count (lerp factor scales 0.25 to 0.7)
- Sprite-tier needsRefinement shows blue pulsing ring mesh at 1.4-1.6x radius
- Sprite-tier hardDeadline shows amber pulsing ring mesh at 1.2-1.35x radius (VIS-03)

## Task Commits

Each task was committed atomically:

1. **Task 1: TaskCard drift badge + needsRefinement pulse + hardDeadline amber pulse** - `bb4ba4a` (feat)
2. **Task 2: TaskSprite drift opacity + needsRefinement ring + hardDeadline ring** - `0a0e3bb` (feat)

## Files Created/Modified
- `src/components/TaskCard.tsx` - Added position:relative, amber drift badge span, CSS keyframes for refinementPulse and deadlinePulse, conditional animation property
- `src/components/TaskSprite.tsx` - Added drift-based opacity reduction in useFrame, drift-scaled glowColor desaturation, ringGeometry meshes for refinement (blue) and deadline (amber) with breathing pulse animations

## Decisions Made
- hardDeadline amber pulse takes priority over needsRefinement blue pulse on cards since deadline is more urgent
- Deadline ring placed tighter (1.2-1.35x radius) than refinement ring (1.4-1.6x) so both can coexist visually
- Drift desaturation uses graduated lerp from 0.25 base to 0.7 max toward ETHEREAL_TARGET color
- Ring pulse animations call invalidate() only when task has the relevant flag, respecting demand frameloop

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All drift and refinement visual indicators complete across both LOD tiers
- Ready for 07-03 (accessibility/UX improvements) and 07-04 (final polish)

---
*Phase: 07-polish*
*Completed: 2026-02-27*
