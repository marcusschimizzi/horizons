# Phase 6: Task Interactions - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

A slide-in detail panel that lets users complete, drop, reschedule, and edit tasks — the mutation loop that makes the 3D spatial scene actionable. Clicking any task node (card or sprite) opens the panel. Phase 7 handles drift accountability and refinement flows.

</domain>

<decisions>
## Implementation Decisions

### Panel design
- Slides in from the **right edge**
- **Medium width (~480px)** — comfortable reading width, task details have room
- Visual style: **matches the space theme** — dark background, translucent/glass feel, same color palette as the 3D scene
- Closed by: **both backdrop click and explicit close button (X)**
- Content shown: editable title, notes/details field, horizon/deadline info, drift count indicator
- Actions arranged in a **bottom action bar**: Complete / Drop / Reschedule

### Claude's Discretion
- Whether the 3D scene stays interactive while the panel is open (dim/lock vs live)
- Exact glass/translucency levels and blur amount

### Action behaviors
- **Complete**: Immediate action with **undo toast** (toast appears for a few seconds with undo option)
- **Drop**: Immediate removal, no undo — **clearly distinct** from completion; no celebration, task just vanishes
- **After complete or drop**: Panel shows a **brief success state** ("✓ Done" or similar, ~1 second), then auto-closes
- **Editing title/details**: **Auto-save on blur/debounce** — no explicit save button, changes persist automatically

### Reschedule UX
- **Horizon band selector** for Phase 6 — 6 options (Immediate / This Week / This Month / This Quarter / This Year / Someday). Fastest implementation, zero API cost, no new mental model needed. NL input and date picker noted for future layering.
- Task node moves to new Z-position **immediately (optimistic update)** — reverts if server fails
- After rescheduling: **panel closes** and user returns to the scene to watch the task drift to its new position
- Whether camera auto-pans to follow the rescheduled task: **Claude's discretion**

### Animation character
- **Completion dissolution**: Particle burst then fade — celebratory and satisfying
- **Completion particle colors**: White/gold starburst — universal achievement, consistent regardless of tag
- **Drop removal**: Claude's discretion — should create clear emotional contrast to completion (abrupt, not ceremonial)
- **Panel slide-in**: Snappy, spring easing, ~200ms with slight overshoot

</decisions>

<specifics>
## Specific Ideas

- Drop should feel emotionally distinct from complete — the absence of ceremony is intentional (clinical, not punishing)
- The user envisions multiple reschedule input modes eventually (NL, date picker, band selector) for different user types — Phase 6 starts with the simplest; the others layer in cleanly later

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-task-interactions*
*Context gathered: 2026-02-27*
