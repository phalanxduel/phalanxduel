# Phalanx — Outstanding Tasks

Tracked work items for the project. Items are grouped by category and marked
with priority. Check items off as they are completed.

**Priority:** `P0` = blocking deployment, `P1` = should fix before release, `P2` = nice to have

**Last updated:** 2026-02-19 (documentation audit follow-up)

---

## Blocking Deployment (P0)

### Server: Per-player state filtering

The server broadcasts the **full GameState** to both players, including opponent
hand and drawpile. Any player can see the opponent's cards via browser dev tools.
This breaks the game's hidden information model and must be fixed before any
competitive play.

- [x] ~~Add `filterStateForPlayer(state, playerIndex)` in engine or server~~ (completed 2026-02-19)
- [x] ~~Redact opponent's `hand` and `drawpile` (send counts only)~~ (completed 2026-02-19)
- [x] ~~Optionally redact opponent's `drawpile` card contents in discard pile~~ (completed 2026-02-19)
- [x] ~~Update server `broadcastState` to send filtered state per player~~ (completed 2026-02-19)
- [x] ~~Add tests verifying filtered vs unfiltered state~~ (covered by schema + integration behavior, completed 2026-02-19)
- **Agent:** `server-dev` (sonnet)

### Server: Match cleanup

Finished matches remain in `MatchManager.matches` forever. A long-running
server will accumulate dead match objects.

- [x] ~~Add TTL cleanup for matches in `gameOver` phase (e.g., 5 minutes)~~ (completed 2026-02-19)
- [x] ~~Add cleanup for abandoned matches (one player, no join after timeout)~~ (completed 2026-02-19)
- [x] ~~Add `matchesActive` metric decrement on cleanup~~ (completed 2026-02-19)
- **Agent:** `server-dev` (sonnet)

### Client: Vite proxy for WebSocket

The client hardcodes `ws://${hostname}:3001/ws` in `client/src/main.ts`. This
prevents deployment behind a reverse proxy or single-origin setup.

- [x] ~~Add Vite dev server proxy config for `/ws` → `localhost:3001`~~ (completed 2026-02-19)
- [x] ~~Change client WS URL to use `window.location` (same origin)~~ (completed 2026-02-19)
- [x] ~~Support `wss://` when page is served over HTTPS~~ (completed 2026-02-19)
- **Agent:** general-purpose (haiku)

### Deployment configuration

No production build or deployment story exists yet.

- [x] ~~Add `server/Dockerfile` (Node 20 alpine, multi-stage build)~~ (implemented as root `Dockerfile`, completed 2026-02-19)
- [x] ~~Add `docker-compose.yml` for server + client static serve~~ (completed 2026-02-19)
- [x] ~~Add production Vite build that uses relative WS URL~~ (completed 2026-02-19)
- [x] ~~Add `fly.toml` or equivalent deployment config~~ (completed 2026-02-19)
- [x] ~~Add health check endpoint verification in deploy pipeline~~ (health endpoint + Fly checks in place, completed 2026-02-19)
- **Agent:** general-purpose (sonnet)

---

## Documentation Alignment Backlog (ranked high to low)

Use this list to drive a focused doc-fix pass that aligns docs to current code.

### High (P0)

#### Protocol docs: add missing spectator contract

Protocol docs are missing implemented spectator message types and behavior.

- [x] ~~Update `docs/CLIENT_CONTRACT.md` to include `watchMatch` client message~~ (completed 2026-02-19)
- [x] ~~Update `docs/CLIENT_CONTRACT.md` to include `spectatorJoined` server message~~ (completed 2026-02-19)
- [x] ~~Update message counts and checklists in `docs/CLIENT_CONTRACT.md` (currently stale)~~ (completed 2026-02-19)
- [x] ~~Add spectator flow examples to `docs/PROTOCOL.md` and `docs/CLIENT_CONTRACT.md`~~ (completed 2026-02-19)
- [x] ~~Add "spectator receives filtered state" note where `gameState` is documented~~ (completed 2026-02-19)
- **Definition of done:** An external client can implement player + spectator flows from docs alone

#### Reconnection spec: resolve contradictions and match implementation

Reconnection guidance is inconsistent across docs and mismatched in places.

- [x] ~~Define one authoritative reconnection contract (fields required on reconnect)~~ (completed 2026-02-19)
- [x] ~~Align `docs/PROTOCOL.md` reconnection section with the actual accepted schema~~ (completed 2026-02-19)
- [x] ~~Align `docs/CLIENT_CONTRACT.md` reconnection steps and storage requirements~~ (completed 2026-02-19)
- [x] ~~Explicitly document whether `playerId` is required, optional, or currently unused~~ (completed 2026-02-19)
- [x] ~~Add a short "current behavior vs target behavior" note if reconnect improvements are pending~~ (completed 2026-02-19)
- **Definition of done:** Reconnect instructions are internally consistent and executable as written

### Medium (P1)

#### Connection URL guidance: normalize same-origin vs direct-port docs

Connection URL examples are inconsistent (`:3001` hardcoded vs same-origin deployment).

