---
id: TASK-81
title: 'OWASP Audit: Content Security Policy'
status: To Do
assignee: []
created_date: '2026-03-20 13:44'
updated_date: '2026-03-20 13:47'
labels:
  - security
  - hardening
milestone: m-0
dependencies: []
priority: medium
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evaluate the system against the [OWASP Content Security Policy (CSP) Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html). Focus on the server-provided CSP headers.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Audit helmet configuration in app.ts against OWASP Content Security Policy Cheat Sheet.
- [ ] #2 Verify that CSP strictly blocks unauthorized script execution and style injection.
- [ ] #3 Ensure Frame-Options and Referrer-Policy headers are correctly set.
<!-- AC:END -->
