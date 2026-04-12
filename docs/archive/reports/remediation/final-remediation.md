# Final Remediation Report

Generated: 2026-04-06

## Summary

14 defects (3 P0, 8 P1, 3 P2) identified in `reports/qa/final-audit.md` have been remediated.
All 730 tests pass across all packages (196 engine, 269 server, 217 client, 52 shared, 4 admin).

---

## P0 Blockers

### TASK-193: Classic Mode HP Reset

**Defect:** `resetColumnHp` exported but never called. All Classic mode games ran as Cumulative.

**Fix:** Added `applyClassicHpReset()` helper in `engine/src/turns.ts` that calls `resetColumnHp` for all columns. Wired at 4 EndTurn boundaries (attack, pass, pass-during-reinforcement, reinforce-completion), all guarded by `modeDamagePersistence !== 'cumulative'`.

**Proof:** `engine/tests/rules-coverage.test.ts` DEF-001 tests confirm HP resets in Classic mode and persists in Cumulative mode.

### TASK-197: Wire matchActions Ledger

**Defect:** `MatchManager` had no `ILedgerStore` field. `appendAction` never called.

**Fix:** Added `private ledgerStore: ILedgerStore` field to `MatchManager` with constructor injection (defaults to `PostgresLedgerStore`). Wired `appendAction` call in `applyValidatedAction()` after `saveTransactionLogEntry`.

**Proof:** `server/tests/ledger-integration.test.ts` verifies entries are appended with correct hash chain continuity.

### TASK-198: Adversarial CI Gate

**Defect:** `server/tests/hardening.test.ts` had only 1 test (16 lines).

**Fix:** Expanded to 7 adversarial test cases covering: unknown matchId, unknown playerId, wrong playerIndex (UNAUTHORIZED_ACTION), out-of-phase action, invalid card ID, non-active player, duplicate action.

**Proof:** `server/tests/hardening.test.ts` — all 7 tests pass.

---

## P1 Rule Corrections

### TASK-195: Club Doubling Without Destruction

**Defect:** Club overflow doubling applied even when front card survived.

**Fix:** Added `&& newBf[frontIdx] === null` guard at `engine/src/combat.ts:125`.

**Proof:** DEF-002 test in `rules-coverage.test.ts` — clubs attacker vs surviving ace, no doubling.

### TASK-194: Hearts Shield Stacking

**Defect:** Front and back heart shields stacked instead of using last destroyed only.

**Fix:** Removed `&& !newBf[column + ctx.columns]` guard at line 110 (allows frontHeartShield to be set regardless of back card). Changed shield selection at line 183 to `backHeartShield > 0 ? backHeartShield : frontHeartShield`.

**Proof:** DEF-003/009 tests in `rules-coverage.test.ts` — two hearts destroyed, only last shields LP.

### TASK-196: Back-Rank Ace Invulnerability

**Defect:** Ace-vs-ace destruction applied at back rank (should only apply at front rank per RULES.md S10).

**Fix:** Added `&& isFrontRow` guard at `engine/src/combat.ts:263`.

**Proof:** DEF-004 test in `rules-coverage.test.ts` — ace attacker overflow to back-rank ace, ace survives.

### TASK-201: Deck Exhaustion

**Defect:** `drawCards` threw when count > drawpile.length.

**Fix:** Clamped with `Math.min(count, player.drawpile.length)` at `engine/src/state.ts:192-194`. Returns state unchanged if actualCount is 0.

**Proof:** DEF-005 test in `rules-coverage.test.ts` — empty drawpile, no error.

### TASK-202: validateAction Contract

**Defect:** Attack with no front-row card silently converted to pass without signaling the caller.

**Fix:** Extended return type to include `implicitPass?: boolean`. Returns `{ valid: true, implicitPass: true }` when no attacker present.

**Proof:** DEF-006 test in `rules-coverage.test.ts` — validates implicitPass field.

---

## System Integrity

### TASK-199: DB Failure Observability

**Defect:** All `catch` blocks in `match-repo.ts` used `console.error` (invisible in production).

**Fix:** Replaced all 9 `console.error` calls with `emitOtlpLog(SeverityNumber.ERROR, ...)` with structured attributes (`db.operation`, `error.message`).

### TASK-200: Drift Config Completeness

**Defect:** `api-playthrough.ts` drift detection omitted `classicDeployment` and `quickStart` from local config.

**Fix:** Added both fields to `localGameConfig.gameOptions` at `bin/qa/api-playthrough.ts:400-401`.

### TASK-203: Wall-Clock in getValidActions

**Defect:** `getValidActions` used `new Date()` for timestamps, breaking determinism.

**Fix:** Added optional `timestamp` parameter with deterministic default `'1970-01-01T00:00:00.000Z'`.

### TASK-204: Simulation Test Timestamps

**Defect:** `engine/tests/simulation.test.ts` used `new Date().toISOString()` in 5 locations.

**Fix:** Replaced all 5 occurrences with fixed `'1970-01-01T00:00:00.000Z'`.

### TASK-207: Empty Hash Skip

**Defect:** `api-playthrough.ts` silently skipped hash comparison when either hash was empty.

**Fix:** Added explicit error throw: `HASH_MISSING: empty hash detected`.

---

## Golden Tests and CI Gates

### TASK-205: Golden Scenario Tests

Created `engine/tests/golden-scenarios.test.ts` with 8 tests covering:
1. Heart shield no-stacking
2. Club no-destruction doubling
3. Back-rank ace survival
4. Deck exhaustion
5. Classic HP reset
6. Replay determinism (deployment sequence)
7. Replay determinism (full game with attack)
8. Duplicate action rejection

### TASK-206: Replay CI Gate

Created `bin/qa/replay-verify.ts` — standalone replay verification that plays games from seed, replays them twice, and verifies identical state hashes and hash chain continuity. Added to `.github/workflows/pipeline.yml` as a CI step.

### TASK-210: Deploy from Tested Docker Image

Modified `.github/workflows/pipeline.yml`:
- `deploy-staging` now depends on `build` job and deploys via `--image` flag using the built image digest
- `promote-production` deploys the same tested image
- No more source rebuilds on Fly.io
