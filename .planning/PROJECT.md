# Horizon

## What This Is

A spatial task management app where time is depth. Tasks exist on a 3D perspective plane stretching into the future — sharp and detailed up close, blurry and ambient in the distance. You capture intentions in natural language; Claude Haiku parses and places them. As real days pass, tasks drift closer to you.

This is a personal-use PoC for Marcus to test one core thesis: does a spatial/depth metaphor for time horizons change your relationship with task management better than the pile of list-based tools that never stuck?

## Core Value

The spatial view must make you *feel* your future — ambient awareness of what's out there, visceral pull of what's approaching, satisfying dissolution when things are done. If the 3D scene doesn't feel meaningfully different from a list, nothing else matters.

## Requirements

### Validated

- ✓ User can see tasks laid out spatially by time horizon in a 3D perspective scene — v1.0
- ✓ Tasks visually approach as days pass (Z-axis = time, fog handles distant blur) — v1.0
- ✓ User can type natural language and have it parsed and placed by Haiku — v1.0
- ✓ Task data persists across sessions (Railway Postgres via Drizzle) — v1.0
- ✓ User can click tasks to view detail, then complete, drop, or reschedule — v1.0
- ✓ User can refine flagged tasks (Haiku generates refinement prompts) — v1.0
- ✓ Drift count increments when tasks pass their horizon without completion — v1.0
- ✓ List view escape hatch for triage and execution — v1.0
- ✓ App deployed to Railway and usable day-to-day — v1.0

### Active

(None — all v1 requirements shipped. Define v2 requirements via `/gsd:new-milestone`)

### Out of Scope

- Mobile optimization — desktop PoC only, optimize later if thesis holds
- Voice input — easy to add via Web Speech API but not core to validating the idea
- Multi-user / sync / backend auth — single-user, personal use only
- Smart contextual surfacing ("it's sunny, repot your plants") — post-validation feature
- AI-driven weekly reviews — post-validation feature
- Calendar integration — post-validation feature
- Notifications/reminders — post-validation feature
- Drag-and-drop between horizons — 3D drag is technically complex, input + detail panel handles mutations

## Current State

**v1.0 shipped 2026-02-28** — 7 phases, 21 plans, 31 source files, 4,759 lines of TypeScript/TSX. Built in 2 days (2026-02-26 → 2026-02-28).

Now in thesis testing: does the spatial metaphor actually change the relationship with task management? Daily use on Railway.

## Context

Marcus currently uses 3+ task management tools and nothing sticks. The hypothesis is that the spatial metaphor provides a fundamentally different *feel* for the workload — ambient awareness of what's out there, not just a list to scroll.

**Stack is fully decided** (from PRD):
- Framework: Next.js (App Router) + TypeScript
- Database: PostgreSQL via Railway (native service, auto-injected DATABASE_URL)
- ORM: Drizzle (lightweight, type-safe)
- 3D: React Three Fiber + drei + @react-three/postprocessing
- AI: Anthropic API (Haiku) via Next.js API routes — key never hits client
- Styling: Tailwind CSS (2D overlay elements)
- Animation: Framer Motion (2D) + R3F springs (3D)
- State: Zustand (client cache, Postgres is source of truth)
- Deploy: Railway

**Time model:** Six named horizons (Immediate → Someday) mapped to Z-depth bands. Horizon is computed from `targetDate` (fuzzy `DateRange`) — not stored. Tasks drift forward automatically as real time passes.

**Visual approach:** Dark space aesthetic. Task glow colors by tag/category. Bloom post-processing for distant nodes. Fog is the single most important effect — it comes nearly free in 3D.

## Constraints

- **Scope**: Weekend build — PoC only, not production. Estimated 20–26 hours of build time.
- **Users**: Single user (Marcus). No auth, no multi-user concerns.
- **API Security**: Anthropic key lives server-side in env vars. Never exposed to client.
- **Performance**: 50–200 tasks max. Performance is a non-issue at this scale.
- **Tech stack**: Locked. No deviations from PRD stack choices.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React Three Fiber for 3D (not CSS tricks) | Real 3D space gives true perspective, camera movement, fog — spatial metaphor is the product's thesis | ✓ Good — scene feels genuinely spatial, fog is the key effect |
| DateRange (fuzzy) over single date | Real intentions are fuzzy. "Next week" means Mon–Fri. Range is source of truth; horizon derived from it | ✓ Good — Haiku handles range extraction cleanly |
| Haiku for all AI parsing | Fast, extremely cheap (<1¢/day for personal use). Escalation to larger model deferred | ✓ Good — zodOutputFormat + messages.parse() gives reliable extraction |
| driftCount as accountability | Every push increments count. Visible cue. 5+ drifts = prompt to drop or commit | ✓ Good — compassionate tone lands well: "What's in the way?" |
| Horizon computed client-side, not stored | Horizon changes as real time passes — it's a view derived from targetDate + current date | ✓ Good — clean separation, RSC drift check handles the increment |
| Railway Postgres over localStorage/Neon | PRD started with localStorage, then considered Neon (Vercel-native). Switched to Railway Postgres — simpler setup, standard drivers, one dashboard, correct connection model for persistent Node server | ✓ Good — zero connection issues across the build |

---
*Last updated: 2026-02-28 after v1.0 milestone*
