# Architecture Research: Horizon

*Next.js App Router + React Three Fiber + Railway Postgres + Drizzle + Anthropic Haiku*

---

## 1. Client/Server Component Boundary

The single most important architectural decision. Get this wrong and every component built on top is also wrong.

```
app/
  layout.tsx          ← Server Component (RSC). Fetches initial tasks, passes as props.
  page.tsx            ← Server Component. Renders <SceneLoader initialTasks={...} />
  api/
    tasks/route.ts    ← Server-only. Drizzle queries, never imported by client.
    parse/route.ts    ← Server-only. Anthropic API key lives here.
    refine/route.ts   ← Server-only.

components/
  SceneLoader.tsx     ← "use client". Hydrates Zustand from server-fetched props.
                         Dynamically imports Scene with ssr:false.
  scene/
    HorizonScene.tsx  ← "use client". R3F Canvas lives here. Never SSR'd.
    TaskNode.tsx      ← "use client". Renders inside Canvas.
    ...
  overlay/
    InputBubble.tsx   ← "use client". DOM element fixed over canvas.
    TaskDetail.tsx    ← "use client". Slide-in panel.
    ListView.tsx      ← "use client". Flat list toggle.
```

**The rule:** `"use client"` is necessary but not sufficient for Three.js. The Canvas must also be dynamically imported with `ssr: false` — Next.js still attempts server pre-rendering of client components.

```tsx
// app/components/SceneLoader.tsx
"use client"
import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useTaskStore } from '@/hooks/useTaskStore'
import type { Task } from '@/types/task'

const HorizonScene = dynamic(() => import('./scene/HorizonScene'), {
  ssr: false,
  loading: () => <div className="scene-loading" />,
})

export default function SceneLoader({ initialTasks }: { initialTasks: Task[] }) {
  // Synchronous hydration — no flash of empty scene
  const initialized = useRef(false)
  if (!initialized.current) {
    useTaskStore.setState({ tasks: initialTasks })
    initialized.current = true
  }

  return <HorizonScene />
}
```

---

## 2. Data Flow

Three distinct flows. Each is independent.

### Flow A: Initial Load

```
app/page.tsx (RSC)
  → db.select().from(tasks)          [Drizzle query, server-side]
  → <SceneLoader initialTasks={...}> [props passed to client boundary]
    → useTaskStore.setState(tasks)   [synchronous hydration]
    → <HorizonScene />               [Canvas renders with populated store]
      → useTaskStore(s => s.tasks)   [reads from Zustand]
      → computeHorizon(task)         [client-side: targetDate + now → horizon → Z]
      → <TaskNode position={[x,y,z]} [placed in 3D space]
```

### Flow B: Task Creation (Haiku Parse)

```
<InputBubble /> (user types)
  → useAIParse(rawInput)             [client hook]
    → POST /api/parse                [fetch to Next.js API route]
      → Anthropic.messages.create()  [server-side, key never hits client]
      → JSON.parse(response)         [structured Task fields]
      → db.insert(tasks).values(...) [Drizzle write to Railway Postgres]
      → return task                  [newly created task]
    → useTaskStore.getState()
        .addTask(task)               [optimistic update to Zustand]
    → invalidate()                   [trigger R3F re-render]
  → <TaskNode /> materializes        [entrance animation]
```

### Flow C: Task Mutation (Complete / Reschedule / Drop)

```
<TaskDetail /> (user clicks action)
  → PATCH /api/tasks/:id             [fetch to API route]
    → db.update(tasks).set(...)      [Drizzle update]
    → return updated task
  → useTaskStore.getState()
      .updateTask(id, changes)       [update Zustand]
  → invalidate()
  → <TaskNode /> animates out        [dissolve for complete, drift for reschedule]
```

---

## 3. Database Layer (Railway Postgres + Drizzle)

**Connection setup — persistent pool for Railway's always-on Node server:**

```ts
// src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

// Global singleton to survive Next.js HMR re-evaluation in dev
const globalForDb = globalThis as unknown as { pool: Pool | undefined }

const pool = globalForDb.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,           // tune based on Railway Postgres plan
})

if (process.env.NODE_ENV !== 'production') globalForDb.pool = pool

export const db = drizzle(pool, { schema })
```

**Schema — Drizzle mirrors the TypeScript interface exactly:**

```ts
// src/db/schema.ts
import { pgTable, text, integer, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core'

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  rawInput: text('raw_input').notNull(),
  title: text('title').notNull(),
  targetDate: jsonb('target_date'),          // { earliest: string, latest: string }
  hardDeadline: timestamp('hard_deadline'),
  needsRefinement: boolean('needs_refinement').notNull().default(false),
  refinementPrompt: text('refinement_prompt'),
  subtasks: jsonb('subtasks').default([]),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  driftCount: integer('drift_count').notNull().default(0),
  tags: text('tags').array().default([]),
})
```

**Note:** `horizon` is NOT a column. It's computed client-side from `targetDate` + the current date. Storing it would mean stale data the moment a day ticks over.

