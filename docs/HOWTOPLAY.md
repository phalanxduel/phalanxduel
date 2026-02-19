# How to Play Phalanx (Development)

This document walks through every step needed to start the game locally and
play a full two-player match. It is written for development mode — both the
server and client run via their dev scripts with hot-reload enabled.

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | >= 20 | `node --version` |
| pnpm | 9.15.4+ | `pnpm --version` |

Docker is **not** required to play. It is only needed for the optional
observability stack (see the end of this document).

## 1. Install Dependencies

```bash
pnpm install
```

Run this once after cloning, or after pulling changes that modify any
`package.json` or `pnpm-lock.yaml`.

## 2. Verify Everything Works

Before starting a game, confirm the codebase is healthy:

```bash
pnpm test           # all tests pass (see CI output for current count)
pnpm typecheck      # TypeScript compiles in all 4 packages
pnpm lint           # ESLint passes
```

If any of these fail, fix the issue before proceeding — a broken build will
cause runtime errors during gameplay.

## 3. Start the Server

Open a terminal and run:

```bash
pnpm dev:server
```

This starts the Fastify game server on **port 3001** with file-watching
(auto-restarts on source changes). You should see:

```
Phalanx server listening on 0.0.0.0:3001
```

Confirm it is running:

```bash
curl http://localhost:3001/health
```

Expected response:

```json
{"status":"ok","timestamp":"2026-02-10T...","version":"0.1.0"}
```

Leave this terminal running.

## 4. Start the Client

Open a **second** terminal and run:

```bash
pnpm dev:client
```

This starts the Vite dev server, typically on **port 5173**. It will print the
URL — usually `http://localhost:5173`.

Leave this terminal running.

## 5. Open Two Browser Tabs

The game is two-player, so you need two browser tabs (or two separate browsers)
both pointed at the client URL:

- **Tab 1** — `http://localhost:5173` (Player 1)
- **Tab 2** — `http://localhost:5173` (Player 2)

Both tabs connect to the same server via WebSocket. In dev mode, the Vite dev
server proxies `/ws` → `localhost:3001`, so the client uses a same-origin URL
derived from `window.location` — no hardcoded port or hostname.

## 6. Create a Match (Player 1)

In **Tab 1**:

1. Enter a name in the "Your name" field (e.g., "Alice").
2. Click **Create Match**.
3. The screen changes to "Waiting for Opponent" and displays a **Match ID**
   (a UUID like `a1b2c3d4-e5f6-...`).
4. Click **Copy** to copy the Match ID to your clipboard.

## 7. Join the Match (Player 2)

In **Tab 2**:

1. Enter a name in the "Your name" field (e.g., "Bob").
2. Paste the Match ID into the "Match ID" field.
3. Click **Join Match**.

Both tabs immediately transition to the game screen. The server initializes
the game: each player gets a shuffled 52-card deck, draws 12 cards, and enters
the **deployment phase**.

## 8. Deployment Phase

Players alternate placing one card at a time onto their 2x4 battlefield grid.

**On your turn:**

1. Click a **card in your hand** (bottom of screen). It highlights as selected.
2. A row of **column buttons** appears (Col 1–4) showing how many slots are
   filled in each column. Full columns are disabled.
3. Click a **column button** to deploy the card there. The engine places it in
   the first available slot (front row first, then back row).
4. The turn passes to the other player.

Repeat until both players have deployed 8 cards. The remaining 4 cards stay in
your hand as reserves.

**Grid layout** (from your perspective):

```
  col0   col1   col2   col3
┌──────┬──────┬──────┬──────┐  ← front row (row 0, faces opponent)
│      │      │      │      │
├──────┼──────┼──────┼──────┤
│      │      │      │      │  ← back row (row 1, closer to you)
└──────┴──────┴──────┴──────┘
```

## 9. Combat Phase

After both players deploy all 8 cards, combat begins. Players alternate turns.

**On your turn:**

