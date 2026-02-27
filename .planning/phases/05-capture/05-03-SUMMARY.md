---
phase: 05-capture
plan: 03
subsystem: capture-integration
tags: [zustand, optimistic-update, entrance-animation, r3f, camera-pan, postgres]

# Dependency graph
requires:
  - phase: 05-capture plan 01
    provides: InputBubble UI shell
  - phase: 05-capture plan 02
    provides: /api/parse Haiku extraction endpoint
provides:
  - Full end-to-end capture loop: natural language → parse → optimistic add → persist → entrance animation
  - task-store extended with replaceTask, newTaskIds Set, clearNewTask, useIsNewTask
  - InputBubble self-contained with full submit flow (no onSubmit prop)
  - TaskSprite glow-in entrance animation (useFrame, ease-out cubic, 0.6s)
  - TaskCard fade-in entrance animation (CSS transition, opacity + scale, 0.5s)
  - Camera auto-pan to new task's horizon (skips someday to avoid teleport)
affects: [06-task-interactions (task node click handling), 07-polish (drift tracking, refinement flow)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optimistic update with temp ID: addTask → replaceTask(tempId, real) on success, removeTask on failure"
    - "newTaskIds Set for ephemeral animation state — not persisted, survives HMR only"
    - "useFrame entrance animation with mountTimeRef null-init — lazy start on first frame"
    - "CSS transition for drei Html card entrance — requestAnimationFrame delay triggers the transition"

key-files:
  modified:
    - src/stores/task-store.tsx
    - src/components/InputBubble.tsx
    - src/components/TaskNode.tsx
    - src/components/TaskSprite.tsx
    - src/components/TaskCard.tsx
    - src/app/api/tasks/route.ts

key-decisions:
  - "InputBubble is fully self-contained — no onSubmit prop. Wiring is internal."
  - "camera pan skips 'someday' — 102+ Z-unit distance with damp3 smooth=0.3s is inherently a teleport"
  - "POST /api/tasks requires explicit field mapping — raw body passthrough fails for Date columns"
  - "newTaskIds persists temp ID through replaceTask — animation continues across ID swap"

patterns-established:
  - "useFrame entrance: mountTimeRef = null, lazy-init to clock.elapsedTime on first frame, invalidate() while animating"
  - "Drizzle timestamp(mode:date) requires Date objects — never pass ISO strings from JSON body directly"

# Metrics
duration: ~15min (including human verification and bug fixes)
completed: 2026-02-27
---

# Phase 5 Plan 3: Capture Integration Summary

**End-to-end capture loop working: type intention → Haiku parse → optimistic 3D scene update → Postgres persistence → entrance animation → toast confirmation**

## Performance

- **Duration:** ~15 min (including human checkpoint and two bug fixes)
- **Completed:** 2026-02-27
- **Tasks:** 2 + 1 checkpoint + 2 bug fixes
- **Files modified:** 6

## Accomplishments

- Task store extended with `replaceTask`, `newTaskIds` Set, `clearNewTask`, `useIsNewTask` — full optimistic update lifecycle
- InputBubble wired with complete submit flow: parse → optimistic add → background persist → toast/error/rollback
- TaskSprite entrance animation: glow-in with scale + emissive from zero over 0.6s (useFrame, ease-out cubic, demand invalidate)
- TaskCard entrance animation: frosted-glass condensing effect via CSS opacity + scale transition over 0.5s
- Camera auto-pan to new task's horizon when out of view (with someday exception)
- Existing tasks on page load never entrance-animate

## Task Commits

1. **Task 1: Store + InputBubble wiring** — `22af99e`
2. **Task 2: Entrance animations (TaskSprite + TaskCard)** — `819e1cb`

## Bug Fixes During Checkpoint Verification

Two bugs surfaced during human testing and were fixed as deviations:

### Bug: POST /api/tasks 500 for tasks with specific dates
- **Root cause:** `db.insert(tasks).values(body)` passed raw JSON body. ISO date strings fail Drizzle's `timestamp({ mode: 'date' })` columns which require `Date` objects. Tasks with `null` dates (someday) succeeded; tasks with real dates (dentist, taxes) failed.
- **Fix:** Explicit field mapping with `new Date(isoString)` conversion in `src/app/api/tasks/route.ts` — `9c78ee2`

### Bug: Camera teleported to someday tasks
- **Root cause:** `getZDepth('someday') = -100`. Camera at Z=10 must cover 102.5 Z-units. With damp3 `smoothTime=0.3s`, initial velocity is enormous — inherently feels like a teleport regardless of clamping. Additionally, `cameraStore.setState()` bypassed the `scroll()` action's farBoundary clamp.
- **Fix:** Skip camera pan entirely for 'someday' horizon. The toast is sufficient feedback for a vague far-future task. Also added `velocity: 0` reset and `farBoundary` clamp for all other pans — `801bb33`

## Files Modified
- `src/stores/task-store.tsx` — replaceTask, newTaskIds, clearNewTask, useIsNewTask
- `src/components/InputBubble.tsx` — full self-contained submit flow, camera pan (someday skipped)
- `src/components/TaskNode.tsx` — isNew prop derived from useIsNewTask, passed to children
- `src/components/TaskSprite.tsx` — glow-in entrance animation via useFrame
- `src/components/TaskCard.tsx` — fade-in entrance animation via CSS transition
- `src/app/api/tasks/route.ts` — explicit field mapping with Date object conversion

## Decisions Made

- InputBubble is fully self-contained — onSubmit prop removed, all capture logic is internal
- Camera pan skips 'someday': flying 100+ Z-units with damp3 is always jarring; the toast confirmation is sufficient
- `newTaskIds` uses temp ID until `replaceTask` swaps it — animation survives the ID swap without replaying
- POST /api/tasks must explicitly map and convert all fields — Drizzle's `mode: 'date'` columns are strict

## Deviations from Plan

1. **POST /api/tasks raw body passthrough** — Plan assumed the existing route was correct; it was passing the raw JSON body to Drizzle causing 500s on dated tasks. Fixed by explicit field mapping.
2. **Camera pan for someday** — Plan specified panning to all out-of-view horizons. Someday pan causes a teleport effect due to the 100+ Z-unit distance. Decision: skip pan for someday, toast-only feedback.

## User Setup Required

None — ANTHROPIC_API_KEY already required from Plan 05-02.

## Phase 5 Goal Achieved

The capture loop is end-to-end:
1. Input bubble always visible ✓
2. Natural language parsed by Haiku → structured task ✓
3. Optimistic scene update (task appears instantly) ✓
4. Postgres persistence (survives hard refresh) ✓
5. Entrance animation for new tasks only ✓
6. Camera auto-pans to new task's horizon (non-someday) ✓
7. Anthropic API never visible in browser DevTools ✓
8. Human approved checkpoint ✓

---
*Phase: 05-capture*
*Completed: 2026-02-27*
