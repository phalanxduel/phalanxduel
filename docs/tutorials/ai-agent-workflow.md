---
title: "AI Agent Workflow"
description: "Repo-local Backlog.md behavior: task lifecycle, WIP limits, branching conventions, and verification expectations for all AI agents."
status: active
updated: "2026-04-02"
audience: agent
related:
  - AGENTS.md
  - docs/reference/dod.md
---

# AI Agent Workflow

Use this guide for repo-local Backlog.md behavior that is not captured by the generic Backlog MCP workflow docs.

## Interface Order

1. Prefer Backlog MCP resources and tools when the client exposes them.
2. If Backlog MCP is unavailable, use the Homebrew-installed CLI from the repo
   root:
   - install or update with `brew install backlog-md`
   - run `backlog ...`
3. If the Homebrew-installed CLI is unavailable, stop and restore that setup
   before making further Backlog changes instead of reintroducing a repo-local
   package install path.

If you restore or change MCP client configuration during a Codex session,
restart Codex or open a fresh session before expecting `backlog://...`
resources or Backlog MCP tools to appear.

Prefer the Homebrew-installed CLI over repo-local package installs so MCP
client configuration can call the stable `backlog` binary directly.

All agents: keep using `rtk` in front of shell commands (see [`AGENTS.md`](../../AGENTS.md)).

## Audit-Driven Backlog Creation

When an audit, review, or rules pass finds sequential remediation work, model it
as a dependency DAG in Backlog instead of a flat list.

Create or update Backlog tasks for:

- divergent, partial, or missing rules
- undocumented behaviors
- determinism risks
- cross-surface inconsistencies
- rules gaps
- rules drift findings

Search the existing backlog first and update matching tasks instead of creating
duplicates.

When one finding depends on another, record that relationship explicitly with
Backlog dependencies. Do not leave sequential work implied only in prose.

### DAG Rules

Construct a valid acyclic graph for sequential work:

1. rules fixes before implementation
2. shared contract work before engine, client, or server dependents
3. engine work before client or server work that depends on it
4. determinism fixes as the highest-priority root nodes
5. test-hardening and verification tasks after the implementation they verify

Do not create cycles. If two tasks appear mutually dependent, split the shared
prerequisite into its own upstream task.

Use parent tasks only for true coordination workstreams. Represent execution
order with dependencies, not just parent-child nesting.

### Task Record Expectations

Each audit-derived task should capture enough context for a future agent to act
without reopening the full audit:

- an imperative, outcome-based title
- the rule ID or `NO RULE`
- the affected code location(s)
- the audit section reference
- a short impact statement such as `determinism`, `integrity`, `UX`,
  `exploit-risk`, or `maintainability`
- acceptance criteria written as observable outcomes, including edge cases
- dependencies on existing prerequisite tasks when the work is sequential

If the current backlog label vocabulary cannot encode the desired
surface/type/priority metadata cleanly, record that metadata in the task body
instead of inventing ad hoc labels that the repo does not use.

When reporting audit results, include a DAG view that makes dependency chains
obvious, for example `TASK-201 -> TASK-202 -> TASK-203`.

## Single-Threaded Workflow (Default)

Work directly on `main`. Do not create branches unless a human explicitly requests
one. Branches fragment the backlog: each branch carries a snapshot of task
statuses that diverges from main, and merging them risks regressing `Done`
tasks back to earlier states or losing in-progress notes entirely.

Rules for working on main:

- Keep every commit small and self-contained.
- Commit after each logical unit of work (one task status change, one file
  updated, one verification run passed).
- Never leave main in a broken or partially-applied state.
- If a change is too risky to commit directly, stop and ask the human before
  proceeding — do not buffer it in a branch.

The backlog is a living priority list. It must always reflect:

- What is most important to work on right now
- What is actively in progress and who owns it
- Where a human needs to intervene
- What is definitively done

Fragmented branches make that impossible. Single-threaded main keeps it true.

## CLI Defaults

- Use `--plain` when listing or viewing tasks from the CLI.
- Prefer CLI or MCP operations over hand-editing task markdown.
- Assign the task to the `@`-prefixed tool slug that matches the executor when
  moving it to `In Progress` (`@codex`, `@claude`, `@gemini`), unless a human
  explicitly chooses a different owner.
- Move tasks to `Human Review` only when the PR is reviewable, verification
  evidence is recorded, and the next action belongs to the human reviewer.
- Move tasks from `Human Review` back to `In Progress` when review feedback
  requires more implementation, documentation, or verification.

Examples:

```bash
backlog task list --plain
backlog task 10 --plain
backlog task edit 10 -s "In Progress" -a @codex
backlog task edit 10 -s "Human Review"
backlog task create "PHX-EXAMPLE-001 - Example task" --ac "Outcome is verifiable"
```

## Local Task Conventions

- Statuses come from [`backlog/config.yml`](../config.yml): `Planned`, `To Do`,
  `In Progress`, `Human Review`, `Done`.
- Store active task files (`Planned`, `To Do`, `In Progress`, `Human Review`) in
  `backlog/tasks/`.
- Store completed task files (`Done`) in `backlog/completed/`.
- A task ID must exist in only one on-disk location at a time. When a task
  changes state across that boundary, move the existing file instead of creating
  a duplicate.
- Filenames use the `task-<n> - <title>.md` pattern.
- Frontmatter IDs may use uppercase (`TASK-10`) even when filenames use lowercase (`task-10`).
- Existing tasks are mixed in maturity. Some older records only contain a description. Do not rewrite legacy tasks just to normalize formatting.

