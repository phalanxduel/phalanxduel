# Phalanx Implementation Roadmap

**Last updated:** 2026-02-17 — Phases 0-12a complete, deployment phases 13-16 planned

This file tracks implementation progress across all phases. A new Claude session
should read this file first (via `/resume`) to understand what's done and what's next.

**Status markers:** `[x]` done | `[>]` in progress | `[ ]` pending

---

## Phases

- [x] Phase 0: Resolve design ambiguities
- [x] Phase 1: Add gameplay schemas
- [x] Phase 2: Engine deployment logic
- [x] Phase 3: Engine basic combat
- [x] Phase 4: Engine suit bonuses
- [x] Phase 5: Engine special cards
- [x] Phase 6: Engine turns & victory
- [x] Phase 7: Server match lifecycle
- [x] Phase 8: Observability wiring
- [x] Phase 9: Client game UI
- [x] Phase 10: Overflow damage, player LP, suit bonuses, battle log
- [x] Phase 11: Forfeit action & structured game outcome
- [x] Phase 12: Documentation cleanup & deployment planning
- [x] Phase 12a: Event sourcing, OpenAPI & client contract
- [ ] Phase 13: Per-player state filtering (game integrity)
- [ ] Phase 14: Vite proxy + same-origin WebSocket
- [ ] Phase 15: Engine + server hardening
- [ ] Phase 16: Production deployment

---

## Phase 0: Resolve design ambiguities

- **Status:** DONE (commit `06fb2e6`)
- **Agent:** `doc-updater` (haiku)
- **Dependencies:** none

### Deliverables

- [x] 17 rule IDs defined in `docs/RULES.md`
- [x] 63 `.todo()` test stubs in engine/tests and server/tests
- [x] `docs/TESTPLAN.md` mapping table complete
- [x] Design decisions log in RULES.md
- [x] All ambiguities resolved or marked `TODO: finalize`

### Acceptance

```bash
pnpm rules:check   # 17/17 rule IDs have test stubs
pnpm test           # 9 passing, 63 todo, 0 failing
pnpm typecheck      # passes
```

---

## Phase 1: Add gameplay schemas

- **Status:** PENDING
- **Agent:** use `/add-schema` command (sonnet)
- **Dependencies:** none (Phase 0 complete)

### Deliverables

Add Zod schemas to `shared/src/schema.ts` for:

- [x] `Card` — suit, rank, value
- [x] `Deck` — ordered array of cards
- [x] `GridPosition` — row (0-1), col (0-3)
- [x] `BattlefieldCard` — card + position + currentHp + faceDown flag
- [x] `Battlefield` — 2×4 grid of BattlefieldCard | null
- [x] `PlayerState` — hand, battlefield, drawpile, discardPile
- [x] `GamePhase` — enum: setup, deployment, combat, heroicalWindow, gameOver
- [x] `GameState` — players, activePlayer, phase, turnNumber, rngSeed
- [x] `Action` — discriminated union: deploy, attack, heroicalSwap, pass
- [x] `ActionResult` — success/error with next state

### Acceptance

```bash
pnpm schema:gen     # generates types.ts + JSON Schema without errors
pnpm schema:check   # generated artifacts are fresh
pnpm test:shared    # schema validation tests pass
pnpm typecheck      # all packages compile
```

---

## Phase 2: Engine deployment logic

- **Status:** PENDING
- **Agent:** `engine-dev` (sonnet)
- **Dependencies:** Phase 1

### Deliverables

Implement in `engine/src/`:

- [x] `createDeck()` — PHX-CARDS-001: generate standard 52-card deck
- [x] `shuffleDeck(deck, seed)` — deterministic Fisher-Yates shuffle
- [x] `drawCards(state, playerId, count)` — draw from drawpile to hand
- [x] `deployCard(state, playerId, card, position)` — PHX-DEPLOY-001: place card on grid
- [x] `createInitialState(config)` — set up game for two players
- [x] Alternating deployment (PHX-DEPLOY-002)

### Acceptance

```bash
pnpm test:engine    # all PHX-DEPLOY-* and PHX-CARDS-001 tests pass (not just todo)
pnpm typecheck      # passes
pnpm lint           # passes
```

---

## Phase 3: Engine basic combat

- **Status:** PENDING
- **Agent:** `engine-dev` (sonnet)
- **Dependencies:** Phase 2

### Deliverables

Implement in `engine/src/`:

- [x] `resolveAttack(state, attackerId, targetId)` — PHX-COMBAT-001
- [x] Front-row targeting restriction (PHX-COMBAT-001)
- [x] Back-row targetable when front is empty (PHX-COMBAT-001)
- [x] Damage persistence (PHX-CARDS-002 — currentHp tracking)
- [x] Card destruction → discard pile (PHX-CARDS-002)

