# Stack Research: Horizon

*Based on PRD stack decisions + current ecosystem knowledge (Feb 2026).*

---

## Framework: Next.js 15 (App Router) + TypeScript

**Package:** `next@15`, `react@19`, `react-dom@19`, `typescript@5`

**Why:** API routes keep the Anthropic key server-side. App Router enables RSC for overlay UI while client components handle R3F canvas. Vercel deploys zero-config.

**Critical setup note:** R3F Canvas cannot be SSR'd. The Canvas component must be:
1. In a file with `"use client"` at the top, OR
2. Dynamically imported: `dynamic(() => import('./HorizonScene'), { ssr: false })`

Option 2 is preferred — keeps `page.tsx` as RSC, defers Three.js bundle to client-only.

**Confidence: High**

---

## Database: Railway PostgreSQL

**Package:** `pg`, `@types/pg`

**Why:** Railway has a first-class Postgres service — add it to your project and `DATABASE_URL` is automatically injected into your app's environment. No separate account, no special drivers. Since Railway runs Next.js as a persistent Node.js server (not serverless functions), a standard connection pool with `node-postgres` is the correct approach — simpler and more performant than Neon's HTTP-based serverless adapter.

**Setup:**
1. In Railway dashboard: New Service → Database → PostgreSQL
2. Link it to your app service — `DATABASE_URL` is injected automatically
3. Copy `DATABASE_URL` to `.env.local` for local dev

**Connection pattern:**
```ts
// src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const db = drizzle(pool)
```

**Environment variable:** `DATABASE_URL` — auto-injected by Railway in production, set manually in `.env.local`.

