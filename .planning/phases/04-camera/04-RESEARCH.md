# Phase 4: Camera - Research

**Researched:** 2026-02-27
**Domain:** Scroll-driven camera movement with momentum, boundaries, snap-to-present, and mouse parallax in R3F 9.5 / Three.js 0.170
**Confidence:** HIGH

## Summary

Phase 4 adds the signature interaction: scrolling moves the camera along the Z-axis through time horizons, with exponential-decay momentum, iOS-style spring-back at boundaries, a snap-to-present button/shortcut, and subtle mouse-driven parallax. The existing scene uses `frameloop="demand"` with `invalidate()`, so the camera system must keep calling `invalidate()` during any ongoing animation and stop when settled.

The standard approach is a dedicated Zustand vanilla store for camera state (target Z, current Z, velocity, parallax offset), read non-reactively in a `useFrame` loop via `store.getState()`. Wheel events feed the target, `useFrame` lerps the camera position toward the target each frame, and `invalidate()` is called as long as the camera is in motion. The `maath` library (already a transitive dependency via drei) provides frame-rate-independent damping functions (`damp3`) suitable for both the Z-axis movement and the parallax shift. Wheel normalization uses `normalize-wheel-es` to handle trackpad vs. mouse delta differences.

**Primary recommendation:** Create a `camera-store.ts` (Zustand vanilla store) holding target/current Z and parallax state. Create a `CameraRig` component that wires wheel events, applies `damp`-based lerp in `useFrame`, enforces boundaries with spring-back math, and calls `invalidate()` while animating. Create a `SnapToPresent` HTML overlay button. Use `maath/easing` for all interpolation.

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @react-three/fiber | 9.5.0 | `useFrame`, `useThree`, `invalidate()` | Locked in Phase 1 |
| @react-three/drei | ^10.7.7 | Transitive dep of `maath`; `Html` for UI overlays | Already installed |
| three | 0.170.0 (pinned) | `THREE.MathUtils.lerp`, `Vector3`, `FogExp2` | Pinned via overrides |
| zustand | ^5.0.11 | Camera state store (vanilla `createStore`) | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| maath | ^0.10.8 | `damp`, `damp3` — frame-rate-independent smooth damping | All camera interpolation (Z lerp, parallax shift) |
| normalize-wheel-es | ^1.2.0 | Cross-browser wheel delta normalization | Wheel event handler for scroll input |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| maath damp | Manual lerp with `THREE.MathUtils.lerp` | Works but not frame-rate-independent; maath handles delta correctly |
| normalize-wheel-es | Raw `event.deltaY` | Inconsistent across browsers/trackpad/mouse; normalization critical |
| Zustand vanilla store | React state + refs | Zustand getState() is non-reactive and avoids re-renders in useFrame |
| Custom CameraRig | drei ScrollControls | ScrollControls manages a virtual HTML scroll container — wrong model for infinite Z-axis flight |

**Installation:**
```bash
npm install maath normalize-wheel-es
```

Note: `maath` may already be available as a transitive dependency of `@react-three/drei`. Check `node_modules/maath` before installing. If present, add it as a direct dependency anyway for explicit version control.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── stores/
│   ├── task-store.tsx       # (exists) Task data
│   └── camera-store.ts     # NEW: Camera state (vanilla Zustand store)
├── components/
│   ├── HorizonScene.tsx     # (exists) Add CameraRig to scene contents
│   ├── CameraRig.tsx        # NEW: useFrame loop, wheel handler, parallax
│   ├── SnapToPresent.tsx    # NEW: HTML overlay button + Home key listener
│   ├── TaskNode.tsx         # (exists) Extend isCard with camera-distance hysteresis
│   └── DebugOverlay.tsx     # (exists) Extend with camera Z display
├── lib/
│   ├── scene-constants.ts   # (exists) Add camera constants
│   └── horizons.ts          # (exists) HORIZON_BANDS for boundary calculation
```

### Pattern 1: Vanilla Zustand Store for High-Frequency Camera State
**What:** A Zustand `createStore` (vanilla, not hook-based) holds mutable camera state: `targetZ`, `currentZ`, `velocity`, `parallaxX`, `parallaxY`, `isAnimating`. The store is read in `useFrame` via `store.getState()` and mutated via `store.setState()` — both non-reactive, never triggering React re-renders.
**When to use:** Any state that changes every frame (camera position, velocity, parallax offset).
**Why:** R3F performance pitfalls docs explicitly warn against `setState` in `useFrame`. Zustand vanilla stores avoid React's scheduler entirely.
**Confidence:** HIGH (verified via R3F pitfalls docs + Zustand docs)

```typescript
// Source: R3F pitfalls + Zustand vanilla store pattern
import { createStore } from 'zustand/vanilla';

