# Phase 7: Polish - Research

**Researched:** 2026-02-27
**Domain:** Drift accountability, AI refinement flow, list view escape hatch, bloom/fog tuning
**Confidence:** HIGH (all findings based on direct codebase inspection)

## Summary

Phase 7 is an integration phase -- no new external libraries are needed. All four work streams (drift tracking, refinement flow, list view, bloom tuning) build on existing infrastructure: the Drizzle schema already has `driftCount`, `needsRefinement`, `refinementPrompt`, and `hardDeadline` columns; the Anthropic SDK pattern from `/api/parse` can be mirrored for `/api/refine`; the Zustand store and component architecture are well-established.

The primary research task was mapping exact integration points in the existing codebase. The schema is ready. The PATCH route already allows updating all relevant fields (`driftCount`, `needsRefinement`, `refinementPrompt`, `status`, `targetDateEarliest`, `targetDateLatest`). The main work is: (1) server-side drift recalculation logic in `page.tsx`, (2) visual indicators on TaskCard/TaskSprite, (3) UI additions to TaskDetail, (4) a new `/api/refine` route mirroring `/api/parse`, (5) a new ListView component as a sibling to HorizonScene, and (6) bloom/fog constant tuning.

**Primary recommendation:** Build incrementally in the four planned sub-phases. No schema migrations needed -- all DB columns exist. No new npm dependencies required. The list view is the most self-contained; drift and refinement touch the most files.

## Standard Stack

### Core (already installed -- no new dependencies)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Next.js | 16.1.6 | App Router, RSC for drift recalc | page.tsx is the RSC entry point |
| @anthropic-ai/sdk | ^0.78.0 | Haiku for refinement prompts | zodOutputFormat + messages.parse() pattern |
| zustand | ^5.0.11 | Client state for list view toggle, filters | Vanilla store for camera, React store for tasks |
| drizzle-orm | ^0.45.1 | DB updates for drift increment | Schema already has all needed columns |
| zod | ^4.3.6 | Schema validation for /api/refine | Same pattern as /api/parse |
| @react-three/fiber | ^9.5.0 | R3F scene rendering | demand frameloop, useFrame for animations |
| @react-three/postprocessing | ^3.0.4 | Bloom effect | EffectComposer + Bloom in HorizonScene |
| @react-three/drei | ^10.7.7 | Html, Billboard, Stars | TaskCard uses Html, TaskSprite uses Billboard |

### Supporting (already installed)

| Library | Purpose | Relevant To |
|---------|---------|-------------|
| maath | damp3 for smooth position transitions | TaskNode animation |
| three | 0.170.0 (pinned) | FogExp2, MeshBasicMaterial refs |

### No New Dependencies Needed

This phase requires zero new npm packages. All functionality can be built with the existing stack.

## Architecture Patterns

### Recommended File Structure (new files only)

```
src/
├── app/
│   ├── api/
│   │   └── refine/
│   │       └── route.ts          # NEW: AI refinement endpoint
│   └── page.tsx                  # MODIFY: drift recalculation in RSC
├── components/
│   ├── ListView.tsx              # NEW: flat task list grouped by horizon
│   ├── DriftNotification.tsx     # NEW: on-load toast for drifted tasks
│   ├── TaskCard.tsx              # MODIFY: drift badge, needsRefinement pulse
│   ├── TaskSprite.tsx            # MODIFY: needsRefinement visual ring
│   ├── TaskDetail.tsx            # MODIFY: drift prompt, refinement UI
│   ├── HorizonScene.tsx          # MODIFY: list view toggle, conditional render
│   └── SceneLoader.tsx           # MODIFY: pass driftSummary prop
├── stores/
│   └── task-store.tsx            # MODIFY: list view state, filter state
└── lib/
    ├── scene-constants.ts        # MODIFY: fog adaptive density, bloom tuning
    └── drift.ts                  # NEW: drift calculation helper (shared RSC/client)
```

### Pattern 1: Server-Side Drift Recalculation (RSC in page.tsx)

