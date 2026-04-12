# CI Gates Report

Generated: 2026-04-06

## Test Gate: `bin/check`

Full build/lint/typecheck/test pass:
- **shared**: 52 tests, 4 files
- **engine**: 196 tests, 17 files (includes 8 new golden scenarios)
- **server**: 269 tests, 39 files (includes 7 adversarial + 2 ledger integration)
- **client**: 217 tests, 23 files
- **admin**: 4 tests, 3 files
- **Go clients**: format check + tests pass
- **Total: 738 tests**

## Adversarial Gate: `server/tests/hardening.test.ts`

7 scenarios covering server-authority enforcement:

| Scenario | Expected Error | Status |
|----------|---------------|--------|
| Unknown matchId | ActionError | PASS |
| Unknown playerId | PLAYER_NOT_FOUND | PASS |
| Wrong playerIndex | UNAUTHORIZED_ACTION | PASS |
| Out-of-phase action (reinforce during DeploymentPhase) | ILLEGAL_ACTION | PASS |
| Invalid card ID | ILLEGAL_ACTION | PASS |
| Non-active player action | ActionError | PASS |
| Duplicate action submission | Validation error | PASS |

## Ledger Integration Gate: `server/tests/ledger-integration.test.ts`

2 scenarios verifying append-only ledger:

| Scenario | Status |
|----------|--------|
| Action appended after handleAction with correct hash fields | PASS |
| Multiple actions maintain monotonic sequence + hash chain | PASS |

## Replay Verification Gate: `bin/qa/replay-verify.ts`

Added to `.github/workflows/pipeline.yml` in the `api-integration` job:
```yaml
- name: Replay verification gate
  run: corepack pnpm exec tsx bin/qa/replay-verify.ts --standalone --count 20 --seed 1
```

Verifies:
- 20 games played from deterministic seeds (10 classic, 10 cumulative, mixed LP)
- Each game replayed twice independently
- State hash identity confirmed across replays
- Transaction log hash chain continuity verified

## Golden Scenario Gate: `engine/tests/golden-scenarios.test.ts`

8 scenarios covering all remediated defects + replay equivalence:

| Scenario | What it proves |
|----------|---------------|
| Heart shield no-stacking | Only last destroyed heart shields LP |
| Club no-destruction | No overflow doubling when front card survives |
| Back-rank ace | Ace-vs-ace destruction only at front rank |
| Deck exhaustion | Empty drawpile returns state unchanged |
| Classic HP reset | Damaged cards reset to full HP after turn |
| Replay determinism (deploy) | Two replays produce identical hash |
| Replay determinism (full game) | Deploy + attack replay is deterministic |
| Duplicate action | Same action twice is rejected |

## Deploy Integrity: `pipeline.yml`

- `deploy-staging` deploys the Docker image built by the `build` job (by digest)
- `promote-production` deploys the same tested image
- No source rebuilds on deployment targets