interface CameraState {
  targetZ: number;       // Where scroll wants to go
  currentZ: number;      // Where camera actually is (lerped)
  velocity: number;      // Current scroll velocity for momentum
  parallaxX: number;     // Mouse-driven X offset
  parallaxY: number;     // Mouse-driven Y offset
  isAnimating: boolean;  // True when camera is in motion
}

interface CameraActions {
  scroll: (deltaZ: number) => void;
  snapToPresent: () => void;
  setParallax: (x: number, y: number) => void;
}

export type CameraStore = CameraState & CameraActions;

export const cameraStore = createStore<CameraStore>()((set, get) => ({
  targetZ: CAMERA_REST_Z,
  currentZ: CAMERA_REST_Z,
  velocity: 0,
  parallaxX: 0,
  parallaxY: 0,
  isAnimating: false,

  scroll: (deltaZ: number) => {
    const state = get();
    const newTarget = clampTarget(state.targetZ + deltaZ);
    set({ targetZ: newTarget, velocity: deltaZ, isAnimating: true });
  },

  snapToPresent: () => {
    set({ targetZ: CAMERA_REST_Z, isAnimating: true });
  },

  setParallax: (x: number, y: number) => {
    set({ parallaxX: x, parallaxY: y, isAnimating: true });
  },
}));
```

### Pattern 2: useFrame + invalidate() for Demand-Mode Animation
**What:** A `CameraRig` component uses `useFrame` to read camera store state, apply damped interpolation to the Three.js camera position, and call `invalidate()` if the camera has not yet settled. When delta between current and target drops below epsilon, `isAnimating` is set to `false` and `invalidate()` stops being called.
**When to use:** Any continuous animation under `frameloop="demand"`.
**Why:** The existing scene uses `frameloop="demand"` — animations must explicitly request frames. The pattern `useFrame(() => isAnimating && invalidate())` from the R3F discussion #1800 is the standard approach.
**Confidence:** HIGH (verified via R3F scaling-performance docs + discussion #1800)

```typescript
// Source: R3F scaling-performance docs + discussion #1800
function CameraRig() {
  const { camera, invalidate } = useThree();

  useFrame((state, delta) => {
    const store = cameraStore.getState();
    if (!store.isAnimating) return;

    // Damp current toward target
    const newZ = damp(store.currentZ, store.targetZ, SMOOTH_TIME, delta);

    // Apply parallax offset
    const px = damp(camera.position.x, store.parallaxX, PARALLAX_SMOOTH, delta);
    const py = damp(camera.position.y, store.parallaxY, PARALLAX_SMOOTH, delta);

    camera.position.set(px, py, newZ);

    // Check if settled
    const zSettled = Math.abs(newZ - store.targetZ) < EPSILON;
    const pxSettled = Math.abs(px - store.parallaxX) < EPSILON;

    if (zSettled && pxSettled) {
      cameraStore.setState({ currentZ: store.targetZ, isAnimating: false });
    } else {
      cameraStore.setState({ currentZ: newZ });
      invalidate(); // Request another frame
    }
  });

  return null;
}
```

### Pattern 3: Wheel Event → Store (Outside React)
**What:** Attach a native `wheel` event listener to the canvas container (or `gl.domElement`). Normalize the delta with `normalize-wheel-es`, convert to Z-units, and push into the camera store. No React event handling, no re-renders.
**When to use:** Scroll input for 3D camera.
**Why:** R3F's `onWheel` prop routes through the event system and triggers reconciliation. A native listener on the DOM element is more direct and avoids unnecessary overhead for high-frequency events.
**Confidence:** HIGH (standard DOM pattern)

```typescript
// Source: Standard DOM + normalize-wheel-es pattern
import normalizeWheel from 'normalize-wheel-es';

