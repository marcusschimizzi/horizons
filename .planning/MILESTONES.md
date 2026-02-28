# Project Milestones: Horizon

## v1.0 Spatial MVP (Shipped: 2026-02-28)

**Delivered:** Full spatial task management PoC — tasks live in 3D space at Z-depth = time horizon, captured in natural language, managed via full CRUD + AI drift accountability + list view escape hatch.

**Phases completed:** 1–7 (21 plans total)

**Key accomplishments:**

- 3D spatial scene with six time horizons (Immediate → Someday) rendered in React Three Fiber — tasks appear as Html cards up close, emissive sprites in the distance, fog handling depth legibility
- Haiku-powered natural language capture: type an intention, get a structured task placed at the correct Z-position with entrance animation
- Full camera control: scroll to fly through time, momentum/easing, soft boundaries, snap-to-present, mouse parallax
- Complete task mutation loop: click-to-detail panel, completion with particle burst + undo, drop, reschedule with smooth Z-drift, inline auto-save editing
- Drift accountability system: server-side increment on page load with double-count prevention, amber notification toast, visual drift badges/opacity on scene nodes, compassionate 3+ drift prompt in detail panel
- AI refinement loop: `/api/refine` generates clarifying questions + suggested titles when tasks need rethinking; user response triggers immediate Haiku rewrite
- List view escape hatch: full horizon-grouped task list with tag/refinement/horizon filters and inline quick complete/drop/reschedule

**Stats:**

- 31 source files created/modified
- 4,759 lines of TypeScript/TSX
- 7 phases, 21 plans, 39 feature commits
- 2 days from scaffold to shipped (2026-02-26 → 2026-02-28)

**Git range:** `feat(01-foundation)` → `fix(07-polish): add horizon filter UI buttons`

**What's next:** Deploy to Railway and begin thesis testing — does the spatial metaphor actually change the relationship with task management?

---
