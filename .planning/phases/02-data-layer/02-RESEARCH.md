# Phase 2: Data Layer - Research

**Researched:** 2026-02-27
**Domain:** Next.js API Routes + Drizzle ORM CRUD + Zustand Store Hydration
**Confidence:** HIGH

## Summary

Phase 2 builds the data plumbing: CRUD API routes for tasks, a seed script, a Zustand store hydrated from server-fetched data, and a `SceneLoader` component that enforces the client/server boundary for R3F Canvas. The stack is fully locked (Drizzle 0.45.1, Zustand 5.0.11, Next.js 16.1.6) with clear decisions from CONTEXT.md.

The standard approach uses Next.js App Router route handlers (`route.ts` files) with Drizzle ORM for database operations, Zustand's vanilla `createStore` with a React Context provider for per-request store isolation, and `next/dynamic` with `{ ssr: false }` inside a `'use client'` component for the Canvas boundary.

A critical finding: React 19's RSC serialization protocol (Flight) natively supports `Date` objects. This means Drizzle's `{ mode: 'date' }` timestamps can be passed directly from Server Components to Client Components without any serialization/deserialization transformation. This eliminates an entire class of bugs.

**Primary recommendation:** Use Drizzle's type-safe CRUD with `.returning()`, initialize the Zustand store via `createStore` from `zustand/vanilla` with `useRef`-based Context provider accepting `initialTasks` from the Server Component, and wrap the Canvas in a `'use client'` component using `next/dynamic({ ssr: false })`.

## Standard Stack

The stack is locked per CONTEXT.md. No alternatives to evaluate.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.1 | Type-safe SQL ORM for Postgres CRUD | Already installed, schema defined in Phase 1 |
| zustand | 5.0.11 | Client-side state store for task data | Already installed, lightweight, works with R3F ecosystem |
| next | 16.1.6 | API route handlers + Server Components | Already installed, App Router is the platform |
| pg | 8.19.0 | PostgreSQL driver (node-postgres) | Already installed, globalThis singleton pattern in place |
| @paralleldrive/cuid2 | 3.3.0 | ID generation for tasks | Already installed, used in schema `$defaultFn` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsx | 4.21.0 | Run seed script as TypeScript | `npm run db:seed` uses `tsx src/db/seed.ts` |
| vitest | 4.0.18 | Unit testing API routes and store | TDD for CRUD operations |
| server-only | (optional) | Prevent db module from being imported in client | Hard boundary enforcement for `src/db/*` |

### Already Installed
All dependencies are present in `package.json`. No new packages needed for Phase 2.

```bash
# No installation needed - everything is already in package.json
# Optionally add server-only for hard module boundary:
npm install server-only
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   └── tasks/
│   │       ├── route.ts          # GET (list) + POST (create)
│   │       └── [id]/
│   │           └── route.ts      # PATCH (update) + DELETE (remove)
│   ├── page.tsx                  # Server Component: fetches tasks, passes to SceneLoader
│   └── layout.tsx                # Root layout (exists)
├── components/
│   └── SceneLoader.tsx           # 'use client' - dynamic imports Canvas, loading/error states
├── db/
│   ├── schema.ts                 # Drizzle schema (exists)
│   ├── index.ts                  # DB singleton (exists)
│   └── seed.ts                   # Seed script (~35 tasks)
├── store/
│   └── task-store.ts             # Zustand store: createStore + provider + hooks
├── lib/
│   ├── horizons.ts               # Horizon computation (exists)
│   └── spatial.ts                # Position computation (exists)
└── types/
    └── task.ts                   # TaskRow, Task types (exists)
```

### Pattern 1: Next.js Route Handlers with Drizzle CRUD
**What:** Each route handler file exports named async functions for HTTP methods. The second parameter provides `params` as a Promise (Next.js 15+ change).
**When to use:** All API routes in this phase.

```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/route (v16.1.6)
// app/api/tasks/[id]/route.ts

import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;  // params is a Promise in Next.js 15+
  const body = await request.json();

  const [updated] = await db
    .update(tasks)
    .set(body)  // partial update - only changed fields
    .where(eq(tasks.id, id))
    .returning();

  if (!updated) {
    return Response.json(
      { error: 'Task not found', code: 'TASK_NOT_FOUND' },
      { status: 404 }
    );
  }

  return Response.json(updated);
}
```

### Pattern 2: Zustand Store with Server Data Hydration
**What:** Use `createStore` from `zustand/vanilla` (not `create` from `zustand`) to create a store factory that accepts initial data. Wrap in a React Context provider using `useRef` for per-request isolation. The Server Component fetches tasks and passes them as props.
**When to use:** The `useTaskStore` pattern for this app.

