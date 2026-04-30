# Go Duel CLI

This directory contains an interactive Go CLI client that uses the generated
SDK in [`/sdk/go`](/Users/mike/github.com/phalanxduel/game/sdk/go) and plays
against the live Phalanx Duel server over WebSockets.

The CLI currently supports:

1.  **System Discovery**: Calls `GET /api/defaults` through the generated REST client to fetch version semantics and grid constraints.
2.  **Flexible Play Modes**:
    - Create a duel against another human player (provides shareable match code and invite link).
    - Join an existing duel via match ID or `?match=<id>` invite link.
    - Play against `bot-random` or `bot-heuristic`.
3.  **Rich TUI Visualization**:
    - Column-based battlefield grid with suit glyphs (♥, ♦, ♣, ♠).
    - ANSI color support for players and turn phases.
    - Human-readable action summaries (e.g., "Attack with column 1 vs column 0").
    - "Last Actions" log powered by the engine's `transactionLog`.
4.  **Automation**: An `-auto` mode for random action selection.
5.  **Reliable Transport**: Implements the same reconnect, ACK, pending replay, and session-rejoin behavior as the canonical browser client.

## Prerequisites

- Go `1.24.x`
- A running Phalanx Duel server on `http://127.0.0.1:3001` (or a remote URL)

## Install Go Dependencies

From this directory:

```bash
rtk go mod tidy
```

## Usage

### Interactive Mode

Run the client and follow the prompts:

```bash
rtk go run .
```

### Automation Mode

The client will autonomously select random valid actions until the match ends:

```bash
rtk go run . -auto
```

### Targeting a Remote Server

Set the `PHALANX_SERVER_URL` environment variable:

```bash
PHALANX_SERVER_URL=https://play.phalanxduel.com rtk go run .
```

## CLI Options

```text
Usage of duel-cli:
  -auto
        Automatically pick a random action
```

## Architecture

The Go duel CLI is a first-class runnable client in the reference architecture.

- **REST SDK**: Uses the generated Go SDK from [`/sdk/go`](/Users/mike/github.com/phalanxduel/game/sdk/go).
- **Transport**: Hand-wired reliable WebSocket implementation in `ws_client.go`.
- **Logic**: derived from `main.go`, mapping the server's `viewModel` to the TUI.

## Test Coverage

Run the local test suite:

```bash
rtk go test ./...
```

The tests cover:
- Reliable action replay after reconnect.
- ACK-based transport flow.
- Invite link and URL parsing.
- Human-readable action serialization.

## Verification

From the repo root, validate the Go client with:

```bash
rtk pnpm go:clients:check
```
