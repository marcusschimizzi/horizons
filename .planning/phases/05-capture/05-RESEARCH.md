# Phase 5: Capture - Research

**Researched:** 2026-02-27
**Domain:** Natural language input, AI structured extraction, optimistic state, R3F animation
**Confidence:** HIGH

## Summary

Phase 5 connects the user's natural language input to the 3D scene through an end-to-end capture loop: input bubble, Haiku parse route, persistence, and entrance animation. The research resolves the open architecture question (tool use vs raw JSON) and maps out the exact SDK patterns, Zustand optimistic update strategy, R3F animation approach, and camera visibility detection needed for planning.

The key discovery is that Anthropic now offers **structured outputs** (GA as of late 2025) with `output_config.format` using `json_schema` type -- this is strictly superior to both tool use and raw JSON prompting for this use case. It guarantees schema compliance through constrained decoding at the grammar level, requires no beta headers, and works with Claude Haiku 4.5. This eliminates the need for retry logic around malformed JSON entirely.

**Primary recommendation:** Use `output_config.format` with `zodOutputFormat()` from `@anthropic-ai/sdk/helpers/zod` for guaranteed structured extraction in the `/api/parse` route. Use `useRef`-based mount timestamps with `useFrame` for entrance animations (no `@react-spring/three` needed given the project already uses `useFrame` extensively). Use simple Z-range comparison against `cameraStore` for visibility detection (cheaper and more appropriate than frustum checks for this Z-axis-only scene).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | ^0.78.0 | Anthropic API client for Haiku calls | Official SDK with `zodOutputFormat()` helper and `messages.parse()` for type-safe structured outputs |
| `zod` | ^3.25.0 | Schema definition for structured output | Peer dependency of `@anthropic-ai/sdk` (optional but required for `zodOutputFormat`), TypeScript-first schema library |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zustand` | ^5.0.11 | Already installed -- optimistic update via `addTask`/`removeTask` | Task state management with optimistic pattern |
| `three` | 0.170.0 | Already installed -- `Frustum`/`Vector3` if needed | Camera visibility checks (but Z-range simpler here) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `output_config.format` (JSON outputs) | `tools` with `strict: true` (tool use) | Tool use is designed for function-calling agents, not pure data extraction. JSON outputs is the direct feature for "return structured data." Tool use adds unnecessary `tool_use`/`tool_result` content block overhead. |
| `output_config.format` | Raw JSON prompt + `JSON.parse()` | No schema guarantee. Haiku can produce malformed JSON. Requires retry logic. Structured outputs eliminate this entirely. |
| `@react-spring/three` | `useFrame` + `useRef` for animations | Adding a new dependency (`@react-spring/three`) is unnecessary when the codebase already uses `useFrame` with `damp3` from `maath/easing`. The animations needed (fade-in + scale-up) are simple enough for manual interpolation. |
| `sonner` / `react-hot-toast` | Plain DOM toast component | Toast libraries pull in React portals, animation libraries, and CSS. A single inline-styled DOM element matching the existing overlay pattern (like SnapToPresent) is simpler and consistent. |

**Installation:**
```bash
npm install @anthropic-ai/sdk zod
```

Note: `zod` is listed as an optional peer dependency of `@anthropic-ai/sdk`. It must be installed explicitly to use `zodOutputFormat()`.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── api/
│       ├── tasks/route.ts          # Existing CRUD
│       └── parse/route.ts          # NEW: Haiku structured extraction
├── components/
│   ├── InputBubble.tsx             # NEW: Fixed overlay input
│   ├── Toast.tsx                   # NEW: Confirmation toast
│   ├── TaskNode.tsx                # MODIFIED: entrance animation support
│   ├── TaskCard.tsx                # MODIFIED: fade-in entrance
│   ├── TaskSprite.tsx              # MODIFIED: glow-in entrance
│   └── HorizonScene.tsx            # MODIFIED: renders InputBubble + Toast as siblings
├── stores/
│   └── task-store.tsx              # MODIFIED: optimistic add with rollback
└── lib/
    └── parse-schema.ts             # NEW: Zod schema shared between route and client types
```

