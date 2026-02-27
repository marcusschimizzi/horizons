---
phase: 02-data-layer
plan: 02
subsystem: state-management
tags: [zustand, react-context, next-dynamic, server-components, ssr]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: TaskRow/Task types, Horizon type, getHorizon(), DB schema and connection
  - phase: 02-data-layer plan 01
    provides: CRUD API routes at /api/tasks, seed data in Postgres
provides:
  - Zustand vanilla store with TaskStoreProvider for server-side hydration
  - useTasksWithHorizon() selector computing horizon from targetDate + now
  - useTasksByHorizon() selector returning Map<Horizon, Task[]>
  - SceneLoader client boundary component with dynamic(ssr:false) Canvas import
  - page.tsx as async Server Component fetching tasks from DB
  - HorizonScene stub placeholder for Phase 3
affects: [03-3d-scene, 05-capture, 06-task-interactions, 07-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zustand vanilla createStore pattern for Next.js App Router (prevents SSR state leaks)"
    - "React Context + useRef for store instance isolation per request"
    - "dynamic(ssr: false) for WebGL/Canvas client boundary"
    - "Server Component direct DB query passing props through RSC boundary"

key-files:
  created:
    - src/stores/task-store.tsx
    - src/components/SceneLoader.tsx
    - src/components/HorizonScene.tsx
  modified:
    - src/app/page.tsx

key-decisions:
  - "File extension .tsx required for task-store (contains JSX for Context.Provider)"
  - "Context.Provider accessed via extracted variable to avoid TSX namespace resolution issues"
  - "React 19 Context.Provider pattern used (not Context-as-JSX which has build tooling issues)"

patterns-established:
  - "Zustand vanilla store: createStore from zustand/vanilla + React Context provider wrapping"
  - "Client boundary: dynamic(() => import(...), { ssr: false }) for any WebGL component"
  - "Server data flow: async Server Component -> db.select() -> pass as props to Client Component"
  - "Date deserialization: deserializeTask() reconstructs Date objects from ISO strings in API responses"

# Metrics
duration: 4min
completed: 2026-02-27
---

# Phase 2 Plan 2: Zustand Store + SceneLoader Summary

**Zustand vanilla store with server-side hydration, derived horizon selectors, and SceneLoader client boundary enforcing dynamic(ssr:false) Canvas import**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-27T07:34:44Z
- **Completed:** 2026-02-27T07:38:35Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Zustand vanilla store hydrates synchronously from server-fetched TaskRow[] with zero client-side fetch on mount
- Two derived selectors (useTasksWithHorizon, useTasksByHorizon) compute horizons lazily from targetDate + now
- SceneLoader enforces client/server boundary via dynamic(ssr: false) preventing WebGL code in SSR
- page.tsx is a pure Server Component querying Postgres directly and passing data through RSC boundary

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Zustand vanilla store with provider, hooks, and derived selectors** - `396a01e` (feat)
2. **Task 2: Create SceneLoader component and wire page.tsx as Server Component data fetcher** - `5347467` (feat)

## Files Created/Modified
- `src/stores/task-store.tsx` - Zustand vanilla store with TaskStoreProvider, CRUD actions, refresh(), and derived selectors
- `src/components/SceneLoader.tsx` - Client boundary component with dynamic HorizonScene import and loading/error states
- `src/components/HorizonScene.tsx` - Stub placeholder for Phase 3 3D scene
- `src/app/page.tsx` - Async Server Component fetching tasks from DB and passing to SceneLoader

## Decisions Made
- **File extension .tsx for store:** The store file contains JSX (Context.Provider rendering) so must use .tsx, not .ts as originally specified in the plan
- **Extracted Provider variable:** `TaskStoreContext.Provider` causes "Cannot find namespace" errors in Next.js 16 build; extracting to `const TaskStoreContextProvider = TaskStoreContext.Provider` resolves it
- **React 19 Context.Provider pattern:** The newer "Context-as-JSX" pattern (`<TaskStoreContext value={...}>`) does not work with Next.js 16's build toolchain; kept traditional `.Provider` access

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Changed file extension from .ts to .tsx**
- **Found during:** Task 1 (Zustand store creation)
- **Issue:** Plan specified `src/stores/task-store.ts` but file contains JSX (Context.Provider rendering). TypeScript cannot parse JSX in `.ts` files, causing build failure: "'TaskStoreContext' refers to a value, but is being used as a type here"
- **Fix:** Named file `task-store.tsx` instead of `task-store.ts`
- **Files modified:** src/stores/task-store.tsx
- **Verification:** `npm run build` compiles successfully
- **Committed in:** 396a01e (Task 1 commit)

**2. [Rule 3 - Blocking] Extracted Context.Provider to variable**
- **Found during:** Task 1 (Zustand store creation)
- **Issue:** `<TaskStoreContext.Provider>` in JSX causes "Cannot find namespace 'TaskStoreContext'" build error in Next.js 16 Turbopack. Both `.Provider` and direct Context-as-JSX patterns failed
- **Fix:** Extracted to `const TaskStoreContextProvider = TaskStoreContext.Provider` and used that in JSX
- **Files modified:** src/stores/task-store.tsx
- **Verification:** `npm run build` compiles successfully
- **Committed in:** 396a01e (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary to make the file compile. No scope creep.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Zustand store ready with all selectors Phase 3 needs (useTasksWithHorizon, useTasksByHorizon)
- SceneLoader renders HorizonScene stub via dynamic import -- Phase 3 replaces HorizonScene.tsx content
- Data pipeline fully wired: DB -> Server Component -> Client Component -> Zustand store
- No blockers for Phase 3

---
*Phase: 02-data-layer*
*Completed: 2026-02-27*
