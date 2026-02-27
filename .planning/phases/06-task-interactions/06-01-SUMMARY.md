---
phase: 06-task-interactions
plan: 01
subsystem: ui
tags: [zustand, react, r3f, slide-panel, click-handler]

requires:
  - phase: 03-3d-scene
    provides: TaskCard, TaskSprite, HorizonScene rendering
  - phase: 05-capture
    provides: Zustand task store with addTask/refresh

provides:
  - selectedTaskId state in Zustand store
  - selectTask/clearSelection actions
  - useSelectedTask derived selector
  - TaskDetail slide-in panel overlay
  - Click-to-select on TaskCard and TaskSprite

affects: [06-02-PLAN, 06-03-PLAN]

tech-stack:
  added: []
  patterns:
    - "DOM overlay panel with CSS transform slide-in animation"
    - "Zustand derived selector for selected task with computed horizon"
    - "pointerEvents layering: Html wrapper 'none', inner div 'auto' for scroll passthrough"

key-files:
  created:
    - src/components/TaskDetail.tsx
  modified:
    - src/stores/task-store.tsx
    - src/components/TaskCard.tsx
    - src/components/TaskSprite.tsx
    - src/components/HorizonScene.tsx

key-decisions:
  - "TaskDetail z-index 120 (panel) and 119 (backdrop) above InputBubble 110 and SnapToPresent 100"
  - "CSS transform translateX for slide animation with spring overshoot cubic-bezier(0.34, 1.56, 0.64, 1)"
  - "Panel always rendered in DOM, toggled via transform for smooth CSS transitions"
  - "Action buttons (Complete, Drop, Reschedule) are stub console.log calls for now"

patterns-established:
  - "Click-to-select pattern: onClick -> store.selectTask(id) -> useSelectedTask() -> panel render"
  - "Backdrop overlay pattern: fixed div behind panel with onClick to clearSelection"

duration: 2min
completed: 2026-02-27
---

# Phase 6 Plan 01: Click-to-Panel Foundation Summary

**Zustand selectedTaskId state with click handlers on TaskCard/TaskSprite and TaskDetail slide-in DOM overlay panel**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T22:12:17Z
- **Completed:** 2026-02-27T22:14:22Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added selectedTaskId, selectTask, clearSelection to Zustand task store with useSelectedTask derived selector
- Made TaskCard and TaskSprite clickable while preserving scroll passthrough on card hover
- Created TaskDetail slide-in panel with glass-panel styling, task info display, and action button stubs
- Wired TaskDetail into HorizonScene as DOM sibling to Canvas

## Task Commits

Each task was committed atomically:

1. **Task 1: Store extensions + click handlers on TaskCard and TaskSprite** - `508bbf4` (feat)
2. **Task 2: TaskDetail slide-in panel + render in HorizonScene** - `a4c8a1f` (feat)

## Files Created/Modified
- `src/stores/task-store.tsx` - Added selectedTaskId state, selectTask/clearSelection actions, useSelectedTask selector
- `src/components/TaskCard.tsx` - Added pointerEvents: 'auto' + cursor: 'pointer' + onClick on inner div
- `src/components/TaskSprite.tsx` - Added onClick with stopPropagation + pointer cursor handlers on mesh
- `src/components/TaskDetail.tsx` - New 241-line slide-in panel overlay with task info and action stubs
- `src/components/HorizonScene.tsx` - Added TaskDetail as sibling after InputBubble

## Decisions Made
- TaskDetail z-index 120 (panel) / 119 (backdrop) to layer above InputBubble (110) and SnapToPresent (100)
- Panel always in DOM with CSS transform toggle for smooth slide animation (no mount/unmount)
- Used cubic-bezier(0.34, 1.56, 0.64, 1) for spring overshoot feel on slide-in
- Action buttons render as stubs (console.log) -- wiring deferred to plan 06-02

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- selectedTaskId + selectTask pattern ready for plan 06-02 (action wiring)
- TaskDetail panel structure ready to receive real action handlers
- useSelectedTask selector returns full Task with computed horizon for any downstream use

---
*Phase: 06-task-interactions*
*Completed: 2026-02-27*
