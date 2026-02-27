# Phase 6: Task Interactions - Research

**Researched:** 2026-02-27
**Domain:** R3F click events, DOM slide-in panel, particle dissolution, optimistic mutations, auto-save
**Confidence:** HIGH

## Summary

Phase 6 adds the mutation loop: clicking task nodes opens a detail panel, from which users complete (with dissolution), drop, reschedule, or edit tasks. The implementation spans three distinct technical domains: (1) bridging R3F 3D click events to a DOM-layer slide-in panel, (2) Three.js particle burst effects for completion animation, and (3) optimistic Zustand state management with API persistence.

The codebase already has all necessary infrastructure: Zustand `updateTask`/`removeTask` actions, PATCH/DELETE API routes with allowlisted fields, `damp3` from maath for smooth position transitions, and the `getHorizon`/`getZDepth` utilities for horizon-to-Z mapping. No new libraries are required. The primary engineering challenge is the click-to-panel bridge (TaskCard uses drei Html with `pointerEvents: 'none'`; TaskSprite is a bare mesh) and the particle dissolution effect (needs a lightweight Points-based burst system inside the R3F canvas).

**Primary recommendation:** Build the TaskDetail panel as a plain DOM overlay sibling to Canvas (like SnapToPresent/InputBubble), use Zustand to bridge click state from R3F to DOM, and implement the particle burst as a standalone R3F component using THREE.Points with BufferGeometry animated via useFrame.

## Standard Stack

### Core (already installed, no new deps)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.0.11 | Store selectedTaskId + panel state, bridge R3F click to DOM | Already the app's state layer |
| three | 0.170.0 | THREE.Points + BufferGeometry for particle burst | Already pinned via overrides |
| @react-three/fiber | 9.5.0 | useFrame for particle animation, onClick on meshes | Already the rendering layer |
| @react-three/drei | 10.7.7 | Html component (TaskCard) pointer events | Already used for TaskCard |
| maath | 0.10.8 | damp3 for smooth position drift on reschedule | Already used in CameraRig |

### No New Dependencies Needed

The entire phase can be built with what's already installed. Specifically:
- **No animation library needed** -- CSS transitions + cubic-bezier for panel slide-in, useFrame for 3D animations
- **No toast library needed** -- InputBubble already implements a toast pattern; reuse it
- **No particle library needed** -- THREE.Points with ~30 particles is simpler than adding wawa-vfx (148 weekly downloads, unnecessary complexity for a single burst effect)
- **No debounce library needed** -- A 4-line `useEffect` + `setTimeout` debounce is standard React

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled Points burst | wawa-vfx | Over-engineered for one effect, adds dependency, 148 weekly npm downloads |
| CSS cubic-bezier slide-in | framer-motion | Already inline-styles-only pattern; framer-motion is 30KB for one animation |
| setTimeout debounce | use-debounce npm | Extra dependency for 4 lines of code |

## Architecture Patterns

### Recommended Component Structure

```
src/
  components/
    TaskDetail.tsx        # DOM overlay panel (sibling to Canvas, NOT inside R3F)
    TaskNode.tsx          # Updated: adds onClick handler, passes to TaskCard/TaskSprite
    TaskCard.tsx          # Updated: pointerEvents 'auto', onClick bubbles to DOM
    TaskSprite.tsx        # Updated: onClick on mesh, triggers store
    CompletionBurst.tsx   # R3F component: Points particle burst at task position
    UndoToast.tsx         # DOM overlay toast for completion undo
  stores/
    task-store.tsx        # Updated: add selectedTaskId, selectTask, clearSelection
  lib/
    horizon-dates.ts     # Maps horizon name -> target date range (for reschedule)
```

### Pattern 1: Click Bridge (R3F -> DOM via Zustand)

**What:** Task clicks happen in R3F (mesh onClick / Html DOM onClick). The selected task ID is stored in Zustand. A DOM overlay component (TaskDetail) subscribes to selectedTaskId and renders the panel.

**When to use:** Always. This is the established pattern in the codebase (InputBubble, SnapToPresent, DebugOverlay are all DOM siblings to Canvas that read Zustand state).

