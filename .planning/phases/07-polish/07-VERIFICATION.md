---
phase: 07-polish
verified: 2026-02-28T02:09:12Z
status: gaps_found
score: 27/28 must-haves verified
re_verification: false
gaps:
  - truth: "Filter controls allow filtering by tag, needs-refinement flag, and horizon visibility"
    status: partial
    reason: "Tag and needs-refinement filter controls exist in ListView UI, but there are no UI controls for horizon visibility filtering. The horizons filter state exists in the Zustand store (listFilters.horizons: Set<string>) and the filtering logic is applied in ListView's filteredTasks memo (line 62), but no buttons or toggles in the filter bar allow the user to activate horizon-based filtering."
    artifacts:
      - path: "src/components/ListView.tsx"
        issue: "Filter bar renders tag pills and needs-refinement toggle but has no horizon filter controls. The listFilters.horizons set defaults to empty (show all) and nothing in the UI can change it."
    missing:
      - "Horizon filter buttons or toggles in the ListView filter bar that call setListFilter('horizons', ...) with a Set of selected horizon values"
human_verification:
  - test: "Toast non-blocking behavior"
    expected: "DriftNotification toast renders at z-index 105 with pointerEvents none — clicking scene elements behind the toast should still work"
    why_human: "Cannot verify pointer event passthrough without interaction in a running browser"
  - test: "Bloom depth hierarchy readability"
    expected: "With real task data, near tasks (cards at immediate/this-week) appear brighter and bloom more prominently than distant sprites"
    why_human: "Visual tuning verification requires running the scene with real data"
  - test: "Adaptive fog visual effect"
    expected: "Adding more tasks subtly increases fog density, making far-horizon tasks hazier"
    why_human: "Visual fog effect requires browser rendering to evaluate"
  - test: "Refinement prompt — full AI round trip"
    expected: "Clicking a task with needsRefinement=true and no stored refinementPrompt triggers a POST to /api/refine, returns clarifyingQuestion+suggestedTitle, displays in TaskDetail. Responding rewrites the title and clears needsRefinement."
    why_human: "Requires live Anthropic API key (ANTHROPIC_API_KEY env var) and database records"
---

# Phase 7: Polish Verification Report

