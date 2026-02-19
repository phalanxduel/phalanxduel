# Phalanx Implementation Roadmap

**Last updated:** 2026-02-19 — Phases 0-24 complete; Phase 26 complete (spectator mode); Phases 25/25a pending

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
- [x] Phase 13: Per-player state filtering (game integrity)
- [x] Phase 14: Vite proxy + same-origin WebSocket
- [x] Phase 15: Engine + server hardening
- [x] Phase 16: Production deployment
- [x] Phase 17: Lobby UX — Join-via-link flow + layout reorder
- [x] Phase 18: Damage mode option — cumulative vs per-turn HP reset
- [x] Phase 19: Security test coverage — filterStateForPlayer unit + integration tests
- [x] Phase 20: Grafana host-hours — host.name + Fly resource attributes in OTel Resource
- [x] Phase 21: Replay endpoint HTTP Basic Auth (PHALANX_ADMIN_USER / PHALANX_ADMIN_PASSWORD)
- [x] Phase 22: Lobby onboarding — collapsible help panel + copy overhaul
- [x] Phase 23: Tactician's Table visual design + phalanx-site theme alignment
- [x] Phase 24: Mobile responsive layout
- [ ] Phase 25: Post-game replay viewer
- [ ] Phase 25a: Replay endpoint data export + GameConfig schema
- [x] Phase 26: Live spectator mode

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

- **Status:** DONE
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

- **Status:** DONE
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

- **Status:** DONE
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

- **Status:** DONE
- **Agent:** general-purpose (sonnet)
- **Dependencies:** Phase 13, Phase 14, Phase 15

### Deliverables

- [x] `Dockerfile` — multi-stage build (Node 20 alpine): deps → build → runtime
- [x] Server serves client static files from `client/dist/` via `@fastify/static`
- [x] `docker-compose.yml` — single container, expose port 3001
- [x] `fly.toml` — Fly.io deployment config with health check, auto-stop/start
- [x] `.dockerignore` — excludes tests, docs, dev files
- [x] `docs/DEPLOYMENT.md` — production deployment guide
- [x] `tsx` moved to production dependencies (needed at runtime)

### Acceptance

```bash
docker build -t phalanx .
docker run -p 3001:3001 phalanx
# browser: http://localhost:3001 — full game works in single origin
```

---

## Phase 17: Lobby UX — Join-via-link flow + layout reorder

- **Status:** DONE
- **Agent:** direct (opus)
- **Dependencies:** Phase 16

### Deliverables

Client-only UX improvements for the lobby/join flow:

- [x] `renderWaiting` Copy Link button now includes `&mode=<damageMode>` in shared URL
- [x] `renderLobby` detects `?match=` URL param and delegates to `renderJoinViaLink`
- [x] Full lobby layout reordered: name → damage mode → divider → join row → Create Match (bottom)
- [x] New `renderJoinViaLink` function: "Join Match" title, mode badge, name input, join button, "create your own" link
- [x] `clearMatchParam` also clears `mode` URL param
- [x] CSS: `.lobby-divider`, `.join-link-view`, `.mode-badge`, `.create-own-link` styles

### Files

- `client/src/renderer.ts` — lobby split + join-via-link view + Copy Link mode param
- `client/src/state.ts` — `clearMatchParam` clears `mode` param too
- `client/src/style.css` — 4 new style blocks

### Acceptance

```bash
pnpm lint           # clean
pnpm typecheck      # all 4 packages pass
pnpm build          # client builds
# manual: full lobby shows Create Match at bottom
# manual: Copy Link includes &mode= param
# manual: ?match=xxx&mode=per-turn shows join-via-link view with mode badge
# manual: "create your own" link clears URL params and shows full lobby
```

---

## Phase 18: Damage mode option — cumulative vs per-turn HP reset

- **Status:** DONE
- **Agent:** direct
- **Dependencies:** Phase 17

### Deliverables

