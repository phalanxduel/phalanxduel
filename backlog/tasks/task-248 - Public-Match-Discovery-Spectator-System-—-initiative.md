---
id: TASK-248
title: Public Match Discovery & Spectator System — initiative
status: In Progress
assignee: []
created_date: '2026-04-29 01:47'
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
- [ ] #2 pnpm check passes at each phase boundary
- [ ] #3 qa:playthrough:verify passes after Phase 1 merge
<!-- AC:END -->
