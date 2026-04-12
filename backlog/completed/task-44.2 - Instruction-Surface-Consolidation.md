---
id: TASK-44.2
title: Instruction Surface Consolidation
status: Done
assignee:
  - '@claude'
created_date: '2026-03-14 04:00'
updated_date: '2026-03-15 15:35'
labels:
  - repo-hygiene
  - docs
  - ai-collaboration
dependencies: []
references:
  - AGENTS.md
  - CLAUDE.md
  - .github/copilot-instructions.md
  - docs/system/AI_COLLABORATION.md
  - docs/tutorials/ai-agent-workflow.md
parent_task_id: TASK-44
priority: high
ordinal: 281.25
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The repository has six separate AI agent configuration surfaces (`.claude/`, `.codex/`, `.gemini/`, `.serena/`, `.github/copilot-instructions.md`, `AGENTS.md`) with duplicated and potentially contradictory guidance. RTK instructions are identical in both `AGENTS.md` and `CLAUDE.md`. Backlog workflow guidance is split across `AGENTS.md`, `docs/tutorials/ai-agent-workflow.md`, and `.github/CONTRIBUTING.md`. The `AGENTS.md` RTK section references "Codex" and `~/.Codex/AGENTS.md`, suggesting it was auto-generated for a different platform.

**Concern sources:**
- **Claude Code/Opus 4.6**: Identified RTK duplication between `AGENTS.md` (committed) and `CLAUDE.md` (gitignored), noting both contain `<!-- rtk-instructions v2 -->` blocks. Flagged six separate AI config surfaces with "no master coordination."
- **Gordon**: Flagged overlapping instruction surfaces across `AGENTS.md`, `.github/copilot-instructions.md`, `.github/instructions/`, `.claude/settings.local.json`, and backlog guidance. Called this a violation of `AI_COLLABORATION.md` principle: "keep instruction files short, consistent, and tied to canonical docs instead of duplicating."
- **OpenCode/Big-Pickle**: Identified RTK duplication and recommended consolidation.
- **Codex/GPT-5**: Noted multiple instruction surfaces exist with "no single tracked doc that maps the GitHub Gemini automation surface."
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 RTK instructions exist in exactly one canonical location with other locations referencing it.
- [x] #2 `AGENTS.md` no longer contains platform-specific references to "Codex" or `~/.Codex/AGENTS.md`.
- [x] #3 Backlog workflow guidance is consolidated — `AGENTS.md`, `ai-agent-workflow.md`, and `CONTRIBUTING.md` do not restate the same instructions; instead they reference the canonical source.
- [x] #4 A brief AI agent configuration inventory documents which config surfaces exist, which tool each serves, and where the canonical instructions live.
- [x] #5 No two committed instruction files contain identical content blocks.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit all instruction surfaces: `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.github/instructions/`, `.codex/`, `.gemini/`, `.serena/`, `docs/tutorials/ai-agent-workflow.md`.
2. Decide canonical RTK location (likely `CLAUDE.md` since it's the primary AI tool config, with `AGENTS.md` linking to it — or consolidate into `AGENTS.md` since it's committed).
3. Remove duplicate RTK blocks from the non-canonical file.
4. Fix `AGENTS.md` "Codex" references to be platform-neutral.
5. Consolidate backlog workflow guidance: keep detailed verification expectations in `DEFINITION_OF_DONE.md`; have other docs link rather than restate.
6. Add a brief "AI Configuration Inventory" section to `AGENTS.md` or `docs/system/AI_COLLABORATION.md` listing each config surface and its purpose.
7. Verify no identical content blocks remain across instruction files.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Pre-implementation audit found that most issues described in the task were already resolved by earlier TASK-44 work (sessions S149/S150):

- **AC#1**: Already done — `CLAUDE.md` was already a 1-line pointer to `AGENTS.md`; no `<!-- rtk-instructions v2 -->` duplication existed at start.
- **AC#3**: Already done — `AGENTS.md` references `ai-agent-workflow.md`; `CONTRIBUTING.md` references `AGENTS.md`; no content restating.
- **AC#5**: Already done — no identical blocks across instruction files.

Actual changes made:

1. **`docs/tutorials/ai-agent-workflow.md`**: Replaced `"For Codex shell usage, keep using rtk in front of commands."` with platform-neutral wording referencing `AGENTS.md`.
2. **`AGENTS.md`**: Added `## AI Configuration Inventory` section at the end — a table mapping all 9 config surfaces to their tool, purpose, and content type.

## Verification

```bash
pnpm check:quick  # ✅ passed — 0 lint/typecheck/schema/rules/flags/docs/markdown errors
grep -rn "Prefix all shell commands" AGENTS.md  # ✅ single canonical location confirmed
grep -rn "rtk-instructions" AGENTS.md CLAUDE.md  # ✅ no duplicate blocks
```
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 **Spec alignment (DoD §1)**: Instruction consolidation follows `AI_COLLABORATION.md` principle of non-duplicating, canonical-referencing instruction files.
- [x] #2 **Code quality (DoD §4)**: No orphan duplicate content blocks across instruction surfaces; cross-references use links, not repetition.
- [x] #3 **Verification (DoD §2)**: `pnpm check:quick` passes; grep for `<!-- rtk-instructions` confirms single canonical location; manual review confirms no duplicated guidance blocks.
- [x] #4 **Accessibility (DoD §6)**: AI agents using any supported tool can find instruction guidance without encountering contradictory or duplicated directives.
<!-- DOD:END -->
