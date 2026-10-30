---
id: TASK-148
title: Replace Sentry Operational Semantics with OTel/LGTM
status: Done
assignee:
  - '@codex'
created_date: '2026-03-31 23:59'
updated_date: '2026-04-01 03:43'
labels: []
dependencies:
  - TASK-146
references:
  - docs/ops/runbook.md
  - docs/ops/slo.md
  - docs/architecture/security-strategy.md
priority: high
ordinal: 64000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace remaining Sentry-based triage, incident, and performance language with
OTel- and LGTM-based operational semantics.

## Rationale

The repo still contains operator guidance and performance language that assume
Sentry dashboards or Sentry-native issue semantics. That has to be rewritten so
operations match the new architecture.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Runbooks, SLO docs, and security guidance no longer assume Sentry dashboards, releases, or issue semantics.
- [x] #2 Operational workflows point to OTel signals, collector behavior, and centralized LGTM triage instead.
- [x] #3 Remaining observability language is vendor-neutral or explicitly LGTM-backed rather than Sentry-centric.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Replaced the last Sentry-centric operator language in
  `docs/ops/runbook.md` with LGTM/Tempo/Loki-based triage and
  collector-backed monitoring language.
- Updated `docs/ops/slo.md` so latency and state-broadcast
  investigation point at OTLP traces and centralized LGTM dashboards rather
  than Sentry issue semantics.
- Updated `docs/architecture/security-strategy.md` to refer to telemetry validation
  tooling generically instead of Sentry-specific debug surfaces.

## Verification

- `pnpm exec markdownlint-cli2 docs/ops/runbook.md docs/ops/slo.md docs/architecture/security-strategy.md "backlog/tasks/task-148 - Replace-Sentry-Operational-Semantics-with-OTel-LGTM.md" --config .markdownlint-cli2.jsonc`
- `rg -n -i "sentry" docs/ops/runbook.md docs/ops/slo.md docs/architecture/security-strategy.md`

## Do Not Break

- Do not weaken operational clarity while removing Sentry terminology.
<!-- SECTION:NOTES:END -->

## Expected Outputs

- Updated runbooks and SLOs
- OTel/LGTM triage semantics
- Reduced vendor-specific operator language