**Example:**
```typescript
// In task-store.tsx -- add to TaskState
interface TaskState {
  tasks: TaskRow[];
  newTaskIds: Set<string>;
  selectedTaskId: string | null;  // NEW
}

interface TaskActions {
  // ... existing actions ...
  selectTask: (id: string) => void;  // NEW
  clearSelection: () => void;        // NEW
}

// In TaskSprite -- add onClick to mesh
<mesh onClick={(e) => {
  e.stopPropagation();
  store?.getState().selectTask(task.id);
}}>
  <circleGeometry args={[radius, 32]} />
  <meshBasicMaterial ... />
</mesh>

// In TaskCard -- change pointerEvents to 'auto', add onClick to the div
<Html center distanceFactor={SCENE_CONSTANTS.htmlDistanceFactor}
      style={{ pointerEvents: 'auto' }}>
  <div style={cardStyle} onClick={() => store?.getState().selectTask(task.id)}>
    {task.title}
  </div>
</Html>

// TaskDetail.tsx -- DOM overlay sibling to Canvas
function TaskDetail() {
  const selectedTaskId = useTaskStore(s => s.selectedTaskId);
  const task = useTaskStore(s => s.tasks.find(t => t.id === selectedTaskId));
  if (!task) return null;
  // render slide-in panel
}
```

### Pattern 2: DOM Overlay Panel (inline styles, same as existing overlays)

**What:** TaskDetail is a fixed-position DOM element rendered as a sibling to Canvas, using inline styles (not Tailwind), consistent with SnapToPresent, InputBubble, and all drei Html components in the codebase.

**When to use:** Always for this codebase. The project uses inline styles for all overlay components.

**Key styling decisions:**
- `position: fixed; right: 0; top: 0; height: 100vh; width: 480px`
- Background: `rgba(10, 10, 15, 0.92)` with `backdropFilter: blur(16px)` (matches space theme)
- z-index: 120 (above InputBubble at 110, SnapToPresent at 100)
- Slide-in: CSS transition with `transform: translateX(0)` / `translateX(100%)`
- Spring overshoot: `cubic-bezier(0.34, 1.56, 0.64, 1)` for ~200ms

**Example:**
```typescript
const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  right: 0,
  width: 480,
  maxWidth: '100vw',
  height: '100vh',
  background: 'rgba(10, 10, 15, 0.92)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderLeft: '1px solid rgba(148, 163, 184, 0.15)',
  zIndex: 120,
  transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
  transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
  display: 'flex',
  flexDirection: 'column',
  color: '#e2e8f0',
  fontFamily: 'monospace',
};
```

### Pattern 3: Particle Burst with THREE.Points

**What:** A self-contained R3F component that spawns ~20-30 particles at a task's 3D position, animates them outward with velocity + gravity + opacity fade, then self-removes.

**When to use:** Completion animation only. Drop has no particles.

**Example:**
```typescript
// CompletionBurst.tsx -- rendered inside Canvas
function CompletionBurst({ position, onComplete }: {
  position: [number, number, number];
  onComplete: () => void;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const startTime = useRef(performance.now());

  // Initialize particle positions/velocities once
  const { positions, velocities, colors } = useMemo(() => {
    const count = 24;
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Start at origin
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;
      // Random outward velocity (spherical burst)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 1.5 + Math.random() * 2;
      vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      vel[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      vel[i * 3 + 2] = Math.cos(phi) * speed;
      // White-to-gold gradient
      const gold = Math.random();
      col[i * 3] = 1;
      col[i * 3 + 1] = 0.85 + gold * 0.15;
      col[i * 3 + 2] = 0.4 + (1 - gold) * 0.6;
    }
    return { positions: pos, velocities: vel, colors: col };
  }, []);

  useFrame((_state, delta) => {
    if (!pointsRef.current) return;
    const elapsed = (performance.now() - startTime.current) / 1000;
    const duration = 0.8;
    if (elapsed > duration) {
      onComplete();
      return;
    }
    const posAttr = pointsRef.current.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < arr.length / 3; i++) {
      arr[i * 3] += velocities[i * 3] * delta;
      arr[i * 3 + 1] += velocities[i * 3 + 1] * delta;
      arr[i * 3 + 2] += velocities[i * 3 + 2] * delta;
    }
    posAttr.needsUpdate = true;
    // Fade opacity
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.opacity = 1 - (elapsed / duration);
    invalidate();
  });

  return (
    <points ref={pointsRef} position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        transparent
        toneMapped={false}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
```

