---
name: backlog-task-manager
description: Backlog.md task authoring and maintenance for this repo. Use when creating, reviewing, splitting, or updating Backlog.md tasks; when checking whether a task is atomic and testable; or when cleaning up task records during execution.
---

# Backlog Task Manager

Read these first:

1. `backlog://workflow/overview` when Backlog MCP resources are available
2. [`docs/tutorials/ai-agent-workflow.md`](../../../docs/tutorials/ai-agent-workflow.md) for Homebrew CLI, status, and verification rules

## Operating Rules

- Prefer Backlog MCP operations when available.
- In CLI mode, use the Homebrew-installed CLI: install with `brew install backlog-md` if needed, then run `backlog ...`.
- Always use `--plain` when listing or viewing tasks in CLI mode.
- Never invent slash commands for Backlog.md.
- Do not hand-edit task markdown when Backlog MCP or the CLI can make the change safely.
- Search existing tasks before creating new ones so repeated audits do not fork the backlog.
- When sequential work has prerequisites, encode it as a dependency DAG instead of a flat checklist.

## Core Responsibilities

1. Create tasks that are atomic, testable, and scoped to one PR.
2. Review existing tasks for clarity, missing outcomes, and dependency problems.
3. Break broad work into independent tasks in dependency order.
4. Keep task records usable for future AI agents, not just the current operator.

## Task Quality Bar

- Title: short and specific
- Description: explain why and scope, not implementation
- Acceptance Criteria: measurable outcomes, not coding steps
- Dependencies: only reference work that already exists
- Execution notes: add an implementation plan before non-trivial coding begins
- Traceability: include the rule ID or `NO RULE`, code locations, and audit section reference for audit-derived tasks

For audit-derived task sets, enforce these ordering rules:

1. rules fixes before implementation
2. shared work before downstream engine, client, or server tasks
3. engine work before dependent client or server work
4. determinism fixes as root tasks
5. tests and verification after implementation tasks

If the sequence would create a cycle, split the shared prerequisite into a new upstream task.

When creating or materially rewriting a task, prefer this anatomy:

1. `## Description`
2. `## Acceptance Criteria`
3. `## Implementation Plan`
4. `## Implementation Notes`
5. `## Verification`

Legacy tasks in this repo may only contain a description. Preserve that structure unless the task needs more detail to be executed safely.

## Execution Updates

When a task moves from planning to implementation:

- set the status to `In Progress`
- assign it to the `@`-prefixed tool slug that matches the executor
- record the implementation plan before code changes

Before setting a task to `Done`:

- ensure the acceptance criteria are actually satisfied
- record implementation notes
- record concrete verification evidence

## CLI Patterns

Use patterns like these from the repo root:

```bash
backlog task list --plain
backlog task 10 --plain
backlog task edit 10 -s "In Progress" -a @codex
backlog task create "PHX-EXAMPLE-001 - Example task" --ac "Outcome is verifiable"
```
