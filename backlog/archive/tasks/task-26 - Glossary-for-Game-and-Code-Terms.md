---
id: TASK-26
title: Glossary for Game and Code Terms
status: Done
assignee: []
created_date: ''
updated_date: '2026-03-15 19:59'
labels: []
dependencies: []
priority: high
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Phalanx Duel uses domain-specific terms that affect both player understanding and
developer implementation. This task is complete: the repo now has a canonical
glossary in Backlog docs so core terms are defined once instead of being
inferred from code or review notes.

## Historical Outcome

Given a player or contributor encounters domain language such as Phalanx,
Boundary, Carryover, or Target Chain, when they consult the docs, then there is
now a dedicated glossary that explains those terms without forcing them to infer
meaning from implementation details.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given the documentation set, when a reader looks for core Phalanx terms,
  then there is a dedicated glossary document covering the canonical vocabulary.
- [x] #2 Given developer onboarding, when contributors need terminology context,
  then the glossary separates mental-model definitions from the full rules spec.
- [x] #3 Given ambiguous terms used across gameplay and code, when the glossary is
  read, then the reader can map the term to the intended domain meaning.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- `docs/archive/doc-1 - Phalanx Duel Glossary.md` is the canonical glossary created by
  this task.
- The glossary covers both player-facing and developer-facing terms so future
  docs can link to one shared vocabulary source.

## Verification

- `test -f 'docs/archive/doc-1 - Phalanx Duel Glossary.md'`

## References
- `archive/ai-reports/2026-03-11/Gordon-Default/production-readiness-report.md` (L369)
- `archive/ai-reports/2026-03-11/Gemini-2.0-Flash-Exp/production-readiness-report.md` (L107)
- `archive/ai-reports/2026-03-11/Claude-Opus/production-readiness-report.md` (L241)
<!-- SECTION:NOTES:END -->
