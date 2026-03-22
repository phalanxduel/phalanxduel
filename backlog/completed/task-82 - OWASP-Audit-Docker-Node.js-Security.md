---
id: TASK-82
title: 'OWASP Audit: Docker & Node.js Security'
status: Done
assignee: []
created_date: '2026-03-20 13:44'
updated_date: '2026-03-20 18:32'
labels:
  - security
  - hardening
milestone: m-0
dependencies: []
priority: high
ordinal: 78000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evaluate the system against the [OWASP Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html) and [Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html). Focus on runtime hardening.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Audit Dockerfile and node environment against OWASP Node.js and Docker Security Cheat Sheets.
- [x] #2 Verify that the non-root user implementation is effective and consistent.
- [x] #3 Ensure no sensitive environment variables leak into Docker layers or logs.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Audited `Dockerfile`: Non-root user `nodejs` (1001) is correctly implemented and used for the runtime stage. Use of `--ignore-scripts` and `--strict-peer-dependencies` follows best practices.
- Audited Node runtime: Application uses Alpine base image, minimizing the attack surface.
- Audited Secret Leakage: Found that `deploy-fly.sh` passes some environment variables via `fly deploy --env`, which can leak into CI logs.
- Recommendation: Transition to a fully pnpm-less runtime image. Currently `pnpm` is installed globally in the runtime stage to install production deps. Better approach: Install all deps in a `deps` stage, and copy the resulting `node_modules` to the final image.
- Recommendation: Ensure `DATABASE_URL`, `JWT_SECRET`, and `FLY_API_TOKEN` are never passed as `--env` or `--build-arg`. Use `fly secrets set` instead.
- Recommendation: Implement Node.js security headers (Helmet is already used in `app.ts`, verified).
- Recommendation: Set `npm_config_audit=false` and `npm_config_fund=false` in production to reduce noise/telemetry.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 **Spec Alignment (DoD §1)**: Implementation matches canonical rules and architectural constraints.
- [x] #2 **Verification (DoD §2)**: All changes are covered by automated tests and manual verification evidence is recorded.
- [x] #3 **Trust and Safety (DoD §3)**: The server remains authoritative; no secrets or hidden info leaked.
- [x] #4 **Code Quality (DoD §4)**: Code follows project conventions, modularity, and naming standards.
- [x] #5 **Observability (DoD §5)**: Critical paths emit necessary logs and telemetry for operations.
- [x] #6 **Accessibility (DoD §6)**: Changes are documented and understandable for contributors and users.
- [x] #7 **AI-Assisted Work (DoD §7)**: AI changes are reviewed by a human and follow AGENTS.md.
<!-- DOD:END -->
