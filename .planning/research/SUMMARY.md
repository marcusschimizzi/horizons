# Research Summary: Horizon

**Project:** Horizon — spatial task management via 3D time-depth metaphor
**Domain:** Personal productivity / 3D web app (React Three Fiber + Next.js)
**Researched:** 2026-02-26
**Confidence:** HIGH

---

## Executive Summary

Horizon is a single-user PoC that bets on one thesis: spatial depth (Z-axis = time) produces a meaningfully different relationship with task management than flat lists. The entire product lives or dies by whether the 3D perspective scene — fog, camera fly-through, approaching tasks — feels functionally better than looking at a list. Stack is pre-decided and well-suited: Next.js App Router keeps the Anthropic key server-side, React Three Fiber gives real 3D space with fog and camera natively, Railway Postgres with Drizzle is simple and correct for a persistent Node server.

The architecture is fundamentally a single-page app with an RSC data-fetch boundary at the root. Initial tasks flow from Postgres into Zustand via synchronous hydration at the client boundary. After that, all mutations go optimistic-first through Zustand, then sync to Postgres via API routes. Horizon (time zone) is never stored — it's computed client-side from `targetDate` + current date every render. This is correct and critical: stored horizons go stale the moment midnight ticks.

The two highest-severity risks are both foundation-level: R3F Canvas must be `dynamic(ssr: false)` (not just `"use client"`) or the build crashes, and Zustand cannot be imported by Server Components or the entire data architecture breaks. Both must be solved in Phase 0 before any 3D work begins. All remaining pitfalls are manageable with known patterns documented in PITFALLS.md.

---

## Stack Decisions

Stack is locked — no deviations. Key setup notes worth pinning:

| Technology | Role | Critical Gotcha |
|---|---|---|
| Next.js 15 (App Router) | Framework + API routes | RSC for data fetch, `"use client"` + `ssr: false` for Canvas |
| React 19 | UI runtime | — |
| TypeScript 5 | Types throughout | — |
| React Three Fiber 8.17+ | 3D scene | `frameloop="demand"` needs manual `invalidate()` on every state change |
| drei 9.115+ | R3F helpers (Html, Billboard, etc.) | Html portal container must live inside the `ssr: false` boundary |
| three 0.170+ | Three.js core | Pin all four R3F packages together; `overrides.three` prevents two copies in bundle |
| @react-three/postprocessing 2.16+ | Bloom effect | fogExp2 color must exactly match background or bloom makes scene milky |
| Railway Postgres | Persistence | `DATABASE_URL` auto-injected in Railway; use global Pool singleton in dev to survive HMR |
| Drizzle 0.38+ | ORM | `horizon` is NOT a column — computed client-side from `targetDate` + now |
| Anthropic SDK 0.36+ | Haiku parsing | `ANTHROPIC_API_KEY` server-side only; model `claude-haiku-4-5-20251001` |
| Zustand 5+ | Client state | In `useFrame`: use `getState()` not hooks to avoid stale closures |
| Tailwind v4 | 2D overlay styling | Config is now CSS-based (`@import "tailwindcss"`), not `tailwind.config.js` |
| Framer Motion 11+ | 2D overlay animations | — |
| @react-spring/three 9+ | 3D transition animations | — |
| Railway | Deploy | Persistent Node server (not serverless) — no cold starts, no 60s function timeout |

**Version pin strategy:** Pin all four R3F packages (`three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`) to known-compatible exact versions and add `overrides.three` in `package.json`. Upgrade all four together or not at all.

---

## Table Stakes Features

The PoC thesis is untestable without all of these:

**Capture loop:**
- Natural language input that accepts raw intentions without forced structure
- Immediate visual confirmation — task appears in scene as soon as parsed
- Persistence — tasks survive session refresh (Railway Postgres)

**Spatial thesis:**
- 3D scene with fog/blur/scale differentiation legible at a glance (without this, there is no thesis)
- Camera Z-axis fly-through — the signature interaction, no list app can replicate it
- Tasks approaching as real days pass (horizon computed from `targetDate + now`)

