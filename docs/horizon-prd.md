# Horizon — Product Requirements Document

## Vision

A spatial task management app where time is depth. Tasks exist on a visual plane stretching into the future — sharp and detailed up close, blurry and ambient in the distance. Capture is conversational. Scheduling emerges naturally as tasks drift closer.

**One-liner:** Your future, laid out in front of you.

---

## Proof of Concept Scope

This is a weekend build. The goal is a functional prototype that Marcus can actually use day-to-day to test the core thesis: does a spatial/depth metaphor for time horizons change your relationship with task management?

### What "working" means for the PoC:
- You can open the app, see your tasks laid out spatially by time horizon
- You can type (or paste) a natural language intention and have it parsed and placed
- Tasks visually approach you as days pass
- You can click/interact with tasks to refine, reschedule, or complete them
- Data persists across sessions (localStorage to start, migrate later)

### What we're explicitly deferring:
- Mobile optimization
- Voice input (trivial to add later via Web Speech API, but not core to validating the idea)
- Multi-user / sync / backend
- Smart surfacing logic ("it's sunny, repot your plants today")
- AI-driven weekly reviews
- Calendar integration
- Notifications/reminders

---

## Time Horizon Model

The core abstraction. Every task lives in a horizon, which maps to both a time range and a visual treatment.

| Horizon | Time Range | Visual Treatment |
|---|---|---|
| **Immediate** | Today / Tomorrow | Foreground. Full size, full opacity, sharp. Feels urgent and present. |
| **This Week** | 2–7 days out | Near-field. Slightly smaller, fully legible, minimal blur. |
| **This Month** | 1–4 weeks out | Mid-field. Noticeably smaller, slight blur, softer colors. |
| **This Quarter** | 1–3 months out | Background. Small, moderate blur, muted. You can read titles on hover/focus. |
| **This Year** | 3–12 months out | Deep background. Blurred shapes with labels. Ambient awareness only. |
| **Someday** | No timeframe | Furthest depth. Soft clouds. These are intentions, not commitments. |

### Horizon behavior:
- Horizons are **computed from a target date range**, not manually assigned (though the AI infers the range from natural language).
- As real time passes, tasks naturally shift forward through horizons. A task targeted for "March" that was in "This Quarter" in January is in "This Month" by late February — and visually drifts closer.
- Tasks without hard dates have a **target horizon** (e.g., "This Quarter") rather than a specific date. As that horizon becomes "This Month," the system should prompt for more specificity.

---

## Data Model

```typescript
interface Task {
  id: string;
  
  // What the user actually said
  rawInput: string;
  
  // AI-parsed fields
  title: string;                    // Clean, concise task title
  horizon: Horizon;                 // Computed from targetDate or explicit
  targetDate?: DateRange;           // { earliest: Date, latest: Date } — fuzzy by design
  hardDeadline?: Date;              // Immovable date if detected ("taxes due April 15")
  
  // Refinement
  needsRefinement: boolean;         // AI flagged this as needing breakdown or clarification
  refinementPrompt?: string;        // What the AI would ask ("Which team?", "How long will this take?")
  subtasks?: Task[];                // If broken down
  
  // Metadata
  status: 'active' | 'completed' | 'dropped';
  createdAt: Date;
  updatedAt: Date;
  driftCount: number;               // How many times this has been pushed/deferred
  tags?: string[];                  // AI-inferred categories (personal, work, health, errands, etc.)
}

type Horizon = 'immediate' | 'this-week' | 'this-month' | 'this-quarter' | 'this-year' | 'someday';

interface DateRange {
  earliest: Date;
  latest: Date;
}
```

### Key design decisions:
- **DateRange over single date:** Most real intentions are fuzzy. "Next week" means Mon–Fri. "This spring" means March–May. The range is the source of truth; the horizon is derived from it.
- **driftCount as accountability:** Every time a task gets pushed without completion, this increments. Visible somewhere in the UI as a subtle cue. Two drifts is normal. Five drifts means you should probably drop it or commit.
- **needsRefinement as first-class state:** Some tasks arrive blurry *on purpose* and the system knows it. This isn't a bug — it's the app working as intended. The visual treatment should reflect this (extra blur, a soft pulsing indicator, something).
- **Drizzle schema maps directly:** The TypeScript interface above is the client-side type. The Drizzle schema mirrors it with Postgres-native types — `jsonb` for `targetDate` and `subtasks`, `text[]` for tags, `timestamp` for dates. The horizon field is computed client-side from `targetDate` and the current date, not stored.

---

## AI Intake Pipeline

