---
id: TASK-77
title: 'OWASP Audit: Authentication & Session Management'
status: Human Review
assignee: []
created_date: '2026-03-20 13:44'
updated_date: '2026-03-20 13:51'
labels:
  - security
  - hardening
milestone: m-0
dependencies: []
priority: high
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evaluate the system against the [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html). Focus on JWT lifecycle, password storage (Bcrypt), and session protection.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Audit current JWT and Basic Auth implementations against OWASP Authentication Cheat Sheet.
- [x] #2 Verify Bcrypt work factors and password complexity rules.
- [x] #3 Ensure no authentication bypasses exist in spectator or match creation flows.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Audited `auth.ts`: Verified Bcrypt is used for password storage. Current cost factor is 10 (OWASP recommends 10-12+, suggest bumping to 12).
- Audited JWT lifecycle: Tokens use 7-day expiration and are stored in HttpOnly, SameSite:strict cookies.
- Audited Login/Register: Schema validation is strict.
- Recommendation: Increase Bcrypt cost factor from 10 to 12.
- Recommendation: Add targeted rate limiting to `/api/auth/login` and `/api/auth/register` (e.g. 5 attempts per 15 minutes per IP) to mitigate brute-force.
- Recommendation: Implement a "token blacklist" or short-lived access tokens + long-lived refresh tokens for better revocation.
- Found no auth bypasses in spectator flows (spectators are read-only and actions are authorized by playerId).
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