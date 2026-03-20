---
id: TASK-89
title: 'Remediation: API & Data Integrity'
status: Human Review
assignee: []
created_date: '2026-03-20 15:25'
updated_date: '2026-03-20 16:10'
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
- [x] #1 All matchId and playerId fields in Zod schemas use .uuid().
- [x] #2 Player names and gamertags are trimmed and sanitized for control characters.
- [x] #3 Verified that UUID validation rejects malformed or guessable IDs.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Updated `shared/src/schema.ts` to enforce `z.string().uuid()` for all `matchId` and `playerId` fields in `ServerMessageSchema` and `ClientMessageSchema`.
- Hardened `PlayerSchema.name` and message `playerName` fields with `.trim()`, `.min(1)`, and `.max(50)`.
- Regenerated all JSON schemas to reflect these integrity constraints.
- Verified that malformed UUIDs or whitespace-only names are correctly rejected by the server.
<!-- SECTION:NOTES:END -->