function CameraRig() {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const normalized = normalizeWheel(e);
      const deltaZ = normalized.pixelY * Z_UNITS_PER_PIXEL;
      cameraStore.getState().scroll(deltaZ);
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [gl]);

  // ... useFrame loop
}
```

### Pattern 4: iOS-Style Spring-Back Overscroll
**What:** When the camera target goes past a boundary (Z > 0 for near, Z < farBoundary for far), allow limited overscroll with increasing resistance, then spring back to the boundary. The resistance is achieved by applying a diminishing factor to scroll delta when past the boundary. The spring-back is achieved by setting `targetZ` to the boundary and letting the normal lerp bring it back.
**When to use:** Near boundary (Z=0) for spring-back feel. Far boundary for fog+lock.
**Why:** Specified in CONTEXT.md decisions. The near boundary should feel like iOS rubber-banding; the far boundary should feel like the camera hitting dense fog.
**Confidence:** MEDIUM (math pattern is well-established; tuning constants need experimentation)

```typescript
// Overscroll resistance: diminishing returns past boundary
function applyOverscrollResistance(targetZ: number, boundaryZ: number, maxOverscroll: number): number {
  if (targetZ <= boundaryZ) return targetZ; // Not past boundary

  const overscroll = targetZ - boundaryZ;
  // Rubber-band: asymptotic approach to maxOverscroll
  const dampedOverscroll = maxOverscroll * (1 - Math.exp(-overscroll / maxOverscroll));
  return boundaryZ + dampedOverscroll;
}

// In the useFrame loop, when not actively scrolling and past boundary:
function springBack(currentZ: number, boundaryZ: number): number | null {
  if (currentZ > boundaryZ + EPSILON) {
    return boundaryZ; // Set target to boundary, let damp handle animation
  }
  return null; // No spring-back needed
}
```

### Pattern 5: Parallax via Mouse Position
**What:** Track normalized mouse position ([-1, 1] range from center), multiply by a small parallax factor stratified by depth (near tasks shift less, far tasks shift more), and apply as an X/Y offset on the camera or on a parent group.
**When to use:** Subtle depth perception enhancement.
**Why:** Specified in CONTEXT.md. Camera-level parallax (shifting the camera position by mouse) naturally creates depth-stratified parallax because near objects shift more in screen-space than far objects.
**Confidence:** HIGH (standard 3D parallax technique)

```typescript
// Source: Standard parallax technique
// Mouse move → update parallax target in store
function onPointerMove(e: PointerEvent, container: HTMLElement) {
  const rect = container.getBoundingClientRect();
  const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;  // -1 to 1
  const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;  // -1 to 1
  cameraStore.getState().setParallax(
    nx * PARALLAX_MAX_X,
    -ny * PARALLAX_MAX_Y  // Invert Y for natural feel
  );
}

