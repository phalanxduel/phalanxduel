---
id: TASK-141
title: AI-Agent Instruction Cleanup
status: To Do
assignee: []
created_date: '2026-03-31 17:38'
labels: []
dependencies:
  - TASK-136
  - TASK-137
  - TASK-137
references:
  - AGENTS.md
  - backlog/docs/ai-agent-workflow.md
priority: high
---

## Description

Clean up the AI-agent instruction surfaces so agents have one clear canonical
path and no contradictory or stale prompts remain.

## Rationale

AI reliability depends on instruction clarity at least as much as on code docs.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `AGENTS.md` remains the clear canonical root instruction surface.
- [ ] #2 Secondary instruction files are either thin pointers or narrowly scoped supplements.
- [ ] #3 No contradictory workflow or documentation-placement guidance remains across agent instruction files.
<!-- AC:END -->

## Expected Outputs

- Clean instruction hierarchy
- Reduced duplication across agent-specific surfaces
- Updated references to canonical docs

## Do Not Break

- Do not remove necessary platform-specific instruction shims if the toolchain expects them.
