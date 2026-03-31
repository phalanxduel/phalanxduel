---
id: TASK-149
title: Final Observability Verification Pass
status: To Do
assignee: []
created_date: '2026-03-31 23:59'
labels: []
dependencies:
  - TASK-147
  - TASK-148
references:
  - >-
    backlog/decisions/decision-026 - DEC-2F-001 - OTel-native observability
    and Sentry deprecation.md
priority: high
---

## Description

Run the final verification pass for the OTel-native migration and confirm that
active repo surfaces no longer present Sentry or SigNoz as supported
architecture.

## Rationale

The migration is only complete when the active repo tells one coherent story.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 No active repo surface refers to SigNoz as a supported observability backend.
- [ ] #2 No active repo surface refers to Sentry as a supported observability, release, or runtime dependency.
- [ ] #3 The remaining observability guidance is coherent across docs, tooling, and backlog records.
<!-- AC:END -->

## Expected Outputs

- Final verification evidence
- Residual-risk summary
- Review-ready closeout for the observability migration tranche

## Do Not Break

- Do not certify completion while active Sentry or SigNoz references remain in
  supported repo surfaces.