### Acceptance

```bash
pnpm test:engine    # all PHX-COMBAT-001 and PHX-CARDS-002 tests pass
pnpm typecheck      # passes
pnpm lint           # passes
```

---

## Phase 4: Engine suit bonuses

- **Status:** PENDING
- **Agent:** `engine-dev` (sonnet)
- **Dependencies:** Phase 3
- **Parallelizable with:** Phase 5

### Deliverables

Implement in `engine/src/`:

- [x] `calculateDamage(attacker, target)` with suit bonus modifiers
- [x] PHX-SUIT-001 — Diamond ×2 defense in front row
- [x] PHX-SUIT-002 — Heart ×2 defense when last card
- [x] PHX-SUIT-003 — Club ×2 damage to back row
- [ ] PHX-SUIT-004 — Spade direct player damage / victory trigger (deferred: no player HP in base rules)

### Acceptance

```bash
pnpm test:engine    # all PHX-SUIT-* tests pass
pnpm typecheck      # passes
pnpm lint           # passes
```

---

## Phase 5: Engine special cards

- **Status:** PENDING
- **Agent:** `engine-dev` (sonnet)
- **Dependencies:** Phase 3
- **Parallelizable with:** Phase 4

### Deliverables

Implement in `engine/src/`:

- [x] PHX-ACE-001 — Ace invulnerability (HP never below 1 from normal attacks)
- [x] PHX-HEROICAL-001 — Heroical swap from hand to battlefield
- [x] PHX-HEROICAL-002 — Heroical defeats Ace
- [ ] PHX-CARDS-003 — Face-down card reveal on damage (deferred: no triggers defined yet)
- [ ] PHX-CARDS-004 — Joker (value 0, no suit, excluded from base rules)

### Acceptance

```bash
pnpm test:engine    # all PHX-ACE-*, PHX-HEROICAL-*, PHX-CARDS-003/004 tests pass
pnpm typecheck      # passes
pnpm lint           # passes
```

---

## Phase 6: Engine turns & victory

- **Status:** PENDING
- **Agent:** `engine-dev` (sonnet)
- **Dependencies:** Phase 4, Phase 5

### Deliverables

Implement in `engine/src/`:

- [x] PHX-TURNS-001 — Turn structure, turn alternation, heroical interrupt window
- [x] PHX-VICTORY-001 — Win condition (all opponent cards destroyed)
- [x] PHX-RESOURCES-001 — Hand card management during combat
- [x] `applyAction(state, action)` — main dispatcher
- [x] `validateAction(state, action)` — action legality checks
- [x] `checkVictory(state)` — victory detection

### Acceptance

```bash
pnpm test:engine    # ALL engine tests pass (0 todo remaining)
pnpm typecheck      # passes
pnpm lint           # passes
```

---

## Phase 7: Server match lifecycle

- **Status:** DONE
- **Agent:** `server-dev` (sonnet)
- **Dependencies:** Phase 6

### Deliverables

Implement in `server/src/`:

- [x] Match creation (POST /matches)
- [x] Player join (WebSocket upgrade)
- [x] Game state broadcasting
- [x] Action validation via engine
- [x] Match state persistence (in-memory)
- [x] Reconnection handling

### Files

- `shared/src/schema.ts` — WS protocol schemas (ClientMessage, ServerMessage)
- `server/src/match.ts` — MatchManager class
- `server/src/app.ts` — WS routing + POST /matches
- `server/tests/match.test.ts` — 19 unit tests
- `server/tests/ws.test.ts` — 6 integration tests

### Acceptance

```bash
pnpm test:server    # 28 tests pass
pnpm typecheck      # passes
pnpm lint           # passes
```

---

## Phase 8: Observability wiring

- **Status:** DONE
- **Agent:** `server-dev` (sonnet)
- **Dependencies:** Phase 7
- **Parallelizable with:** Phase 9

### Deliverables

Implement in `server/src/`:

- [x] `traceWsMessage` spans for all WS message types
- [x] `traceHttpHandler` spans for all HTTP endpoints
- [x] Required span attributes: `match.id`, `player.id`, `action.type`
- [x] Custom metrics: active matches, actions total, action duration, WS connections

### Files

- `server/src/metrics.ts` — OTel metric instruments
- `server/src/app.ts` — metrics recording in handlers

### Acceptance

```bash
pnpm test:server    # server tests still pass with tracing
pnpm otel:up        # observability stack starts
# manual: verify traces appear in Jaeger/Grafana
```

