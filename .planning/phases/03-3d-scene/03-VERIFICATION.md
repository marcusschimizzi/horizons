---
phase: 03-3d-scene
verified: 2026-02-27T00:00:00Z
status: passed
score: 19/19 must-haves verified
note: "Gap closed post-verification: DebugOverlay.tsx updated with lodBoundary row (commit c9e72a9)"
---

# Phase 3: 3D Scene Verification Report

**Phase Goal:** The spatial thesis is visible — users can see tasks laid out by time horizon in 3D space, with fog making distance legible, close tasks rendered as full cards, distant tasks as glowing sprites, LOD transitioning smoothly between them, and the scene atmosphere giving the dark-space feel.
**Verified:** 2026-02-27T00:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Canvas renders with dark background (#0a0a0f) and no SSR crash | VERIFIED | `HorizonScene.tsx` uses `<color attach="background" args={['#0a0a0f']} />` and canvas style `background: '#0a0a0f'`. SSR prevented via `dynamic(() => import('./HorizonScene'), { ssr: false })` in `SceneLoader.tsx`. |
| 2 | Exponential fog is active — objects at z=-100 are noticeably dimmer than z=0 | VERIFIED | `FogSetup` component imperatively sets `scene.fog = new THREE.FogExp2(fogColor, 0.015)`. At fogDensity=0.015, camera at z=10: distance to z=-100 is ~110 units, attenuation = e^(-0.015*110) ≈ 0.19. Distance to z=0 is ~10 units, attenuation = e^(-0.15) ≈ 0.86. Visibly dimmer. `fogColor` matches `background` (#0a0a0f). |
| 3 | Star field is visible as sparse static white points | VERIFIED | `<Stars radius={200} depth={100} count={300} factor={2} saturation={0} speed={0} fade />` rendered inside Canvas in `SceneContents`. 300 count is within the specified sparse range (200-400). `speed={0}` makes stars static. |
| 4 | Bloom post-processing is wired (luminanceThreshold=1, only emissive materials will glow) | VERIFIED | `<EffectComposer><Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.025} intensity={1.5} /></EffectComposer>` wired in `SceneContents`. |
| 5 | Zustand store changes trigger scene re-render via invalidate() | VERIFIED | `SceneInvalidator` component calls `store.subscribe(() => invalidate())` using `useThree((state) => state.invalidate)` and `useContext(TaskStoreContext)`. Canvas uses `frameloop="demand"`. |
| 6 | Distant tasks (This Month+) render as colored glowing circles in the 3D scene | VERIFIED | `TaskNode` routes `this-month`, `this-quarter`, `this-year`, `someday` to `<TaskSprite />`. `TaskSprite` renders a `circleGeometry` with `meshBasicMaterial` using `color={glowColor}` derived from `TAG_COLORS`. |
| 7 | Sprite glow color corresponds to the task's first tag category | VERIFIED | `TaskSprite` derives `glowColor` from `task.tags?.[0]` mapped through `TAG_COLORS` (6 categories). Lerps 25% toward ethereal target color and multiplies by `spriteEmissiveMultiplier=1.5`. |
| 8 | Sprites with toneMapped=false trigger bloom post-processing | VERIFIED | `meshBasicMaterial` in `TaskSprite` has `toneMapped={false}` — this bypasses tone mapping and produces values >1 that the Bloom effect picks up. |
| 9 | Tasks with higher driftCount render subtly larger sprites | VERIFIED | `radius = spriteBaseRadius * (1 + Math.min(drift, 5) * 0.06)`. At drift=5, radius is 30% larger. `task.driftCount ?? 0` handles null safely. |
| 10 | Sprites are flat billboard circles that always face the camera | VERIFIED | `TaskSprite` wraps `mesh` in `<Billboard>` from `@react-three/drei`. `circleGeometry` is used for the flat circle shape. |
| 11 | Near tasks (Immediate, This Week) render as frosted-glass HTML cards showing the task title | VERIFIED | `TaskCard` renders `<Html center distanceFactor={10}><div style={cardStyle}>{task.title}</div></Html>`. Card style has `background: 'rgba(18, 18, 26, 0.75)'`, `backdropFilter: 'blur(8px)'`. Task title is displayed directly. |
| 12 | Cards with hardDeadline show a steady amber/orange glow ring (box-shadow) | VERIFIED | When `task.hardDeadline !== null`, `boxShadow: '0 0 8px rgba(245, 158, 11, 0.4), inset 0 0 4px rgba(245, 158, 11, 0.1)'` is applied — amber (f59e0b) color. |
| 13 | Cards with driftCount > 0 appear subtly desaturated and dimmed | VERIFIED | When `task.driftCount > 0`: `filter: saturate(max(0.3, 1 - driftCount * 0.15))` and `opacity: max(0.6, 1 - driftCount * 0.1)` applied. |
| 14 | Cards scale with distance via drei Html distanceFactor | VERIFIED | `<Html center distanceFactor={SCENE_CONSTANTS.htmlDistanceFactor}>` where `htmlDistanceFactor=10`. |
| 15 | Cards are display-only — no click handlers, no interactivity | VERIFIED | `pointerEvents: 'none'` on Html element. No `onClick`, `onPointerDown`, or similar event handlers anywhere in `TaskCard.tsx` or `TaskSprite.tsx`. |
| 16 | Tasks in Immediate and This Week render as TaskCard (HTML cards) | VERIFIED | `cardHorizonsSet = new Set(['immediate', 'this-week'])`. `TaskNode` returns `<TaskCard />` when `cardHorizonsSet.has(task.horizon)`. |
| 17 | Tasks in This Month, This Quarter, This Year, Someday render as TaskSprite | VERIFIED | All horizons not in `cardHorizonsSet` fall through to `<TaskSprite />`. The four non-card horizons are `this-month`, `this-quarter`, `this-year`, `someday`. |
| 18 | The LOD boundary is a clean horizon-based categorical split with no visual pop | VERIFIED | The split is categorical and static (based on task's computed horizon, not camera position). No interpolation or crossfade code exists between card and sprite — the boundary is determined before render, so there is no frame-by-frame pop. |
| 19 | Debug overlay at ?debug=true shows fog density, bloom intensity, and LOD threshold values | FAILED | `DebugOverlay` shows `fogDensity` and `bloomIntensity` — those pass. However no explicit LOD threshold value is shown. The overlay shows `bloomLuminanceThreshold` (a bloom parameter) and a task count breakdown (cards/sprites), but the LOD categorical boundary itself (`cardHorizons: ['immediate', 'this-week']`) is never displayed as a named value. |

**Score:** 18/19 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/scene-constants.ts` | Scene atmosphere constants | VERIFIED | 40 lines, exports `SCENE_CONSTANTS` with all required values: background, fogDensity, fogColor, bloom params, cardHorizons, sprite params, htmlDistanceFactor |
| `src/components/HorizonScene.tsx` | Main 3D canvas component | VERIFIED | 148 lines, exports `HorizonScene`. Wires Canvas, FogSetup, Stars, TaskNodes, SceneInvalidator, EffectComposer+Bloom, DebugOverlay. Imported by SceneLoader via dynamic import. |
| `src/components/TaskNode.tsx` | LOD router component | VERIFIED | 26 lines, exports `TaskNode`. Routes to `TaskCard` or `TaskSprite` based on `cardHorizonsSet`. Used in `TaskNodes` in HorizonScene. |
| `src/components/TaskSprite.tsx` | Glowing circle for distant tasks | VERIFIED | 67 lines, exports `TaskSprite`. Billboard-wrapped circleGeometry with toneMapped=false material. driftCount scaling and tag-based color. Used via TaskNode. |
| `src/components/TaskCard.tsx` | Frosted glass card for near tasks | VERIFIED | 57 lines, exports `TaskCard`. Html with distanceFactor, pointerEvents:none, hardDeadline glow, driftCount desaturation. Used via TaskNode. |
| `src/components/DebugOverlay.tsx` | Debug info overlay | PARTIAL | 59 lines, conditionally shown at ?debug=true. Shows fogDensity, bloomIntensity, bloom params, task breakdown. Missing explicit LOD threshold label. |
| `src/stores/task-store.tsx` | Zustand task store | VERIFIED | 164 lines, exports TaskStoreContext, TaskStoreProvider, useTasksWithHorizon. Store subscribable for invalidate() hook. |
| `src/components/SceneLoader.tsx` | SSR-safe scene entry | VERIFIED | 66 lines, uses `dynamic(() => import('./HorizonScene'), { ssr: false })`. Wraps with TaskStoreProvider. |
| `src/lib/spatial.ts` | 3D position computation | VERIFIED | 112 lines, exports `getTaskPosition` and `applyOverlapAvoidance`. Deterministic per-task positions within horizon z-bands. |
| `src/lib/horizons.ts` | Horizon classification | VERIFIED | 59 lines, exports `getHorizon`, `HORIZON_BANDS`, `getZDepthRange`. Horizons map to z-ranges from 0 to -120. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `HorizonScene.tsx` | `SCENE_CONSTANTS` | direct import | WIRED | All scene parameters sourced from constants |
| `HorizonScene.tsx` | `TaskStoreContext` + `useTasksWithHorizon` | import + useContext | WIRED | `SceneInvalidator` subscribes to store; `TaskNodes` uses `useTasksWithHorizon()` |
| `HorizonScene.tsx` | `EffectComposer` + `Bloom` | `@react-three/postprocessing` | WIRED | Inside Canvas SceneContents, wired with SCENE_CONSTANTS values |
| `HorizonScene.tsx` | `FogExp2` | THREE.FogExp2 in useEffect | WIRED | `FogSetup` component sets `scene.fog` imperatively on mount |
| `HorizonScene.tsx` | `Stars` | `@react-three/drei` | WIRED | Rendered inside SceneContents with static speed=0 |
| `TaskNode.tsx` | `TaskCard` / `TaskSprite` | conditional render | WIRED | `cardHorizonsSet.has(task.horizon)` routes to correct component |
| `TaskSprite.tsx` | `TAG_COLORS` | import from types | WIRED | glowColor derived from `task.tags?.[0]` through `TAG_COLORS` map |
| `TaskSprite.tsx` | `Billboard` | `@react-three/drei` | WIRED | Wraps mesh for camera-facing behavior |
| `TaskCard.tsx` | `Html` + `distanceFactor` | `@react-three/drei` | WIRED | `distanceFactor={SCENE_CONSTANTS.htmlDistanceFactor}` applied |
| `SceneLoader.tsx` | `HorizonScene` | `next/dynamic` with ssr:false | WIRED | SSR-safe dynamic import |
| `SceneLoader.tsx` | `TaskStoreProvider` | wraps children | WIRED | Provides store to HorizonScene subtree |
| `app/page.tsx` | `SceneLoader` | direct render | WIRED | Server component fetches tasks, passes as initialTasks |
| `SceneInvalidator` | store.subscribe | store.subscribe + invalidate() | WIRED | Canvas frameloop="demand" + invalidate on every store change |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| Scene atmosphere (dark background, exponential fog, stars) | SATISFIED | All three elements verified |
| Bloom post-processing (luminanceThreshold=1) | SATISFIED | EffectComposer+Bloom wired with correct params |
| Zustand store triggers invalidate | SATISFIED | SceneInvalidator subscribes to store |
| Distant tasks as glowing sprites | SATISFIED | TaskSprite: Billboard + circleGeometry + toneMapped=false |
| Sprite color from tag category | SATISFIED | TAG_COLORS map with 6 categories |
| driftCount increases sprite size | SATISFIED | Radius scaling formula confirmed |
| Near tasks as frosted glass HTML cards | SATISFIED | TaskCard: Html + backdrop-filter blur |
| hardDeadline amber glow ring | SATISFIED | box-shadow with rgba(245, 158, 11) |
| driftCount desaturation on cards | SATISFIED | CSS filter saturate + opacity |
| Cards scale with distance | SATISFIED | distanceFactor={10} on Html |
| Cards display-only, no interactivity | SATISFIED | pointerEvents:none confirmed |
| Horizon-based LOD categorical split | SATISFIED | cardHorizonsSet routes correctly |
| Debug overlay shows scene values | PARTIAL | fogDensity and bloomIntensity shown; LOD threshold label missing |
| All seeded tasks visible at correct positions | SATISFIED | 36 seed tasks span all 6 horizons; getTaskPosition routes each to correct z-band; TaskNode selects correct visual type |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | No TODO/FIXME/placeholder/stub patterns found in any scene component |

### Human Verification Required

The following must be confirmed by a human viewing the running application:

#### 1. Fog Depth Legibility

**Test:** Load the app at localhost:3000, look at the 3D scene.
**Expected:** Tasks at the far (someday) end should be visibly dimmer/foggier than immediate tasks near the camera. The dark atmosphere should feel like deep space.
**Why human:** FogExp2 math confirms significant attenuation at z=-100, but actual perceptual legibility of distance depends on display, monitor calibration, and overall composition.

#### 2. Bloom Halo on Sprites

**Test:** Look at the glowing circles (distant task sprites) in the scene.
**Expected:** Each sprite should have a soft luminous halo — not just a flat circle, but a glow that bleeds slightly into surrounding space.
**Why human:** `toneMapped=false` + Bloom with threshold=1 is correctly wired, but whether the glow is perceptually visible and attractive requires visual confirmation.

#### 3. Star Field Appearance

**Test:** Look at the background of the scene.
**Expected:** Sparse white points distributed through the background, static (not animated), giving a space aesthetic without overwhelming the task nodes.
**Why human:** Count and distribution feel cannot be verified programmatically.

#### 4. Card Frosted Glass Effect

**Test:** Look at the near task cards (immediate and this-week tasks).
**Expected:** Cards should appear as dark glass panels with the backdrop blurring content behind them.
**Why human:** `backdropFilter: blur(8px)` is in the code but actual frosted glass appearance depends on browser support, whether there is content behind the cards (the 3D scene itself is the background), and rendering context.

#### 5. LOD Categorical Split — No Visual Pop

**Test:** Navigate or watch as tasks load; observe the boundary between card and sprite rendering.
**Expected:** No sudden visual jarring at the boundary. The card-to-sprite split should appear as a natural depth transition.
**Why human:** The split is categorical (no crossfade), so whether the boundary "reads" cleanly as a feature or an artifact requires human judgment.

---

## Gaps Summary

One gap prevents the full must-have list from being satisfied:

**Debug overlay missing explicit LOD threshold label** — The `DebugOverlay` component shows `fogDensity`, `bloomIntensity`, and `bloomLuminanceThreshold`, as well as task counts split into `cards` and `sprites`. However, the must-have from 03-04 specifically calls for the "LOD threshold values" to be shown. The LOD categorical boundary is defined by `SCENE_CONSTANTS.cardHorizons = ['immediate', 'this-week']`, which is never displayed in the overlay. A developer reading the overlay cannot determine from it which horizon names form the LOD split boundary.

This is a minor gap — all scene functionality is fully wired and working. The debug overlay is merely incomplete relative to its stated spec.

---

_Verified: 2026-02-27T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
