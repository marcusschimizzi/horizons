# Phase 2: Data Layer - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

CRUD API routes (`GET /api/tasks`, `POST /api/tasks`, `PATCH /api/tasks/[id]`, `DELETE /api/tasks/[id]`), a seed script with ~35 representative tasks, a Zustand store that hydrates synchronously from server-fetched data, and the `SceneLoader` component that enforces the Canvas client boundary. The 3D scene has everything it needs to render when this phase is done — no UI is built here.

</domain>

<decisions>
## Implementation Decisions

### Seed data
- **Titles:** Real-sounding personal tasks — "Dentist appointment", "File Q1 taxes", "Call landlord about leak" etc. Not placeholders.
- **Distribution:** Realistic taper — more tasks near end (Immediate: ~8, This Week: ~7, This Month: ~6, This Quarter: ~6, This Year: ~5, Someday: ~3–4). ~35 total.
- **Special state distribution:** Organic/realistic — Claude decides placement based on what makes sense. Hard deadlines more likely near-term; high driftCount more likely on far tasks; needsRefinement sprinkled throughout at low frequency. Full variety must be present (some of each state) for Phase 3 visual testing.
- **Tag categories:** All six represented (work, personal, health, finance, home, social).
- **Seed behavior:** Always destructive — wipe and re-seed. `npm run db:seed` produces a clean, predictable state every time.

### Store hydration
- **Strategy:** Server Component (`page.tsx`) fetches tasks server-side and passes them as `initialTasks` prop to `SceneLoader`. No client-side fetch on mount — zero flash of empty scene.
- **Re-fetch support:** Store includes a `refresh()` action that re-fetches from `GET /api/tasks`. Not used in Phase 2 but in place for Phase 6 mutations.
- **Horizon computation:** Lazy via Zustand selector. Store holds raw `TaskRow[]`. A derived selector (`useTasksWithHorizon`) computes `horizon` from `targetDate + now` on access. No upfront transformation cost.
- **Primary interface:** Flat `TaskRow[]` as source of truth + a derived `useTasksByHorizon()` selector returning `Map<Horizon, Task[]>` for the scene renderer.

### SceneLoader boundary
- **Container:** Full viewport — 100vw × 100vh, no scrolling. The 3D scene is the entire page.
- **Loading state:** Subtle pulsing background (bg-primary color animates opacity slightly). No spinner, no text — atmospheric and consistent with the dark space aesthetic.
- **Transition on ready:** Claude's discretion — pick whatever feels right (crossfade or cut).
- **Error state:** Show a minimal centered error message with a retry button: "Couldn't load tasks. Try refreshing." Simple, no complex UI. Triggered if the initial server fetch throws.

### API response shape
- **Field naming:** camelCase throughout (`rawInput`, `targetDateEarliest`). Drizzle's default — no transformation needed. `horizon` is NOT included in API responses (computed client-side).
- **Error format:** `{ error: string, code: string }` with appropriate HTTP status (400 bad request, 404 not found, 500 server error). Example codes: `TASK_NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.
- **PATCH semantics:** Partial updates — only send changed fields. Standard REST PATCH. Drizzle uses `.set()` with only the provided fields.

### Claude's Discretion
- Exact SceneLoader transition animation (crossfade vs cut to scene)
- Vitest tests for API routes (if time permits — not required for this phase)
- Exact wording of seed task titles (beyond tone guidance)
- Retry button implementation detail in error state

</decisions>

<specifics>
## Specific Ideas

- Seed data should feel like a real person's life across six time horizons — the kind of thing that makes you think "yes, this is what I actually have going on"
- The `refresh()` store action is plumbing for Phase 6, not a visible feature in Phase 2

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-data-layer*
*Context gathered: 2026-02-27*
