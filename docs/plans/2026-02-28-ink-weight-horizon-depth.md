# Ink Weight Horizon Depth — Design

## Problem

All task cards render with identical visual weight regardless of horizon. A someday task
looks the same as an immediate task except for its apparent size (from perspective scaling).
The depth hierarchy is not visually encoded in the cards themselves.

## Approach

Apply per-horizon ink weight to each card using CSS property interpolation. The metaphor:
tasks written in decisive dark ink are present and real; tasks written in tentative pencil
strokes are distant and aspirational. The paper is always there — only the marks on it fade.

## Depth Values

Each horizon maps to a `t` value on a 0–1 scale:

| Horizon      | t   |
|--------------|-----|
| immediate    | 0.0 |
| this-week    | 0.2 |
| this-month   | 0.4 |
| this-quarter | 0.6 |
| this-year    | 0.8 |
| someday      | 1.0 |

## CSS Properties

Three properties are linearly interpolated by `t`:

| Property         | t=0 (immediate)       | t=1 (someday)         |
|------------------|-----------------------|-----------------------|
| text color       | `#1a1605` (dark ink)  | `#b8ac9e` (pencil)    |
| border color     | `#8b7d6b` (warm gray) | `#d4ccc4` (faint)     |
| box-shadow alpha | `0.12`                | `0.02`                |

Card background remains `#fdf8f0` (solid cream paper) at all depths — no opacity change.

## Implementation

**Files changed:** `src/components/TaskCard.tsx` only.

1. `HORIZON_DEPTH` map (inline): `Record<Horizon, number>` mapping each horizon to its `t` value
2. `lerpHex(a, b, t)` helper (~6 lines): interpolates two hex color strings by `t`
3. Three property overrides in `cardStyle` using computed values

`task.horizon` is already available on the existing `task` prop — no interface changes.

## Non-goals

- No opacity change (paper stays solid)
- No blur / depth-of-field (reserved for future consideration)
- No fog density change (fog tuning is a separate concern)
- No changes to ListView, TaskDetail, or any other component
