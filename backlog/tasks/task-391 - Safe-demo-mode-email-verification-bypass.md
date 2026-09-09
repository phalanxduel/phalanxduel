---
id: TASK-391
title: Safe demo-mode email verification bypass
status: Verification
assignee:
  - '@codex'
created_date: '2026-09-09 09:21'
updated_date: '2026-09-09 09:24'
labels:
  - auth
  - demo
  - security
dependencies: []
modified_files:
  - server/src/demo-mode.ts
  - server/src/routes/auth.ts
  - bin/phx-demo-ctl
  - docs/configuration.md
  - docs/reference/environment-variables.md
priority: high
type: feature
ordinal: 268800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow local Phalanx Duel demo registrations to use accounts without email confirmation while preserving verification requirements outside explicitly enabled demo mode.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Demo mode is explicit and local-only; production and staging fail closed.
- [ ] #2 New demo registrations are marked verified and do not send confirmation/welcome email.
- [ ] #3 Normal registration behavior remains unchanged when demo mode is disabled.
- [ ] #4 Documentation describes activation, safety constraints, and reset procedure.
- [ ] #5 Automated tests cover enabled and disabled behavior.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented explicit local demo switch. bin/phx-demo-ctl exports PHALANX_DEMO_MODE=1 and defaults PHALANX_DEMO_SKIP_EMAIL_VERIFICATION=1. Registration stores emailVerifiedAt immediately and suppresses welcome email only when APP_ENV resolves to local; all other environments retain existing behavior. Added configuration documentation. Server tsc passed; commits 9160294 and a8ff510.
<!-- SECTION:NOTES:END -->