- [x] Schema: `DamageModeSchema` + `GameOptionsSchema`; threaded through `GameState` and `CreateMatchMessage`
- [x] Engine: per-turn column HP reset behavior after attack resolution when `damageMode === 'per-turn'`
- [x] Server: `createMatch` accepts/persists `gameOptions` and passes through to initial state
- [x] Client: lobby damage mode selector, createMatch payload includes `gameOptions`, mode surfaced in lobby/game UI
- [x] Tests: shared schema tests, engine rules/replay coverage for `PHX-DAMAGE-001`
- [x] Docs: RULES + TESTPLAN updated for `PHX-DAMAGE-001`

### Acceptance

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm schema:check
```

---

---

## Phase 19: Security test coverage — filterStateForPlayer

- **Status:** DONE
- **Agent:** direct (sonnet)
- **Dependencies:** Phase 18

### Deliverables

- [x] `server/tests/filter.test.ts` — 23 unit tests for `filterStateForPlayer`
  - Own hand/drawpile preserved; handCount/drawpileCount not injected on own player
  - Opponent hand → `[]`, drawpile → `[]`, handCount/drawpileCount set to original lengths
  - Verified for both playerIndex 0 and 1
  - Empty hand/drawpile edge cases
  - Pass-through of phase, turnNumber, activePlayerIndex, rngSeed, battlefield, lifepoints, discardPile
  - Immutability: original state arrays not mutated

### Acceptance

```bash
pnpm test:server   # 72 passing (was 44)
pnpm typecheck     # passes
pnpm lint          # passes
```

---

## Phase 20: Grafana host-hours — OTel Resource host attributes

- **Status:** DONE
- **Agent:** direct (sonnet)
- **Dependencies:** Phase 18

### Deliverables

- [x] `server/src/telemetry.ts` — adds `host.name`, `cloud.provider`, `cloud.region`, `service.instance.id` to the OTel Resource
  - `host.name`: uses `FLY_MACHINE_ID` on Fly, falls back to `os.hostname()` locally
  - `cloud.provider=fly_io` when `FLY_APP_NAME` is set
  - `cloud.region` from `FLY_REGION`
  - `service.instance.id` from `FLY_MACHINE_ID`
- [x] `docs/OBSERVABILITY.md` — documents the Fly env vars and host-hours section

### Notes

- Grafana Cloud requires `host.name` in the OTel Resource to count billable hosts
- No Grafana UI changes needed once these attributes are present in emitted telemetry
- Fly sets `FLY_MACHINE_ID`, `FLY_APP_NAME`, `FLY_REGION` automatically

---

## Phase 21: Replay endpoint HTTP Basic Auth

- **Status:** DONE
- **Agent:** direct (sonnet)
- **Dependencies:** Phase 18

### Deliverables

- [x] `server/src/app.ts` — `checkBasicAuth()` helper using `timingSafeEqual` (padded 256-byte buffers), guard on `GET /matches/:matchId/replay`
- [x] `server/tests/replay.test.ts` — 5 integration tests: no auth → 401, wrong creds → 401, wrong scheme → 401, correct creds → proceeds (404 for unknown match)
- [x] `docs/DEPLOYMENT.md` — Security section + env var table entries for `PHALANX_ADMIN_USER` / `PHALANX_ADMIN_PASSWORD`

### Fly.io secrets to set (not in git)

```bash
fly secrets set \
  PHALANX_ADMIN_USER=<your-secret> \
  PHALANX_ADMIN_PASSWORD=<your-secret> \
  --app phalanx-game
```

Local dev defaults: `phalanx` / `phalanx`

### Acceptance

```bash
pnpm test:server   # 72 passing
pnpm typecheck     # passes
pnpm lint          # passes
```

---

## Phase 22: Lobby onboarding — collapsible help panel + copy overhaul

- **Status:** DONE (commits `113553c`, `4196b91`)
- **Repo:** `phalanx` (game client)
- **Dependencies:** Phase 17 (lobby UX)

### Deliverables

- [x] Collapsible "How to play ▼" disclosure toggle in `renderLobby()` — hidden by default, Cinzel label, smooth open/close
- [x] Help panel sections: Quick Start, Victory, Card Values, Suit Powers, The Ace Rule — accurate to current rules
- [x] Waiting room hint paragraph (`waiting-hint`) above Match Code display
- [x] `docs/HOWTOPLAY.md` — Hearts suit description corrected (posthumous shield, not "halves LP")
- [x] Full copy pass: subtitle, damage mode option labels, divider, match input placeholder, join-via-link title/button, "create own" link, waiting room title + label, help panel all-sections
- [x] `About the game & printable rules →` site link at lobby footer → `https://www.just3ws.com/phalanx`

