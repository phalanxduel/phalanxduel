---
id: TASK-147
title: Rewrite Observability Docs and Env Contracts
status: To Do
assignee: []
created_date: '2026-03-31 23:59'
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
- [ ] #1 Active docs no longer describe Sentry as a supported backend, release system, or env contract.
- [ ] #2 Environment-variable and secrets guidance is rewritten around OTel and LGTM terminology only.
- [ ] #3 Contributor and operator entry points teach one coherent observability workflow.
<!-- AC:END -->

## Expected Outputs

- Updated observability docs
- Updated env/secrets contract
- Consistent contributor/operator guidance

## Do Not Break

- Do not erase necessary release or deployment guidance; reframe it around the
  supported OTel-only model.