// In useFrame: damp3 camera.position.x/y toward parallax target
// The natural 3D perspective handles depth stratification automatically:
// near objects shift more in screen-space, far objects shift less.
```

**Important insight on depth stratification:** Moving the *camera* by a small X/Y amount automatically creates depth-stratified parallax due to perspective projection. Near objects (close to camera) appear to shift more on screen; far objects shift less. This is the correct approach — do NOT shift individual task positions. Just move the camera.

### Anti-Patterns to Avoid
- **setState in useFrame:** Never call React `setState` or Zustand `useStore` reactively inside `useFrame`. Use `cameraStore.getState()` and `cameraStore.setState()` (vanilla, non-reactive).
- **drei ScrollControls for this use case:** ScrollControls creates a virtual HTML scroll container and maps scroll offset to 0-1 range. This is wrong for an infinite Z-axis flight camera with momentum and custom boundaries.
- **Fixed lerp alpha without delta:** `lerp(current, target, 0.1)` runs at different speeds on 60Hz vs 120Hz monitors. Use `maath/easing damp` which accounts for frame delta.
- **Multiple invalidate() sources fighting:** The existing `SceneInvalidator` component invalidates on store changes. The CameraRig must also invalidate during animation. These should coexist without conflict — multiple `invalidate()` calls per frame just collapse into one frame request.
- **Shifting individual task positions for parallax:** Moving each task's position based on depth creates unnecessary computation and breaks the deterministic position system. Move the camera instead — perspective handles depth stratification for free.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Frame-rate-independent interpolation | Custom lerp with manual delta math | `maath/easing` `damp` / `damp3` | Handles refresh rate differences (60/120/144Hz), implements Game Programming Gems 4 ch. 1.10 smooth damping |
| Wheel event normalization | Raw `event.deltaY` clamping | `normalize-wheel-es` | Trackpad deltas differ wildly from discrete mouse wheel across browsers/OS; library handles all cases |
| Spring physics | Custom ODE solver for spring-back | Exponential resistance formula + lerp spring-back | Full spring simulation is overkill; the asymptotic rubber-band formula + damp-to-boundary achieves iOS feel with minimal code |

**Key insight:** The combination of `maath/easing damp` + `normalize-wheel-es` solves the two hardest problems (frame-rate-independent smoothing and cross-device input normalization) with battle-tested code. Everything else is straightforward state management and boundary clamping.

## Common Pitfalls

### Pitfall 1: Animation Stalls Under frameloop="demand"
**What goes wrong:** Camera stops mid-animation because no one is calling `invalidate()`.
**Why it happens:** With `frameloop="demand"`, frames only render when something calls `invalidate()`. If the camera is mid-lerp and nothing triggers another frame, the animation freezes.
**How to avoid:** In `useFrame`, always call `invalidate()` when `isAnimating` is true. Only set `isAnimating = false` when delta is below epsilon threshold. Use a generous epsilon (e.g., 0.01) to avoid floating-point precision causing infinite invalidation loops.
**Warning signs:** Camera "stutters" or "freezes" mid-scroll, especially at slow speeds near the target.

### Pitfall 2: Lerp Without Delta Produces Inconsistent Speed
**What goes wrong:** Camera moves faster on high-refresh-rate displays, slower on low-refresh-rate.
**Why it happens:** `lerp(current, target, 0.1)` applies 10% of the remaining distance per frame. At 120fps that's twice as fast as 60fps.
**How to avoid:** Use `maath/easing damp(current, target, smoothTime, delta)` which is frame-rate-independent by design. The `smoothTime` parameter is in seconds, not frames.
**Warning signs:** Animation "feels different" on different monitors, or is noticeably faster in development (high fps) than production.

### Pitfall 3: Trackpad vs. Mouse Wheel Delta Mismatch
**What goes wrong:** Trackpad scrolling moves the camera at a completely different speed than a mouse wheel.
**Why it happens:** Trackpads emit many small delta events (accelerated, pixel-based). Mouse wheels emit fewer, larger delta events (line-based or page-based). Raw `deltaY` values differ by 10-100x.
**How to avoid:** Use `normalize-wheel-es` to get consistent `pixelY` values across all input devices. Apply a single `Z_UNITS_PER_PIXEL` multiplier to the normalized value.
**Warning signs:** Camera "jumps" with mouse wheel but "crawls" with trackpad, or vice versa.

### Pitfall 4: Infinite Invalidation Loop at Boundary
**What goes wrong:** Camera never settles at boundary, causes perpetual rendering.
**Why it happens:** Floating-point precision means `currentZ` may never exactly equal `targetZ`. If epsilon is too small, the "settled" check never passes.
**How to avoid:** Use a reasonable epsilon (0.01 z-units). When settled, snap `currentZ` to exactly `targetZ` to eliminate drift. Set `isAnimating = false` at the same time.
**Warning signs:** GPU usage stays high even when nothing is happening. Debug overlay shows camera Z oscillating at the 5th+ decimal place.

### Pitfall 5: Parallax Causes Jitter on Fast Mouse Movement
**What goes wrong:** Camera X/Y shifts visibly lag behind mouse, creating a "wobbly" feel.
**Why it happens:** Parallax smoothTime is too high, or mouse events are not being processed frequently enough.
**How to avoid:** Use a short smoothTime for parallax (0.15-0.25s) compared to Z-axis (0.5-1.0s). The parallax shift is small (max ~1 unit), so damping can be fast without feeling snappy.
**Warning signs:** Camera seems to "chase" the mouse with visible delay.

### Pitfall 6: Wheel Event Passive Listener Warning
**What goes wrong:** Browser console shows warning about non-passive event listener.
**Why it happens:** Calling `e.preventDefault()` on a wheel event requires `{ passive: false }`. Many browsers default wheel listeners to passive for performance.
**How to avoid:** Explicitly set `{ passive: false }` in `addEventListener`. This is necessary to prevent the page from scrolling while the 3D camera moves.
**Warning signs:** Browser console warning about passive event listeners; page scrolls behind the canvas.

## Code Examples

### Complete Camera Store
```typescript
// Source: Zustand vanilla store pattern + R3F pitfalls docs
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

