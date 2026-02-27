# Phase 1: Foundation - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Project scaffold, Railway Postgres connected, Drizzle schema and migrations running, shared TypeScript types defined, and `lib/horizons.ts` / `lib/spatial.ts` implemented with all positioning logic. No UI. Every subsequent phase builds on this without revisiting setup.

</domain>

<decisions>
## Implementation Decisions

### Scatter Algorithm
- Task positions are **deterministic per task ID** — same position every session. Derived from a hash of the task ID.
- **Pure scatter** within each horizon band — no tag clustering or date-based ordering. Worth experimenting with later but pure scatter is the baseline.
- **Soft overlap avoidance** — algorithm nudges tasks apart when too close, but doesn't guarantee separation. Best-effort, not strict.
- Tasks **scatter throughout the full Z-depth range** of their band (e.g. This Week: Z=-5 to -15), not fixed at band center. Bands have thickness.

### X/Y Spread and Boundaries
- **Wider spread for distant horizon bands** — far tasks fan out more on X/Y. Reinforces the perspective/vanishing point feel. Close bands are tighter, distant bands are more expansive.
- **Horizontal width at close range**: Claude's discretion — set a reasonable default that keeps Immediate tasks visible without horizontal scrolling. Can tune during Phase 3.
- **Vertical Y spread**: Claude's discretion — pick whatever reads best with the fog/perspective setup.
- **Start with a ground plane** (subtle receding surface) to reinforce depth perception. Easy to cut in Phase 3 if it doesn't feel right.

### Local Dev Database
- **Docker Compose** for local Postgres — self-contained, no Railway dependency for local work.
- **Auto-run migrations on `next dev`** — schema always in sync, no manual migration step during development.
- **~30-40 seed tasks** for visual development in Phase 3 — enough to test density and scatter under realistic conditions.
- **Full variety of states** in seed data: mix of `needsRefinement: true`, `driftCount` ranging 0-5, `hardDeadline` entries, and all tag categories. Every visual treatment testable from Phase 3 day one.

### Claude's Discretion
- Exact X/Y bounds and spread multipliers per horizon band — set reasonable defaults, expose as constants for easy tuning
- Vertical Y-axis spread range
- Soft overlap avoidance algorithm (simple grid bucketing or distance-based nudge)
- Docker Compose Postgres version (latest stable)
- `.env.example` structure and variable naming

</decisions>

<specifics>
## Specific Ideas

- The scatter algorithm lives in `src/lib/spatial.ts` and must be importable by both the scene (for 3D positioning) and the seed script (for consistent seeded positions)
- Seed data should include representative real-sounding task titles across all six horizons and all tag categories — used throughout Phase 3-4 development before real AI parsing exists
- Tag categories to represent in seed: work, personal, health, finance, home, social

</specifics>

<deferred>
## Deferred Ideas

- Tag-based clustering (e.g. work tasks drift left, personal right) — worth experimenting in Phase 3 or later once the basic scatter is working
- Date-ordered X positioning within bands — deferred, pure scatter first

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-02-26*