**Phase Goal:** The experience is complete — drift accountability is tracked and surfaced, AI-powered refinement prompts work end-to-end, the list view escape hatch is fully functional, and bloom post-processing is tuned so the scene looks right with real task data.
**Verified:** 2026-02-28T02:09:12Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | On page load, tasks with expired targetDateLatest get driftCount +1 | VERIFIED | page.tsx lines 12-26: UPDATE with `driftCount + 1` WHERE `status='active' AND targetDateLatest IS NOT NULL AND targetDateLatest < now` |
| 2 | Refreshing twice rapidly does NOT double-increment driftCount | VERIFIED | page.tsx lines 14-20: After increment, `targetDateLatest` is advanced by `GREATEST(window_duration, 7 days)` so same task no longer qualifies on next load |
| 3 | Someday tasks (no targetDateLatest) are never drift-incremented | VERIFIED | page.tsx line 23: `isNotNull(tasks.targetDateLatest)` WHERE clause excludes null targetDateLatest records |
| 4 | Tasks reaching driftCount >= 3 get needsRefinement = true | VERIFIED | page.tsx lines 29-38: After increment, filters `drifted` for `t.driftCount >= 3 && !t.needsRefinement` and runs secondary UPDATE |
| 5 | Non-blocking toast appears when drifted tasks exist | VERIFIED | DriftNotification.tsx: rendered at z-index 105 with `pointerEvents: 'none'`, wired in HorizonScene.tsx line 247 |
| 6 | Toast auto-dismisses after 5 seconds | VERIFIED | DriftNotification.tsx lines 14-15: fade starts at 4000ms, `setVisible(false)` at 5000ms |
| 7 | Fog density increases slightly with more tasks (adaptive fog) | VERIFIED | HorizonScene.tsx lines 52-53: `baseDensity + Math.min(taskCount * 0.0002, 0.008)`; taskCount passed from tasks.length |
| 8 | Bloom tuned for depth hierarchy readability | VERIFIED | scene-constants.ts: `bloomIntensity: 1.8`, `bloomLuminanceThreshold: 0.15`, `bloomLuminanceSmoothing: 0.015` |
| 9 | Card-tier tasks with driftCount > 0 show amber number badge | VERIFIED | TaskCard.tsx lines 124-143: `isDrifted && <span>` with amber background at absolute position top-right |
| 10 | Card-tier needsRefinement displays blue box-shadow pulse | VERIFIED | TaskCard.tsx lines 113-116 (keyframes), lines 52-54: `refinementPulse 3s ease-in-out infinite` applied when `task.needsRefinement && !hasDeadline` |
| 11 | Sprite-tier tasks fade in opacity as driftCount increases (floor 0.4) | VERIFIED | TaskSprite.tsx lines 113-115: `driftReduction = min(driftCount * 0.08, 0.5)`, `opacity = max(0.4, 0.9 - driftReduction)` |
| 12 | Sprite-tier needsRefinement shows pulsing blue ring mesh | VERIFIED | TaskSprite.tsx lines 185-196: `ringGeometry [radius*1.4, radius*1.6]` with `#88aaff` material, `refinementRingRef` pulsed in useFrame |
| 13 | Tasks with hardDeadline show amber pulse ring on both tiers (VIS-03) | VERIFIED | TaskCard.tsx: `deadlinePulse 4s` keyframe; TaskSprite.tsx lines 173-183: amber ring at `[radius*1.2, radius*1.35]`, pulsed via `deadlineRingRef` in useFrame |
| 14 | driftCount >= 3 shows compassionate drift prompt "This has moved N times. What's in the way?" | VERIFIED | TaskDetail.tsx line 741-744: condition `task.driftCount >= 3 && actionResult === null`, text renders `task.driftCount` times |
| 15 | Drift prompt offers Recommit, Snooze to Someday, Drop | VERIFIED | TaskDetail.tsx lines 747-755: three buttons — Recommit calls `handleReschedule(task.horizon)`, Snooze calls `handleReschedule('someday')`, Drop calls `handleDrop()` |
| 16 | Tasks with needsRefinement show refinement prompt in detail panel | VERIFIED | TaskDetail.tsx lines 666-698: conditional `{task.needsRefinement && <div>}` renders clarifyingQuestion + suggestedTitle + input |
| 17 | No stored refinementPrompt triggers fetch from /api/refine | VERIFIED | TaskDetail.tsx lines 102-134: useEffect checks `task.refinementPrompt`, falls through to `fetch('/api/refine', ...)` if absent |
| 18 | User submits response — Haiku rewrites title and clears needsRefinement | VERIFIED | TaskDetail.tsx lines 324-351: `handleRefinementSubmit` POSTs `{ taskId, userResponse }` to `/api/refine`, updates store with `needsRefinement: false` |
| 19 | POST /api/refine without userResponse returns { clarifyingQuestion, suggestedTitle } | VERIFIED | refine/route.ts lines 58-82: when `!userResponse`, uses `RefinementOutputSchema` with those fields and returns `Response.json(prompt)` |
| 20 | POST /api/refine with userResponse returns { title, needsRefinement: false } and updates DB | VERIFIED | refine/route.ts lines 83-122: runs `TaskRewriteSchema`, sets `needsRefinement: false` in DB, returns `{ title, rawInput, needsRefinement: false }` |
| 21 | Toggle button visible switching between 3D scene and list view | VERIFIED | HorizonScene.tsx lines 206-227: fixed button at top:20 left:20, label toggles between "List View" / "3D View" |
| 22 | Pressing 'L' key toggles between 3D scene and list view | VERIFIED | HorizonScene.tsx lines 188-200: `keydown` listener checks `e.key === 'l' \|\| e.key === 'L'`, guarded against HTMLInputElement/HTMLTextAreaElement |
| 23 | List view shows all tasks grouped by horizon band | VERIFIED | ListView.tsx lines 12-19 (HORIZON_ORDER), lines 67-74 (grouped Map), lines 197-246: renders all 6 horizon sections with tasks |
| 24 | Each horizon group is collapsible | VERIFIED | ListView.tsx lines 77-84 (toggleSection), lines 200-246: click on header toggles collapsedSections Set, `{!isCollapsed && sectionTasks.map(...)}` |
| 25 | Each task row shows title, tags, drift count, and quick action buttons | VERIFIED | ListView.tsx: title (line 279), needsRefinement dot (280-291), drift badge (295-308), tag pills (311-324), quick actions (327-375) |
| 26 | Quick actions work: Complete, Drop, Reschedule inline | VERIFIED | ListView.tsx lines 98-133: `handleQuickComplete`, `handleQuickDrop`, `handleQuickReschedule` all call store actions and PATCH API |
| 27 | Clicking a task row opens the TaskDetail panel | VERIFIED | ListView.tsx line 264: `onClick={() => store?.getState().selectTask(task.id)}` — TaskDetail is rendered in HorizonScene for both views |
| 28 | Filter controls allow filtering by tag, needs-refinement flag, and horizon visibility | PARTIAL | Tag filter pills (lines 160-177) and needs-refinement toggle (lines 178-192) are present. **Horizon visibility filter: the `listFilters.horizons` state exists and the filter logic is applied (line 62), but no UI controls exist to set horizon filters.** |
| 29 | The 3D Canvas is hidden (not unmounted) when list view is active | VERIFIED | HorizonScene.tsx line 230: `<div style={{ display: showListView ? 'none' : 'contents' }}>` wraps Canvas |

