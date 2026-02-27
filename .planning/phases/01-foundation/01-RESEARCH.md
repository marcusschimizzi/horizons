# Phase 1: Foundation - Research

**Researched:** 2026-02-27
**Domain:** Next.js 15 + R3F + Drizzle + Railway Postgres scaffold
**Confidence:** HIGH

## Summary

This phase establishes the project scaffold, database layer, shared types, and horizon/spatial math. Research uncovered one critical compatibility conflict: the user locked "React Three Fiber 8" but R3F 8.x explicitly requires `react >=18 <19`, while Next.js 15 App Router requires React 19. The resolution is to use R3F 9 (stable at 9.5.0) which targets React 19 and is fully compatible with Next.js 15's App Router. The migration from R3F 8 to 9 is minimal -- mostly TypeScript type renames and a `transpilePackages: ['three']` entry in next.config.

Tailwind CSS v4 is the current standard with Next.js 15 and uses CSS-first configuration (`@import "tailwindcss"` instead of `tailwind.config.js`). Drizzle ORM 0.45.1 with node-postgres 8.19.0 provides a clean, type-safe database layer. The globalThis singleton pattern for the pg Pool is essential to prevent connection exhaustion during HMR.

For the scatter algorithm, a zero-dependency approach using a simple string hash (cyrb53 or similar) feeding into Mulberry32 PRNG provides deterministic, reproducible positions from task IDs without any external library.

**Primary recommendation:** Use R3F 9.5.0 + drei 10.7.7 + three 0.170.0 (pinned) + React 19 with Next.js 15. This is the only version matrix that works with the App Router.

## Critical Finding: R3F Version Conflict

The locked decision specifies "React Three Fiber 8" but this is incompatible with the rest of the locked stack:

| Constraint | Requires | Conflict |
|-----------|----------|----------|
| Next.js 15 App Router | React 19 | R3F 8 requires React <19 |
| R3F 8.18.0 | `react >=18 <19` | Next.js 15 App Router needs React 19 |
| drei 9.122.0 | `react ^18` | Same conflict |
| postprocessing 2.19.1 | `react ^18` | Same conflict |

**Resolution:** Use R3F 9 ecosystem instead. R3F 9 is stable (9.5.0), actively maintained, and designed for React 19. The v8-to-v9 migration is straightforward:

1. `Canvas Props` renamed to `CanvasProps` (aliased in v8.1+ for forward compat)
2. `MeshProps` etc. replaced with `ThreeElements['mesh']`
3. Color textures need explicit `colorSpace = THREE.SRGBColorSpace` on custom materials
4. StrictMode correctly inherited from parent renderer (may expose side-effects)

None of these affect the foundation phase. The version matrix below reflects R3F 9.

**Confidence: HIGH** -- Verified via npm peer dependency metadata for all packages.

## Standard Stack

### Core

