---
id: TASK-152
title: Define Collector-First Observability Policy
status: Done
assignee:
  - '@codex'
created_date: '2026-03-31 23:59'
updated_date: '2026-04-01 03:06'
labels: []
dependencies:
  - TASK-149
references:
  - >-
    docs/adr/decision-026 - DEC-2F-001 - OTel-native observability and
    Sentry deprecation.md
  - docs/reference/glossary.md
priority: high
ordinal: 61000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Define the canonical collector-first observability policy so applications emit
to a collector boundary, collectors own routing/transformation concerns, and
the centralized LGTM stack remains the single supported backend.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The canonical observability decision states that applications emit to a collector boundary rather than owning backend routing directly.
- [x] #2 The glossary defines the collector-first terms needed to explain the architecture consistently.
- [x] #3 Active operator/contributor docs reflect the collector-first policy instead of backend-coupled wording.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Expanded `decision-026` to define the collector boundary as mandatory policy,
  not just an implementation preference.
- Added glossary entries for `Collector Boundary`, `Local Collector`, and
  `Centralized LGTM Stack`.
- Updated active docs so the architecture reads as one backend with optional
  agent/sidecar/local-collector forwarding tiers.

## Verification

- `rtk pnpm exec markdownlint-cli2 AGENTS.md docs/reference/glossary.md docs/tutorials/developer-guide.md docs/reference/environment-variables.md docs/tutorials/secrets-and-env.md docs/reference/pnpm-scripts.md docs/ops/runbook.md "docs/adr/decision-026 - DEC-2F-001 - OTel-native observability and Sentry deprecation.md" "backlog/tasks/task-145 - Workstream-OTel-native-Observability-Migration.md" "backlog/tasks/task-152 - Define-Collector-First-Observability-Policy.md" --config .markdownlint-cli2.jsonc`
- `rtk rg -n "collector boundary|Centralized LGTM Stack|Local Collector" docs/reference/glossary.md "docs/adr/decision-026 - DEC-2F-001 - OTel-native observability and Sentry deprecation.md" docs/tutorials/developer-guide.md docs/reference/environment-variables.md docs/ops/runbook.md`
<!-- SECTION:NOTES:END -->