**Dev setup note:** For local development, either use the Railway Postgres connection string directly (with Railway CLI's `railway run`) or spin up a local Postgres instance via Docker: `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres`.

**Confidence: High**

---

## ORM: Drizzle

**Package:** `drizzle-orm@0.38+`, `drizzle-kit@0.29+`

**Why:** Lightweight, type-safe, fast to set up. Schema maps directly to TypeScript interfaces. Less boilerplate than Prisma for a small schema.

**Schema pattern:**
```ts
// src/db/schema.ts
import { pgTable, text, integer, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core'

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  rawInput: text('raw_input').notNull(),
  title: text('title').notNull(),
  targetDate: jsonb('target_date'),       // { earliest: string, latest: string }
  hardDeadline: timestamp('hard_deadline'),
  needsRefinement: boolean('needs_refinement').notNull().default(false),
  refinementPrompt: text('refinement_prompt'),
  subtasks: jsonb('subtasks'),            // Task[]
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  driftCount: integer('drift_count').notNull().default(0),
  tags: text('tags').array(),
})
```

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

**Migration:** `npx drizzle-kit generate` then `npx drizzle-kit migrate`

**Note:** `horizon` is NOT stored. It's computed client-side from `targetDate` + current date. Z-depth is derived from horizon.

**Confidence: High**

---

## 3D Rendering: React Three Fiber + drei

**Packages:**
- `three@0.170+`
- `@react-three/fiber@8.17+`
- `@react-three/drei@9.115+`
- `@react-three/postprocessing@2.16+`

**Why:** Real 3D space. Fog, camera, depth are native. Stays in React mental model.

**Version compatibility note:** drei and R3F versions must match. As of early 2026:
- `three@^0.170` + `@react-three/fiber@^8.17` + `@react-three/drei@^9.115` — confirmed compatible
- `@react-three/postprocessing@^2.16` requires `three@^0.170`

**Canvas setup pattern:**
```tsx
// 'use client'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'

<Canvas
  frameloop="demand"        // Battery saving: only render on change
  camera={{ position: [0, 0, 5], fov: 60 }}
  gl={{ antialias: true }}
>
  <fogExp2 attach="fog" color="#0a0a1a" density={0.015} />
  {/* scene content */}
  <EffectComposer>
    <Bloom luminanceThreshold={0.3} intensity={0.8} />
  </EffectComposer>
</Canvas>
```

**frameloop="demand" gotcha:** When using demand mode, call `invalidate()` from `useThree()` whenever state changes to trigger a re-render. Zustand store subscriptions should call `invalidate()` on change.

**drei Html component note:** Renders real DOM nodes inside the 3D scene using a CSS transform. Works correctly in Next.js App Router when the Canvas is already a client component. Use `occlude` prop to hide behind other 3D objects.

**Confidence: High for setup. Medium for exact version matrix — verify with `npm view` before installing.**

---

## AI: Anthropic API (Haiku)

**Package:** `@anthropic-ai/sdk@0.36+`

**Model:** `claude-haiku-4-5-20251001` (latest as of Feb 2026)

**Why:** Extremely cheap. Structured output via tool use / JSON mode. Fast enough for real-time task parsing. API key stays server-side in Next.js API routes.

**API route pattern:**
```ts
// src/app/api/parse/route.ts
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic() // reads ANTHROPIC_API_KEY from env

export async function POST(req: Request) {
  const { rawInput, currentDate } = await req.json()

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: rawInput }],
  })

  // parse JSON from response.content[0].text
  return Response.json(parsedTask)
}
```

**Environment variable:** `ANTHROPIC_API_KEY` — never in client bundle.

**Confidence: High**

---

## State Management: Zustand

**Package:** `zustand@5+`

**Why:** Lightweight client-side state. Works cleanly with R3F (hooks inside render function). RSC cannot use Zustand directly — client components only.

**Pattern for R3F + Zustand:**
```ts
// Inside R3F render (useFrame, component body): use hooks
const tasks = useTaskStore(s => s.tasks)

// Inside useFrame callback (render loop): use getState() to avoid closures
useFrame(() => {
  const { tasks } = useTaskStore.getState()
})
```

**Initial hydration pattern:**
1. RSC fetches tasks server-side as a prop
2. Client component receives tasks as prop, hydrates Zustand on mount
3. All subsequent updates go through Zustand → optimistic UI → API sync

**Confidence: High**

---

## Styling: Tailwind CSS v4

**Package:** `tailwindcss@4+`

**Why:** Utility-first for 2D overlay elements (InputBubble, TaskDetail, ListView). The 3D scene doesn't use Tailwind — it's Three.js materials and drei Html components.

**Tailwind v4 note:** Config is now CSS-based (`@import "tailwindcss"`) rather than `tailwind.config.js`. PostCSS setup has changed — follow v4 installation guide.

**Confidence: High**

---

## Animation: Framer Motion + R3F Springs

**Packages:** `framer-motion@11+` (2D overlays), `@react-spring/three@9+` (3D transitions)

**Why:** Framer for 2D overlays (TaskDetail slide-in, InputBubble). R3F spring for 3D transitions (task drift, dissolve animations). Manual `useFrame` lerping works well for camera movement.

**Camera lerp pattern:**
```ts
useFrame(() => {
  camera.position.z = THREE.MathUtils.lerp(
    camera.position.z,
    targetZ.current,
    0.08  // tune for feel
  )
  invalidate()
})
```

**Confidence: High**

---

## Deployment: Railway

**Why:** Great Next.js support with simple git-push deploys. Supports long-running services (not just serverless functions), which matters if streaming Anthropic responses or adding WebSocket features later. More predictable pricing and no function timeout surprises.

**Setup:**
1. Create Railway project, connect GitHub repo
2. Add service → choose repo → Railway auto-detects Next.js
3. Add environment variables (`DATABASE_URL`, `ANTHROPIC_API_KEY`) in Railway dashboard
4. Railway generates a public URL — set `NEXTAUTH_URL` / `NEXT_PUBLIC_URL` if needed

**Neon with Railway:** Neon works fine — just add the `DATABASE_URL` connection string as a Railway environment variable. No native integration like Vercel has, but it's one copy-paste.

**Build command:** Railway will use `npm run build` and `npm run start` by default. This is correct for Next.js.

**Note:** Unlike Vercel, Railway runs Next.js as a persistent Node.js server (not serverless functions). This means no cold starts and no 60-second function timeout — streaming from Anthropic works without special config.

**Confidence: High**

---

## Install Command

```bash
npx create-next-app@latest horizons --typescript --tailwind --app --src-dir --import-alias "@/*"
cd horizons
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing
npm install drizzle-orm pg && npm install -D @types/pg
npm install -D drizzle-kit
npm install @anthropic-ai/sdk
npm install zustand framer-motion @react-spring/three
```

---
*Last verified: Feb 2026. Pin exact versions in package.json after confirming compatibility.*
