# Phase 4: Camera - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Scroll-based camera movement along the Z-axis with momentum and easing. Camera cannot scroll out of bounds (Z=0 near boundary, Someday z-depth far boundary). A snap-to-present button + Home key shortcut animates the camera back to Z=0. Mouse parallax adds subtle perceived depth. Phase 5 (Capture) and Phase 6 (Interactions) depend on this camera being in place.

</domain>

<decisions>
## Implementation Decisions

### Scroll feel + momentum
- **Speed:** Medium — each scroll tick moves 5-8 z-units. Responsive but controlled, like browsing a document.
- **Coast duration:** Medium — 0.8-1.5s of momentum after stopping. Gentle, physical deceleration. Not too floaty.
- **Easing:** Exponential decay via lerp each frame — camera always moving toward target, slows as it approaches. Standard and fluid.
- **Trackpad vs mouse wheel:** Claude's discretion — handle both inputs however feels best in practice.

### Snap-to-present
- **Visibility:** Button only appears when the camera has scrolled away from Z=0 (present). Invisible when you're already at the present — no clutter.
- **Keyboard shortcut:** Home key.
- **Animation speed:** Proportional to distance — snaps quickly if nearby, travels visibly if you've scrolled deep into the future.
- **Button design:** Claude's discretion — minimal, consistent with the dark-space aesthetic.

### Boundary behavior
- **Near boundary (Z=0):** Soft resistance — spring-back overscroll. You can drag a little past the present, then it pulls you back like iOS overscroll. Not a hard wall.
- **Far boundary (Someday):** Fog + lock — the fog already gets dense as you approach Someday, and then the camera stops. Feels like the void wins. Natural alignment with the visual fog system.
- **Camera resting position:** Claude's discretion — set Z so that Immediate tasks are comfortably in view at launch. Whatever creates the best visual composition for the cards.
- **Boundary indicator:** Claude's discretion — the stopping itself may be sufficient feedback; add a subtle indicator only if it feels jarring without one.

### Parallax character
- **Intensity:** Barely perceptible — only if you're looking for it. Subtle depth cue, not a feature. ~0.5-1 unit max X/Y shift at full mouse offset.
- **Layer stratification:** Depth-stratified — near tasks shift less, distant sprites shift more. Creates genuine 3D depth perception, not just a uniform tilt.
- **Center-snap on mouse leave:** Claude's discretion — gently lerp back to center if it looks cleaner.
- **Y-axis:** Claude's discretion — include vertical parallax if it looks natural with the horizontal horizon bands; X-only if vertical feels wrong.

### Claude's Discretion
- Trackpad vs mouse wheel delta normalization
- Exact spring constant for near-boundary overscroll
- Camera resting Z position at app load
- Boundary visual indicator (or omission)
- Snap-to-present button visual design
- Whether parallax centers on mouse-leave
- Whether parallax includes Y-axis
- Lerp factor (alpha per frame) for camera smoothing

</decisions>

<specifics>
## Specific Ideas

- The soft resistance at Z=0 should feel like iOS overscroll — familiar and satisfying, not jarring
- The fog naturally builds as you approach Someday — the camera stopping there should feel like the universe ending, not a technical limit
- Parallax is atmospheric only — it should reinforce depth without making tasks feel like they're moving around

</specifics>

<deferred>
## Deferred Ideas

None raised during discussion.

**Architecture question from STATE.md (noted):**
- LOD distance threshold with camera movement: TaskNode uses categorical horizon split (Phase 3). Phase 4 may want to extend TaskNode with camera-distance hysteresis so tasks at the card/sprite boundary don't pop as you scroll through. This is already designed for in TaskNode (isCard variable kept explicit). Planner should consider this when wiring the camera.

</deferred>

---

*Phase: 04-camera*
*Context gathered: 2026-02-27*
