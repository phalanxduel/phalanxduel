---
id: TASK-79
title: 'OWASP Audit: Input Validation & Injection Prevention'
status: Human Review
assignee: []
created_date: '2026-03-20 13:44'
updated_date: '2026-03-20 13:52'
labels:
  - security
  - hardening
milestone: m-0
dependencies: []
priority: high
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evaluate the system against the [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) and [Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html). Focus on schema strictness and database query safety.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Audit all Zod schemas against OWASP Input Validation Cheat Sheet.
- [x] #2 Verify SQL injection prevention in Drizzle ORM queries.
- [x] #3 Ensure no OS command injection risks in scripts/ or server handlers.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Audited `shared/src/schema.ts`: Found extremely strict Zod schemas. `ActionSchema` uses `discriminatedUnion` which prevents payload spoofing. `MatchParametersSchema` includes `superRefine` for cross-field consistency checks (e.g. initialDraw formula).
- Audited Database: Verified `server/src/db/match-repo.ts` and `auth.ts` use Drizzle ORM which uses parameterized queries (e.g. `.where(eq(users.id, id))`), effectively preventing SQL injection.
- Audited Command Execution: Found no usage of `eval()`, `child_process.exec()`, or similar dangerous sinks in the server runtime.
- Recommendation: Add `.trim()` and stricter regex to `PlayerSchema.name` to prevent leading/trailing whitespace or control characters in display names.
- Recommendation: Use `z.string().uuid()` for all `matchId` and `playerId` fields in `ClientMessageSchema` (some are currently generic `z.string()`).
- All input is server-validated before reaching the core engine.
<!-- SECTION:NOTES:END -->
