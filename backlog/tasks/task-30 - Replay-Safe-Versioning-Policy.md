---
id: TASK-30
title: Replay-Safe Versioning Policy
status: To Do
assignee: []
created_date: ''
updated_date: '2026-03-14 03:05'
labels: []
dependencies: []
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The codebase already has `SCHEMA_VERSION`, `specVersion`, and API surface
changes, but there is still no written policy that explains how those version
signals relate to replay compatibility or breaking rule changes. This task makes
versioning explicit so releases can be reviewed for compatibility risk instead
of relying on convention.

## Problem Scenario

Given a rules-engine or schema change lands, when maintainers need to decide
whether it is patch-safe or replay-breaking, then there is no canonical document
that explains how `SCHEMA_VERSION`, `specVersion`, and API versioning should
move together.

## Planned Change

Write a versioning policy that maps rule changes, schema changes, and API
changes to the required version bumps and replay-compatibility expectations.
This plan uses the existing version fields already present in the repo rather
than inventing a new version model.

## Delivery Steps

- Given the existing version signals, when the policy is written, then it
  explains the purpose of each one and when it changes.
- Given replay compatibility is a core invariant, when a change is classified,
  then the policy states whether old replays remain valid or require migration.
- Given release tooling already exists, when the policy is adopted, then it
  lines up with the repo's current version-sync flow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

- Given a rules or schema change, when a maintainer consults the policy, then it
  is clear which version fields must change.
- Given replay-sensitive changes, when the policy is applied, then the expected
  compatibility impact on historic replays is explicit.
- Given release automation, when the policy is reviewed, then it aligns with the
  repo's existing `SCHEMA_VERSION` and version-sync tooling.

## References
- `archive/ai-reports/2026-03-11/Gordon-Default/production-readiness-report.md` (L404, L457)
- `shared/src/schema.ts`
- `server/src/app.ts`
- `bin/maint/sync-version.sh`