### Pattern 4: Optimistic Update with Undo

**What:** Complete action: (1) start dissolution animation, (2) optimistically update store (set status to 'completed'), (3) show undo toast for 4 seconds, (4) after timeout expires, fire PATCH to server. If user clicks undo during timeout, revert store state and cancel the server call.

**When to use:** Complete action only. Drop action is immediate with no undo.

**Example:**
```typescript
const handleComplete = useCallback((taskId: string) => {
  // Snapshot for potential revert
  const prevTask = store.getState().tasks.find(t => t.id === taskId);
  if (!prevTask) return;

  // Optimistic: remove from visible tasks
  store.getState().removeTask(taskId);

  // Set up undo window
  const timeoutId = setTimeout(() => {
    // Persist to server after undo window expires
    fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    }).catch(() => {
      // Revert on server failure
      store.getState().addTask(prevTask);
    });
  }, 4000);

  // Return undo function
  return () => {
    clearTimeout(timeoutId);
    store.getState().addTask(prevTask);
  };
}, [store]);
```

### Pattern 5: Horizon Band Selector -> Target Date Conversion

**What:** When rescheduling, user picks a horizon name (e.g., "This Week"). We need to convert this back to targetDateEarliest/Latest values since horizon is computed client-side from dates.

**When to use:** Reschedule action.

**Date mapping logic:**
```typescript
// horizon-dates.ts
import type { Horizon } from '@/lib/horizons';

export function horizonToDateRange(horizon: Horizon): {
  earliest: Date;
  latest: Date;
} {
  const now = new Date();
  const addDays = (d: Date, n: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  };

  switch (horizon) {
    case 'immediate':
      return { earliest: now, latest: addDays(now, 1) };
    case 'this-week':
      return { earliest: addDays(now, 1), latest: addDays(now, 7) };
    case 'this-month':
      return { earliest: addDays(now, 7), latest: addDays(now, 30) };
    case 'this-quarter':
      return { earliest: addDays(now, 30), latest: addDays(now, 90) };
    case 'this-year':
      return { earliest: addDays(now, 90), latest: addDays(now, 365) };
    case 'someday':
      return { earliest: addDays(now, 365), latest: addDays(now, 730) };
  }
}
```

### Pattern 6: Auto-Save with Debounce on Blur

**What:** Title and details fields use local state, debounce changes with setTimeout, and fire PATCH on blur or after 1s idle.

**When to use:** Inline editing of title/details fields.

**Example:**
```typescript
const [localTitle, setLocalTitle] = useState(task.title);
const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

const saveTitle = useCallback((value: string) => {
  store.getState().updateTask(task.id, { title: value });
  fetch(`/api/tasks/${task.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: value }),
  });
}, [task.id, store]);

const handleTitleChange = (value: string) => {
  setLocalTitle(value);
  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  saveTimerRef.current = setTimeout(() => saveTitle(value), 1000);
};

