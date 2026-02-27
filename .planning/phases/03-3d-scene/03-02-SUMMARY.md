---
phase: 03-3d-scene
plan: 02
subsystem: ui
tags: [r3f, drei, billboard, bloom, three.js, sprites]

requires:
  - phase: 03-01
    provides: R3F Canvas with bloom post-processing and scene-constants.ts
  - phase: 01-02
    provides: Task type with tags, driftCount fields
provides:
  - TaskSprite component for rendering distant tasks as glowing billboard circles
  - Tag-to-color mapping with ethereal desaturation for starlight aesthetic
affects: [03-04-task-node, 03-03-task-card]

tech-stack:
  added: []
  patterns:
    - Billboard wrapping for camera-facing sprites
    - toneMapped=false + multiplyScalar for bloom trigger
    - Tag category color derivation with ethereal lerp

key-files:
  created:
    - src/components/TaskSprite.tsx
  modified: []

key-decisions:
  - "Default sprite color #7c8db5 (soft blue-white) for untagged tasks"
  - "Ethereal shift via lerp(#c8d6e5, 0.25) desaturates toward cool gray starlight"
  - "DriftCount caps at 5 for size scaling (max ~30% larger)"

patterns-established:
  - "Tag color derivation: TAG_COLORS lookup -> ethereal lerp -> multiplyScalar for bloom"
  - "Position via group wrapper, Billboard handles camera orientation"

duration: 1min
completed: 2026-02-27
---

# Phase 3 Plan 2: TaskSprite Summary

**Billboard emissive sprite with tag-based ethereal glow color, drift-scaled radius, and toneMapped=false bloom trigger**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-27T15:25:43Z
- **Completed:** 2026-02-27T15:26:28Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- TaskSprite renders distant tasks as glowing billboard circles that always face the camera
- Tag-based color mapping with ethereal desaturation creates starlight aesthetic
- Bloom triggered via toneMapped={false} + color values > 1.0 (multiplyScalar 1.5)
- DriftCount subtly scales sprite radius (up to ~30% at 5 drifts)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TaskSprite.tsx with billboard emissive material** - `3400a5f` (feat)

## Files Created/Modified
- `src/components/TaskSprite.tsx` - Billboard emissive sprite for distant tasks with tag-based color and drift-based sizing

## Decisions Made
- Default color for untagged tasks: `#7c8db5` (soft blue-white) blends with scene atmosphere
- Ethereal shift uses `.lerp(#c8d6e5, 0.25)` to desaturate slightly toward cool gray
- DriftCount size scaling capped at 5 (0.06 per drift = max ~30% increase) to keep effect subtle
- Used `Set<string>` for tag category validation (O(1) lookup)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- TaskSprite ready for integration by TaskNode (Plan 03-04)
- Component accepts Task + position props, compatible with existing spatial layout system
- Bloom pipeline already configured in HorizonScene (Plan 03-01)

---
*Phase: 03-3d-scene*
*Completed: 2026-02-27*