### Pattern 1: Structured Output with `output_config.format` + Zod
**What:** Use Anthropic's `output_config.format` with `json_schema` type and the SDK's `zodOutputFormat()` helper to guarantee schema-compliant JSON from Haiku.
**When to use:** Any time you need guaranteed structured data from Claude models (Haiku 4.5 supported).
**Example:**
```typescript
// Source: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const ParsedTaskSchema = z.object({
  title: z.string(),
  targetDateEarliest: z.string().nullable(),
  targetDateLatest: z.string().nullable(),
  tags: z.array(z.string()),
  needsRefinement: z.boolean(),
});

const client = new Anthropic();

const response = await client.messages.parse({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 512,
  messages: [
    {
      role: "user",
      content: `Parse this intention into a structured task: "${rawInput}"`,
    },
  ],
  system: "You are a task parser...", // Prompt engineering here
  output_config: { format: zodOutputFormat(ParsedTaskSchema) },
});

// response.parsed_output is fully typed and guaranteed valid
const parsed = response.parsed_output;
```

### Pattern 2: Optimistic Add with Rollback in Zustand
**What:** Immediately add a task to the store with a temporary ID, then replace or remove it based on the server response.
**When to use:** When the user creates a new task and you want it to appear instantly in the scene.
**Example:**
```typescript
// In task-store.tsx — new action
addTaskOptimistic: (tempTask: TaskRow) =>
  set((state) => ({ tasks: [...state.tasks, tempTask] })),

replaceTask: (tempId: string, realTask: TaskRow) =>
  set((state) => ({
    tasks: state.tasks.map((t) => (t.id === tempId ? realTask : t)),
  })),

// Usage in InputBubble.tsx
const tempId = `temp-${Date.now()}`;
const tempTask: TaskRow = {
  id: tempId,
  rawInput,
  title: parsed.title,
  // ... fields from parse result
  createdAt: new Date(),
  updatedAt: new Date(),
};

addTask(tempTask); // Appears in scene immediately

try {
  const res = await fetch("/api/tasks", { method: "POST", body: JSON.stringify(taskData) });
  const real = deserializeTask(await res.json());
  replaceTask(tempId, real); // Swap temp for real
} catch {
  removeTask(tempId); // Rollback on failure
  showError("Failed to save task");
}
```

### Pattern 3: useFrame Entrance Animation via Mount Timestamp
**What:** Track when a task first mounts using a `useRef` timestamp, then interpolate scale and opacity in `useFrame` over a short duration.
**When to use:** Animating new TaskNode components into existence without affecting existing items.
**Example:**
```typescript
// Inside TaskSprite or TaskCard
const mountTimeRef = useRef<number | null>(null);
const groupRef = useRef<THREE.Group>(null);
const invalidate = useThree((s) => s.invalidate);

useFrame(({ clock }) => {
  if (!groupRef.current) return;

  if (mountTimeRef.current === null) {
    mountTimeRef.current = clock.elapsedTime;
  }

  const elapsed = clock.elapsedTime - mountTimeRef.current;
  const duration = 0.6; // seconds
  const t = Math.min(elapsed / duration, 1);
  // Ease-out cubic
  const eased = 1 - Math.pow(1 - t, 3);

  groupRef.current.scale.setScalar(eased);
  // For sprites: material opacity = baseOpacity * eased
  // For cards: CSS opacity transition handled separately

  if (t < 1) invalidate(); // Keep rendering until animation completes
});

return <group ref={groupRef} position={position}>...</group>;
```

### Pattern 4: Z-Range Visibility Check (Not Full Frustum)
**What:** Since this scene's camera only moves along the Z axis (with minor X/Y parallax), checking if a Z position is "in view" is a simple range comparison, not a full frustum test.
**When to use:** Deciding whether to pan the camera to a newly added task.
**Example:**
```typescript
// Camera is at cameraStore.currentZ, looking toward -Z
// FOV is 60 degrees, so visible Z range depends on distance
// But simpler: check if task Z is within a reasonable band of currentZ

function isZVisible(taskZ: number, cameraZ: number, margin: number = 15): boolean {
  // Camera looks from cameraZ toward -infinity
  // Objects are visible roughly from cameraZ down to (cameraZ - visibleDepth)
  // With FOV 60 and fog, practical visible range is ~15-20 Z-units
  return taskZ <= cameraZ && taskZ >= cameraZ - margin;
}

// If NOT visible, animate camera to the task's horizon
if (!isZVisible(taskZ, cameraStore.getState().currentZ)) {
  cameraStore.setState({ targetZ: taskZ + 5, isAnimating: true });
}
```

