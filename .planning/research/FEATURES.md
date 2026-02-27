# Features Research: Horizon (Spatial Task Management)

*Synthesized from PRD context and spatial/productivity app analysis.*

---

## Table Stakes

Features users need or the app fails to be usable at all.

### Capture
- **Natural language input** — The entire point. If input is friction-heavy, nothing else matters. Must accept raw intentions ("call mom before her trip next week") without forcing structure.
- **Immediate visual feedback** — Task must appear in the scene as soon as it's parsed. Any delay breaks the illusion.
- **Persistence across sessions** — Tasks must survive refresh. Zero tolerance for loss.

### Viewing
- **Spatial differentiation by time** — If all horizons look the same, the depth metaphor is dead. Fog/blur/scale must be clearly legible at a glance.
- **Readable close tasks** — Immediate and This Week tasks need enough detail to act on (title, date range, tags, drift status visible or accessible).
- **Graceful density** — With 50+ tasks, the scene must not become an unreadable wall. Scatter algorithm and LOD tiers are not optional.

### Mutation
- **Complete a task** — With satisfying dissolution animation. The reward loop is essential for a personal productivity tool.
- **Reschedule a task** — Real usage will require changing dates. Without this, the app breaks down within 24 hours.
- **Drop a task** — Guilt-free removal. "I'm not doing this" is a valid, important action.

### Escape hatch
- **List view toggle** — The 3D scene is for ambient awareness; the list view is for triage. Without it, the app is unusable for actual task management work sessions.

---

## Differentiators

What makes Horizon distinct from Things/Todoist/Notion.

### Depth metaphor (core thesis)
- **Fog as urgency** — Distance = temporal distance. This is unique. No other app uses actual 3D perspective to represent time.
- **Camera fly-through** — Scrolling into your future is a visceral interaction no list app can replicate. This is the "wow" moment.
- **Passive drift** — Tasks approaching over days without user action. The future coming toward you, not a list you maintain.

### Capture philosophy
- **Intentions, not todos** — "Someday" tasks as soft clouds (not looming obligations). The language and visual treatment de-pressurize distant commitments.
- **Fuzzy dates** — DateRange instead of single date. "Next month sometime" is a valid, first-class state. Most productivity apps force false precision.
- **Haiku parsing** — Zero-friction from thought to placed task. No dropdowns, no date pickers, no category selection.

### Accountability without guilt
- **Drift count** — Visual evidence of procrastination without punishment. Honest signal: "this has been pushed 5 times."
- **Refinement as feature** — `needsRefinement` is explicit UI state, not a hidden error. Some things arrive blurry on purpose.
- **Someday zone** — A place for intentions that aren't commitments. Reduces the anxiety of "I should do this eventually."

### Visual identity
- **Space aesthetic** — Deep navy/charcoal, emissive glow, bloom. Feels different from every productivity app in the market.
- **Tag-based color temperature** — Warm/cool hue signals category at a glance, even at distance.

---

## Anti-Features

Things to deliberately NOT build for the PoC (and why).

| Feature | Why to avoid |
|---------|-------------|
| Notifications/reminders | Creates an obligation loop. The app's thesis is ambient awareness, not interruption. |
| Recurring tasks | High complexity, forces hard dates, fights the fuzzy-date model. |
| Collaboration/sharing | Single-user is the thesis. Multi-user adds auth complexity and scope creep. |
| Sub-task nesting in the scene | Rendering subtasks in 3D as child nodes is visually noisy. Keep subtasks in the detail panel only. |
| Drag-and-drop in 3D | Technically complex (3D raycasting + drop zones), not needed when detail panel handles rescheduling. |
| Priority flags | Priority is expressed by horizon proximity (temporal urgency), not manual P1/P2/P3 labels. Adding labels undermines the metaphor. |
| Tags/categories as first-class UI | Tags are AI-inferred and used for color. Exposing them as a management system adds complexity without value for v1. |
| Onboarding wizard | Personal tool. Marcus knows the app. Skip it. |
| Dark/light mode | The dark space aesthetic IS the product. Light mode would destroy the visual identity. |
| Export/import | Post-validation feature. If the thesis fails, no point. |

---

## Feature Priority for PoC

Ordered by impact on validating the core thesis:

1. **3D scene with fog + depth differentiation** — Without this, there's no thesis to test.
2. **Natural language input → task placed in scene** — The core capture loop.
3. **Camera Z-axis scroll** — Fly-through is the signature interaction.
4. **Task click → detail panel → complete/drop/reschedule** — Mutation loop.
5. **Persistence (Neon)** — Usable day-to-day requires real storage.
6. **LOD tiers (cards vs sprites)** — Required for visual coherence at scale.
7. **Drift count tracking** — Accountability signal, not day-one critical.
8. **Refinement flow** — Nice but can be deferred if time runs short.
9. **List view** — Escape hatch, build last.
10. **Bloom + polish** — Visual enhancement, cut first if scope tightens.

---

## Lessons from Similar Spatial / Experimental Productivity Apps

- **Spatial apps often fail on capture** — If getting a task into the system requires navigating 3D space, users abandon it. Keep the input bubble 2D and always accessible.
- **Visual novelty fades fast** — The 3D scene needs to be *useful*, not just beautiful. Fog/proximity = urgency signal is the key functional payoff.
- **Animation can slow down power users** — Entrance/exit animations must be fast (< 500ms) or skippable. What feels delightful the first 10 times is annoying on the 100th.
- **List view is always used more than expected** — The spatial view for ambient awareness, list view for actual work. Don't treat list view as a second-class citizen.

---
*Confidence: High for feature categories. Medium for lessons from comparable apps (limited direct comps exist for 3D task management). Versions and implementation details in STACK.md.*