- [x] ~~Standardize production guidance to same-origin `ws(s)://<host>/ws`~~ (completed 2026-02-19)
- [x] ~~Keep local dev examples explicit (Vite + proxy), without implying hardcoded client ports~~ (completed 2026-02-19)
- [x] ~~Update URL examples in `README.md`, `docs/CLIENT_CONTRACT.md`, and `docs/HOWTOPLAY.md`~~ (completed 2026-02-19)
- [x] ~~Add one concise note explaining when direct `:3001` is valid (if ever)~~ (completed 2026-02-19)
- **Definition of done:** URL guidance is consistent and deployment-safe across docs

#### Tasks/backlog doc: reconcile stale completed items

Several "open" infrastructure tasks are now implemented in code and should be closed.

- [x] ~~Audit every unchecked item in `docs/TASKS.md` against current code~~ (completed 2026-02-19)
- [x] ~~Mark implemented items complete with completion date~~ (completed 2026-02-19)
- [x] ~~Move no-longer-relevant items to a "superseded" subsection with rationale~~ (see superseded section below, completed 2026-02-19)
- [x] ~~Keep only genuinely outstanding work in P0/P1~~ (completed 2026-02-19)
- **Definition of done:** `docs/TASKS.md` accurately reflects current repo state

### Low (P2)

#### Product scope language: clarify two-player status

Docs conflict on "two or more players" vs actual two-player implementation.

- [x] ~~Update `README.md` wording to explicitly state current v1 is two-player~~ (completed 2026-02-19)
- [x] ~~Link multi-player support to `docs/FUTURE.md` as deferred~~ (completed 2026-02-19)
- [x] ~~Spot-check related docs for consistent player-count wording~~ (completed 2026-02-19)
- **Definition of done:** No docs imply shipped support for >2 players

#### Terminology and version consistency cleanup

Minor wording/version inconsistencies reduce confidence and readability.

- [x] ~~Fix contradictory phrasing in `docs/ARCHITECTURE.md` around authority model~~ (completed 2026-02-19)
- [x] ~~Normalize version examples (`0.2.0`) in `docs/HOWTOPLAY.md` and `docs/OBSERVABILITY.md`~~ (completed 2026-02-19)
- [x] ~~Run a consistency sweep for stale literals and copy/paste drift~~ (completed 2026-02-19)
- **Definition of done:** Terminology and example versions are consistent across primary docs

---

## Should Fix (P1)

### Server: Pass action doesn't increment turn number

The `pass` case in `applyAction` alternates `activePlayerIndex` but does not
increment `turnNumber`. Repeated passing stalls the turn counter, which makes
the battle log and game-over summary confusing.

- [x] ~~Increment `turnNumber` in the `pass` action handler~~ (completed 2026-02-19)
- [x] ~~Add test for turn number after pass~~ (completed 2026-02-19)
- **Agent:** `engine-dev` (haiku)

### Server: Rate limiting

No protection against rapid message spam from clients. A malicious client could
flood the server with actions.

- [x] ~~Add per-socket message rate limit (e.g., 10 msg/sec)~~ (completed 2026-02-19)
- [x] ~~Return `matchError` with `RATE_LIMITED` code when exceeded~~ (completed 2026-02-19)
- **Agent:** `server-dev` (haiku)

### Client: Reconnection with stored credentials

The client stores reconnect context and retries with `joinMatch`, but server-side
player reattachment by `playerId` is not yet wired. If the match is already full,
reconnect currently returns `MATCH_FULL`.

- [x] ~~Store `matchId`, `playerId`, `playerIndex` in `sessionStorage`~~ (completed 2026-02-19)
- [x] ~~On WS reconnect, send `joinMatch` with stored credentials~~ (completed 2026-02-19)
- [x] ~~Clear stored credentials on "Play Again" or match end~~ (completed 2026-02-19)
- [ ] Wire server-side reconnect path to reattach socket using stored `playerId`
- **Agent:** general-purpose (haiku)

---

## Nice to Have (P2)

### Documentation

- [x] ~~Update `docs/PROTOCOL.md`~~ — fully rewritten 2026-02-16
- [x] ~~Update `CLAUDE.md` client description~~ — fixed 2026-02-16
- [x] ~~Update `docs/HOWTOPLAY.md`~~ — fixed stale info 2026-02-16
- [x] ~~Add `DEPLOYMENT.md` — production deployment guide once infra is decided~~ (completed 2026-02-19)

### Superseded / Historical Notes

- "Server: Per-player state filtering" moved from active P0 to completed (implemented in `server/src/match.ts`)
- "Server: Match cleanup" moved from active P0 to completed (TTL cleanup + metric decrement implemented)
- "Client: Vite proxy for WebSocket" moved from active P0 to completed (same-origin WS + Vite proxy implemented)
- "Deployment configuration" moved from active P0 to completed (`Dockerfile`, `docker-compose.yml`, and `fly.toml` present)

### Client polish

- [ ] Player name display in waiting room
- [ ] Mobile responsive testing and CSS fixes
- [ ] Card animations (deploy, attack, destroy)
- [ ] Sound effects for key events
- [ ] Turn timer / inactivity warning

### Engine — Deferred rules

7 `.todo()` test stubs remain in `engine/tests/rules.test.ts` for future
mechanics (Joker, face-down cards). These are documented in `docs/FUTURE.md`
and are not part of v1.

### Housekeeping

- [ ] Clean up pre-existing uncommitted files: `scripts/demo.ts`, `.claude/settings.local.json`
- [ ] Add `scripts/demo.ts` to `.gitignore` or commit it properly