### Files

- `client/src/renderer.ts` — help toggle + panel, renderWaiting hint, site-link anchor
- `client/src/style.css` — `.help-toggle`, `.help-panel`, `.help-panel.is-open`, `.waiting-hint`, `.site-link`
- `docs/HOWTOPLAY.md` — Hearts row corrected

---

## Phase 23: Tactician's Table visual design + phalanx-site theme alignment

- **Status:** DONE (commits `113553c`, `4196b91` in `phalanx`; `fe444c9` in `phalanx-site`)
- **Repos:** `phalanx` (game client) + `phalanx-site` (marketing/docs site)
- **Dependencies:** Phase 22

### Deliverables — phalanx game client

- [x] Google Fonts: Cinzel 600/700 + Crimson Pro 400/600/italic + IBM Plex Mono 400/500 loaded in `index.html`
- [x] Full CSS rewrite: warm dark palette with CSS variables (`--bg`, `--gold`, `--gold-bright`, `--gold-dim`, `--gold-glow`, `--text`, `--text-muted`, `--text-dim`, `--border`, `--border-up`, etc.)
- [x] `body`: Crimson Pro, warm radial gradient background (lamp-over-table effect)
- [x] `.title`: Cinzel, all-caps, letter-spacing 0.28em, gold linear-gradient text fill
- [x] `.subtitle`: Crimson Pro italic, warm muted
- [x] `.btn-primary`: solid antique gold, dark text, hover lift + glow
- [x] `.lobby`: max-width 400px, staggered `fadeUp` entrance animation on all children
- [x] `.lobby-divider`: CSS `::before`/`::after` lines with gradient fade
- [x] `.match-id`: pulsing `pulse-border` animation (amber glow every 3s)
- [x] `.help-panel.is-open`: gold top border, warm surface background
- [x] `.game`, `.stats-sidebar`, `.hand-card`, `.match-id`, `.log-entry`: IBM Plex Mono
- [x] `prefers-reduced-motion` guard missing — **known gap, fix in next session**

### Deliverables — phalanx-site

- [x] Google Fonts: Cinzel + Crimson Pro added in `_layouts/default.html`
- [x] CSS tokens updated to warm palette matching game client
- [x] `.brand`: Cinzel all-caps, gold gradient text
- [x] `.hero h1`: Cinzel, gold gradient, revised copy leads with the duel pitch
- [x] `h1, h2, h3`, `.card h2/h3`: Cinzel globally
- [x] `body`: Crimson Pro, warm radial gradient
- [x] `.button-link.primary`: solid gold button (new variant) — matches game's Create Match
- [x] `.button-link`: hover lift + glow, warm-outlined default
- [x] `.button-link.secondary`: warm outlined
- [x] `.nav-play`: gold pill always visible at end of nav → `https://phalanx-game.fly.dev`
- [x] `index.md` hero: "Play Online →" primary CTA is now the first button in the hero
- [x] `index.md` Digital Alpha card: copy updated, secondary placement

### Files

- `client/index.html` — Google Fonts preconnect + link
- `client/src/style.css` — full rewrite (~700 lines)
- `client/src/renderer.ts` — divider text (em-dashes removed), site-link element
- `phalanx-site/_layouts/default.html` — Google Fonts
- `phalanx-site/assets/css/site.css` — token update + Cinzel/Crimson Pro + button variants + nav-play
- `phalanx-site/_includes/header.html` — Play → nav item
- `phalanx-site/index.md` — hero CTA restructured, Digital Alpha card updated

---

## Phase 24: Mobile responsive layout

- **Status:** DONE (2026-02-18)
- **Agent:** general-purpose (plan) → direct implementation
- **Dependencies:** Phase 23

### Deliverables

