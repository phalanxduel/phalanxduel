---
id: TASK-134
title: Backlog-Integrated Documentation Governance
status: Human Review
assignee:
  - '@codex'
created_date: '2026-03-31 17:20'
updated_date: '2026-03-31 17:23'
labels: []
dependencies: []
references:
  - backlog/decisions/README.md
  - backlog/docs/ai-agent-workflow.md
  - docs/README.md
  - docs/system/ARCHIVAL_POLICY.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Record and enforce the repository decision that active documentation must follow
the Backlog-integrated structure so architecture decisions, plans, tasks, and
reference docs do not sprawl across overlapping surfaces, go stale, or waste
agent context on duplicate artifacts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A formal decision record captures the rule that active documentation must use the Backlog-integrated structure, with clear separation between `backlog/decisions`, `backlog/docs`, and `docs/`.
- [x] #2 Workflow and documentation guidance are updated so agents know where new documentation belongs and that duplicate summary surfaces should be avoided.
- [x] #3 The new rule is recorded without attempting an unsafe repo-wide migration in the same change; any larger cleanup is left for follow-up work.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a new decision record for documentation structure and stale-doc
   prevention.
2. Update the workflow and docs guidance to encode the placement rules.
3. Verify markdown integrity and move the task to Human Review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- This change records the governance rule and the canonical locations for active
  documentation. It does not relocate the full existing `docs/` corpus in one
  pass.
- The main intent is to stop future sprawl and duplicate rendered surfaces,
  especially for decisions, plans, and backlog-owned process docs.
- Added `DEC-2A-004` as the formal decision record and wired that decision into
  the decision index.
- Updated workflow and archival guidance so agents can distinguish between
  canonical reference docs in `docs/` and Backlog-owned governance/process
  surfaces in `backlog/`.
<!-- SECTION:NOTES:END -->

## Verification

- `pnpm exec markdownlint-cli2 backlog/decisions/README.md backlog/docs/ai-agent-workflow.md docs/README.md docs/system/ARCHIVAL_POLICY.md "backlog/tasks/task-134 - Backlog-Integrated-Documentation-Governance.md" "backlog/decisions/decision-025 - DEC-2A-004 - Backlog-integrated-documentation-governance.md" --config .markdownlint-cli2.jsonc`
