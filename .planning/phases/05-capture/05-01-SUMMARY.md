---
phase: 05-capture
plan: 01
subsystem: ui
tags: [react, input, overlay, dom, dark-space, animation]

# Dependency graph
requires:
  - phase: 03-3d-scene
    provides: HorizonScene canvas structure and DOM overlay pattern
  - phase: 04-camera
    provides: SnapToPresent overlay component (repositioned to accommodate input)
provides:
  - InputBubble component with full UI shell (input, submit, loading, error, toast)
  - InputBubble wired into HorizonScene as DOM overlay sibling to Canvas
affects: [05-capture plan 03 (onSubmit wiring), 06-refinement (potential input extension)]

# Tech tracking
tech-stack:
  added: []
  patterns: [injected style tag for CSS keyframes in inline-style-only components, loading dot animation pattern]

key-files:
  created:
    - src/components/InputBubble.tsx
  modified:
    - src/components/HorizonScene.tsx
    - src/components/SnapToPresent.tsx

key-decisions:
  - "InputBubble z-index 110, above SnapToPresent z-index 100"
  - "SnapToPresent repositioned from bottom:24 to bottom:88 for clearance above input bubble"
  - "Injected style tag for CSS keyframe animations (inputPulse, loadingDot) since component uses inline styles only"
  - "onSubmit prop is optional, returning Promise<{ title, horizon } | void> for Plan 05-03 wiring"

patterns-established:
  - "Injected style tag pattern: use <style> inside component for CSS keyframes when inline styles are required"
  - "Loading dot animation: staggered opacity keyframes with delay per dot"

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 5 Plan 1: Input Bubble Summary

**Dark-space frosted-glass InputBubble overlay with submit interaction, loading pulse, error display, and toast notification wired into HorizonScene**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T20:58:46Z
- **Completed:** 2026-02-27T21:00:15Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- InputBubble component with full UI shell: dark frosted-glass pill input, circular submit button with arrow icon, loading pulse animation, animated loading dots, error display with auto-dismiss, toast notification with fade-out
- Component wired into HorizonScene as DOM overlay sibling to Canvas
- SnapToPresent repositioned above input bubble with no overlap

## Task Commits

Each task was committed atomically:

1. **Task 1: Create InputBubble component with full UI shell** - `86e5b35` (feat)
2. **Task 2: Wire InputBubble into HorizonScene and adjust SnapToPresent positioning** - `f94835e` (feat)

## Files Created/Modified
- `src/components/InputBubble.tsx` - Fixed DOM overlay input bubble with dark-space aesthetic, submit handling, loading state, error display, toast notification
- `src/components/HorizonScene.tsx` - Updated to import and render InputBubble as sibling to Canvas
- `src/components/SnapToPresent.tsx` - Repositioned from bottom:24 to bottom:88 for clearance above InputBubble

## Decisions Made
- InputBubble z-index 110 (above SnapToPresent at 100) for proper DOM overlay layering
- SnapToPresent moved from bottom:24px to bottom:88px (48px input height + 16px gap + 24px original bottom)
- Used injected `<style>` tag for CSS keyframe animations since component uses inline styles only (consistent with overlay pattern)
- onSubmit prop typed as optional `Promise<{ title: string; horizon: string } | void>` for future Plan 05-03 wiring
- Loading state uses both pulse border animation and animated loading dots replacing submit button

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- InputBubble is visually complete and interactive, ready for onSubmit wiring in Plan 05-03
- Component accepts onSubmit prop that Plan 05-03 will provide (calling /api/parse, optimistic store update)
- No blockers for subsequent capture phase plans

---
*Phase: 05-capture*
*Completed: 2026-02-27*