const CAMERA_REST_Z = 10;      // Default Z position (matching current Canvas camera prop)
const NEAR_BOUNDARY = 10;      // Z=10 means at the present (same as camera default)
const FAR_BOUNDARY = -110;     // Just before Someday zMax of -120
const MAX_OVERSCROLL = 3;      // Max z-units past near boundary

interface CameraState {
  targetZ: number;
  currentZ: number;
  velocity: number;
  parallaxX: number;
  parallaxY: number;
  isAnimating: boolean;
}

interface CameraActions {
  scroll: (deltaZ: number) => void;
  snapToPresent: () => void;
  setParallax: (x: number, y: number) => void;
  tick: (newZ: number, settled: boolean) => void;
}

export const cameraStore = createStore<CameraState & CameraActions>()((set, get) => ({
  targetZ: CAMERA_REST_Z,
  currentZ: CAMERA_REST_Z,
  velocity: 0,
  parallaxX: 0,
  parallaxY: 0,
  isAnimating: false,

  scroll: (deltaZ: number) => {
    const { targetZ } = get();
    let newTarget = targetZ + deltaZ;

    // Near boundary: rubber-band resistance
    if (newTarget > NEAR_BOUNDARY) {
      const overscroll = newTarget - NEAR_BOUNDARY;
      const damped = MAX_OVERSCROLL * (1 - Math.exp(-overscroll / MAX_OVERSCROLL));
      newTarget = NEAR_BOUNDARY + damped;
    }

    // Far boundary: hard stop
    if (newTarget < FAR_BOUNDARY) {
      newTarget = FAR_BOUNDARY;
    }

    set({ targetZ: newTarget, velocity: deltaZ, isAnimating: true });
  },

  snapToPresent: () => {
    set({ targetZ: CAMERA_REST_Z, isAnimating: true });
  },

  setParallax: (x: number, y: number) => {
    set({ parallaxX: x, parallaxY: y, isAnimating: true });
  },

  tick: (newZ: number, settled: boolean) => {
    if (settled) {
      set({ currentZ: get().targetZ, isAnimating: false, velocity: 0 });
    } else {
      set({ currentZ: newZ });
    }
  },
}));

// Hook for reactive reads (UI components like SnapToPresent button)
export function useCameraStore<T>(selector: (s: CameraState & CameraActions) => T): T {
  return useStore(cameraStore, selector);
}
```

### CameraRig Component
```typescript
// Source: R3F useFrame + maath easing pattern
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { damp } from 'maath/easing';
import normalizeWheel from 'normalize-wheel-es';
import { cameraStore } from '@/stores/camera-store';

const Z_UNITS_PER_PIXEL = 0.05;    // Tune: ~5-8 z-units per wheel tick
const Z_SMOOTH_TIME = 0.8;          // Seconds to approach target Z
const PARALLAX_SMOOTH_TIME = 0.2;   // Seconds for parallax response
const EPSILON = 0.01;               // Settle threshold

