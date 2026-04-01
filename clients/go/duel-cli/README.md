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

## Verification

From the repo root, validate the Go client with:

```bash
rtk pnpm go:clients:check
```
