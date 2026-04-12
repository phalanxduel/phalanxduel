---
id: TASK-149
title: Final Observability Verification Pass
status: Done
assignee:
  - '@codex'
created_date: '2026-03-31 23:59'
updated_date: '2026-04-01 03:43'
labels: []
dependencies:
  - TASK-147
  - TASK-148
references:
  - >-
    docs/adr/decision-026 - DEC-2F-001 - OTel-native observability and
    Sentry deprecation.md
priority: high
ordinal: 65000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Run the final verification pass for the OTel-native migration and confirm that
active repo surfaces no longer present Sentry or SigNoz as supported
architecture.

## Rationale

The migration is only complete when the active repo tells one coherent story.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 No active repo surface refers to SigNoz as a supported observability backend.
- [x] #2 No active repo surface refers to Sentry as a supported observability, release, or runtime dependency.
- [x] #3 The remaining observability guidance is coherent across docs, tooling, and backlog records.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- 2026-03-31: Final verification sweep found no active SigNoz references outside
  historical/completed backlog surfaces, but active generated API/SDK artifacts
  still exposed `observability.sentry_initialized` from stale OpenAPI outputs.
- 2026-03-31: Backlog CLI status update was attempted first, but this sandbox
  could not acquire `.git/index.lock`; task metadata is updated directly in the
  markdown record for this turn.
- 2026-03-31: Re-ran `pnpm openapi:gen` and `pnpm sdk:gen`; the generated
  artifacts were already aligned with the current `otel_active` health schema,
  so the remaining active Sentry/SigNoz references were limited to historical
  wording in `CHANGELOG.md`.

## Do Not Break

- Do not certify completion while active Sentry or SigNoz references remain in
  supported repo surfaces.

## Verification

- `rtk rg -n -i "sentry|signoz" CHANGELOG.md README.md docs .github scripts package.json bin admin client server shared sdk clients --glob '!**/node_modules/**' --glob '!docs/archive/**'`
- `rtk pnpm openapi:gen`
- `rtk pnpm sdk:gen`
- `rtk pnpm --filter @phalanxduel/server test -- openapi.test.ts`
<!-- SECTION:NOTES:END -->

## Expected Outputs

- Final verification evidence
- Residual-risk summary
- Review-ready closeout for the observability migration tranche
