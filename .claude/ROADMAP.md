# Phalanx Implementation Roadmap

**Last updated:** Phase 1 complete

This file tracks implementation progress across all phases. A new Claude session
should read this file first (via `/resume`) to understand what's done and what's next.

**Status markers:** `[x]` done | `[>]` in progress | `[ ]` pending

---

## Phases

- [x] Phase 0: Resolve design ambiguities
- [x] Phase 1: Add gameplay schemas
- [ ] Phase 2: Engine deployment logic
- [ ] Phase 3: Engine basic combat
- [ ] Phase 4: Engine suit bonuses
- [ ] Phase 5: Engine special cards
- [ ] Phase 6: Engine turns & victory
- [ ] Phase 7: Server match lifecycle
- [ ] Phase 8: Observability wiring
- [ ] Phase 9: Client game UI

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

- [ ] `createDeck()` — PHX-CARDS-001: generate standard 52-card deck
- [ ] `shuffleDeck(deck, seed)` — deterministic Fisher-Yates shuffle
- [ ] `drawCards(state, playerId, count)` — draw from drawpile to hand
- [ ] `deployCard(state, playerId, card, position)` — PHX-DEPLOY-001: place card on grid
- [ ] `createInitialState(config)` — set up game for two players
- [ ] Alternating deployment (PHX-DEPLOY-002)

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

- [ ] `resolveAttack(state, attackerId, targetId)` — PHX-COMBAT-001
- [ ] Front-row targeting restriction (PHX-COMBAT-001)
- [ ] Back-row targetable when front is empty (PHX-COMBAT-001)
- [ ] Damage persistence (PHX-CARDS-002 — currentHp tracking)
- [ ] Card destruction → discard pile (PHX-CARDS-002)

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

- [ ] `calculateDamage(attacker, target)` with suit bonus modifiers
- [ ] PHX-SUIT-001 — Diamond ×2 defense in front row
- [ ] PHX-SUIT-002 — Heart ×2 defense when last card
- [ ] PHX-SUIT-003 — Club ×2 damage to back row
- [ ] PHX-SUIT-004 — Spade direct player damage / victory trigger

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

- [ ] PHX-ACE-001 — Ace invulnerability (HP never below 1 from normal attacks)
- [ ] PHX-HEROICAL-001 — Heroical swap from hand to battlefield
- [ ] PHX-HEROICAL-002 — Heroical defeats Ace
- [ ] PHX-CARDS-003 — Face-down card reveal on damage
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

- [ ] PHX-TURNS-001 — Turn structure, turn alternation, heroical interrupt window
- [ ] PHX-VICTORY-001 — Win condition (all opponent cards destroyed)
- [ ] PHX-RESOURCES-001 — Hand card management during combat
- [ ] `applyAction(state, action)` — main dispatcher
- [ ] `validateAction(state, action)` — action legality checks
- [ ] `checkVictory(state)` — victory detection

### Acceptance

```bash
pnpm test:engine    # ALL engine tests pass (0 todo remaining)
pnpm typecheck      # passes
pnpm lint           # passes
```

---

## Phase 7: Server match lifecycle

- **Status:** PENDING
- **Agent:** `server-dev` (sonnet)
- **Dependencies:** Phase 6

### Deliverables

Implement in `server/src/`:

- [ ] Match creation (POST /matches)
- [ ] Player join (WebSocket upgrade)
- [ ] Game state broadcasting
- [ ] Action validation via engine
- [ ] Match state persistence (in-memory)
- [ ] Reconnection handling

### Acceptance

```bash
pnpm test:server    # all server tests pass
pnpm typecheck      # passes
pnpm lint           # passes
```

---

## Phase 8: Observability wiring

- **Status:** PENDING
- **Agent:** `server-dev` (sonnet)
- **Dependencies:** Phase 7
- **Parallelizable with:** Phase 9

### Deliverables

Implement in `server/src/`:

- [ ] `traceWsMessage` spans for all WS message types
- [ ] `traceHttpHandler` spans for all HTTP endpoints
- [ ] Required span attributes: `match.id`, `player.id`, `action.type`
- [ ] Custom metrics: match duration, actions per match, concurrent matches

### Acceptance

```bash
pnpm test:server    # server tests still pass with tracing
pnpm otel:up        # observability stack starts
# manual: verify traces appear in Jaeger/Grafana
```

---

## Phase 9: Client game UI

- **Status:** PENDING
- **Agent:** general-purpose (sonnet)
- **Dependencies:** Phase 7
- **Parallelizable with:** Phase 8

### Deliverables

Implement in `client/src/`:

- [ ] WebSocket connection to server
- [ ] Battlefield grid rendering (2×4 per player)
- [ ] Card display (suit, rank, HP)
- [ ] Attack action UI (select attacker → select target)
- [ ] Heroical swap UI
- [ ] Game state display (phase, turn, hand)
- [ ] Victory/defeat screen

### Acceptance

```bash
pnpm build          # client builds without errors
# manual: two-player game playable in browser
```

---

## Workflow Loop

```
/resume → see what's next → implement phase → /verify → /qa → update ROADMAP.md
```
