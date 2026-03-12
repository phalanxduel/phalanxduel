---
id: TASK-25
title: 'PHX-INFRA-002 - Create incident runbooks (Stuck Match Recovery, etc.)'
status: To Do
priority: high
---

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
- `archive/ai-reports/2026-03-11/Gemini-2.0-Flash-Exp/production-readiness-report.md` (L141)
- `archive/ai-reports/2026-03-11/Gordon-Default/production-readiness-report.md` (L740)
- `archive/ai-reports/2026-03-11/cursor-gpt-5.2/2026-03-10__production-readiness-report.md` (L123)
- `archive/ai-reports/2026-03-11/Claude-Opus/production-readiness-report.md` (L235)
