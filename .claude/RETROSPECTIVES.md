# Phalanx — Retrospectives

This file records a retrospective after each completed task. New sessions should
read this file at the start of each unit of work to carry forward lessons learned.

**Format:** Each entry is written immediately after a task is completed, before
committing. Entries are in reverse chronological order (newest first).

---

## 2026-02-16 — Forfeit action and structured game outcome

**Task:** Add forfeit as a game action, change `checkVictory` to return
structured `{ winnerIndex, victoryType }`, add `GameOutcome` to `GameState`,
remove redundant server-side victory check, simplify client game-over screen.

### What went well

- The schema pipeline (edit schema.ts → pnpm schema:gen) continues to work
  perfectly. Adding `VictoryTypeSchema`, `GameOutcomeSchema`, and
  `ForfeitActionSchema` generated types and 3 new JSON schemas cleanly.
- The `checkVictory` return type change from `number | null` to
  `{ winnerIndex, victoryType } | null` was surgical — only 5 call sites
  needed updating (2 in engine turns.ts, 3 in tests, 1 in server removed).
- All 210 tests pass (up from ~164), including 100-game stress test and
  50-seed validity sweep — the simulation invariant checker now validates
  that `outcome` is present when `phase === 'gameOver'`.
- The server simplification (removing redundant `checkVictory` after
  `applyAction`) was clean because `applyAction` now sets outcome directly.

### What was surprising

- The test count jumped significantly (from ~164 to 210) primarily from
  existing simulation seeds now exercising the new outcome validation path.
  The forfeit-specific tests added were only 4 new tests plus 3 outcome
  assertion updates.
- The server had a subtle redundancy: it called `checkVictory` after
  `applyAction` and conditionally set `phase: 'gameOver'`, but `applyAction`
  already does this. Removing it was a clean simplification that avoided
  double-checking and potential state drift.

### What felt effective

- Following the dependency chain (schema → engine → tests → server → client)
  prevented backtracking. Each layer built cleanly on the previous.
- Reading RETROSPECTIVES.md first reminded me about the `schema:check` CI
  gate behavior (fails until generated artifacts are committed) and the
  importance of running the full test suite, not just engine tests.
- The plan was detailed enough to execute without re-reading code — each
  step was precise about which files and functions to change.

### What to do differently

- Should have added outcome assertions to the existing PHX-VICTORY-001 and
  PHX-LP-002 tests from the start rather than just updating checkVictory
  return expectations. Added the outcome test for VICTORY-001 after noticing
  the gap.
- The client `renderGameOver` still has some duplication (LP summary is
  shown alongside the outcome detail). Could consolidate into a single
  summary line in a future pass.

---

## 2026-02-12 — Overflow damage, player LP, corrected suit bonuses, battle log

**Task:** Rewrite the combat pipeline to implement column overflow damage
(front card -> back card -> player LP), add 20 LP per player, correct all four
suit bonuses for the overflow model, add LP depletion as a victory condition,
and add a structured battle log.

### What went well

- The 8-phase plan mapped perfectly to the dependency chain: schema -> docs ->
  state init -> combat rewrite -> victory/turns -> tests -> server -> client.
  Each phase built cleanly on the previous one with zero backtracking.
- The schema pipeline (edit schema.ts -> pnpm schema:gen) worked flawlessly
  for the new CombatLogStep/CombatLogEntry schemas and lifepoints field.
- The combat rewrite was self-contained in combat.ts with a clean internal
  structure: `resolveColumnOverflow` -> `absorbDamage` per card -> LP step.
  The old `calculateHpReduction` and `applyAttackerSuitBonus` were cleanly
  replaced.
- Server tests needed zero changes — they use `MatchManager.createMatch`
  which calls `createInitialState` automatically, so the new `lifepoints: 20`
  field propagated through with no manual updates.
- All 164 tests pass across 3 packages, up from 111 before this work.

### What was surprising

- Diamond defense in the overflow model required careful math: doubling
  effective HP for absorption but then scaling real HP loss proportionally
  (`realHpLoss = ceil(absorbed * currentHp / effectiveHp)`). Without this,
  a Diamond 5 absorbing 8 damage from its 10 effective HP would think it
  took 8 real damage and get destroyed. The proportional scaling lets it
  survive with 1 HP.
