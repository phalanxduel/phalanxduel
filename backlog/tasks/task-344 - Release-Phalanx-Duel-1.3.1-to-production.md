---
id: TASK-344
title: Release Phalanx Duel 1.4.0 to production
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-13 19:36'
updated_date: '2026-07-13 19:42'
labels:
  - release
  - ci-cd
  - production
dependencies: []
documentation:
  - docs/deployment.md
  - docs/ops/deployment-checklist.md
  - docs/ops/runbook.md
modified_files:
  - CHANGELOG.md
  - admin/package.json
  - bin/maint/sync-version.sh
  - client/package.json
  - engine/package.json
  - package.json
  - server/package.json
  - shared/package.json
priority: high
ordinal: 198800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Publish the nine verified commits currently ahead of origin/main as release 1.4.0 through the canonical main-branch pipeline. The release includes corrected combat semantics and schema version 1.4.0, scientific assurance, authoritative combat mathematics and narration, presentation choreography, and the combat feedback layout fix. Preserve the unrelated deleted visual-regression artifact.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical workspace and public API version surfaces report 1.4.0 using the repository's supported generation workflow.
- [x] #2 Release verification passes locally with no unrelated files staged or committed.
- [ ] #3 The 1.4.0 release commit and annotated tag are pushed to origin/main and the canonical pipeline succeeds through staging.
- [ ] #4 Production promotion is approved and completes successfully.
- [ ] #5 Staging and production health and readiness report healthy service state and production reports version 1.4.0 at the released commit.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Harden and use the repository's canonical version-bump workflow to align workspace, changelog, generated API/SDK, and authoritative schema surfaces on release 1.4.0; confirm the exact nine-commit release range and annotated-tag convention.
2. Review the version/generated diff, run targeted metadata/schema checks, then run the canonical local release gate without container-heavy duplication unless required.
3. Commit only release metadata/tooling and TASK-344 on main, preserving the unrelated deleted test-results image.
4. Create the annotated v1.4.0 tag, push main and the tag, immediately capture the pipeline URL, and monitor test/build/security/staging jobs to completion.
5. Verify staging health and readiness, approve the production environment as explicitly authorized by the user, monitor production deployment, and verify production health/readiness/version/SHA.
6. Record deployment evidence and finalize TASK-344. If any health/readiness or core pipeline gate fails, stop promotion or initiate the documented rollback path as appropriate.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User explicitly authorized setting a version and releasing through the pipeline to production. Initial patch assumption 1.3.1 was rejected during diff review because the corrected-combat-semantics work had already established authoritative SCHEMA_VERSION 1.4.0. The release therefore targets 1.4.0 to preserve protocol monotonicity and accurately classify behavior-changing rules semantics. Local main is exactly nine commits ahead of origin/main and not behind; that complete range is the intended release payload. The version synchronizer was hardened to operate only on the six game workspace manifests, preserving independently versioned MCP and autonomous-agent packages and avoiding read-only vendor trees.

Generation and local verification complete: version sync is idempotent at 1.4.0; package manifests, SCHEMA_VERSION, generated OpenAPI, and SDK generation agree on 1.4.0; Go client formatting/tests/build passed; pnpm check passed at 1.4.0 across build, lint, typecheck, docs, and all workspace tests.

Pre-deploy baseline: production /health is status ok at version 1.3.0, SHA 546b012abb0ce183d301465f3405f85748a095e0, and /ready reports ready:true/database:ok. Staging /health and /ready timed out at 15 seconds before deployment, so staging availability must be established by the pipeline deploy before production approval.

Environment audits found the GitHub FLY_API_TOKEN synchronized for both staging and production. Fly secret metadata was unavailable through the audit fallback (reported zero visible names), so runtime endpoint readiness remains the authoritative promotion signal.

Disk remains approximately 11 GiB free. SDK generation reused existing ignored artifact directories; no screenshot, trace, video, or container artifacts were added. The unrelated deleted test-results PNG remains excluded.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
