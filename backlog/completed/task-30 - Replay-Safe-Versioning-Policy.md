---
id: TASK-30
title: Replay-Safe Versioning Policy
status: Done
assignee: []
created_date: ''
updated_date: '2026-03-18 22:53'
labels: []
dependencies: []
priority: high
ordinal: 60000
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
<!-- AC:BEGIN -->
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

- [x] #1 Versioning policy document created in docs/architecture/versioning.md
- [x] #2 Relationship between SCHEMA_VERSION and specVersion explicitly defined
- [x] #3 Replay compatibility invariants documented
- [x] #4 New policy linked from docs indices (README.md and docs/system/README.md)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Created `docs/architecture/versioning.md` defining `SCHEMA_VERSION` (Implementation) vs `specVersion` (Rules).
- Explicitly linked `specVersion` to `RULES.md` and deterministic replay guarantees.
- Documented the requirement for a MAJOR `SCHEMA_VERSION` bump whenever `specVersion` is updated.
- Updated `docs/README.md` and `docs/system/README.md` to include the new policy.
- Verified all documentation links and formatting via `pnpm check:quick`.

Verification evidence:
- `pnpm check:quick` passed.
- Manual verification of links in `docs/README.md` and `docs/system/README.md`.
- `docs/architecture/versioning.md` content matches the design in the plan.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Behavior matches specified Rule IDs or Schema definitions
- [x] #2 pnpm check:quick passes locally
- [x] #3 Targeted tests cover the changed paths (N/A for policy docs)
- [x] #4 No orphan TODO or FIXME comments remain without linked tasks
- [x] #5 Verification evidence recorded in task summary
- [x] #6 Operational docs and runbooks updated for surface changes
- [x] #7 Moved to Human Review for AI-assisted PR-backed work
<!-- DOD:END -->
