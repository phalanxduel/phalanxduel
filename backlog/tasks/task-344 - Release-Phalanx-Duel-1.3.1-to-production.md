---
id: TASK-344
title: Release Phalanx Duel 1.4.0 to production
status: Done
assignee:
  - '@codex'
created_date: '2026-07-13 19:36'
updated_date: '2026-07-13 20:02'
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
- [x] #3 The 1.4.0 release commit and annotated tag are pushed and the canonical main-branch pipeline succeeds.
- [x] #4 The tested immutable GHCR image is promoted to production successfully.
- [x] #5 Production health and readiness report healthy service state and version 1.4.0 at the released commit; the disabled staging topology is explicitly documented in the release evidence.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Align the six game workspace manifests, authoritative schema, generated API/SDK surfaces, and changelog on version 1.4.0 while preserving independently versioned packages.
2. Run targeted schema/client checks plus the canonical full local verification and pre-push trust gates.
3. Commit the release on main, create annotated tag v1.4.0, push main and tag, and monitor the canonical pipeline.
4. Rerun the single transient container-initialization failure, then promote the tested immutable GHCR image through the configured production job.
5. Verify the canonical production health/readiness endpoints independently, capture version/SHA/observability evidence, and record that staging deployment is currently disabled in pipeline.yml.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User explicitly authorized setting a version and releasing through the pipeline to production. Initial patch assumption 1.3.1 was rejected during diff review because the corrected-combat-semantics work had already established authoritative SCHEMA_VERSION 1.4.0. The release therefore targets 1.4.0 to preserve protocol monotonicity and accurately classify behavior-changing rules semantics. Local main is exactly nine commits ahead of origin/main and not behind; that complete range is the intended release payload. The version synchronizer was hardened to operate only on the six game workspace manifests, preserving independently versioned MCP and autonomous-agent packages and avoiding read-only vendor trees.

Generation and local verification complete: version sync is idempotent at 1.4.0; package manifests, SCHEMA_VERSION, generated OpenAPI, and SDK generation agree on 1.4.0; Go client formatting/tests/build passed; pnpm check passed at 1.4.0 across build, lint, typecheck, docs, and all workspace tests.

Pre-deploy baseline: production /health is status ok at version 1.3.0, SHA 546b012abb0ce183d301465f3405f85748a095e0, and /ready reports ready:true/database:ok. Staging /health and /ready timed out at 15 seconds before deployment, so staging availability must be established by the pipeline deploy before production approval.

Environment audits found the GitHub FLY_API_TOKEN synchronized for both staging and production. Fly secret metadata was unavailable through the audit fallback (reported zero visible names), so runtime endpoint readiness remains the authoritative promotion signal.

Disk remains approximately 11 GiB free. SDK generation reused existing ignored artifact directories; no screenshot, trace, video, or container artifacts were added. The unrelated deleted test-results PNG remains excluded.

Release commit 3f11ea8e8fad0f0a5c31cc8b25f762cf398a5b89 was pushed to origin/main and annotated tag v1.4.0 is present on origin. Pipeline run https://github.com/phalanxduel/phalanxduel/actions/runs/29279793773 completed successfully. Attempt 1 encountered a transient GitHub runner Docker HTTP 500 while pulling pgvector before checkout; rerunning failed jobs cleared the infrastructure fault and all project gates passed.

The current canonical pipeline has its deploy-staging job commented out and promotes the tested GHCR image directly through the production environment job. Production promotion completed in 1m34s. Independent verification at https://phalanxduel-production.fly.dev returned /health status ok, version 1.4.0, build_id 423-2, commit_sha 3f11ea8e8fad0f0a5c31cc8b25f762cf398a5b89, otel_active true, region ord; /ready returned ready true and database ok. The legacy phalanxduel.fly.dev hostname does not resolve. No database migration was part of this release.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Released Phalanx Duel 1.4.0 from main at commit 3f11ea8e8fad0f0a5c31cc8b25f762cf398a5b89 with annotated tag v1.4.0. Versioned all canonical game packages and schema/API surfaces, regenerated SDK artifacts, updated the changelog, and hardened the version synchronizer to target only product workspace manifests. Local pnpm check, schema, Go client, pre-commit, and pre-push trust gates passed. GitHub Actions pipeline 29279793773 passed test/lint, adversarial security, immutable image build/push, SDK publication, and production promotion after one infrastructure-only container pull retry. Production independently reports healthy/ready at version 1.4.0 and the exact release SHA with database and OTel healthy. Staging deployment is currently disabled in the canonical workflow and was not represented as release evidence. The unrelated deleted visual-regression PNG was preserved and excluded.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
