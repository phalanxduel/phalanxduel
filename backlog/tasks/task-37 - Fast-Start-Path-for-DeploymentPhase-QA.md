---
id: TASK-37
title: Fast-Start Path for DeploymentPhase QA
status: Planned
assignee: []
created_date: '2026-03-12 14:40'
updated_date: '2026-03-15 22:18'
labels: []
dependencies: []
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Track the slow DeploymentPhase QA setup as explicit backlog work. Test and QA
flows need a fast, intentional way to reach post-deployment phases without
changing the production gameplay rules.

## Problem Scenario

Given QA wants to verify behavior after DeploymentPhase, when they use the
normal game flow, then they must manually fill the full battlefield before the
match advances, which slows testing and makes bug reproduction expensive.

## Planned Change

Provide an explicit QA-only fast-start path that advances to post-deployment
states without changing the live gameplay rules used in production matches. This
plan keeps the optimization inside test tooling or opt-in QA flows so rules
integrity is preserved.

## Delivery Steps

- Given the current DeploymentPhase bottleneck, when the shortcut is added, then
  QA can reach later phases without manually playing a full deployment every
  time.
- Given production rules must remain canonical, when the fast-start path is
  implemented, then it is clearly isolated to test or QA use.
- Given reproduction speed is the goal, when the shortcut is used, then the
  resulting state is deterministic and suitable for automation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 QA and automation can reach post-deployment phases without manually filling all 16 battlefield slots in normal gameplay flows.
- [ ] #2 Any accelerated setup path is explicit and isolated to test or QA use so production rules remain unchanged.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 **Spec Alignment (DoD §1)**: Implementation matches canonical rules and architectural constraints.
- [ ] #2 **Verification (DoD §2)**: All changes are covered by automated tests and manual verification evidence is recorded.
- [ ] #3 **Trust and Safety (DoD §3)**: The server remains authoritative; no secrets or hidden info leaked.
- [ ] #4 **Code Quality (DoD §4)**: Code follows project conventions, modularity, and naming standards.
- [ ] #5 **Observability (DoD §5)**: Critical paths emit necessary logs and telemetry for operations.
- [ ] #6 **Accessibility (DoD §6)**: Changes are documented and understandable for contributors and users.
- [ ] #7 **AI-Assisted Work (DoD §7)**: AI changes are reviewed by a human and follow AGENTS.md.
<!-- DOD:END -->