### Pattern 5: DOM Overlay Components (InputBubble + Toast)
**What:** Render the input bubble and toast as plain DOM elements alongside the Canvas, like SnapToPresent already does. NOT inside R3F.
**When to use:** For all UI overlay elements that need standard DOM behavior (text input, keyboard events, etc.).
**Example:**
```typescript
// In HorizonScene.tsx
export default function HorizonScene() {
  return (
    <>
      <Canvas ...>
        <SceneContents />
      </Canvas>
      <SnapToPresent />
      <InputBubble />     {/* NEW — fixed bottom center */}
      <Toast />           {/* NEW — near input bubble */}
      <DebugOverlay ... />
    </>
  );
}
```

### Anti-Patterns to Avoid
- **Putting the input inside R3F/drei Html:** Input focus, keyboard events, and form submission become unreliable inside drei's Html wrapper. Use plain DOM overlay.
- **Using `tool_use` for pure data extraction:** Tool use is for agentic function-calling workflows. `output_config.format` with `json_schema` is the purpose-built feature for structured extraction.
- **Animating with React state:** Never use `useState` for frame-by-frame animation values. Mutate refs directly in `useFrame` to avoid React re-renders.
- **Using `@react-spring/three` just for entrance animations:** Adding a dependency for something achievable with 10 lines of `useFrame` code increases bundle size for no benefit.
- **Full frustum check for Z-only camera:** The camera essentially moves on one axis. A simple Z-range comparison is O(1) and more readable than constructing and testing a frustum matrix.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON schema guarantee from LLM | Retry loop with `JSON.parse()` + validation | `output_config.format` + `zodOutputFormat()` | Constrained decoding at the grammar level. Mathematically guaranteed valid JSON. Zero retries needed. |
| Zod-to-JSON-Schema conversion | Manual JSON schema definition | `zodOutputFormat()` from `@anthropic-ai/sdk/helpers/zod` | SDK handles schema transformation, unsupported constraint removal, and description injection automatically |
| cuid2 generation | `crypto.randomUUID()` for temp IDs | `createId()` from `@paralleldrive/cuid2` | Already used in schema. Temp IDs should use a different prefix pattern (`temp-${Date.now()}`) to distinguish from real IDs |
| Date parsing from Haiku output | Custom date parser | `new Date(isoString)` with null check | Haiku should output ISO 8601 strings (enforced by Zod schema description). Standard `Date` constructor handles them. |

**Key insight:** The single biggest "don't hand-roll" for this phase is JSON extraction reliability. Before structured outputs existed, teams built elaborate retry-with-fallback systems. Now `output_config.format` makes that unnecessary.

## Common Pitfalls

### Pitfall 1: API Key Leaking to Client
**What goes wrong:** Importing `@anthropic-ai/sdk` or referencing `ANTHROPIC_API_KEY` in any `'use client'` component exposes the key in the browser bundle.
**Why it happens:** Next.js bundles anything imported in client components. Environment variables without `NEXT_PUBLIC_` prefix are only available server-side, but importing the SDK itself can still ship server-only code to the client.
**How to avoid:** The `/api/parse` route handler is a server-side Route Handler (no `'use client'` directive). Keep the Anthropic client instantiation and all SDK imports strictly within `app/api/` route files. Never import the parse schema's Anthropic-specific types in client components.
**Warning signs:** Build warnings about server-only modules, `ANTHROPIC_API_KEY` appearing in browser network tab, or `@anthropic-ai/sdk` in client bundle analysis.

### Pitfall 2: Structured Output First-Request Latency
**What goes wrong:** The first request with a new schema has extra latency (~1-3s) while Anthropic compiles the grammar.
**Why it happens:** Structured outputs compile JSON schemas into constrained sampling grammars. Grammars are cached for 24 hours after first use.
**How to avoid:** Expect and handle this. The loading spinner in the input bubble absorbs this latency gracefully. Optionally, fire a warm-up request on server startup (but this is likely unnecessary for a single-user app).
**Warning signs:** First parse after deploy feels noticeably slower than subsequent ones.

### Pitfall 3: Optimistic Task Disappearing Without Feedback
**What goes wrong:** The task appears in the scene, the POST fails silently, and the task vanishes with no explanation.
**Why it happens:** The rollback removes the task but nothing tells the user why.
**How to avoid:** When `removeTask(tempId)` fires on error, also show an inline error toast: "Couldn't save task. Try again."
**Warning signs:** Users seeing tasks "flicker" into existence and disappear.

