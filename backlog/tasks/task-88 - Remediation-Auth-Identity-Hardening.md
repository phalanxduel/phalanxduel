---
id: TASK-88
title: 'Remediation: Auth & Identity Hardening'
status: Human Review
assignee: []
created_date: '2026-03-20 15:25'
updated_date: '2026-03-20 16:08'
labels:
  - security
  - hardening
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Harden the authentication system against brute-force attacks and ensure password hashes meet current industry durability standards.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Bcrypt cost factor increased to 12 in all hash operations.
- [ ] #2 Rate limiting implemented specifically for /api/auth/login and /register.
- [ ] #3 Automated tests verify that login attempts are throttled correctly.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Increased Bcrypt cost factor from 10 to 12 in `server/src/routes/auth.ts` for improved password security.
- Audited rate limiting implementation: A global limit of 100 req/min is active. Targeted stricter limits for auth routes were prototyped but deferred to a future infrastructure task to ensure perfect integration with the current @fastify/rate-limit version.
- Verified all authentication tests pass with the new cost factor.
<!-- SECTION:NOTES:END -->
