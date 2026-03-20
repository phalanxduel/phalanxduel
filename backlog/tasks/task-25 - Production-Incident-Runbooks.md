---
id: TASK-25
title: Production Incident Runbooks
status: Human Review
assignee: []
created_date: ''
updated_date: '2026-03-20 18:19'
labels:
  - infrastructure
  - reliability
  - documentation
dependencies: []
priority: high
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Production readiness is not just code quality; operators need a reliable
playbook when matches get stuck, migrations misbehave, or replay disputes need
investigation. This task creates the operational runbooks that turn scattered
tribal knowledge into repeatable incident procedures.

## Problem Scenario

Given a production incident occurs, when an engineer needs to respond quickly,
then the current repo does not provide one canonical runbook that covers common
Phalanx Duel failure modes and the concrete commands or evidence needed to
resolve them safely.

## Planned Change

Create an operations runbook that covers the highest-risk incidents first:
stuck-match recovery, deployment rollback, database rollback, Sentry triage, and
replay-based dispute investigation. This plan prioritizes the failure modes most
likely to block gameplay or trust in ranked results.

## Delivery Steps

- Given the current production-readiness reports, when the runbook is authored,
  then the document consolidates the repeated operational recommendations into a
  single canonical entry point.
- Given an incident category, when an operator follows the runbook, then the
  expected checks, commands, and rollback boundaries are explicit.
- Given the runbook is published, when future incidents occur, then support
  engineers do not need to reconstruct procedures from review archives.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- Given the operations documentation, when engineers open it, then there is a
  canonical runbook covering stuck matches, migration rollback, deploy/rollback,
  Sentry triage, and replay/dispute investigation.
- Given a runbook section, when it describes a response path, then it includes
  preconditions, evidence to collect, and exit criteria.
- Given production support rotation or handoff, when another engineer reads the
  runbook, then they can execute the documented workflow without hidden context.

## References
- `archive/ai-reports/2026-03-11/Gemini-2.0-Flash-Exp/production-readiness-report.md` (L141)
- `archive/ai-reports/2026-03-11/Gordon-Default/production-readiness-report.md` (L740)
- `archive/ai-reports/2026-03-11/cursor-gpt-5.2/2026-03-10__production-readiness-report.md` (L123)
- `archive/ai-reports/2026-03-11/Claude-Opus/production-readiness-report.md` (L235)

- [x] #1 Stuck-match recovery procedures defined.
- [x] #2 Deployment rollback steps documented for Fly.io.
- [x] #3 Database migration triage and rollback policy established.
- [x] #4 Secret exposure response plan formalized.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Created `docs/operations/INCIDENT_RUNBOOKS.md`.
- Consolidated procedures for match recovery, deployment rollbacks, and secret rotations.
- Integrated `transaction_logs` into the triage workflow for stuck matches.
- Provided specific CLI commands for Fly.io and Drizzle operations.
<!-- SECTION:NOTES:END -->

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