### Pitfall 4: Entrance Animation Fires on Every Re-render
**What goes wrong:** The fade-in/scale-up animation replays every time React re-renders the task list (e.g., on window resize or store update).
**Why it happens:** If the mount timestamp is stored in a state that resets, or if the component unmounts and remounts due to key changes.
**How to avoid:** Use `useRef` for the mount timestamp (persists across re-renders). The animation should only trigger when `mountTimeRef.current === null` (first mount). Consider tracking which task IDs have already animated in a Set stored outside the component.
**Warning signs:** All tasks flickering/re-animating when a new task is added.

### Pitfall 5: Stale `targetDate` Parsing from Haiku
**What goes wrong:** Haiku outputs "next Tuesday" as a specific date, but doesn't know what today's date is, producing wrong dates.
**Why it happens:** LLMs don't have access to the current date unless you provide it in the prompt.
**How to avoid:** Include today's date in the system prompt: `"Today is ${new Date().toISOString().split('T')[0]}."` This is critical for correct date extraction.
**Warning signs:** Tasks consistently placed in wrong horizons.

### Pitfall 6: Canvas Frameloop Stuck at "demand" During Animation
**What goes wrong:** The entrance animation doesn't render because the Canvas is in `frameloop="demand"` mode and nothing is calling `invalidate()`.
**Why it happens:** The `demand` frameloop only renders when `invalidate()` is called. If the animation `useFrame` callback doesn't trigger invalidation, frames won't render.
**How to avoid:** The entrance animation `useFrame` must call `invalidate()` on every frame until `t >= 1`. The existing `SceneInvalidator` handles store changes, but frame-level animation needs explicit invalidation.
**Warning signs:** New task appears but doesn't animate (snaps to final state on next interaction).

## Code Examples

### Complete `/api/parse` Route Handler
```typescript
// Source: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
// app/api/parse/route.ts
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const ParsedTaskSchema = z.object({
  title: z.string(),
  targetDateEarliest: z.string().nullable(),
  targetDateLatest: z.string().nullable(),
  tags: z.array(z.string()),
  needsRefinement: z.boolean(),
});

export type ParsedTask = z.infer<typeof ParsedTaskSchema>;

const SYSTEM_PROMPT = `You are a task parser for a personal planning app. Given a natural language intention, extract a structured task.

Today's date: {{TODAY}}

Rules:
- title: A clean, concise version of the user's intention (3-8 words)
- targetDateEarliest/targetDateLatest: ISO 8601 date strings defining a fuzzy window. Use null for both if the date is ambiguous or not mentioned.
- tags: Only tag if the category is obvious. Valid tags: work, personal, health, finance, home, social. Empty array if unclear.
- needsRefinement: true if the intention is vague or the date cannot be determined. false if clear.

Examples:
- "dentist next tuesday" -> title: "Dentist appointment", dates: next Tuesday ± 0 days, tags: ["health"], needsRefinement: false
- "figure out taxes sometime" -> title: "Figure out taxes", dates: null, tags: ["finance"], needsRefinement: true
- "buy groceries" -> title: "Buy groceries", dates: today ± 1 day, tags: ["home"], needsRefinement: false`;

export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json();

    if (!input || typeof input !== "string" || !input.trim()) {
      return Response.json(
        { error: "input is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    const response = await client.messages.parse({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SYSTEM_PROMPT.replace("{{TODAY}}", today),
      messages: [{ role: "user", content: input.trim() }],
      output_config: { format: zodOutputFormat(ParsedTaskSchema) },
    });

    if (response.stop_reason === "refusal") {
      return Response.json(
        { error: "Could not parse this input", code: "PARSE_REFUSED" },
        { status: 422 }
      );
    }

    return Response.json(response.parsed_output);
  } catch (err) {
    console.error("Parse error:", err);
    return Response.json(
      { error: "Failed to parse input", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
```