### Flow:
```
User input (text)
    → Haiku (fast, cheap parse)
    → Structured task object
    → Placement on horizon
    → [If flagged] Refinement prompt shown to user
```

### What Haiku extracts:
1. **Title** — concise version of the intention
2. **Target date range** — inferred from language ("next week" → Mon–Fri of next week, "this spring" → March 1–May 31)
3. **Hard deadline** — if one exists ("before my trip on the 15th", "tax day")
4. **Needs refinement** — is this too vague to act on as-is?
5. **Refinement prompt** — if yes, what should we ask?
6. **Tags** — inferred category (personal, work, health, finance, home, social, etc.)
7. **Suggested subtasks** — only if the task is clearly compound ("plan birthday party" → venue, guest list, cake, etc.)

### Prompt design (system prompt for intake):
The system prompt should instruct the model to:
- Always respond with valid JSON matching our schema
- Interpret dates relative to the current date (passed in as context)
- Default to the fuzziest reasonable interpretation (don't over-specify)
- Flag compound tasks but don't auto-split without user confirmation
- Infer tags from context, not ask for them
- When ambiguous, choose the later/broader horizon (err toward less pressure)

### Escalation to larger model:
For the PoC, we probably don't need this. Everything goes through Haiku. But the triggers we'd eventually want:
- Detected dependencies on other tasks in the system
- Complex compound tasks needing intelligent breakdown
- Ambiguity that Haiku can't confidently resolve

### Cost consideration:
Haiku is extremely cheap. Even heavy usage (50+ task inputs/day) would be pennies. For a personal-use PoC this is negligible. The API key lives in environment variables on the server — never exposed to the client. Neon's free tier gives 0.5 GB storage and 190 compute hours/month, which is overkill for a single-user task app.

---

## Spatial Interface

### Layout concept:
The viewport is a **perspective plane** stretching into the distance. Think of it as standing on a road and looking at the horizon.

```
┌─────────────────────────────────────────────┐
│                                             │
│           ·  ·    ·                         │  ← Someday (tiny, very blurred)
│         ·    ·  ·    ·                      │  ← This Year
│                                             │
│        ○    ○      ○                        │  ← This Quarter (blurred)
│                                             │
│       ◉      ◉        ◉                    │  ← This Month (soft)
│                                             │
│     ●          ●      ●                    │  ← This Week (clear)
│                                             │
│   ████      ████     ████                  │  ← Immediate (large, sharp, detailed)
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  "I need to call my mother next week" │   │  ← Input bubble
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Implementation approach: React Three Fiber + drei

The spatial view is the thesis of this app. We're building it in actual 3D space using React Three Fiber (R3F) so that depth is real, not faked. This gives us true perspective, camera movement, and the visceral feeling of tasks existing *in space* rather than on a decorated flat page.

#### Scene setup:
- **Camera**: `PerspectiveCamera` positioned at the "present" looking forward into the future
- The Z-axis IS time. Negative Z = further in the future. The camera sits at Z=0 (now) and looks down the negative Z-axis.
- Each horizon maps to a **Z-depth band**:
  - Immediate: Z = 0 to -5
  - This Week: Z = -5 to -15
  - This Month: Z = -15 to -30
  - This Quarter: Z = -30 to -50
  - This Year: Z = -50 to -80
  - Someday: Z = -80 to -120
- Tasks are positioned within their band's Z-range, with X/Y offsets for organic scatter
- **Fog** (`<fog>` in R3F) handles the blur/fade naturally — distant objects disappear into atmosphere. This is the single most important visual effect and it comes nearly free in 3D.

#### Task nodes in 3D:
- Each task is a **Billboard** (drei's `<Billboard>`) so it always faces the camera regardless of angle
- Close tasks (Immediate/This Week): rendered as **HTML overlay cards** using drei's `<Html>` component — full rich text, tags, dates, interactive buttons. These are real DOM elements floating in 3D space.
- Mid-range tasks (This Month/This Quarter): simplified cards — title only, muted styling, rendered as `<Html>` with reduced detail or as textured planes
- Distant tasks (This Year/Someday): **glowing sprites or point particles** — no text, just colored light. Warm dots for things with deadlines, cool dots for open-ended intentions. You see density and color, not detail.
- The transition between these LOD (level of detail) tiers should be **smooth** — as a task drifts closer over days, it graduates from dot → simple card → full card. This happens automatically based on Z-position.

#### Camera & navigation:
- **Scroll wheel** moves the camera along the Z-axis — you can fly into the future and back to the present. This is core, not a stretch goal.
- Camera movement should have **easing/momentum** (lerp toward target position) so it feels smooth and physical
- There should be a "snap to present" button or keyboard shortcut to return to Z=0
- Optional: subtle **parallax** on mouse movement (camera slightly rotates based on cursor position) for depth perception. Drei's `<OrbitControls>` with constrained rotation could work, or a custom mouse-follow.
- The camera should have **soft limits** — you can't scroll past "now" into the past, and there's a max depth for Someday

#### Lighting & atmosphere:
- Dark environment — deep navy/charcoal, not pure black
- Subtle **ambient light** with a slight directional light from above/front
- Task nodes have **emissive glow** — they're self-lit objects in a dim space
- Consider a faint **grid plane** or subtle ground plane fading into fog to reinforce depth perception
- A gentle **bloom post-processing effect** (drei/postprocessing) on the glowing distant nodes could look spectacular. Worth trying, easy to remove if it's too much.
- Subtle **star field or particle dust** in the deep background for atmosphere (not distracting, just ambience)

#### Interaction:
- **Click/tap** a task node → opens a TaskDetail panel as a 2D overlay (React portal outside the canvas, slide-in from right or bottom)
- **Hover** a task → slight scale-up and brightness increase, tooltip with title if it's a distant dot
- Drei's `<Html>` components handle click events natively for close tasks
- Distant sprite/particle tasks use **raycasting** via R3F's `onPointerOver`/`onPointerDown` events
- **Input bubble** lives outside the canvas as a fixed DOM element — it's always accessible and doesn't exist in 3D space

#### Animation:
- When a new task is parsed, it **materializes at its horizon position** — fade in with a subtle scale-up, maybe a brief particle burst
- Each time the app loads (or on a daily tick), tasks **smoothly lerp** to their recalculated Z-positions based on current date
- Completed tasks **dissolve** — scale down, fade opacity, maybe drift upward and dissipate. Satisfying micro-interaction.
- Drift-forward animation should be visible if the app is open during a "day tick" — tasks subtly glide closer. Most of the time this happens between sessions, so the user just notices things are closer than yesterday.

#### Colors / Visual Identity:
- Dark background — deep space feel. The depth metaphor maps perfectly to looking into a night sky or down a lit corridor.
- Task glow colors by **tag/category**: warm amber for personal, cool blue for work, green for health, purple for finance, etc. Brightness/saturation increase with proximity.
- Alternatively: a single warm color that shifts from cool/dim (distant) to warm/bright (close) — reinforcing temporal urgency through color temperature
- Hard-deadline tasks could have a distinct visual — sharper edges, brighter glow, maybe a subtle pulsing ring
- Keep the chrome minimal. The 3D scene IS the UI. Overlaid UI elements (input bubble, detail panel, view toggle) should be semi-transparent and unobtrusive.

#### Performance considerations:
- For the PoC, we're talking maybe 50–200 tasks max. Performance is a non-issue at this scale.
- Distant tasks rendered as sprites/points are extremely cheap
- `<Html>` components (used for close tasks) are more expensive — but we only render them for Immediate + This Week, so maybe 10–20 at most
- If task count grows significantly, we'd batch distant tasks into instanced meshes or a single Points geometry. Not needed for PoC.
- Use `frameloop="demand"` on the R3F `<Canvas>` if we want to save battery when nothing is animating, re-render on interaction/scroll only

---

## Traditional View (Escape Hatch)

A collapsible sidebar or toggle that shows:
- Flat list of all tasks grouped by horizon
- Sort by: horizon (default), date created, drift count, tag
- Filter by: tag, status, needs refinement
- Quick actions: complete, drop, reschedule

This is the "I need to actually manage stuff" view. The spatial view is for ambient awareness and capture; the list view is for triage and execution.

---

## Refinement Flow

When a task is flagged `needsRefinement: true`:

1. Task appears on horizon with a visual indicator (soft pulse, question mark, slightly different glow)
2. When user clicks it, the detail panel shows the AI's refinement prompt: *"You said 'plan birthday party' — want to break this into subtasks? When roughly is the party?"*
3. User can respond in natural language in the detail panel, which triggers another Haiku call to update the task
4. Once refined, the indicator clears and the task sharpens slightly in the spatial view

This also handles the horizon-driven refinement: when a "This Quarter" task drifts into "This Month," the system can auto-flag it for refinement if it doesn't have a specific enough date yet.

---

## Drift & Accountability

When a task's horizon window passes and it hasn't been completed:
- `driftCount` increments
- Task stays in its *new* computed horizon (it doesn't disappear)
- Visual indicator of drift: maybe a subtle trail or afterimage, or a small counter badge
- At drift count 3+, the system could surface a gentle prompt: *"This has been pushed 3 times. Still want to do it?"*
- User can: recommit (reset drift), drop it, or snooze it to Someday

---

## Tech Stack (PoC)

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | API routes keep the Anthropic key server-side. React RSC for the overlay UI, client components for R3F canvas. |
| Database | PostgreSQL via Neon | Serverless Postgres, free tier is generous, works natively with Vercel. Zero infra management. |
| ORM | Drizzle | Lightweight, type-safe, fast to set up. Less boilerplate than Prisma for a small schema. |
| 3D rendering | React Three Fiber + drei | Real 3D space. Fog, camera, depth are native. Stays in React mental model. |
| Post-processing | @react-three/postprocessing | Bloom effect on distant glowing nodes. Optional but likely worth it. |
| AI integration | Anthropic API (Haiku) via Next.js API route | Server-side calls. API key stays in env vars, never hits the client. |
| Styling | Tailwind CSS | For 2D overlay elements (input bubble, detail panel, list view). |
| Animation | Framer Motion + R3F spring animations | Framer for 2D overlays. R3F/drei `useSpring` or manual lerps for 3D transitions. |
| State management | Zustand | Client-side state for UI + task cache. Source of truth is Postgres, Zustand holds the working set. |
| Deployment | Vercel | Zero-config for Next.js. Neon integration is native. |

### File structure (suggested):
```
src/
  app/
    layout.tsx
    page.tsx                       — Main app shell: canvas + overlays
    api/
      tasks/
        route.ts                   — CRUD endpoints for tasks
      parse/
        route.ts                   — Haiku intake: accepts raw text, returns structured task
      refine/
        route.ts                   — Haiku refinement: accepts task + user input, returns updates
  components/
    scene/
      HorizonScene.tsx             — R3F Canvas, camera, fog, lighting, atmosphere
      TaskNode.tsx                 — Individual task in 3D (handles LOD: card vs sprite)
      TaskCard.tsx                 — drei <Html> card for close tasks
      TaskSprite.tsx               — Glowing sprite/point for distant tasks
      HorizonBand.tsx              — Visual horizon marker/label in the scene
      CameraController.tsx         — Scroll-to-fly, snap-to-present, mouse parallax
      Atmosphere.tsx               — Fog, grid plane, background particles, bloom
    overlay/
      InputBubble.tsx              — Chat-style input (2D, fixed position over canvas)
      TaskDetail.tsx               — Expanded task panel (2D slide-in overlay)
      ListView.tsx                 — Traditional flat list view (2D)
      RefinementPrompt.tsx         — In-detail-panel refinement UI
      ViewToggle.tsx               — Switch between spatial and list views
  hooks/
    useTaskStore.ts                — Zustand store: client-side task cache + sync
    useHorizon.ts                  — Horizon computation logic
    useAIParse.ts                  — Calls /api/parse, handles loading/error states
    useCameraControls.ts           — Camera position state, scroll handling
  lib/
    horizons.ts                    — Horizon definitions, Z-depth ranges, date math, drift logic
    aiPrompt.ts                    — System prompt and schema for Haiku
    spatial.ts                     — X/Y scatter algorithms, LOD thresholds, color mapping
  db/
    schema.ts                      — Drizzle schema (tasks table)
    index.ts                       — Drizzle client / Neon connection
    migrate.ts                     — Migration runner
  types/
    task.ts                        — TypeScript interfaces (shared between client + server)
drizzle.config.ts                  — Drizzle Kit config
```

---

## Build Roadmap (Long Weekend)

The Three.js path adds meaningful scope to the spatial view. This is still a weekend build, but plan for a longer weekend — or accept that Sunday evening "polish" becomes Monday evening. The spatial view is the product; it deserves the time.

### Saturday Morning — Foundation (3–4 hrs)
1. Scaffold Next.js (App Router) + TS + Tailwind project
2. Install R3F ecosystem: `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `three`
3. Set up Neon Postgres database + Drizzle ORM schema + initial migration
4. Build API routes: CRUD for tasks (`/api/tasks`)
5. Implement Zustand store with data fetching from API (client-side cache, server is source of truth)
6. Build horizon computation logic (date range → horizon → Z-depth mapping)
7. Seed database with ~15–20 fake tasks across all horizons for visual development

### Saturday Afternoon — 3D Scene Foundation (4–5 hrs)
6. Set up R3F `<Canvas>` with PerspectiveCamera, fog, and basic lighting
7. Build the Atmosphere: dark background, fog tuning, subtle ground plane or grid
8. Implement basic TaskNode that renders a sphere/sprite at a 3D position
9. Place seed tasks in 3D space — get the Z-depth bands feeling right
10. Tune fog density — this single parameter controls the entire "blurry horizon" feel
11. Add bloom post-processing for distant glowing nodes (try it, assess, keep or cut)

### Saturday Evening — Task Rendering & LOD (3–4 hrs)
12. Build TaskCard component using drei `<Html>` for close tasks (Immediate + This Week)
13. Build TaskSprite for distant tasks (emissive material, color-coded, no text)
14. Implement LOD switching — tasks render as cards or sprites based on their Z-position
15. Add hover effects (scale-up, brightness) and click handling (raycasting for sprites)
16. Scatter algorithm — organic X/Y positioning within horizon bands, avoid overlap

### Sunday Morning — Camera & Navigation (2–3 hrs)
17. Implement scroll-wheel Z-axis movement with easing/momentum (lerp to target)
18. Soft limits: can't scroll past Z=0 (present), max depth at Someday
19. "Snap to present" button/shortcut
20. Optional: subtle mouse-follow parallax for depth perception
21. Test the feel of flying through your task space — tune until it feels good

### Sunday Midday — Input & AI Pipeline (2–3 hrs)
22. Build InputBubble as 2D overlay component (fixed position over canvas)
23. Write Haiku system prompt and structured output JSON schema
24. Build `/api/parse` route: accepts raw text → calls Haiku → returns structured task → persists to DB
25. Implement useAIParse hook on client (calls /api/parse, handles loading/error states)
26. Wire the full loop: type input → API route → Haiku parses → DB write → Zustand refresh → task materializes in 3D
27. New task entrance animation (fade in, scale up, maybe brief particle burst)
28. Test with varied natural language inputs, tune prompt as needed

### Sunday Afternoon — Interaction & Detail (3–4 hrs)
28. Build TaskDetail slide-in panel (2D overlay, appears on task click)
29. Implement edit, complete, drop, and reschedule actions
30. Completion animation in 3D (dissolve, drift upward, fade)
31. Build basic refinement flow (show AI prompt, user responds, task updates)
32. "Needs refinement" visual indicator on task nodes (pulse, ring, etc.)
33. Build ListView toggle as escape hatch (flat list grouped by horizon)

### Sunday Evening / Monday — Polish & Real Usage (2–3 hrs)
34. Daily drift recalculation: on load, tasks smoothly lerp to new Z-positions
35. Drift count visual indicator on task nodes
36. Color theming — finalize tag-based or temperature-based color mapping
37. Clear seed data, start capturing real tasks
38. Deploy to Vercel
39. Note what feels right and what doesn't

**Estimated total: 20–26 hours**

If you need to cut scope to stay in the weekend, cut in this order (least impactful first):
1. Bloom post-processing (nice visual, not essential)
2. Mouse parallax (subtle depth cue, not critical)
3. ListView escape hatch (can add Monday, spatial view is what we're testing)
4. Refinement flow (can mark tasks manually for now, AI refinement can come later)
5. Drift tracking/visualization (important but not day-one critical)

---

## Open Questions (to resolve during or after build)

1. **Task positioning within bands** — Pure random scatter? Clustered by tag? Left-to-right by date within the band? Start with seeded random (deterministic per task ID so positions are stable), see what feels right.
2. **Z-axis scroll speed and range** — How fast should the camera move? Does it feel better to scroll smoothly or to "snap" between horizon bands? Needs hands-on tuning.
3. **LOD transition distance** — At what Z-depth does a sprite become a card? Too abrupt and it pops. Too gradual and you're rendering too many `<Html>` elements. Needs testing.
4. **How many tasks before it gets visually noisy?** At what density do horizon bands feel cluttered? Might need clustering, stacking, or a "show top N per band" approach.
5. **Fog type and density** — R3F supports linear fog (`<fog>`) and exponential fog (`<fogExp2>`). Exponential is more natural for this use case but needs careful density tuning.
6. **Sound design** — A subtle audio cue when tasks shift horizons or when you scroll through depth could be powerful. Stretch goal.
7. **Does the spatial view need to support drag-and-drop between horizons?** Or is the input bubble + detail panel sufficient for all mutations? Dragging in 3D is technically complex — probably defer.
8. **Ground plane vs floating in space** — Does it feel better to have tasks "resting on" a surface that stretches into the distance, or floating in a void? Both have different spatial cues. Try both.

---

## Success Criteria

After one week of real usage, answer:
1. Do I open this app more than my current task management tool?
2. Does the spatial view give me a "feel" for my workload that a list doesn't?
3. Am I capturing more intentions because input is frictionless?
4. Are tasks actually progressing through horizons, or just drifting?
5. Does any of this make me feel more on top of things?

If yes to 3+ of these, there's something here worth building properly.
