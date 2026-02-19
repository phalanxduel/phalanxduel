# Phalanx Implementation Roadmap

**Last updated:** 2026-02-19 — Phases 0-24 + 26 complete; Phase 26-post (UX polish + health indicator) complete; Phases 25/25a pending

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
- [ ] Phase 27: Customizable game rules & card set selection

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

- **Status:** DONE (commits `fdf6351`, `74132e5`, `5bb1a54`)
- **Agent:** direct (sonnet)
- **Dependencies:** Phase 24

### Deliverables

**Shared schema:**
- [x] `WatchMatchMessageSchema` added to `ClientMessageSchema` union: `{ type: "watchMatch", matchId: UUID }`
- [x] `SpectatorJoinedMessageSchema` added to `ServerMessageSchema`: `{ type: "spectatorJoined", matchId: UUID, spectatorId: UUID }`
- [x] `spectatorCount: z.number().int().min(0).optional()` on `GameStateMessageSchema` (wrapper, not engine state)
- [x] `pnpm schema:gen` — regenerated

**Server (`server/src/match.ts`, `server/src/app.ts`):**
- [x] `SpectatorConnection` interface; `SocketInfo` tagged union (`isSpectator: true | false`)
- [x] `spectators: SpectatorConnection[]` on `MatchInstance`
- [x] `filterStateForSpectator()` — redacts both players' hands/drawpiles, keeps counts
- [x] `broadcastState` fans out to spectators with per-spectator filtered state + `spectatorCount`
- [x] `watchMatch()` method — validates match, registers spectator, returns `{ spectatorId }`
- [x] `handleDisconnect` removes spectator, re-broadcasts so player count updates
- [x] `app.ts`: sends `spectatorJoined` BEFORE `broadcastMatchState` (prevents blank-render flash)
- [x] `action` case guards against spectator sockets (`NOT_IN_MATCH` error)
- [x] `POST /matches` raw object includes `spectators: []`

**Client:**
- [x] `isSpectator: boolean`, `spectatorCount: number` in `AppState`
- [x] `spectatorJoined` dispatch case; `gameState` reads `spectatorCount`
- [x] `?watch=<matchId>` URL param → sends `watchMatch` on WS open
- [x] Lobby "want to observe a match?" section with Watch input + button
- [x] `renderWatchConnecting` for `?watch=` connecting screen
- [x] `renderGame` spectator mode: SPECTATING badge, no hand/column selector/action buttons
- [x] `renderStatsSidebar` shows "N watching" spectator count badge

**Tests:** 5 new integration tests in `server/tests/ws.test.ts` covering join, live updates, disconnect count, unknown match error, spectator action rejection.

**UX polish (same session):**
- [x] Vite proxy `/health` + `/matches` entries (fixed "Server unreachable" in dev)
- [x] Waiting room split into "Invite to play" + "Invite to watch" share sections with click-to-copy buttons (Copy Code, Copy Link, Copy Watch Link)
- [x] `makeCopyBtn` helper with 2s "Copied!" feedback
- [x] Typography bump: body 16→17px, section labels / buttons larger throughout

**Health indicator (same session — commit `5bb1a54`):**
- [x] `ServerHealth` replaced with `{ color: 'green'|'yellow'|'red', label, hint }` interface
- [x] `main.ts` tracks `wsConnected`, `lastDisconnectedAt`, `serverVersion` signals
- [x] `computeHealth()` — red=disconnected, yellow=within 15 s of reconnect, green=stable
- [x] HTTP `/health` polled every 30 s for version string
- [x] `renderHealthBadge()` — dot + label + hint, shown in lobby footer AND game stats sidebar
- [x] Pulse animations (green slow, yellow fast) with `prefers-reduced-motion` guard

### CI at completion

```bash
pnpm lint           # clean
pnpm typecheck      # all 4 packages pass
pnpm test           # 327 passing (55 shared + 195 engine + 77 server), 7 todo
pnpm schema:check   # clean
pnpm rules:check    # 30/30 rule IDs covered
pnpm build          # clean
```

---

## Current State (for session resumption)

**Phases 0-24 + 26 complete.** Phases 25 and 25a are specced and pending.

### Resume Handoff Note (Claude)

Before taking roadmap status at face value, reevaluate it from recent history:

1. Inspect the last few commits to reconstruct what was actively in progress.
2. Treat the latest commit as the intermediate-work checkpoint for this handoff.
3. Reconcile roadmap checkboxes/status against code/test reality before adding
   any new phase work.

```bash
git log --oneline -n 6
git show --stat --name-only HEAD
```

### Known gaps / first items for next session

Prioritized order — do these in sequence:

#### Immediate (minutes each)
1. **Health badge on mobile** — `.stats-sidebar` collapses to a horizontal flex strip at ≤600px; the health badge appended at the bottom likely looks orphaned or overflows. Quick CSS fix: either hide it in the mobile sidebar (`display: none` in the `@media` block) or reposition it. Verify visually at 375px before moving on.

