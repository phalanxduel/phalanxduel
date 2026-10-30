---
id: TASK-44.14
title: Refactor Secrets DSL and Resolve GHA Pipeline Auth
status: Done
assignee: []
created_date: '2026-03-19 23:40'
updated_date: '2026-03-19 23:40'
labels: []
dependencies: []
parent_task_id: TASK-44
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
**Context:**
The GHA pipeline was failing with an `unauthorized` error during Fly.io deployment because `FLY_API_TOKEN` was not correctly synced or managed. Additionally, the `pnpm` scripts lacked a cohesive naming convention, leading to confusion about which script to run for environment syncing vs deployment.

**Implementation Plan:**
1. Update `sync-secrets.ts` to support a local, non-committed `.env.secrets.local` file for tokens like `FLY_API_TOKEN`.
2. Clean up `FLY_API_TOKEN` from committed `.env.secrets` and instruct the user to sync it via the tool to GitHub Environment Secrets (`@target: PIPELINE`).
3. Refactor `package.json` scripts into a predictable DSL (e.g., `env:push:*`, `verify:all`, `deploy:run:*`).
4. Update GitHub Actions `.github/workflows/pipeline.yml` to use `pnpm verify:all`.
5. Update `docs/tutorials/secrets-and-env.md` to reflect the new `env:*` namespaces.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 FLY_API_TOKEN is managed securely outside of committed files
- [x] #2 Script namespaces (env:, deploy:, verify:, test:, qa:, infra:) are formalized in package.json
- [x] #3 sync-secrets.ts handles .env.secrets.local for local overrides
- [x] #4 GHA Pipeline uses updated verify:all script
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Refactored `package.json` scripts into a clean DSL format (`env:`, `deploy:`, `verify:`, `test:`, `qa:`, `infra:`). Updated `sync-secrets.ts` to process `.env.secrets.local` for secure management of `FLY_API_TOKEN` without committing it. Updated GHA workflow and documentation to reflect the new namespaces. The pipeline auth issue is resolved by pushing the local token to GitHub Environment Secrets.
<!-- SECTION:FINAL_SUMMARY:END -->
