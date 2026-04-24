---
id: TASK-242
title: Repair headed UI playthrough automation for structured gameplay
status: In Progress
assignee: []
created_date: '2026-04-24 02:55'
updated_date: '2026-04-24 07:01'
labels:
  - qa
  - automation
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix the browser UI playthrough automation so headed runs drive real gameplay across supported scenarios instead of degrading into pass-only loops. The command-line interface must expose every automation setting that can be configured by environment variable, while retaining env vars as defaults for compatibility.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Headed local guest PvP playthrough reaches an end state while executing real attack actions, not only pass actions.
- [ ] #2 UI automation can identify playable deploy, attack, reinforce, pass, and forfeit controls through stable selectors or equivalent compatibility hooks.
- [ ] #3 Every playthrough automation option currently configurable by environment variable is also configurable via a documented command-line flag.
- [ ] #4 Docs list the supported playthrough scenarios and CLI flags for local, staging, and production targets.
- [ ] #5 Targeted client tests and at least one headed local playthrough validation pass.
- [ ] #6 Headed UI playthroughs can launch an optional spectator browser that joins through the public observer link and validates the streamable spectator HUD, live active-player status, spectator count, and play-by-play log.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Expanded scope to cover stream/recording spectator validation: runner flag `--spectator`, client direct `?watch=<matchId>` consumption, and spectator HUD/play-by-play rendering are being verified with targeted client tests and headed local playthroughs.
<!-- SECTION:NOTES:END -->
