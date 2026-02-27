# Phase 3: 3D Scene - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Canvas setup with `frameloop="demand"` and `ssr: false`, exponential fog (`fogExp2`), ambient lighting, sparse star field background, bloom post-processing, `TaskSprite.tsx` (billboard mesh, emissive, glow by tag), `TaskCard.tsx` (drei Html card, title only, deadline ring, drift indicator), `TaskNode.tsx` (LOD controller: Immediate + This Week = cards, This Month and beyond = sprites), and `invalidate()` Zustand subscription. Phase 4 camera scroll makes LOD transitions visible in real use.

</domain>

<decisions>
## Implementation Decisions

### TaskCard design
- **Content:** Title only. Maximum signal-to-noise — no tags, no date range on the card face. Everything else lives in the detail panel (Phase 6).
- **Size/shape:** Claude's discretion — compact and clean. Approximately 180-220px wide, single line title, frosted-glass-style rectangle with subtle border. Designed for ~15 visible cards at once (Immediate + This Week bands).
- **Hard-deadline ring (VIS-03):** Visible steady glow ring, amber/orange (#f59e0b or similar) regardless of tag color. Not pulsing, just glowing — "this one matters" without being alarming.
- **Drift indicator:** Claude's discretion. Should feel atmospheric and subtle, not data-heavy — consistent with the title-only direction. A faint ambient color shift (card dims/desaturates slightly) preferred over a numeric badge.
- **No interactivity in Phase 3** — clicking tasks is Phase 6. Cards are display-only here.

### TaskSprite character
- **Glow color:** Claude's discretion. Use existing `TAG_COLORS` from `src/types/task.ts` as base hues, but shift toward more ethereal/space-like versions — lower saturation, more luminous. The sprite layer should feel like colored starlight, not bright UI.
- **Size:** Slightly varied by `driftCount` — tasks with higher drift render subtly larger or dimmer (not both). The variation is understated, a hint rather than a data visualization.
- **Bloom intensity:** Claude's discretion. Set an initial value that looks good, expose it as a tunable constant. Moderate is the target — visible halos, not overwhelming.
- **Animation:** Claude's discretion. A very slow shimmer (opacity oscillation, ~8-12s cycle) is preferred if it doesn't hurt performance. If it causes `frameloop="demand"` issues, static is fine.
- **Shape:** Flat billboard circle (plane geometry + emissive material). Not a sphere.

### Scene atmosphere
- **Background color:** Near-black — `#0a0a0f` or equivalent, darkest possible with a faint blue hint. Update `globals.css` and the R3F Canvas background to match.
- **Star field:** Sparse and static — a few hundred (200-400) small white points scattered across the background. No parallax movement in Phase 3 (Phase 4 camera adds that naturally). Stars are decorative background only, not interactive.
- **Fog:** Claude's discretion. Exponential fog (`fogExp2`) with density set so that the `proximity = clarity` metaphor is legible — Someday tasks should be noticeably dimmer than Immediate tasks. Start with moderate density, expose as a tunable constant.
- **Lighting:** Claude's discretion. Minimal ambient light is the right direction — cards are self-lit via CSS/HTML, sprites glow via emissive material. A subtle ambient + dim point light near the camera origin is acceptable if needed.

### LOD transition
- **Threshold:** Hard horizon-based split. Immediate + This Week = always TaskCard. This Month, This Quarter, This Year, Someday = always TaskSprite. No distance-based blending in Phase 3 — clean categorical boundary.
- **Flip animation:** Claude's discretion. Avoid visual pop (SCENE-05). A brief crossfade (~200ms opacity transition) is the recommended default.
- **Hysteresis:** Yes — once a task becomes a card (by camera movement in Phase 4), it remains a card until the camera is significantly further away. Prevents rapid toggling at the threshold. The exact buffer distance is Claude's choice — document it as a tunable constant.
- **Debug UI:** URL-flag controlled — `?debug=true` shows a floating overlay with tunable constants (fog density, bloom intensity, LOD threshold). Invisible in production. Simple plain HTML overlay, not a styled component.

### Claude's Discretion
- Exact card dimensions and corner radius
- Exact drift indicator implementation (ambient desaturation recommended)
- Exact sprite color palette (ethereal shift from TAG_COLORS recommended)
- Exact fog density constant
- Exact bloom strength and radius constants
- Shimmer animation frequency and amplitude
- Lighting setup details
- Crossfade animation curve and duration
- Hysteresis buffer distance
- Debug overlay layout

</decisions>

<specifics>
## Specific Ideas

- Stars should feel like a void — not a galaxy, just a few hundred cold white points. The tasks are the interesting objects, not the background.
- The drift indicator on cards should reinforce the "ambient guilt" feeling of deferred tasks — something that makes a drifted task look slightly worn, not accusatory.
- The amber/orange deadline ring is the one warm color in an otherwise cool-blue palette — it should feel like a small alarm in the darkness.
- The categorical LOD split (This Week / This Month boundary) is simpler than distance-based LOD and more semantically meaningful — the card/sprite boundary maps to the same boundary as the horizon bands.

</specifics>

<deferred>
## Deferred Ideas

None raised during discussion.

**Open architecture questions (from STATE.md, to resolve during planning):**
- LOD distance threshold — at what Z-depth does TaskCard flip to TaskSprite when scrolling? The debug slider built in this phase will expose this for tuning in Phase 4.

</deferred>

---

*Phase: 03-3d-scene*
*Context gathered: 2026-02-27*
