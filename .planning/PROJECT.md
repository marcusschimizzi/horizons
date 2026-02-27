# Horizon

## What This Is

A spatial task management app where time is depth. Tasks exist on a 3D perspective plane stretching into the future — sharp and detailed up close, blurry and ambient in the distance. You capture intentions in natural language; Claude Haiku parses and places them. As real days pass, tasks drift closer to you.

This is a personal-use PoC for Marcus to test one core thesis: does a spatial/depth metaphor for time horizons change your relationship with task management better than the pile of list-based tools that never stuck?

## Core Value

The spatial view must make you *feel* your future — ambient awareness of what's out there, visceral pull of what's approaching, satisfying dissolution when things are done. If the 3D scene doesn't feel meaningfully different from a list, nothing else matters.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can see tasks laid out spatially by time horizon in a 3D perspective scene
- [ ] Tasks visually approach as days pass (Z-axis = time, fog handles distant blur)
- [ ] User can type natural language and have it parsed and placed by Haiku
- [ ] Task data persists across sessions (Neon/Drizzle)
- [ ] User can click tasks to view detail, then complete, drop, or reschedule
- [ ] User can refine flagged tasks (Haiku generates refinement prompts)
- [ ] Drift count increments when tasks pass their horizon without completion
- [ ] List view escape hatch for triage and execution
- [ ] App deployed to Vercel and usable day-to-day

### Out of Scope

- Mobile optimization — desktop PoC only, optimize later if thesis holds
- Voice input — easy to add via Web Speech API but not core to validating the idea
- Multi-user / sync / backend auth — single-user, personal use only
- Smart contextual surfacing ("it's sunny, repot your plants") — post-validation feature
- AI-driven weekly reviews — post-validation feature
- Calendar integration — post-validation feature
- Notifications/reminders — post-validation feature
- Drag-and-drop between horizons — 3D drag is technically complex, input + detail panel handles mutations

## Context

Marcus currently uses 3+ task management tools and nothing sticks. The hypothesis is that the spatial metaphor provides a fundamentally different *feel* for the workload — ambient awareness of what's out there, not just a list to scroll.

**Stack is fully decided** (from PRD):
- Framework: Next.js (App Router) + TypeScript
- Database: PostgreSQL via Neon (serverless, free tier, Vercel-native)
- ORM: Drizzle (lightweight, type-safe)
- 3D: React Three Fiber + drei + @react-three/postprocessing
- AI: Anthropic API (Haiku) via Next.js API routes — key never hits client
- Styling: Tailwind CSS (2D overlay elements)
- Animation: Framer Motion (2D) + R3F springs (3D)
- State: Zustand (client cache, Postgres is source of truth)
- Deploy: Vercel

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
| React Three Fiber for 3D (not CSS tricks) | Real 3D space gives true perspective, camera movement, fog — spatial metaphor is the product's thesis | — Pending |
| DateRange (fuzzy) over single date | Real intentions are fuzzy. "Next week" means Mon–Fri. Range is source of truth; horizon derived from it | — Pending |
| Haiku for all AI parsing | Fast, extremely cheap (<1¢/day for personal use). Escalation to larger model deferred | — Pending |
| driftCount as accountability | Every push increments count. Visible cue. 5+ drifts = prompt to drop or commit | — Pending |
| Horizon computed client-side, not stored | Horizon changes as real time passes — it's a view derived from targetDate + current date | — Pending |
| Neon over localStorage | PRD started with localStorage but decided Postgres from the start. Schema maps directly to TypeScript interface | — Pending |

---
*Last updated: 2026-02-26 after initialization*
