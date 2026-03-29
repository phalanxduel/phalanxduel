---
id: TASK-33
title: 'Workstream: Repo Hygiene and Tooling Consolidation'
status: Planned
assignee:
  - '@codex'
created_date: '2026-03-12 09:07'
updated_date: '2026-03-29 22:33'
labels: []
milestone: 'm-0: Security Hardening Audit'
dependencies: []
references:
  - backlog/tasks/task-33.1 - Consolidated-Markdownlint-Configuration.md
  - backlog/tasks/task-33.2 - Retire-Legacy-Roadmap-and-Status-Files.md
  - backlog/tasks/task-33.3 - Generated-Artifact-Policy-Cleanup.md
  - backlog/tasks/task-33.4 - Consolidate-Versioning-Scripts.md
  - backlog/tasks/task-33.5 - Simplify-Playwright-QA-Bootstrap.md
priority: medium
ordinal: 32000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Epic-like coordinator for repo hygiene cleanup. Backlog in this repo does not expose a dedicated epic type, so this parent task tracks the scoped cleanup tasks that retired duplicated tooling config, removed stale roadmap/status artifacts, and consolidated maintenance entry points.
<!-- SECTION:DESCRIPTION:END -->

## Problem Scenario

Given contributors, AI agents, and CI all navigate the same monorepo, when
tooling configuration, generated artifacts, and legacy planning files disagree,
then the repo becomes noisier to operate, harder to review, and easier to use
incorrectly.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Markdown lint configuration is consolidated to one authoritative rule source.
- [ ] #2 Legacy roadmap/status files are either removed or reduced to minimal compatibility stubs with canonical Backlog references.
- [ ] #3 Tracked generated artifacts are limited to files that are intentionally committed and CI-verified.
- [ ] #4 Versioning and QA bootstrap scripts have no redundant overlapping paths.
- [ ] #5 The parent task can be closed once the child-task mapping and a repo-wide hygiene sweep are recorded in the parent task notes/final summary.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Use TASK-33 only as the umbrella coordinator. Land one scoped child task per cleanup area, let each child own its implementation notes and verification, then close the parent after a repo-wide sweep confirms those child outcomes are the only surviving live paths.

Current child-task mapping:
1. TASK-33.1 markdownlint configuration consolidation
2. TASK-33.2 legacy roadmap/status retirement
3. TASK-33.3 generated artifact policy cleanup
4. TASK-33.4 versioning script consolidation
5. TASK-33.5 Playwright QA bootstrap simplification
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Treat TASK-33 as an umbrella/coordinator task rather than a separate PR-sized implementation task.
- Current scope is fully partitioned across TASK-33.1 through TASK-33.5.
- Parent closeout should be a repo-wide verification sweep plus a concise final summary, not additional implementation work unless a surviving duplicate path is found.

Canonical replacements established by the child tasks: .markdownlint-cli2.jsonc is the only markdownlint rule source; Backlog-owned docs now replace legacy roadmap/status pointers; intentionally committed generated artifacts are limited to the CI-verified docs/system outputs; bin/maint/sync-version.sh is the single version-sync entry point; pnpm setup:qa via bin/qa/bootstrap.zsh remains the QA bootstrap path without dependency mutation.

Repo sweep for parent-task refinement found no live .markdownlint.jsonc, .markdownlintignore, TODO.md, progress.md, docs/system/DECISIONS.md, docs/plans/README.md, or bump-version.sh path in the working tree.

Use the Human Review lane for the parent closeout PR. If review feedback requires further cleanup or verification, move TASK-33 back to In Progress until the response is complete.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 TASK-33.1 through TASK-33.5 are completed with concrete verification recorded on each child task.
- [ ] #2 The parent task references the child tasks that collectively satisfy the repo-hygiene sweep.
- [ ] #3 Parent notes or final summary capture the canonical replacements and any deliberate exceptions kept after cleanup.
- [ ] #4 For PR-backed parent closeout, move TASK-33 to Human Review once the closeout PR is reviewable and the verification evidence is recorded.
- [ ] #5 Do not mark TASK-33 Done until Human Review is complete and any required follow-up changes are recorded.
<!-- DOD:END -->
