# /commit

Stage all modified tracked files, run `pnpm verify:quick` (lint + typecheck + build), then commit with a conventional message. Do not commit if verify:quick fails — fix the error first.

## Steps

1. `rtk git status` — confirm what's changing
2. `rtk pnpm verify:quick` — if it fails, fix and retry before proceeding
3. `rtk git add <specific files>` — stage only relevant files (never `git add -A` blindly)
4. Draft a conventional commit message: `type(scope): short imperative summary`
5. `git commit -m "..."` — include `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
6. Mark the corresponding backlog task Done via `mcp__backlog__task_complete` if applicable

## Conventional types

- `feat` — new user-visible feature
- `fix` — bug fix
- `chore` — maintenance, tooling, config
- `refactor` — internal restructure, no behavior change
- `test` — test-only changes
- `docs` — documentation only

## Notes

- Use `pnpm verify:quick` not `pnpm check` — it's 10× faster and sufficient for non-engine changes
- Use `pnpm check` when engine/, shared/, or server/src/ files changed
- Never use `--no-verify`
