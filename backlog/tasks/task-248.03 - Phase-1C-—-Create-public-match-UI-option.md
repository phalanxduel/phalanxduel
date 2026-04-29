---
id: TASK-248.03
title: Phase 1C — Create-public-match UI option
status: Planned
assignee: []
created_date: '2026-04-29 02:05'
labels:
  - phase-1
  - client
  - ui
milestone: m-3
dependencies:
  - TASK-248.01
references:
  - client/src/lobby.tsx
  - client/src/state.ts
parent_task_id: TASK-248
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a "Post to public lobby" toggle/checkbox to the match creation flow in the lobby client. When enabled, the match is created with `visibility: 'public_open'` and will appear in the PUBLIC_LOBBY list for 30 minutes.

## What to change

In `client/src/lobby.tsx`, the `sendCreateMatch` callback currently accepts `visibility: 'private' | 'public_open'`. Wire a UI control to pass `'public_open'` when the player opts in.

The control should:
- Default to off (private match)
- Show a short label like "List in public lobby (30 min)"
- Be visible only when creating a new solo match (not bot challenges where it doesn't make sense, or wherever the existing create-match button is)

No routing changes needed — this is purely a create-match option. The match still behaves like any other private match except strangers can find and join it from the PUBLIC_LOBBY screen (TASK-248.04).

## Key files

- `client/src/lobby.tsx` — add toggle to create-match UI, pass visibility to sendCreateMatch
- `client/src/state.ts` — no changes expected; visibility is a request param not tracked in local state
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Create-match UI shows a 'List in public lobby' toggle defaulting to off
- [ ] #2 When toggle is on, match creation request includes visibility: public_open
- [ ] #3 When toggle is off, match creation request uses visibility: private (existing default)
- [ ] #4 Toggle is not shown for bot-vs-player match creation
- [ ] #5 pnpm check passes
<!-- AC:END -->
