# Determinism Proof

Generated: 2026-04-06

## Timestamp Elimination

All wall-clock `new Date()` calls removed from engine code and tests:

### Engine Source (`engine/src/`)

- `engine/src/turns.ts:getValidActions` — added optional `timestamp` parameter with deterministic default `'1970-01-01T00:00:00.000Z'`
- Server caller at `server/src/utils/projection.ts:79` passes 2 args; uses deterministic default (clients set their own timestamp when submitting actions)

### Engine Tests (`engine/tests/`)

- `engine/tests/simulation.test.ts` — 5 occurrences of `new Date().toISOString()` replaced with `'1970-01-01T00:00:00.000Z'`

### Verification

```bash
grep -rn "new Date()" engine/src/    # Zero results (all timestamps are parameters)
grep -rn "new Date()" engine/tests/  # Zero results (all timestamps are constants)
```

## Seed-Based Determinism

The engine uses `mulberry32` PRNG seeded from `GameConfig.rngSeed`. All game state is derived deterministically from:

1. `GameConfig` (matchId, players, rngSeed, gameOptions, drawTimestamp)
2. Ordered action list

### Proof via Golden Scenario Tests

`engine/tests/golden-scenarios.test.ts` Scenario 6:
- Creates a game from config + seed
- Plays through deployment and attack phases
- Replays twice independently via `replayGame(config, actions, { hashFn: computeStateHash })`
- Asserts `computeStateHash(replay1.finalState) === computeStateHash(replay2.finalState)`

### Proof via Replay Verification Gate

`bin/qa/replay-verify.ts` (added to CI):
- Plays 20 games from deterministic seeds across classic/cumulative modes
- Replays each game twice independently
- Verifies identical state hashes
- Verifies hash chain continuity (each `stateHashBefore === prev.stateHashAfter`)

## Hash Function

`computeStateHash` (in `shared/src/hash.ts`):
- SHA-256 of JSON with recursively sorted keys
- Canonical: same state always produces same hash regardless of property insertion order
