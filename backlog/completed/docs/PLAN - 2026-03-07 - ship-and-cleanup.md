# Ship & Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Push 31 unpushed commits to remote, clean up stale branches and worktrees, handle uncommitted files, update stale docs, bump version, and deploy to Fly.io.

**Architecture:** Sequential housekeeping. No code changes needed — this is push, prune, document, deploy. Each task is independently valuable and safe to stop after.

**Tech Stack:** git, GitHub (HTTPS push), Fly.io CLI, pnpm

---

## Task 1: Verify CI gate locally before push

We're about to push 31 commits. Run the full CI gate locally first to catch anything GitHub Actions would flag.

#### Step 1: Run lint

Run: `rtk pnpm lint`

Expected: Clean (no errors).

#### Step 2: Run typecheck

Run: `rtk pnpm typecheck`

Expected: Clean (no errors).

#### Step 3: Run full test suite

Run: `rtk pnpm -r test`

Expected: All packages pass. Server: 86 tests, Client: 159+, Engine: 81, Shared: 18.

#### Step 4: Run schema check

Run: `rtk pnpm schema:check`

Expected: PASS (artifacts up to date).

#### Step 5: Run rules check

Run: `rtk pnpm rules:check`

Expected: PASS.

#### Step 6: Run format check

Run: `rtk pnpm format:check`

Expected: PASS.

#### Step 7: Run markdown lint

Run: `rtk pnpm lint:md`

Expected: PASS (or only warnings on plan docs).

**Do NOT proceed to Task 2 if any step fails. Fix the failure first.**

---

## Task 2: Handle uncommitted files

There are two uncommitted items in the working tree.

#### Step 1: Commit bump-version.sh

The `bin/maint/bump-version.sh` script is a useful maintenance utility that bumps version across all package.json files, SCHEMA_VERSION, and CHANGELOG.md. It belongs in the repo.

Run:

```bash
git add bin/maint/bump-version.sh
git commit -m "$(cat <<'EOF'
chore: add version bump maintenance script

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

#### Step 2: Revert the package.json context scripts

The `package.json` has 4 `context:*` scripts referencing `project-context/scripts/` which does not exist in the repo. These are orphaned references. Revert them.

Run:

```bash
git checkout -- package.json
```

Verify: `rtk git status` shows clean working tree (no modified or untracked files).

---

## Task 3: Push to GitHub remote

SSH to github.com is broken (key auth fails). Use HTTPS.

#### Step 1: Push main to origin

Run:

```bash
git push https://github.com/phalanxduel/phalanxduel.git main
```

Expected: 32 commits pushed (31 existing + 1 from Task 2). GitHub Actions CI will trigger automatically on push to main.

#### Step 2: Verify CI started

Run:

```bash
rtk gh run list --limit 1
```

Expected: A workflow run in `queued` or `in_progress` state for the latest commit.

#### Step 3: Wait for CI to complete

Run:

```bash
rtk gh run list --limit 1
```

Re-check after ~2-3 minutes. Expected: `completed` with `success` conclusion.

If CI fails: read the failure with `rtk gh run view <run-id> --log-failed`, fix locally, commit, and re-push.

---

## Task 4: Clean up stale branches

#### Step 1: Delete merged feature branch

`feat/configurable-grid-bot` is fully merged into main (0 unique commits).

Run:

```bash
git branch -d feat/configurable-grid-bot
```

Expected: `Deleted branch feat/configurable-grid-bot`.

#### Step 2: Assess remaining local branches

Check each branch for unmerged work:

```bash
rtk git log --oneline docs/preact-rollout-gates ^main | head -5
rtk git log --oneline docs/ab-env-contract ^main | head -5
rtk git log --oneline refactor/admin-ab-tests-fetch ^main | head -5
rtk git log --oneline feat/admin-ab-tests-endpoint ^main | head -5
rtk git log --oneline v1.0 ^main | head -5
rtk git log --oneline v0.2-maintenance ^main | head -5
```

For each branch:
- If 0 unique commits (fully merged): delete with `git branch -d <name>`
- If has unique commits: **ask user** whether to keep or delete. Do NOT force-delete without confirmation.

#### Step 3: Clean up worktree for chore/husky-quality-gates

There's a worktree at `~/github.com/phalanxduel/.worktrees/game/husky-quality-gates`.

First check if it has uncommitted work:

```bash
git -C ~/github.com/phalanxduel/.worktrees/game/husky-quality-gates status
```

If clean (no uncommitted changes), **ask user** if it's safe to remove:

```bash
git worktree remove ~/github.com/phalanxduel/.worktrees/game/husky-quality-gates
git branch -d chore/husky-quality-gates
```

If it has uncommitted work: report to user and skip.

#### Step 4: Verify clean branch list

Run: `rtk git branch`

Expected: Only `main` plus any branches the user chose to keep.

---

## Task 5: Update stale documentation

#### Step 1: Update configurable-grid-bot-status.md

The file `docs/plans/configurable-grid-bot-status.md` says Deployment B and C are "NOT STARTED" but both are complete per `TODO.md`. Update the "What's Next" section.

Replace the entire "What's Next" section (lines 39-74) with:

```markdown
## Completed

