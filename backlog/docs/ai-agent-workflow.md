# AI Agent Workflow

Use this guide for repo-local Backlog.md behavior that is not captured by the generic Backlog MCP workflow docs.

## Interface Order

1. Prefer Backlog MCP resources and tools when the client exposes them.
2. If Backlog MCP is unavailable, use the repo-local CLI from the repo root:
   - `pnpm exec backlog ...`
   - `pnpm backlog ...`
3. If the repo-local binary is unavailable but Bun is installed globally, `bunx backlog.md ...` is an acceptable fallback.

Prefer the repo-local CLI over a global install so the Backlog.md version matches [`package.json`](../../package.json).

For Codex shell usage, keep using `rtk` in front of commands.

## CLI Defaults

- Use `--plain` when listing or viewing tasks from the CLI.
- Prefer CLI or MCP operations over hand-editing task markdown.
- Assign the task to the active agent when moving it to `In Progress`.
- Move tasks to `Human Review` only when the PR is reviewable, verification
  evidence is recorded, and the next action belongs to the human reviewer.
- Move tasks from `Human Review` back to `In Progress` when review feedback
  requires more implementation, documentation, or verification.

Examples:

```bash
pnpm exec backlog task list --plain
pnpm exec backlog task 10 --plain
pnpm exec backlog task edit 10 -s "In Progress" -a @codex
pnpm exec backlog task edit 10 -s "Human Review"
pnpm exec backlog task create "PHX-EXAMPLE-001 - Example task" --ac "Outcome is verifiable"
```

## Local Task Conventions

- Statuses come from [`backlog/config.yml`](../config.yml): `Planned`, `To Do`,
  `In Progress`, `Human Review`, `Done`.
- Filenames use the `task-<n> - <title>.md` pattern.
- Frontmatter IDs may use uppercase (`TASK-10`) even when filenames use lowercase (`task-10`).
- Existing tasks are mixed in maturity. Some older records only contain a description. Do not rewrite legacy tasks just to normalize formatting.

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
- Keep `Human Review` to one or two tasks. Do not queue more review-ready work
  than the reviewer can realistically bounce back into `In Progress`.
- If a task is no longer being actively worked, move it back to `To Do` instead
  of leaving it parked in `In Progress`.
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

- Prefer one task branch and one PR per task.
- A good branch format is `tasks/task-<n>-<short-slug>`.
- Keep task-record updates on the same branch as the code change that satisfies the task.
- Move the task to `Human Review` when the PR is ready for review.
- If review feedback requires more work, move the task back to `In Progress`
  until the response is implemented and re-verified.
- Do not move the task to `Done` until the human review is complete.
- Normal path: implementation happens on the task branch/worktree, the branch is
  pushed to GitHub, a human reviews and merges the PR, then the human moves the
  task from `Human Review` to `Done`.
- After a task moves from `Human Review` to `Done` on the normal PR path,
  refresh local `main` and clean up the associated merged worktree unless a
  human explicitly wants it kept for immediate follow-up work.
- Direct-to-`main` exception: if the approved work happened directly on local
  `main` instead of a PR-backed task branch, the human moving the task from
  `Human Review` to `Done` means the agent should immediately commit and push
  the repo-state updates that reflect that review outcome.

## Verification

Run targeted checks first, then broaden based on risk.

Common repo checks:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm check:quick`
- `pnpm check:ci`
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
