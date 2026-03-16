# Site Flow Map

This document maps how users move through Phalanx Duel screens and how those
transitions are triggered.

Source of truth:

- `client/src/main.ts`
- `client/src/state.ts`
- `client/src/renderer.ts`
- `client/src/lobby.ts`
- `client/src/game.ts`
- `client/src/game-over.ts`
- `client/src/match-history.ts`
- `server/src/app.ts`

## Generate SVGs (Marked Friendly)

Marked does not render Mermaid blocks directly. Generate static SVGs alongside
this doc:

```bash
./scripts/docs/render-site-flow.sh
```

Outputs:

- `docs/system/site-flow-1.svg`
- `docs/system/site-flow-2.svg`

Mermaid sources:

- `docs/system/site-flow-1.mmd`
- `docs/system/site-flow-2.mmd`

## Local URL and Port Map

When running `pnpm dev:server` and `pnpm dev:client`, routes are served from two
different ports:

- Client (Vite): `http://localhost:5173`
- Server (Fastify): `http://localhost:3001`
- WebSocket server: `ws://localhost:3001`

| Purpose | URL |
| --- | --- |
| Game UI | `http://localhost:5173` |
| Health endpoint | `http://localhost:3001/health` |
| Defaults endpoint | `http://localhost:3001/api/defaults` |
| Public matches feed | `http://localhost:3001/matches` |
| Create match (REST) | `http://localhost:3001/matches` (POST) |
| Completed matches list | `http://localhost:3001/matches/completed` |
| Match event log | `http://localhost:3001/matches/:matchId/log` (content-negotiated: HTML / compact JSON / full JSON) |
| Replay endpoint | `http://localhost:3001/matches/:matchId/replay` |
| Swagger UI | `http://localhost:3001/docs` |
| OpenAPI JSON | `http://localhost:3001/docs/json` |
| Admin dashboard | `http://localhost:3001/admin` |
| WebSocket endpoint | `ws://localhost:3001/ws` |

## Frontend Screen Flow

![Frontend screen flow](site-flow-1.svg)

## Screen Inventory

| Screen ID | Render Path | Entry Conditions | Exit Paths | Discoverability |
| --- | --- | --- | --- | --- |
| `lobby.standard` | `renderLobby` | `state.screen = lobby` and no `match/watch` URL params | create, join, watch, or URL param changes on reload | Primary |
| `lobby.join-link` | `renderJoinViaLink` | `state.screen = lobby` and `?match=` present | accept join, or "Start your own match instead" | Link-only |
| `lobby.watch-connecting` | `renderWatchConnecting` | `state.screen = lobby` and `?watch=` present | auto `watchMatch` on WS open, or cancel | Link-only |
| `waiting` | `renderWaiting` | WS `matchCreated` | receives `gameState` -> game | Primary (host path) |
| `game.player` | `renderGame` | `state.screen = game` and `isSpectator = false` | repeated gameState updates, eventually gameOver | Primary |
| `game.spectator` | `renderGame` | `state.screen = game` and `isSpectator = true` | repeated gameState updates, eventually gameOver | Indirect |
| `gameOver.player` | `renderGameOver` | `state.screen = gameOver` and player context | Play Again -> lobby reset; View Log link -> `/matches/:id/log` (new tab) | Primary |
| `gameOver.spectator` | `renderGameOver` | `state.screen = gameOver` and spectator context | Play Again -> lobby reset; View Log link -> `/matches/:id/log` (new tab) | Indirect |
| `lobby.match-history` | `renderMatchHistory` (panel inside lobby) | "Past Games" toggle clicked in `lobby.standard` | lazy-loaded; toggled open/closed; each row has "View Log" link | In-page panel |

## Trigger Matrix (State + Transport)

| From | Trigger | Condition | To | Where Implemented |
| --- | --- | --- | --- | --- |
| startup | initial state | app boot | `lobby.standard` or URL lobby variants | `client/src/main.ts`, `client/src/lobby.ts` |
| any lobby variant | WS open auto-watch | URL has `watch` | `game.spectator` (after `spectatorJoined`) | `client/src/main.ts`, `client/src/state.ts` |
| `lobby.standard` | Create Match click | valid name | `waiting` on `matchCreated` | `client/src/lobby.ts`, `client/src/state.ts` |
| `lobby.standard` | Play vs Bot click | valid name | `waiting` on `matchCreated` | `client/src/lobby.ts`, `client/src/state.ts` |
| `lobby.standard`/`lobby.join-link` | Join click | valid name + match id | screen unchanged on `matchJoined`; then `game.player` on `gameState` | `client/src/lobby.ts`, `client/src/state.ts` |
| `lobby.standard` | Watch click | match id | `game.spectator` on `spectatorJoined` | `client/src/lobby.ts`, `client/src/state.ts` |
| `waiting` | server broadcast | `gameState.phase != gameOver` | `game.player` | `client/src/state.ts` |
| `game.player` or `game.spectator` | server broadcast | `gameState.phase == gameOver` | `gameOver.player` or `gameOver.spectator` | `client/src/state.ts`, `client/src/game-over.ts` |
| `gameOver.*` | Play Again click | always | `lobby.standard` | `client/src/game-over.ts`, `client/src/state.ts` |
| `gameOver.*` | View Log link click | `state.matchId` non-null | opens `/matches/:id/log` in new tab (no screen change) | `client/src/game-over.ts` |
| `lobby.standard` | Past Games toggle click | always | `lobby.match-history` panel opens/closes (lazy-loaded on first open) | `client/src/lobby.ts`, `client/src/match-history.ts` |
| `lobby.join-link` | Start your own match instead | always | `lobby.standard` | `client/src/lobby.ts`, `client/src/state.ts` |
| `lobby.watch-connecting` | Cancel and return to lobby | always | `lobby.standard` | `client/src/lobby.ts`, `client/src/state.ts` |

## Non-Obvious Paths and Caveats

1. `matchJoined` does not set `screen`; it only updates identifiers. The UI
   remains on the current screen until a `gameState` message arrives.
2. `?watch=` takes priority over session rejoin on WebSocket open.
3. Saved-session auto rejoin only runs when `state.screen === 'lobby'`.
4. `spectatorJoined` sets `screen = game` immediately, before first `gameState`.
5. URL params are cleared on `matchJoined` and on `resetToLobby`.

## HTTP/WS Surface (For Complete Site Reasoning)

![HTTP and WebSocket surface](site-flow-2.svg)