### Optimistic Add + Background Persist Flow
```typescript
// Pseudocode for InputBubble submit handler
async function handleSubmit(rawInput: string) {
  setLoading(true);

  // Step 1: Parse with Haiku
  const parseRes = await fetch("/api/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: rawInput }),
  });

  if (!parseRes.ok) {
    // Silent retry once per CONTEXT.md spec
    const retryRes = await fetch("/api/parse", { /* same */ });
    if (!retryRes.ok) {
      setError("Couldn't understand that. Try rephrasing.");
      setLoading(false);
      return;
    }
  }

  const parsed: ParsedTask = await parseRes.json();

  // Step 2: Build temp task + optimistic add
  const tempId = `temp-${Date.now()}`;
  const tempTask: TaskRow = {
    id: tempId,
    rawInput,
    title: parsed.title,
    targetDateEarliest: parsed.targetDateEarliest ? new Date(parsed.targetDateEarliest) : null,
    targetDateLatest: parsed.targetDateLatest ? new Date(parsed.targetDateLatest) : null,
    hardDeadline: null,
    needsRefinement: parsed.needsRefinement,
    refinementPrompt: null,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    driftCount: 0,
    tags: parsed.tags.length > 0 ? parsed.tags : null,
  };

  addTask(tempTask); // Optimistic — appears in scene NOW
  setLoading(false);
  clearInput();
  showToast(parsed.title, computedHorizon);

  // Step 3: Persist in background
  try {
    const saveRes = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ /* task fields for DB */ }),
    });
    const saved = deserializeTask(await saveRes.json());
    replaceTask(tempId, saved); // Swap temp for real
  } catch {
    removeTask(tempId); // Rollback
    showError("Couldn't save task. Try again.");
  }
}
```

### Differentiated Entrance Animation
```typescript
// TaskSprite entrance: emissive glow-in
function TaskSprite({ task, position }: TaskSpriteProps) {
  const mountTimeRef = useRef<number | null>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);

  useFrame(({ clock }) => {
    if (mountTimeRef.current === null) {
      mountTimeRef.current = clock.elapsedTime;
    }
    const t = Math.min((clock.elapsedTime - mountTimeRef.current) / 0.6, 1);
    const eased = 1 - Math.pow(1 - t, 3);

    if (groupRef.current) groupRef.current.scale.setScalar(eased);
    if (materialRef.current) {
      materialRef.current.opacity = SCENE_CONSTANTS.spriteOpacity * eased;
    }
    if (t < 1) invalidate();
  });

  return (
    <group ref={groupRef} position={position}>
      <Billboard>
        <mesh>
          <circleGeometry args={[radius, 32]} />
          <meshBasicMaterial ref={materialRef} color={glowColor} toneMapped={false} transparent opacity={0} />
        </mesh>
      </Billboard>
    </group>
  );
}

// TaskCard entrance: CSS opacity transition (frosted glass condensing)
function TaskCard({ task, position }: TaskCardProps) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    // Trigger CSS transition on next frame
    requestAnimationFrame(() => setEntered(true));
  }, []);

  const cardStyle: React.CSSProperties = {
    // ...existing styles...
    opacity: entered ? 1 : 0,
    transform: entered ? 'scale(1)' : 'scale(0.85)',
    transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
  };

  return (
    <group position={position}>
      <Html center distanceFactor={SCENE_CONSTANTS.htmlDistanceFactor}>
        <div style={cardStyle}>{task.title}</div>
      </Html>
    </group>
  );
}
```

