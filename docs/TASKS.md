# Phalanx — Outstanding Tasks

Tracked work items for the project. Items are grouped by category and marked
with priority. Check items off as they are completed.

**Priority:** `P0` = blocking deployment, `P1` = should fix before release, `P2` = nice to have

**Last updated:** 2026-02-16 (post Phase 11, pre-deployment push)

---

## Blocking Deployment (P0)

### Server: Per-player state filtering

The server broadcasts the **full GameState** to both players, including opponent
hand and drawpile. Any player can see the opponent's cards via browser dev tools.
This breaks the game's hidden information model and must be fixed before any
competitive play.

- [ ] Add `filterStateForPlayer(state, playerIndex)` in engine or server
- [ ] Redact opponent's `hand` and `drawpile` (send counts only)
- [ ] Optionally redact opponent's `drawpile` card contents in discard pile
- [ ] Update server `broadcastState` to send filtered state per player
- [ ] Add tests verifying filtered vs unfiltered state
- **Agent:** `server-dev` (sonnet)

### Server: Match cleanup

Finished matches remain in `MatchManager.matches` forever. A long-running
server will accumulate dead match objects.

- [ ] Add TTL cleanup for matches in `gameOver` phase (e.g., 5 minutes)
- [ ] Add cleanup for abandoned matches (one player, no join after timeout)
- [ ] Add `matchesActive` metric decrement on cleanup
- **Agent:** `server-dev` (sonnet)

### Client: Vite proxy for WebSocket

The client hardcodes `ws://${hostname}:3001/ws` in `client/src/main.ts`. This
prevents deployment behind a reverse proxy or single-origin setup.

- [ ] Add Vite dev server proxy config for `/ws` → `localhost:3001`
- [ ] Change client WS URL to use `window.location` (same origin)
- [ ] Support `wss://` when page is served over HTTPS
- **Agent:** general-purpose (haiku)

### Deployment configuration

No production build or deployment story exists yet.

- [ ] Add `server/Dockerfile` (Node 20 alpine, multi-stage build)
- [ ] Add `docker-compose.yml` for server + client static serve
- [ ] Add production Vite build that uses relative WS URL
- [ ] Add `fly.toml` or equivalent deployment config
- [ ] Add health check endpoint verification in deploy pipeline
- **Agent:** general-purpose (sonnet)

---

## Should Fix (P1)

### Server: Pass action doesn't increment turn number

The `pass` case in `applyAction` alternates `activePlayerIndex` but does not
increment `turnNumber`. Repeated passing stalls the turn counter, which makes
the battle log and game-over summary confusing.

- [ ] Increment `turnNumber` in the `pass` action handler
- [ ] Add test for turn number after pass
- **Agent:** `engine-dev` (haiku)

### Server: Rate limiting

No protection against rapid message spam from clients. A malicious client could
flood the server with actions.

- [ ] Add per-socket message rate limit (e.g., 10 msg/sec)
- [ ] Return `matchError` with `RATE_LIMITED` code when exceeded
- **Agent:** `server-dev` (haiku)

### Client: Reconnection with stored credentials

The client reconnects on WS close but does not re-authenticate with its stored
`matchId`/`playerId`. A reconnected client starts fresh in the lobby instead of
resuming the game.

- [ ] Store `matchId`, `playerId`, `playerIndex` in `sessionStorage`
- [ ] On WS reconnect, send `joinMatch` with stored credentials
- [ ] Clear stored credentials on "Play Again" or match end
- **Agent:** general-purpose (haiku)

---

## Nice to Have (P2)

### Documentation

- [x] ~~Update `docs/PROTOCOL.md`~~ — fully rewritten 2026-02-16
- [x] ~~Update `CLAUDE.md` client description~~ — fixed 2026-02-16
- [x] ~~Update `docs/HOWTOPLAY.md`~~ — fixed stale info 2026-02-16
- [ ] Add `DEPLOYMENT.md` — production deployment guide once infra is decided

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