**What:** On every page load, the RSC checks all active tasks and increments `driftCount` for any task whose horizon window has passed (targetDateLatest < now).
**When to use:** Every app load, before passing `initialTasks` to SceneLoader.
**Current page.tsx structure:**
```typescript
// Current (src/app/page.tsx)
export default async function Home() {
  try {
    const allTasks = await db.select().from(tasks).where(eq(tasks.status, 'active'));
    return <SceneLoader initialTasks={allTasks} />;
  } catch (e) {
    // ...
  }
}
```

**Integration point:** Between the `db.select()` and the `return <SceneLoader>`, add drift recalculation:
1. Filter tasks where `targetDateLatest < now` AND `status = 'active'`
2. For those tasks, increment `driftCount` by 1 via batch PATCH
3. Pass the updated tasks (with incremented driftCounts) plus a `driftSummary` count to SceneLoader

**Key constraint from CONTEXT.md:** "RSC on app load" is the decided drift increment timing. This is the simplest approach. Drizzle's `sql` tagged template can do `SET drift_count = drift_count + 1` in a single query with a WHERE clause.

**Important edge case:** The drift check must compare `targetDateLatest` against `now`, not the horizon computation. A task with `targetDateLatest = 2026-02-25` and `now = 2026-02-27` has drifted -- its window has passed. The increment should happen before the client computes horizons. After incrementing, the task stays in its current horizon band (it will naturally move to 'immediate' or 'overdue' via the client-side getHorizon computation).

**Gotcha:** Drizzle 0.45.x uses `sql` from `drizzle-orm` for raw SQL fragments. The batch update pattern:
```typescript
import { sql, and, eq, lt } from 'drizzle-orm';

await db.update(tasks)
  .set({ driftCount: sql`${tasks.driftCount} + 1` })
  .where(and(
    eq(tasks.status, 'active'),
    lt(tasks.targetDateLatest, new Date())
  ));
```

### Pattern 2: Toast / Notification for On-Load Drift Summary

**What:** A non-blocking summary toast shown when app loads and drifted tasks exist.
**Current toast patterns:** InputBubble already has a toast with fade-out (2.5s fade start, 3s removal). Undo toast in TaskDetail uses z-index 130.
**Integration point:** New component `DriftNotification.tsx`, rendered as sibling in HorizonScene (or SceneLoader), receives a `driftedCount` prop. Uses the same inline-style + injected-keyframes pattern as existing overlays.
**z-index plan:** Use 105 (above SnapToPresent at 100, below InputBubble at 110) -- positioned at top of viewport, not competing with bottom controls.

### Pattern 3: Drift Badge on TaskCard

**What:** Small drift count badge on card-tier task nodes.
**Current TaskCard structure (line 108):**
```tsx
<div style={cardStyle} onClick={...}>{task.title}</div>
```
**Integration point:** Add a conditional badge element inside the card div, after `task.title`. TaskCard already reads `task.driftCount` (line 20: `const isDrifted = task.driftCount > 0`) and applies drift opacity/desaturation. Adding a count badge is purely additive.
**Styling note:** All TaskCard styles are inline (drei Html restriction). Badge should be a small absolute-positioned span with background matching HORIZON_COLORS amber.

### Pattern 4: Drift Visual Degradation on TaskSprite

**What:** Sprites (further horizons) show visual degradation via fading/desaturation as drift increases.
**Current TaskSprite behavior:** Already has drift-based radius scaling (line 61-67, `radius` memo based on `driftCount`). The glow color already lerps toward an ethereal target.
**Integration point:** Add opacity reduction based on drift count. Current `spriteOpacity` is 0.9. Reduce by ~0.08 per drift, floor at 0.4. Apply in the `materialRef.current.opacity` assignments in useFrame.
**Also:** Desaturate the `glowColor` further as drift increases -- lerp more toward ETHEREAL_TARGET based on driftCount.

### Pattern 5: needsRefinement Visual Indicator on Scene Nodes