---

## Phase 9: Client game UI

- **Status:** DONE
- **Agent:** general-purpose (sonnet)
- **Dependencies:** Phase 7
- **Parallelizable with:** Phase 8

### Deliverables

Implement in `client/src/`:

- [x] WebSocket connection to server with auto-reconnect
- [x] Battlefield grid rendering (2×4 per player)
- [x] Card display (suit, rank, HP)
- [x] Attack action UI (select attacker → select target)
- [x] Deploy action UI (select hand card → select empty slot)
- [x] Game state display (phase, turn, hand)
- [x] Victory/defeat screen

### Files

- `client/src/connection.ts` — WebSocket client with reconnect
- `client/src/state.ts` — AppState management
- `client/src/renderer.ts` — DOM rendering (4 screens)
- `client/src/cards.ts` — Card display helpers
- `client/src/style.css` — CSS Grid layout + dark theme
- `client/src/main.ts` — Entry point wiring
- `client/index.html` — Updated HTML

### Acceptance

```bash
pnpm build          # client builds (66 kB JS + 4 kB CSS)
# manual: two-player game playable in browser
```

---

## Phase 10: Overflow Damage, Player LP, Suit Bonuses, Battle Log

- **Status:** DONE
- **Agent:** direct implementation + `engine-dev` (sonnet)
- **Dependencies:** Phase 9

### Deliverables

Implement overflow damage model with player LP:

- [x] Phase 1: Schema changes — `lifepoints` on PlayerState, `CombatLogStep`/`CombatLogEntry` schemas, `combatLog` on GameState
- [x] Phase 2: Rule documentation — new rule IDs PHX-LP-001/002, PHX-OVERFLOW-001/002, PHX-COMBATLOG-001; rewritten PHX-SUIT-001-004
- [x] Phase 3: Engine state init — `lifepoints: 20` in createPlayerState, `combatLog: []` in createInitialState
- [x] Phase 4: Combat rewrite — `resolveColumnOverflow` pipeline (front → back → LP), all 4 suit bonuses in overflow context
- [x] Phase 5: Victory/turns — LP depletion victory, multi-card overflow destruction detection
- [x] Phase 6: Tests — ~27 new tests covering LP, overflow, combat log, suit combos
- [x] Phase 7: Server — no changes needed (uses createInitialState automatically)
- [x] Phase 8: Client — LP display from state field, battle log rendering, game over LP detection

### Acceptance

```bash
pnpm lint           # clean
pnpm typecheck      # all 4 packages pass
pnpm test           # 164 passing (30 shared + 106 engine + 28 server), 9 todo
pnpm rules:check    # 23/23 rule IDs covered
pnpm build          # client builds (71 kB JS + 6 kB CSS)
pnpm schema:check   # clean (after committing generated artifacts)
```

---

## Phase 11: Forfeit Action & Structured Game Outcome

- **Status:** DONE
- **Agent:** direct implementation
- **Dependencies:** Phase 10

### Deliverables

- [x] Schema: `VictoryTypeSchema`, `GameOutcomeSchema`, `ForfeitActionSchema`, `outcome` on `GameState`
- [x] Engine: `checkVictory` returns `{ winnerIndex, victoryType }`, forfeit case in `validateAction`/`applyAction`
- [x] Docs: PHX-VICTORY-002 rule in RULES.md + TESTPLAN.md
- [x] Tests: 4 forfeit tests, outcome assertions on VICTORY-001/LP-002, simulation invariant checks
- [x] Server: removed redundant `checkVictory` call (applyAction now sets outcome directly)
- [x] Client: Forfeit button with confirm dialog, game-over screen reads `outcome` directly

### Acceptance

```bash
pnpm lint           # clean
pnpm typecheck      # all 4 packages pass
pnpm test           # 210 passing (35 shared + 147 engine + 28 server), 7 todo
pnpm rules:check    # 24/24 rule IDs covered
pnpm build          # client builds (71 kB JS + 6 kB CSS)
pnpm schema:check   # clean (after committing generated artifacts)
```

---

## Phase 12: Documentation cleanup & deployment planning

- **Status:** DONE
- **Agent:** direct (opus)
- **Dependencies:** Phase 11

### Deliverables

- [x] Fix stale CLAUDE.md client description ("Placeholder only" → actual description)
- [x] Rewrite PROTOCOL.md with actual implemented message types and lifecycle diagram
- [x] Update HOWTOPLAY.md (test counts, suit bonuses, deploy UI, victory conditions, reinforcement)
- [x] Rewrite TASKS.md with deployment-blocking items, accurate priorities, agent assignments
- [x] Add deployment Phases 13-16 to ROADMAP.md with agent/model assignments
- [x] Write retrospective entry

