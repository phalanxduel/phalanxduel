---
id: TASK-35
title: Prevent Stale Dev Servers Hijacking QA
status: Planned
assignee: []
created_date: '2026-03-12 14:40'
updated_date: '2026-03-20 21:40'
labels:
  - qa
  - tooling
  - testing
dependencies: []
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Promote the stale-worktree localhost hazard from an inline docs note into a
real QA/tooling task. Local development should either detect or avoid the case
where an older Vite process in another worktree wins `localhost:5173` traffic
and silently hijacks browser-based verification.

## Problem Scenario

Given multiple worktrees or local checkouts are active, when QA opens
`localhost:5173`, then the browser can connect to a stale Vite process from a
different checkout and make the operator believe they are testing current code.

## Planned Change

Add a documented or automated guard that verifies the expected local client is
the one serving QA traffic before browser-based verification proceeds. This plan
targets the failure mode directly instead of relying on engineers to remember a
manual worktree check every time.

## Delivery Steps

- Given the current QA entry points, when the guard is added, then stale local
  Vite servers are detected or avoided before a browser run starts.
- Given worktree-heavy development, when the workflow is documented, then the
  operator can quickly verify which checkout currently owns the QA port.
- Given a false-positive QA run would waste time, when the guard triggers, then
  the failure is obvious and actionable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Local QA startup has a documented or automated guard against stale worktree Vite servers on port 5173.
- [ ] #2 The canonical workflow makes it hard to accidentally test localhost against stale code from another worktree.
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
