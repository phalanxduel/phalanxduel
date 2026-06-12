---
id: TASK-310
title: Align CI/CD skill with current deployment semantics
status: Done
assignee:
  - '@codex'
created_date: '2026-06-12 20:36'
updated_date: '2026-06-12 20:37'
labels: []
dependencies: []
documentation:
  - .agents/skills/ci-cd-manager/SKILL.md
  - docs/deployment.md
  - docs/system/delivery-pipeline.md
  - docs/ops/deployment-checklist.md
  - docs/ops/runbook.md
modified_files:
  - .agents/skills/ci-cd-manager/SKILL.md
priority: medium
ordinal: 151000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the existing repo-local `ci-cd-manager` skill so agents do not misstate current Phalanx Duel release behavior. The skill should point to canonical deployment docs and reflect source-based Fly deploys, manual production approval, active-match reconnect implications, and MCP app deployment separation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `ci-cd-manager` describes current staging and production deployment behavior accurately.
- [x] #2 The skill warns against claiming strict immutable image promotion while source-based Fly deploys remain current.
- [x] #3 The skill references active-match restart, rollback, and schema compatibility implications at a concise level.
- [x] #4 The skill points to canonical deployment/runbook docs and keeps command guidance concise.
- [x] #5 Validation confirms the updated skill file is structurally sane and formatted.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update `.agents/skills/ci-cd-manager/SKILL.md` to align with `docs/deployment.md` and `docs/system/delivery-pipeline.md`.
2. Add concise operating rules for source-based Fly deploys, manual production approval, active-match restart/reconnect semantics, schema rollback limits, and separate MCP app deployment.
3. Keep existing commit/push/GHA monitoring workflow intact while making command guidance more accurate.
4. Validate YAML/frontmatter with Ruby YAML parsing and run Prettier on the updated skill file.
5. Record evidence and commit the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated `ci-cd-manager` to reflect the current release model: GHCR images are still built, but Fly staging/production runtime deploys are source-based `flyctl --remote-only`; production requires manual GitHub Environment approval; deploys/rollbacks behave like rolling restarts for active matches; rollback does not rewind schema/data; MCP app deploys remain separate.

Validation evidence:
- `rtk ruby -ryaml -e ... .agents/skills/ci-cd-manager` passed.
- `rtk pnpm exec prettier --check .agents/skills/ci-cd-manager/SKILL.md` passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated `.agents/skills/ci-cd-manager/SKILL.md` so future agents report current Phalanx Duel release semantics accurately.

Key changes:
- Added source-based Fly deployment semantics for staging and production.
- Warned against claiming strict immutable image promotion while current runtime deploys use `flyctl --remote-only` from source.
- Added active-match reconnect/restart and rollback/schema compatibility caveats.
- Noted that MCP app deployment is separate from the main pipeline.
- Added links to `docs/deployment.md`, `docs/ops/deployment-checklist.md`, and `docs/ops/runbook.md`.

Verification:
- Ruby YAML/frontmatter validation passed.
- Prettier check passed for the updated skill file.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
