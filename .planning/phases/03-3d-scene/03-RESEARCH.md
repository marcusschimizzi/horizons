# Phase 3: 3D Scene - Research

**Researched:** 2026-02-27
**Domain:** React Three Fiber scene composition (R3F 9.5, drei, postprocessing, Three.js 0.170)
**Confidence:** HIGH

## Summary

Phase 3 replaces the HorizonScene.tsx stub with a full 3D scene containing fog, lighting, star field, bloom post-processing, HTML-based task cards (near horizons), emissive billboard sprites (far horizons), and an LOD controller. The stack is locked: R3F 9.5.0, drei, @react-three/postprocessing 3.0.4, three@0.170.0 pinned.

The standard approach uses R3F's declarative JSX for scene setup (fog, background color, lighting), drei's `<Html>` component for CSS-based task cards, drei's `<Billboard>` for always-face-camera sprite meshes, `<EffectComposer>` + `<Bloom>` from @react-three/postprocessing for glow effects, and `frameloop="demand"` with Zustand subscription-based `invalidate()` for performance.

**Primary recommendation:** Build four components (HorizonScene, TaskCard, TaskSprite, TaskNode) following R3F declarative patterns. Use drei Stars with `speed={0}` for static star field. Use `fogExp2` with `attach="fog"` for exponential fog. Use `<Bloom mipmapBlur luminanceThreshold={1}>` for selective bloom on emissive sprites only. Wire Zustand store changes to `invalidate()` via `useEffect` + `subscribe()`.

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @react-three/fiber | 9.5.0 | React renderer for Three.js | Locked in Phase 1 |
| @react-three/drei | ^10.7.7 | R3F helpers (Html, Billboard, Stars) | Blessed companion library |
| @react-three/postprocessing | ^3.0.4 | Bloom, EffectComposer | R3F-native postprocessing wrapper |
| three | 0.170.0 (pinned) | 3D engine | Pinned via npm overrides |
| zustand | ^5.0.11 | State management | Already wired in Phase 2 |

### Key drei Components Used
| Component | Import | Purpose |
|-----------|--------|---------|
| `Html` | `@react-three/drei` | CSS overlay cards positioned in 3D space |
| `Billboard` | `@react-three/drei` | Group that always faces camera (for sprites) |
| `Stars` | `@react-three/drei` | Shader-based star field background |

### Key postprocessing Components
| Component | Import | Purpose |
|-----------|--------|---------|
| `EffectComposer` | `@react-three/postprocessing` | Wraps post-processing effects |
| `Bloom` | `@react-three/postprocessing` | Glow effect on emissive materials |

**No new packages needed.** Everything is already in package.json.

## Architecture Patterns

### Recommended Component Structure
```
src/components/
  HorizonScene.tsx     # Canvas internals: fog, lights, stars, bloom, renders TaskNodes
  TaskNode.tsx         # LOD controller: picks Card vs Sprite per task
  TaskCard.tsx         # drei Html card (CSS) for near-horizon tasks
  TaskSprite.tsx       # Billboard mesh with emissive material for far-horizon tasks
  SceneLoader.tsx      # (exists) dynamic(ssr:false) wrapper
src/lib/
  scene-constants.ts   # Tunable constants: fog density, bloom params, LOD thresholds
```

