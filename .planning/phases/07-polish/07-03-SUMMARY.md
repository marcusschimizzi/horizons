---
phase: "07-polish"
plan: "03"
subsystem: "accountability"
tags: ["refinement", "drift", "ai", "haiku", "task-detail"]
depends_on:
  requires: ["07-01", "07-02"]
  provides: ["refine-endpoint", "drift-prompt-ui", "refinement-ui"]
  affects: ["07-04"]
tech_stack:
  added: []
  patterns: ["two-mode-api-endpoint", "useEffect-fetch-with-cancellation", "optimistic-store-update"]
key_files:
  created:
    - "src/app/api/refine/route.ts"
  modified:
    - "src/components/TaskDetail.tsx"
decisions:
  - id: "remove-same-horizon-guard"
    summary: "Removed handleReschedule same-horizon early return to allow Recommit action"
metrics:
  duration: "3 min"
  completed: "2026-02-27"
---

# Phase 7 Plan 3: Refine Route and TaskDetail Refinement UI Summary

AI-powered refinement endpoint with two modes (generate prompt / apply clarification) plus drift accountability prompt and refinement UI in TaskDetail panel.

## What Was Done

### Task 1: Create /api/refine route
- Created `src/app/api/refine/route.ts` (137 lines) mirroring the parse route pattern
- Module-level Anthropic client singleton
- Two Zod schemas: `RefinementOutputSchema` (clarifyingQuestion + suggestedTitle) and `TaskRewriteSchema` (title + rawInput)
- POST handler with two modes:
  - Mode 1 (no userResponse): Generates a refinement prompt via Haiku, stores it in DB, returns it
  - Mode 2 (with userResponse): Haiku rewrites the task title and description, updates DB, clears needsRefinement
- Full validation, 404 handling, error handling matching existing API patterns

### Task 2: Drift accountability prompt + refinement UI in TaskDetail
- Added refinement state variables (refinementData, refinementResponse, refinementLoading)
- Added useEffect to load refinement data: tries stored refinementPrompt first, falls back to /api/refine fetch
- Added handleRefinementSubmit callback: sends userResponse to /api/refine, updates store and local state
- Refinement UI section between info bar and textarea (blue-themed, shows clarifying question + suggested title + input)
- Drift accountability prompt between reschedule pills and action bar (amber-themed, shows at driftCount >= 3)
- Drift prompt offers three actions: Recommit (same horizon), Snooze (someday), Drop
- Removed same-horizon guard from handleReschedule to enable Recommit

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed same-horizon guard in handleReschedule**
- **Found during:** Task 2
- **Issue:** `handleReschedule` had `if (newHorizon === task.horizon) return;` which would make the Recommit button a no-op since it calls `handleReschedule(task.horizon)` to reset dates in the same horizon
- **Fix:** Removed the guard so rescheduling to the same horizon generates fresh date windows
- **Files modified:** src/components/TaskDetail.tsx

**2. [Rule 2 - Missing Critical] Added fetch cancellation in refinement useEffect**
- **Found during:** Task 2
- **Issue:** Without cleanup, a stale fetch could update state after the task changes or component unmounts
- **Fix:** Added `cancelled` flag pattern with cleanup return in useEffect
- **Files modified:** src/components/TaskDetail.tsx

## Decisions Made

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Remove same-horizon guard from handleReschedule | Required for Recommit to work (resetting dates within same horizon) |
| 2 | Cancellation flag in refinement fetch useEffect | Prevents stale responses from updating wrong task's state |

## Next Phase Readiness

All accountability and refinement UI is in place. The /api/refine endpoint is ready. Phase 07-04 (list view and final polish) can proceed.
