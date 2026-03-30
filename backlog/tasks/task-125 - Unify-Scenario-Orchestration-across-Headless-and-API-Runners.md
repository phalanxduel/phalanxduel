---
id: TASK-125
title: Unify Scenario Orchestration across Headless and API Runners
status: To Do
assignee: []
created_date: '2026-03-30 19:45'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Currently, headless simulations and API playthroughs use slightly different logic for driving bot actions. This task unifies them under a single 'Scenario' format so a single JSON file can verify both the engine and the live API.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 Create a shared 'Scenario' schema that includes starting seeds, player configurations, and expected action sequences.
- [ ] #2 #2 Refactor bin/qa/simulate-headless.ts to accept a scenario file as input.
- [ ] #3 #3 Refactor bin/qa/api-playthrough.ts to accept the same scenario file.
<!-- AC:END -->
