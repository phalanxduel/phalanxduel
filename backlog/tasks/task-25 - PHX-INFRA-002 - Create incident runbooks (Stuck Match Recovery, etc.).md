---
id: PHX-INFRA-002
status: todo
priority: high
---

# PHX-INFRA-002 - Create incident runbooks (Stuck Match Recovery, etc.)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create comprehensive operational runbooks to guide incident response and production support. This is a critical requirement for production readiness to ensure that common issues can be handled systematically.
<!-- SECTION:DESCRIPTION:END -->

## Requirements
- Create `docs/operations/RUNBOOK.md`.
- Include procedures for:
  - Stuck Match Recovery: Restoring match state from transaction logs.
  - Database Migration Rollback.
  - Sentry Alert Triage.
  - Deploy/Rollback procedures.
  - Replay verification and dispute investigation.
  - Emergency scaling or rate-limit adjustments.

## References
- `docs/review/archive/2026-03-11/Gemini-2.0-Flash-Exp/production-readiness-report.md` (L141)
- `docs/review/archive/2026-03-11/Gordon-Default/production-readiness-report.md` (L740)
- `docs/review/archive/2026-03-11/cursor-gpt-5.2/2026-03-10__production-readiness-report.md` (L123)
- `docs/review/archive/2026-03-11/Claude-Opus/production-readiness-report.md` (L235)
