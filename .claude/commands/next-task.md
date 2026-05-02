# /next-task

Identify and begin the next highest-priority backlog task.

## Steps

1. Check `AGENTS.md` → Current Priority section
2. `mcp__backlog__task_list` with status filter — confirm nothing is `In Progress` or `Human Review`
3. Pick the highest-priority `Ready` task (respect milestone ordering and dependencies)
4. `mcp__backlog__task_view` — read the full task spec
5. `mcp__backlog__task_edit` — set status to `In Progress`
6. Report: task ID, title, acceptance criteria, and your implementation plan in ≤5 bullets
7. Do not start implementation until the plan is stated — user can redirect before work begins

## Do not start if

- Any task is `In Progress` or `Human Review` (check first)
- `pnpm qa:playthrough:verify` is broken (fix the gate first)