**Mutation loop:**
- Complete with dissolution animation (the reward loop)
- Reschedule — real usage breaks within 24 hours without it
- Drop — "I'm not doing this" is a valid first-class action

**Escape hatch:**
- List view toggle — always used more than expected; don't treat as second-class

**Deliberately deferred (anti-features for PoC):**
- Notifications, recurring tasks, collaboration, drag-and-drop in 3D, priority flags, tags as first-class UI, dark/light mode toggle, export/import

---

## Build Order (10 Phases)

From ARCHITECTURE.md — dependencies determine sequence, build bottom-up:

| Phase | What | Key Dependency Unlocked |
|---|---|---|
| 0 | Next.js scaffold + TypeScript + Tailwind + Railway Postgres setup | Project exists |
| 1 | `src/db/` schema + connection + migrations + `src/types/task.ts` | API routes and store can import types |
| 2 | `src/lib/horizons.ts` — horizon + Z-depth math, scatter algorithm | Scene and store can compute positions |
| 3 | `src/app/api/tasks/route.ts` (CRUD) + seed data | Scene has real data to develop against |
| 4 | `src/hooks/useTaskStore.ts` + `SceneLoader.tsx` (client boundary + hydration) | Canvas has a store to read from |
| 5 | `HorizonScene.tsx` — Canvas, fog, lighting, atmosphere | Foundation of 3D view |
| 6 | `TaskNode.tsx` + LOD (TaskCard with drei Html, TaskSprite for distance) | Core visual rendering of tasks |
| 7 | `CameraController.tsx` — scroll, snap to horizon bands, Z limits | Signature navigation interaction |
| 8 | `InputBubble.tsx` + `/api/parse` + `useAIParse` + entrance animation | Full capture loop end-to-end |
| 9 | `TaskDetail.tsx` + complete/drop/reschedule + completion animation | Full mutation loop end-to-end |
| 10 | Refinement flow + drift tracking + ListView + bloom polish | Everything else |

**Phases 0–4 are foundation.** All 7 critical/high pitfalls cluster here. Get them right before touching 3D.

---

## Top 5 Pitfalls to Avoid

| # | Pitfall | Prevention |
|---|---|---|
| 1 | **R3F Canvas SSR crash** — `"use client"` alone isn't enough; Next.js still pre-renders client components | `dynamic(() => import('./HorizonScene'), { ssr: false })` in SceneLoader — required, not optional |
| 2 | **Zustand in Server Components** — even importing for types can crash the build | Hard module boundary: store lives in `/stores/`, never imported by `app/page.tsx` or layouts |
| 3 | **`frameloop="demand"` stale renders** — scene freezes on state change until mouse move; works in dev (HMR masks it), breaks in prod | Subscribe Zustand to `invalidate()` once inside HorizonScene; call `state.invalidate()` inside `useFrame` while animating |
| 4 | **Layout canvas persistence** — if Canvas is not in root layout, route navigation destroys the WebGL context | Canvas lives in `app/layout.tsx` — mounted once for the life of the session |
| 5 | **R3F version matrix mismatch** — cryptic runtime errors deep in Three.js internals | Pin all four packages to exact known-compatible versions + `overrides.three` in package.json |

**Secondary pitfalls:** Postgres Pool singleton (globalThis guard for HMR), Zustand hydration flash (synchronous `setState` before first render, not in `useEffect`), drei Html hydration mismatch (portal container inside `ssr: false` boundary), R3F vs DOM event conflicts (stop pointer propagation from Html card wrappers), fogExp2 + bloom color matching.

---

## Implications for Roadmap

### Phase structure recommendation

The 10-phase build order from ARCHITECTURE.md is the correct roadmap skeleton. Do not reorder — each phase has hard dependencies on the previous.

**Phase 0–4 (Foundation):** Build as a single focused block before any 3D work. The entire client/server boundary architecture must be correct before building on top of it. Any mistake here cascades into every component above.