export function CameraRig() {
  const { camera, gl, invalidate } = useThree();
  const currentZRef = useRef(camera.position.z);
  const currentPxRef = useRef(0);
  const currentPyRef = useRef(0);

  // Wheel event handler (native, passive: false)
  useEffect(() => {
    const canvas = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { pixelY } = normalizeWheel(e);
      cameraStore.getState().scroll(-pixelY * Z_UNITS_PER_PIXEL);
      invalidate();
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [gl, invalidate]);

  // Pointer move for parallax
  useEffect(() => {
    const canvas = gl.domElement;
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      cameraStore.getState().setParallax(nx * 0.8, -ny * 0.5);
    };
    canvas.addEventListener('pointermove', onPointerMove);
    return () => canvas.removeEventListener('pointermove', onPointerMove);
  }, [gl]);

  // Frame loop
  useFrame((state, delta) => {
    const store = cameraStore.getState();
    if (!store.isAnimating) return;

    // Spring-back: if past near boundary and not actively scrolling, target the boundary
    if (store.targetZ > 10 && Math.abs(store.velocity) < 0.01) {
      cameraStore.setState({ targetZ: 10 });
    }

    // Damp Z position
    currentZRef.current = damp(currentZRef.current, store.targetZ, Z_SMOOTH_TIME, delta);

    // Damp parallax
    currentPxRef.current = damp(currentPxRef.current, store.parallaxX, PARALLAX_SMOOTH_TIME, delta);
    currentPyRef.current = damp(currentPyRef.current, store.parallaxY, PARALLAX_SMOOTH_TIME, delta);

    // Apply to camera
    camera.position.set(currentPxRef.current, currentPyRef.current, currentZRef.current);

    // Check settled
    const zSettled = Math.abs(currentZRef.current - store.targetZ) < EPSILON;
    const pxSettled = Math.abs(currentPxRef.current - store.parallaxX) < EPSILON;
    const pySettled = Math.abs(currentPyRef.current - store.parallaxY) < EPSILON;

    if (zSettled && pxSettled && pySettled) {
      cameraStore.getState().tick(store.targetZ, true);
    } else {
      cameraStore.getState().tick(currentZRef.current, false);
      invalidate();
    }
  });

  return null;
}
```

### Snap-to-Present Button
```typescript
// Source: Standard React + Zustand reactive hook for UI
import { useEffect } from 'react';
import { useCameraStore, cameraStore } from '@/stores/camera-store';
import { useThree } from '@react-three/fiber';

function SnapToPresent() {
  const isAway = useCameraStore((s) => Math.abs(s.currentZ - 10) > 1);

  // Home key shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Home') {
        cameraStore.getState().snapToPresent();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!isAway) return null;

  return (
    <button
      onClick={() => cameraStore.getState().snapToPresent()}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 100,
        // ... styling
      }}
    >
      Back to Present
    </button>
  );
}
```

### LOD Hysteresis Extension for TaskNode
```typescript
// Source: Scene-constants.ts hysteresisBuffer + camera-store
import { cameraStore } from '@/stores/camera-store';
import { SCENE_CONSTANTS } from '@/lib/scene-constants';

