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

## Acceptance Criteria:
--------------------------------------------------
- [x] #1 Browser QA control flow uses stable test-id or accessibility selectors
- [x] #2 Fixed sleeps in truth-claiming paths are replaced with bounded waits
- [x] #3 UI runner writes a durable failure bundle including screenshots and logs
- [x] #4 QA runners always clean up browsers and sockets through finally blocks
- [x] #5 Verification tooling fails browser runs when failure evidence is missing

## Definition of Done
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Substantially complete. Unique data-testid and id attributes have been assigned to all interactive components in v1.0.0, enabling deterministic automation.
<!-- SECTION:NOTES:END -->