**What:** Tasks with `needsRefinement: true` display a distinct pulse/ring.
**CONTEXT.md decision:** "A slow-breathing pulse or ring that draws the eye without alarming."
**TaskCard integration:** Add a CSS animation (slow box-shadow pulse) when `task.needsRefinement` is true. The card already has hardDeadline amber glow -- refinement should use a different color (cool blue or soft white) to be "visually distinct from drift degradation."
**TaskSprite integration:** Add a second mesh (ring geometry) that pulses opacity via useFrame. A `RingGeometry` with inner/outer radius around the sprite circle, pulsing between 0.2 and 0.6 opacity at ~0.5 Hz.

### Pattern 6: /api/refine Route (Mirroring /api/parse)

**What:** POST endpoint that takes a task ID, fetches the task, sends context to Haiku, gets a refinement response.
**Current /api/parse pattern:**
1. Module-level `new Anthropic()` singleton
2. Zod schema for output structure
3. `client.messages.parse()` with `zodOutputFormat`
4. System prompt with dynamic today date
**Mirror for /api/refine:**
1. Same Anthropic singleton pattern
2. Zod schema: `{ clarifyingQuestion: string, suggestedTitle: string }`
3. Input: `{ taskId: string, userResponse?: string }`
4. If `userResponse` is absent: generate refinement prompt (question + suggested title)
5. If `userResponse` is present: rewrite the task based on user's response, return updated fields
6. System prompt context: task title, rawInput, tags, current driftCount

**CONTEXT.md decision:** "Both -- a clarifying question AND a suggested rewrite of the task title. Shown together in the detail panel." And after user responds: "Direct update preferred -- Haiku rewrites immediately, user sees result."

### Pattern 7: Refinement UI in TaskDetail

**What:** When a task has `needsRefinement: true`, show the refinement prompt and a response input.
**Current TaskDetail structure (key layout areas):**
- Header (line 519-529): title input + close button
- Info bar (line 531-538): horizon badge + drift badge
- Textarea (line 540-545): rawInput editor
- Reschedule section (line 547-577): horizon pills
- Action bar (line 579-594): Complete + Drop buttons

**Integration point:** Insert a new refinement section between the info bar and the textarea. When `task.needsRefinement` is true AND `task.refinementPrompt` exists, show:
1. The refinement prompt text (clarifying question + suggested title from `task.refinementPrompt`)
2. A text input for user response
3. A submit button that calls `/api/refine` with the user's response
4. On success: update task in store, clear needsRefinement flag

**Also:** Insert a drift accountability prompt ABOVE the action bar when `task.driftCount >= 3`:
- Text: "This has moved N times. What's in the way?"
- Three button options: Recommit (reschedule to same horizon), Snooze to Someday, Drop
- Compassionate tone per CONTEXT.md

### Pattern 8: List View Toggle

**What:** A full-screen list view that replaces the 3D Canvas.
**CONTEXT.md decisions:**
- Toggle: visible button in overlay UI + keyboard shortcut (L key)
- Replaces the 3D Canvas (not overlays on top)
- Grouped by horizon band, each section collapsible
- Quick actions per row: Complete, Drop, Reschedule, click-to-open-detail

**Integration point in HorizonScene.tsx:**
```typescript
// Current render (line 177-196):
return (
  <>
    <Canvas ...> ... </Canvas>
    <SnapToPresent />
    <InputBubble />
    <TaskDetail />
    <DebugOverlay ... />
  </>
);
```

**Plan:** Add a `showListView` boolean to the Zustand task store. Conditionally render either `<Canvas>` or `<ListView>`. The overlay components (SnapToPresent, InputBubble, TaskDetail, DebugOverlay) remain visible in both modes. Add a toggle button (z-index 100 area, top-left or top-right).

**Key constraint:** Canvas uses `dynamic(ssr: false)` via SceneLoader. ListView is plain DOM -- no SSR concerns. The toggle button and ListView should be plain React components, no R3F.

### Pattern 9: Adaptive Fog Density

**What:** Fog density scales with task count -- more tasks = slightly heavier fog.
**Current constant:** `fogDensity: 0.015` (line 4 of scene-constants.ts)
**Integration point:** FogSetup component (HorizonScene.tsx line 46-57) imperatively sets `FogExp2`. Modify to accept task count and compute density:
```typescript
const baseDensity = SCENE_CONSTANTS.fogDensity;
const adaptiveDensity = baseDensity + Math.min(taskCount * 0.0002, 0.008);
```
This gives 0.015 at 0 tasks, ~0.021 at 30 tasks, capped at 0.023. The scaling should be subtle.

