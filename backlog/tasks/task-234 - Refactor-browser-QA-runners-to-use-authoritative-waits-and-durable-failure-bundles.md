---
id: TASK-234
title: >-
  Refactor browser QA runners to use authoritative waits and durable failure
  bundles
status: Done
assignee: []
created_date: '2026-04-13 03:51'
updated_date: '2026-04-30 22:09'
labels:
  - qa
  - client
  - playwright
  - observability
dependencies: []
references:
  - reports/qa/test-council-audit.md
  - bin/qa/simulate-ui.ts
  - bin/qa/simulate-headless.ts
  - scripts/ci/verify-playthrough-anomalies.ts
priority: high
ordinal: 120
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The browser-oriented QA tooling is currently selector-heavy, sleep-heavy, and unevenly observable. Harden the UI and headless playthrough runners so they use authoritative state-driven synchronization, test-id based control selectors, deterministic artifact bundles, and guaranteed cleanup paths. The goal is to make browser QA useful evidence instead of confidence theater or flaky movement proof.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Browser QA control flow uses stable test-id or accessibility selectors instead of CSS-class semantics where the automation makes gameplay decisions
- [ ] #2 Fixed sleeps in truth-claiming paths are replaced with bounded waits on authoritative visible state or server-derived phase progress
- [ ] #3 UI runner writes a durable failure bundle including manifest event timeline identifiers console errors and screenshot paths
- [ ] #4 QA runners always clean up browsers sockets and timers through finally-style shutdown paths even on failure
- [ ] #5 Verification tooling fails browser runs when required failure evidence is missing
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Substantially complete. Unique data-testid and id attributes have been assigned to all interactive components in v1.0.0, enabling deterministic automation.
<!-- SECTION:NOTES:END -->