---

## Phase 12a: Event sourcing, OpenAPI & client contract

- **Status:** DONE
- **Agent:** direct (opus)
- **Dependencies:** Phase 12

### Deliverables

Full event sourcing pipeline + OpenAPI + platform-agnostic client documentation:

- [x] Transaction log schemas: `TransactionLogEntrySchema`, 5 detail variants (deploy/attack/pass/reinforce/forfeit)
- [x] Rule IDs: PHX-TXLOG-001/002/003 in RULES.md + TESTPLAN.md
- [x] Engine: `applyAction` produces `TransactionLogEntry` per action with optional `hashFn`/`timestamp`
- [x] Engine: `resolveAttack` returns `{state, combatEntry}` separately
- [x] Engine: `replayGame` function for deterministic match replay/validation
- [x] Engine: `gameStateForHash` helper strips `transactionLog` to avoid circular hashing
- [x] Server: `config` + `actionHistory` stored on MatchInstance for replay
- [x] Server: `handleAction` passes `computeStateHash` + timestamp to engine
- [x] Server: `GET /matches/:matchId/replay` validation endpoint
- [x] Server: OpenAPI 3.1 via `@fastify/swagger` + Swagger UI at `/docs`
- [x] Server: Route schemas on `GET /health`, `POST /matches`, `GET /matches/:matchId/replay`
- [x] Client: `renderBattleLog` reads from `transactionLog` instead of `combatLog`
- [x] Docs: `CLIENT_CONTRACT.md` — comprehensive platform-agnostic client guide
- [x] Docs: `ARCHITECTURE.md` — 3 Mermaid diagrams (component, state machine, event sourcing)
- [x] Docs: `PROTOCOL.md` — Mermaid sequence diagrams, OpenAPI reference, transactionLog

### Files

- `shared/src/schema.ts` — 7 new schemas, `transactionLog` replaces `combatLog` on GameState
- `shared/src/types.ts` + `shared/json-schema/*.json` — regenerated
- `engine/src/turns.ts` — transaction log production in `applyAction`
- `engine/src/combat.ts` — `resolveAttack` returns `{state, combatEntry}`
- `engine/src/replay.ts` — NEW: `replayGame` function
- `engine/tests/rules.test.ts` — PHX-TXLOG-001/002 tests
- `engine/tests/replay.test.ts` — NEW: PHX-TXLOG-003 tests
- `server/src/app.ts` — OpenAPI registration, route schemas, replay endpoint
- `server/src/match.ts` — config/actionHistory storage, hash injection
- `server/tests/match.test.ts` — transaction log + config tests
- `server/tests/health.test.ts` — OpenAPI + POST /matches tests
- `client/src/renderer.ts` — transactionLog extraction
- `docs/CLIENT_CONTRACT.md` — NEW
- `docs/ARCHITECTURE.md` — Mermaid diagrams added
- `docs/PROTOCOL.md` — Mermaid diagrams, OpenAPI reference

### Acceptance

```bash
pnpm lint           # clean
pnpm typecheck      # all 4 packages pass
pnpm test           # 251 passing (43 shared + 174 engine + 34 server), 7 engine todo stubs
pnpm rules:check    # 29/29 rule IDs covered
pnpm build          # client builds
pnpm schema:check   # clean (after committing generated artifacts)
# Manual: GET /docs — Swagger UI renders with all endpoints
# Manual: GET /matches/:id/replay — returns { valid: true } for played matches
```

---

## Phase 13: Per-player state filtering (game integrity)

- **Status:** PENDING
- **Agent:** `server-dev` (sonnet)
- **Dependencies:** Phase 12
- **Parallelizable with:** Phase 14

### Problem

The server broadcasts the full `GameState` to both players. Opponent hand and
drawpile are visible in browser dev tools. This breaks hidden information.

### Deliverables

- [ ] `filterStateForPlayer(state: GameState, playerIndex: number): GameState` — redact opponent hand/drawpile
- [ ] Replace card arrays with counts for opponent: `hand: []` + `handCount: N`, `drawpile: []` + `drawpileCount: N`
- [ ] Schema update: add `handCount` and `drawpileCount` optional fields to `PlayerStateSchema`
- [ ] Update `broadcastState` in `match.ts` to send filtered state per socket
- [ ] Tests: filtered state has no opponent cards, own cards preserved, counts match
- [ ] Client: use `handCount`/`drawpileCount` for opponent stats display

### Acceptance

