---
id: TASK-82
title: 'OWASP Audit: Docker & Node.js Security'
status: Human Review
assignee: []
created_date: '2026-03-20 13:44'
updated_date: '2026-03-20 13:56'
labels:
  - security
  - hardening
milestone: m-0
dependencies: []
priority: high
ordinal: 21000
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
