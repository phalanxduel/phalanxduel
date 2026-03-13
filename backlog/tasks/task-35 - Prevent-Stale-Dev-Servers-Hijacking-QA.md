---
id: TASK-35
title: Prevent Stale Dev Servers Hijacking QA
status: To Do
assignee: []
created_date: '2026-03-12 14:40'
updated_date: '2026-03-13 14:50'
labels: []
dependencies: []
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
