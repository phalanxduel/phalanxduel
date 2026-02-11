# HOWTO — Start, Test, and Play Phalanx

## Prerequisites

You need the following installed before starting:

| Tool | Version | Check |
|---|---|---|
| Node.js | >= 20 | `node --version` |
| pnpm | 9.15.4+ | `pnpm --version` |
| Docker (optional) | Any recent | `docker --version` |

Docker is only needed for the observability stack (Jaeger, Prometheus, Grafana).
The game itself runs without Docker.

## Initial Setup (one time)

```bash
git clone <repo-url> && cd phalanx
pnpm install
```

This installs all workspace dependencies across the four packages (shared,
engine, server, client) using the lockfile.

## Running the Tests

```bash
# Run everything
pnpm test

# Run by package
pnpm test:shared    # Zod schema validation tests (28 tests)
pnpm test:engine    # Game rules engine tests (55 tests, 12 todo stubs)
pnpm test:server    # Server integration tests (28 tests)
```

## CI Gates (full verification)

These are the same checks that run in GitHub Actions on every push and PR:

```bash
pnpm lint           # ESLint across all packages
pnpm typecheck      # tsc --noEmit in every package
pnpm test           # All unit + integration tests
pnpm schema:check   # Verify generated schema artifacts are not stale
pnpm rules:check    # Verify every rule ID in docs/RULES.md has a test
```

All five must pass. If `schema:check` fails, regenerate with `pnpm schema:gen`
and commit the output.

## Starting the Game

The game requires two processes running simultaneously: the server and the
client dev server. Open two terminal windows (or tabs).

### Terminal 1 — Start the server

```bash
pnpm dev:server
```

This starts the Fastify server with `tsx watch` on **port 3001**. It will
automatically restart when server source files change.

You should see output like:

```
Phalanx server listening on 0.0.0.0:3001
```

Verify it is running:

```bash
curl http://localhost:3001/health
# → {"status":"ok","timestamp":"...","version":"0.1.0"}
```

### Terminal 2 — Start the client

```bash
pnpm dev:client
```

This starts the Vite dev server, typically on **port 5173**. Open the URL it
prints (usually `http://localhost:5173`).

### Important: the WebSocket connection

The client connects to the server via WebSocket at
`ws://<hostname>:3001/ws`. The hostname is read from `window.location.hostname`,
but the port is **hardcoded to 3001** in `client/src/main.ts`. Both the server
and client must be running on the same machine (or `localhost`) for the
connection to work out of the box.

If the server is not running when the client loads, the client will
automatically retry the WebSocket connection with exponential backoff (1s, 2s,
4s, ..., up to 30s).

## Playing a Game (two players)

A game requires two browser tabs (or two browsers). Both connect to the same
Vite dev server URL.

### Step 1 — Create a match (Player 1)

1. Open `http://localhost:5173` in the first browser tab.
2. Type a name in the "Your name" field.
3. Click **Create Match**.
4. You will see a "Waiting for Opponent" screen with a **Match ID** (a UUID).
5. Copy the Match ID.

### Step 2 — Join the match (Player 2)

1. Open `http://localhost:5173` in a second browser tab.
2. Type a name in the "Your name" field.
3. Paste the Match ID into the "Match ID" field.
4. Click **Join Match**.
5. Both tabs will transition to the game screen.

### Step 3 — Deployment phase

Both players start with 12 cards in hand and an empty 2x4 battlefield grid.
Players alternate deploying one card at a time:

1. **Click a card** in your hand (it highlights as selected).
2. **Click an empty grid slot** in the deploy grid that appears below your hand.
3. The card is placed and the turn passes to the other player.
4. Repeat until both players have deployed 8 cards (4 remain in hand).

### Step 4 — Combat phase

After deployment completes, combat begins. Players alternate turns:

1. **Click one of your deployed cards** to select it as the attacker (it
   highlights).
2. **Click an opponent's card** to target it. The attack resolves immediately.
3. If the target's HP reaches 0, it is destroyed and removed from the grid.
4. The turn passes to the other player.

**Targeting rules:**
- You can only target **front-row** (top row) opponent cards.
- If a front-row position is empty, the back-row card behind it becomes
  targetable.

**Controls during combat:**
- **Cancel** button — deselect your chosen attacker.
- **Pass** button — skip your turn without attacking.

### Step 5 — Victory

The game ends when all of one player's battlefield cards are destroyed. The
winner sees "You Win!" and the loser sees "You Lose". Click **Play Again** to
return to the lobby.

## Suit Bonuses (reference)

These apply automatically during combat:

| Suit | Bonus | Condition |
|---|---|---|
| Diamonds | x2 defense (halves incoming damage) | Card is in the **front row** |
| Hearts | x2 defense (halves incoming damage) | Card is the **last card** on its battlefield |
| Clubs | x2 attack damage | Attacking a **back-row** target |
| Spades | (no bonus in base rules) | — |

## Special Cards

- **Ace (value 1):** Invulnerable to normal attacks — HP can never be reduced
  below 1 except by a Heroical (J/Q/K).
- **Heroicals (J/Q/K, value 11):** Can swap from hand onto the battlefield,
  replacing an existing card. Can destroy Aces.

Note: The Heroical swap UI is not yet implemented in the client. The engine
supports it but there is no button to trigger it during gameplay.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Server listen port |
| `HOST` | `0.0.0.0` | Server bind address |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | _(unset)_ | OTLP HTTP endpoint for traces/metrics. When unset, telemetry goes to console. |

## Observability Stack (optional)

To see traces and metrics in a UI, start the Docker-based observability stack:

```bash
pnpm otel:up
```

Then start the server with the OTLP endpoint set:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 pnpm dev:server
```

Play a game, then inspect:

| Service | URL | What it shows |
|---|---|---|
| Jaeger | `http://localhost:16686` | Distributed traces (search for service `phalanx-server`) |
| Prometheus | `http://localhost:9090` | Raw metrics queries |
| Grafana | `http://localhost:3000` | Dashboards (login: admin / admin) |

Stop the stack when done:

```bash
pnpm otel:down
```

## Troubleshooting

**Client shows a blank page or connection errors:**
The server must be running on port 3001 before the client can connect. Start
the server first, verify with `curl http://localhost:3001/health`, then start
the client.

**"Match not found" error when joining:**
Match IDs are held in server memory. If the server restarts, all matches are
lost. Create a new match after a server restart.

**Port 3001 already in use:**
Set a different port: `PORT=3002 pnpm dev:server`. Note that the client
hardcodes port 3001, so you would also need to change `client/src/main.ts`.

**Schema check fails in CI:**
Run `pnpm schema:gen` to regenerate `shared/src/types.ts` and
`shared/json-schema/*.json`, then commit the updated files.

**Tests show `.todo()` stubs:**
12 engine test stubs remain for deferred rules (Joker, face-down cards, Spade
direct damage). These are expected and do not fail CI — they show as "todo" in
the test output.
