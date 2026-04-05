---
id: TASK-35
title: Prevent Stale Dev Servers Hijacking QA
status: Done
assignee: []
created_date: '2026-03-12 14:40'
updated_date: '2026-04-05 00:29'
labels:
  - qa
  - tooling
  - testing
milestone: v0.5.0 - Stability & Playability
dependencies: []
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Promote the stale-worktree 127.0.0.1 hazard from an inline docs note into a
real QA/tooling task. Local development should either detect or avoid the case
where an older Vite process in another worktree wins `127.0.0.1:5173` traffic
and silently hijacks browser-based verification.

## Problem Scenario

Given multiple worktrees or local checkouts are active, when QA opens
`127.0.0.1:5173`, then the browser can connect to a stale Vite process from a
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
- [x] #1 Local QA startup has a documented or automated guard against stale worktree Vite servers on port 5173.
- [x] #2 The canonical workflow makes it hard to accidentally test 127.0.0.1 against stale code from another worktree.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Addressed the stale dev server hazard by implementing the Operational Cockpit (pnpm dev:dash).
- The cockpit provides immediate visibility into which containers are running and their health.
- Added a "Validation Staleness" signal that warns the operator if the local source code has changed since the last full verification run (pnpm lint/verify).
- Containerized the Client UI (phalanx-client) to isolate it from host-level Vite process drift.
- The dashboard serves as the automated guard, making failure obvious and actionable before browser-based verification proceeds.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 **Spec Alignment (DoD §1)**: Implementation matches canonical rules and architectural constraints.
- [x] #2 **Verification (DoD §2)**: All changes are covered by automated tests and manual verification evidence is recorded.
- [x] #3 **Trust and Safety (DoD §3)**: The server remains authoritative; no secrets or hidden info leaked.
- [x] #4 **Code Quality (DoD §4)**: Code follows project conventions, modularity, and naming standards.
- [x] #5 **Observability (DoD §5)**: Critical paths emit necessary logs and telemetry for operations.
- [x] #6 **Accessibility (DoD §6)**: Changes are documented and understandable for contributors and users.
- [x] #7 **AI-Assisted Work (DoD §7)**: AI changes are reviewed by a human and follow AGENTS.md.
<!-- DOD:END -->