```typescript
// Source: https://zustand.docs.pmnd.rs/guides/nextjs + GitHub discussions
// store/task-store.ts
'use client';

import { createStore, useStore } from 'zustand';
import { createContext, useContext, useRef } from 'react';
import type { TaskRow, Task } from '@/types/task';
import type { Horizon } from '@/lib/horizons';
import { getHorizon } from '@/lib/horizons';

// --- Store types ---
interface TaskState {
  tasks: TaskRow[];
}

interface TaskActions {
  setTasks: (tasks: TaskRow[]) => void;
  refresh: () => Promise<void>;
}

type TaskStore = TaskState & TaskActions;

// --- Store factory ---
function createTaskStore(initialTasks: TaskRow[] = []) {
  return createStore<TaskStore>()((set) => ({
    tasks: initialTasks,
    setTasks: (tasks) => set({ tasks }),
    refresh: async () => {
      const res = await fetch('/api/tasks');
      const tasks = await res.json();
      set({ tasks });
    },
  }));
}

// --- Context ---
type TaskStoreApi = ReturnType<typeof createTaskStore>;
const TaskStoreContext = createContext<TaskStoreApi | null>(null);

// --- Provider ---
export function TaskStoreProvider({
  children,
  initialTasks,
}: {
  children: React.ReactNode;
  initialTasks: TaskRow[];
}) {
  const storeRef = useRef<TaskStoreApi>(undefined);
  if (!storeRef.current) {
    storeRef.current = createTaskStore(initialTasks);
  }
  return (
    <TaskStoreContext.Provider value={storeRef.current}>
      {children}
    </TaskStoreContext.Provider>
  );
}

// --- Hooks ---
export function useTaskStore<T>(selector: (state: TaskStore) => T): T {
  const store = useContext(TaskStoreContext);
  if (!store) throw new Error('useTaskStore must be used within TaskStoreProvider');
  return useStore(store, selector);
}

// --- Derived selectors ---
export function useTasksWithHorizon(): Task[] {
  return useTaskStore((state) => {
    const now = new Date();
    return state.tasks.map((row) => ({
      ...row,
      horizon: getHorizon(
        row.targetDateEarliest && row.targetDateLatest
          ? { earliest: row.targetDateEarliest, latest: row.targetDateLatest }
          : null,
        now
      ),
      targetDate: row.targetDateEarliest && row.targetDateLatest
        ? { earliest: row.targetDateEarliest, latest: row.targetDateLatest }
        : null,
    }));
  });
}

export function useTasksByHorizon(): Map<Horizon, Task[]> {
  const tasks = useTasksWithHorizon();
  const map = new Map<Horizon, Task[]>();
  for (const task of tasks) {
    const list = map.get(task.horizon) ?? [];
    list.push(task);
    map.set(task.horizon, list);
  }
  return map;
}
```

### Pattern 3: SceneLoader with dynamic(ssr: false)
**What:** A `'use client'` component that uses `next/dynamic` with `{ ssr: false }` to lazily load the R3F Canvas. This is the ONLY safe way to prevent SSR for components that use browser-only APIs like WebGL. Just marking a component with `'use client'` is NOT sufficient -- it still gets pre-rendered on the server.
**When to use:** The SceneLoader component.

```typescript
// Source: https://nextjs.org/docs/app/guides/lazy-loading (v16.1.6)
// components/SceneLoader.tsx
'use client';

import dynamic from 'next/dynamic';
import type { TaskRow } from '@/types/task';
import { TaskStoreProvider } from '@/store/task-store';

const Scene = dynamic(() => import('./Scene'), {
  ssr: false,
  loading: () => <LoadingState />,
});

function LoadingState() {
  return (
    <div className="h-screen w-screen bg-bg-primary animate-pulse" />
  );
}

export default function SceneLoader({ initialTasks }: { initialTasks: TaskRow[] }) {
  return (
    <TaskStoreProvider initialTasks={initialTasks}>
      <div className="h-screen w-screen">
        <Scene />
      </div>
    </TaskStoreProvider>
  );
}
```

### Pattern 4: Server Component Page with Data Fetching
**What:** The `page.tsx` is a Server Component that fetches tasks from the database and passes them as `initialTasks` to SceneLoader. No client-side fetch on initial load.

```typescript
// app/page.tsx
import { db } from '@/db';
import { tasks } from '@/db/schema';
import SceneLoader from '@/components/SceneLoader';

export default async function Home() {
  const allTasks = await db.select().from(tasks);
  return <SceneLoader initialTasks={allTasks} />;
}
```

