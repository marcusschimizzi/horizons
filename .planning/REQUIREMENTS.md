# Requirements: Horizon

**Defined:** 2026-02-26
**Core Value:** The spatial view must make you *feel* your future — if the 3D scene doesn't feel meaningfully different from a list, nothing else matters.

---

## v1 Requirements

### Scene

- [ ] **SCENE-01**: User sees tasks laid out in a 3D perspective scene with six named horizon bands (Immediate → Someday) mapped to Z-depth positions
- [ ] **SCENE-02**: Tasks in distant horizons are visually blurred and shrunk by exponential fog — proximity equals legibility
- [ ] **SCENE-03**: Close tasks (Immediate, This Week) render as full Html cards with title, tags, date range, and drift indicator visible
- [ ] **SCENE-04**: Distant tasks (This Month and beyond) render as glowing sprites — no text, colored by tag category
- [ ] **SCENE-05**: Task nodes transition between LOD tiers (card ↔ sprite) smoothly as camera moves along Z-axis
- [ ] **SCENE-06**: Scene atmosphere includes background particles / star field for spatial depth

### Camera

- [ ] **CAM-01**: User can scroll to move the camera along the Z-axis (fly into the future / back to the present)
- [ ] **CAM-02**: Camera movement has easing / momentum (lerp toward target position, not instant snap)
- [ ] **CAM-03**: Camera has soft limits — cannot scroll past Z=0 (present) or beyond Someday depth
- [ ] **CAM-04**: User can snap back to the present (Z=0) via button or keyboard shortcut
- [ ] **CAM-05**: Subtle mouse-follow parallax adds depth perception as cursor moves across the scene

### Capture

- [ ] **CAP-01**: User can type a natural language intention into a fixed input bubble overlaid on the canvas
- [ ] **CAP-02**: Input is sent to Haiku via server-side API route and parsed into a structured task (title, targetDate, horizon, tags, needsRefinement)
- [ ] **CAP-03**: Parsed task is persisted to Railway Postgres immediately after parsing
- [ ] **CAP-04**: New task materializes in the 3D scene at its computed horizon position with an entrance animation (fade-in, scale-up)
- [ ] **CAP-05**: Anthropic API key never reaches the client — all AI calls are server-side

### Task Interaction

- [ ] **TASK-01**: User can click any task node (card or sprite) to open a TaskDetail panel as a 2D slide-in overlay
- [ ] **TASK-02**: User can complete a task from the detail panel — task dissolves and fades from the scene with a satisfying animation
- [ ] **TASK-03**: User can drop a task (guilt-free deletion) — distinct from complete, task disappears without ceremony
- [ ] **TASK-04**: User can reschedule a task by changing its target date/horizon — task drifts to new Z-position
- [ ] **TASK-05**: User can edit a task's title and details inline from the detail panel

### Accountability

- [ ] **ACCT-01**: Each task tracks a `driftCount` — increments whenever the task's horizon window passes without completion
- [ ] **ACCT-02**: Drift count is visible as a subtle indicator on the task node in the scene
- [ ] **ACCT-03**: At drift count 3+, the detail panel surfaces a gentle prompt: "This has been pushed N times — recommit, snooze to Someday, or drop?"
- [ ] **ACCT-04**: Tasks flagged `needsRefinement: true` display a distinct visual indicator (pulse, ring) on their scene node
- [ ] **ACCT-05**: Clicking a refinement-flagged task shows the AI-generated refinement prompt in the detail panel
- [ ] **ACCT-06**: User can respond to refinement prompts in natural language — Haiku updates the task and clears the flag

### Navigation

- [ ] **NAV-01**: User can toggle a list view showing all tasks flat-grouped by horizon, as an escape hatch from the 3D scene
- [ ] **NAV-02**: List view supports filtering by tag, status, and needs-refinement flag
- [ ] **NAV-03**: List view supports quick actions: complete, drop, reschedule without opening the full detail panel

### Visual

- [ ] **VIS-01**: Task glow colors are assigned by tag category (e.g. work: cool blue, personal: warm amber, health: green)
- [ ] **VIS-02**: Bloom post-processing effect applies to emissive distant task nodes
- [ ] **VIS-03**: Tasks with hard deadlines have a visually distinct treatment (sharper, brighter, subtle pulse ring)

---

## v2 Requirements

### Notifications
- **NOTIF-01**: Daily drift recalculation shown as a brief animation on app load (tasks glide to new Z-positions)
- **NOTIF-02**: In-app nudge when multiple high-drift tasks cluster in Immediate horizon

### Input Enhancements
- **INPUT-01**: Voice input via Web Speech API (trivial to wire in, not core to thesis)
- **INPUT-02**: Bulk paste / import from text list

### Subtask Support
- **SUBTASK-01**: User can expand compound tasks into subtasks from the detail panel

### Sound Design
- **SOUND-01**: Subtle audio cue when scrolling through horizon bands or when tasks shift horizons

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile optimization | Desktop PoC only — optimize if thesis validates |
| Multi-user / auth / sync | Single-user personal tool, adds significant complexity |
| Smart contextual surfacing | Post-validation; requires personal context beyond task data |
| AI-driven weekly reviews | Post-validation feature |
| Calendar integration | Post-validation; out of scope for thesis test |
| Notifications / reminders | Interruption model contradicts the ambient awareness thesis |
| Drag-and-drop in 3D | High complexity, input + detail panel handles all mutations |
| Dark/light mode toggle | The dark space aesthetic is the product — light mode would destroy identity |
| Export / import | Post-validation; no point if thesis fails |
| Priority flags (P1/P2/P3) | Temporal proximity IS the priority signal — labels would undermine the metaphor |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCENE-01 | Phase 3 | Pending |
| SCENE-02 | Phase 3 | Pending |
| SCENE-03 | Phase 3 | Pending |
| SCENE-04 | Phase 3 | Pending |
| SCENE-05 | Phase 3 | Pending |
| SCENE-06 | Phase 3 | Pending |
| CAM-01 | Phase 4 | Complete |
| CAM-02 | Phase 4 | Complete |
| CAM-03 | Phase 4 | Complete |
| CAM-04 | Phase 4 | Complete |
| CAM-05 | Phase 4 | Complete |
| CAP-01 | Phase 5 | Complete |
| CAP-02 | Phase 5 | Complete |
| CAP-03 | Phase 5 | Complete |
| CAP-04 | Phase 5 | Complete |
| CAP-05 | Phase 5 | Complete |
| TASK-01 | Phase 6 | Pending |
| TASK-02 | Phase 6 | Pending |
| TASK-03 | Phase 6 | Pending |
| TASK-04 | Phase 6 | Pending |
| TASK-05 | Phase 6 | Pending |
| ACCT-01 | Phase 7 | Pending |
| ACCT-02 | Phase 7 | Pending |
| ACCT-03 | Phase 7 | Pending |
| ACCT-04 | Phase 7 | Pending |
| ACCT-05 | Phase 7 | Pending |
| ACCT-06 | Phase 7 | Pending |
| NAV-01 | Phase 7 | Pending |
| NAV-02 | Phase 7 | Pending |
| NAV-03 | Phase 7 | Pending |
| VIS-01 | Phase 3 | Pending |
| VIS-02 | Phase 3 | Pending |
| VIS-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 33 total
- Mapped to phases: 33
- Unmapped: 0

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 after roadmap creation*