- [x] `@media (max-width: 600px)` block — lobby, waiting, game layout, battlefield cells, info bar, column selector, hand, battle log, game-over
- [x] `@media (max-width: 380px)` block — extra-small phones: smaller title, hide card-hp/type labels at extreme widths
- [x] `.game-layout` stacks vertically on mobile; `.stats-sidebar` becomes full-width horizontal strip
- [x] `.lobby` and `.waiting` top margins reduced from 5.5rem → 2rem
- [x] `.title` shrinks from 2.6rem → 1.9rem (600px) → 1.6rem (380px); letter-spacing tightened
- [x] `.game-options` stacks vertically; `.mode-select` goes full-width
- [x] No renderer.ts changes — pure CSS, desktop layout fully preserved

### Acceptance

```bash
pnpm build      # client builds (14 kB CSS, up from 13 kB)
pnpm typecheck  # passes
pnpm lint       # passes
# manual: verify lobby, waiting room, game, game-over on 375px and 320px viewport
```

---

## Phase 25: Post-game replay viewer

- **Status:** PENDING
- **Agent:** general-purpose (sonnet)
- **Dependencies:** Phase 24
- **Parallelizable with:** Phase 25a (independent files)

### Problem

The transaction log and `replayGame()` engine function exist and work. The final
`gameState` broadcast already contains the full `transactionLog` with every action
from the game, and `GameConfig` can be fully reconstructed from `gameState` fields
(`rngSeed`, `players[].player`, `gameOptions`). The client has everything it needs
to replay a finished game — it just has no UI for it and doesn't import the engine.

### Deliverables

- [ ] Add `@phalanx/engine` as a dependency of `@phalanx/client` in `client/package.json`
- [ ] `client/src/replay.ts` (new) — `buildReplayStates(finalState: GameState): GameState[]`
  - Reconstructs `GameConfig` from `finalState` fields
  - Extracts ordered `Action[]` from `finalState.transactionLog`
  - Calls `replayGame(config, actions.slice(0, N))` for N = 0..actions.length
  - Returns the full array of intermediate states (one per action, plus initial state)
  - No `hashFn` — browser replay skips hash verification (it was verified server-side)
- [ ] Store `finalState` on game-over in `client/src/state.ts` (`AppState.replayStates`)
- [ ] `renderReplay(states, currentStep)` in `client/src/renderer.ts`
  - Reuses existing `renderBattlefield`, `renderHand`, `renderStatsSidebar`
  - Adds stepper controls: `◀ Prev` / `▶ Next` / `step N of M` counter
  - Shows full (unfiltered) state — both players' hands visible in replay
  - Highlights the action taken at each step from `transactionLog[step].details`
- [ ] "Replay Match" button on game-over screen → enters replay mode
- [ ] "Return to summary" link exits replay mode back to game-over screen
- [ ] CSS: `.replay-controls`, `.replay-step`, `.replay-btn` styles

### Architecture note

This is entirely client-side. No server changes required. The engine runs in the
browser without `hashFn` (which requires `node:crypto`). The initial state (step 0)
is reconstructed from `GameConfig`; subsequent states are produced by `replayGame`.

### Chess analogy mapping

| Chess PGN | Phalanx replay |
|---|---|
| Starting position | `createInitialState(config)` + `drawCards` |
| Move notation (e.g. `e4`) | `transactionLog[N].action` |
| Board at move N | `replayGame(config, actions.slice(0, N)).finalState` |
| "Replay" button | `renderReplay(states, step)` stepper |

### Acceptance

```bash
pnpm build          # client builds with engine dep (expect ~+50 kB JS)
pnpm typecheck      # passes
# manual: play a game, reach game-over, click "Replay Match"
# manual: step forward/backward through every action, verify board matches live game
# manual: step 0 shows initial deployment state; final step matches game-over state
```

---

## Phase 25a: Replay endpoint data export + GameConfig schema

- **Status:** PENDING
- **Agent:** server-dev (sonnet) + doc-updater (haiku)
- **Dependencies:** Phase 24
- **Parallelizable with:** Phase 25

### Problem