### Anti-Patterns to Avoid

- **Don't mount/unmount Canvas for list view toggle:** The Canvas is expensive to re-initialize. Use CSS `display: none` or conditional rendering with the Canvas staying mounted but hidden. Actually, per the CONTEXT.md: "Toggling replaces the 3D Canvas with the list view" -- this means unmounting is acceptable. Since the Canvas is dynamically imported with `ssr: false`, re-mounting is costly. Better approach: use `visibility: hidden` + `position: absolute` to keep Canvas in DOM but hidden.
- **Don't put list view inside R3F Canvas:** The list view is pure DOM. It must be a sibling to Canvas, not inside it.
- **Don't use client-side drift computation:** Drift increment happens server-side in RSC. The client only reads the already-incremented `driftCount` from the store.
- **Don't block page render for drift updates:** The drift increment should be a fire-and-forget batch update. The RSC fetches tasks, checks for drift, increments, re-fetches (or uses the updated values from the RETURNING clause), then renders.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured AI output | Manual JSON parsing from Haiku response | `zodOutputFormat` + `messages.parse()` | Already proven in /api/parse, handles schema validation automatically |
| Date comparison for drift | Custom date math library | Drizzle's `lt()` operator with `new Date()` | SQL-level comparison is authoritative, no timezone issues |
| Keyboard shortcut handling | Custom keydown manager | Direct `window.addEventListener('keydown')` in useEffect | Already the pattern used by CameraRig for Home key |
| Collapsible sections in list view | Custom accordion component | Simple React state with `useState<Set<Horizon>>` for collapsed sections | No animation library needed, plain CSS height transition |

**Key insight:** This phase is integration work, not library selection. Every building block already exists in the codebase.

## Common Pitfalls

### Pitfall 1: Double-Counting Drift on Rapid Refreshes

**What goes wrong:** If the user refreshes the page multiple times quickly, each RSC load could increment driftCount again for the same task.
**Why it happens:** The drift check compares `targetDateLatest < now`, which stays true across refreshes. No "last checked" timestamp prevents re-increment.
**How to avoid:** After incrementing driftCount, also update `targetDateLatest` to move the task's window forward (e.g., to now + the original window width). Alternatively, add a `lastDriftCheck` timestamp column. The simpler approach: update `targetDateLatest` to `now + original_window_duration` when incrementing, so the next check won't trigger again until the new window passes.
**Recommendation:** The cleanest approach is to reset `targetDateLatest` to a new value when incrementing drift. For example, when a "this-week" task drifts, push its `targetDateLatest` forward by 7 days. This naturally puts it in the right horizon and prevents double-counting.
**Warning signs:** driftCount jumping by 2+ on a single page load.

### Pitfall 2: Stale Zustand State After Drift Increment

**What goes wrong:** The RSC passes `initialTasks` with updated driftCounts, but the Zustand store was created with the previous values. If the user doesn't do a full page reload, the store holds stale data.
**Why it happens:** TaskStoreProvider creates the store once in a `useRef` (line 200-203). It never re-reads `initialTasks` after mount.
**How to avoid:** This is actually fine for drift -- drift only increments on full page load (RSC). Every page load creates a new store with fresh `initialTasks`. The concern only matters if we add client-side navigation that doesn't trigger RSC re-execution, which we don't have (single-page app with no client routing).
**Warning signs:** Only relevant if `next/link` client navigation is added later.

### Pitfall 3: Z-Index Conflicts with New UI Elements

**What goes wrong:** New overlay elements (list view toggle button, drift notification, refinement UI) clash with existing z-index stack.
**Current z-index map:**
- DebugOverlay: 9999
- Undo toast: 130
- TaskDetail panel: 120 / backdrop: 119
- InputBubble: 110
- SnapToPresent: 100

