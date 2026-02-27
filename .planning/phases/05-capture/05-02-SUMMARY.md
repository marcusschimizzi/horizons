---
phase: 05-capture
plan: 02
subsystem: api
tags: [anthropic, haiku, zod, structured-output, nlp, parse]

requires:
  - phase: 02-data-layer
    provides: task schema and API error shape conventions
provides:
  - POST /api/parse endpoint for natural language task extraction via Haiku 4.5
  - ParsedTask type export for client-side consumption
  - zodOutputFormat structured output pattern for guaranteed schema compliance
affects: [05-capture plan 03 (input bubble wiring), 06-refinement]

tech-stack:
  added: ["@anthropic-ai/sdk@0.78.0", "zod@4.3.6"]
  patterns: ["zodOutputFormat for structured AI extraction", "module-level Anthropic client singleton"]

key-files:
  created: ["src/app/api/parse/route.ts"]
  modified: ["package.json"]

key-decisions:
  - "zodOutputFormat with messages.parse() for guaranteed schema-compliant JSON (no retry logic needed)"
  - "Module-level Anthropic client singleton (reused across requests)"
  - "System prompt includes dynamic today date for relative date resolution"

patterns-established:
  - "AI extraction endpoint: Zod schema + zodOutputFormat + messages.parse() for structured output"
  - "Server-only AI keys: no NEXT_PUBLIC_ prefix, route handler only"

duration: 2min
completed: 2026-02-27
---

# Phase 5 Plan 2: Parse Route Summary

**Haiku 4.5 structured extraction endpoint via zodOutputFormat -- parses natural language into title, date range, tags, and needsRefinement**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T20:59:47Z
- **Completed:** 2026-02-27T21:01:39Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Installed @anthropic-ai/sdk and zod as project dependencies
- Created /api/parse server-side route handler with Haiku 4.5 structured extraction
- Zod schema enforces title, targetDateEarliest, targetDateLatest, tags, needsRefinement shape
- zodOutputFormat guarantees schema-compliant JSON responses without retry logic
- Anthropic API key stays server-side only (no NEXT_PUBLIC_ prefix, no client imports)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Anthropic SDK and Zod dependencies** - `80badcc` (chore)
2. **Task 2: Create /api/parse route handler with Haiku structured extraction** - `301ab85` (feat)

## Files Created/Modified
- `src/app/api/parse/route.ts` - POST handler: validates input, calls Haiku via messages.parse() with zodOutputFormat, returns structured ParsedTask
- `package.json` - Added @anthropic-ai/sdk and zod dependencies

## Decisions Made
- Used zodOutputFormat with messages.parse() (GA in SDK 0.78.0) for guaranteed schema compliance -- no fallback to tool use needed
- Module-level Anthropic client instantiation for connection reuse across requests
- System prompt includes dynamic today date for accurate relative date resolution (e.g., "next Tuesday")
- Five in-prompt examples cover clear date, vague intention, immediate, date range, and no-date scenarios

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

ANTHROPIC_API_KEY must be set in .env.local for the /api/parse endpoint to function. Obtain from https://console.anthropic.com/ -> API Keys -> Create Key.

## Next Phase Readiness
- /api/parse endpoint ready for InputBubble integration (plan 05-03)
- ParsedTask type exported for client-side type safety
- Error shape matches existing API conventions ({ error, code })

---
*Phase: 05-capture*
*Completed: 2026-02-27*