| Library | Version | Purpose | Why This Version |
|---------|---------|---------|------------------|
| next | 15.5.12 | Framework | Latest stable 15.x, App Router, Turbopack |
| react | 19.2.4 | UI library | Required by Next.js 15 App Router + R3F 9 |
| react-dom | 19.2.4 | DOM rendering | Matches React version |
| three | 0.170.0 | 3D engine | Pin to specific version; >=0.159 required by drei 10, stable release |
| @react-three/fiber | 9.5.0 | React renderer for Three.js | Latest stable, React 19 compat |
| @react-three/drei | 10.7.7 | R3F helpers (Html, Billboard, etc.) | Latest stable, requires R3F ^9 |
| @react-three/postprocessing | 3.0.4 | Bloom, effects | Latest stable, requires R3F ^9 |
| drizzle-orm | 0.45.1 | ORM / query builder | Latest stable, type-safe PostgreSQL |
| pg | 8.19.0 | PostgreSQL client | node-postgres, standard driver |
| zustand | 5.0.11 | Client state | Latest v5, React 18/19 compat |
| tailwindcss | 4.2.1 | Utility CSS | v4, CSS-first config |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-kit | 0.31.9 | Migration CLI | Schema push, generate, migrate |
| @tailwindcss/postcss | 4.2.1 | PostCSS plugin | Required for Tailwind v4 with Next.js |
| @types/pg | latest | TypeScript types for pg | Dev dependency |
| @types/three | match three | TypeScript types for Three.js | Dev dependency, must match three version |
| @paralleldrive/cuid2 | 3.3.0 | ID generation | Task IDs (see ID Generation section) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| cuid2 | nanoid 5.1.6 | nanoid is smaller but cuid2 has better collision resistance and is designed for distributed systems |
| cuid2 | crypto.randomUUID() | Built-in but UUID v4 is not sortable and 36 chars vs 24; no npm dependency though |
| pg (node-postgres) | postgres (postgres.js) | postgres.js is newer/faster but pg is the locked choice and battle-tested |
| drizzle-kit push | drizzle-kit migrate | push is simpler for dev; migrate for production audit trail |

### Installation

```bash
# Create Next.js 15 project
npx create-next-app@15 horizons --typescript --tailwind --eslint --app --src-dir --turbopack

# Core 3D packages (pin three.js version)
npm install three@0.170.0 @react-three/fiber@9.5.0 @react-three/drei@10.7.7 @react-three/postprocessing@3.0.4

# Database
npm install drizzle-orm@0.45.1 pg@8.19.0

# State management
npm install zustand@5.0.11

# ID generation
npm install @paralleldrive/cuid2@3.3.0

# Dev dependencies
npm install -D drizzle-kit@0.31.9 @types/pg @types/three@0.170
```

**CRITICAL: Add overrides to package.json to prevent duplicate three.js:**

```json
{
  "overrides": {
    "three": "0.170.0"
  }
}
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout (Canvas lives here for persistence)
│   ├── page.tsx            # Home page
│   ├── globals.css         # @import "tailwindcss" + custom theme
│   └── api/
│       └── tasks/
│           └── route.ts    # CRUD API routes (Phase 2)
├── components/
│   └── scene/              # 3D scene components (Phase 3)
├── db/
│   ├── index.ts            # globalThis singleton Pool + drizzle instance
│   ├── schema.ts           # Drizzle table definitions
│   └── seed.ts             # Seed script for dev data
├── lib/
│   ├── horizons.ts         # getHorizon(), getZDepth(), horizon constants
│   └── spatial.ts          # scatter algorithm, position from task ID
├── store/
│   └── task-store.ts       # Zustand store (NEVER imported by Server Components)
└── types/
    └── task.ts             # Shared TypeScript types
```

### Pattern 1: globalThis Database Singleton

**What:** Store the pg Pool on globalThis to survive HMR in development.
**When to use:** Always, in `src/db/index.ts`.

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

const pool = globalForDb.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema });
```

**Confidence: HIGH** -- This pattern is well-documented across Next.js + database setups and directly addresses the HMR connection exhaustion problem.

### Pattern 2: Tailwind v4 CSS-First Configuration

**What:** Tailwind v4 replaces `tailwind.config.js` with CSS-based `@theme` directives.
**When to use:** All styling configuration.

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --color-horizon-immediate: #ef4444;
  --color-horizon-this-week: #f59e0b;
  --color-horizon-this-month: #3b82f6;
  --color-horizon-this-quarter: #8b5cf6;
  --color-horizon-this-year: #06b6d4;
  --color-horizon-someday: #6b7280;
}
```