#### Short (server-only, no engine changes)
2. **Phase 25a — replay endpoint `?include=full`** — add `GameConfigSchema` to `shared/src/schema.ts`, run `schema:gen`, then extend `GET /matches/:matchId/replay` to return `{ config, actions[] }` when the query param is present. The data already lives on `MatchInstance.config` + `MatchInstance.actionHistory`; it just isn't serialised. Basic Auth gate stays. OpenAPI + PROTOCOL.md update required. Do this before Phase 25 so the server-side record is solid before the client consumes it.

#### Medium (client-only, engine already in place)
3. **Phase 25 — post-game replay viewer** — add `@phalanx/engine` dep to client, write `client/src/replay.ts` (`buildReplayStates(finalState)`), add stepper controls to the game-over screen reusing `renderBattlefield`/`renderStatsSidebar`. Both hands visible in replay (no filtering). "Replay Match" button on game-over → step-through → "Return to summary". Natural follow-on to 25a.

#### Medium (cross-cutting, schema-first)
4. **Phase 27 — Customizable game rules & card set** — extend `GameOptionsSchema` with `includedRanks` + 5 rule toggles; update `createDeck`, suit bonus checks, ace rule, heroical swap; expand lobby UI with preset selector + custom rules panel; URL encoding for shareable option links. See Phase 27 spec below for full details. Can start any time after Phase 26.

#### Housekeeping (low risk, recurring value)
5. **Docker build in CI** — add a `docker build .` step to `.github/workflows/ci.yml`. Catches Dockerfile drift. Has never run in CI context; low effort, high safety net.
6. **Game feed (`GET /matches`)** — HTTP endpoint returning `[{ matchId, playerNames, phase, spectatorCount }]` for all active matches. `MatchInstance.spectators.length` is already available. Enables a future lobby feed with no engine changes.
7. **Playwright E2E** — biggest open risk on the board. The entire client has zero automated coverage. A single happy-path test (create → join → deploy → attack → game-over) would catch regressions the server tests can't see.

### CI status (last verified: 2026-02-19)

- `pnpm lint` — clean
- `pnpm typecheck` — all 4 packages pass
- `pnpm test` — 327 passing (55 shared + 195 engine + 77 server), 7 engine todo stubs
- `pnpm rules:check` — 30/30 rule IDs covered
- `pnpm build` — client builds clean
- `pnpm schema:check` — clean

### Recent commits

```
5bb1a54 feat(client): live tri-color health indicator on lobby + game sidebar
74132e5 fix(client): dev proxy, share panel, typography bump
fdf6351 feat(spectator): Phase 26 — live spectator mode
89b8d4f fix(client): add prefers-reduced-motion guard + update ROADMAP to Phase 23
```

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
collapsible in-lobby help panel, lobby link to about page, mobile responsive layout
(600px + 380px breakpoints), **live spectator mode** (`?watch=<matchId>`, per-player
state filtering for spectators, spectator count badge, click-to-copy share panel),
**live health indicator** (tri-color WS-aware badge on lobby + game sidebar, polling
every 30 s for version string). All CI gates pass.

---

---

## Phase 27: Customizable game rules & card set selection

- **Status:** PENDING
- **Agent:** direct (sonnet) — schema-first order
- **Dependencies:** Phase 25a (GameConfigSchema established), or can run independently after Phase 26
- **Parallelizable with:** Phase 25

### Motivation

Phalanx currently has one tunable option (`damageMode`). Players should be able to
shape the game before starting: strip out face cards for a faster numbers-only game,
disable Ace invulnerability, or compose exactly the card pool and rules they want.
The experience should feel like configuring a board game variant before sitting down —
pick it once in the lobby, it's baked into the shareable link, and both players see
the active rules in the UI throughout the match.

---

### Design principles

1. **Single schema, all options.** Everything lives in `GameOptionsSchema`. No
   separate "variant" concept — just more fields with sensible defaults so existing
   matches are unaffected.
2. **Defaults preserve today's behaviour.** Every new field defaults to the current
   behaviour (e.g. `aceInvulnerable: true`). Zero migration risk.
3. **Named presets are UI sugar, not a data concept.** Presets (`Standard`,
   `Numbers Only`, `Stripped Deck`, etc.) are just lobby shortcuts that fill in the
   underlying option fields. The server and engine never see a preset name, only the
   resolved options.
4. **URL encoding stays compact.** The `?mode=` param (currently `cumulative` or
   `per-turn`) will be replaced with a short base64url-encoded JSON blob of the
   non-default options only, so links stay shareable. Short/simple games (all
   defaults) still produce a readable URL.
5. **Engine remains pure.** Rule toggles are checked by reading `state.gameOptions`
   inside the relevant engine functions — no new parameters, no injection.

---

### New `GameOptionsSchema` fields

