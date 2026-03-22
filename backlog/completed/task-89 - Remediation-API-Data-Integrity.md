---
id: TASK-89
title: 'Remediation: API & Data Integrity'
status: Done
assignee: []
created_date: '2026-03-20 15:25'
updated_date: '2026-03-20 18:31'
labels:
  - security
  - hardening
milestone: m-0
dependencies: []
priority: medium
ordinal: 67000
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
