---
id: TASK-161
title: Plan release version bump for expanded external-client surface
status: Done
assignee:
  - '@codex'
created_date: '2026-04-01 20:27'
updated_date: '2026-04-02 23:58'
labels: []
dependencies:
  - TASK-165
priority: high
ordinal: 89000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The repo has materially expanded its public client surface with REST
matchmaking, REST action submission, generated SDKs, and a first-class Go
client. Production release needs an explicit version-bump decision that matches
the actual compatibility impact of that work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 #1 A recommended target version is chosen for the production-readiness
  wave (`0.6.0` if additive, `1.0.0` if breaking).
- [x] #2 #2 The plan explicitly maps transport/client changes to MINOR vs MAJOR
  bump criteria from `docs/system/VERSIONING.md`.
- [x] #3 #3 The release plan names the exact artifacts that must move together:
  package versions, `SCHEMA_VERSION`, OpenAPI/AsyncAPI artifacts, SDKs, and
  client-facing docs.
- [x] #4 #4 The plan states which readiness tasks must complete before the bump is
  executed.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Promote the production-readiness version plan into the canonical release-planning source for this wave, with an explicit recommended target version and execution gate list.
2. Tighten docs/system/VERSIONING.md so the expanded external-client surface maps specific transport/client changes to MINOR vs MAJOR version bumps.
3. Name the exact artifacts that must move together for the release: SCHEMA_VERSION/package versions, CHANGELOG entry, OpenAPI and AsyncAPI artifacts, generated SDK outputs, and the external-client compatibility/versioning docs.
4. Run targeted verification on the touched documentation and task state, then update TASK-161 notes and acceptance criteria to reflect the completed planning decision.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-02: Started discovery for the release-version planning pass after TASK-165 completed. Reviewed backlog workflow guidance, docs/system/VERSIONING.md, production-readiness plan doc, DEC-2B-003, current SCHEMA_VERSION, sync-version tooling, CHANGELOG state, and the new client compatibility guide to shape the final release-bump recommendation.

2026-04-02: Finalized the release-bump planning decision. Promoted backlog/docs/doc-7 - Production Readiness Priorities and Version Bump Plan.md to active guidance, locked the default recommendation to 0.6.0 with a 1.0.0 escape hatch for breaking recovery/fallback changes, named the coordinated artifact set for the eventual bump, and tightened docs/system/VERSIONING.md so the expanded external-client surface has explicit MINOR vs MAJOR rules.

2026-04-02: Finalized the release-bump planning decision. Promoted backlog/docs/doc-7 - Production Readiness Priorities and Version Bump Plan.md to active guidance, locked the default recommendation to 0.6.0 with a 1.0.0 escape hatch for breaking recovery/fallback changes, named the coordinated artifact set for the eventual bump, and tightened docs/system/VERSIONING.md so the expanded external-client surface has explicit MINOR vs MAJOR rules.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Finalized the production-readiness release plan for the expanded external-client surface. The repo now treats the current wave as a default 0.6.0 target, escalates to 1.0.0 only for incompatible recovery/fallback contract changes, and documents the exact artifact bundle and readiness tasks that must be complete before executing the bump.
<!-- SECTION:FINAL_SUMMARY:END -->
