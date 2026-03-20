---
id: TASK-78
title: 'OWASP Audit: Authorization & Access Control'
status: To Do
assignee: []
created_date: '2026-03-20 13:44'
updated_date: '2026-03-20 13:46'
labels:
  - security
  - hardening
milestone: m-0
dependencies: []
priority: high
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evaluate the system against the [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) and [Access Control Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html). Focus on player-to-match ownership and admin privilege boundaries.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Audit MatchManager and route handlers against OWASP Access Control/Authorization Cheat Sheets.
- [ ] #2 Verify that playerIndex and playerId cannot be used to manipulate opponent state (IDOR).
- [ ] #3 Ensure admin dashboard routes are strictly isolated and authorized.
<!-- AC:END -->
