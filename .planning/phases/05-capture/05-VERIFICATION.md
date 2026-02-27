---
phase: 05-capture
verified: 2026-02-27T21:36:31Z
status: passed
score: 5/5 must-haves verified
---

# Phase 5: Capture Verification Report

**Phase Goal:** The capture loop is end-to-end — a user can type a natural language intention into the input bubble, have Haiku parse and place it in the 3D scene at the correct horizon, and see it persist after a page refresh, all without the Anthropic key ever reaching the client.
**Verified:** 2026-02-27T21:36:31Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Input bubble is always visible as a fixed overlay | VERIFIED | `InputBubble.tsx` uses `position: 'fixed'`, `bottom: 24`, `zIndex: 110` — DOM overlay outside Canvas |
| 2 | Typing a natural language intention calls `/api/parse` and returns a structured task | VERIFIED | `handleSubmit` POSTs to `/api/parse`; route calls Haiku via Anthropic SDK with `zodOutputFormat(ParsedTaskSchema)` returning `title`, `targetDateEarliest`, `targetDateLatest`, `tags`, `needsRefinement` |
| 3 | Parsed task is written to Postgres and survives a hard page refresh | VERIFIED | Background `fetch('/api/tasks', { method: 'POST' })` in `InputBubble.tsx:162-188`; `POST /api/tasks` inserts via Drizzle with explicit `new Date()` conversion; `page.tsx` SSR queries DB on every load |
| 4 | New task materializes in 3D scene at correct horizon Z with entrance animation | VERIFIED | `TaskNode.tsx` uses `useIsNewTask`; `TaskSprite.tsx` runs useFrame glow-in (scale 0→1, opacity 0→SCENE_CONSTANTS.spriteOpacity, ease-out cubic 0.6s); `TaskCard.tsx` runs CSS opacity+scale transition (0.5s); position comes from `getTaskPosition(task.id, task.horizon)` which uses Z-depth from `getZDepth(horizon)` |
| 5 | No Anthropic API request visible in browser DevTools | VERIFIED | `new Anthropic()` client instantiated only in `src/app/api/parse/route.ts` (server route). `ANTHROPIC_API_KEY` has no `NEXT_PUBLIC_` prefix. `InputBubble.tsx` imports `type ParsedTask` only — type-only import is erased at compile time, no SDK code bundled to client |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/InputBubble.tsx` | Fixed overlay input with submit flow | VERIFIED | 403 lines; `position: 'fixed'`, Enter key handler, loading state, POST to `/api/parse` + `/api/tasks`, optimistic add + replaceTask + rollback, toast, camera pan |
| `src/app/api/parse/route.ts` | Server-side Haiku extraction | VERIFIED | 92 lines; Anthropic client server-only, zod structured output, 400 on empty/invalid input, 422 on refusal |
| `src/app/api/tasks/route.ts` | Postgres CRUD for tasks | VERIFIED | 54 lines; GET reads all tasks, POST inserts with explicit `new Date()` conversion for timestamp columns |
| `src/stores/task-store.tsx` | Zustand store with optimistic update lifecycle | VERIFIED | 203 lines; `addTask`, `replaceTask`, `removeTask`, `clearNewTask`, `useIsNewTask`, `newTaskIds` Set |
| `src/components/TaskNode.tsx` | Passes `isNew` to children | VERIFIED | 28 lines; `useIsNewTask(task.id)` → passes `isNew` to both `TaskCard` and `TaskSprite` |
| `src/components/TaskSprite.tsx` | Glow-in entrance animation | VERIFIED | 108 lines; useFrame with mountTimeRef lazy-init, ease-out cubic over 0.6s, scale+opacity from zero, `clearNewTask` on complete |
| `src/components/TaskCard.tsx` | CSS fade-in entrance animation | VERIFIED | 93 lines; `useState(!isNew)` for entered state, requestAnimationFrame trigger, opacity+scale CSS transition 0.5s, `clearNewTask` after 500ms |
| `src/components/HorizonScene.tsx` | Renders InputBubble outside Canvas | VERIFIED | 154 lines; `<InputBubble />` rendered at line 150, outside `<Canvas>`, within `TaskStoreProvider` context tree via `SceneLoader` |
| `src/components/SceneLoader.tsx` | Wraps HorizonScene in TaskStoreProvider | VERIFIED | 66 lines; `<TaskStoreProvider initialTasks={initialTasks}>` wraps `<HorizonScene />` |
| `src/app/page.tsx` | Server component fetches tasks from DB on load | VERIFIED | 13 lines; `await db.select().from(tasks)` → passes to `<SceneLoader initialTasks={allTasks} />` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `InputBubble.tsx` | `/api/parse` | `fetch POST` in `handleSubmit` | WIRED | Line 81: `fetch('/api/parse', { method: 'POST', ... })`, response read via `parseRes.json()` into `parsed: ParsedTask` |
| `InputBubble.tsx` | TaskStore | `store.getState().addTask(tempTask)` | WIRED | Line 131: optimistic add; line 181: `replaceTask(tempId, real)`; line 184: `removeTask(tempId)` on failure |
| `InputBubble.tsx` | `/api/tasks` | `fetch POST` background persist | WIRED | Lines 162-188: fire-and-forget POST with explicit ISO string body, `.then` deserializes and calls `replaceTask`, `.catch` calls `removeTask` |
| `TaskNode.tsx` | `useIsNewTask` | Context hook | WIRED | Line 21: `const isNew = useIsNewTask(task.id)` — propagated to `TaskCard` and `TaskSprite` |
| `TaskSprite.tsx` | entrance animation | `useFrame` + `mountTimeRef` | WIRED | Lines 64-88: useFrame runs when `isNew`, lazy-init on first frame, eases scale+opacity, calls `clearNewTask` on completion |
| `TaskCard.tsx` | entrance animation | `useState(!isNew)` + `requestAnimationFrame` | WIRED | Lines 21-40: entered state starts false for new tasks, rAF triggers transition, setTimeout clears newTask flag |
| `InputBubble.tsx` | camera pan | `cameraStore.setState` | WIRED | Lines 151-158: skips someday, computes isVisible window, sets `targetZ`, `velocity: 0`, `isAnimating: true` |
| `/api/parse/route.ts` | Anthropic Haiku | `client.messages.parse` | WIRED | Lines 69-75: calls `claude-haiku-4-5-20251001` with zod structured output, returns `response.parsed_output` |
| `/api/tasks/route.ts` | Postgres | `db.insert(tasks).values(...)` | WIRED | Lines 35-46: explicit field mapping with `new Date()` conversion, `.returning()` returns created row |
| `page.tsx` | Postgres | `db.select().from(tasks)` | WIRED | Line 7: SSR fetch on every request ensures persistence visible after hard refresh |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| Input bubble always visible as fixed overlay | SATISFIED | `position: 'fixed'`, `zIndex: 110`, outside Canvas |
| Input accessible at any camera position | SATISFIED | DOM overlay, not inside R3F scene |
| Dark-space aesthetic | SATISFIED | `rgba(18, 18, 26, 0.85)` background with `backdropFilter: blur(12px)` |
| Enter submits, clears field, shows loading | SATISFIED | `handleKeyDown` → `handleSubmit`; `setInputValue('')`; `isLoading` state with animated dots |
| POST /api/parse returns structured task | SATISFIED | Zod schema enforces `title`, `targetDateEarliest`, `targetDateLatest`, `tags`, `needsRefinement` |
| Anthropic API key server-side only | SATISFIED | No `NEXT_PUBLIC_` prefix; client only in `app/api/` route |
| Ambiguous input returns `needsRefinement: true` | SATISFIED | System prompt + zod schema enforce this; null dates + needsRefinement flag |
| Invalid/empty input returns 400 | SATISFIED | `route.ts` line 60-65: validates input exists and is non-empty string |
| Task persists to Postgres | SATISFIED | POST /api/tasks with explicit Date conversion; page.tsx SSR re-fetches on load |
| Optimistic update with rollback on failure | SATISFIED | `addTask` optimistic → `replaceTask` on success → `removeTask` + error on failure |
| Entrance animation for new tasks only | SATISFIED | `newTaskIds` Set; existing tasks initialize with `isNew = false`; animation only runs when `isNew = true` |
| Camera pans to new task's horizon | SATISFIED | Pans to non-someday horizons; skips someday (documented decision) |
| Toast confirms 'Added {title} to {horizon}' | SATISFIED | `showToast(parsed.title, horizonLabel)` renders `Added '{toast.title}' to {toast.horizon}` |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `InputBubble.tsx` | 343 | `placeholder=` attribute | Info | HTML input placeholder attribute — not a stub, this is correct usage |

No blockers or warnings found. The only match for "placeholder" is the HTML `placeholder` attribute on the text input, which is correct usage.

### Human Verification Required

The following items require human testing and cannot be verified programmatically:

#### 1. End-to-End Parse and Materialization

**Test:** Type "dentist appointment next Tuesday" into the input and press Enter
**Expected:** Loading dots appear, then a task card or sprite materializes in the 3D scene at the correct horizon (this-week if next Tuesday is < 7 days out), with a toast "Added 'Dentist appointment' to This Week"
**Why human:** Requires live Anthropic API call and visual 3D scene confirmation

#### 2. Hard Page Refresh Persistence

**Test:** After adding a task, perform a hard refresh (Cmd+Shift+R)
**Expected:** The same tasks appear in the scene after reload (no entrance animation on reload)
**Why human:** Requires Postgres running and verifying DB state

#### 3. Entrance Animation Visual Quality

**Test:** Add a new task and watch the sprite or card appear
**Expected:** Sprites glow in with scale+opacity ease-out over 0.6s; cards fade in with scale 0.85→1 and opacity 0→1 over 0.5s
**Why human:** Visual quality cannot be verified from static code

#### 4. Camera Pan to Out-of-View Horizon

**Test:** Add a task with a date 3 months out while camera is at Z=10 (near/immediate)
**Expected:** Camera smoothly pans to this-quarter horizon
**Why human:** Requires visual confirmation of smooth animation vs. teleport

#### 5. Anthropic Key Not Visible in Browser DevTools

**Test:** Open DevTools Network tab, submit a task; inspect all requests
**Expected:** Only requests to `/api/parse` and `/api/tasks` — no direct requests to `api.anthropic.com`
**Why human:** Requires runtime browser DevTools inspection

### Gaps Summary

No gaps found. All 5 observable truths are verified. The implementation is fully wired end-to-end:

- `InputBubble.tsx` is a complete, self-contained component (403 lines) with the full capture flow
- `/api/parse/route.ts` calls Haiku server-side with structured output — no client-side AI exposure
- `/api/tasks/route.ts` correctly converts ISO date strings to `Date` objects before Drizzle insert
- `task-store.tsx` has the full optimistic update lifecycle (`addTask` → `replaceTask` → `removeTask`)
- `TaskNode.tsx` correctly sources `isNew` from `useIsNewTask` and propagates to both `TaskSprite` and `TaskCard`
- `TaskSprite.tsx` and `TaskCard.tsx` both have real entrance animation implementations (not stubs)
- `HorizonScene.tsx` renders `<InputBubble />` as a DOM overlay outside the Canvas
- `page.tsx` server-side fetches all tasks on every load, ensuring post-refresh persistence

The someday camera pan skip is a documented, intentional decision (flying 100+ Z-units causes teleport effect) — not a gap.

---

_Verified: 2026-02-27T21:36:31Z_
_Verifier: Claude (gsd-verifier)_
