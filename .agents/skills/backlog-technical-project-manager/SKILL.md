---
name: backlog-technical-project-manager
description: Technical project management for coordinated Backlog.md delivery in this repo. Use only when the user explicitly asks Codex to coordinate one or more existing Backlog tasks, manage dependencies, or delegate implementation across multiple agents or worktrees.
---

# Backlog Technical Project Manager

Read these first:

1. `backlog://workflow/overview`
2. `backlog://workflow/task-creation`
3. `backlog://workflow/task-execution`
4. `backlog://workflow/task-finalization`

If Backlog MCP is unavailable in the client, read [`docs/tutorials/ai-agent-workflow.md`](../../../docs/tutorials/ai-agent-workflow.md) and use the Homebrew-installed CLI (`brew install backlog-md`, then `backlog ...`).

## Activation Rule

Use this skill only after explicit user intent such as:

- "act as TPM"
- "take over these tasks"
- "coordinate these Backlog tasks"
- "delegate this work across agents"

If the intent is not explicit, do not activate it.

## TPM Role

Act as coordinator and approver for complex task delivery. Avoid doing the bulk implementation yourself unless the user specifically wants that. Focus on:

- task mapping
- overlap detection
- sequencing
- plan approval
- verification standards

## Coordination Workflow

1. Load each requested task and identify explicit dependencies.
2. Infer overlap risk from touched packages, files, and user-facing flows.
3. Run low-overlap tasks in parallel only when isolation is strong.
4. Keep one active owner, one branch, and one PR per task.

Use a dedicated worktree or clone for each concurrently active task. Do not share one checkout across overlapping task implementations.

## Approval Gate

Before authorizing implementation:

- confirm the plan maps to the task description and acceptance criteria
- confirm the verification plan is concrete
- confirm the sequencing will not cause cross-task conflicts

Require plan revisions when scope or blast radius is unclear.

## Finalization Gate

Before calling a task complete:

- confirm task status and notes are current
- confirm implementation notes and verification evidence exist
- confirm the task record changes live on the owning task branch
- confirm one task still maps to one PR

If the task lacks a formal Definition of Done section, treat verified acceptance criteria plus recorded notes and verification as the minimum completion bar.

## Common Failure Modes

Keep these guardrails in mind:

1. Do not set a task to `Done` when verification is blocked by unrelated baseline failures.
2. Do not leave backlog record edits stranded on `main`.
3. Do not approve broad parallelism for tasks that touch the same packages or generated artifacts.
4. Do not accept "local tests passed" without concrete command evidence.