The `GET /matches/:matchId/replay` endpoint currently returns only a validity proof:
`{ valid, actionCount, finalStateHash }`. External tools (third-party clients,
archival scripts, tournament validators) cannot reconstruct or step through the game
because the config and action list are not exposed. Additionally, `GameConfig` is a
TypeScript interface in `engine/src/state.ts` — it has no Zod schema, no JSON Schema
snapshot, and is absent from the OpenAPI spec.

### Deliverables

**Shared schema changes:**
- [ ] `GameConfigSchema` added to `shared/src/schema.ts`:
  ```
  GameConfigSchema = z.object({
    players: z.array(z.object({ id: z.string(), name: z.string() })).length(2),
    rngSeed: z.number(),
    gameOptions: GameOptionsSchema.optional(),
  })
  ```
- [ ] Run `pnpm schema:gen` — regenerate `types.ts` + `json-schema/GameConfig.json`
- [ ] `transactionLog` changed from `.optional()` to required (`z.array(...).default([])`)
  to reflect that it is always present in practice

**Server changes:**
- [ ] Extend replay endpoint response to include full game record when `?include=full`
  query param is provided (still Basic Auth protected):
  ```json
  {
    "valid": true,
    "actionCount": 42,
    "finalStateHash": "sha256-...",
    "config": { "players": [...], "rngSeed": 1234567890, "gameOptions": {...} },
    "actions": [
      { "type": "deploy", "playerIndex": 0, "card": {...}, "column": 0 },
      ...
    ]
  }
  ```
- [ ] OpenAPI schema updated to include `config` and `actions` in replay response

**Documentation:**
- [ ] `docs/PROTOCOL.md` — update replay endpoint section with `?include=full` param
  and sample response
- [ ] `docs/ARCHITECTURE.md` — note that `GameConfig` is now a shared Zod schema

### Why `?include=full` is query-gated

The basic `GET /matches/:matchId/replay` is a lightweight integrity check (sub-ms).
Returning the full action list for a 200-action game could be 20–50 kB. The gate
keeps the default response fast and keeps full export opt-in for admin tooling.

### Acceptance

```bash
pnpm schema:gen     # GameConfig.json generated
pnpm schema:check   # passes
pnpm typecheck      # passes
pnpm lint           # passes
pnpm test           # existing replay tests pass; new tests for ?include=full
# manual: curl -u admin:pass "https://phalanx-game.fly.dev/matches/:id/replay?include=full"
# manual: response contains config + actions array
# manual: paste config + actions into replayGame() → produces valid finalState
```

---

## Phase 26: Live spectator mode

- **Status:** PENDING
- **Agent:** server-dev (sonnet)
- **Dependencies:** Phase 25 (replay UI provides the rendering primitives)
- **Parallelizable with:** Phase 25a

### Problem

The server broadcasts `gameState` exclusively to the two match players. There is no
mechanism for a third party to observe a live game. Adding spectator support enables:
- Watching a friend's game in real time
- Tournament observation
- Debugging/moderation (full unfiltered state visible to spectators)

### Design

Spectators join a match by sending a `spectateMatch` message over WebSocket. The
server registers their socket in a `spectators` set per match and fans out
`gameState` broadcasts to them. Spectators receive the **unfiltered** full state —
both players' hands are visible, as spectators have no hidden-information concerns.
Spectators are read-only: they send only `spectateMatch`, never `action`.

When a spectator connects mid-game, they immediately receive the current full
`gameState` (including the complete `transactionLog` to date).

### Deliverables

**Shared schema changes:**
- [ ] `SpectateMatchMessageSchema` added to `ClientMessageSchema` discriminated union:
  ```
  { type: "spectateMatch", matchId: string }
  ```
- [ ] `SpectatorJoinedSchema` added to `ServerMessageSchema`:
  ```
  { type: "spectatorJoined", matchId: string, spectatorCount: number }
  ```
- [ ] Run `pnpm schema:gen`

**Server changes:**
- [ ] `MatchInstance` gains `spectators: Set<WebSocket>`
- [ ] `handleSpectate(matchId, socket)` on `MatchManager`:
  - Validates match exists and is not in `setup` phase
  - Adds socket to `match.spectators`
  - Sends current full (unfiltered) `gameState` to spectator immediately
