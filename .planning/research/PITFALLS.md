# Pitfalls: Horizon Stack

*R3F + Next.js App Router + Railway Postgres + Drizzle + Anthropic Haiku*

Critical mistakes to prevent. Each has warning signs, a concrete fix, and a phase to address it.

---

## Critical Path: Top 5 "Must Not Miss"

These cause the most rework if discovered late:

1. **#1 SSR Crash** — Wrong setup means every component built on top is also wrong. Foundation-only fix.
2. **#6 Zustand/RSC Boundary** — The data architecture. Getting it wrong means rewriting the entire data flow.
3. **#4 Layout Canvas Persistence** — Restructuring Next.js layouts means moving every route file and re-testing data loading.
4. **#10 Version Matrix** — A bad version combination causes days of debugging cryptic Three.js internals.
5. **#3 frameloop="demand" Stale Renders** — Silent bug: works in dev, breaks production in non-obvious ways.

---

## Phase Map

| Phase | Pitfalls to Address |
|-------|-------------------|
| **Foundation** | #1 SSR Crash, #2 Html Hydration, #4 Layout Persistence, #6 Zustand/RSC, #7 Store Hydration, #8 Postgres Pool Singleton, #10 Version Matrix |
| **Scene Setup** | #3 frameloop Invalidation, #9 Object Disposal Patterns, #11 Fog + Bloom Color |
| **Interaction** | #3 Invalidation Audit, #5 Z-Index Contract, #12 R3F vs DOM Events |
| **Post-Processing** | #11 Bloom Bleed-Through Tuning |
| **Polish** | #9 Memory Leak Profiling |

---

## 1. R3F Canvas SSR Crash

**Severity: Critical** | **Phase: Foundation**

Three.js requires a browser DOM and WebGL context. Any import of R3F/drei/three in a Server Component — or SSR pre-render of a client component — will crash.

**Warning signs:**
- `ReferenceError: document is not defined` during `next build`
- `ReferenceError: window is not defined` at import time
- Error traces pointing into `three/src/renderers/WebGLRenderer.js`

**Fix — `"use client"` alone is not enough.** Next.js still SSR-pre-renders client components. The Canvas must be dynamically imported with `ssr: false`:

```tsx
// app/components/SceneLoader.tsx
"use client"
import dynamic from 'next/dynamic'

const HorizonScene = dynamic(() => import('./scene/HorizonScene'), {
  ssr: false,
  loading: () => <div className="scene-bg" />,
})
```

Never re-export R3F components from a barrel `index.ts` that might be imported by a Server Component.

---

## 2. drei Html Hydration Mismatch

**Severity: High** | **Phase: Foundation / Scene**

drei's `<Html>` portals real DOM nodes into `document.body` using CSS transforms computed from the 3D camera. Server HTML won't contain these — causing React hydration mismatches.

**Warning signs:**
- `Warning: Expected server HTML to contain a matching <div>`
- Html content briefly appears at (0,0) then jumps to correct position
- Content flickering on initial page load

**Fix — keep the portal container inside the `ssr: false` boundary:**

```tsx
// WRONG: portal points to a server-rendered container
<div ref={portalRef} id="overlay" />   {/* server-rendered */}
<Canvas>
  <Html portal={portalRef}>...</Html>
</Canvas>

// RIGHT: portal container is inside the client-only component
function HorizonScene() {
  const portalRef = useRef<HTMLDivElement>(null!)
  return (
    <>
      <div ref={portalRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }} />
      <Canvas>
        <Html portal={portalRef}>...</Html>
      </Canvas>
    </>
  )
}
```

Test with a hard refresh (not HMR) — HMR masks hydration errors.

---

## 3. frameloop="demand" Stale Renders

**Severity: High** | **Phase: Scene / Interaction**

`frameloop="demand"` stops the render loop — R3F only re-renders when `invalidate()` is called. Any state change that affects the scene must call `invalidate()` or the user sees a stale frame.

**Warning signs:**
- Task positions don't update after data changes until user moves the mouse
- Animations freeze midway and resume on mouse move
- Works correctly in dev (HMR triggers re-renders), breaks in production

**Fix — subscribe Zustand to invalidation:**