**Phase 5–7 (3D Core):** The thesis-proving block. After this block, you can look at the scene, fly through it, and evaluate whether the spatial metaphor actually works. This is the earliest point to validate the core idea.

**Phase 8–9 (Capture + Mutation Loops):** The app becomes actually usable day-to-day. After Phase 9 the PoC is feature-complete for its core thesis test.

**Phase 10 (Polish + Escape Hatches):** Refinement flow, drift tracking, list view, bloom tuning. Everything in this phase enhances the experience but isn't required to test whether the 3D time-depth metaphor works.

### Research flags

**Skip deeper research — standard patterns:**
- Phases 0–1: Next.js 15 + Drizzle setup is well-documented, follow STACK.md patterns verbatim
- Phase 3: CRUD API routes in Next.js App Router are vanilla
- Phase 4: Zustand store + RSC hydration pattern is documented in ARCHITECTURE.md

**May benefit from quick validation during planning:**
- Phase 6 (LOD system): The TaskCard (drei Html) vs TaskSprite (mesh) transition at distance threshold needs tuning. Three.js LOD or manual distance check — either works but decide before building
- Phase 7 (CameraController): Scroll-to-Z-axis mapping and horizon band snapping has no exact precedent — expect iteration
- Phase 8 (Haiku prompt engineering): The parse prompt that reliably extracts `targetDate`, `hardDeadline`, `tags`, `needsRefinement` from freeform text needs testing with real inputs before locking the API contract

---

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Stack | HIGH | All packages are current, patterns verified, version matrix documented |
| Features | HIGH | Table stakes and anti-features well-defined; limited direct comps for 3D task management but reasoning is sound |
| Architecture | HIGH | Build order matches dependency graph; patterns verified against Next.js 15 + R3F 8 + Drizzle 0.38 |
| Pitfalls | HIGH | All 12 pitfalls are concrete and specific; warning signs and fixes documented |

**Overall confidence: HIGH**

### Open questions (will affect planning)

1. **LOD distance thresholds** — At what Z-depth does a TaskCard (Html) flip to a TaskSprite (mesh dot)? Needs visual tuning. Suggest: implement both, expose a debug slider, tune in Phase 6.

2. **Haiku JSON reliability** — Structured output via tool use vs raw JSON in text — which is more reliable for the parse prompt? Tool use is more robust but adds 1–2 API call roundtrip steps. Decide before building `/api/parse`.

3. **Scatter algorithm stability** — Task positions use a deterministic seed from `taskId`. Works if IDs are UUIDs. If using auto-increment integers, the scatter may cluster. Verify ID strategy in Phase 1.

4. **Drift increment trigger** — Who detects that a task has passed its `targetDate.earliest` without completion and increments `driftCount`? Options: (a) on-load check in `app/page.tsx` RSC, (b) cron job via Railway, (c) client-side detection on mount. RSC option is simplest; decide before Phase 10.

5. **Bloom vs fog density tuning** — `fogExp2 density={0.012}` and `Bloom luminanceThreshold={0.85}` are starting values from research. These will need visual iteration with real task data in the scene. Not a blocker but budget time in Phase 10.

---

## Sources

All research is synthesized from ecosystem knowledge as of Feb 2026.

**HIGH confidence (official patterns):**
- Next.js 15 App Router docs — RSC/client boundary, dynamic imports, API routes
- React Three Fiber v8 docs — Canvas setup, frameloop, useFrame, useThree
- drei v9 docs — Html component, portal patterns, Billboard
- Drizzle ORM docs — node-postgres adapter, schema, migrations
- Anthropic SDK docs — messages.create, model IDs
- Railway docs — Next.js deployment, Postgres service, DATABASE_URL injection

**MEDIUM confidence (community patterns + inference):**
- LOD threshold values — starting points only, need visual tuning
- Bloom + fog interaction values — starting points, expect iteration
- Haiku prompt engineering — needs empirical testing with real inputs

---
*Research completed: 2026-02-26*
*Ready for roadmap: yes*
