---
id: TASK-380
title: >-
  Spike: on-device Apple Intelligence for presentation-layer narration
  (non-authoritative)
status: To Do
assignee: []
created_date: '2026-07-26 19:55'
labels:
  - swiftui
  - exploratory
dependencies: []
references:
  - docs/architecture/principles.md
  - docs/architecture/versioning.md
priority: low
type: spike
ordinal: 247800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Explore Apple's Foundation Models framework for generating natural-language match narration, adaptive flavor text, or accessibility descriptions of board state in the SwiftUI client — presentation layer only. Must not touch validActions or any gameplay decision, per docs/architecture/principles.md's server-authoritative model and docs/architecture/versioning.md's deterministic-replay requirement, both of which an on-device LLM violates if wired into actual rules. Explicitly out of scope for the alpha packaging work; low priority until there's appetite to scope it properly.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
