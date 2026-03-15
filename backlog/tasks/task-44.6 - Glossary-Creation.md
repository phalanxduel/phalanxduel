---
id: TASK-44.6
title: Glossary Creation
status: To Do
assignee: []
created_date: '2026-03-14 04:00'
updated_date: '2026-03-14 04:00'
labels:
  - docs
  - onboarding
dependencies:
  - TASK-26
references:
  - docs/RULES.md
  - backlog/tasks/task-26 - Glossary-for-Game-and-Code-Terms.md
parent_task_id: TASK-44
priority: medium
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
No centralized glossary exists for domain-specific terms used across the codebase and documentation. Terms like "action," "intent," "turn," "phase," "transaction log," "player index," "Target Chain," and "Boundary" appear throughout `RULES.md`, engine code, and server logic without a single reference point. The existing backlog entry (`backlog/docs/doc-1 - Phalanx Duel Glossary.md`) has a double `.md` extension and the glossary itself was never created. Note: TASK-26 already tracks glossary creation — this task surfaces the hardening audit's cross-report concern and should be coordinated with or superseded by TASK-26.

**Concern sources:**
- **Gordon**: Listed missing glossary as a Gap 4 concern for contributor onboarding, citing terms like "turn, phase, action, state, event, transaction log, player index."
- **Gemini CLI**: Listed glossary as missing documentation, noting it "should be formally integrated into the `docs/` structure."
- **Claude Code/Opus 4.6**: Flagged `backlog/docs/doc-1 - GLOSSARY.md.md` double `.md` extension as a backlog filename convention issue.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A `GLOSSARY.md` exists (location TBD — `docs/` root or `docs/system/`) defining key domain terms used in `RULES.md`, engine code, and server logic.
- [ ] #2 The glossary covers at minimum: action, intent, turn, phase, round, state, player index, card rank/suit, battlefield, phalanx, Target Chain, transaction log, event log, replay, hash.
- [ ] #3 The double `.md` extension on `backlog/docs/doc-1 - GLOSSARY.md.md` is fixed (renamed to `doc-1 - Phalanx Duel Glossary.md` or similar).
- [ ] #4 `docs/RULES.md` and `README.md` link to the glossary.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Coordinate with TASK-26 to avoid duplicate work — this task may be closed in favor of TASK-26 if that task's scope already covers the hardening audit concerns.
2. Extract key terms from `docs/RULES.md`, `engine/src/`, and `server/src/`.
3. Draft `docs/GLOSSARY.md` with concise definitions for each term.
4. Fix `backlog/docs/doc-1 - GLOSSARY.md.md` filename.
5. Add glossary links from `RULES.md` and `README.md`.
6. Run `pnpm lint:md` to verify markdown formatting.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 **Spec alignment (DoD §1)**: Glossary terms are consistent with their usage in `RULES.md` and code.
- [ ] #2 **Accessibility (DoD §6)**: A new contributor can look up any domain-specific term without reading the full rules spec.
- [ ] #3 **Verification (DoD §2)**: `pnpm lint:md` passes; glossary file exists and is linked from canonical docs; backlog filename is corrected.
<!-- DOD:END -->