```ts
// Inside HorizonScene, called once:
function useInvalidateOnStoreChange() {
  const invalidate = useThree(s => s.invalidate)
  useEffect(() => {
    return useTaskStore.subscribe(() => invalidate())
  }, [invalidate])
}
```

For animations, keep requesting frames while animating:

```ts
useFrame((state) => {
  // ...animation logic
  if (isAnimating) state.invalidate() // keep rendering until done
})
```

**Trap:** `useFrame` callbacks do NOT run when no frame is being rendered. Don't use them for timers or polling.

---

## 4. Layout Canvas Persistence

**Severity: High** | **Phase: Foundation**

Navigating between routes with different layouts in Next.js App Router causes a full re-mount. If the Canvas is inside a layout that unmounts, the entire Three.js scene is destroyed — WebGL context loss, GPU texture reload, multi-second blank flash.

**Warning signs:**
- Navigation causes the scene to flash and re-initialize
- WebGL context loss warnings in console
- Performance degrades after multiple navigations

**Fix — put the Canvas in the root layout so it never unmounts:**

```
app/
  layout.tsx        ← Root layout. Contains SceneLoader (always mounted).
  page.tsx          ← Just passes data to overlay components
```

Since Horizon is essentially a single-page app (the spatial view is always visible), this is natural. Use Next.js API routes for data; treat the front-end as a SPA mounted once.

---

## 5. drei Html Z-Index Conflicts with 2D Overlays

**Severity: Medium** | **Phase: Interaction**

drei's `<Html>` portals DOM nodes with their own stacking context. Without a z-index contract, 2D overlays (TaskDetail panel, ListView) and Html task cards fight each other.

**Fix — define a z-index contract upfront:**

```ts
// src/lib/zIndex.ts
export const Z = {
  CANVAS: 0,
  HTML_CARDS: 10,     // drei Html portal container
  OVERLAY_UI: 100,    // TaskDetail, ListView
  MODAL: 200,
} as const
```

```tsx
// Portal container on the Html scene wrapper
<div ref={portalRef} style={{
  position: 'fixed', inset: 0,
  zIndex: Z.HTML_CARDS,
  pointerEvents: 'none'       // Container non-interactive; children opt-in
}} />

// When TaskDetail is open, disable Html portal pointer events
```

---

## 6. Zustand in React Server Components

**Severity: Critical** | **Phase: Foundation**

RSC cannot use hooks. Importing a Zustand store in a Server Component file — even just for types — may crash the build.

**Warning signs:**
- `Error: useState is not a function` in a layout or page file
- Works with `next dev`, breaks on `next build`

**Fix — hard module boundary:**

```
stores/
  taskStore.ts        ← NO "use client". Just create() from zustand.
app/
  page.tsx            ← RSC: fetches data from DB, passes as props
  components/
    SceneLoader.tsx   ← "use client": hydrates Zustand, renders Scene
```

```tsx
// app/page.tsx — Server Component
import { db } from '@/db'
import { tasks } from '@/db/schema'
import SceneLoader from './components/SceneLoader'

export default async function HomePage() {
  const initialTasks = await db.select().from(tasks).where(/* active only */)
  return <SceneLoader initialTasks={initialTasks} />
}
```

---

## 7. Zustand Store Hydration Flash

**Severity: Medium** | **Phase: Foundation**

If Zustand is hydrated via `useEffect`, there's a frame where the store is empty and the scene renders zero tasks.

**Fix — synchronous hydration before first render:**

```tsx
// SceneLoader.tsx
"use client"
export default function SceneLoader({ initialTasks }: { initialTasks: Task[] }) {
  const initialized = useRef(false)
  if (!initialized.current) {
    useTaskStore.setState({ tasks: initialTasks }) // synchronous, no flash
    initialized.current = true
  }
  return <HorizonScene />
}
```

The `useRef` guard ensures it runs exactly once even under React Strict Mode double-mounting.

---

## 8. Postgres Pool Singleton in Dev

**Severity: Medium** | **Phase: Foundation**

Next.js Fast Refresh re-evaluates modules. Without a global singleton, each HMR cycle creates a new `pg.Pool`, eventually exhausting connections.

**Warning signs:**
- `too many clients already` errors after several HMR cycles
- Need to restart `next dev` periodically

