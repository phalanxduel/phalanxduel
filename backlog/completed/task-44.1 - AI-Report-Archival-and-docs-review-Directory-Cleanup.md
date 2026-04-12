---
id: TASK-44.1
title: AI Report Archival and docs/review/ Directory Cleanup
status: Done
assignee:
  - '@claude'
created_date: '2026-03-14 04:00'
updated_date: '2026-03-14 04:09'
labels:
  - repo-hygiene
  - docs
  - archival
dependencies: []
references:
  - docs/ops/archival-policy.md
  - archive/ai-reports/README.md
parent_task_id: TASK-44
priority: high
ordinal: 375
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
AI-generated review reports are currently placed in `docs/review/` subdirectories, violating the repo's own `ARCHIVAL_POLICY.md` which mandates that generated AI outputs go to `archive/ai-reports/`. Empty directories and stub files in `docs/review/` add noise. The `README.md` monorepo map describes `docs/review/` as a review "corpus," which invites contributors and agents to place outputs alongside methodology docs.

**Concern sources:**
- **Claude Code/Opus 4.6**: Identified 5 AI reports in `docs/review/` totaling ~2,200+ LOC of redundant findings as the "single largest source of context noise." Flagged empty `docs/review/hardening/`, `docs/review/cline-cli/`, and `docs/plans/` directories.
- **Gordon**: Flagged `docs/review/cursor-gpt-5.2/gpt-5.2.md` as an active-docs-zone violation and recommended archiving to `archive/ai-reports/2026-03-12/`.
- **Codex/GPT-5**: Identified `README.md` wording drift — `docs/review/` described as review "corpus" while archive policy says outputs belong under `archive/ai-reports/`.
- **Gemini CLI**: Noted reports placed in `docs/review/` "directly violating HARDENING.md and archive/ai-reports/README.md" and called it "context noise."
- **Cursor/GPT-5.2**: Flagged archive naming/layout drift and ambiguity about canonical vs generated docs.
- **OpenCode/Big-Pickle**: Flagged empty `docs/plans/` and `docs/review/hardening/` directories.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All AI-generated review reports currently under `docs/review/{codex,cursor,gordon,opencode,trae,cline-cli,gemini-cli}/` are moved to `archive/ai-reports/2026-03-12/` following the prescribed directory layout from `HARDENING.md`.
- [ ] #2 Empty directories (`docs/plans/`, `docs/review/hardening/`, `docs/review/cline-cli/`) and the 0-byte stub file are deleted.
- [ ] #3 `README.md` monorepo map entry for `docs/review/` is reworded to explicitly state it contains "review prompts, methodology, and guidelines" — not generated AI outputs.
- [ ] #4 `docs/review/` retains only methodology docs: `HARDENING.md`, `META_ANALYSIS.md`, `PRODUCTION_PATH_REVIEW_GUIDELINE.md`.
- [ ] #5 No duplicate reports exist across `docs/review/` and `archive/ai-reports/`.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Move all AI-generated review reports from `docs/review/` subdirectories to `archive/ai-reports/2026-03-12/<platform>/<model>/` following the naming convention in `HARDENING.md`.
2. Delete emptied platform subdirectories under `docs/review/`.
3. Delete empty directories: `docs/plans/`, `docs/review/hardening/`.
4. Delete 0-byte stub file `docs/review/cline-cli/arcee-ai-trinity-large-preview-free.md` and its empty directory.
5. Rewrite `README.md` docs/review/ description to match archive policy.
6. Verify no tracked AI report files remain under `docs/review/` except methodology docs.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Prior work had already moved all AI reports to `archive/ai-reports/2026-03-12/` and removed platform subdirectories from `docs/review/`. Remaining items completed in this pass:

1. Deleted empty `docs/plans/` directory (created 2026-03-12, never populated).
2. Reworded `README.md` line 122: `docs/review/` description changed from "Production readiness and documentation audit corpus" to "Review prompts, methodology, and audit guidelines."
3. Verified `docs/review/hardening/` and `docs/review/cline-cli/` no longer exist (removed in prior work).

## Verification

```text
AC #1 ✓ — All 8 AI reports reside in archive/ai-reports/2026-03-12/{platform}/{model}/
AC #2 ✓ — docs/plans/ deleted; docs/review/hardening/ and docs/review/cline-cli/ absent
AC #3 ✓ — README.md now reads: "Review prompts, methodology, and audit guidelines."
AC #4 ✓ — docs/review/ contains only HARDENING.md, META_ANALYSIS.md, PRODUCTION_PATH_REVIEW_GUIDELINE.md
AC #5 ✓ — No duplicate reports across docs/review/ and archive/ai-reports/

DoD #1 ✓ — Archive layout matches ARCHIVAL_POLICY.md and archive/ai-reports/README.md
DoD #2 ✓ — No orphan empty dirs; README accurately describes docs/review/
DoD #3 ✓ — pnpm check:quick passes (lint, typecheck, schema:check, rules:check, flags:check, docs:check, lint:md — 0 errors)
```
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 **Spec alignment (DoD §1)**: Archive placement matches `docs/ops/archival-policy.md` and `archive/ai-reports/README.md` layout rules.
- [ ] #2 **Code quality (DoD §4)**: No orphan empty directories or stub files remain; `README.md` accurately describes `docs/review/` contents.
- [ ] #3 **Verification (DoD §2)**: `pnpm check:quick` passes; `git status` confirms no untracked AI reports remain in `docs/review/`; `ls docs/review/` shows only methodology files.
<!-- DOD:END -->
