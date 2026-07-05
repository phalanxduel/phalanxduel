---
title: "AI Collaboration Policy"
description: "Canonical policy for AI-assisted work in Phalanx Duel."
status: active
updated: "2026-07-05"
audience: agent
related:
  - ../../AGENTS.md
  - ../tutorials/ai-agent-workflow.md
  - ../reference/dod.md
  - ../../CONTRIBUTING.md
---

# AI Collaboration Policy

AI agents can accelerate implementation, review, documentation, and operations,
but their output is untrusted until reviewed, tested, and validated through the
same project gates as human-authored work.

## Accountability

- Human reviewers remain accountable for correctness, security, privacy,
  fairness, observability, and maintainability.
- Agents must not bypass project safeguards, hooks, review expectations,
  database isolation, or playability gates.
- Treat generated code, generated documentation, and generated operational
  advice as proposals until verification evidence exists.
- Mark uncertainty clearly. Do not present inferred behavior as confirmed
  behavior without reading the relevant code, docs, or task record.

## Agent Operating Rules

- Use [`AGENTS.md`](../../AGENTS.md) as the root instruction surface.
- Use [`docs/tutorials/ai-agent-workflow.md`](../tutorials/ai-agent-workflow.md)
  for Backlog state, WIP, and verification workflow.
- Use [`docs/reference/dod.md`](../reference/dod.md) for completion criteria.
- Keep task scope narrow and tied to explicit acceptance criteria.
- Update docs, contracts, generated artifacts, and operator runbooks when the
  behavior or workflow they describe changes.
- Do not resume historical or iceboxed work unless Backlog and the human request
  explicitly reactivate it.

## Review And Verification

Before treating AI-assisted work as complete:

1. Run targeted checks for the changed surface.
2. Run broader checks when the change crosses package, contract, gameplay,
   database, or operator boundaries.
3. Record verification evidence in the Backlog task or final summary.
4. Leave the task in `Verification` when human review or external validation is
   the next required action.
5. Move the task to `Done` only when the configured Definition of Done has been
   satisfied or the human explicitly accepts the result.

## Instruction Hygiene

- Keep instruction files short, current, and non-conflicting.
- Prefer canonical docs and links over repeating policy in multiple agent-specific
  files.
- Agent-specific files such as `CLAUDE.md`, `CODEX.md`, and Copilot instruction
  files may add client-specific routing or context, but must not contradict
  `AGENTS.md`.
- Archive stale plans and historical material instead of leaving them in active
  instruction paths.
