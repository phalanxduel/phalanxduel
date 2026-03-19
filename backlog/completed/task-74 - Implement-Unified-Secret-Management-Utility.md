---
id: TASK-74
title: Implement Unified Secret Management Utility
status: Done
assignee: []
created_date: '2026-03-19 13:36'
updated_date: '2026-03-19 13:37'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a unified utility for managing secrets across local, GitHub, and Fly.io environments. This solves the "out-of-sync" risk by providing a single source of truth (local .env.[env]) and a bi-directional consistency audit.

## Workflow
1. `push`: Local .env -> Remote (Fly + GH)
2. `audit`: Compare local keys vs remote metadata (Consistency check)
3. `remove`: Explicitly delete from all remotes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Script `scripts/maint/sync-secrets.ts` implemented with `push`, `audit`, and `remove` commands.
- [x] #2 Supports both `phalanxduel-staging` and `phalanxduel-production` Fly.io apps.
- [x] #3 Supports GitHub Environment Secrets for `staging` and `production`.
- [x] #4 Implements a "Permit List" to prevent overwriting protected system variables.
- [x] #5 `audit` command correctly identifies missing or orphan secrets without requiring plaintext read access.
- [x] #6 `package.json` updated with convenient `secrets:*` scripts.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Implemented `scripts/maint/sync-secrets.ts` using `commander`, `dotenv`, and `execa`.
- Added `push`, `audit`, and `remove` commands.
- Added convenience scripts to `package.json`.
- Implemented robust parsing for `flyctl` JSON output (filtering out debug logs).
- Verified `audit` command correctly identifies missing secrets across local, Fly, and GitHub.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Operational docs updated in STABILITY_DEPLOYMENT_GUIDE.md with secret management workflow.
- [x] #2 Moved to Human Review for AI-assisted PR-backed work.
<!-- DOD:END -->
