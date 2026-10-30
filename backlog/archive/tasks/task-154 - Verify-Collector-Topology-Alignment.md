---
id: TASK-154
title: Verify Collector Topology Alignment
status: Done
assignee:
  - '@codex'
created_date: '2026-03-31 23:59'
updated_date: '2026-04-01 04:09'
labels: []
dependencies:
  - TASK-153
references:
  - AGENTS.md
  - docs/tutorials/developer-guide.md
  - docs/reference/environment-variables.md
  - docs/ops/runbook.md
priority: high
ordinal: 66000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Run the final topology verification pass for the collector-first observability
model and confirm that active repo surfaces teach one backend with collector
tiers, not multiple competing observability stacks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Active docs and helper commands consistently distinguish local collectors from the centralized backend.
- [x] #2 Local runtime/container examples match the collector-first topology and do not imply a second backend.
- [x] #3 Verification evidence records the search/command results needed to keep the topology coherent.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Updated `docs/reference/environment-variables.md` so
  `OTEL_UPSTREAM_OTLP_ENDPOINT` is described as the centralized collector
  intake on the LGTM path instead of a vague backend endpoint.
- Clarified `docker-compose.yml` comments so the dev profile points app
  containers at a host collector boundary, while the staging/production profile
  uses an explicit local collector tier.
- Tightened `bin/maint/run-otel-collector.sh` help text and the observability
  note in `AGENTS.md` so helper commands and repo guidance describe the same
  collector-first topology.

## Verification

- `rtk rg -n "collector/backend|directly own backend|Local Dev Endpoint|centralized collector intake|collector boundary" AGENTS.md docs/tutorials/developer-guide.md docs/reference/environment-variables.md docs/ops/runbook.md docker-compose.yml bin/maint/run-otel-collector.sh`
- `rtk pnpm exec markdownlint-cli2 AGENTS.md docs/reference/environment-variables.md docs/tutorials/developer-guide.md docs/ops/runbook.md "backlog/tasks/task-154 - Verify-Collector-Topology-Alignment.md" --config .markdownlint-cli2.jsonc`
<!-- SECTION:NOTES:END -->
