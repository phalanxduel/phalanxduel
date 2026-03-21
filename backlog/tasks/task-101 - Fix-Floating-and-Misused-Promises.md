---
id: TASK-101
title: Fix Floating and Misused Promises
status: To Do
assignee: []
created_date: '2026-03-21'
labels: []
milestone: v0.5.0 - Stability & Playability
dependencies:
  - TASK-100
priority: high
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
- [ ] #1 All `no-floating-promises` warnings resolved (0 remaining).
- [ ] #2 All `no-misused-promises` warnings resolved (0 remaining).
- [ ] #3 Rejected promises in WS handlers produce user-visible error messages
      (not silent failures).
- [ ] #4 Rejected promises in UI event handlers show error state to the user.
- [ ] #5 No new `@ts-expect-error` or `eslint-disable` comments added.
<!-- AC:END -->

## Verification

```bash
# Confirm zero violations for these two rules
pnpm lint 2>&1 | grep -E 'no-floating-promises|no-misused-promises'
# Should output nothing

# Full suite
pnpm -r test
pnpm verify:all
```