### Z-Visibility Check + Camera Pan
```typescript
// Source: Custom pattern based on project's Z-axis camera architecture
import { cameraStore } from "@/stores/camera-store";
import { getZDepth } from "@/lib/horizons";
import type { Horizon } from "@/lib/horizons";

const VISIBLE_DEPTH = 15; // Z-units visible from camera position (tuned with fog)

function isHorizonVisible(horizon: Horizon): boolean {
  const { currentZ } = cameraStore.getState();
  const horizonZ = getZDepth(horizon);
  // Camera at currentZ looks toward -Z
  // Visible range: approximately [currentZ, currentZ - VISIBLE_DEPTH]
  return horizonZ <= currentZ && horizonZ >= currentZ - VISIBLE_DEPTH;
}

function panToHorizonIfNeeded(horizon: Horizon): void {
  if (!isHorizonVisible(horizon)) {
    const horizonZ = getZDepth(horizon);
    // Position camera so the horizon is centered in view
    cameraStore.setState({
      targetZ: horizonZ + VISIBLE_DEPTH / 2,
      isAnimating: true,
    });
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tool use for structured extraction | `output_config.format` with `json_schema` | Nov 2025 (GA Feb 2026) | No need for `tool_choice: "any"` hack. Direct schema guarantee. Simpler code, fewer tokens. |
| Beta header `anthropic-beta: structured-outputs-2025-11-13` | No header needed (GA) | Feb 2026 | Structured outputs moved from beta to GA. `output_config.format` replaces `output_format`. |
| `client.messages.create()` + manual JSON.parse | `client.messages.parse()` with Zod | SDK 0.78.0 | Type-safe `parsed_output` property. SDK validates against original Zod schema. |
| `@react-spring/three` for R3F animation | `useFrame` + refs (always worked, now standard) | -- | Community consensus: don't add spring dependency for simple animations. useFrame is built-in. |

**Deprecated/outdated:**
- `output_format` parameter: Replaced by `output_config.format`. Still works in transition period but will be removed.
- `anthropic-beta: structured-outputs-2025-11-13` header: No longer needed. Structured outputs are GA.
- Tool use hack for structured extraction: Was the recommended workaround before `output_config.format` existed. No longer necessary.

## Open Questions

1. **Haiku model version pinning**
   - What we know: `claude-haiku-4-5-20251001` is the current dated version. `claude-haiku-4-5` is the alias.
   - What's unclear: Whether to pin to the dated version or use the alias for automatic upgrades.
   - Recommendation: Use the alias `claude-haiku-4-5` for automatic improvements. Pin only if you observe regression.

2. **Entrance animation skip for initial load**
   - What we know: On first page load, all tasks come from SSR and mount simultaneously. They should NOT all entrance-animate.
   - What's unclear: Best mechanism to distinguish "task existed before mount" from "task was just added."
   - Recommendation: Pass an `isNew` flag through the task store (set on `addTask`, cleared after animation completes), or track a "store initialized" timestamp and skip animation for tasks present at that time.

3. **Toast accessibility**
   - What we know: The toast auto-dismisses after ~3 seconds per CONTEXT.md. No interactive elements.
   - What's unclear: Whether `role="status"` or `aria-live="polite"` is sufficient for screen readers.
   - Recommendation: Use `role="status"` with `aria-live="polite"` on the toast container. This is standard for non-critical status messages.

## Sources

### Primary (HIGH confidence)
- [Anthropic Structured Outputs Documentation](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) - Complete API reference for `output_config.format`, `strict: true`, JSON schema limitations, SDK helpers, TypeScript Zod integration
- [Anthropic SDK TypeScript package.json](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/package.json) - Version 0.78.0, zod peer dependency `^3.25.0 || ^4.0.0` (optional)
- Existing codebase files: `task-store.tsx`, `camera-store.ts`, `HorizonScene.tsx`, `TaskSprite.tsx`, `TaskCard.tsx`, `CameraRig.tsx`, `SnapToPresent.tsx`, `scene-constants.ts`, `spatial.ts`, `horizons.ts`, `schema.ts`, `types/task.ts`, `api/tasks/route.ts`

### Secondary (MEDIUM confidence)
- [React Three Fiber Basic Animations](https://r3f.docs.pmnd.rs/tutorials/basic-animations) - useFrame patterns for animation
- [React Spring R3F Guide](https://react-spring.dev/docs/guides/react-three-fiber) - @react-spring/three integration (reviewed but not recommended for this use case)
- [Three.js Frustum Documentation](https://threejs.org/docs/pages/Frustum.html) - `containsPoint()` and `setFromProjectionMatrix()` (reviewed but Z-range check is simpler for this scene)
- [Three.js Forum: Frustum Visibility](https://discourse.threejs.org/t/is-there-an-object3d-poperty-to-check-if-its-within-camera-frustum/24751) - Community patterns for frustum checks

### Tertiary (LOW confidence)
- [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing) - Haiku 4.5: $1/M input, $5/M output tokens (verify before production budgeting)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Anthropic docs confirm structured outputs GA for Haiku 4.5 with TypeScript SDK support
- Architecture: HIGH - Patterns derived from existing codebase architecture (DOM overlays, vanilla Zustand, useFrame) and verified official docs
- Pitfalls: HIGH - Derived from official documentation limitations (first-request latency, refusals, max_tokens) and codebase-specific knowledge (demand frameloop, server-only boundary)

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable -- structured outputs are GA, SDK is mature)
