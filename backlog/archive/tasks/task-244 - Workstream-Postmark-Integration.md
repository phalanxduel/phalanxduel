---
id: TASK-244
title: 'Workstream: Postmark Integration'
status: Done
assignee:
  - '@antigravity'
created_date: '2026-04-27 23:42'
updated_date: '2026-04-30 19:21'
labels: []
dependencies: []
ordinal: 115000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 1. Postmark client is configured. 2. Password reset workflow sends valid emails. 3. Profile subscription/notification scaffolding is implemented.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Install `postmark` SDK in the server workspace.
2. Update database schema (`server/src/db/schema.ts`) to add a `password_reset_tokens` table and notification preference scaffolding.
3. Generate and run database migrations.
4. Implement `server/src/utils/mailer.ts` to wrap the Postmark client. Make it resilient to missing API keys for local dev.
5. Add Fastify routes for `/api/auth/forgot-password` and `/api/auth/reset-password`.
6. Implement email templates or basic HTML layouts for the reset email.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added `password_reset_tokens` table to track tokens with hashes and expiration dates.
- Modified `users` table to include an `email_notifications` boolean (scaffolding).
- Added `server/src/utils/mailer.ts` with a Postmark `ServerClient` singleton. Gracefully degrades if `POSTMARK_SERVER_TOKEN` is unset.
- Fastify routes `/api/auth/forgot-password` and `/api/auth/reset-password` successfully implemented.

## Verification
- Run `pnpm test` passed after updating OpenAPI snapshot.
- DB migrated correctly locally.
<!-- SECTION:NOTES:END -->