```typescript
GameOptionsSchema = z.object({
  // Existing
  damageMode: DamageModeSchema.default('cumulative'),

  // Card set — which ranks are included in the deck
  // Absent or empty = full deck (A 2-9 T J Q K per suit = 52 cards)
  // e.g. ['2','3','4','5','6','7','8','9'] = numbers-only (32 cards)
  includedRanks: z.array(RankSchema).min(4).optional(),

  // Rule toggles — all default to current behaviour
  aceInvulnerable:    z.boolean().default(true),   // PHX-ACE-001
  clubDoubleOverflow: z.boolean().default(true),   // PHX-SUIT-003
  spadeDoubleLp:      z.boolean().default(true),   // PHX-SUIT-004 / PHX-LP-002
  diamondShield:      z.boolean().default(true),   // PHX-SUIT-001
  heartShield:        z.boolean().default(true),   // PHX-SUIT-002
  heroicalSwap:       z.boolean().default(true),   // PHX-HEROICAL-001/002
})
```

**Deck size constraint (not enforced by Zod — validated in `createDeck`):**
Minimum viable deck = 24 cards (12 per player for full deployment).
With `includedRanks` of 6 ranks × 4 suits = 24. Warn/reject below this.

---

### Named presets (lobby UI only)

| Preset name | `includedRanks` | Rule changes |
|---|---|---|
| **Standard** | all 13 | all defaults |
| **Numbers Only** | 2–9 (8 ranks, 32 cards) | `aceInvulnerable` N/A (no Aces) |
| **No Royals** | A, 2–9, T (10 ranks, 40 cards) | none |
| **Aces Wild** | all 13 | `aceInvulnerable: false` |
| **Raw Combat** | all 13 | all suit bonuses off, `heroicalSwap: false` |
| **Custom** | user-configured | user-configured |

Preset selection fills the checkboxes/toggles in the lobby form. Switching any
toggle after picking a preset moves the selection to "Custom".

---

### Changes by package

**`shared/src/schema.ts`** (schema-first)
- Add `includedRanks` and the 5 rule toggle fields to `GameOptionsSchema`
- Run `pnpm schema:gen`

**`engine/src/deck.ts`**
- `createDeck(options?: GameOptions): Card[]` — filter by `options.includedRanks`
  if present; otherwise full 52-card deck
- `createInitialState(config)` passes `config.gameOptions` through to `createDeck`

**`engine/src/combat.ts`**
- Each suit bonus (`clubDoubleOverflow`, `spadeDoubleLp`, `diamondShield`,
  `heartShield`) checks `state.gameOptions?.[flag] !== false` before applying
- Ace invulnerability check in `resolveAttack` respects `aceInvulnerable` flag

**`engine/src/turns.ts`**
- Heroical swap case in `applyAction`/`validateAction` respects `heroicalSwap` flag

**`server/src/app.ts` / `server/src/match.ts`**
- No changes needed — `gameOptions` already flows from `createMatch` through to
  `createInitialState`. New fields are passed transparently.
- Validate `includedRanks` deck-size constraint at `createMatch` time; return
  `matchError` if deck would be too small.

**`client/src/renderer.ts`**
- `renderLobby`: expand game-options section with a preset selector + collapsible
  "Custom rules" panel containing rank checkboxes and rule toggles
- `renderGame` info bar: active non-default options shown as small tags (e.g.
  "No Aces", "Numbers Only") so both players always see what variant is running
- `renderJoinViaLink`: decode options from URL, show active variant badges

**`client/src/state.ts`**
- `GameOptions` stored on `AppState.gameOptions` (already exists via `damageMode`;
  expand to full object)
- URL encoding helper: `encodeOptions(opts)` → base64url of non-default fields only;
  `decodeOptions(str)` → merge with defaults

**`client/src/style.css`**
- `.rules-panel` — collapsible custom rules section (mirrors `.help-panel` pattern)
- `.variant-tag` — small in-game badge for active non-default rules (mirrors
  `.mode-tag` pattern)

---

### URL sharing strategy

Current: `?mode=cumulative` or `?mode=per-turn`

New: `?opts=<base64url>` where the payload is the JSON of non-default options only.
Standard game (all defaults): no `?opts=` param at all — URL stays clean.
Numbers-only: `?opts=eyJpbmNsdWRlZFJhbmtzIjpbIjIiLCIzIi4uLl19` (compact).

The `?mode=` param is kept as a legacy alias for `damageMode` so existing shared
links continue to work.

---

### Acceptance

```bash
pnpm schema:gen     # new GameOptions fields in types.ts + JSON Schema
pnpm schema:check   # clean
pnpm typecheck      # passes
pnpm lint           # passes
pnpm test           # existing tests unaffected; new option tests added
pnpm build          # client builds
# manual: create match with Numbers Only preset — deck contains only 2-9
# manual: create match with Aces Wild — Ace HP can drop to 0
# manual: Raw Combat — no suit bonus effects in battle log
# manual: share link encodes options; join-via-link shows active variant badges
# manual: Standard game URL has no ?opts= param
```

---

## Workflow Loop

```
/resume → see what's next → implement phase → /verify → /qa → update ROADMAP.md
```