**How to avoid:** Document new z-index assignments explicitly:
- DriftNotification toast: 105 (above SnapToPresent, below InputBubble)
- List view toggle button: 100 (same level as SnapToPresent, different position)
- ListView container: 1 (below all overlays, replaces Canvas)

### Pitfall 4: CSS Animation Keyframes in Inline-Style Components

**What goes wrong:** TaskCard uses drei Html which renders outside the normal DOM tree. CSS classes from globals.css may not apply. Keyframe animations for the refinement pulse must be injected.
**Why it happens:** drei Html creates a separate DOM container. Tailwind classes and CSS modules don't reliably reach it.
**How to avoid:** Use the same pattern as InputBubble: inject a `<style>` tag within the component for keyframes, reference via inline `animation` property. For TaskSprite (pure R3F mesh), use `useFrame` for animation -- no CSS needed.
**Warning signs:** CSS animation not applying, static appearance when pulse expected.

### Pitfall 5: Refinement Route Latency Blocking UI

**What goes wrong:** The `/api/refine` call to Haiku can take 1-3 seconds. If the UI blocks during this time, it feels broken.
**How to avoid:** Show a loading state in the refinement section of TaskDetail. Use optimistic UI: immediately show "Processing..." while the API call runs. On success, update the store and clear the flag. On failure, show error inline.
**Warning signs:** Frozen UI after clicking "Submit" on refinement response.

### Pitfall 6: ListView Re-Rendering Performance

**What goes wrong:** ListView renders all tasks flat. With 30+ tasks and inline quick actions, re-renders on any store change could be expensive.
**How to avoid:** Use fine-grained Zustand selectors. Each task row should only re-render when its own data changes. Use `useTaskStore` with a selector that picks the specific task, not the entire tasks array.
**Warning signs:** Sluggish filter/sort interactions in list view.

### Pitfall 7: Fog Density Causing Disappearing Far Tasks

**What goes wrong:** If adaptive fog density scales too aggressively, distant "someday" tasks become invisible.
**How to avoid:** Cap the density multiplier. The furthest band (someday) is at Z -80 to -120. FogExp2 formula: `fog = exp(-density^2 * distance^2)`. At density 0.023 and distance 120: `exp(-0.023^2 * 120^2) = exp(-7.6) = 0.0005` -- essentially invisible. This is fine for sprites (they use toneMapped=false so they glow through fog), but verify visually.
**Warning signs:** Distant sprites dimmer than expected after fog tuning.

## Code Examples

### Drift Recalculation in RSC (page.tsx)

```typescript
// Source: Codebase analysis — src/app/page.tsx + src/db/schema.ts
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq, and, lt, isNotNull, sql } from 'drizzle-orm';

export default async function Home() {
  try {
    const now = new Date();

    // Step 1: Increment drift for tasks whose window has passed
    const drifted = await db.update(tasks)
      .set({ driftCount: sql`${tasks.driftCount} + 1` })
      .where(and(
        eq(tasks.status, 'active'),
        isNotNull(tasks.targetDateLatest),
        lt(tasks.targetDateLatest, now),
      ))
      .returning();

    // Step 2: Fetch all active tasks (including freshly drifted)
    const allTasks = await db.select().from(tasks).where(eq(tasks.status, 'active'));

    return (
      <SceneLoader
        initialTasks={allTasks}
        driftSummary={drifted.length > 0 ? { count: drifted.length } : null}
      />
    );
  } catch (e) {
    console.error('Failed to fetch tasks:', e);
    return <SceneLoader initialTasks={[]} error />;
  }
}
```

### /api/refine Route Structure

