---
id: TASK-44.10
title: Stale Artifact and CHANGELOG Cleanup
status: To Do
assignee: []
created_date: '2026-03-14 04:00'
updated_date: '2026-03-14 04:00'
labels:
  - repo-hygiene
  - docs
dependencies: []
references:
  - CHANGELOG.md
  - backlog/docs/
parent_task_id: TASK-44
priority: low
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Several housekeeping issues: (1) `CHANGELOG.md` version `[0.2.4-rev.8]` has an empty "### Fixed" section that runs into `[0.3.0-rev.6]` content, creating parsing ambiguity. (2) Completed planning documents in `backlog/docs/` (e.g., the OTel migration plan from 2026-03-10) may mislead agents into re-executing completed work. (3) `backlog/docs/doc-1 - GLOSSARY.md.md` has a double `.md` extension (also addressed in TASK-44.6).

**Concern sources:**
- **Claude Code/Opus 4.6**: Flagged CHANGELOG empty "Fixed" section as a formatting defect creating version-boundary ambiguity. Noted `backlog/docs/PLAN - 2026-03-10 - otel-native-hybrid-plan.md` as potentially archivable since OTel migration appears complete. Flagged `doc-1 - GLOSSARY.md.md` double extension.
- **Gordon**: Recommended archiving completed planning docs to `backlog/archive/plans/` and keeping only active plans in `backlog/docs/`. Flagged risk of new contributors reading completed plans as current roadmap.
- **Codex/GPT-5**: Noted older CHANGELOG entries reference now-missing paths like `docs/CLI.md` and `docs/TECHNICAL_REFERENCE.md`, creating a "medium AI context hazard."
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `CHANGELOG.md` `[0.2.4-rev.8]` has no empty "### Fixed" section; version boundaries are unambiguous.
- [ ] #2 Completed planning documents in `backlog/docs/` are reviewed and either archived to `backlog/completed/docs/` or marked with completion status.
- [ ] #3 `backlog/docs/doc-1 - GLOSSARY.md.md` double `.md` extension is fixed.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Fix CHANGELOG.md: either add content under `[0.2.4-rev.8]` "Fixed" or remove the empty section.
2. Review `backlog/docs/PLAN - 2026-03-10 - otel-native-hybrid-plan.md` — if OTel migration is complete, move to `backlog/completed/docs/`.
3. Review other plans in `backlog/docs/` for completion status.
4. Fix `doc-1 - GLOSSARY.md.md` filename (coordinate with TASK-44.6).
5. Run `pnpm lint:md` to verify.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 **Code quality (DoD §4)**: No orphan empty sections in CHANGELOG; no stale plans masquerading as active work.
- [ ] #2 **Verification (DoD §2)**: `pnpm lint:md` passes; CHANGELOG version entries have clean boundaries.
- [ ] #3 **Accessibility (DoD §6)**: Contributors reading `backlog/docs/` see only active or in-progress plans, not completed work.
<!-- DOD:END -->
