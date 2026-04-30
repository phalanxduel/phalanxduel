---
id: TASK-248
title: Public Match Discovery & Spectator System — initiative
status: In Progress
assignee: []
created_date: '2026-04-29 01:47'
updated_date: '2026-04-30 17:27'
labels:
  - initiative
  - public-lobby
  - spectator
  - rewatch
milestone: m-3
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Full initiative tracking task for the Public Match Discovery milestone. Players can create matches that appear in a public lobby for strangers to join. Spectators can watch live matches or rewatch completed ones. Inactivity forfeits are attributed to the inactive player.

## DAG Overview

```text
TASK-249 (stats cols + expiry infra)
  ├── TASK-250 (lobby API enrichment)          ← depends on 249
  │     └── TASK-252 (PUBLIC_LOBBY screen)     ← depends on 250 + 251
  ├── TASK-251 (create-public-match UI)        ← depends on 249; feeds 252
  └── TASK-253 (inactivity forfeit)            ← depends on 249

TASK-254 (spectator lobby API)                 ← depends on 250
  └── TASK-255 (spectator lobby screen)        ← depends on 254

TASK-256 (match replay API)
  ├── TASK-257 (match history list endpoint)   ← depends on 256
  └── TASK-258 (REWATCH client screen)         ← depends on 256 + 257 + 255
```

## Phase Summary

- **Phase 1** — Public lobby: TASK-249 → TASK-250 + TASK-251 → TASK-252
- **Phase 2** — Inactivity forfeit: TASK-253 (after 249)
- **Phase 3** — Spectator lobby: TASK-254 → TASK-255
- **Phase 4** — Rewatch: TASK-256 → TASK-257 → TASK-258
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All Phase 1-4 subtasks reach Done status
- [x] #2 pnpm check passes at each phase boundary
- [x] #3 qa:playthrough:verify passes after Phase 1 merge
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-30 implementation wrap-up: all concrete Phase 1-4 child slices are now either Done or Human Review. TASK-248.04 through TASK-248.10 were completed with scoped commits and each child has verification notes. Latest child commit: 4489714a (`feat(client): add rewatch screen`); latest Backlog update: e83f4153 (`Update task TASK-248.10`).

2026-04-30 final proof for implementation readiness: `rtk pnpm check` passed after TASK-248.10 was committed. The unified check covered lint, typecheck, all package tests (shared 107, engine 210, admin 4, client 195, server 317), Go client check, schema generation/drift check, rules/FSM checks, event-log coverage, replay verify 20/20, playthrough verify 12/12 with 0 warnings/errors, docs artifact check, markdownlint, and Prettier.

Parent remains In Progress because AC #1 requires all Phase 1-4 subtasks to reach Done. Current blocker is human review of child tasks currently in Human Review, not additional implementation work.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementation for the Public Match Discovery & Spectator System initiative is wrapped through Phase 4C. All concrete child implementation slices are in Done or Human Review, and the latest unified `rtk pnpm check` passed. Parent TASK-248 should move to Human Review/Done only after the child review queue is accepted and the child tasks move to Done.
<!-- SECTION:FINAL_SUMMARY:END -->
