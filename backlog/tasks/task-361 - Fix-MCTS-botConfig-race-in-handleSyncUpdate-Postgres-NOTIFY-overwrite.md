---
id: TASK-361
title: Fix MCTS botConfig race in handleSyncUpdate (Postgres NOTIFY overwrite)
status: To Do
assignee: []
created_date: '2026-07-25 17:10'
labels: []
dependencies: []
references:
  - 'server/src/match.ts:742-822'
  - 'server/src/match.ts:527-552'
  - server/tests/mcts-integration.test.ts
priority: medium
type: bug
ordinal: 228800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`server/tests/mcts-integration.test.ts` ("MCTS Easy difficulty... 100 iterations") fails intermittently — deterministically under `pnpm test:coverage:run` / `verify:ci`, not under plain `vitest run` — with `match!.botConfig?.mctsIterations` returning `undefined`.

Root cause traced in `server/src/match.ts`: `createMatch()` synchronously sets `match.config.botConfig` and constructs the `MatchActor` with the same `botConfig` (match.ts:527-552). Immediately after, the `system:init` ledger write publishes a Postgres `NOTIFY`, which asynchronously triggers `handleSyncUpdate()` (match.ts:742-822). That handler does a wholesale `match.config = updated.config` (line 789) from a fresh `matchRepo.getMatch(matchId)` read. If the DB row's `config` write (including `botConfig`) hasn't landed yet by the time this async read fires, `updated.config` lacks `botConfig`, and the overwrite clobbers the in-memory value that `createMatch` just set. `actor.configureBotOpponent(...)` is only called conditionally (line 790: `if (updated.botConfig && ...)`), so it doesn't re-populate when `updated.botConfig` is missing.

Under normal (non-coverage) execution the test's assertion runs before the NOTIFY round-trip lands, masking the race. Coverage instrumentation slows the event loop enough to expose it reliably.

Discovered/confirmed while investigating a pre-push hook failure during TASK-360.01 follow-up work (game-swiftui narration-ticker session, 2026-07-25) — confirmed via `git log` that this code path predates that session by ~3 months and is unrelated to it. Push was completed with `--no-verify` after explicit user sign-off; this task tracks the real fix.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 handleSyncUpdate no longer wholesale-overwrites match.config when the DB read is missing fields (e.g. botConfig) that are already set in-memory — merge or guard instead of blind assignment
- [ ] #2 server/tests/mcts-integration.test.ts passes reliably under `pnpm test:coverage:run` (not just plain `vitest run`), confirmed by running it back-to-back at least 5x
- [ ] #3 No regression to the legitimate purpose of handleSyncUpdate (syncing player/visibility/state changes from other server instances)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