### Anti-Patterns to Avoid
- **Importing db in client components:** The `@/db` module uses `pg` (Node.js native) and must NEVER be imported in any file with `'use client'`. Consider adding `import 'server-only'` to `src/db/index.ts`.
- **Using `create` instead of `createStore` for Next.js:** The `create` function from `zustand` creates a global singleton hook. In Next.js with SSR, this shares state across requests. Use `createStore` from `zustand/vanilla` + React Context instead.
- **Forgetting `await params` in route handlers:** In Next.js 15+, `params` is a Promise. Accessing `params.id` without `await` returns `undefined` and causes silent bugs.
- **Using `'use client'` alone for R3F Canvas:** `'use client'` only marks the hydration boundary. The component still pre-renders on the server. Three.js/WebGL code crashes during SSR. Must use `dynamic({ ssr: false })`.
- **Serializing dates to strings before passing to client:** React 19's Flight protocol natively serializes `Date` objects. Do NOT convert to ISO strings -- pass Date objects directly from Server Components.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ID generation | UUID v4 / nanoid | cuid2 `$defaultFn` in schema | Already configured in Phase 1, collision-resistant, URL-safe |
| SQL query building | String concatenation | Drizzle `eq()`, `and()`, etc. from `drizzle-orm` | SQL injection prevention, type safety |
| Request body validation | Manual if/else checks | Type narrowing with Drizzle's `$inferInsert` | Compile-time safety, matches schema exactly |
| Date serialization | `toISOString()` / JSON transform | React 19 Flight protocol | Date objects serialize natively through RSC boundary |
| Store hydration timing | useEffect + loading state | Server Component fetch + props | Zero flash, synchronous hydration |

**Key insight:** The entire data layer can rely on Drizzle's type system and React 19's serialization. There is no serialization gap between the database, the API, the Server Component, and the Client Component store. `TaskRow` flows unchanged from `db.select()` all the way to `useTaskStore`.

## Common Pitfalls

### Pitfall 1: params is a Promise in Next.js 15+
**What goes wrong:** Route handler accesses `params.id` directly and gets `undefined`.
**Why it happens:** Next.js 15+ changed `params` from a plain object to a `Promise<{ ... }>`. This is a breaking change from Next.js 14.
**How to avoid:** Always `const { id } = await params;` in route handlers.
**Warning signs:** `id` is `undefined`, 404 errors on valid task IDs.

### Pitfall 2: HMR Connection Exhaustion
**What goes wrong:** PostgreSQL throws "too many connections" during development.
**Why it happens:** Hot Module Replacement creates new `Pool` instances on every file change.
**How to avoid:** Already mitigated -- `src/db/index.ts` uses `globalThis` singleton pattern. Do not create additional Pool instances anywhere.
**Warning signs:** Connection errors after saving files in dev mode.

### Pitfall 3: Zustand Global Store in Next.js SSR
**What goes wrong:** State leaks between requests, or hydration mismatches.
**Why it happens:** Using `create()` from `zustand` creates a module-level singleton. In SSR, the server handles multiple requests sharing the same module scope.
**How to avoid:** Use `createStore()` from `zustand/vanilla` + React Context + `useRef`. Each render tree gets its own store instance.
**Warning signs:** Tasks from one user appearing for another, hydration warnings in console.

### Pitfall 4: Drizzle `.set()` with undefined values
**What goes wrong:** PATCH updates accidentally set columns to `null` when fields are `undefined`.
**Why it happens:** Confusion between `undefined` (should be ignored) and `null` (explicitly set to null).
**How to avoid:** Drizzle ignores `undefined` values in `.set()` -- this is correct behavior. But validate incoming PATCH body to strip unknown fields. Only pass known column names.
**Warning signs:** Columns unexpectedly becoming null after PATCH.

### Pitfall 5: Date Objects in API Response Body
**What goes wrong:** `Response.json()` serializes Date objects to ISO strings. Client receives strings, not Dates.
**Why it happens:** `JSON.stringify()` converts Date to string. When the client calls `GET /api/tasks`, it receives strings for date fields.
**How to avoid:** Two paths: (1) Server Component hydration path -- dates stay as Date objects through Flight protocol. (2) Client `fetch('/api/tasks')` path (the `refresh()` action) -- dates come back as ISO strings and must be reconstructed as `new Date(string)`. The `refresh()` action needs a transform step.
**Warning signs:** `getHorizon()` returns wrong values because it receives strings instead of Dates.

