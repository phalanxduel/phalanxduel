---
id: TASK-143
title: Final Documentation Verification Pass
status: Human Review
assignee:
  - '@codex'
created_date: '2026-03-31 17:38'
updated_date: '2026-03-31 23:39'
labels: []
dependencies:
  - TASK-140
  - TASK-142
  - TASK-144
  - TASK-155
references:
  - backlog/docs/doc-2 - Documentation Consolidation Audit.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Run the final verification pass for documentation cleanliness, canonicality, and
pre-release readiness after the cleanup workstreams land.

## Rationale

The cleanup effort is only complete when the repo has one clear doc map and no
obvious stale contradictions left.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every important topic has one canonical home.
- [x] #2 No contradictory AI-agent instructions remain.
- [x] #3 No duplicate docs remain unless intentionally mirrored and clearly marked.
- [x] #4 Historical docs are archived or clearly labeled as such.
- [x] #5 The retained documentation aligns with current codebase and repo behavior closely enough for pre-release use.
<!-- AC:END -->

## Implementation Plan

1. Audit the active documentation surfaces against
   `backlog/docs/doc-2 - Documentation Consolidation Audit.md` and the current
   repo layout.
2. Fix any remaining stale instruction pointers, transitional wording, or
   duplicate active references found in root docs, contributor docs, and system
   docs.
3. Run targeted documentation verification commands, summarize residual risk,
   and prepare the task for human review.

## Implementation Notes

- 2026-04-01: Pulled `TASK-143` into `In Progress` after confirming from the
  live backlog board that `TASK-155` is already `Done` and `TASK-143` is the
  next highest-priority `To Do` item.
- 2026-04-01: Audited the canonical documentation map, system doc indexes,
  agent instruction surfaces, and deployment/runbook docs using
  `backlog/docs/doc-2 - Documentation Consolidation Audit.md`,
  `docs/README.md`, `docs/system/README.md`, `AGENTS.md`, `CLAUDE.md`,
  `.github/copilot-instructions.md`, and
  `.github/instructions/trust-boundaries.instructions.md`.
- 2026-04-01: Found two active-surface drift issues:
  `AGENTS.md` still listed `TASK-155` as an upcoming documentation task even
  though the task record is already `Done`, and
  `docs/deployment/DEPLOYMENT_CHECKLIST.md` still used temporary
  "documentation cleanup tranche" wording after the cleanup chain had already
  landed.
- 2026-04-01: No contradictory AI-agent instruction copies were found. The RTK
  shell rule remains canonical in `AGENTS.md`, `CLAUDE.md` is still a thin
  pointer, and the Copilot/trust-boundary files remain scoped pointers instead
  of duplicated workflow docs.
- 2026-04-01: Verification passed after updating the stale `AGENTS.md`
  documentation-priority section and removing outdated transitional wording from
  `docs/deployment/DEPLOYMENT_CHECKLIST.md`.
- 2026-04-01: `./bin/check` initially failed inside the sandbox because server
  tests could not bind listeners on `0.0.0.0` (`listen EPERM`). Re-running the
  same command outside the sandbox completed successfully; the only remaining
  repo-wide findings are two pre-existing lint warnings in
  `server/src/app.ts` and `server/src/utils/openapi.ts`.

## Verification

- `rtk backlog task list --plain`
- `rtk rg -n "docs/plans/|docs/superpowers/|docs/review/|docs/research/" README.md docs .github AGENTS.md backlog/docs "backlog/tasks/task-143 - Final-Documentation-Verification-Pass.md" --glob '!archive/**' --glob '!backlog/completed/**'`
- `rtk rg -n "Prefix all shell commands|rtk-instructions|~/.Codex|For Codex shell usage|single canonical location" AGENTS.md CLAUDE.md .github backlog/docs docs/system --glob '!backlog/completed/**'`
- `rtk rg -n "cleanup tranche|observability WIP settles|Human Review|Current repo-layout task|Current Priority" AGENTS.md docs .github README.md --glob '!backlog/**'`
- `rtk pnpm exec markdownlint-cli2 AGENTS.md docs/deployment/DEPLOYMENT_CHECKLIST.md docs/README.md docs/system/README.md backlog/docs/ai-agent-workflow.md "backlog/docs/doc-2 - Documentation Consolidation Audit.md" "backlog/tasks/task-143 - Final-Documentation-Verification-Pass.md" --config .markdownlint-cli2.jsonc`
- `rtk bash scripts/ci/verify-doc-artifacts.sh`
- `rtk ./bin/check`

## Expected Outputs

- Final verification evidence
- Residual-risk summary
- Review-ready closeout recommendation for the documentation cleanup workstream

## Do Not Break

- Do not certify the documentation cleanup complete while active docs still
  contain stale task-priority pointers, contradictory agent instructions, or
  transitional wording that no longer reflects the repo state.
