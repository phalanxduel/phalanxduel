---
id: TASK-72
title: Audit & Modernize CI/CD Pipeline
status: Done
assignee: []
created_date: '2026-03-18 23:43'
updated_date: '2026-03-19 23:08'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Audit and modernize the CI/CD pipeline to ensure high-fidelity gates, efficient resource usage, and a clear promotion path from development to production.

## Problem Scenario
The current pipeline is redundant, building Docker images multiple times across different workflows. Security scans are disconnected from deployment gates, and production releases rely on local scripts rather than CI-driven promotion. Additionally, there is a naming mismatch between the `fly.production.toml` configuration and the actual app name in Fly.io.

## Objectives
1.  **Audit**: Identify and remove redundant GitHub Actions.
2.  **Modernize**: Create a unified pipeline that builds once, scans for security vulnerabilities, and deploys to staging automatically upon success.
3.  **Gate**: Implement a formal "settling" period in staging followed by a manual promotion to production.
4.  **Align**: Synchronize environment naming across config files and Fly.io infrastructure.

## Questions/Ambiguities
1.  **Production URL**: Do we rename the Fly app `phalanxduel` to `phalanxduel-production` for symmetry, or revert the config to match the existing name?
2.  **Registry**: Confirm use of GitHub Container Registry (GHCR) for artifact storage.
3.  **Promotion**: Select between GitHub Manual Approval or Git Tag-based promotion.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Redundant workflows (.github/workflows/fly-deploy.yml, etc.) removed
- [x] #2 Unified pipeline.yml implemented with Tests -> Scan -> Staging -> Production flow
- [x] #3 Docker images built once and reused via GHCR (if approved)
- [x] #4 Production deployment requires explicit manual approval or tag trigger
- [x] #5 Fly.io config files (fly.production.toml) and actual app names are synchronized
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Realignment & Modernization
1. **Infrastructure**: Created `phalanxduel-production` on Fly.io to match configuration symmetry with `phalanxduel-staging`.
2. **Unified Pipeline**: Implemented `.github/workflows/pipeline.yml` with a Build-Once strategy:
   - **Test**: Standard project checks.
   - **Build**: Pushes production image to GHCR.
   - **Scan**: Trivy scan of the registry artifact.
   - **Staging**: Automatic deployment of the verified artifact.
   - **Production**: Promotion via **Manual Approval** in GitHub Environments.
3. **Cleanup**: Removed redundant `ci.yml`, `docker-security-scan.yml`, `deploy-staging.yml`, and `fly-deploy.yml`.
4. **Documentation**: Created `docs/operations/CI_CD_PIPELINE.md` and updated `docs/operations/STABILITY_DEPLOYMENT_GUIDE.md`.

### Developer Workflow
- Local Husky hooks remain the first gate.
- Promotion to production is now driven by CI artifacts, ensuring 100% parity between staging and production code.

Verification evidence:
- `flyctl apps list` confirms new app exists.
- `docs/operations/CI_CD_PIPELINE.md` created.
- `pipeline.yml` configured with GHCR and Environments.
- Redundant workflows deleted.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Behavior matches specified Rule IDs or Schema definitions
- [x] #2 pnpm check:quick passes locally
- [x] #3 Targeted tests cover the changed paths
- [x] #4 No orphan TODO or FIXME comments remain without linked tasks
- [x] #5 Verification evidence recorded in task summary
- [x] #6 Operational docs and runbooks updated for surface changes (CI/CD guide)
- [x] #7 Moved to Human Review for AI-assisted PR-backed work
<!-- DOD:END -->