### Pitfall 6: `dynamic` with `ssr: false` in Server Components
**What goes wrong:** Build error: "ssr: false is not allowed with next/dynamic in Server Components."
**Why it happens:** `ssr: false` only works inside `'use client'` files.
**How to avoid:** The `SceneLoader.tsx` must have `'use client'` at the top. The `dynamic()` call must be inside this client component file.
**Warning signs:** Build-time error message.

### Pitfall 7: Seed Script Running Against Wrong Database
**What goes wrong:** Seed script wipes production data.
**Why it happens:** `DATABASE_URL` env var points to production.
**How to avoid:** The seed script should always be run with explicit intent. Add a confirmation or rely on `.env.local` for development. Never run `db:seed` in CI against production.
**Warning signs:** Production data disappearing.

## Code Examples

### Drizzle CRUD Operations (verified from official docs)

```typescript
// Source: https://orm.drizzle.team/docs/select, /insert, /update, /delete

import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';

// SELECT all
const allTasks = await db.select().from(tasks);

// SELECT by ID
const [task] = await db.select().from(tasks).where(eq(tasks.id, someId));

// INSERT with returning
const [newTask] = await db.insert(tasks).values({
  rawInput: 'Buy groceries',
  title: 'Buy groceries',
  targetDateEarliest: new Date('2026-03-01'),
  targetDateLatest: new Date('2026-03-03'),
  tags: ['personal'],
}).returning();

// UPDATE (partial) with returning
const [updated] = await db.update(tasks)
  .set({ title: 'Buy organic groceries', driftCount: 1 })
  .where(eq(tasks.id, someId))
  .returning();

// DELETE with returning
const [deleted] = await db.delete(tasks)
  .where(eq(tasks.id, someId))
  .returning();
```

### Drizzle Type Inference

```typescript
// Source: https://orm.drizzle.team/docs/goodies

import { tasks } from '@/db/schema';

// Infer types directly from schema
type SelectTask = typeof tasks.$inferSelect;  // What you get from select()
type InsertTask = typeof tasks.$inferInsert;   // What you pass to insert()

// SelectTask matches TaskRow interface from src/types/task.ts
// InsertTask has optional fields for those with defaults (id, createdAt, etc.)
```

### Next.js Route Handler with Error Handling

```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/route (v16.1.6)
// app/api/tasks/route.ts

import { db } from '@/db';
import { tasks } from '@/db/schema';

export async function GET() {
  try {
    const allTasks = await db.select().from(tasks);
    return Response.json(allTasks);
  } catch {
    return Response.json(
      { error: 'Failed to fetch tasks', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Validate required fields
    if (!body.title || !body.rawInput) {
      return Response.json(
        { error: 'title and rawInput are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    const [created] = await db.insert(tasks).values(body).returning();
    return Response.json(created, { status: 201 });
  } catch {
    return Response.json(
      { error: 'Failed to create task', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
```

### Seed Script Pattern

```typescript
// src/db/seed.ts - run via `tsx src/db/seed.ts`
import { db } from './index';
import { tasks } from './schema';

async function seed() {
  console.log('Seeding database...');

  // Destructive: wipe existing tasks
  await db.delete(tasks);

  // Insert seed data
  await db.insert(tasks).values([
    {
      rawInput: 'Dentist appointment',
      title: 'Dentist appointment',
      targetDateEarliest: new Date('2026-02-28'),
      targetDateLatest: new Date('2026-02-28'),
      hardDeadline: new Date('2026-02-28'),
      tags: ['health'],
      status: 'active',
    },
    // ... ~34 more tasks
  ]);

  console.log('Seeded ~35 tasks');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
```

### Refresh Action with Date Reconstruction

