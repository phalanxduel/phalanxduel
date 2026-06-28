# v1 WebSocket Contract

This document captures the live browser client contract that Godot v2 must
consume or mirror. The canonical schemas live in `shared/src/schema.ts`; this
document is an implementation guide for the parity migration.

Primary sources:

- `shared/src/schema.ts`
- `shared/src/types.ts`
- `client/src/connection.ts`
- `client/src/state.ts`
- `server/src/match.ts`
- `server/src/utils/projection.ts`
- `server/src/routes/matches.ts`

## Transport

The browser connects to `/ws` through `client/src/connection.ts`.

Transport behavior:

- JSON messages over WebSocket.
- Reliable client messages require `msgId`.
- The server validates inbound messages and replays recent receipts by
  `msgId`.
- Successful `action` handling attaches the WebSocket `msgId` to the shared
  action before `MatchManager.handleAction`.
- Server messages may include `msgId`; the client sends `{ type: "ack",
  ackedMsgId, msgId }` for non-ack server messages.
- Heartbeat uses server `ping` and client `pong`.
- Reliable outbound messages are queued and replayed across reconnect until
  acknowledged.
- `rejoinMatch` is sent from saved session data after reconnect.
- Telemetry envelopes can include trace context, `qaRunId`, session ID,
  reconnect attempt, and origin service.

Godot parity requirement: implement the same reliable-message behavior before
claiming live head-to-head parity. A scene that only opens a socket is not
enough.

## Client Messages

Current browser messages from `ClientMessageSchema`:

| Message | Purpose | Required for Godot parity |
|---|---|---|
| `createMatch` | Create private, public, bot, quick, or agent match | yes |
| `joinMatch` | Join existing match as player two | yes |
| `rejoinMatch` | Resume active match with `playerId` | yes |
| `watchMatch` | Join as spectator | yes |
| `action` | Submit authoritative shared `Action` | yes |
| `authenticate` | Attach logged-in user | auth scenarios |
| `joinQueue` / `leaveQueue` | Ranked queue | post-core scenario |
| `ack` | Acknowledge server message | yes |
| `pong` | Heartbeat response | yes |

`createMatch` supports:

- `playerName`
- `visibility`
- `gameOptions`
- `rngSeed`
- `opponent`
- `botDifficulty`
- `matchParams`
- `isAgent`

`action` wraps the shared `ActionSchema`. Godot must submit shared actions or
the v2 `PlayerIntent` adapter only when those map back to server-authoritative
actions.

The active shared action schema uses `deploy`, `attack`, `pass`, `reinforce`,
`forfeit`, and `system:init`. `shared/src/protocol.ts` still defines an older
Godot-facing `playCard`/`endTurn` style intent layer; that layer must be
adapted to the active action schema before it can drive live matches.

## Server Messages

Current browser messages from `ServerMessageSchema`:

| Message | Browser effect | Godot parity expectation |
|---|---|---|
| `matchCreated` | store match/player IDs, enter waiting screen | render match ID and player role |
| `matchJoined` | store match/player IDs, wait for state | bind player role |
| `spectatorJoined` | enter game as spectator | bind spectator role |
| `gameViewModel` | initial redacted game view | hydrate board and actions |
| `gameState` | update game/game-over state | update board, valid actions, result |
| `actionError` | show error, clear action timeout | show actionable error |
| `matchError` | show match-level error | show actionable error |
| `opponentDisconnected` | show reconnect warning | show reconnect warning |
| `opponentReconnected` | clear/ack reconnect event | show recovery state |
| `authenticated` / `auth_error` | update auth state | auth scenario support |
| `queueJoined` / `queueLeft` / `queueMatchFound` | ranked queue UX | post-core scenario |
| `forceReload` | reload browser | Godot update/reconnect policy |
| `ping` / `pong` / `ack` | transport health | transport health |

## State Projection

The server projects authoritative game state per viewer:

- `GameViewModel` contains `state`, `viewerIndex`, and `validActions`.
- `TurnViewModel` contains `matchId`, `viewerIndex`, `preState`,
  `postState`, `action`, optional events, and `validActions`.
- `projectGameState` redacts hidden hand/discard data unless the viewer owns it
  or the match is completed.
- Spectators use `viewerIndex=null` and get no valid actions.

Browser `client/src/state.ts` currently consumes `gameState.result.postState`
as the render state and `gameState.viewModel.validActions` as the action
surface. The same distinction matters in Godot: render from projected state,
submit from valid actions, and never infer legality from visuals.

Important redaction note: current server fan-out populates
`gameState.result.preState` and `postState` from the projected viewer model.
If the server later changes `result` to a truly full authoritative turn result,
clients must render from `viewModel` instead of `result` to avoid exposing
hidden state.

## Renderer-Independent View State

`GameViewStateSchema` exists for Godot/external clients. Current fields:

- `matchId`
- `phase`
- `turnNumber`
- `activePlayerIndex`
- `viewerIndex`
- `players[]` with `id`, `name`, `lifepoints`, `handCount`, and battlefield
- optional own `hand`
- `validActions`
- optional `legalTargets`
- optional `combatPreview`

This is the preferred Godot-facing projection shape. The browser still renders
directly from `GameState` and `validActions`, so parity work must bridge from
the current v1 contract to this renderer-independent state without changing
engine authority.

## Portable State Requirements

Godot needs these state groups for 1:1 UX parity:

| UX capability | Required protocol data |
|---|---|
| Lobby readiness | WebSocket connection state and accepted `createMatch` options |
| Waiting room | `matchCreated.matchId`, `playerId`, `playerIndex` |
| Joiner role | `matchJoined.matchId`, `playerId`, `playerIndex` |
| Spectator role | `spectatorJoined.matchId`, `spectatorId`, `viewerIndex=null` |
| Board and hand | projected `GameState` or `GameViewState.players`, own hand |
| Legal targets | `validActions`, `legalTargets`, and local selection |
| Combat preview | `combatPreview` or engine/server-derived preview data |
| Combat result | transaction details, events, turn hash |
| Game over | `GameState.outcome`, final player LP |
| Replay | completed action log plus deterministic replay state |

## Risks And Gaps

- The browser has DOM-local selection state (`selectedAttacker`,
  `selectedDeployCard`). Godot needs equivalent local state, but legality still
  comes from `validActions`.
- The browser derives some visible labels locally, such as phase labels and
  turning point text. Godot can duplicate presentation labels, but not gameplay
  rules.
- `shared/src/protocol.ts` defines the early Godot `PlayerIntent`,
  `AutomationCheckpoint`, animation, audio, and haptic cue layer. It is not yet
  a full replacement for the v1 browser WebSocket contract.
- Current Godot automation hydrates synthetic `GameViewState` from scenario
  metadata only. Full parity requires real projected match/replay state and
  visible checkpoints for lobby through game-over.
- Godot currently lacks the full browser WebSocket runtime semantics: `msgId`
  reliable queueing, ACK handling, heartbeat, auth, reconnect, and `rejoinMatch`
  must be completed before live head-to-head parity can be claimed.
- Spectator `gameState.result.playerId` is currently sent as the literal
  `spectator` even though the shared schema expects a UUID. Godot should be
  tolerant while the protocol is normalized, and the mismatch should be fixed
  before the spectator parity gate.
- Attack previews are computed in the browser with the TypeScript engine
  `simulateAttack`; current live WebSocket messages do not populate
  `GameViewState.combatPreview`.
