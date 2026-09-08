---
id: TASK-388
title: Retire Godot source and guidance for browser demo readiness
status: Done
assignee:
  - Codex
created_date: '2026-09-08 15:24'
updated_date: '2026-09-08 15:26'
labels: []
dependencies: []
type: chore
ordinal: 265800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The upcoming demo needs a clean main branch and unambiguous browser-client guidance. Previous cleanup removed tracked Godot archives, but identical ignored local copies and stale icebox instructions remain.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Retired Godot source is absent from the working tree, with recovery available from Git history.
- [x] #2 Active agent guidance identifies the browser client as the demo path and does not direct agents to local Godot archives.
- [x] #3 Relevant audits and the unified check are run, with results documented.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
L1 context brief: Prior cleanup be909aa removed archive/ from Git; all 184 local files in artifacts/archive/godot-v2-v3 and artifacts/archive/icebox-godot hash-identically match be909aa^. Existing scripts/agent-audit.ts and tests reject active Godot QA/skill promotion. Main risk is losing unique local work or leaving guidance pointing to removed paths; hash comparison excludes unique changes. Delete only these two verified directories. Update AGENTS.md, CODEX.md, ignored CLAUDE.md, taxonomy archive pointer, and obsolete Godot cache ignore. Preserve historical Backlog records and existing regression guards. Run agent audit, unified pnpm check with database isolation, inspect final diff, commit on main. No gameplay or browser UI implementation changes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Deleted only the two verified Godot archives after all 184 files matched be909aa^ blobs. Post-deletion inspection confirms no tracked .gd/.tscn/.tres/project.godot files and no local archive copies. Updated AGENTS.md, CODEX.md, local ignored CLAUDE.md, taxonomy recovery reference, and obsolete .gitignore cache entry.

Validation: pnpm check passed (1,260 tests across shared/engine/server/client/admin/MCP; build/lint/typecheck/docs/format passed, DB isolation 24/24). Server tests used package-wired with-test-postgres.sh targeting phalanxduel_test; ambient DATABASE_URL unset for parent commands. Agent-audit unit tests 11/11 passed. Schema regeneration/check passed with no generated drift. Documentation artifacts validated current by docs:check; no regeneration needed for this documentation-only cleanup.

Repository-wide agent:audit exits 1 on existing Backlog stabilization-policy mismatches and a pre-existing missing docs/agents/session-handoff.md reference. Godot QA/skill checks and instruction drift checks pass. No unrelated Backlog states or runtime code changed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Retired Godot leftovers for browser demo readiness. The previous be909aa cleanup already removed tracked source; deleted the remaining 184 identical local archive files after verifying recovery from Git history. Updated canonical/Codex/local Claude guidance to require explicit human authorization for restoration, removed obsolete cache ignore, and replaced the taxonomy local-archive pointer with a Git-history reference.

Validation: pnpm check passed (1,260 tests); agent-audit tests 11/11; schema regeneration/check; rules/FSM/event coverage and 2,355,388 combat reference cases; git diff --check. Godot-specific audit gates pass. Repository-wide agent:audit remains blocked by unrelated Backlog policy mismatches and the pre-existing missing session-handoff doc reference. No gameplay/UI runtime behavior changed.
<!-- SECTION:FINAL_SUMMARY:END -->