- [ ] `broadcastState` (private method in `match.ts`) fans out to `match.spectators`
  with unfiltered state
- [ ] `handleDisconnect` removes spectator socket from `match.spectators`
- [ ] `cleanupMatches` closes and clears spectator sockets on TTL expiry
- [ ] `app.ts` `switch` block handles `spectateMatch` message type
- [ ] OTel: `spectateMatch` span with `match.id`, `spectator.count` attributes
- [ ] Tests: spectator receives state on join; spectator receives state on each action;
  spectator disconnect does not affect game; match with spectators cleans up

**Client changes:**
- [ ] Spectator URL: `?match=<matchId>&spectate=true`
- [ ] `renderLobby` detects `?spectate=true` → shows `renderSpectateView` (name input +
  "Watch Match" button, no damage mode selector)
- [ ] On "Watch Match", send `spectateMatch` message (not `joinMatch`)
- [ ] `renderGame` in spectator mode: shows both players' full hands, no action
  controls (no attack/deploy/pass/forfeit buttons), read-only battlefield
- [ ] CSS: `.spectator-badge` — small "SPECTATING" label in the info bar
- [ ] Spectator count displayed in stats sidebar

### Acceptance

```bash
pnpm schema:gen     # updated ClientMessage + ServerMessage schemas
pnpm schema:check   # passes
pnpm typecheck      # passes
pnpm lint           # passes
pnpm test           # spectator tests pass
pnpm build          # client builds
# manual: two players start a game; open third tab with ?match=xxx&spectate=true
# manual: spectator sees full state (both hands visible)
# manual: each action updates spectator view in real time
# manual: spectator disconnect does not disrupt game
# manual: spectator joining mid-game sees full transactionLog to date
```

---

## Current State (for session resumption)

**Phases 0-24 complete.** Phases 25, 25a, 26 are specced and pending. The game is deployed at https://phalanx-game.fly.dev and is now mobile-responsive. Two media query blocks were added to `client/src/style.css`: ≤600px stacks the game layout vertically (sidebar becomes a horizontal strip), shrinks the lobby top margin and title, and reduces battlefield font sizes; ≤380px further tightens the title and hides card HP/type labels at extreme widths. No renderer.ts changes — desktop layout fully preserved.

### Resume Handoff Note (Claude)

Before taking roadmap status at face value, reevaluate it from recent history:

1. Inspect the last few commits to reconstruct what was actively in progress.
2. Treat the latest commit as the intermediate-work checkpoint for this handoff.
3. Reconcile roadmap checkboxes/status against code/test reality before adding
   any new phase work.

Suggested commands:

```bash
git log --oneline -n 6
git show --stat --name-only HEAD
```

### Known gaps / first items for next session

1. **Docker build not validated in CI** — `docker build` has never been run in a CI context.

### CI status (last verified: 2026-02-18)

- `pnpm lint` — clean
- `pnpm typecheck` — all 4 packages pass
- `pnpm test` — 322 passing (55 shared + 188 engine + 79 server), 7 engine todo stubs
- `pnpm rules:check` — 30/30 rule IDs covered
- `pnpm build` — client builds clean
- `pnpm schema:check` — clean

### What's deployable

The game is live at **https://phalanx-game.fly.dev**. Features: deployment, combat with
overflow damage, LP system, suit bonuses, Ace mechanics, reinforcement, forfeit,
battle log, structured outcomes, transaction log with hash chain integrity, match
replay validation (Basic Auth protected), OpenAPI spec with Swagger UI, per-player
state filtering (tested), same-origin WebSocket, match TTL cleanup, rate limiting,
session reconnection, Dockerfile, docker-compose, Fly.io config, static file serving,
join-via-link lobby flow, configurable cumulative/per-turn damage mode,
Grafana Cloud OTLP with host-hours resource attributes, full Tactician's Table visual
design (Cinzel/Crimson Pro/IBM Plex Mono, warm gold palette, entrance animations),
collapsible in-lobby help panel with accurate rules, lobby link to about page. All CI gates pass.

---

## Workflow Loop

```
/resume → see what's next → implement phase → /verify → /qa → update ROADMAP.md
```
