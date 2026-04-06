---
id: TASK-200
title: >-
  Fix: api-playthrough local engine config missing classicDeployment and
  quickStart
status: To Do
assignee: []
created_date: '2026-04-06 15:27'
labels:
  - qa
  - tooling
  - p1
  - drift-detection
dependencies: []
references:
  - 'bin/qa/api-playthrough.ts:396-398'
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

`bin/qa/api-playthrough.ts:396-398` constructs the local `GameConfig` for shadow execution but omits `classicDeployment` and `quickStart` from `gameOptions`. If either of those options differs between the server's actual config and the default, the local shadow engine is configured differently from the server, producing systematic hash divergence or (worse) a silent skip if the affected code paths are never exercised.

This is a reliability gap in the primary CI drift-detection mechanism.

## Evidence

- `api-playthrough.ts:396-398`: `gameOptions: { damageMode, startingLifepoints }` — `classicDeployment` and `quickStart` absent
- The CI `api-integration` job runs `api-playthrough.ts` as the primary correctness gate

## Fix

Pass all `gameOptions` fields that were sent to the server into the local `GameConfig`. The server's accepted `gameOptions` are included in the `matchCreated` response — extract them and use the server's canonical values rather than local defaults.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Local shadow GameConfig includes all gameOptions fields from the server's matchCreated response
- [ ] #2 A scenario using non-default classicDeployment or quickStart does not produce false-positive drift
- [ ] #3 Existing playthrough CI runs still pass
<!-- AC:END -->