```typescript
// Source: Mirrors src/app/api/parse/route.ts pattern
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';

const RefinementOutputSchema = z.object({
  clarifyingQuestion: z.string().describe('A question to help clarify the task'),
  suggestedTitle: z.string().describe('A cleaner, more actionable version of the task title'),
});

const TaskUpdateSchema = z.object({
  title: z.string().describe('Updated task title'),
  targetDateEarliest: z.string().nullable().describe('ISO date or null'),
  targetDateLatest: z.string().nullable().describe('ISO date or null'),
  needsRefinement: z.boolean().describe('false if refinement is resolved'),
});

const client = new Anthropic();

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { taskId, userResponse } = body;

  // Fetch task from DB
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) return Response.json({ error: 'Task not found', code: 'TASK_NOT_FOUND' }, { status: 404 });

  if (!userResponse) {
    // Generate refinement prompt
    const response = await client.messages.parse({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: `You are a task refinement assistant. ...`,
      messages: [{ role: 'user', content: `Task: "${task.title}"\nOriginal input: "${task.rawInput}"` }],
      output_config: { format: zodOutputFormat(RefinementOutputSchema) },
    });
    return Response.json(response.parsed_output);
  } else {
    // User responded — rewrite the task
    const response = await client.messages.parse({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: `You are a task refinement assistant. Rewrite the task based on the user's clarification. ...`,
      messages: [{ role: 'user', content: `Task: "${task.title}"\nUser response: "${userResponse}"` }],
      output_config: { format: zodOutputFormat(TaskUpdateSchema) },
    });
    // Apply update directly
    const parsed = response.parsed_output;
    await db.update(tasks).set({
      title: parsed.title,
      needsRefinement: false,
      refinementPrompt: null,
    }).where(eq(tasks.id, taskId));
    return Response.json(parsed);
  }
}
```

### TaskCard Drift Badge

```typescript
// Source: Codebase pattern from src/components/TaskCard.tsx
// Add inside the card div, after task.title text:

{isDrifted && (
  <span style={{
    position: 'absolute',
    top: -6,
    right: -6,
    background: 'rgba(245, 158, 11, 0.9)',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    borderRadius: '50%',
    width: 18,
    height: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1.5px solid rgba(10, 10, 15, 0.8)',
  }}>
    {task.driftCount}
  </span>
)}
```

### TaskSprite needsRefinement Ring (R3F)

```typescript
// Source: Codebase pattern from src/components/TaskSprite.tsx
// Add inside the Billboard, after the main mesh:

{task.needsRefinement && (
  <mesh>
    <ringGeometry args={[radius * 1.4, radius * 1.6, 32]} />
    <meshBasicMaterial
      ref={refinementRingRef}
      color={new THREE.Color('#88aaff')}
      toneMapped={false}
      transparent
      opacity={0.3}
    />
  </mesh>
)}

// In useFrame, animate refinementRingRef opacity:
if (refinementRingRef.current && task.needsRefinement) {
  const pulse = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(performance.now() * 0.003));
  refinementRingRef.current.opacity = pulse;
  invalidate();
}
```

### ListView Toggle State in Zustand Store

```typescript
// Source: Codebase pattern from src/stores/task-store.tsx
// Add to TaskState interface:
interface TaskState {
  // ... existing fields ...
  showListView: boolean;
  listFilters: {
    tags: Set<string>;
    needsRefinement: boolean | null;  // null = show all
    horizons: Set<Horizon>;
  };
}

