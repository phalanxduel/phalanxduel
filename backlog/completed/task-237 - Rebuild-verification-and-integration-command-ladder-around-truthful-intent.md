---
id: TASK-237
title: Rebuild verification and integration command ladder around truthful intent
status: Done
assignee: []
created_date: '2026-04-13 10:46'
updated_date: '2026-05-01 09:38'
labels:
  - ci
  - devex
  - scripts
  - pipeline
milestone: Post-Promotion Hardening
dependencies: []
references:
  - reports/qa/test-council-audit.md
  - package.json
  - bin/check
  - bin/test
  - scripts/ci/check-server.sh
priority: high
ordinal: 8030
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Root command surface no longer maps cleanly to operator intent. Verification paths mix generation with checking, quick path is not quick, verify:api is brittle inline shell, and several names overclaim truth. Rebuild command ladder so humans and agents can choose correct confidence level quickly and debugging path is explicit.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Root verification commands are reorganized into clear intent buckets such as quick CI full integration and release without ambiguous or accidental names
- [x] #2 Inline shell-heavy verification flows like current API integration path are extracted into dedicated scripts with reliable cleanup and bounded failure modes
- [x] #3 Generated-artifact commands and verification commands are separated so verification paths do not mutate workspace unexpectedly
- [x] #4 Root manifest exposes thin aliases for common entrypoints such as check test replay verification and diagnostics
- [x] #5 Repository docs explain command ladder and when each path is required for local work CI and release
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added schema:check, rules:check, and generate:artifacts to root package.json. Removed double schema:gen call from verify.sh (it was called explicitly and then again inside verify-schema.sh). Replaced three inline verify script calls with pnpm rules:check. Fixed deploy:prod → deploy:production in pnpm-scripts.md. Added Command Ladder table and Generation vs Verification table to pnpm-scripts.md documenting when to use each rung (verify:quick → verify:ci → verify:full → verify:release → verify:integration:api).
<!-- SECTION:FINAL_SUMMARY:END -->
