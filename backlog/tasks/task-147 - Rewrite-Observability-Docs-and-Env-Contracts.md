---
id: TASK-147
title: Rewrite Observability Docs and Env Contracts
status: Human Review
assignee:
  - '@codex'
created_date: '2026-03-31 23:59'
updated_date: '2026-04-01 01:17'
labels: []
dependencies:
  - TASK-146
references:
  - README.md
  - docs/system/ENVIRONMENT_VARIABLES.md
  - docs/system/SECRETS_AND_ENV.md
  - docs/system/PNPM_SCRIPTS.md
priority: high
---

## Description

Rewrite the active documentation and environment-contract surfaces so they
describe an OTel-native, LGTM-backed observability model with no supported
Sentry path.

## Rationale

If the docs and env guidance still teach Sentry, the repo will continue to
drift even after code/tooling cleanup.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Active docs no longer describe Sentry as a supported backend, release system, or env contract.
- [x] #2 Environment-variable and secrets guidance is rewritten around OTel and LGTM terminology only.
- [x] #3 Contributor and operator entry points teach one coherent observability workflow.
<!-- AC:END -->

## Expected Outputs

- Updated observability docs
- Updated env/secrets contract
- Consistent contributor/operator guidance

## Implementation Notes

- Rewrote `docs/system/ENVIRONMENT_VARIABLES.md` into an OTel/LGTM-only
  reference and removed the deprecated Sentry DSN, release, profiling, and
  source-map token contract.
- Rewrote `docs/system/SECRETS_AND_ENV.md` so the supported secrets model is
  `OTEL_EXPORTER_OTLP_ENDPOINT` plus `LGTM_OTLP_ENDPOINT`, not Sentry DSNs or
  Sentry auth tokens.
- Updated contributor/operator entry points in `README.md`,
  `docs/system/PNPM_SCRIPTS.md`, and `docs/seo/ROBOTS_ROUTE_SITEMAP.md` so they
  no longer teach a Sentry path.

## Verification

- `pnpm exec markdownlint-cli2 README.md docs/seo/ROBOTS_ROUTE_SITEMAP.md docs/system/ENVIRONMENT_VARIABLES.md docs/system/SECRETS_AND_ENV.md docs/system/PNPM_SCRIPTS.md "backlog/tasks/task-147 - Rewrite-Observability-Docs-and-Env-Contracts.md" --config .markdownlint-cli2.jsonc`
- `rg -n -i "SENTRY_|sentry" README.md docs/seo/ROBOTS_ROUTE_SITEMAP.md docs/system/ENVIRONMENT_VARIABLES.md docs/system/SECRETS_AND_ENV.md docs/system/PNPM_SCRIPTS.md`

## Do Not Break

- Do not erase necessary release or deployment guidance; reframe it around the
  supported OTel-only model.
