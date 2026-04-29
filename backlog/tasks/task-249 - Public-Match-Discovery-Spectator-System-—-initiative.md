---
id: TASK-249
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
TASK-248 (stats cols + expiry infra)
  ├── TASK-249 (lobby API enrichment)          ← depends on 248
  │     └── TASK-251 (PUBLIC_LOBBY screen)     ← depends on 249 + 250
  ├── TASK-250 (create-public-match UI)        ← depends on 248; feeds 251
  └── TASK-252 (inactivity forfeit)            ← depends on 248

TASK-253 (spectator lobby API)                 ← depends on 249
  └── TASK-254 (spectator lobby screen)        ← depends on 253

TASK-255 (match replay API)
  ├── TASK-256 (match history list endpoint)   ← depends on 255
  └── TASK-257 (REWATCH client screen)         ← depends on 255 + 256 + 254
```

## Phase Summary

- **Phase 1** — Public lobby: TASK-248 → TASK-249 + TASK-250 → TASK-251
- **Phase 2** — Inactivity forfeit: TASK-252 (after 248)
- **Phase 3** — Spectator lobby: TASK-253 → TASK-254
- **Phase 4** — Rewatch: TASK-255 → TASK-256 → TASK-257
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All Phase 1-4 subtasks reach Done status
- [ ] #2 pnpm check passes at each phase boundary
- [ ] #3 qa:playthrough:verify passes after Phase 1 merge
<!-- AC:END -->
