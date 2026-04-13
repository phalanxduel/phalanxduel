---
id: TASK-237
title: Rebuild verification and integration command ladder around truthful intent
status: To Do
assignee: []
created_date: '2026-04-13 10:46'
labels:
  - ci
  - devex
  - scripts
  - pipeline
dependencies: []
references:
  - reports/qa/test-council-audit.md
  - package.json
  - bin/check
  - bin/test
  - scripts/ci/check-server.sh
priority: high
ordinal: 145
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Root command surface no longer maps cleanly to operator intent. Verification paths mix generation with checking, quick path is not quick, verify:api is brittle inline shell, and several names overclaim truth. Rebuild command ladder so humans and agents can choose correct confidence level quickly and debugging path is explicit.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Root verification commands are reorganized into clear intent buckets such as quick CI full integration and release without ambiguous or accidental names
- [ ] #2 Inline shell-heavy verification flows like current API integration path are extracted into dedicated scripts with reliable cleanup and bounded failure modes
- [ ] #3 Generated-artifact commands and verification commands are separated so verification paths do not mutate workspace unexpectedly
- [ ] #4 Root manifest exposes thin aliases for common entrypoints such as check test replay verification and diagnostics
- [ ] #5 Repository docs explain command ladder and when each path is required for local work CI and release
<!-- AC:END -->
