# Configurable Grid & Bot — Branch Status

**Branch:** `feat/configurable-grid-bot`
**Date:** 2026-03-04
**Status:** All deployments (A, B, C) complete and merged to main.

---

## What's Done

### Deployment A: Play vs AI Bot (10 commits, all reviewed)

| Commit | Description |
|--------|-------------|
| `15864fa1` | Engine: parameterize grid dimensions for dynamic rows/columns |
| `bdbf0ee3` | Client: render dynamic grid dimensions from params |
| `b3af8ccd` | Shared: export DEFAULT_MATCH_PARAMS constant |
| `2d0767f6` | Server: add GET /api/defaults endpoint |
| `f91d7730` | Engine: add computeBotAction with random strategy |
| `a23f6ba4` | Engine: export computeBotAction and BotConfig |
| `ffc603d7` | Server: bot match creation with auto-start |
| `02fe7ece` | Server: auto-schedule bot turns after human actions |
| `8d346760` | End-to-end: Play vs Bot button + schema + server wiring |
| `77150255` | Fix: review findings (handleAction reuse, grid params, DRY lobby) |

**Key files:**
- `engine/src/bot.ts` — pure `computeBotAction` (90 LOC, mulberry32 PRNG)
- `engine/tests/bot.test.ts` — 4 tests
- `server/src/match.ts` — BotMatchOptions, createMatch options object, initializeGame extraction, scheduleBotTurn, getMatch
- `server/tests/bot-match.test.ts` — 9 tests
- `shared/src/schema.ts` — `opponent` field on createMatch
- `client/src/lobby.ts` — "Play vs Bot" button, sendCreateMatch helper
- `client/tests/bot-lobby.test.ts` — 1 test

**Verification (2026-03-04):** 336 tests passing, typecheck clean, lint clean.

---

## Completed

All three deployments (A, B, C) are complete and merged to main.

- **Deployment B (Configurable Match Parameters):** Tasks B1-B3 done.
- **Deployment C (Heuristic Bot Strategy):** Task C1 done.

See `TODO.md` for verification status.

---

## Known Issues (Non-Blocking)

1. No AttackPhase/ReinforcementPhase bot tests (engine/tests/bot.test.ts)
2. Bot matches visible in public match feed (no filter)
3. `'human'` in opponent enum is unused but harmless
4. Conditional test branches in bot-match.test.ts may not always execute
5. Exported MatchInstance increases server API surface

---

## Architecture Notes

- Bot logic is a **pure function** in engine — no server deps, deterministic with seeded PRNG
- `scheduleBotTurn` calls `handleAction` (not direct `applyAction`) — bot actions get full telemetry
- `createMatch` uses options object pattern: `(playerName, socket, { gameOptions?, rngSeed?, botOptions? })`
- Bot player has `socket: null` — `broadcastState` naturally skips it
- Turn seed = `botConfig.seed + turnNumber` for variety while maintaining reproducibility
