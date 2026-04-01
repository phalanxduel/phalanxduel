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
architecture, but it is not yet transport-parity with the browser client.

- REST calls use the generated Go SDK from [`/sdk/go`](/Users/mike/github.com/phalanxduel/game/sdk/go).
- WebSocket gameplay is currently handled by local runtime code in
  [main.go](/Users/mike/github.com/phalanxduel/game/clients/go/duel-cli/main.go),
  not by a generated runtime transport stack.
- The browser client in [`/client`](/Users/mike/github.com/phalanxduel/game/client)
  remains the canonical implementation of reconnect, ACK, and session-rejoin
  semantics.

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

## Known Gaps

- No automatic reconnect manager. If the socket drops, the CLI does not reopen
  it automatically.
- No reliable outbound queue. Gameplay/session messages are not retained for
  ACK-based replay after network loss.
- No automatic `rejoinMatch` flow. Session restoration must be done manually by
  restarting the client and re-entering the match code.
- No surfaced connection lifecycle state beyond terminal log output.
- The current WebSocket runtime is hand-wired and intentionally narrower than
  the browser transport layer.

These gaps matter in degraded networks. The server and browser transport now
support heartbeat, backoff, ACK, replay, and `rejoinMatch`, but this CLI has
not implemented that full resilience layer yet.

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
link parsing, and action serialization helpers. They do not yet prove:

- live reconnect behavior
- automatic `rejoinMatch`
- ACK and replay semantics
- recovery in high-latency or frequently dropping network conditions