const handleTitleBlur = () => {
  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  if (localTitle !== task.title) saveTitle(localTitle);
};
```

### Anti-Patterns to Avoid

- **Rendering TaskDetail inside Canvas:** It is a 2D DOM overlay. Render as sibling to Canvas (like SnapToPresent), NOT inside R3F or drei Html.
- **Using Tailwind in the panel:** All overlays in this codebase use inline styles for consistency (drei Html renders outside normal DOM). TaskDetail should follow the same pattern.
- **Animating React state on every frame for particles:** Use refs + useFrame + BufferGeometry attribute mutation, NOT useState. Re-renders kill particle performance.
- **Using react-spring for the panel slide-in:** It adds a dependency and complexity. A CSS transition with cubic-bezier achieves the spring overshoot effect with zero JS.
- **Making the panel a route/page:** The panel is an overlay. No navigation. No URL change.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Z-position from horizon | Manual Z calculation | `getZDepth(horizon)` from `@/lib/horizons` | Already exists, battle-tested |
| Smooth 3D position drift | Manual lerp in useFrame | `damp3` from `maath/easing` | Already used in CameraRig, smooth damping |
| Task position from ID+horizon | Custom spatial math | `getTaskPosition(id, horizon)` from `@/lib/spatial` | Deterministic, already handles spread |
| Horizon from date | Manual day-count thresholds | `getHorizon(dateRange, now)` from `@/lib/horizons` | Already covers all boundary conditions |
| Date deserialization | Manual Date parsing | `deserializeTask()` from task-store | Already handles all date fields |
| Toast notification | Custom notification system | Copy InputBubble toast pattern | Same visual language, proven approach |

**Key insight:** The codebase already has all the spatial math, horizon computation, and date handling. Phase 6 wires up interactions; it does NOT need new math or data utilities beyond the horizon-to-date-range conversion for reschedule.

## Common Pitfalls

### Pitfall 1: TaskCard pointerEvents Conflict

**What goes wrong:** TaskCard currently has `style={{ pointerEvents: 'none' }}` on the Html component. Changing this to `'auto'` will cause the Html overlay to intercept mouse wheel events, breaking camera scroll when hovering over cards.
**Why it happens:** drei Html renders a DOM div overlaid on the canvas. `pointerEvents: 'auto'` captures ALL pointer events including wheel.
**How to avoid:** Set `pointerEvents: 'auto'` only on the inner clickable div, NOT on the Html wrapper. Keep the Html `style={{ pointerEvents: 'none' }}` and set `pointerEvents: 'auto'` on the child div. This allows click-through for scroll while enabling click on the card content.
**Warning signs:** Scrolling stops working when hovering over task cards.

### Pitfall 2: frameloop="demand" and Click Animation

**What goes wrong:** With `frameloop="demand"`, onClick fires but no re-render happens unless `invalidate()` is called. Particle animation won't start.
**Why it happens:** R3F demand mode only renders when explicitly requested.
**How to avoid:** Call `invalidate()` immediately in onClick handlers and in every useFrame callback that has pending animation. The SceneInvalidator already handles Zustand store changes, but particle animation needs its own invalidate calls within useFrame.
**Warning signs:** Click registers but nothing visually happens.

### Pitfall 3: Stale Closure in Undo Timer

**What goes wrong:** The undo callback captures a stale reference to the task state, so reverting doesn't work correctly if other tasks were modified during the undo window.
**Why it happens:** JavaScript closures capture values at creation time.
**How to avoid:** Snapshot the specific task (deep copy) at the moment of completion, not a reference to the store state. Use that snapshot for revert. For the undo callback, store the snapshot as a ref or pass it directly.
**Warning signs:** Undoing a completion restores wrong data or crashes.

### Pitfall 4: Panel z-index Stacking with Existing Overlays

**What goes wrong:** TaskDetail panel overlaps with InputBubble (z-index 110) or SnapToPresent (z-index 100), causing interaction conflicts.
**Why it happens:** Multiple fixed-position overlays competing for z-index space.
**How to avoid:** TaskDetail at z-index 120. Optionally dim/hide InputBubble and SnapToPresent while panel is open (Claude's discretion). Backdrop click area needs its own layer between the Canvas and the panel.
**Warning signs:** Can't click the close button, or clicks on the panel interact with elements behind it.

### Pitfall 5: Reschedule Position Not Updating Smoothly

**What goes wrong:** After rescheduling, the task jumps to its new position instead of drifting smoothly.
**Why it happens:** `getTaskPosition()` is deterministic from `(taskId, horizon)`. When horizon changes, position changes instantly on next render.
**How to avoid:** Store the previous position and use `damp3` in useFrame to animate from old position to new. This requires the TaskNode/TaskSprite to track their "current animated position" separately from their "target position".
**Warning signs:** Tasks teleport on reschedule instead of floating to their new position.

### Pitfall 6: Auto-save Firing on Mount

**What goes wrong:** Debounced auto-save fires immediately when the panel opens because useEffect runs on mount with the initial value.
**Why it happens:** The debounce effect triggers whenever localTitle changes, including the initial set.
**How to avoid:** Track whether the value has been "dirtied" by user input with a ref flag. Only save when the user has actually modified the value.
**Warning signs:** Opening the panel triggers a PATCH request with unchanged data.

### Pitfall 7: Particle Burst Position Mismatch

**What goes wrong:** Particle burst appears at the wrong location because it uses the task's logical position, but the task may have been animating (entrance, reschedule drift).
**Why it happens:** `getTaskPosition()` returns the target position, not the current animated position.
**How to avoid:** Pass the actual current position (from the group ref's world position) to the CompletionBurst, not the computed target position.
**Warning signs:** Particles spawn far from the visible task node.

## Code Examples

### Horizon Band Selector UI

```typescript
const HORIZON_OPTIONS: { value: Horizon; label: string }[] = [
  { value: 'immediate', label: 'Now' },
  { value: 'this-week', label: 'This Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'this-quarter', label: 'This Quarter' },
  { value: 'this-year', label: 'This Year' },
  { value: 'someday', label: 'Someday' },
];

// Render as row of buttons, highlight current horizon
{HORIZON_OPTIONS.map(opt => (
  <button
    key={opt.value}
    type="button"
    style={{
      padding: '6px 12px',
      borderRadius: 12,
      border: '1px solid',
      borderColor: opt.value === currentHorizon
        ? 'rgba(148, 163, 184, 0.5)'
        : 'rgba(148, 163, 184, 0.15)',
      background: opt.value === currentHorizon
        ? 'rgba(148, 163, 184, 0.15)'
        : 'transparent',
      color: opt.value === currentHorizon ? '#e2e8f0' : '#64748b',
      fontSize: 12,
      fontFamily: 'monospace',
      cursor: 'pointer',
    }}
    onClick={() => handleReschedule(opt.value)}
  >
    {opt.label}
  </button>
))}
```

### Drop Action (Abrupt Removal, No Ceremony)

```typescript
const handleDrop = useCallback((taskId: string) => {
  // Immediately remove from store (no undo)
  store.getState().removeTask(taskId);

  // Fire DELETE to server (fire and forget)
  fetch(`/api/tasks/${taskId}`, { method: 'DELETE' }).catch(() => {
    // Silent failure -- task is already gone from UI
    // Could show error toast, but drop is intentionally no-ceremony
  });
}, [store]);
```

Note: Drop uses DELETE (not PATCH to status 'dropped'). The decision per the DB schema is that `status: 'dropped'` exists, so we should PATCH status to 'dropped' rather than DELETE, preserving the data. Either works; PATCH preserves history.

### Reschedule with Optimistic Update

```typescript
const handleReschedule = useCallback((newHorizon: Horizon) => {
  const { earliest, latest } = horizonToDateRange(newHorizon);

  // Optimistic: update store immediately
  store.getState().updateTask(task.id, {
    targetDateEarliest: earliest,
    targetDateLatest: latest,
  });

  // Close panel so user sees the drift
  store.getState().clearSelection();

  // Persist to server
  fetch(`/api/tasks/${task.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetDateEarliest: earliest.toISOString(),
      targetDateLatest: latest.toISOString(),
    }),
  }).catch(() => {
    // Revert on failure
    store.getState().updateTask(task.id, {
      targetDateEarliest: task.targetDateEarliest,
      targetDateLatest: task.targetDateLatest,
    });
  });
}, [task, store]);
```

### Smooth Position Drift for Reschedule

```typescript
// In TaskNode or a wrapper -- animate position with damp3
function AnimatedTaskNode({ task, targetPosition }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const invalidate = useThree(s => s.invalidate);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    const pos = groupRef.current.position;
    const target = new THREE.Vector3(...targetPosition);
    const before = pos.distanceTo(target);
    damp3(pos, targetPosition, 0.25, delta);
    const after = pos.distanceTo(target);
    if (after > 0.01) invalidate();
  });

  return (
    <group ref={groupRef} position={targetPosition}>
      {/* TaskCard or TaskSprite */}
    </group>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-spring for R3F animations | damp3/useFrame for per-frame, CSS transitions for DOM | 2024+ | Simpler, fewer deps, better demand-mode compat |
| External toast library (react-hot-toast) | Hand-rolled toast component | Project convention | Consistent inline-style pattern, no extra dep |
| useOptimistic (React 19) | Zustand store snapshot + revert | Current for global state | useOptimistic is for component-local; Zustand is already the global layer |

**Deprecated/outdated:**
- drei Html `occlude` prop can cause issues with event handling in newer versions; avoid using it for clickable Html elements.

## Open Questions

1. **Scene interaction while panel open (Claude's Discretion)**
   - What we know: The 3D scene renders behind the panel. User can scroll/interact with the visible portion.
   - Recommendation: Keep scene interactive (don't lock/dim). The panel only covers ~480px on the right, leaving most of the scene visible. Dimming adds complexity (overlay div, click handler for dismiss). A subtle backdrop with `pointerEvents: 'auto'` for the dismiss-on-click behavior is sufficient.

2. **Drop action: PATCH status vs DELETE**
   - What we know: DB schema has `status: 'dropped'`. DELETE route exists. Both work.
   - Recommendation: Use PATCH `{ status: 'dropped' }` to preserve task history. Filter `status: 'active'` in the GET query. This matches the existing status enum and allows potential future "undo drop" or analytics features.
   - **Important:** This requires updating the GET /api/tasks route to filter by `status = 'active'` (currently returns all tasks).

3. **Camera auto-pan after reschedule (Claude's Discretion)**
   - What we know: InputBubble already has a camera pan pattern after task creation.
   - Recommendation: Yes, auto-pan to the rescheduled task's new horizon using the same `cameraStore.setState({ targetZ, ... })` pattern from InputBubble. Skip pan for 'someday' (same rationale as InputBubble).

4. **Drop visual treatment (Claude's Discretion)**
   - What we know: Must be emotionally distinct from complete. No ceremony. Clinical, not punishing.
   - Recommendation: Instant scale-to-zero + opacity fade over ~200ms. No particles. The task simply shrinks to nothing and is gone. This contrasts sharply with the celebratory particle burst of completion.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `task-store.tsx`, `TaskCard.tsx`, `TaskSprite.tsx`, `TaskNode.tsx`, `HorizonScene.tsx`, `CameraRig.tsx`, `InputBubble.tsx`, `SnapToPresent.tsx`, API routes, DB schema -- all read directly
- [R3F Events API](https://r3f.docs.pmnd.rs/api/events) -- event object structure, stopPropagation, onPointerMissed, delta property
- [R3F Scaling Performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance) -- invalidate() with demand frameloop and onClick
- [R3F Events Tutorial](https://r3f.docs.pmnd.rs/tutorials/events-and-interaction) -- onClick on mesh, pointer events

### Secondary (MEDIUM confidence)
- [Three.js BufferGeometry Points](https://threejs.org/examples/webgl_buffergeometry_points.html) -- particle system with BufferGeometry
- [CSS cubic-bezier overshoot](https://www.joshwcomeau.com/animation/linear-timing-function/) -- spring easing with cubic-bezier
- [Drei Html pointer events issue #460](https://github.com/pmndrs/drei/issues/460) -- pointerEvents: auto on Html breaks scroll
- [Drei Html mouse events issue #979](https://github.com/pmndrs/drei/issues/979) -- HTML mouse events passthrough

### Tertiary (LOW confidence)
- [wawa-vfx](https://github.com/wass08/wawa-vfx) -- evaluated and rejected (unnecessary complexity for this use case)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- entirely existing dependencies, patterns verified in codebase
- Architecture: HIGH -- follows established codebase patterns (DOM overlays, Zustand bridge, inline styles)
- Click handling: HIGH -- R3F event API well-documented, drei Html pointer event gotcha verified in issues
- Particle burst: MEDIUM -- THREE.Points approach is standard Three.js, but the specific R3F integration with demand frameloop needs careful invalidate() handling
- Optimistic updates: HIGH -- pattern follows existing InputBubble approach, store already has updateTask/removeTask
- Auto-save debounce: HIGH -- standard React pattern, no library needed
- Pitfalls: HIGH -- identified from codebase analysis and known R3F/drei issues

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable stack, no moving parts)
