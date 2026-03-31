---
id: TASK-152
title: Define Collector-First Observability Policy
status: Human Review
assignee:
  - '@codex'
created_date: '2026-03-31 23:59'
updated_date: '2026-03-31 23:59'
labels: []
dependencies:
  - TASK-149
references:
  - >-
    backlog/decisions/decision-026 - DEC-2F-001 - OTel-native observability and
    Sentry deprecation.md
  - docs/system/GLOSSARY.md
priority: high
---

## Description

Define the canonical collector-first observability policy so applications emit
to a collector boundary, collectors own routing/transformation concerns, and
the centralized LGTM stack remains the single supported backend.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The canonical observability decision states that applications emit to a collector boundary rather than owning backend routing directly.
- [x] #2 The glossary defines the collector-first terms needed to explain the architecture consistently.
- [x] #3 Active operator/contributor docs reflect the collector-first policy instead of backend-coupled wording.
<!-- AC:END -->

## Implementation Notes

- Expanded `decision-026` to define the collector boundary as mandatory policy,
  not just an implementation preference.
- Added glossary entries for `Collector Boundary`, `Local Collector`, and
  `Centralized LGTM Stack`.
- Updated active docs so the architecture reads as one backend with optional
  agent/sidecar/local-collector forwarding tiers.

## Verification

- `rtk pnpm exec markdownlint-cli2 AGENTS.md docs/system/GLOSSARY.md docs/system/DEVELOPER_GUIDE.md docs/system/ENVIRONMENT_VARIABLES.md docs/system/SECRETS_AND_ENV.md docs/system/PNPM_SCRIPTS.md docs/system/OPERATIONS_RUNBOOK.md "backlog/decisions/decision-026 - DEC-2F-001 - OTel-native observability and Sentry deprecation.md" "backlog/tasks/task-145 - Workstream-OTel-native-Observability-Migration.md" "backlog/tasks/task-152 - Define-Collector-First-Observability-Policy.md" --config .markdownlint-cli2.jsonc`
- `rtk rg -n "collector boundary|Centralized LGTM Stack|Local Collector" docs/system/GLOSSARY.md "backlog/decisions/decision-026 - DEC-2F-001 - OTel-native observability and Sentry deprecation.md" docs/system/DEVELOPER_GUIDE.md docs/system/ENVIRONMENT_VARIABLES.md docs/system/OPERATIONS_RUNBOOK.md`
