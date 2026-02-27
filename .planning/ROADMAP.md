# Roadmap: Horizon

## Overview

Horizon is a personal-use PoC that bets a single thesis: a 3D spatial view where Z-depth equals time produces a meaningfully different relationship with task management than any flat list. The build follows a strict dependency chain — foundation and data infrastructure first, then the 3D scene (the thesis), then camera, capture, mutation, and polish. The app is feature-complete for its core thesis test after Phase 6; Phase 7 adds accountability and the list view escape hatch.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Next.js scaffold, DB schema, Drizzle migrations, shared types, horizon math library
- [x] **Phase 2: Data Layer** - CRUD API routes, seed data, Zustand store, SceneLoader client boundary
- [x] **Phase 3: 3D Scene** - Canvas, fog, atmosphere, TaskNodes with LOD (card + sprite), visual system
- [x] **Phase 4: Camera** - Scroll Z-axis movement, easing/momentum, limits, snap-to-present, mouse parallax
- [ ] **Phase 5: Capture** - Natural language input bubble, Haiku parse route, persistence, entrance animation
- [ ] **Phase 6: Task Interactions** - TaskDetail panel, complete/drop/reschedule/edit with animations
- [ ] **Phase 7: Polish** - Accountability/drift tracking, refinement flow, list view, bloom tuning

## Phase Details

### Phase 1: Foundation
**Goal**: The project structure exists, Postgres is connected, Drizzle schema and migrations run, all shared types are defined, and horizon math (`lib/horizons.ts`) is implemented — every subsequent phase builds on this without touching setup again.
**Depends on**: Nothing (first phase)
**Requirements**: None (pure infrastructure — all v1 requirements depend on this existing)
**Success Criteria** (what must be TRUE):
  1. `next dev` runs without error and the default page loads in browser
  2. `drizzle-kit push` applies the tasks schema to Railway Postgres with no errors
  3. `lib/horizons.ts` exports `getHorizon(targetDate, now)` and `getZDepth(horizon)` — importable by any module
  4. TypeScript compiles the full codebase with zero type errors
**Plans**: 3 plans in 2 waves

Plans:
- [ ] 01-01-PLAN.md — Next.js 15 scaffold, R3F 9 version matrix, Tailwind v4, Docker Compose Postgres (Wave 1)
- [ ] 01-02-PLAN.md — Drizzle schema, globalThis connection singleton, migrations (Wave 2)
- [ ] 01-03-PLAN.md — Shared types, horizon math, spatial scatter algorithm with TDD (Wave 2)

### Phase 2: Data Layer
**Goal**: The app has real task data in Postgres, a working CRUD API, and a Zustand store that hydrates from the server — the 3D scene has everything it needs to render without building any UI yet.
**Depends on**: Phase 1
**Requirements**: None (infrastructure that enables Phase 3 scene development against real data)
**Success Criteria** (what must be TRUE):
  1. `GET /api/tasks` returns seeded task data as JSON with correct shape
  2. `POST /api/tasks`, `PATCH /api/tasks/[id]`, `DELETE /api/tasks/[id]` all persist changes to Postgres
  3. Zustand store hydrates synchronously from server-fetched tasks before first render (no flash)
  4. `SceneLoader` component enforces the client/server boundary — Canvas never imported by RSC
**Plans**: 2 plans in 1 wave

Plans:
- [ ] 02-01-PLAN.md — CRUD API routes (GET/POST/PATCH/DELETE) + seed script with ~35 representative tasks (Wave 1)
- [ ] 02-02-PLAN.md — Zustand vanilla store + SceneLoader client boundary + page.tsx server data fetch (Wave 1)

### Phase 3: 3D Scene
**Goal**: The spatial thesis is visible — users can see tasks laid out by time horizon in 3D space, with fog making distance legible, close tasks rendered as full cards, distant tasks as glowing sprites, LOD transitioning smoothly between them, and the scene atmosphere giving the dark-space feel.
**Depends on**: Phase 2
**Requirements**: SCENE-01, SCENE-02, SCENE-03, SCENE-04, SCENE-05, SCENE-06, VIS-01, VIS-02, VIS-03
**Success Criteria** (what must be TRUE):
  1. Tasks are visible in the 3D scene positioned at Z-depths corresponding to their horizon band (Immediate nearest, Someday farthest)
  2. Distant tasks are noticeably blurred and shrunk by exponential fog — proximity equals legibility at a glance
  3. Close tasks (Immediate, This Week) render as Html cards showing title only
  4. Distant tasks (This Month+) render as colored glowing sprites — no text, colored by tag category
  5. Moving the camera causes cards to flip to sprites and vice versa smoothly (no pop)
  6. The background includes a star field / particles and bloom post-processing is active on emissive nodes
**Plans**: 4 plans in 3 waves

Plans:
- [ ] 03-01-PLAN.md — Canvas setup (fog, lights, stars, bloom, invalidate), scene-constants.ts (Wave 1)
- [ ] 03-02-PLAN.md — TaskSprite.tsx: billboard emissive circle, tag-based glow color, bloom (Wave 2)
- [ ] 03-03-PLAN.md — TaskCard.tsx: drei Html card, title only, deadline ring, drift indicator (Wave 2)
- [ ] 03-04-PLAN.md — TaskNode.tsx LOD controller, DebugOverlay, full scene integration (Wave 3)

