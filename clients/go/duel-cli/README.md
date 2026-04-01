# Go Duel CLI

This directory contains an interactive Go CLI client that uses the generated
SDK in [`/sdk/go`](/Users/mike/github.com/phalanxduel/game/sdk/go) and plays
against the live Phalanx Duel server over WebSockets.

The CLI currently supports:

1. Calls `GET /api/defaults` through the generated REST client.
2. Prompts for a player name and a play mode.
3. Lets you:
   create a duel against another player,
   join a duel from a match code or invite link,
   or start a game against `bot-random` or `bot-heuristic`.
4. Renders game state as text and lets you choose from the live `validActions`
   list until the match ends.

## Prerequisites

- Go `1.24.x`
- Node.js and `pnpm`
- A running Phalanx Duel server on `http://127.0.0.1:3001`

Optional:

- `PHALANX_SERVER_URL` to target a different server base URL

## Generate the SDK

From the repo root:

```bash
rtk pnpm sdk:gen
```

That refreshes the generated Go SDK under `sdk/go`, which this client imports via
the local `replace` directive in `go.mod`.

## Install Go Dependencies

From this directory:

```bash
rtk go mod tidy
```

## Build

From this directory:

```bash
rtk go build ./...
```

## Run

Start the server from the repo root:

```bash
rtk pnpm dev:server
```

Then, in another shell, run the Go duel CLI from this directory:

```bash
rtk go run .
```

The CLI will ask for:

- your player name
- whether to create a duel, join a duel, or play a bot
- a match code or invite link if you choose the join flow

For a human-created duel, the CLI prints both the raw match code and a playable
invite link in the same `?match=<id>` format used by the web UI.

## Expected Output

On success, the CLI prints:

- the default row/column constraints from `/api/defaults`
- the created or joined `matchId`
- a text summary of each game state
- the current action menu derived from the live `validActions`
- the final winner and victory type when the match ends

If the server is not running or `/ws` is unavailable, the CLI exits with a
fatal connection error.

## Architecture

The Go duel CLI is a first-class runnable client in the reference
architecture and now implements the same core reliable WebSocket transport
contract as the browser client.

- REST calls use the generated Go SDK from [`/sdk/go`](/Users/mike/github.com/phalanxduel/game/sdk/go).
- WebSocket gameplay is currently handled by local runtime code in
  [main.go](/Users/mike/github.com/phalanxduel/game/clients/go/duel-cli/main.go),
  not by a generated runtime transport stack.
- The browser client in [`/client`](/Users/mike/github.com/phalanxduel/game/client)
  remains the canonical implementation, but the Go CLI now mirrors its
  reconnect, ACK, pending replay, and session-rejoin behavior for gameplay
  traffic.

## Current Capabilities

- Creates a duel against another player and prints a shareable match code and
  invite link.
- Joins a duel from a raw match code or `?match=<id>` invite link.
- Starts games against `bot-random` and `bot-heuristic`.
- Fetches `/api/defaults` through the generated REST SDK before opening the
  gameplay socket.
- Renders turn-by-turn game state as text and lets a player pick from the
  current `validActions`.
- Prints disconnect and reconnect events for the remote opponent when the
  server emits them.
- Maintains an app-level heartbeat watchdog and proactively reconnects after
  silent connection loss.
- Uses exponential backoff with jitter for reconnect attempts.
- Stores reliable outbound gameplay/session messages in a local pending queue
  until the server ACKs them.
- Automatically sends `rejoinMatch` after reconnect and then replays any
  un-ACKed pending actions.

## Known Gaps

- Connection lifecycle state is surfaced as terminal log output, not a richer
  interactive status banner.
- Session recovery is in-memory for the current process only. Restarting the
  CLI still requires the player to re-enter the match code or link.
- The runtime transport is still hand-wired and does not yet emit the richer
  telemetry envelope that the browser client attaches to WebSocket traffic.

## Verification

From the repo root, validate the Go client with:

```bash
rtk pnpm go:clients:check
```

## Test Coverage

`rtk pnpm go:clients:check` currently proves:

- `gofmt` cleanliness for the Go client source.
- `go test ./...` passes for the local CLI package.
- `go build` succeeds for the runnable client.

The Go unit tests currently cover helper behavior such as URL derivation, invite
link parsing, action serialization helpers, and transport recovery behavior. The
current tests prove:

- reliable action replay after reconnect
- ACK-based removal from the pending queue
- automatic `rejoinMatch` before replaying queued actions

They do not yet prove:

- full end-to-end gameplay completion against a live server under repeated
  packet loss
- cross-process session restore after a full CLI restart