- The reinforcement tests were fragile to the overflow change: K(11) attacking
  a 3HP front card with a 7HP back card now destroys both via overflow (8
  overflow > 7 HP). Had to adjust test scenarios to use weaker attackers and
  stronger back cards to test reinforcement in isolation.
- The `schema:check` CI gate fails on uncommitted generated artifacts — same
  issue noted in a prior retro. This is expected; the fix is to commit the
  generated JSON schemas alongside the source changes.

### What felt effective

- Interleaving the combat rewrite (Phase 4) with test fixes for existing tests
  that broke due to the new semantics caught issues immediately. Each time a
  test broke, the fix revealed a design nuance (Diamond HP scaling, Heart bonus
  moving from card-level to LP-level).
- Writing ~27 new tests in a batch after getting the existing tests passing
  gave high confidence the new code was correct before moving on.
- The client changes were minimal and self-contained: replace `computeLifepoints`
  (summed battlefield HP) with `getLifepoints` (reads `lifepoints` field),
  add `renderBattleLog`, update `renderGameOver` for LP=0 wins.

### What to do differently

- When rewriting a core function like the combat pipeline, should list ALL
  existing tests that depend on it upfront and plan how each will be affected.
  Discovering broken reinforcement tests after the fact took extra debugging.
- The Heart bonus semantics change (from "halve damage to card" to "halve
  overflow to LP") is a fundamental rule change that should be documented
  more explicitly in the commit message, since someone reading the git log
  might not realize the behavior shifted.
- Context window management: this was a large task that spanned two sessions.
  Breaking it into smaller committable chunks (e.g., schema+docs commit,
  engine commit, client commit) would have been safer.

---

## 2026-02-11 — Fix QA specs + stats sidebar widget

**Task:** Fix the `/qa` slash command so the agent uses correct API signatures,
and add a vertical stats sidebar to the game UI showing lifepoints, graveyard
count, last graveyard card, turn number, and whose turn it is.

### What went well

- The plan was clear and self-contained — two independent changes (qa.md + client
  UI) with no cross-dependencies, making implementation straightforward.
- The stats sidebar required no new data sources — everything comes from existing
  `GameState` fields (`battlefield`, `discardPile`, `turnNumber`,
  `activePlayerIndex`). The `cardLabel()` and `suitColor()` helpers from
  `cards.ts` handled card rendering cleanly.
- The `.game-layout` flex wrapper was a minimal structural change — the existing
  `.game` div moves inside `.game-main` with zero changes to its internals.
- typecheck, lint, and build all passed first try with no issues.

### What was surprising

- The QA agent still wrote a failing test despite the cheat sheet — but the
  *type* of failure changed. Before: wrong API signatures (`createInitialState`
  args, `applyAction` return type). After: correct signatures but wrong test
  logic (checking `drawPile` instead of `drawpile`, not alternating deployment
  turns). The cheat sheet fixed the API-level problem as intended.
- The mirrored stat order (opponent: LP→GY→last vs player: last→GY→LP) is a
  small detail but makes the sidebar feel intentional and spatially consistent
  with the board layout.

### What felt effective

- Reading all target files (renderer, css, cards, schema) before writing any
  code gave full confidence about available helpers and data shapes.
- Adding the `Card` type import was the only new import needed — everything else
  was already available.
- The CSS additions were additive only (no modifications to existing rules
  beyond the `#app` max-width bump), minimizing regression risk.

### What to do differently

- The QA cheat sheet should also include property names for state inspection
  (e.g., `gs.players[0].drawpile` not `drawPile`, `gs.players[0].discardPile`).
  The agent got function signatures right but still guessed at property names.
- Could add a "game flow recipe" section to qa.md showing deployment turn
  alternation — the agent consistently tries to deploy all cards for one player
  before switching.

---

## 2026-02-11 — Implement reinforcement mechanic (5 rule IDs, 28 new tests)

**Task:** Add post-destruction reinforcement: auto-advance back row, mandatory
hand card deployment to damaged column, draw to 4, and updated victory
condition requiring total depletion.

### What went well

- The 7-step plan (docs → schema → helpers → transition → action → victory →
  client) followed the dependency chain perfectly. Each step built on the
  previous one with zero backtracking.
- The schema pipeline (edit schema.ts → pnpm schema:gen) continues to work
  flawlessly. Adding `ReinforcementContextSchema`, `ReinforceActionSchema`,
  and the `reinforcement` phase generated types and JSON schemas cleanly.
- Extending `makeCombatState` with optional `hand` and `drawpile` params
  made reinforcement test states easy to construct without a new helper.
- All 28 new tests were written before implementation (TDD), and only one
  test assertion needed correction (auto-advance moved card from back to
  front, test expected back row).

### What was surprising

- The `checkVictory` change from "empty battlefield" to "empty everywhere"
  was a 3-line diff but had cascading effects: the server integration test's
  combat loop hit the reinforcement phase and broke. This was expected but
  reinforces the importance of running the full test suite, not just engine.
- Auto-advance during reinforcement (place card in back row, it auto-advances
  to front if front is empty) creates an interesting game dynamic where you
  can reinforce both slots with a single action in the right circumstances.
- The unused `BattlefieldCard` import in state.ts triggered a typecheck error
  — a reminder that `verbatimModuleSyntax` catches unused type imports too.

### What felt effective

- Writing all PHX-REINFORCE-001 through 005 tests as a batch before any
  implementation gave a clear target for each step. The test stubs in the
  test file served as both documentation and progress tracking.
- The `advanceBackRow` / `isColumnFull` / `getReinforcementTarget` helpers
  being pure functions made them trivially testable in isolation before
  wiring them into `applyAction`.
- Using `reinforcement: { column, attackerIndex }` on GameState cleanly
  tracks context between the attack that triggered reinforcement and the
  reinforce actions that follow.

### What to do differently

- Should have updated the server integration test proactively when modifying
  the victory condition, rather than discovering the break via `pnpm test`.
  Any change to `checkVictory` or `applyAction` will affect the server's
  full-flow test.
- The auto-advance-during-reinforce behavior should probably be called out
  more explicitly in RULES.md — it's implicit from the combination of
  PHX-REINFORCE-001 and PHX-REINFORCE-003 but a reader might miss it.

---

## 2026-02-10 — Remove Heroical code, implement Ace-vs-Ace, add QA script

**Task:** Remove all Heroical code from engine/schema/tests, replace
"Heroical defeats Ace" with "Ace defeats Ace" rule, create tmux QA script.

### What went well

- The schema pipeline worked perfectly: edit schema.ts, run schema:gen,
  everything downstream (types.ts, JSON schemas) updates automatically.
  Removing `HeroicalSwapActionSchema` and `heroicalWindow` phase was clean.
- TypeScript strict mode caught no issues after removing the Heroical code —
  the remaining code had no dependencies on the removed functions.
- The Ace-vs-Ace rule was simple to implement: just swap the `isHeroical`
  check for an `isAce` check in `calculateHpReduction`. Two lines of logic
  replaced about 60 lines of Heroical code.

### What was surprising

- The `schema:check` CI gate compares working tree to committed files via
  `git diff`. This means it will always fail until the generated artifacts
  are committed — you can't verify it passes pre-commit. This is a known
  limitation of the check script design.
- Removing the Heroical code dropped the test count from 111 to 104 (removed
  7 active tests and 3 todo stubs, added 3 new Ace-vs-Ace tests). The net
  loss of tests is acceptable since those tests were for removed functionality.
- The server integration test (`match.test.ts`) had Heroical-aware attacker
  selection logic that was easy to miss — it preferred J/Q/K attackers to
  kill Aces. Changed to prefer Ace attackers for Ace-vs-Ace.

### What felt effective

- Reading all affected files (schema, engine, tests) before making any changes
  gave a complete picture of the Heroical surface area — 9 files touched.
- Making schema changes first, then engine code, then tests follows the
  dependency chain and prevents mid-edit type errors.
- The tmux QA script was straightforward since HOWTOPLAY.md already documented
  the exact steps needed.

### What to do differently

- Should have deleted `HeroicalSwapAction.json` AND re-staged the generated
  JSON schemas in one step. The stale file caused an extra round of
  debugging with `schema:check`.
- When removing a feature that spans schema -> engine -> server -> tests,
  make a checklist of all affected files upfront rather than discovering
  them incrementally.

---

## 2026-02-10 — Create FUTURE.md and clean up deferred rule references

**Task:** Create `docs/FUTURE.md` to hold enhancement ideas, then remove
Heroical, Joker, face-down card, and Spade direct damage references from
RULES.md, HOWTOPLAY.md, TASKS.md, TESTPLAN.md, and CLAUDE.md.

### What went well

- The `rules:check` CI gate cleanly passed after removing 4 rule IDs from
  RULES.md — the script checks RULES.md -> tests (not the reverse), so
  orphaned `.todo()` stubs in the test file don't cause failures.
- All 111 tests passed with no changes to any source code — the cleanup was
  purely documentary, which is exactly right for this kind of task.
- Creating FUTURE.md first, then editing all referencing documents, meant each
  edit could point to a concrete destination rather than just deleting content.

### What was surprising

- The Heroical references were spread across 5 separate documents (RULES.md,
  HOWTOPLAY.md, TASKS.md, TESTPLAN.md, CLAUDE.md) plus the engine/server
  source code. The docs had accumulated overlapping descriptions of the same
  mechanic in different levels of detail.
- PHX-SUIT-004 (Spades) had a full rule section describing a mechanic that
  doesn't exist in v1 — it was essentially future-feature documentation
  masquerading as a current rule. Same for PHX-CARDS-003 (face-down cards).

### What felt effective

- Editing RULES.md incrementally (one section at a time) rather than
  rewriting the whole file avoided accidental deletions and kept the diffs
  reviewable.
- Verifying with `rules:check` and `pnpm test` immediately after edits
  confirmed nothing was broken before committing.
- Keeping the Design Decisions Log entries but rewriting them to say
  "deferred to FUTURE.md" preserves the decision history while being honest
  about scope.

### What to do differently

- Should have created FUTURE.md from the start when these mechanics were
  first documented as "TODO: finalize" — mixing deferred ideas into the
  authoritative rules document created the exact confusion the user noticed.
- When a rule section contains "TODO: finalize," that's a signal it belongs
  in a future/ideas document, not in the current rules.

---

## 2026-02-10 — Dependabot fix, HOWTOPLAY move, and TASKS file

**Task:** Fix the esbuild Dependabot vulnerability, move HOWTO.md to
docs/HOWTOPLAY.md reframed for dev QA, and create a docs/TASKS.md tracking
all outstanding work.

### What went well

- `gh api` for Dependabot alerts gave exact package/version info immediately —
  no need to visit the GitHub web UI.
- `pnpm why esbuild` traced the dependency chain precisely: vitest 2.x -> vite
  5.x -> esbuild 0.21.5 (vulnerable). Upgrading vitest to 3.x resolved it
  cleanly since vitest 3.x uses vite 6.x with esbuild >= 0.25.0.
- All 111 tests passed on vitest 3.2.4 with zero changes to test code — no
  breaking API changes in the vitest 2 -> 3 upgrade for this project's usage.
- Using task tracking (TaskCreate/TaskUpdate) kept the multi-part work
  organized and made progress visible.

### What was surprising

- The vitest 2 -> 3 major version bump was painless — the test API surface used
  here (describe, it, expect, vi.fn, beforeEach, beforeAll, afterAll) is
  identical between versions.
- The local Node version is 18.x but the project requires >= 20. pnpm warns
  about this but everything still works. Worth noting for the user.
- The HOWTOPLAY rewrite ended up substantially different from the original
  HOWTO — reframing it as numbered steps with a "development" context made
  it much more actionable.

### What felt effective

- Doing the vulnerability fix first was the right ordering — it touched
  package.json and pnpm-lock.yaml, so getting that committed before the doc
  changes avoids merge complexity.
- Reading the retro from the prior task reminded me to actually verify via
  tests rather than just trusting the upgrade — the "verify the HOWTO steps"
  lesson applied here too.
- The TASKS.md categorization (Bugs, Docs, Client, Engine, Server,
  Housekeeping) with priority labels gives the user a clear triage view.

### What to do differently

- Should have checked whether vitest 3 requires any config changes to
  `vitest.config.ts` files — it didn't here, but I got lucky. Next time,
  read the migration guide first.
- The esbuild vulnerability was in a transitive dependency (vitest -> vite ->
  esbuild). For future Dependabot alerts, go straight to `pnpm why <package>`
  to find the root dependency that needs upgrading.

---

## 2026-02-10 — HOWTO.md for starting and playing the game

**Task:** Create a HOWTO document covering prerequisites, setup, server/client
startup, the full gameplay sequence, and troubleshooting.

### What went well

- The prior repo evaluation meant most source files were already read and
  understood — only needed to revisit specific details (env vars, port config,
  client WS URL construction, Docker compose).
- Reading the actual source code (not just docs) revealed concrete details that
  docs alone missed: the hardcoded port 3001 in the client, the exponential
  backoff in reconnect logic, the `row: -1` convention for hand card selection.
- The test files (`ws.test.ts`, `match.test.ts`) served as excellent
  documentation of the exact message flow between client and server.

### What was surprising

- The client has no Vite proxy configured — it constructs the WS URL from
  `window.location.hostname` but hardcodes `:3001`. This means the client and
  server must run on the same host or the port must match.
- The deployment UI uses a `row: -1` sentinel value to distinguish "hand card
  selected" from "battlefield card selected" — a non-obvious encoding in the
  `GridPosition` type that was only visible by reading `renderer.ts`.
- The Heroical swap is fully implemented in the engine but has no client UI
  button — worth calling out as a known gap.

### What felt effective

- Following the retrospective lesson from the prior task ("read retros first")
  avoided re-reading files already well understood.
- Writing the HOWTO as a single narrative flow (setup -> start -> play ->
  troubleshoot) rather than a reference-style doc makes it immediately usable
  by someone new.
- Including the suit bonus and special card tables inline means a player doesn't
  need to cross-reference RULES.md while learning.

### What to do differently

- Should verify the HOWTO steps by actually starting the server and client to
  confirm the exact output messages and behavior — documentation written from
  source reading alone may have subtle inaccuracies.
- The troubleshooting section could be expanded over time as real user issues
  surface.

---

## 2026-02-10 — Repository evaluation + retrospective workflow setup

**Task:** Evaluate the entire repository structure, then add a retrospective
convention to the workflow.

### What went well

- Parallel file reads made the full-repo evaluation fast — reading 6-8 files
  per round covered every package in three passes.
- The existing ROADMAP.md and CLAUDE.md gave excellent structural context upfront,
  making it easy to know exactly which files mattered.
- The CLAUDE.md workflow loop was a natural place to embed the retrospective steps
  without creating a separate process document.

### What was surprising

- The project is further along than the PROTOCOL.md suggests — that doc still has
  placeholder TODOs even though the WS protocol is fully implemented in code.
- There are uncommitted files from a prior session (`scripts/demo.ts`,
  `package.json` demo script, `.claude/settings.local.json`) that predate this work.
- All 10 phases are marked complete but 12 test stubs remain as `.todo()` for
  deferred rules (Joker, face-down cards, Spade direct damage).

### What felt effective

- Reading ROADMAP.md first gave a clear mental model before diving into source.
- The commit message style in this repo uses short imperative summaries with
  detail in the body — worth continuing.
- Keeping the retrospective file in `.claude/` alongside ROADMAP.md is consistent
  with the session-resumption pattern already established.

### What to do differently

- Next time, check for stale/outdated docs (like PROTOCOL.md) as part of
  evaluation and flag them explicitly for the user.
- The pre-existing uncommitted files should be addressed — either commit or
  .gitignore them — to keep `git status` clean for future work.
- When the user says "continue," confirm what the next unit of work should be
  rather than assuming.

---

<!-- Add new retrospectives above this line, newest first -->
