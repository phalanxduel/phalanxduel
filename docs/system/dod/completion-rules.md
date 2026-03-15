---
title: "Definition of Done — Completion Rules"
description: "Husky and task-completion expectations, plus the 'not done if' checklist for identifying incomplete work."
status: active
updated: "2026-03-14"
audience: agent
related:
  - docs/system/DEFINITION_OF_DONE.md
  - docs/system/dod/core-criteria.md
---

# Completion Rules

## Husky and Task-Completion Rules

- Passing pre-commit on staged files is necessary but not sufficient.
- Do not treat a change as done if it only passed `lint-staged` but not the repo-level checks required by its risk.
- Do not bypass Husky, markdown drift checks, schema drift checks, or replay and authority checks without documenting the reason and running equivalent manual verification.
- For PR-backed work tracked in Backlog, move the task to `Human Review` only when a reviewable PR exists, the verification evidence is accessible, and the next action belongs to the human reviewer.
- If review feedback requires more implementation, documentation, or verification, move the task back to `In Progress` until the response is complete.
- A backlog task is not done until human review is complete, the acceptance criteria are satisfied, and the verification evidence is written down.

## Not Done If

The work is not done if any of the following are true:

- docs and runtime knowingly disagree on rules, contracts, or operational behavior
- a trust-boundary question is deferred without an explicit tracked follow-up
- a risky runtime path shipped without enough telemetry or rollback control to support it
- the only evidence is "it seems to work" rather than reproducible commands, tests, or QA
- the verification trail exists only in the author's head and is not accessible to reviewers, operators, or future maintainers
- the code is harder to reason about because ownership, naming, or module boundaries became less clear

When in doubt, choose the narrower claim, document the gap, and track the next step explicitly.