// Add to TaskActions interface:
interface TaskActions {
  // ... existing actions ...
  toggleListView: () => void;
  setListFilter: (filter: Partial<TaskState['listFilters']>) => void;
}
```

### Adaptive Fog in FogSetup

```typescript
// Source: Codebase pattern from src/components/HorizonScene.tsx
function FogSetup({ taskCount }: { taskCount: number }) {
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const baseDensity = SCENE_CONSTANTS.fogDensity;
    // Scale: +0.0002 per task, capped at +0.008 above base
    const adaptiveDensity = baseDensity + Math.min(taskCount * 0.0002, 0.008);
    scene.fog = new THREE.FogExp2(SCENE_CONSTANTS.fogColor, adaptiveDensity);
    return () => { scene.fog = null; };
  }, [scene, taskCount]);

  return null;
}
```

## Integration Points Summary

### Files Modified (with exact locations)

| File | What Changes | Lines Affected |
|------|-------------|---------------|
| `src/app/page.tsx` | Add drift recalculation before SceneLoader | Lines 6-14 (entire function) |
| `src/components/SceneLoader.tsx` | Accept `driftSummary` prop, pass to HorizonScene | Lines 49-66 |
| `src/components/HorizonScene.tsx` | List view toggle, adaptive fog, drift notification | Lines 169-196 (HorizonScene fn) |
| `src/components/TaskCard.tsx` | Drift count badge, needsRefinement CSS pulse | Lines 100-112 (JSX return) |
| `src/components/TaskSprite.tsx` | needsRefinement ring mesh, drift opacity reduction | Lines 131-153 (JSX return + useFrame) |
| `src/components/TaskDetail.tsx` | Drift prompt (3+ drifts), refinement UI section | Lines 498-610 (JSX return) |
| `src/stores/task-store.tsx` | showListView, listFilters, toggleListView, setListFilter | Lines 13-19 (TaskState) + 21-37 (TaskActions) |
| `src/lib/scene-constants.ts` | Remove fogDensity as static, bloom tuning | Lines 4-5 (fog) + 17-19 (bloom) |
| `src/app/api/tasks/[id]/route.ts` | No changes needed (already handles all fields) | None |

### Files Created

| File | Purpose |
|------|---------|
| `src/app/api/refine/route.ts` | AI refinement endpoint |
| `src/components/ListView.tsx` | Flat task list grouped by horizon |
| `src/components/DriftNotification.tsx` | On-load toast for drifted tasks |
| `src/lib/drift.ts` | Drift calculation helper (optional, logic may stay in page.tsx) |

## Existing Data Model (Ready to Use)

The schema already has ALL needed columns. No migrations required:

```typescript
// src/db/schema.ts — all columns exist:
driftCount: integer('drift_count').notNull().default(0),        // ACCT-01
needsRefinement: boolean('needs_refinement').notNull().default(false),  // ACCT-04
refinementPrompt: text('refinement_prompt'),                     // ACCT-05
hardDeadline: timestamp('hard_deadline', { mode: 'date', withTimezone: true }),  // VIS-03
tags: text('tags').array(),                                      // NAV-02 filtering
```

The PATCH route allowlist (`src/app/api/tasks/[id]/route.ts` lines 6-17) already includes all fields:
`title`, `rawInput`, `targetDateEarliest`, `targetDateLatest`, `hardDeadline`, `needsRefinement`, `refinementPrompt`, `status`, `driftCount`, `tags`

The TaskRow type (`src/types/task.ts`) already includes all fields needed by the UI.

## Existing Visual Patterns (Drift + Deadline Already Partially Implemented)

**TaskCard already has:**
- `isDrifted` check (line 20): `task.driftCount > 0`
- Drift opacity: `Math.max(0.6, 1 - task.driftCount * 0.1)` (line 45-47)
- Drift desaturation: `filter: saturate(${Math.max(0.3, 1 - task.driftCount * 0.15)})` (line 79-83)
- Hard deadline amber glow: `boxShadow: '0 0 8px rgba(245, 158, 11, 0.4)...'` (line 72-77)

**TaskSprite already has:**
- Drift radius scaling: `spriteBaseRadius * (1 + Math.min(drift, 5) * 0.06)` (line 61-67)

**TaskDetail already has:**
- Drift badge in info bar (line 533-537): Shows "N drifts" when driftCount > 0

**What's missing (to add in Phase 7):**
- TaskCard: drift count badge (the small number circle on the node itself -- ACCT-02)
- TaskCard: needsRefinement CSS pulse animation
- TaskSprite: needsRefinement ring mesh
- TaskSprite: drift opacity degradation (currently only radius scales, opacity doesn't decrease)
- TaskDetail: 3+ drift accountability prompt (ACCT-03)
- TaskDetail: refinement prompt display + response UI (ACCT-05, ACCT-06)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side drift checks | Server-side RSC drift checks | Phase 7 decision | Authoritative, no client clock skew issues |
| Manual JSON from Haiku | zodOutputFormat + messages.parse() | Phase 5 | No parsing errors, guaranteed schema compliance |
| Mount/unmount Canvas for view toggle | Keep Canvas hidden when list active | Current best practice | Avoids expensive WebGL re-init |

## Open Questions

1. **Drift re-increment window reset**
   - What we know: When a task drifts, we increment driftCount. But we need to prevent double-counting on the next page load.
   - What's unclear: Should we push targetDateLatest forward by the original window width? Or set it to `now + 7 days` (a fixed grace period)?
   - Recommendation: Push forward by the horizon band's natural duration (e.g., 7 days for this-week, 30 days for this-month). This keeps the task in roughly the same horizon and creates a natural "next check" window. If the task had no dates (someday), skip drift entirely (someday tasks can't drift by definition).

2. **Should 3+ drift auto-flag needsRefinement?**
   - What we know: CONTEXT.md says "Claude may also auto-flag at 3+ drifts" under Claude's discretion.
   - What's unclear: Should this happen server-side during drift increment, or is it a separate process?
   - Recommendation: Yes, do it server-side. When incrementing driftCount to 3, also set `needsRefinement = true` AND generate a refinement prompt via Haiku in the same RSC flow. This could add latency to page load. Alternative: set the flag server-side, generate the prompt lazily when the user opens the task detail.

3. **List view: hide or unmount Canvas?**
   - What we know: Canvas is expensive to initialize (WebGL context, shader compilation). Unmounting and re-mounting is costly.
   - What's unclear: Does R3F properly pause rendering when the Canvas parent has `display: none`?
   - Recommendation: Use `style={{ display: showListView ? 'none' : 'block' }}` on the Canvas wrapper div. R3F's demand frameloop should naturally stop requesting frames when the Canvas is hidden. Test this during implementation -- if it doesn't stop, use `visibility: hidden` + `position: absolute` with `width: 0; height: 0; overflow: hidden`.

4. **Exact bloom/fog tuning values**
   - What we know: Current bloomIntensity is 1.5, fogDensity is 0.015. Success criteria: "depth hierarchy readable at a glance, no harsh artifacts with 30+ tasks."
   - What's unclear: Exact final values -- these require visual tuning with real task data.
   - Recommendation: Mark as Claude's discretion per CONTEXT.md. Start with the adaptive fog formula above. For bloom, try reducing bloomLuminanceSmoothing from 0.025 to 0.015 to tighten the glow around sprites. Increase bloomIntensity to 1.8 if sprites feel too dim against fog.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all source files listed in Integration Points Summary
- `/Users/marcus/dev/horizons/src/db/schema.ts` -- confirmed all DB columns exist
- `/Users/marcus/dev/horizons/src/app/api/tasks/[id]/route.ts` -- confirmed PATCH allowlist includes all needed fields
- `/Users/marcus/dev/horizons/src/app/api/parse/route.ts` -- confirmed Anthropic SDK pattern with zodOutputFormat
- `/Users/marcus/dev/horizons/src/stores/task-store.tsx` -- confirmed store shape and patterns
- `/Users/marcus/dev/horizons/src/components/TaskCard.tsx` -- confirmed existing drift visual effects
- `/Users/marcus/dev/horizons/src/components/TaskSprite.tsx` -- confirmed existing drift scaling
- `/Users/marcus/dev/horizons/src/components/TaskDetail.tsx` -- confirmed panel structure and z-index stack
- `/Users/marcus/dev/horizons/src/components/HorizonScene.tsx` -- confirmed scene structure and component hierarchy
- `/Users/marcus/dev/horizons/.planning/phases/07-polish/07-CONTEXT.md` -- user decisions constraining this phase

### Secondary (MEDIUM confidence)
- Drizzle `sql` tagged template for increment: pattern is standard Drizzle ORM, but exact syntax for `sql\`column + 1\`` should be verified against Drizzle 0.45.x docs
- R3F Canvas behavior when `display: none` applied to parent: expected to stop rendering with demand frameloop, but not verified with R3F 9.5.0 specifically

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all libraries already in use
- Architecture: HIGH -- all integration points verified by reading actual source files
- Pitfalls: HIGH -- identified from codebase patterns (z-index conflicts, double-count drift, stale state)
- Code examples: MEDIUM -- patterns are correct based on codebase analysis, but Drizzle SQL fragment syntax and R3F Canvas hiding behavior should be validated during implementation

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable -- no external dependency changes expected)
