# Go Duel CLI

This directory contains an interactive Go CLI client that uses the generated
SDK in `/sdk/go` (generated locally by [`scripts/gen-sdk.ts`](https://github.com/phalanxduel/phalanxduel/blob/main/scripts/gen-sdk.ts); not tracked in git) and plays
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

## Installing (alpha)

Two supported ways to get a runnable binary without cloning the repo:

```bash
# Homebrew (macOS)
brew tap phalanxduel/tap
brew trust phalanxduel/tap  # required once — Homebrew blocks unrecognized taps by default
brew install duel-cli

# go install (any platform with a Go toolchain)
go install github.com/phalanxduel/phalanxduel/clients/go/duel-cli@latest
```

Both build from the same tagged release
(`clients/go/duel-cli/vX.Y.Z`). The `go install` path works because this
module embeds a synced copy of the generated `sdk/go` REST client at
`internal/phalanxapi` instead of depending on `sdk/go` as a separate module.
`sdk/` itself stays generated and gitignored across the rest of the repo and
can't be tagged as an independently fetchable module — and even if it could,
`go install pkg@version` rejects any dependency module whose `go.mod`
contains a `replace` directive. `internal/phalanxapi` is kept in sync
automatically by `pnpm sdk:gen`.

On connect, the CLI checks the server's reported wire-format version
(`schemaVersion` from `/api/defaults`) against the version it was built for
and refuses to proceed on a major mismatch, printing the exact upgrade
command. See
[`docs/architecture/versioning.md`](https://github.com/phalanxduel/phalanxduel/blob/main/docs/architecture/versioning.md)
for the compatibility policy this enforces. Override for local
cross-branch development: `PHALANX_ALLOW_VERSION_MISMATCH=1`.

## Prerequisites (building from source)

- Go `1.24.x`
- A running Phalanx Duel server on `https://play.phalanxduel.localhost` (or a remote URL)

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
PHALANX_SERVER_URL=https://play.phalanxduel.localhost rtk go run .
```

## CLI Options

```text
Usage of duel-cli:
  -auto
        Automatically pick a random action
```

## Architecture

The Go duel CLI is a first-class runnable client in the reference architecture.

- **REST SDK**: Uses the generated Go SDK from `/sdk/go` (generated locally by [`scripts/gen-sdk.ts`](https://github.com/phalanxduel/phalanxduel/blob/main/scripts/gen-sdk.ts); not tracked in git).
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

## Cutting a Release

Push a tag matching `clients/go/duel-cli/vX.Y.Z` and
[`.github/workflows/release-duel-cli.yml`](../../../.github/workflows/release-duel-cli.yml)
does the rest: builds/tests/format-checks, generates release notes from
conventional-commit messages touching this directory since the previous
matching tag, creates the GitHub release, and bumps
[`phalanxduel/homebrew-tap`](https://github.com/phalanxduel/homebrew-tap)'s
`Formula/duel-cli.rb` `url`/`sha256` automatically. No manual `gh release
create` or hand-computed checksums needed.

**One-time setup:** the tap-bump step pushes to a separate repo, so it needs a
`HOMEBREW_TAP_PAT` repo secret — a fine-grained PAT scoped to `Contents: write`
on `phalanxduel/homebrew-tap` only (GitHub → Settings → Developer settings →
Personal access tokens → Fine-grained tokens; no `gh` CLI command creates
these). Set it as a repo secret named `HOMEBREW_TAP_PAT` here **and** in
`phalanxduel/game-swiftui` (`gh secret set HOMEBREW_TAP_PAT --repo <repo>`).
Without it, the workflow still builds/tests/releases fine and fails cleanly
at the final tap-bump step with a credentials error.