// In TaskNode, extend the isCard logic:
function useIsCard(task: Task, position: [number, number, number]): boolean {
  const categoricalCard = cardHorizonsSet.has(task.horizon);

  // Optional: camera-distance hysteresis
  // If task is near the card/sprite boundary, use camera distance to decide
  // hysteresisBuffer prevents rapid switching when scrolling slowly past boundary
  const cameraZ = cameraStore.getState().currentZ;
  const taskZ = position[2];
  const distanceToCamera = Math.abs(cameraZ - taskZ);

  // Tasks close enough to camera upgrade to card; far enough downgrade to sprite
  // The hysteresis buffer prevents oscillation at the boundary
  const CARD_DISTANCE_THRESHOLD = 20;
  const buffer = SCENE_CONSTANTS.hysteresisBuffer; // 3 z-units

  if (categoricalCard) {
    // Card by category — only downgrade if very far
    return distanceToCamera < CARD_DISTANCE_THRESHOLD + buffer;
  } else {
    // Sprite by category — only upgrade if very close
    return distanceToCamera < CARD_DISTANCE_THRESHOLD - buffer;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `THREE.MathUtils.lerp` in useFrame | `maath/easing damp` with delta | maath 0.5+ (2023) | Frame-rate-independent animation; no speed variation across refresh rates |
| drei `ScrollControls` for camera | Custom wheel handler + store | N/A (different use case) | ScrollControls maps scroll 0-1; not suitable for infinite Z-axis flight |
| `position.x += 0.1` per frame | `damp(current, target, smoothTime, delta)` | R3F best practice (ongoing) | Consistent behavior across 60/120/144Hz displays |
| React state for animation values | Zustand vanilla store + getState() | R3F pitfalls docs (ongoing) | Avoids re-renders; direct mutation in useFrame |

**Deprecated/outdated:**
- drei `ScrollControls` is not deprecated but is the wrong tool for this use case (it's for HTML-page-style scrolling, not 3D camera flight)
- `camera-controls` library (yomotsu/camera-controls) is powerful but adds orbit/dolly features we don't need and would conflict with our custom scroll behavior

## Open Questions

1. **maath `damp` vs `damp3` for scalar Z interpolation**
   - What we know: `damp3` operates on Vector3, `damp` operates on a single property of an object. For scalar Z-axis interpolation, `damp` on an object property or manual application of the damping formula may be cleaner than creating a Vector3 just for Z.
   - What's unclear: Whether `damp` (the scalar version) accepts the same `(current, target, smoothTime, delta)` API or requires `(current, prop, target, ...)`.
   - Recommendation: Test `damp` with a simple ref object `{ value: currentZ }` during implementation. If awkward, use `THREE.MathUtils.lerp` with a manual `1 - Math.exp(-delta / smoothTime)` factor for frame-rate independence.

2. **Exact camera rest Z position**
   - What we know: Current Canvas camera is at Z=10 (`camera={{ position: [0, 0, 10], fov: 60 }}`). Immediate tasks are at Z=0 to Z=-5. The camera at Z=10 looks 10 units "in front" of the nearest tasks.
   - What's unclear: Whether Z=10 gives optimal visual composition for the card layout, or if it should be adjusted.
   - Recommendation: Keep Z=10 as the initial value. Add it as a constant in `scene-constants.ts` for easy tuning. Mark as Claude's discretion per CONTEXT.md.

3. **LOD hysteresis complexity**
   - What we know: `TaskNode.isCard` is deliberately kept as a variable for Phase 4 extension. The `hysteresisBuffer` constant (3 z-units) is already in scene-constants.
   - What's unclear: Whether camera-distance-based LOD switching is necessary in Phase 4 or can be deferred. Scrolling through the scene will cause tasks to appear/disappear as fog changes — whether the categorical split alone is sufficient depends on visual testing.
   - Recommendation: Implement the basic categorical LOD first. Add camera-distance hysteresis only if scrolling reveals visible popping. The architecture supports it either way.

4. **Snap-to-present animation speed**
   - What we know: CONTEXT.md says "proportional to distance — snaps quickly if nearby, travels visibly if you've scrolled deep."
   - What's unclear: Whether to use a variable `smoothTime` for the snap animation or a constant speed (z-units per second).
   - Recommendation: Use a proportional smoothTime: `Math.max(0.3, Math.abs(currentZ - restZ) * 0.01)`. This gives fast snaps when close (~0.3s) and longer visible travel when deep (~1.2s from maximum depth).

## Sources

### Primary (HIGH confidence)
- [R3F Scaling Performance Docs](https://r3f.docs.pmnd.rs/advanced/scaling-performance) — frameloop="demand", invalidate() pattern
- [R3F Performance Pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls) — Zustand getState() in useFrame, delta-based animation
- [maath GitHub](https://github.com/pmndrs/maath) — damp/damp3 API, easing module
- [R3F Discussion #1800](https://github.com/pmndrs/react-three-fiber/discussions/1800) — invalidate() during animation with demand frameloop
- [MDN WheelEvent](https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event) — wheel event API, passive listener behavior
- [Three.js FogExp2 Docs](https://threejs.org/docs/pages/FogExp2.html) — fog density behavior with camera distance

### Secondary (MEDIUM confidence)
- [normalize-wheel-es npm](https://www.npmjs.com/package/normalize-wheel-es) — v1.2.0, extracted from Facebook's Fixed Data Table
- [R3F Discussion #2923](https://github.com/pmndrs/react-three-fiber/discussions/2923) — parallax effect techniques
- [Codrops 3D Product Grid](https://tympanus.net/codrops/2026/02/24/from-flat-to-spatial-creating-a-3d-product-grid-with-react-three-fiber/) — rubber-band camera boundary example
- [Zustand Discussion #2194](https://github.com/pmndrs/zustand/discussions/2194) — getState() vs useStore patterns

### Tertiary (LOW confidence)
- Spring-back math formula (exponential resistance): adapted from standard physics; specific rubber-band constants need tuning
- Parallax intensity values (0.5-1 unit): from CONTEXT.md user specification; feel validation required

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - maath and normalize-wheel-es are well-established pmndrs ecosystem tools; all other deps already installed
- Architecture: HIGH - vanilla Zustand store + useFrame + invalidate() is the documented R3F pattern for demand-mode animation
- Pitfalls: HIGH - frameloop="demand" gotchas and lerp-without-delta issues are documented in official R3F docs
- Boundaries/spring-back: MEDIUM - math is sound but specific constants (max overscroll, spring factor) require visual tuning
- Parallax: HIGH - camera-level parallax with perspective projection is a well-known 3D technique; depth stratification is automatic

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (30 days — stable domain, no expected breaking changes)
