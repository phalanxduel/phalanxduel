---
id: TASK-44.8
title: Rule Change Governance Process
status: Done
assignee: ['@antigravity']
created_date: '2026-03-14 04:00'
updated_date: '2026-03-29 22:32'
labels:
  - docs
  - trust-critical
  - governance
milestone: 'm-0: Security Hardening Audit'
dependencies:
  - TASK-44.6
references:
  - docs/gameplay/rules.md
  - docs/reference/dod.md
  - docs/architecture/feature-flags.md
parent_task_id: TASK-44
priority: medium
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
No documented process exists for proposing, reviewing, and deploying rule changes. `DEFINITION_OF_DONE.md` requires citing "affected rule IDs" but does not explain the full governance workflow. Rule changes risk introducing unfair behavior, breaking replay compatibility, or creating undocumented edge cases. There is also no traceable cross-reference between rule IDs in `RULES.md` and their implementation in engine code.

**Concern sources:**
- **Gordon**: Classified missing rule change governance as **CRITICAL**. Recommended `docs/system/RULE_CHANGE_PROCESS.md` covering: rule proposal template, review checklist (fairness, backward-compat, test coverage, docs update), replay impact assessment, player communication strategy, and rollout/rollback plans. Also noted missing rule-ID to code cross-reference.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A `docs/system/RULE_CHANGE_PROCESS.md` (or equivalent) exists documenting: how to propose a rule change, review requirements, backward-compatibility impact on replay data, testing requirements (engine tests, server integration, QA playthrough), and rollout strategy.
- [ ] #2 The process explains how rule changes interact with `pnpm rules:check` and the FSM consistency verification.
- [ ] #3 `DEFINITION_OF_DONE.md` links to the process for rules engine changes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Review current rules/FSM verification: `pnpm rules:check`, `scripts/ci/verify-doc-fsm-consistency.ts`.
2. Review `DEFINITION_OF_DONE.md` change-specific additions for rules engine changes.
3. Draft `docs/system/RULE_CHANGE_PROCESS.md` covering: proposal workflow, fairness review, backward-compat assessment, testing checklist, rollout strategy, and player communication.
4. Link from `DEFINITION_OF_DONE.md` and `CONTRIBUTING.md`.
5. Run `pnpm lint:md` to verify formatting.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 **Spec alignment (DoD §1)**: Rule change process is consistent with `DEFINITION_OF_DONE.md` requirements for rules engine changes.
- [ ] #2 **Fair play and trust (DoD §3)**: The process ensures rule changes are reviewed for fairness and replay compatibility before deployment.
- [ ] #3 **Accessibility (DoD §6)**: A contributor proposing a rule change can follow the documented process from proposal through deployment.
<!-- DOD:END -->