**drizzle.config.ts:**
```ts
import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

**Migration workflow:** `npx drizzle-kit generate` → `npx drizzle-kit migrate`

---

## 4. R3F Canvas + Next.js App Router Integration

**Scene structure:**

```tsx
// src/components/scene/HorizonScene.tsx
"use client"
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Billboard, Html, useTexture } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'

export default function HorizonScene() {
  return (
    <Canvas
      frameloop="demand"   // Only render on change — call invalidate() to trigger
      camera={{ position: [0, 2, 8], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={['#080816']} />
      <fogExp2 attach="fog" color="#080816" density={0.012} />

      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 10, 5]} intensity={0.3} />

      <TaskLayer />
      <Atmosphere />
      <CameraController />

      <EffectComposer>
        <Bloom luminanceThreshold={0.8} intensity={0.6} mipmapBlur />
      </EffectComposer>
    </Canvas>
  )
}
```

**Html component (drei) for close task cards:**

```tsx
// src/components/scene/TaskCard.tsx
// drei's <Html> renders real DOM inside 3D space
// Position comes from the parent Billboard/mesh position
<Html
  portal={htmlPortalRef}    // Inject into a portal container at the scene level
  distanceFactor={8}        // Scale with camera distance
  occlude="blending"        // Hide behind other objects
  transform                 // Apply 3D transform
>
  <div
    className="task-card"
    onPointerDown={(e) => e.stopPropagation()} // Prevent R3F event conflicts
    onPointerUp={(e) => e.stopPropagation()}
  >
    <TaskCardContent task={task} />
  </div>
</Html>
```

**Zustand inside R3F — two access patterns:**

```ts
// Pattern A: In component body (hook, re-renders on change)
const tasks = useTaskStore(s => s.tasks)

// Pattern B: In useFrame callback (no closure issues, no re-render)
useFrame(() => {
  const { tasks } = useTaskStore.getState()
  // use tasks without stale closure
})
```

**frameloop="demand" + invalidation:**

```ts
// Whenever Zustand store changes, invalidate the canvas
function useInvalidateOnStoreChange() {
  const invalidate = useThree(s => s.invalidate)
  useEffect(() => {
    return useTaskStore.subscribe(() => invalidate())
  }, [invalidate])
}
// Call this once inside HorizonScene
```

---

## 5. Horizon Computation (Client-Side)

The horizon is derived, never stored. Lives in `src/lib/horizons.ts`.

```ts
// src/lib/horizons.ts
export type Horizon = 'immediate' | 'this-week' | 'this-month' | 'this-quarter' | 'this-year' | 'someday'

const Z_DEPTHS: Record<Horizon, [number, number]> = {
  'immediate':    [0,   -5],
  'this-week':    [-5,  -15],
  'this-month':   [-15, -30],
  'this-quarter': [-30, -50],
  'this-year':    [-50, -80],
  'someday':      [-80, -120],
}

export function computeHorizon(targetDate: DateRange | undefined, now = new Date()): Horizon {
  if (!targetDate) return 'someday'
  const daysUntilEarliest = differenceInDays(targetDate.earliest, now)
  if (daysUntilEarliest <= 1) return 'immediate'
  if (daysUntilEarliest <= 7) return 'this-week'
  if (daysUntilEarliest <= 30) return 'this-month'
  if (daysUntilEarliest <= 90) return 'this-quarter'
  if (daysUntilEarliest <= 365) return 'this-year'
  return 'someday'
}

export function getZPosition(horizon: Horizon, taskId: string): number {
  const [near, far] = Z_DEPTHS[horizon]
  // Deterministic scatter within band based on task ID (stable positions)
  const seed = parseInt(taskId.slice(-4), 16) / 0xffff
  return near + (far - near) * seed
}
```

---

## 6. Build Order

Dependencies determine sequence. Build bottom-up.

| Phase | What | Why first |
|-------|------|-----------|
| 0 | Next.js scaffold + TypeScript + Tailwind + Railway Postgres | Everything depends on project existing |
| 1 | `src/db/` (schema, connection, migrations) + `src/types/task.ts` | API routes and store both import from here |
| 2 | `src/lib/horizons.ts` (horizon + Z-depth math) | Scene and store both need horizon computation |
| 3 | `src/app/api/tasks/route.ts` (CRUD) + seed data | Scene needs real data to develop against |
| 4 | `src/hooks/useTaskStore.ts` (Zustand) + `SceneLoader.tsx` | Client boundary needed before any UI |
| 5 | `HorizonScene.tsx` (Canvas, fog, lighting, atmosphere) | Foundation of the 3D view |
| 6 | `TaskNode.tsx` + LOD (TaskCard with Html, TaskSprite) | Core visual rendering |
| 7 | `CameraController.tsx` (scroll, snap, limits) | Navigation is core interaction |
| 8 | `InputBubble.tsx` + `/api/parse` + `useAIParse` + entrance animation | Full capture loop |
| 9 | `TaskDetail.tsx` + complete/drop/reschedule + completion animation | Full mutation loop |
| 10 | Refinement flow + drift tracking + ListView + polish | Everything else |

---
*Confidence: High. Patterns verified against current Next.js 15 + R3F 8 + Drizzle 0.38 ecosystem.*