```javascript
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

**Confidence: HIGH** -- Verified from official Next.js CSS docs and Tailwind v4 installation guide.

### Pattern 3: Drizzle Schema with Computed Fields

**What:** Store only raw data in DB; horizon is computed client-side from targetDate + now.
**When to use:** The tasks table schema.

```typescript
// src/db/schema.ts
import { pgTable, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  rawInput: text('raw_input').notNull(),
  title: text('title').notNull(),
  // horizon is NOT stored -- computed client-side
  targetDateEarliest: timestamp('target_date_earliest', { mode: 'date', withTimezone: true }),
  targetDateLatest: timestamp('target_date_latest', { mode: 'date', withTimezone: true }),
  hardDeadline: timestamp('hard_deadline', { mode: 'date', withTimezone: true }),
  needsRefinement: boolean('needs_refinement').notNull().default(false),
  refinementPrompt: text('refinement_prompt'),
  status: text('status', { enum: ['active', 'completed', 'dropped'] }).notNull().default('active'),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
  driftCount: integer('drift_count').notNull().default(0),
  tags: text('tags').array(),
});
```

**Confidence: HIGH** -- Verified from Drizzle column types documentation. The `$onUpdateFn` for updatedAt is a Drizzle feature.

### Pattern 4: Dynamic Import for Canvas (SSR: false)

**What:** The R3F Canvas must never render on the server.
**When to use:** Root layout or wherever Canvas is mounted.

```typescript
// src/components/scene/SceneLoader.tsx
'use client';

import dynamic from 'next/dynamic';

const HorizonScene = dynamic(() => import('./HorizonScene'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-black" />,
});

export default function SceneLoader() {
  return <HorizonScene />;
}
```

**Confidence: HIGH** -- This is the documented pattern for R3F with Next.js, per both R3F docs and the prior decisions.

### Pattern 5: next.config.ts for Three.js Transpilation

**What:** Three.js ecosystem packages need transpilation in Next.js.
**When to use:** Always, in next.config.ts.

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['three'],
};

export default nextConfig;
```

**Confidence: HIGH** -- Per R3F installation docs for Next.js 13.1+.

### Anti-Patterns to Avoid

- **Importing Zustand store in Server Components:** The store is client-only. Server Components must fetch data via the db module directly or pass data as props to Client Components.
- **Using `'use client'` alone for Canvas:** Must use `dynamic(() => import(...), { ssr: false })` -- `'use client'` still pre-renders on the server.
- **Storing horizon in the database:** Horizon is derived from targetDate + current time. It changes as real time passes.
- **Creating pg Pool outside globalThis pattern:** Will cause connection exhaustion during development HMR.
- **Using `tailwind.config.js` with Tailwind v4:** v4 uses CSS-based `@theme` directives; the JS config is a v3 pattern.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ID generation | Custom UUID/random string | cuid2 (`@paralleldrive/cuid2`) | Collision-resistant, 24-char, k-sortable, secure |
| DB connection pooling | Manual pool management | pg Pool + globalThis singleton | pg handles pooling; globalThis handles HMR |
| Schema migrations | Raw SQL files | drizzle-kit push/migrate | Type-safe, diffable, reversible |
| CSS utility framework | Custom CSS | Tailwind v4 | Already decided; zero config with `@import` |
| 3D scene boilerplate | Raw three.js | R3F + drei | Declarative React API, Html component for cards |
| Seeded PRNG | crypto.getRandomValues | Mulberry32 + string hash | Deterministic from seed; no external library needed |

**Key insight:** This phase is pure infrastructure. Every "don't hand-roll" item prevents wasted time on solved problems so the focus stays on getting the scaffold complete and correct.

## Common Pitfalls

### Pitfall 1: Duplicate three.js Bundles

**What goes wrong:** drei or postprocessing pulls in a different three.js version, causing "multiple instances of Three.js" errors, broken contexts, and massive bundle sizes.
**Why it happens:** npm resolves transitive deps independently; drei might want three@0.172 while you installed three@0.170.
**How to avoid:** Pin `three` to an exact version in `overrides` (npm) or `resolutions` (yarn) in package.json.
**Warning signs:** Runtime errors about "THREE.Scene is not a constructor", doubled bundle size, WebGL context errors.

