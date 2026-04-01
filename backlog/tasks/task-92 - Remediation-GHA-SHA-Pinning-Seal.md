---
id: TASK-92
title: 'Remediation: GHA SHA Pinning (Seal)'
status: Planned
assignee: []
created_date: '2026-03-20 15:25'
updated_date: '2026-04-01 20:23'
labels:
  - security
  - hardening
  - ci
milestone: 'm-0: Security Hardening Audit'
dependencies:
  - TASK-84
priority: low
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
[DEFERRED/SEAL TASK] Finalize supply chain security by pinning all GitHub Actions to immutable commit SHAs. To be executed only upon movement out of Beta.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All third-party actions in .github/workflows/*.yml are pinned to full commit SHAs.
- [ ] #2 All pinned SHAs are verified against the target version tags.
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
