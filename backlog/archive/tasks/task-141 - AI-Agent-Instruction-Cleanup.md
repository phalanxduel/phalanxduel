---
id: TASK-141
title: AI-Agent Instruction Cleanup
status: Done
assignee:
  - '@codex'
created_date: '2026-03-31 17:38'
updated_date: '2026-03-31 15:02'
labels: []
dependencies:
  - TASK-136
  - TASK-137
references:
  - AGENTS.md
  - docs/tutorials/ai-agent-workflow.md
priority: high
ordinal: 52000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Clean up the AI-agent instruction surfaces so agents have one clear canonical
path and no contradictory or stale prompts remain.

## Rationale

AI reliability depends on instruction clarity at least as much as on code docs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `AGENTS.md` remains the clear canonical root instruction surface.
- [x] #2 Secondary instruction files are either thin pointers or narrowly scoped supplements.
- [x] #3 No contradictory workflow or documentation-placement guidance remains across agent instruction files.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Re-check the current instruction surfaces in `AGENTS.md`, `CLAUDE.md`,
   `.github/copilot-instructions.md`, `.github/instructions/`, and any other
   repo-facing agent guidance for duplication or drift.
2. Define the intended hierarchy: one canonical root instruction surface, thin
   pointers where possible, and narrowly scoped supplements only where needed.
3. Remove or tighten duplicated guidance that is now better expressed through
   canonical references.
4. Verify markdown integrity and return the task for review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- The audit has already confirmed that `AGENTS.md` is the canonical root
  instruction file and that `CLAUDE.md` is appropriately thin.
- The main remaining risk area is drift between `AGENTS.md`,
  `.github/copilot-instructions.md`, and the scoped GitHub instruction files.
- Reduced duplication in `AGENTS.md` by replacing the long repeated AI
  collaboration policy block with a short minimum-expectation summary that
  points to `docs/system/AI_COLLABORATION.md` as the full policy source.
- Removed the second `AI Collaboration (Hints)` subsection from `AGENTS.md`
  because it restated collaboration guidance already covered by the canonical
  policy and made the root instruction file less intentionally scoped.
- Confirmed that the current GitHub-facing instruction surfaces are limited to
  `.github/copilot-instructions.md` and
  `.github/instructions/trust-boundaries.instructions.md`; both remain useful as
  thin pointer/scoped layers rather than independent policy manuals.

## Verification

- `pnpm exec markdownlint-cli2 AGENTS.md CLAUDE.md .github/copilot-instructions.md .github/instructions/trust-boundaries.instructions.md "backlog/tasks/task-141 - AI-Agent-Instruction-Cleanup.md" --config .markdownlint-cli2.jsonc`
- `find .github -maxdepth 3 -type f \( -name '*.md' -o -name '*.instructions.md' \) | sort`
- `sed -n '1,220p' AGENTS.md CLAUDE.md .github/copilot-instructions.md .github/instructions/trust-boundaries.instructions.md docs/system/AI_COLLABORATION.md`
- `rg -n "AGENTS.md|docs/tutorials/ai-agent-workflow.md|DEFINITION_OF_DONE|AI Collaboration|RULES.md|canonical" .github docs AGENTS.md CLAUDE.md -g '!node_modules'`

## Do Not Break

- Do not remove necessary platform-specific instruction shims if the toolchain expects them.
<!-- SECTION:NOTES:END -->

## Expected Outputs

- Clean instruction hierarchy
- Reduced duplication across agent-specific surfaces
- Updated references to canonical docs