### Pattern 1: Declarative Scene Setup in R3F
**What:** R3F maps Three.js constructors to JSX elements. `<fogExp2>` becomes `new THREE.FogExp2()`, `<color>` becomes `new THREE.Color()`. The `attach` prop binds the instance to a parent property.
**When to use:** Scene-level setup (fog, background, lights).
**Confidence:** HIGH (verified via R3F docs and drei discussion #2270)

```tsx
// Source: https://r3f.docs.pmnd.rs/advanced/scaling-performance + discussions
export default function HorizonScene() {
  return (
    <Canvas frameloop="demand">
      {/* Scene background color */}
      <color attach="background" args={['#0a0a0f']} />

      {/* Exponential fog: args=[color, density] */}
      <fogExp2 attach="fog" args={['#0a0a0f', 0.015]} />

      {/* Lighting */}
      <ambientLight intensity={0.15} />

      {/* Star field */}
      <Stars radius={200} depth={100} count={300} factor={2} saturation={0} speed={0} />

      {/* Post-processing */}
      <EffectComposer>
        <Bloom mipmapBlur luminanceThreshold={1} intensity={1.5} />
      </EffectComposer>

      {/* Task nodes */}
      {tasks.map(task => <TaskNode key={task.id} task={task} />)}
    </Canvas>
  );
}
```

### Pattern 2: Zustand Subscription + invalidate() for frameloop="demand"
**What:** With `frameloop="demand"`, R3F only renders when props change or `invalidate()` is called. External state changes (Zustand store updates) must manually call `invalidate()`.
**When to use:** Any component that reads Zustand state inside the Canvas.
**Confidence:** HIGH (verified via R3F scaling-performance docs)

```tsx
// Source: https://r3f.docs.pmnd.rs/advanced/scaling-performance
import { useThree } from '@react-three/fiber';

function SceneInvalidator() {
  const invalidate = useThree((state) => state.invalidate);
  const store = useContext(TaskStoreContext);

  useEffect(() => {
    if (!store) return;
    // Subscribe to ALL store changes, call invalidate on any change
    const unsub = store.subscribe(() => invalidate());
    return unsub;
  }, [store, invalidate]);

  return null;
}
```

### Pattern 3: drei Html for CSS Cards in 3D Space
**What:** `<Html>` renders DOM elements positioned at a 3D point. Uses CSS, not WebGL. Supports `distanceFactor` for distance-based scaling, `center` for centering, and `transform` for CSS 3D transforms.
**When to use:** TaskCard -- HTML/CSS content overlaid on 3D positions.
**Confidence:** HIGH (verified via drei docs: https://drei.docs.pmnd.rs/misc/html)

```tsx
// Source: https://drei.docs.pmnd.rs/misc/html
import { Html } from '@react-three/drei';

function TaskCard({ task, position }: { task: Task; position: [number, number, number] }) {
  return (
    <group position={position}>
      <Html center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div className="task-card">
          <span className="task-title">{task.title}</span>
        </div>
      </Html>
    </group>
  );
}
```

### Pattern 4: Billboard + Emissive Material for Glowing Sprites
**What:** `<Billboard>` wraps geometry in a group that always faces the camera. Paired with `<meshBasicMaterial>` using emissive-like color values above 1.0 (with `toneMapped={false}`) to trigger selective bloom.
**When to use:** TaskSprite -- distant tasks rendered as colored glowing circles.
**Confidence:** HIGH (verified via drei Billboard docs + postprocessing bloom docs)

```tsx
// Source: https://drei.docs.pmnd.rs/abstractions/billboard + bloom docs
import { Billboard } from '@react-three/drei';

function TaskSprite({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <Billboard position={position}>
      <mesh>
        <circleGeometry args={[0.3, 32]} />
        <meshBasicMaterial
          color={color}
          toneMapped={false}  // CRITICAL: allows color values > 1 for bloom
          transparent
          opacity={0.9}
        />
      </mesh>
    </Billboard>
  );
}
```

**Important:** For bloom to work on `meshBasicMaterial`, set the color to values that exceed the 0-1 range by using a `THREE.Color` with multiplied components, or use `meshStandardMaterial` with `emissive` + `emissiveIntensity > 1`. The `toneMapped={false}` is mandatory.

### Pattern 5: Selective Bloom via luminanceThreshold
**What:** Bloom with `luminanceThreshold={1}` means nothing glows by default. Only materials with `toneMapped={false}` and color values > 1.0 trigger bloom. This makes sprites glow without blooming the entire scene.
**When to use:** Post-processing setup in HorizonScene.
**Confidence:** HIGH (verified via https://react-postprocessing.docs.pmnd.rs/effects/bloom)

```tsx
import { EffectComposer, Bloom } from '@react-three/postprocessing';

// Inside Canvas:
<EffectComposer>
  <Bloom
    mipmapBlur
    luminanceThreshold={1}
    luminanceSmoothing={0.025}
    intensity={1.5}
  />
</EffectComposer>
```

### Anti-Patterns to Avoid
- **Using `<sprite>` + `<spriteMaterial>` for task sprites:** SpriteMaterial cannot be easily controlled for bloom selectivity. Use `<Billboard>` + `<mesh>` + `<meshBasicMaterial toneMapped={false}>` instead.
- **Setting fog on the Canvas prop:** Fog must be declared as a child element with `attach="fog"`, not as a Canvas prop. `<fogExp2 attach="fog" args={[color, density]} />`.
- **Using drei Stars with default `speed={1}`:** Stars would continuously animate, requiring `frameloop="always"` or constant `invalidate()`. Set `speed={0}` for static stars as specified in the design.
- **Using `<Billboard>` component on all nodes including Html cards:** The Html component handles its own DOM positioning. Wrapping it in Billboard is unnecessary and hurts performance.
- **Forgetting `toneMapped={false}` on sprite materials:** Without this, bloom will not work. Colors get clamped to 0-1 range, never exceeding the luminance threshold.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Always-face-camera behavior | Manual quaternion lookAt in useFrame | drei `<Billboard>` | Handles all rotation math, tested |
| HTML overlay in 3D space | Manual CSS positioning with project() | drei `<Html>` | Handles projection, scaling, z-index |
| Star field background | Manual BufferGeometry + Points | drei `<Stars speed={0}>` | Shader-based, configurable, zero effort |
| Post-processing pipeline | Manual EffectComposer from three/examples | `@react-three/postprocessing` | Declarative, handles effect merging |
| On-demand re-rendering | Manual requestAnimationFrame loop | R3F `frameloop="demand"` + `invalidate()` | Built-in, handles batching |

**Key insight:** drei and @react-three/postprocessing exist to prevent hand-rolling Three.js boilerplate. Every pattern in this phase has a drei/postprocessing equivalent.

## Common Pitfalls

### Pitfall 1: Fog Does Not Affect drei Html Components
**What goes wrong:** Html cards (TaskCard) are CSS overlays, not WebGL meshes. Three.js `fogExp2` only affects materials in the WebGL pipeline. Cards at any distance look equally bright.
**Why it happens:** `<Html>` renders to a separate DOM layer, not the WebGL canvas.
**How to avoid:** This is actually correct for the design. Cards are only rendered for Immediate + This Week horizons (near tasks, z=0 to z=-15). Fog is intended for distant sprites. No workaround needed since cards are always near. If fog-like dimming were ever needed on cards, use inline CSS opacity based on z-position.
**Warning signs:** Cards at z=-15 looking identical to cards at z=0.

### Pitfall 2: Bloom Blooms Everything Without luminanceThreshold
**What goes wrong:** Default bloom settings make the entire scene glow, including the background, stars, and cards.
**Why it happens:** Default `luminanceThreshold` is too low (0.9), and materials without `toneMapped={false}` can still trigger bloom at bright spots.
**How to avoid:** Always set `luminanceThreshold={1}`. Only materials with `toneMapped={false}` and color values > 1.0 will bloom. All other scene elements remain unaffected.
**Warning signs:** White haze over the entire scene, star field glowing excessively.

### Pitfall 3: Stars Component Causes Continuous Rendering
**What goes wrong:** The drei `<Stars>` component has `speed={1}` by default, which drives a continuous shader animation. This conflicts with `frameloop="demand"` -- either stars don't animate (single frame) or you must switch to `frameloop="always"`.
**Why it happens:** Stars uses a time-based shader uniform for twinkling.
**How to avoid:** Set `speed={0}` for static stars. The design explicitly calls for "sparse and static" stars. This eliminates the continuous rendering conflict entirely.
**Warning signs:** High GPU usage on idle, or stars frozen mid-twinkle.

### Pitfall 4: Fog Color Must Match Background Color
**What goes wrong:** Objects fade to the fog color at distance. If fog color differs from the scene background color, distant objects fade to a visible colored band instead of disappearing into darkness.
**Why it happens:** FogExp2's `color` parameter defines what distant fragments blend toward.
**How to avoid:** Set fog color identical to background color: both `#0a0a0f`. Use the same hex value in `<color attach="background" args={['#0a0a0f']} />` and `<fogExp2 attach="fog" args={['#0a0a0f', density]} />`.
**Warning signs:** Visible color banding at the far end of the scene.

### Pitfall 5: React 19 Fog Rendering on Initial Load
**What goes wrong:** There was a reported issue (#3503) where fog didn't render on initial load with React 19 + R3F, only appearing after HMR.
**Why it happens:** Possible timing issue with declarative fog attachment in React 19 reconciler.
**How to avoid:** The issue was closed (Dec 2025) without confirmed reproduction. If encountered, use a `useLayoutEffect` workaround:
```tsx
function FogSetup({ color, density }: { color: string; density: number }) {
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    scene.fog = new THREE.FogExp2(color, density);
  }, [scene, color, density]);
  return null;
}
```
**Warning signs:** Scene loads without fog, fog appears after code change triggers HMR.

### Pitfall 6: Html Performance with Many Elements
**What goes wrong:** drei `<Html>` creates real DOM nodes for each instance. At 2000+ elements, performance degrades.
**Why it happens:** Each Html component creates and positions a DOM element every frame.
**How to avoid:** This project has at most ~15-30 card elements (Immediate + This Week tasks only). This is well within safe limits. The majority of tasks (distant horizons) render as WebGL sprites, not Html. No mitigation needed.
**Warning signs:** Sluggish rendering with many visible cards (unlikely given horizon-based card/sprite split).

### Pitfall 7: Shimmer Animation Conflicts with frameloop="demand"
**What goes wrong:** A slow opacity shimmer on sprites (8-12s cycle) requires continuous rendering. With `frameloop="demand"`, the shimmer stops after the first frame.
**Why it happens:** `useFrame` only runs when frames are rendered. No invalidation = no frame = no animation.
**How to avoid:** Two options: (a) Skip shimmer entirely (static sprites) -- simplest, saves battery. (b) If shimmer is desired, call `invalidate()` inside the `useFrame` callback when shimmer is active. This effectively makes the scene continuously render, negating `frameloop="demand"` benefits. Recommend option (a) for Phase 3, add shimmer in a later polish pass.
**Warning signs:** Sprites frozen at initial opacity, or GPU constantly active with shimmer enabled.

## Code Examples

### Complete FogExp2 Setup (Declarative)
```tsx
// Source: R3F docs + Three.js FogExp2 docs
// FogExp2 constructor: new THREE.FogExp2(color, density)
// density default: 0.00025 (very light), 0.015 is moderate for z-range 0 to -120

<fogExp2 attach="fog" args={['#0a0a0f', 0.015]} />
```

### Bloom-Compatible Emissive Sprite Material
```tsx
// Source: https://react-postprocessing.docs.pmnd.rs/effects/bloom
// Key: toneMapped={false} allows color > 1.0, triggering bloom
// Key: multiply base color to exceed threshold

import * as THREE from 'three';

const glowColor = new THREE.Color('#3b82f6').multiplyScalar(1.5);
// Result: RGB components > 1.0, will trigger bloom with luminanceThreshold={1}

<meshBasicMaterial
  color={glowColor}
  toneMapped={false}
  transparent
  opacity={0.9}
/>
```

### Zustand Store Invalidation Hook
```tsx
// Source: R3F scaling-performance docs + Zustand subscribe pattern
import { useThree } from '@react-three/fiber';
import { useEffect, useContext } from 'react';

function useStoreInvalidation(storeContext: React.Context<StoreApi<unknown> | null>) {
  const invalidate = useThree((state) => state.invalidate);
  const store = useContext(storeContext);

  useEffect(() => {
    if (!store) return;
    return store.subscribe(() => invalidate());
  }, [store, invalidate]);
}
```

### TaskCard with Frosted Glass CSS
```tsx
// Source: drei Html docs
import { Html } from '@react-three/drei';

function TaskCard({ task, position }: Props) {
  const hasDeadline = task.hardDeadline !== null;
  const isDrifted = task.driftCount > 0;

  return (
    <group position={position}>
      <Html center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div
          className="task-card"
          style={{
            width: '200px',
            padding: '10px 14px',
            background: 'rgba(18, 18, 26, 0.75)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            borderRadius: '8px',
            color: '#e2e8f0',
            fontSize: '13px',
            lineHeight: '1.3',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            // Hard deadline ring: amber glow border
            boxShadow: hasDeadline
              ? '0 0 8px rgba(245, 158, 11, 0.4), inset 0 0 4px rgba(245, 158, 11, 0.1)'
              : 'none',
            // Drift indicator: desaturated appearance
            filter: isDrifted
              ? `saturate(${Math.max(0.3, 1 - task.driftCount * 0.15)})`
              : 'none',
            opacity: isDrifted ? Math.max(0.6, 1 - task.driftCount * 0.1) : 1,
          }}
        >
          {task.title}
        </div>
      </Html>
    </group>
  );
}
```

### TaskNode LOD Controller
```tsx
// Horizon-based categorical split (no distance calculation needed)
import type { Task } from '@/types/task';

const CARD_HORIZONS = new Set(['immediate', 'this-week']);

function TaskNode({ task, position }: { task: Task; position: [number, number, number] }) {
  const isCard = CARD_HORIZONS.has(task.horizon);

  return isCard
    ? <TaskCard task={task} position={position} />
    : <TaskSprite task={task} position={position} />;
}
```

### Debug Overlay (URL-flag controlled)
```tsx
// ?debug=true shows tunable constants
function DebugOverlay({ constants }: { constants: Record<string, number> }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setShow(params.get('debug') === 'true');
  }, []);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', top: 10, right: 10, zIndex: 9999,
      background: 'rgba(0,0,0,0.8)', color: '#fff', padding: 12,
      fontFamily: 'monospace', fontSize: 11, borderRadius: 4,
    }}>
      {Object.entries(constants).map(([key, val]) => (
        <div key={key}>{key}: {val}</div>
      ))}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `frameloop="always"` (default) | `frameloop="demand"` + `invalidate()` | R3F v8+ | Major battery/performance savings for mostly-static scenes |
| Three.js EffectComposer (pass-based) | `@react-three/postprocessing` (effect-based) | 2023+ | Auto-merges effects, fewer render passes, declarative |
| SpriteMaterial for billboards | drei `<Billboard>` + mesh | drei v9+ | Better material control, bloom compatibility |
| `luminanceThreshold={0.9}` (old default) | `luminanceThreshold={1}` (selective) | Documented best practice | Nothing blooms unless intentionally configured |
| postprocessing v2 (React 18) | postprocessing v3 (React 19, ESM) | 2024 | Dropped React 18, ESM-only, R3F 9 required |

**Deprecated/outdated:**
- `@react-three/postprocessing` v2: Does not support React 19. v3 is required.
- `effectComposer` from `three/examples/jsm`: Don't use raw Three.js postprocessing. Use `@react-three/postprocessing`.
- `<sprite>` + `<spriteMaterial>` for custom sprites: Limited material control, prefer `<Billboard>` + standard mesh.

## Open Questions

1. **Fog density tuning**
   - What we know: FogExp2 density of 0.015 is a starting point for z-range 0 to -120. Default (0.00025) is too light. Needs visual tuning.
   - What's unclear: Exact density that makes Someday tasks (z ~ -100) noticeably dimmer while keeping Immediate (z ~ -2.5) fully clear.
   - Recommendation: Start with 0.015, expose as tunable constant in debug overlay. Tune visually.

2. **Bloom intensity tuning**
   - What we know: `intensity={1.5}` with `mipmapBlur` is a reasonable starting point.
   - What's unclear: How bloom interacts with fog at distance (bloom operates on the post-fog render buffer, so distant sprites should have naturally reduced bloom -- but untested).
   - Recommendation: Start with intensity 1.5, expose as tunable constant. Verify bloom dims naturally with fog.

3. **Shimmer animation decision**
   - What we know: Design says "very slow shimmer preferred if no frameloop issues." It WILL cause frameloop issues with `frameloop="demand"`.
   - What's unclear: Whether the visual benefit is worth continuous rendering.
   - Recommendation: Skip shimmer in Phase 3 (static sprites). Revisit as polish if performance budget allows after Phase 4 adds camera movement (which already requires continuous rendering during scroll).

4. **distanceFactor value for Html cards**
   - What we know: `distanceFactor` controls how Html scales with camera distance. Needs tuning so cards look ~200px wide at their expected viewing distance.
   - What's unclear: Exact value for the z-range 0 to -15.
   - Recommendation: Start with `distanceFactor={10}`, tune visually.

## Sources

### Primary (HIGH confidence)
- R3F scaling-performance docs: https://r3f.docs.pmnd.rs/advanced/scaling-performance -- frameloop="demand", invalidate() pattern
- drei Html docs: https://drei.docs.pmnd.rs/misc/html -- all Html props, distanceFactor, occlude, transform
- drei Billboard docs: https://drei.docs.pmnd.rs/abstractions/billboard -- Billboard props, follow, lock axes
- drei Stars docs: https://drei.docs.pmnd.rs/staging/stars -- Stars props (radius, depth, count, factor, speed)
- React Postprocessing Bloom docs: https://react-postprocessing.docs.pmnd.rs/effects/bloom -- selective bloom, luminanceThreshold, toneMapped requirement
- Three.js FogExp2 docs: https://threejs.org/docs/pages/FogExp2.html -- constructor, density parameter

### Secondary (MEDIUM confidence)
- R3F discussion #2270 (fog attach pattern): https://github.com/pmndrs/react-three-fiber/discussions/2270
- R3F issue #3503 (React 19 fog bug, closed): https://github.com/pmndrs/react-three-fiber/issues/3503
- R3F discussion #1800 (useFrame + invalidate for animations): https://github.com/pmndrs/react-three-fiber/discussions/1800
- R3F discussion #3130 (Html performance at scale): https://github.com/pmndrs/react-three-fiber/discussions/3130
- @react-three/postprocessing releases: https://github.com/pmndrs/react-postprocessing/releases

### Tertiary (LOW confidence)
- Bloom + fog interaction: inferred from rendering pipeline knowledge (bloom operates on post-fog frame buffer). Not verified with specific documentation. Needs visual testing.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages installed, versions verified in package.json
- Architecture patterns: HIGH -- all patterns verified via official R3F/drei/postprocessing docs
- Fog setup: HIGH -- verified via Three.js docs and R3F discussions
- Bloom setup: HIGH -- verified via postprocessing docs (selective bloom, toneMapped requirement)
- Html card pattern: HIGH -- verified via drei Html docs
- Billboard sprite pattern: HIGH -- verified via drei Billboard docs + bloom docs
- Shimmer/animation: MEDIUM -- frameloop="demand" conflict is well-documented, recommendation to skip is based on analysis
- Fog + bloom interaction: LOW -- inferred from pipeline understanding, not explicitly documented
- Pitfalls: HIGH -- all verified via official docs, issues, or discussions

**Research date:** 2026-02-27
**Valid until:** 2026-04-27 (stable ecosystem, no major version changes expected)
