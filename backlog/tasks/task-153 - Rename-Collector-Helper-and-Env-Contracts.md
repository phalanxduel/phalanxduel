---
id: TASK-153
title: Rename Collector Helper and Env Contracts
status: Human Review
assignee:
  - '@codex'
created_date: '2026-03-31 23:59'
updated_date: '2026-03-31 23:59'
labels: []
dependencies:
  - TASK-152
references:
  - package.json
  - bin/maint/run-otel-collector.sh
  - config/otel/otel-collector.local.upstream.yaml
priority: high
---

## Description

Rename active helper commands, script paths, config paths, and upstream env
contracts so local collector plumbing no longer reads like a second backend.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Active helper command naming distinguishes the local collector from the centralized backend.
- [x] #2 The collector helper uses backend-neutral upstream OTLP env naming in active repo surfaces.
- [x] #3 Active script/config/container naming no longer suggests that the local collector is another LGTM instance.
<!-- AC:END -->

## Implementation Notes

- Renamed the root helper command from `pnpm infra:otel:lgtm` to
  `pnpm infra:otel:collector`.
- Renamed the helper script to `bin/maint/run-otel-collector.sh` and the local
  collector config to `config/otel/otel-collector.local.upstream.yaml`.
- Replaced the active helper env contract with `OTEL_UPSTREAM_OTLP_ENDPOINT`
  and renamed the runtime container to `phalanx-otel-collector`.

## Verification

- `rtk rg -n "infra:otel:collector|run-otel-collector|OTEL_UPSTREAM_OTLP_ENDPOINT|phalanx-otel-collector" AGENTS.md package.json bin/maint config/otel docs --glob '!backlog/**' --glob '!docs/archive/**'`
- `rtk rg -n "infra:otel:lgtm|run-otel-lgtm|LGTM_OTLP_ENDPOINT|phalanx-otel-lgtm" AGENTS.md package.json bin/maint config/otel docs --glob '!backlog/**' --glob '!docs/archive/**'`