## Documentation Placement

- Record active architecture and policy decisions in `docs/adr/`.
- Record active workflow docs, active plans, and backlog-owned process guidance
  in `docs/archive/`.
- Keep `docs/` for canonical reference documentation: product behavior, system
  architecture, operations, API, contributor guidance, and user-facing or
  operator-facing references.
- Do not create duplicate summary docs for existing decisions, tasks, or plans.
  Cross-link to the canonical artifact instead.
- When a doc becomes historical, superseded, or purely retrospective, move it
  to the archive or a completed/history surface instead of leaving it in an
  active directory.

## Workstream Convention

- Tasks that coordinate a strategic stream of work should be titled with the
  prefix `Workstream:`.
- Workstream tasks are normal Backlog.md tasks used by convention, not a
  special task type.
- Treat workstream tasks as coordination tasks, not implementation tasks.
- Workstream tasks may own subtasks when the child work is truly contained by
  that stream.
- Cross-cutting work should be represented with dependencies, not child
  membership.
- Labels may improve readability, but they are not the primary workflow
  mechanism. If the repo does not already use a meaningful label vocabulary,
  skip adding labels instead of inventing a taxonomy just for workstreams.

## Task State Ownership

- `Planned`: the task is shaped but not ready to pull.
- `To Do`: the task is ready to start.
- `In Progress`: the implementer or agent owns the next action.
- `Human Review`: the PR is ready to review, the verification trail is written
  down, and the human reviewer owns the next action.
- `Done`: human review is complete and any required follow-up changes have
  landed.

## WIP Limits

- Keep overall WIP low. Prefer one active `In Progress` task at a time; treat
  two as the normal upper bound unless a human explicitly asks for more.
- Interpret that guidance at the workstream level when a `Workstream:` task is
  active: default to one active workstream at a time and one active
  implementation task inside that workstream. The workstream parent does not
  count as an extra WIP slot on top of the active implementation task.
- Keep `Human Review` to one or two tasks. Do not queue more review-ready work
  than the reviewer can realistically bounce back into `In Progress`.
- If a task is no longer being actively worked, move it back to `To Do`
  immediately. Do not leave stale `In Progress` entries — they mislead other
  agents about what is actually being worked on.
- When review feedback returns a task from `Human Review` to `In Progress`,
  reprioritize that returned work before pulling additional tasks unless a human
  says otherwise.

## Task Quality Bar

When creating new tasks or materially improving an active task record:

- Keep one task scoped to one PR.
- Write outcome-oriented acceptance criteria, not implementation steps.
- Avoid dependencies on tasks that do not exist yet.
- Record an implementation plan before non-trivial code changes.
- Record implementation notes and verification evidence before setting the task to `Done`.

Suggested sections for new or expanded tasks:

1. `## Description`
2. `## Acceptance Criteria`
3. `## Implementation Plan`
4. `## Implementation Notes`
5. `## Verification`

When editing a legacy task, preserve the existing structure unless the missing section is needed for execution or explicitly requested.

## Branching And PRs

The default workflow is single-threaded on `main` (see above). Branches are
the exception, not the rule.

A branch is appropriate only when a human explicitly requests one, or when
CI/CD policy requires a PR for a protected-branch configuration. In that case:

- One task → one branch → one PR.
- Branch format: `tasks/task-<n>-<short-slug>`.
- Keep task-record updates on the same branch as the code change.
- Move the task to `Human Review` when the PR is ready.
- Merge promptly — do not let branches age.
- After merge, delete the branch and pull main immediately.

Do not queue more than one open PR at a time unless a human says otherwise.

When working directly on main (the normal path):

- Commit the task-record update (status, notes, verification evidence) in the
  same commit as the work it describes.
- Move the task to `Human Review` once verification passes and the change is
  pushed to origin/main.
- `Done` is set by the human after review.
- If code lands before the task record is updated, reconcile the task metadata,
  notes, verification evidence, and any matching `AGENTS.md` change in the next
  commit before pulling additional implementation work.

## Cross-Agent Communication

All agents (Claude Code, Codex, Gemini, Cursor, etc.) share a single source
of priorities: `AGENTS.md` at the repo root. Before starting any task, check
`AGENTS.md` for the current focus area.

Do not hardcode a specific task ID in this workflow guide. That information
drifts. Keep the live priority in `AGENTS.md`, and use the Backlog board/list to
confirm the next `To Do`, `In Progress`, or `Human Review` item before starting
work.

When completing work, update:

1. The task file (`status`, `assignee`, implementation notes, verification evidence).
2. `AGENTS.md` if the current priority or active task has changed.

Both updates should land in the same commit as the work they describe.

## Verification

Run targeted checks first, then broaden based on risk.

Common repo checks:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm verify:quick`
- `pnpm verify:all`
- `pnpm --filter @phalanxduel/<package> test`
- `pnpm qa:playthrough:verify` for gameplay or rules changes

Do not mark a task `Done` without concrete verification evidence in the task
notes or final summary. If verification is blocked by unrelated baseline
failures, keep the task in progress and document the blocker.

## Python Tooling

Some repo-local helper flows may use Python utilities. Manage them with `uv`, not ad hoc global installs.

- Install or refresh the local environment with `uv sync --dev`
- Run Python helpers with `uv run --group dev python ...`

Example:

```bash
uv run --group dev python /path/to/script.py
```
