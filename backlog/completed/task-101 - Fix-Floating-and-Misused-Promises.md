---
id: TASK-101
title: Fix Floating and Misused Promises
status: Done
assignee: []
created_date: '2026-03-21'
updated_date: '2026-03-22 15:17'
labels: []
milestone: v0.5.0 - Stability & Playability
dependencies:
  - TASK-100
priority: high
ordinal: 98000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
22 ESLint warnings across `no-floating-promises` (11) and `no-misused-promises`
(11) represent silent failure paths. When an async handler rejects inside a
WebSocket message handler or UI event, the error vanishes — no crash, no log,
no user feedback. The player sees a frozen UI with no explanation.

Worst offenders: `client/src/game-preact.tsx` (6 violations in render calls),
`server/src/app.ts` (4 floating promises in WS handlers), admin pages (async
onClick handlers).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All `no-floating-promises` warnings resolved (0 remaining).
- [x] #2 All `no-misused-promises` warnings resolved (0 remaining).
- [x] #3 Rejected promises in WS handlers produce user-visible error messages
      (not silent failures).
- [x] #4 Rejected promises in UI event handlers show error state to the user.
- [x] #5 No new `@ts-expect-error` or `eslint-disable` comments added.
<!-- AC:END -->

## Verification

```bash
# Confirm zero floating/misused promise violations
pnpm lint 2>&1 | grep -E 'no-floating-promises|no-misused-promises'
# Expected: no output (0 matches)

# Confirm no new eslint-disable or ts-expect-error added for these rules
grep -r 'eslint-disable.*no-floating-promises\|eslint-disable.*no-misused-promises\|@ts-expect-error' \
  server/src/ client/src/ admin/src/ --include='*.ts' --include='*.tsx'
# Expected: no output (0 matches)

# Confirm void operator pattern used (spot check)
grep -n 'void ' server/src/app.ts | head -5
# Expected: ~5 lines with void traceWsMessage(...)
```