1. Click one of **your deployed cards** to select it as the attacker.
   It highlights.
2. Opponent cards that are valid targets become clickable (highlighted).
3. Click an **opponent card** to attack it. Damage resolves immediately.
4. If the target's HP drops to 0, it is destroyed and removed from the grid.
5. The turn passes to your opponent.

**Targeting rules:**

- Attacks are **column-locked**: your front-row card attacks the opponent's
  same column. Damage overflows through the column: front card → back card →
  player LP.
- Back-row cards cannot be targeted directly; they are only hit by overflow.

**UI controls during combat:**

- **Cancel** — deselects your chosen attacker so you can pick a different one.
- **Pass** — ends your turn without attacking.

## 10. Reinforcement

When an attack destroys a card, the defender must reinforce:

1. Any back-row card in that column auto-advances to the front row.
2. If the column still has empty slots and the defender has hand cards, the
   game enters the **reinforcement phase**. The defender must deploy a hand
   card to the damaged column.
3. After reinforcement, the defender draws from their drawpile until they have
   4 hand cards (or the drawpile is exhausted).

## 11. Victory

The game ends when any of these conditions is met:

- **LP depletion** — a player's life points reach 0 from overflow damage.
- **Card depletion** — a player has no cards anywhere (battlefield, hand, drawpile).
- **Forfeit** — a player clicks the Forfeit button during combat or reinforcement.

Each player starts with **20 LP**. Overflow damage that passes through all cards
in a column hits the player's LP directly.

The game-over screen shows the victory type, the turn number, and final LP totals.
Click **Play Again** to return to the lobby and start a new match.

## Quick Rules Reference

### Card Values

| Rank | Value (attack & HP) |
|---|---|
| Ace | 1 |
| 2-10 | Face value |
| Jack, Queen, King | 11 |

### Suit Bonuses

These apply automatically during overflow damage resolution — no player action needed:

| Suit | Type | Bonus | When |
|---|---|---|---|
| Diamonds | Defense | On death: shield = card value, absorbs overflow before next target | Card is in the **front row** |
| Hearts | Defense | Posthumous shield = card value, absorbs overflow | Card is **last in its column** (no card follows it) |
| Clubs | Attack | Doubles overflow damage to back card | Attacker is a Club |
| Spades | Attack | Doubles overflow damage to player LP | Attacker is a Spade |

### Special Cards

- **Aces** are invulnerable — their HP never drops below 1. They deal only
  1 damage but cannot be destroyed. The exception: an Ace attacking another
  Ace bypasses invulnerability and destroys the target.
- **Face cards** (Jack, Queen, King) have a value of 11, making them the
  strongest combat cards in the deck.

## Troubleshooting

**Client shows a blank page or keeps reconnecting:**
The server must be running first. Start `pnpm dev:server`, confirm the health
check returns `200`, then start `pnpm dev:client`.

**"Match not found" when joining:**
Matches are stored in server memory. If the server restarted, all matches are
gone. Create a new match.

**Port conflict on 3001:**
Set a different port: `PORT=3002 pnpm dev:server`. Then update the WebSocket
URL in `client/src/main.ts` to match.

**Game seems stuck — neither player can act:**
Check which tab shows "Your turn." Only the active player can act. If both
show "Opponent's turn," try refreshing both tabs (the server will send the
current state on reconnect).

## Optional: Observability Stack

To see traces and metrics while playing, start the Docker observability stack:

```bash
pnpm otel:up
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 pnpm dev:server
```

| Service | URL | Purpose |
|---|---|---|
| Jaeger | `http://localhost:16686` | Trace viewer (search for `phalanx-server`) |
| Prometheus | `http://localhost:9090` | Metrics queries |
| Grafana | `http://localhost:3000` | Dashboards (login: admin / admin) |

Stop with `pnpm otel:down`.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Server listen port |
| `HOST` | `0.0.0.0` | Server bind address |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | _(unset)_ | OTLP endpoint. When unset, telemetry prints to console. |
