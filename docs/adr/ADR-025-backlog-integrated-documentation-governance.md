---
id: decision-025
title: 'DEC-2A-004 - Backlog-integrated documentation governance'
status: locked
owner: Project Owner + Platform
date: 2026-03-31
---

# DEC-2A-004 - Backlog-integrated documentation governance

## Context

The repository currently carries documentation across `docs/`, `docs/archive/`,
`docs/adr/`, task records, and historical archives. Without an
explicit structure rule, agents and humans can create duplicate summaries,
stale parallel pages, or process notes outside the Backlog surfaces that are
meant to manage active work. That lowers context density and wastes tokens on
dead or overlapping documentation.

## Decision

All active documentation MUST follow the Backlog-integrated structure:

- `docs/adr/` is the canonical home for active architecture and policy
  decisions.
- `docs/archive/` is the canonical home for active workflow docs, active plans,
  and backlog-owned project-process documentation.
- `docs/` is reserved for canonical product, system, operator, API, and user or
  contributor reference documentation.
- `backlog/tasks/` and `backlog/completed/` hold execution history,
  implementation notes, and verification evidence for work, not parallel
  “summary docs” of the same work.
- Duplicate or overlapping documents that restate decision units, plan units,
  or task-owned implementation history MUST NOT be introduced. If historical
  preservation matters, archive or cross-link instead of cloning the content.

## Consequences

- New documentation work must decide its canonical surface before files are
  created.
- Decision-like content belongs in decision records, not in standalone docs that
  happen to discuss a decision topic.
- Temporary plans and completed analyses should be archived or moved to
  completed/history surfaces once no longer active.
- Follow-up cleanup may still be needed to migrate older material, but this
  decision stops further sprawl immediately.
