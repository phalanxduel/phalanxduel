---
id: TASK-92
title: 'Remediation: GHA SHA Pinning (Seal)'
status: Done
assignee: []
created_date: '2026-03-20 15:25'
updated_date: '2026-05-07 16:51'
labels:
  - security
  - hardening
  - ci
milestone: 'm-0: Security Hardening Audit'
dependencies:
  - TASK-84
priority: high
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
[DEFERRED/SEAL TASK] Finalize supply chain security by pinning all GitHub Actions to immutable commit SHAs. To be executed only upon movement out of Beta.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All third-party actions in .github/workflows/*.yml are pinned to full commit SHAs.
- [x] #2 All pinned SHAs are verified against the target version tags.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 **Spec Alignment (DoD §1)**: Implementation matches canonical rules and architectural constraints.
- [x] #2 **Verification (DoD §2)**: All changes are covered by automated tests and manual verification evidence is recorded.
- [x] #3 **Trust and Safety (DoD §3)**: The server remains authoritative; no secrets or hidden info leaked.
- [x] #4 **Code Quality (DoD §4)**: Code follows project conventions, modularity, and naming standards.
- [x] #5 **Observability (DoD §5)**: Critical paths emit necessary logs and telemetry for operations.
- [x] #6 **Accessibility (DoD §6)**: Changes are documented and understandable for contributors and users.
- [x] #7 **AI-Assisted Work (DoD §7)**: AI changes are reviewed by a human and follow AGENTS.md.
<!-- DOD:END -->