**Fix:**

```ts
// src/db/index.ts
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'

const globalForDb = globalThis as unknown as { pool: Pool | undefined }

const pool = globalForDb.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
})

if (process.env.NODE_ENV !== 'production') globalForDb.pool = pool

export const db = drizzle(pool)
```

---

## 9. Three.js Object Disposal / Memory Leaks

**Severity: Medium** | **Phase: Scene / Polish**

Three.js geometries, materials, and textures allocate GPU memory. R3F auto-disposes JSX-declared objects, but anything created in `useMemo` or `useEffect` is not auto-disposed. In a task manager where cards appear/disappear, this leaks over a long session.

**Warning signs:**
- Memory grows steadily as tasks are created and archived
- Frame rate degrades over a long session

**Fix — manual disposal for programmatic objects:**

```tsx
function TaskSprite({ task }: { task: Task }) {
  const geometry = useMemo(() => new THREE.SphereGeometry(0.1, 8, 8), [])

  useEffect(() => {
    return () => { geometry.dispose() }
  }, [geometry])

  return <mesh geometry={geometry}>...</mesh>
}
```

For shared/static resources, use drei's `useTexture` — it's cached and auto-disposed.

---

## 10. R3F / drei / three.js / postprocessing Version Matrix

**Severity: High** | **Phase: Foundation**

Strict peer dependency relationships — a version mismatch causes cryptic runtime errors deep inside Three.js internals.

**Warning signs:**
- `TypeError: Cannot read properties of undefined` inside three.js
- Bloom renders as solid black or white
- Peer dependency warnings during `npm install` (do not ignore these)

**Fix — pin exact versions and use `overrides` to prevent conflicts:**

```json
{
  "dependencies": {
    "three": "0.168.0",
    "@react-three/fiber": "8.17.10",
    "@react-three/drei": "9.114.3",
    "@react-three/postprocessing": "2.16.3"
  },
  "overrides": {
    "three": "0.168.0"
  }
}
```

The `overrides` field prevents transitive dependencies from pulling in a different Three.js version. Without it you may silently end up with two copies of `three` in the bundle.

Upgrade all four packages together or not at all.

---

## 11. fogExp2 + Bloom Interaction

**Severity: Medium** | **Phase: Post-Processing**

Bloom is applied after fog in the render pipeline. If the fog color isn't matched to the background, or bloom `luminanceThreshold` is too low, you get an unwanted glow haze on the horizon.

**Warning signs:**
- Distant horizon has an unwanted atmospheric glow
- Scene looks "milky" with bloom on but fine without it

**Fix:**

```tsx
// Match fog color exactly to scene background
<color attach="background" args={['#080816']} />
<fogExp2 attach="fog" color="#080816" density={0.012} />

// Use a high luminance threshold so only task glows bloom
<Bloom luminanceThreshold={0.85} luminanceSmoothing={0.1} intensity={0.5} mipmapBlur />
```

Toggle bloom with a debug key binding during tuning. The scene with bloom should look like the scene without bloom plus subtle glow on emissive nodes — if the whole mood changes, the threshold is too low.

---

## 12. R3F Event System vs DOM Event System

**Severity: Medium** | **Phase: Interaction**

R3F has its own pointer event system via raycasting. drei's `<Html>` uses native DOM events. Clicks on Html cards can fire BOTH the DOM handler AND the R3F `onClick` on any mesh behind it. Camera controls can activate during text selection inside cards.

**Warning signs:**
- Clicking a button inside an Html card also triggers a click on the mesh behind it
- Camera moves while interacting with a task card

**Fix — stop event propagation from Html content:**

```tsx
<Html>
  <div
    onPointerDown={e => e.stopPropagation()}
    onPointerUp={e => e.stopPropagation()}
    onPointerMove={e => e.stopPropagation()}
  >
    <TaskCard />
  </div>
</Html>
```

For camera controls, disable them when the pointer is over an Html card:

```tsx
const [controlsEnabled, setControlsEnabled] = useState(true)
// Pass controlsEnabled to <OrbitControls enabled={controlsEnabled} />
// Set false on Html card pointerEnter, true on pointerLeave
```

---
*Pitfalls specific to this stack. Generic web/React advice excluded.*
