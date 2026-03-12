---
id: TASK-35
title: PHX-QA-001 - Prevent stale worktree dev servers from hijacking localhost QA
status: To Do
assignee: []
created_date: '2026-03-12 14:40'
labels: []
dependencies: []
---

## Description

Promote the stale-worktree localhost hazard from an inline docs note into a
real QA/tooling task. Local development should either detect or avoid the case
where an older Vite process in another worktree wins `localhost:5173` traffic
and silently hijacks browser-based verification.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Local QA startup has a documented or automated guard against stale worktree Vite servers on port 5173.
- [ ] #2 The canonical workflow makes it hard to accidentally test localhost against stale code from another worktree.
<!-- AC:END -->

## References

- `docs/system/RISKS.md`
- `backlog/completed/docs/PLAN - 2026-03-07 - ship-and-cleanup.md`