All three deployments (A, B, C) are complete and merged to main.

- **Deployment B (Configurable Match Parameters):** Tasks B1-B3 done.
- **Deployment C (Heuristic Bot Strategy):** Task C1 done.

See `TODO.md` for verification status.
```

#### Step 2: Commit documentation update

Run:

```bash
git add docs/plans/configurable-grid-bot-status.md
git commit -m "$(cat <<'EOF'
docs: update configurable-grid-bot status to reflect completion

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

#### Step 3: Push the doc update

Run:

```bash
git push https://github.com/phalanxduel/phalanxduel.git main
```

---

## Task 6: Bump version to 0.3.0

All TODO items (P0-P3) are complete. Major features added since 0.2.4-rev.8:
- Auth system (register, login, session restore, WebSocket auth)
- Bot gameplay (random + heuristic strategies)
- Configurable match parameters
- Preact component migration

This warrants a minor version bump.

#### Step 1: Run the bump script

Run:

```bash
bash bin/maint/bump-version.sh 0.3.0
```

Expected: Updates all `package.json` files, `SCHEMA_VERSION`, and `CHANGELOG.md`.

#### Step 2: Review the changes

Run: `rtk git diff`

Verify:
- All `package.json` files show `"version": "0.3.0"`
- `shared/src/schema.ts` shows `SCHEMA_VERSION = '0.3.0'`
- `CHANGELOG.md` has new `## [0.3.0]` header

#### Step 3: Run schema:check to regenerate if needed

Run: `rtk pnpm schema:check`

If it fails (schema version mismatch), run: `pnpm schema:gen` then re-check.

#### Step 4: Run full CI gate

Run: `rtk pnpm lint && rtk pnpm typecheck && rtk pnpm -r test`

Expected: All pass.

#### Step 5: Commit and push

Run:

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: bump version to 0.3.0

Includes: auth system, bot gameplay, configurable match params, Preact migration.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
git push https://github.com/phalanxduel/phalanxduel.git main
```

---

## Task 7: Deploy to Fly.io

Current Fly.io deployment is version 53, running stale code. Deploy the new version.

#### Step 1: Build locally to verify

Run: `rtk pnpm build`

Expected: All packages build successfully.

#### Step 2: Deploy

Run:

```bash
fly deploy
```

Expected: Build and deploy succeeds. New machine starts with health check passing.

#### Step 3: Verify deployment

Run:

```bash
fly status
```

Expected: At least one machine in `started` state with passing health check, running a newer version than 53.

#### Step 4: Smoke test the live site

Run:

```bash
curl -s https://phalanxduel.fly.dev/api/health | head -5
```

Expected: 200 OK with health status.

Optionally check the auth endpoints exist:

```bash
curl -s -o /dev/null -w "%{http_code}" https://phalanxduel.fly.dev/api/auth/me
```

Expected: `401` (no token provided — proves the endpoint exists and responds correctly).

---

## Summary

| Task | Description | Risk | Value |
|------|-------------|------|-------|
| 1 | Local CI verification | None | Gate for safe push |
| 2 | Handle uncommitted files | None | Clean working tree |
| 3 | Push 32 commits to GitHub | Very low | Protect all work |
| 4 | Clean up stale branches | Low | Reduce clutter |
| 5 | Update stale docs | None | Accurate project state |
| 6 | Bump version to 0.3.0 | Low | Semantic milestone |
| 7 | Deploy to Fly.io | Medium | Ship to production |

**Safe stopping points:** After any task. Each is independently valuable.

**Highest-risk task:** Task 7 (deploy). If anything goes wrong, `fly deploy --image <previous-image>` rolls back.
