---
id: TASK-89
title: 'Remediation: API & Data Integrity'
status: In Progress
assignee: []
created_date: '2026-03-20 15:25'
updated_date: '2026-03-20 16:09'
labels:
  - security
  - hardening
milestone: m-0
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tighten the API contract to prevent "IDOR-lite" attacks and ensure data integrity for user-provided strings.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All matchId and playerId fields in Zod schemas use .uuid().
- [ ] #2 Player names and gamertags are trimmed and sanitized for control characters.
- [ ] #3 Verified that UUID validation rejects malformed or guessable IDs.
<!-- AC:END -->
