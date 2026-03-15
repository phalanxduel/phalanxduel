---
id: TASK-44.7
title: Schema Evolution and Migration Strategy
status: To Do
assignee: []
created_date: '2026-03-14 04:00'
updated_date: '2026-03-14 04:00'
labels:
  - docs
  - trust-critical
  - schema
dependencies: []
references:
  - shared/src/schema.ts
  - docs/system/TYPE_OWNERSHIP.md
  - docs/system/DEFINITION_OF_DONE.md
parent_task_id: TASK-44
priority: medium
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
No documentation explains how schema changes in `shared/src/schema.ts` are validated for backward compatibility, how replay data should be migrated when schemas evolve, or what the versioning/deprecation strategy is for wire contracts. `TYPE_OWNERSHIP.md` covers where types live but not the change process. `DEFINITION_OF_DONE.md` requires reviewing "replay, hash-chain, transaction-log, and audit implications" for state-touching changes, but no playbook exists for how to do this safely.

**Concern sources:**
- **Gordon**: Classified missing schema migration strategy as **HIGH** priority. Recommended `docs/system/SCHEMA_EVOLUTION_STRATEGY.md` covering: schema versioning model, backward-compatibility window, replay data test strategy, release notes template for schema changes. Also flagged missing backward-compatibility and migration documentation as a standalone finding.
- **Cursor/GPT-5.2**: Noted "no explicit schema migration docs" and recommended establishing a "generated-doc policy for backward-compatibility impact."
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A `docs/system/SCHEMA_EVOLUTION_STRATEGY.md` (or equivalent section in an existing doc) exists documenting: schema versioning model, rules for adding/removing/renaming fields, backward-compatibility window, and deprecation timeline.
- [ ] #2 The strategy documents replay data implications — how old match data is handled when schemas change.
- [ ] #3 The strategy documents the client/server contract negotiation during schema transitions (e.g., SCHEMA_VERSION handling).
- [ ] #4 `DEFINITION_OF_DONE.md` links to the strategy for cross-package and schema changes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Review current schema versioning: `SCHEMA_VERSION` in `shared/src/schema.ts`, `pnpm schema:check` behavior.
2. Review `TYPE_OWNERSHIP.md` for existing guidance on cross-package type changes.
3. Draft `docs/system/SCHEMA_EVOLUTION_STRATEGY.md` covering: versioning model, backward-compat rules, replay migration strategy, deprecation timeline, release notes template.
4. Link from `DEFINITION_OF_DONE.md` change-specific additions table.
5. Run `pnpm lint:md` and `pnpm schema:check` to verify.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 **Spec alignment (DoD §1)**: Schema evolution strategy is consistent with existing `TYPE_OWNERSHIP.md` and `DEFINITION_OF_DONE.md` requirements.
- [ ] #2 **Fair play and trust (DoD §3)**: Replay, hash-chain, and audit implications of schema changes are explicitly addressed.
- [ ] #3 **Accessibility (DoD §6)**: A contributor making a schema change can follow the documented strategy without reverse-engineering the process from code.
<!-- DOD:END -->
