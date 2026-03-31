---
id: TASK-154
title: Verify Collector Topology Alignment
status: To Do
assignee: []
created_date: '2026-03-31 23:59'
labels: []
dependencies:
  - TASK-153
references:
  - AGENTS.md
  - docs/system/DEVELOPER_GUIDE.md
  - docs/system/ENVIRONMENT_VARIABLES.md
  - docs/system/OPERATIONS_RUNBOOK.md
priority: high
---

## Description

Run the final topology verification pass for the collector-first observability
model and confirm that active repo surfaces teach one backend with collector
tiers, not multiple competing observability stacks.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Active docs and helper commands consistently distinguish local collectors from the centralized backend.
- [ ] #2 Local runtime/container examples match the collector-first topology and do not imply a second backend.
- [ ] #3 Verification evidence records the search/command results needed to keep the topology coherent.
<!-- AC:END -->
