---
id: TASK-49
title: Version Semantics Documentation for External Clients
status: To Do
assignee: []
created_date: '2026-03-17'
updated_date: '2026-03-29 22:28'
labels:
  - docs
  - api
milestone: m-1
dependencies:
  - TASK-48
priority: low
ordinal: 4900
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
External clients need clear guidance on which version identifier to use
for compatibility checks. `docs/RULE_AMENDMENTS.md` RA-002 provides the
basic clarification but a dedicated versioning guide would help.

## Planned Change

1. Add a `docs/VERSIONING.md` explaining the version scheme
2. Add version fields to the `/api/defaults` response metadata
3. Document the compatibility matrix (which `specVersion` works with which
   `SCHEMA_VERSION` ranges)

## Verification

- `docs/VERSIONING.md` exists with clear guidance
- `/api/defaults` response includes version metadata
- `docs/RULE_AMENDMENTS.md` RA-002 links to the new doc
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Task objectives are met as described in the mission.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 **Spec Alignment (DoD §1)**: Implementation matches canonical rules and architectural constraints.
- [ ] #2 **Verification (DoD §2)**: All changes are covered by automated tests and manual verification evidence is recorded.
- [ ] #3 **Trust and Safety (DoD §3)**: The server remains authoritative; no secrets or hidden info leaked.
- [ ] #4 **Code Quality (DoD §4)**: Code follows project conventions, modularity, and naming standards.
- [ ] #5 **Observability (DoD §5)**: Critical paths emit necessary logs and telemetry for operations.
- [ ] #6 **Accessibility (DoD §6)**: Changes are documented and understandable for contributors and users.
- [ ] #7 **AI-Assisted Work (DoD §7)**: AI changes are reviewed by a human and follow AGENTS.md.
<!-- DOD:END -->