**Score:** 27/28 truths verified (1 partial gap)

---

## Required Artifacts

| Artifact | Lines | Exists | Substantive | Wired | Status |
|----------|-------|--------|-------------|-------|--------|
| `src/app/page.tsx` | 51 | YES | YES — drift logic, needsRefinement flagging, driftSummary prop | YES — renders SceneLoader with driftSummary | VERIFIED |
| `src/components/DriftNotification.tsx` | 59 | YES | YES — full animated toast | YES — imported and used in HorizonScene | VERIFIED |
| `src/components/SceneLoader.tsx` | 67 | YES | YES — driftSummary prop added | YES — passes to HorizonScene | VERIFIED |
| `src/components/HorizonScene.tsx` | 256 | YES | YES — adaptive fog, DriftNotification, toggle, L key, Canvas hiding | YES — fully wired | VERIFIED |
| `src/lib/scene-constants.ts` | 57 | YES | YES — bloom tuned (intensity 1.8, threshold 0.15, smoothing 0.015) | YES — used in HorizonScene via SCENE_CONSTANTS | VERIFIED |
| `src/components/TaskCard.tsx` | 149 | YES | YES — drift badge, refinementPulse, deadlinePulse | YES — rendered by TaskNode | VERIFIED |
| `src/components/TaskSprite.tsx` | 201 | YES | YES — drift opacity with 0.4 floor, refinement ring, deadline ring | YES — rendered by TaskNode | VERIFIED |
| `src/components/TaskDetail.tsx` | 791 | YES | YES — drift prompt at >= 3, refinement UI, handleRefinementSubmit | YES — rendered in HorizonScene | VERIFIED |
| `src/app/api/refine/route.ts` | 137 | YES | YES — two modes, Haiku client, Zod schemas, DB update | YES — called from TaskDetail | VERIFIED |
| `src/components/ListView.tsx` | 429 | YES | YES — full list with grouping, filters, quick actions | YES — rendered in HorizonScene when showListView | VERIFIED |
| `src/stores/task-store.tsx` | 326 | YES | YES — showListView, listFilters, toggleListView, setListFilter | YES — consumed by HorizonScene and ListView | VERIFIED |