```bash
pnpm test           # all pass, new filter tests included
pnpm typecheck      # passes
pnpm schema:check   # passes (after committing)
```

---

## Phase 14: Vite proxy + same-origin WebSocket

- **Status:** PENDING
- **Agent:** general-purpose (haiku)
- **Dependencies:** Phase 12
- **Parallelizable with:** Phase 13

### Problem

Client hardcodes `ws://${hostname}:3001/ws`. This prevents deployment behind a
reverse proxy, single-origin setup, or HTTPS.

### Deliverables

- [ ] Add Vite `server.proxy` config: `/ws` → `ws://localhost:3001`
- [ ] Change `client/src/main.ts` WS URL to derive from `window.location` (same origin)
- [ ] Use `wss://` when `location.protocol === 'https:'`
- [ ] Verify dev mode works: `pnpm dev:client` proxies WS to `pnpm dev:server`

### Acceptance

```bash
pnpm build          # client builds
pnpm typecheck      # passes
# manual: dev:client + dev:server, game works via single localhost:5173 URL
```

---

## Phase 15: Engine + server hardening

- **Status:** PENDING
- **Agent:** `engine-dev` (haiku) + `server-dev` (haiku)
- **Dependencies:** Phase 13
- **Parallelizable with:** Phase 14

### Deliverables

Engine fixes:
- [ ] Fix `pass` action to increment `turnNumber`
- [ ] Add test for turn number after pass

Server fixes:
- [ ] Match cleanup: TTL for `gameOver` matches (5 min), abandoned matches (10 min)
- [ ] Decrement `matchesActive` metric on cleanup
- [ ] Per-socket rate limiting (10 msg/sec, return `RATE_LIMITED` error)

Client fixes:
- [ ] Store `matchId`/`playerId`/`playerIndex` in `sessionStorage`
- [ ] On WS reconnect, re-authenticate with stored credentials
- [ ] Clear credentials on "Play Again" or explicit disconnect

### Acceptance

```bash
pnpm test           # all pass with new tests
pnpm typecheck      # passes
pnpm lint           # passes
```

---

## Phase 16: Production deployment

- **Status:** PENDING
- **Agent:** general-purpose (sonnet)
- **Dependencies:** Phase 13, Phase 14, Phase 15

### Deliverables

- [ ] `Dockerfile` — multi-stage build (Node 20 alpine): build client, build server, serve both
- [ ] Server serves client static files from `client/dist/` in production
- [ ] `docker-compose.yml` — single container, expose port 3001
- [ ] Deployment config (Fly.io `fly.toml` or Railway/Render equivalent)
- [ ] Health check verification in deployment
- [ ] `DEPLOYMENT.md` — production deployment guide

### Acceptance

```bash
docker build -t phalanx .
docker run -p 3001:3001 phalanx
# browser: http://localhost:3001 — full game works in single origin
```

---

## Current State (for session resumption)

**Phases 0-12a complete** (core game, event sourcing, OpenAPI, documentation).
Phases 13-16 are the path to a fully deployable game.

### CI status (last verified: 2026-02-17)

- `pnpm lint` — clean
- `pnpm typecheck` — all 4 packages pass
- `pnpm test` — 251 passing (43 shared + 174 engine + 34 server), 7 engine todo stubs
- `pnpm rules:check` — 29/29 rule IDs covered
- `pnpm build` — client builds
- `pnpm schema:check` — clean

### What's deployable now (Phases 0-12a)

The game is functionally complete with full event sourcing: deployment, combat
with overflow damage, LP system, suit bonuses, Ace mechanics, reinforcement,
forfeit, battle log, structured outcomes, transaction log with hash chain
integrity, match replay validation, OpenAPI spec with Swagger UI. All CI gates
pass. Two players can play a full game locally. Any match can be replayed and
validated via `GET /matches/:id/replay`.

### What's needed for deployment (Phases 13-16)

| Phase | What | Why | Agent | Model |
|---|---|---|---|---|
| 13 | State filtering | Game integrity — hide opponent cards | `server-dev` | sonnet |
| 14 | Vite proxy + same-origin WS | Deployment behind any host | general-purpose | haiku |
| 15 | Pass fix + cleanup + rate limit + reconnect | Server stability | `engine-dev` + `server-dev` | haiku |
| 16 | Dockerfile + deploy config | Actually ship it | general-purpose | sonnet |

Phases 13 and 14 can run in parallel. Phase 15 can run in parallel with 14.
Phase 16 requires 13+14+15 to be complete.

---

## Workflow Loop

```
/resume → see what's next → implement phase → /verify → /qa → update ROADMAP.md
```