```typescript
// Critical: when fetching via HTTP (not RSC), dates come back as strings
refresh: async () => {
  const res = await fetch('/api/tasks');
  const rawTasks = await res.json();
  // Reconstruct Date objects from ISO strings
  const tasks = rawTasks.map((t: Record<string, unknown>) => ({
    ...t,
    targetDateEarliest: t.targetDateEarliest ? new Date(t.targetDateEarliest as string) : null,
    targetDateLatest: t.targetDateLatest ? new Date(t.targetDateLatest as string) : null,
    hardDeadline: t.hardDeadline ? new Date(t.hardDeadline as string) : null,
    createdAt: new Date(t.createdAt as string),
    updatedAt: new Date(t.updatedAt as string),
  }));
  set({ tasks });
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `params` as plain object | `params` as `Promise<{...}>` | Next.js 15.0.0-RC | Must `await params` in all route handlers |
| `create()` for all Zustand stores | `createStore()` + Context for SSR | Zustand 5 / Next.js App Router era | Per-request store isolation required |
| Manual date serialization RSC -> Client | Native Date serialization via Flight | React 19 | No transformation needed for RSC path |
| API Routes in `pages/api/` | Route Handlers in `app/api/` | Next.js 13.2 | Web standard Request/Response APIs |
| Drizzle `InferModel` | Drizzle `$inferSelect` / `$inferInsert` | Drizzle 0.28+ | Direct schema type inference |

**Deprecated/outdated:**
- `pages/api/` API Routes: replaced by `app/api/` route handlers
- `zustand/context`: removed, use vanilla `createStore` + React Context
- `InferModel<typeof table>`: use `typeof table.$inferSelect` instead

## Open Questions

1. **Date reconstruction in `refresh()` action**
   - What we know: The initial hydration path (Server Component -> props) preserves Date objects via React Flight. The `refresh()` path via `fetch('/api/tasks')` returns JSON with string dates.
   - What's unclear: Whether to put the date reconstruction logic in the store action or in a shared utility function.
   - Recommendation: Create a `deserializeTask(raw: unknown): TaskRow` utility in `src/lib/task-utils.ts` to reuse across `refresh()` and any future client-side fetch calls.

2. **Input validation depth for PATCH/POST**
   - What we know: CONTEXT.md specifies `{ error: string, code: string }` format. Drizzle handles type coercion for known columns.
   - What's unclear: How strict validation should be (e.g., should we validate tag values against the `TagCategory` union? Should we reject unknown fields?).
   - Recommendation: Minimal validation for Phase 2. Validate required fields exist for POST. For PATCH, strip unknown keys but don't validate tag values. Phase 6 can add deeper validation.

3. **`server-only` package**
   - What we know: Adding `import 'server-only'` to `src/db/index.ts` prevents accidental client-side import of database code.
   - What's unclear: Whether this is necessary given the existing architecture (SceneLoader uses dynamic import, store is client-only).
   - Recommendation: Add it. Belt-and-suspenders. The cost is zero and the protection is real.

## Sources

### Primary (HIGH confidence)
- [Next.js Route Handlers docs](https://nextjs.org/docs/app/getting-started/route-handlers) - v16.1.6, last updated 2026-02-24
- [Next.js route.js API reference](https://nextjs.org/docs/app/api-reference/file-conventions/route) - v16.1.6, params as Promise confirmed
- [Next.js lazy loading / dynamic imports](https://nextjs.org/docs/app/guides/lazy-loading) - v16.1.6, ssr:false constraints confirmed
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) - v16.1.6, serialization rules
- [React use-server serializable types](https://react.dev/reference/react/use-server) - Date objects confirmed serializable
- [Drizzle ORM insert docs](https://orm.drizzle.team/docs/insert) - `.returning()`, bulk insert, type inference
- [Drizzle ORM select docs](https://orm.drizzle.team/docs/select) - `db.select().from()`, `eq()` filter
- [Drizzle ORM update docs](https://orm.drizzle.team/docs/update) - `.set()` partial updates, `.returning()`
- [Drizzle ORM delete docs](https://orm.drizzle.team/docs/delete) - `.where()` filter, `.returning()`
- [Drizzle ORM type inference](https://orm.drizzle.team/docs/goodies) - `$inferSelect`, `$inferInsert`
- Existing codebase: `src/db/schema.ts`, `src/db/index.ts`, `src/types/task.ts` (Phase 1 artifacts)

### Secondary (MEDIUM confidence)
- [Zustand GitHub Discussion #2326](https://github.com/pmndrs/zustand/discussions/2326) - per-request store pattern with Context + useRef
- [Zustand GitHub README](https://github.com/pmndrs/zustand) - createStore vs create API distinction
- [Next.js GitHub Discussion #46137](https://github.com/vercel/next.js/discussions/46137) - Date serialization behavior

### Tertiary (LOW confidence)
- Zustand official docs at `zustand.docs.pmnd.rs/guides/nextjs` - could not fetch content directly (404/redirect loops), patterns verified through GitHub discussions and README

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed, versions verified in package.json
- Architecture: HIGH - Next.js route handler API verified against v16.1.6 docs, Drizzle CRUD verified against official docs, params-as-Promise confirmed
- Pitfalls: HIGH - params Promise change verified in official docs, Date serialization verified via React docs, dynamic ssr:false constraints verified
- Zustand hydration pattern: MEDIUM - official docs unreachable, but pattern verified through multiple GitHub sources and is well-established community practice

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable stack, no expected breaking changes)
