---
id: TASK-245
title: TASK-245 - Identity Hardening & Compliance
status: Done
assignee: []
created_date: '2026-04-28 02:59'
updated_date: '2026-05-01 22:40'
labels: []
milestone: Post-Promotion Hardening
dependencies: []
ordinal: 8120
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 1. Implement rate limiting on auth routes (forgot-password, login). 2. Add session revocation/invalidation on password change (Security Stamp). 3. Implement account lockout after failed attempts. 4. Add data portability (Export My Data) endpoint. 5. Audit log sensitive identity changes.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented all five hardening items: (1) Rate limiting on login (10 req/15 min per IP) and forgot-password (3 req/hr per IP) via @fastify/rate-limit route config. (2) Account lockout: loginFailedAttempts + loginLockedUntil columns on users, 15-min lockout after 5 failures, auto-cleared on success, 423 ACCOUNT_LOCKED response with Retry-After header. (3) Security stamp: securityStamp column rotated on any password change; /api/auth/me rejects tokens whose stamp no longer matches DB, revoking all pre-change sessions. (4) GET /api/auth/export returns full profile, match history, achievements, ratings, and identity audit log. (5) identity_audit_log table records email_changed, gamertag_changed, password_changed, account_locked with IP. Migration 0008_identity_hardening.sql. New PATCH /api/auth/password endpoint for authenticated password changes. 326 server tests pass.
<!-- SECTION:FINAL_SUMMARY:END -->
