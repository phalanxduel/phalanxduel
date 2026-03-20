---
id: TASK-88
title: 'Remediation: Auth & Identity Hardening'
status: To Do
assignee: []
created_date: '2026-03-20 15:25'
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
- [ ] #1 Bcrypt cost factor increased to 12 in all hash operations.
- [ ] #2 Rate limiting implemented specifically for /api/auth/login and /register.
- [ ] #3 Automated tests verify that login attempts are throttled correctly.
<!-- AC:END -->
