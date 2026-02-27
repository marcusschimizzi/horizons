---
phase: 04-camera
verified: 2026-02-27T19:39:57Z
status: passed
score: 6/6 must-haves verified
---

# Phase 4: Camera Verification Report

**Phase Goal:** The signature interaction works — users can fly through time by scrolling, feel momentum and easing as they move, cannot scroll out of bounds, can snap back to the present instantly, and experience subtle parallax that reinforces depth perception.
**Verified:** 2026-02-27T19:39:57Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Scrolling moves the camera along the Z-axis — the scene visibly flies forward or backward through time | VERIFIED | CameraRig wheel handler calls `cameraStore.getState().scroll(-pixelY * zUnitsPerPixel)`, damp3 moves `camera.position` toward targetZ in useFrame |
| 2  | Camera movement lerps toward its target position rather than snapping — motion feels weighty | VERIFIED | `damp3(camera.position, [targetParallaxX, targetParallaxY, effectiveTargetZ], combinedSmooth, delta)` in useFrame; zSmoothTime=0.25 |
| 3  | Scrolling at the Z=0 boundary or at Someday depth stops cleanly — no overscroll, no jitter | VERIFIED | `scroll()` rubber-bands past nearBoundary with `1 - exp(-x/maxOverscroll)` and hard-clamps at farBoundary=-120; spring-back when velocity < 0.5 |
| 4  | Pressing the home button or keyboard shortcut animates the camera back to Z=0 (present) | VERIFIED | SnapToPresent button calls `cameraStore.getState().snapToPresent()`; CameraRig handles `Home` key with same call; both set `targetZ = cameraRestZ, isAnimating = true` |
| 5  | Moving the mouse across the canvas causes a subtle X/Y parallax shift that adds perceived depth | VERIFIED | CameraRig `pointermove` handler calls `setParallax(nx * parallaxMaxX, -ny * parallaxMaxY)`; damp3 target includes both X/Y axes |
| 6  | User cannot scroll out of bounds in either direction | VERIFIED | nearBoundary=10 enforced with rubber-band (maxOverscroll=3); farBoundary=-120 enforced with hard clamp |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/stores/camera-store.ts` | exports cameraStore, useCameraStore | VERIFIED | 77 lines; exports `cameraStore` (line 27) and `useCameraStore` (line 75); has `snapToPresent`, `setParallax`, `targetParallaxX`, `targetParallaxY` |
| `src/components/CameraRig.tsx` | exports CameraRig | VERIFIED | 133 lines; exports `CameraRig` (line 15); scroll, parallax, keyboard, useFrame all implemented |
| `src/lib/scene-constants.ts` | has cameraRestZ, nearBoundary, farBoundary, zSmoothTime, maxOverscroll | VERIFIED | 57 lines; all 5 required constants present (lines 40-44); plus parallaxMaxX/Y, parallaxSmoothTime, snapDistanceThreshold |
| `src/components/SnapToPresent.tsx` | exports SnapToPresent | VERIFIED | 77 lines; exports `SnapToPresent` (line 11); click handler, keyboard shortcut wired, conditional visibility based on currentZ |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| CameraRig | cameraStore | `cameraStore.getState()` in useFrame | VERIFIED | Line 91: destructures `isAnimating, targetZ, velocity, targetParallaxX, targetParallaxY` |
| CameraRig | camera.position | `damp3` | VERIFIED | Lines 112-117: `damp3(camera.position, [targetParallaxX, targetParallaxY, effectiveTargetZ], combinedSmooth, delta)` |
| CameraRig | R3F render loop | `invalidate()` while isAnimating | VERIFIED | Line 128: `invalidate()` called when not yet settled; line 84: store subscription also calls invalidate |
| HorizonScene | CameraRig | `<CameraRig />` inside Canvas | VERIFIED | Line 108: rendered inside `SceneContents` which is inside `<Canvas>` |
| SnapToPresent | cameraStore | `cameraStore.getState().snapToPresent()` | VERIFIED | Line 18: called in `handleClick` |
| CameraRig | parallax state | `pointermove` event + `useFrame` | VERIFIED | Lines 41-54: pointermove/pointerleave handlers; line 114: X/Y included in damp3 target |
| CameraRig | damp3 target | parallax axes included | VERIFIED | Line 114: `[targetParallaxX, targetParallaxY, effectiveTargetZ]` — all three axes |
| HorizonScene | SnapToPresent | `<SnapToPresent />` as DOM sibling | VERIFIED | Line 148: rendered after closing `</Canvas>` tag, as sibling in the fragment |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| CAM-01 (scroll-driven Z movement) | SATISFIED | Wheel event → scroll() → damp3 in useFrame |
| CAM-02 (momentum/easing) | SATISFIED | damp3 with zSmoothTime=0.25; spring-back with springBackSmoothTime=0.15 |
| CAM-03 (boundary clamping) | SATISFIED | Rubber-band at nearBoundary, hard clamp at farBoundary |
| CAM-04 (snap to present) | SATISFIED | Button click + Home key both call snapToPresent() |
| CAM-05 (parallax) | SATISFIED | pointermove → setParallax → damp3 X/Y axes with parallaxSmoothTime=0.3 |

### Anti-Patterns Found

None. No TODO/FIXME/placeholder patterns detected across all four artifacts.

### Human Verification Required

The following behaviors cannot be verified programmatically and require running the app:

#### 1. Scroll Feel

**Test:** Open the app and scroll with mouse wheel/trackpad
**Expected:** Camera visibly moves forward (into the scene) on scroll-down, with smooth deceleration after stopping — not instant, not wobbly
**Why human:** Visual feel, momentum sensation, and smoothing quality require subjective assessment

#### 2. Boundary Resistance

**Test:** Scroll past the present (Z=10) boundary aggressively
**Expected:** Camera stretches slightly past the boundary (rubber-band), then springs back smoothly when wheel stops — no jitter at the boundary
**Why human:** The feel of the rubber-band and spring-back can only be assessed in motion

#### 3. Parallax Depth Perception

**Test:** Move mouse slowly across the canvas while looking at the scene
**Expected:** Scene shifts subtly in X/Y with the mouse, giving a sense of depth and volume — not too strong, not imperceptible
**Why human:** Parallax intensity and naturalness require subjective assessment

#### 4. Snap to Present Button Appearance

**Test:** Scroll away from present, then look for snap button; click it
**Expected:** Button fades in at bottom-center when camera is away from Z=10; clicking it smoothly animates camera back to Z=10; button fades out on arrival
**Why human:** CSS transition quality and button visibility require visual inspection

#### 5. Home Key Snap

**Test:** Scroll away from present, press Home key
**Expected:** Camera animates smoothly back to Z=10 (same as button click)
**Why human:** Keyboard interaction and animation quality require live testing

### Gaps Summary

No gaps. All 6 observable truths are supported by verified, substantive, and correctly wired artifacts. The implementation is complete — no placeholders, no stubs, no missing connections.

---

_Verified: 2026-02-27T19:39:57Z_
_Verifier: Claude (gsd-verifier)_