### Phase 4: Camera
**Goal**: The signature interaction works — users can fly through time by scrolling, feel momentum and easing as they move, cannot scroll out of bounds, can snap back to the present instantly, and experience subtle parallax that reinforces depth perception.
**Depends on**: Phase 3
**Requirements**: CAM-01, CAM-02, CAM-03, CAM-04, CAM-05
**Success Criteria** (what must be TRUE):
  1. Scrolling moves the camera along the Z-axis — the scene visibly flies forward or backward through time
  2. Camera movement lerps toward its target position rather than snapping — motion feels weighty
  3. Scrolling at the Z=0 boundary or at Someday depth stops cleanly — no overscroll, no jitter
  4. Pressing the "home" button or keyboard shortcut animates the camera back to Z=0 (present)
  5. Moving the mouse across the canvas causes a subtle X/Y parallax shift that adds perceived depth
**Plans**: 2 plans in 2 waves

Plans:
- [ ] 04-01-PLAN.md — Camera store + CameraRig: scroll-to-Z, damp3 lerp in useFrame, iOS spring-back + fog-stop boundaries (CAM-01, CAM-02, CAM-03)
- [ ] 04-02-PLAN.md — SnapToPresent button + Home key shortcut (CAM-04), mouse-follow depth parallax (CAM-05)

### Phase 5: Capture
**Goal**: The capture loop is end-to-end — a user can type a natural language intention into the input bubble, have Haiku parse and place it in the 3D scene at the correct horizon, and see it persist after a page refresh, all without the Anthropic key ever reaching the client.
**Depends on**: Phase 4
**Requirements**: CAP-01, CAP-02, CAP-03, CAP-04, CAP-05
**Success Criteria** (what must be TRUE):
  1. The input bubble is always visible as a fixed overlay on the canvas — accessible at any camera position
  2. Typing a natural language intention (e.g. "dentist appointment next Tuesday") and submitting calls `/api/parse` and returns a structured task
  3. The parsed task is written to Postgres immediately and survives a hard page refresh
  4. The new task materializes in the 3D scene at its correct horizon Z-position with a fade-in/scale-up entrance animation
  5. No network request to the Anthropic API is ever visible in browser DevTools — all AI calls are server-side
**Plans**: TBD

Plans:
- [ ] 05-01: `InputBubble.tsx` — fixed overlay input with submit handling and loading state (CAP-01)
- [ ] 05-02: `/api/parse` route — Haiku prompt engineering, structured JSON extraction, server-side key enforcement (CAP-02, CAP-05)
- [ ] 05-03: Persistence + optimistic store update + entrance animation on new task node (CAP-03, CAP-04)

### Phase 6: Task Interactions
**Goal**: The mutation loop is complete — users can click any task to open its detail panel and from there complete it with a satisfying dissolution, drop it without ceremony, reschedule it to a new horizon, or edit its title and details.
**Depends on**: Phase 5
**Requirements**: TASK-01, TASK-02, TASK-03, TASK-04, TASK-05
**Success Criteria** (what must be TRUE):
  1. Clicking any task node (card or sprite) opens the TaskDetail panel as a 2D slide-in overlay without navigating away
  2. Completing a task from the detail panel dissolves it from the scene with a satisfying animation and removes it from the store
  3. Dropping a task removes it immediately — distinct from complete, no celebration, just gone
  4. Rescheduling a task updates its target date and the task node visibly drifts to its new Z-position in the scene
  5. Editing a task's title and details from the detail panel persists the change to Postgres
**Plans**: TBD

Plans:
- [ ] 06-01: `TaskDetail.tsx` — slide-in 2D overlay panel wired to clicked task in store (TASK-01)
- [ ] 06-02: Complete action + dissolution animation (TASK-02) and drop action (TASK-03)
- [ ] 06-03: Reschedule (TASK-04) and inline title/detail edit (TASK-05) with Postgres persistence

### Phase 7: Polish
**Goal**: The experience is complete — drift accountability is tracked and surfaced, AI-powered refinement prompts work end-to-end, the list view escape hatch is fully functional, and bloom post-processing is tuned so the scene looks right with real task data.
**Depends on**: Phase 6
**Requirements**: ACCT-01, ACCT-02, ACCT-03, ACCT-04, ACCT-05, ACCT-06, NAV-01, NAV-02, NAV-03
**Success Criteria** (what must be TRUE):
  1. Tasks that pass their horizon window without completion have their `driftCount` incremented on app load and the count is visible as an indicator on their scene node
  2. A task with 3+ drifts shows a gentle prompt in its detail panel offering to recommit, snooze to Someday, or drop
  3. Tasks flagged `needsRefinement: true` display a distinct pulse/ring indicator on their scene node; clicking them shows the Haiku-generated refinement prompt in the detail panel
  4. Responding to a refinement prompt in natural language calls Haiku, updates the task, and clears the flag
  5. Toggling the list view shows all tasks flat-grouped by horizon with tag/status/refinement filters and quick complete/drop/reschedule actions
**Plans**: TBD

Plans:
- [ ] 07-01: Drift tracking — on-load drift recalculation in RSC, `driftCount` increment, scene node indicator (ACCT-01, ACCT-02)
- [ ] 07-02: Drift accountability prompt at 3+ drifts in TaskDetail (ACCT-03)
- [ ] 07-03: Refinement flow — `needsRefinement` indicator on scene node, detail panel prompt display, `/api/refine` route, flag clearing (ACCT-04, ACCT-05, ACCT-06)
- [ ] 07-04: `ListView.tsx` — toggle from 3D scene, flat task list grouped by horizon, filter controls, quick actions (NAV-01, NAV-02, NAV-03)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-02-27 |
| 2. Data Layer | 2/2 | Complete | 2026-02-27 |
| 3. 3D Scene | 4/4 | Complete | 2026-02-27 |
| 4. Camera | 2/2 | Complete | 2026-02-27 |
| 5. Capture | 0/3 | Not started | - |
| 6. Task Interactions | 0/3 | Not started | - |
| 7. Polish | 0/4 | Not started | - |