```json
{
  "overrides": {
    "three": "0.170.0"
  }
}
```

**Confidence: HIGH** -- This is a well-known R3F ecosystem issue documented in community guides.

### Pitfall 2: HMR Connection Pool Exhaustion

**What goes wrong:** Every file save in dev creates a new pg Pool, eventually hitting Postgres max_connections.
**Why it happens:** Next.js HMR re-evaluates module-level code on each file change.
**How to avoid:** globalThis singleton pattern (see Architecture Patterns above).
**Warning signs:** "too many connections" errors after ~10-20 file saves in dev mode.

**Confidence: HIGH** -- Documented in multiple Next.js GitHub issues (#45483, #26427, #7811).

### Pitfall 3: Canvas SSR Hydration Mismatch

**What goes wrong:** Server renders Canvas HTML that doesn't match client WebGL, causing hydration errors.
**Why it happens:** Using `'use client'` without `ssr: false` -- Next.js still pre-renders on the server.
**How to avoid:** Use `dynamic(() => import('./Scene'), { ssr: false })` for all R3F components.
**Warning signs:** React hydration mismatch warnings, blank canvas on initial load, "document is not defined" errors.

**Confidence: HIGH** -- Per locked decision and R3F + Next.js documented pattern.

### Pitfall 4: Zustand Store in Server Components

**What goes wrong:** Importing Zustand store in a Server Component causes "useState is not defined" or similar errors.
**Why it happens:** Zustand uses React hooks internally, which are client-only in the App Router.
**How to avoid:** Keep all Zustand imports in files marked `'use client'`. Server Components should use the db module directly.
**Warning signs:** Build errors, "tried to import a module that only works on the client" warnings.

**Confidence: HIGH** -- Per locked decision.

### Pitfall 5: Railway Postgres SSL in Production

**What goes wrong:** Connection refused or SSL errors when deploying to Railway.
**Why it happens:** Railway Postgres uses self-signed SSL certificates. Setting `ssl: true` alone will fail because the cert isn't from a trusted CA.
**How to avoid:** Use `ssl: { rejectUnauthorized: false }` in production. Don't use SSL locally (Docker).
**Warning signs:** "self signed certificate" error in production logs.

**Confidence: MEDIUM** -- Based on community reports and Railway docs mentioning SSL-enabled image. Verify during deployment.

### Pitfall 6: create-next-app Tailwind Version

**What goes wrong:** `create-next-app@15` might scaffold Tailwind v3 instead of v4, creating a `tailwind.config.ts` that conflicts with the CSS-first approach.
**Why it happens:** Different versions of the scaffolding tool default to different Tailwind versions.
**How to avoid:** After scaffolding, verify the setup. If v3 was scaffolded, remove `tailwind.config.ts`, update `postcss.config.mjs` to use `@tailwindcss/postcss`, and change `globals.css` to use `@import "tailwindcss"`. Install `tailwindcss@4` and `@tailwindcss/postcss` if needed.
**Warning signs:** Presence of `tailwind.config.ts`, `@tailwind base` directives in CSS, `tailwindcss` plugin in postcss config instead of `@tailwindcss/postcss`.

**Confidence: MEDIUM** -- The Next.js official CSS docs show v4 as primary, but scaffolding behavior may vary by version.

## Code Examples

### Horizon Computation

```typescript
// src/lib/horizons.ts

export type Horizon = 'immediate' | 'this-week' | 'this-month' | 'this-quarter' | 'this-year' | 'someday';

export interface DateRange {
  earliest: Date;
  latest: Date;
}

export interface HorizonBand {
  name: Horizon;
  zMin: number;
  zMax: number;
}

export const HORIZON_BANDS: HorizonBand[] = [
  { name: 'immediate',    zMin: 0,   zMax: -5 },
  { name: 'this-week',    zMin: -5,  zMax: -15 },
  { name: 'this-month',   zMin: -15, zMax: -30 },
  { name: 'this-quarter', zMin: -30, zMax: -50 },
  { name: 'this-year',    zMin: -50, zMax: -80 },
  { name: 'someday',      zMin: -80, zMax: -120 },
];

/**
 * Compute which horizon a task falls into based on its target date and the current time.
 * Tasks without a targetDate default to 'someday'.
 */
export function getHorizon(targetDate: DateRange | undefined, now: Date = new Date()): Horizon {
  if (!targetDate) return 'someday';

  const midpoint = new Date((targetDate.earliest.getTime() + targetDate.latest.getTime()) / 2);
  const daysOut = (midpoint.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (daysOut <= 1) return 'immediate';
  if (daysOut <= 7) return 'this-week';
  if (daysOut <= 30) return 'this-month';
  if (daysOut <= 90) return 'this-quarter';
  if (daysOut <= 365) return 'this-year';
  return 'someday';
}

/**
 * Get the Z-depth range for a given horizon.
 */
export function getZDepthRange(horizon: Horizon): { zMin: number; zMax: number } {
  const band = HORIZON_BANDS.find(b => b.name === horizon);
  if (!band) throw new Error(`Unknown horizon: ${horizon}`);
  return { zMin: band.zMin, zMax: band.zMax };
}
```

### Deterministic Scatter Algorithm

```typescript
// src/lib/spatial.ts

import type { Horizon } from './horizons';
import { getZDepthRange, HORIZON_BANDS } from './horizons';

/**
 * Simple string hash (cyrb53) - produces a 53-bit hash from any string.
 * Deterministic: same input always produces same output.
 */
function cyrb53(str: string, seed: number = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * Mulberry32 PRNG - seeded pseudo-random number generator.
 * Returns a function that produces deterministic values in [0, 1).
 */
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// X/Y spread multipliers per horizon band (wider for distant bands)
const SPREAD_CONFIG: Record<Horizon, { xSpread: number; ySpread: number }> = {
  'immediate':    { xSpread: 4,  ySpread: 2 },
  'this-week':    { xSpread: 6,  ySpread: 3 },
  'this-month':   { xSpread: 10, ySpread: 4 },
  'this-quarter': { xSpread: 14, ySpread: 5 },
  'this-year':    { xSpread: 18, ySpread: 6 },
  'someday':      { xSpread: 22, ySpread: 7 },
};

export interface TaskPosition {
  x: number;
  y: number;
  z: number;
}

/**
 * Compute deterministic 3D position for a task based on its ID and horizon.
 * Same ID + horizon always produces the same position.
 */
export function getTaskPosition(taskId: string, horizon: Horizon): TaskPosition {
  const hash = cyrb53(taskId);
  const rng = mulberry32(hash);

  const { zMin, zMax } = getZDepthRange(horizon);
  const { xSpread, ySpread } = SPREAD_CONFIG[horizon];

  const x = (rng() - 0.5) * 2 * xSpread;  // centered around 0
  const y = (rng() - 0.5) * 2 * ySpread;   // centered around 0
  const z = zMin + rng() * (zMax - zMin);   // within band depth range

  return { x, y, z };
}

/**
 * Soft overlap avoidance: nudge positions that are too close together.
 * Best-effort, not guaranteed. O(n^2) but fine for 30-200 tasks.
 */
export function applyOverlapAvoidance(
  positions: { id: string; pos: TaskPosition; horizon: Horizon }[],
  minDistance: number = 2.0,
  iterations: number = 3,
): Map<string, TaskPosition> {
  const result = new Map<string, TaskPosition>();
  const adjusted = positions.map(p => ({
    id: p.id,
    horizon: p.horizon,
    pos: { ...p.pos },
  }));

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < adjusted.length; i++) {
      for (let j = i + 1; j < adjusted.length; j++) {
        // Only compare within same horizon band
        if (adjusted[i].horizon !== adjusted[j].horizon) continue;

        const dx = adjusted[j].pos.x - adjusted[i].pos.x;
        const dy = adjusted[j].pos.y - adjusted[i].pos.y;
        const dz = adjusted[j].pos.z - adjusted[i].pos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < minDistance && dist > 0.001) {
          const pushForce = (minDistance - dist) / dist * 0.5;
          adjusted[i].pos.x -= dx * pushForce;
          adjusted[i].pos.y -= dy * pushForce;
          adjusted[j].pos.x += dx * pushForce;
          adjusted[j].pos.y += dy * pushForce;
          // Don't push Z -- keep within band
        }
      }
    }
  }

  adjusted.forEach(a => result.set(a.id, a.pos));
  return result;
}
```

### Drizzle Config

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Docker Compose for Local Postgres

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: horizons
      POSTGRES_PASSWORD: horizons
      POSTGRES_DB: horizons
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Local DATABASE_URL: `postgresql://horizons:horizons@localhost:5432/horizons`

### .env.example

```bash
# .env.example

# Local development (Docker Compose)
DATABASE_URL=postgresql://horizons:horizons@localhost:5432/horizons

# Railway (set automatically via ${{Postgres.DATABASE_URL}})
# DATABASE_URL=postgresql://...

# Anthropic API (Phase 5)
# ANTHROPIC_API_KEY=sk-...
```

### Auto-Migration on Dev Start

Add to `package.json` scripts:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "tsx src/db/seed.ts",
    "db:studio": "drizzle-kit studio",
    "dev:full": "docker compose up -d && npm run db:push && npm run dev"
  }
}
```

Use `npm run dev:full` to start Docker Postgres, push schema, and start Next.js in one command. The `db:push` command is idempotent -- it only applies changes.

**Confidence: HIGH** -- Based on Drizzle docs and Docker Compose best practices.

## Task ID Generation

**Recommendation: Use cuid2** (`@paralleldrive/cuid2`)

| Property | cuid2 | nanoid | UUID v4 |
|----------|-------|--------|---------|
| Length | 24 chars | 21 chars | 36 chars |
| Sortable | k-sortable (time-based prefix) | No | No |
| Collision resistant | Very high (128-bit entropy) | High | High |
| URL-safe | Yes | Yes | Yes (with dashes) |
| DB storage | TEXT | TEXT | UUID native type |
| Good hash seed | Yes (high entropy) | Yes | Yes |

cuid2 is recommended because:
1. 24 characters is compact enough for URLs and display
2. K-sortable prefix means database inserts are roughly sequential (good for B-tree indexes)
3. High entropy makes it an excellent seed for the deterministic scatter hash
4. No external runtime dependency (pure JS)

Drizzle schema uses `text('id').primaryKey().$defaultFn(() => createId())` to auto-generate on insert.

**Confidence: HIGH** -- Based on npm research and PostgreSQL ID strategy guides.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tailwind.config.js (v3) | @import "tailwindcss" + @theme CSS (v4) | Tailwind v4 (2025) | No JS config file needed; CSS-first |
| @tailwind base/components/utilities | @import "tailwindcss" | Tailwind v4 (2025) | Single import replaces three directives |
| R3F 8 + React 18 | R3F 9 + React 19 | R3F 9.0.0 (2024) | Breaking: must use React 19 |
| Drizzle 0.38.x | Drizzle 0.45.x | Late 2025 | New drizzle() API accepts connection string directly |
| Manual Webpack config for three.js | `transpilePackages: ['three']` | Next.js 13.1+ | Single line in next.config |
| Prisma as default ORM | Drizzle gaining rapidly | 2024-2025 | Drizzle is lighter, SQL-first, no generate step |

**Deprecated/outdated:**
- `tailwind.config.js` / `tailwind.config.ts` -- v3 only; v4 uses CSS `@theme` directive
- `@react-three/fiber@8` -- no longer compatible with React 19 / Next.js 15 App Router
- `@react-three/drei@9` -- now at v10 for R3F 9 compatibility
- `@react-three/postprocessing@2` -- now at v3 for R3F 9 compatibility
- `next-transpile-modules` package -- replaced by built-in `transpilePackages` in next.config

## Open Questions

1. **Exact `create-next-app@15` Tailwind behavior**
   - What we know: Next.js official docs show Tailwind v4 as primary setup. `create-next-app` with `--tailwind` auto-configures Tailwind.
   - What's unclear: Whether `create-next-app@15` (not @latest/16) scaffolds v4 or v3 by default. Some sources suggest v3 remains the default in certain versions.
   - Recommendation: Run `create-next-app@15` and inspect the output. If it scaffolds v3, manually convert to v4 (remove tailwind.config, update postcss.config, update globals.css). This takes ~2 minutes.

2. **three.js version pinning -- which specific version?**
   - What we know: drei 10.7.7 requires three >=0.159. The latest three.js is 0.183.1. R3F 9 requires three >=0.156.
   - What's unclear: Whether 0.183.1 (latest) has any breaking changes with drei helpers used in this project (Html, Billboard). The three.js changelog is fast-moving.
   - Recommendation: Pin to three@0.170.0 as a stable mid-point. It satisfies all peer deps and avoids bleeding-edge breakage. Can upgrade later if needed. If 0.170.0 causes any issue, try 0.175.0.

3. **Railway Postgres max_connections default**
   - What we know: Railway uses a standard PostgreSQL Docker image with SSL enabled.
   - What's unclear: The default `max_connections` setting on Railway's Postgres service.
   - Recommendation: Set pg Pool `max: 10` in development, `max: 20` in production. This is well within any reasonable Postgres default (usually 100).

## Sources

### Primary (HIGH confidence)
- npm registry -- package versions, peer dependencies (verified via `npm view`)
- [Next.js Official CSS Docs](https://nextjs.org/docs/app/getting-started/css) -- Tailwind v4 setup
- [Next.js Installation Docs](https://nextjs.org/docs/app/getting-started/installation) -- create-next-app behavior
- [Drizzle ORM PostgreSQL Getting Started](https://orm.drizzle.team/docs/get-started-postgresql) -- connection setup
- [Drizzle Config File Docs](https://orm.drizzle.team/docs/drizzle-config-file) -- drizzle.config.ts
- [Drizzle Migration Docs](https://orm.drizzle.team/docs/migrations) -- push vs migrate workflow
- [Drizzle PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg) -- schema syntax
- [R3F v9 Migration Guide](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide) -- v8 to v9 changes
- [R3F Installation Guide](https://r3f.docs.pmnd.rs/getting-started/installation) -- Next.js setup
- [Tailwind CSS Next.js Guide](https://tailwindcss.com/docs/guides/nextjs) -- v4 setup steps

### Secondary (MEDIUM confidence)
- [Railway PostgreSQL Docs](https://docs.railway.com/databases/postgresql) -- DATABASE_URL, SSL config
- [Next.js GitHub Discussion #72795](https://github.com/vercel/next.js/discussions/72795) -- React 18/19 compatibility
- [Next.js GitHub Issue #45483](https://github.com/vercel/next.js/issues/45483) -- HMR connection exhaustion

### Tertiary (LOW confidence)
- WebSearch results for community scatter algorithm approaches -- validated with implementation testing
- WebSearch results for create-next-app Tailwind version defaults -- needs runtime verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified via npm registry
- Architecture: HIGH -- patterns sourced from official docs
- Pitfalls: HIGH -- well-documented community issues with official workarounds
- Scatter algorithm: MEDIUM -- hash + PRNG approach is standard but exact tuning values (spread multipliers, minDistance) need runtime validation

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable ecosystem, 30-day validity)
