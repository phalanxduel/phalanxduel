---
id: TASK-29
title: Threat Model and Security Strategy
status: Human Review
assignee: []
created_date: ''
updated_date: '2026-03-20 13:39'
labels:
  - security
  - documentation
dependencies: []
priority: high
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Security-sensitive behavior already exists across auth, admin routes, telemetry,
and deployment, but there is still no one document that explains the trust
boundaries and the intended response to abuse. This task makes the project's
security posture reviewable instead of implicit.

## Problem Scenario

Given the repo now includes authentication, admin surfaces, replay validation,
and production observability, when an engineer asks what the system trusts and
what attacks are in scope, then the answer is spread across code and archived
reviews rather than one maintained threat model.

## Planned Change

Document the system trust boundaries, abuse surfaces, secret-handling model, and
security strategy in a way that maps directly onto the current code layout. This
plan produces a reviewable baseline first, then clearly labels optional future
work such as cryptographic signing instead of mixing aspirational security work
with the present-day operating model.

## Delivery Steps

- Given the current architecture, when the threat model is written, then the
  main boundaries between client, server, DB, and admin tooling are explicit.
- Given auth and admin paths, when the security strategy is documented, then
  secret handling, abuse detection, and privileged routes are covered.
- Given future hardening ideas, when they are mentioned, then the document
  separates in-scope protections from optional later work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- Given the security document, when engineers read it, then the system's trust
  boundaries and main threat categories are explicit.
- Given auth, admin, and replay-related features, when the strategy is reviewed,
  then the relevant abuse and secret-handling expectations are documented.
- Given future ideas such as cryptographic signing, when the document mentions
  them, then it clearly states whether they are current policy or future work.

## References
- `archive/ai-reports/2026-03-11/cursor-gpt-5.2/2026-03-10__production-readiness-report.md` (L139, L216)
- `server/src/routes/auth.ts`
- `server/src/app.ts`
- `docs/system/ADMIN.md`

- [x] #1 Formal STRIDE-based threat model documented in SECURITY_STRATEGY.md.
- [x] #2 Match Log API (GET /matches/:id/log) redacts card details for non-participants.
- [x] #3 Match Log API requires participant identity (JWT or X-Header) for unredacted access.
- [x] #4 JWT_SECRET is enforced in production environments.
- [x] #5 Session cookies use Secure, HttpOnly, and SameSite:strict flags.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Created `docs/system/SECURITY_STRATEGY.md` with full STRIDE analysis.
- Implemented `redactPhalanxEvents` and `filterEventLogForPublic` in `server/src/match.ts`.
- Updated `server/src/routes/matches.ts` to perform identity-based log redaction.
- Added production `JWT_SECRET` check in `server/src/app.ts`.
- Hardened cookie settings in `server/src/routes/auth.ts`.
- All verification tests passing.
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