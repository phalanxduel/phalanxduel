---
id: TASK-126
title: Implement Real-Time State Drift Detection in API Playthrough
status: To Do
assignee: []
created_date: '2026-03-30 19:51'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
To ensure the API is truly 'hardened,' we must verify that the server isn't just 'working,' but is 100% deterministic compared to the engine. This task adds real-time state-hash verification to the API playthrough suite.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 In api-playthrough.ts, after every action, compare the 'stateHash' returned by the server with a local engine re-simulation of the same action.
- [ ] #2 #2 Fail the test immediately if the server-side state drift is detected.
- [ ] #3 #3 Log the exact diff between expected (Engine) and actual (Server) JSON states on failure.
<!-- AC:END -->
