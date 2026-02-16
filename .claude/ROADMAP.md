# Phalanx Implementation Roadmap

**Last updated:** Phase 9 complete (all phases done)

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

## Current State (for session resumption)

**All 12 phases (0-11) are complete.** The game is fully playable with overflow damage, player LP, battle log, forfeit action, and structured game outcomes.

### CI status (last verified)

- `pnpm lint` — clean
- `pnpm typecheck` — all 4 packages pass
- `pnpm test` — 210 passing (35 shared + 147 engine + 28 server), 7 engine todo stubs
- `pnpm rules:check` — 24/24 rule IDs covered
- `pnpm build` — client builds (71 kB JS + 6 kB CSS)
- `pnpm schema:check` — needs commit of generated artifacts

### Possible next steps (not planned, just ideas)

- Vite proxy config so client dev server proxies `/ws` to server (avoids hardcoded port 3001)
- Match cleanup (remove finished matches from memory)
- Player name display in waiting room
- Mobile responsive polish
- 7 remaining engine `.todo()` test stubs (PHX-CARDS-003/004, etc.)

---

## Workflow Loop

```
/resume → see what's next → implement phase → /verify → /qa → update ROADMAP.md
```
