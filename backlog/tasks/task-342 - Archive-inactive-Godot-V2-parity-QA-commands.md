---
id: TASK-342
title: Archive inactive Godot/V2 parity QA commands
status: Done
assignee:
  - Codex
created_date: '2026-07-05 16:44'
updated_date: '2026-07-05 16:55'
labels: []
dependencies: []
modified_files:
  - package.json
  - knip.json
  - bin/qa
  - archive/godot-v2-v3/bin-qa
  - docs/reference/qa-runners.md
  - docs/system/UI_COMPONENT_TAXONOMY.md
  - archive/godot-v2-v3
ordinal: 184800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove active QA exposure for Godot/V2/parity tooling now that Godot/V2 is iceboxed. Active package scripts and QA documentation should no longer advertise these commands as current browser-client workflows, and safe legacy tooling should move under archive/godot-v2-v3/bin-qa.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Active package scripts no longer expose Godot/V2/parity qa:* commands unless a script is still required for active browser-client workflows.
- [x] #2 Godot/V2/parity QA files that can be safely archived are moved out of bin/qa into archive/godot-v2-v3/bin-qa.
- [x] #3 Active QA documentation no longer presents Godot/V2/parity tooling as current.
- [x] #4 Targeted search verifies no active qa:* exposure remains for archived Godot/V2/parity commands.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect active QA script exposure in package.json/knip.json and Godot/V2/parity references in bin/qa plus the named docs.
2. Move clearly inactive Godot/V2/parity QA tooling from bin/qa to archive/godot-v2-v3/bin-qa, preserving relative structure where practical.
3. Remove active package qa:* scripts for the archived tooling and adjust knip ignore/config references accordingly.
4. Update active QA docs so Godot/V2/parity is described as archived/legacy instead of current.
5. Run targeted rg checks and markdown/json formatting or validation for edited files.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Archived inactive Godot/V2/parity QA helpers out of bin/qa, removed their package qa:* scripts, removed active knip references to archived comparators/Godot binary, and updated active QA/taxonomy docs to treat Godot/V2 parity as archived. Verification run: JSON parse for package.json/knip.json, Prettier check for edited JSON/Markdown, markdownlint for active edited docs, targeted rg/git grep checks for removed active command exposure, and git diff --check for edited tracked files. Broader project DoD commands were not run because this was a package/docs/tooling quarantine cleanup and no runtime code paths were changed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Archived inactive Godot/V2/parity QA tooling by moving legacy runner files from bin/qa into archive/godot-v2-v3/bin-qa and removing their active root qa:* scripts. Cleaned knip.json so archived comparators and the Godot binary are no longer active tooling entries. Updated docs/reference/qa-runners.md and docs/system/UI_COMPONENT_TAXONOMY.md so active QA docs no longer advertise Godot/V2 parity as current, and added archive/godot-v2-v3/README.md to mark the moved tooling as historical reference.

Verification: JSON parse for package.json/knip.json; Prettier check for edited JSON/Markdown; markdownlint for active edited docs; targeted rg/git grep for removed active command exposure; git diff --check for edited tracked files. Full project build/test/schema/docs artifact DoD was not run for this scoped quarantine cleanup.

Integration follow-up completed: restored active v1 QA commands, removed stale pngjs/pixelmatch dev dependencies after archiving the parity comparator, regenerated docs, and ran full pnpm check successfully.
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
