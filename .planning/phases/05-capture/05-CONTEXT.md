# Phase 5: Capture - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

A fixed input bubble overlaid on the 3D canvas where users type natural language intentions. The text is sent server-side to Haiku, which returns a structured task (title, targetDate, horizon, tags, needsRefinement). The task is persisted to Postgres, added optimistically to the Zustand store, and materializes in the 3D scene with an entrance animation. The Anthropic key never reaches the client.

</domain>

<decisions>
## Implementation Decisions

### Input bubble character
- **Position:** Fixed bottom center of the canvas — prominent, always in reach
- **Visibility:** Always visible — no trigger needed, user clicks and types
- **Submit:** Claude's discretion — whatever looks cleanest (Enter key alone or with a button)
- **Placeholder text:** Claude's discretion — pick what feels most natural for the dark-space aesthetic

### Loading + feedback
- **While parsing:** Subtle spinner or pulsing animation within the input bubble (no text change)
- **Concurrent submissions:** Claude's discretion — lock input or queue, pick the simpler approach
- **Parse failure:** Silent retry once; if still failing, show inline error message below the input
- **After success:** Claude's discretion — whether to briefly flash success state before clearing

### Entrance animation
- **Intensity:** Subtle — fade in + gentle scale up from the task's 3D position. No disruption to the scene.
- **Camera behavior:** Only pan to the new task's Z-position if it's currently out of view. If already visible from current camera position, stay.
- **Timing:** Optimistic — task appears in the scene immediately when parse + optimistic store update complete, confirmed silently in the background. If save fails, task disappears with an inline error.
- **Card vs sprite:** Differentiated entrance — cards fade in (frosted glass condenses), sprites glow in (emissive pulses up from zero)

### Parse result + correction
- **User feedback:** Brief confirmation toast near the input bubble: "Added 'dentist' to This Week" — auto-dismisses after ~3 seconds. No review/approval step.
- **Ambiguous date (null):** Flag as `needsRefinement: true` — task appears in scene with the refinement indicator. No default horizon fallback.
- **Tags:** Haiku tags only if the category is obvious from the text. Untagged is acceptable — untagged tasks use the default grey glow color.

### Claude's Discretion
- Submit interaction (Enter key only vs Enter + button)
- Placeholder text content
- Whether input is locked or queues during concurrent parse
- Success state before input clears
- Exact spinner/pulse animation design for the loading state
- Toast exact visual design (color, icon, fade duration)

</decisions>

<specifics>
## Specific Ideas

- The toast confirmation ("Added 'dentist' to This Week") should be near the input bubble — contextual to where the action happened, not a top-of-screen notification
- Cards and sprites should each entrance-animate in a way that fits their visual character: cards feel like glass condensing, sprites feel like light kindling
- The optimistic UX should feel fast and trusting of Haiku — no interruption to the user's capture flow

</specifics>

<deferred>
## Deferred Ideas

None raised during discussion.

**Open architecture question (from STATE.md):**
- Haiku JSON reliability: tool use vs raw JSON in `/api/parse`? This was flagged as a decision to make before building Phase 5. Planner should resolve this in the research phase — tool use is more reliable for structured extraction but has different token costs.

</deferred>

---

*Phase: 05-capture*
*Context gathered: 2026-02-27*
