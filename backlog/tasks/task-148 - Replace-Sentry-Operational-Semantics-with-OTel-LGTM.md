---
id: TASK-148
title: Replace Sentry Operational Semantics with OTel/LGTM
status: To Do
assignee: []
created_date: '2026-03-31 23:59'
labels: []
dependencies:
  - TASK-146
references:
  - docs/system/OPERATIONS_RUNBOOK.md
  - docs/system/PERFORMANCE_SLOS.md
  - docs/system/SECURITY_STRATEGY.md
priority: high
---

## Description

Replace remaining Sentry-based triage, incident, and performance language with
OTel- and LGTM-based operational semantics.

## Rationale

The repo still contains operator guidance and performance language that assume
Sentry dashboards or Sentry-native issue semantics. That has to be rewritten so
operations match the new architecture.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Runbooks, SLO docs, and security guidance no longer assume Sentry dashboards, releases, or issue semantics.
- [ ] #2 Operational workflows point to OTel signals, collector behavior, and centralized LGTM triage instead.
- [ ] #3 Remaining observability language is vendor-neutral or explicitly LGTM-backed rather than Sentry-centric.
<!-- AC:END -->

## Expected Outputs

- Updated runbooks and SLOs
- OTel/LGTM triage semantics
- Reduced vendor-specific operator language

## Do Not Break

- Do not weaken operational clarity while removing Sentry terminology.