---

## Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `page.tsx` | Postgres | `db.update(tasks)...returning()` | WIRED |
| `page.tsx` | `SceneLoader` | `driftSummary` prop | WIRED |
| `SceneLoader` | `HorizonScene` | `driftSummary` prop passthrough | WIRED |
| `HorizonScene` | `DriftNotification` | `driftSummary && count > 0` conditional render | WIRED |
| `HorizonScene` | `FogSetup` | `tasks.length` as taskCount | WIRED |
| `FogSetup` | `THREE.FogExp2` | `baseDensity + min(taskCount * 0.0002, 0.008)` | WIRED |
| `HorizonScene` | `ListView` | `showListView && <ListView />` | WIRED |
| `HorizonScene` | `Canvas` | `display: showListView ? 'none' : 'contents'` hide wrapper | WIRED |
| `HorizonScene` | `window` | `addEventListener('keydown', ...)` L key handler | WIRED |
| `TaskCard` | drift badge | `isDrifted && <span>` with `task.driftCount` | WIRED |
| `TaskCard` | pulse animation | CSS keyframes conditional on `hasDeadline` / `needsRefinement` | WIRED |
| `TaskSprite` | opacity | `useFrame`: `max(0.4, spriteOpacity - driftCount * 0.08)` | WIRED |
| `TaskSprite` | refinement ring | `ringGeometry` + `refinementRingRef` pulsed in `useFrame` | WIRED |
| `TaskSprite` | deadline ring | `ringGeometry` + `deadlineRingRef` pulsed in `useFrame` | WIRED |
| `TaskDetail` | `/api/refine` | `fetch('/api/refine', ...)` in useEffect and handleRefinementSubmit | WIRED |
| `TaskDetail` | drift prompt | `task.driftCount >= 3 && actionResult === null` conditional | WIRED |
| `refine/route.ts` | Anthropic Haiku | `client.messages.parse(...)` with model `claude-haiku-4-5-20251001` | WIRED |
| `refine/route.ts` | Postgres | `db.update(tasks).set({ needsRefinement: false })` | WIRED |
| `ListView` | task-store | `useTasksWithHorizon`, `store.getState().selectTask()`, PATCH API | WIRED |
| `ListView` | horizon filter | `listFilters.horizons` applied in filter logic — but no UI controls | PARTIAL |

---

## Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| Drift accountability tracking (07-01) | SATISFIED | Server-side increment on page load with double-count prevention |
| Drift notification UI (07-01) | SATISFIED | DriftNotification toast, 5s auto-dismiss, z-105, non-blocking |
| Adaptive fog (07-01) | SATISFIED | Formula: `baseDensity + min(taskCount * 0.0002, 0.008)` |
| Bloom tuning (07-01) | SATISFIED | intensity 1.8, threshold 0.15, smoothing 0.015 |
| needsRefinement auto-flagging (07-01) | SATISFIED | Secondary UPDATE in page.tsx for tasks hitting 3+ drifts |
| Card drift indicators (07-02) | SATISFIED | Amber badge, blue/amber box-shadow pulses with correct priorities |
| Sprite drift indicators (07-02) | SATISFIED | Opacity degradation with 0.4 floor, ring meshes for refinement and deadline |
| Drift accountability prompt (07-03) | SATISFIED | Shows at driftCount >= 3, correct text, three action buttons |
| Refinement UI in TaskDetail (07-03) | SATISFIED | Shows clarifyingQuestion + suggestedTitle + input, submits to /api/refine |
| /api/refine endpoint (07-03) | SATISFIED | Two-mode Haiku-powered endpoint with DB update |
| List view toggle (07-04) | SATISFIED | Button and L key, both wired to toggleListView |
| List view grouping (07-04) | SATISFIED | All 6 horizons, collapsible, task rows with all required data |
| List view quick actions (07-04) | SATISFIED | Complete, Drop, Move (inline reschedule dropdown) all wired |
| Horizon visibility filter UI (07-04) | BLOCKED | Filter logic exists but no UI controls |
| Canvas hidden (not unmounted) (07-04) | SATISFIED | `display: showListView ? 'none' : 'contents'` wrapper |

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/components/TaskDetail.tsx:685` | `placeholder="Type your response..."` | Info | Input placeholder text — this is the correct HTML attribute usage for a text input, not a stub indicator |

No blocker or warning anti-patterns found. The single match is a legitimate HTML placeholder attribute.

---

## Human Verification Required

### 1. Toast Non-Blocking Behavior
**Test:** With tasks that have drifted (driftCount increments on page load), trigger the DriftNotification toast. While it is displayed, click on a task node behind it.
**Expected:** The click passes through the toast to the scene element (task opens in TaskDetail). Toast does not intercept interactions.
**Why human:** `pointerEvents: 'none'` is set on the toast div but verifying actual click-through behavior requires browser rendering.

### 2. Bloom Depth Hierarchy Readability
**Test:** Load the app with a mix of immediate/this-week tasks (cards) and this-month and beyond tasks (sprites). Observe bloom effect.
**Expected:** Card-tier tasks at close horizon appear with more prominent glow; sprite-tier tasks at far horizons appear dimmer and more fog-obscured. The luminance threshold of 0.15 should create visible bloom on all emissive materials.
**Why human:** Visual quality of post-processing requires live browser rendering to evaluate.

### 3. Adaptive Fog Effect
**Test:** Open the app with a large number of tasks (10+) versus a small number (1-2). Compare fog density in the far-horizon area.
**Expected:** With more tasks, distant sprites appear slightly hazier due to increased fog density. The formula `baseDensity + min(count * 0.0002, 0.008)` means a change from 0 to 40 tasks adds a maximum of 0.008 to the base 0.015, increasing density by ~53%.
**Why human:** Fog visual effect requires browser rendering with actual task counts to perceive the difference.

### 4. AI Refinement Round Trip
**Test:** Create a task, wait for it to accumulate 3+ drifts (or manually set `needsRefinement = true` and clear `refinementPrompt` in DB). Open the task in TaskDetail. Observe the refinement section load. Type a response and click Refine.
**Expected:** (1) Refinement section shows a clarifying question and suggested title from Haiku. (2) After typing a response and submitting, the task title updates to the Haiku-rewritten version, the blue pulse ring disappears from the sprite, and the refinement section no longer appears in TaskDetail.
**Why human:** Requires live Anthropic API key, database with properly configured task records, and interactive UI flow.

---

## Gaps Summary

One gap was identified across all 28 must-have truths:

**Horizon visibility filter in ListView has no UI controls.** The `listFilters.horizons` Set<string> is present in the Zustand store (task-store.tsx) and the filtering logic correctly applies it in ListView's `filteredTasks` memo. However, the filter bar in ListView only renders tag pills (work, personal, health, finance, home, social) and a "needs refinement" toggle. There are no buttons or controls that call `setListFilter('horizons', ...)` to activate horizon-based filtering. The feature is ~80% complete: the state management and filtering logic are wired, but the user-facing control is missing.

The collapsible section headers do provide a workaround (users can collapse individual horizon groups), but this is a section display toggle, not a persistent filter. The filter bar must have explicit horizon controls to satisfy the must-have.

All other 27 must-haves across plans 07-01 through 07-04 are fully verified at all three levels (exists, substantive, wired):
- Drift recalculation and double-count prevention work correctly in page.tsx
- DriftNotification toast wires end-to-end from server RSC to client component
- All visual indicators (badges, pulses, rings, opacity degradation) are substantive and connected
- Drift accountability prompt and refinement UI in TaskDetail are fully implemented
- /api/refine two-mode endpoint is complete with real Haiku calls and DB updates
- List view toggle, grouping, collapsibility, task rows, and quick actions all work

---

_Verified: 2026-02-28T02:09:12Z_
_Verifier: Claude (gsd-verifier)_
