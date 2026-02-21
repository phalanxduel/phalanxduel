# Phalanx Duel — Route Map

Sitemap-style reference for every endpoint served by the Phalanx Duel game server.

---

## Player-Facing

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/` | Game client SPA (served from `client/dist/`) |
| `WS` | `/ws` | Real-time game transport (WebSocket) |

---

## System

### `GET /health`

Server health check. No authentication required.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-02-19T00:00:00.000Z",
  "version": "0.2.0"
}
```

**Where documented:** OpenAPI spec at `/docs/json` → `GET /health`

---

### `GET /docs`

Swagger UI — interactive OpenAPI explorer. Covers all JSON API endpoints
(`/health`, `/matches`, `/matches/:matchId/replay`). The `/admin` route is
excluded (`hide: true`) because it returns HTML, not JSON.

---

### `GET /docs/json`

OpenAPI 3.1 spec (machine-readable JSON). Consumed by Swagger UI and external
tooling.

---

## Match API (REST + JSON)

### `POST /matches`

Create a match slot. Returns a `matchId` that players use to join via WebSocket.
The match is not started until two players connect via `joinMatch`.

**Response (201):**
```json
{ "matchId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }
```

**Related:** Players join using `ws://host/ws` → `joinMatch` message with this `matchId`.

---

### `GET /matches`

Public feed of all active matches. No authentication required.

**Response (200):**
```json
[
  {
    "matchId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "players": [
      { "name": "Alice", "connected": true },
      { "name": "Bob",   "connected": false }
    ],
    "spectatorCount": 2,
    "phase": "combat",
    "turnNumber": 5,
    "ageSeconds": 142,
    "lastActivitySeconds": 8
  }
]
```

| Field | Description |
|-------|-------------|
| `matchId` | UUID of the match |
| `players` | Array of connected player summaries (empty if no players yet) |
| `players[].name` | Player's display name |
| `players[].connected` | `true` if the player's WebSocket is currently open |
| `spectatorCount` | Number of active spectator connections |
| `phase` | Current game phase (`deployment`, `combat`, `reinforcement`, `gameOver`), or `null` if still waiting for a second player |
| `turnNumber` | Current turn number, or `null` if the game has not started |
| `ageSeconds` | Seconds since the match slot was created |
| `lastActivitySeconds` | Seconds since the last player action |

**Related:** Watch link format: `/?watch=<matchId>`. The admin dashboard polls this endpoint every 5 seconds.

**Where documented:** OpenAPI spec at `/docs/json` → `GET /matches`

---

### `GET /matches/:matchId/replay`  `[Basic Auth]`

Replays a match from its stored action history and validates the hash chain.
Uses the deterministic engine to verify integrity.

**Auth:** HTTP Basic Auth. Credentials configured via `PHALANX_ADMIN_USER` /
`PHALANX_ADMIN_PASSWORD` env vars (default: `phalanx` / `phalanx`).

**Response (200):**
```json
{
  "valid": true,
  "actionCount": 42,
  "finalStateHash": "sha256-..."
}
```

**Error (404):**
```json
{ "error": "Match not found", "code": "MATCH_NOT_FOUND" }
```

**Where documented:** OpenAPI spec at `/docs/json` → `GET /matches/{matchId}/replay`

---

## Admin

### `GET /admin`  `[Basic Auth]`

Admin dashboard (HTML). Auto-refreshes server health (every 30s) and the match
feed (every 5s). Provides per-match Watch and Replay links.

**Auth:** HTTP Basic Auth. Same credentials as the replay endpoint.

**Sections:**
- **Server Health** — status, version, last-checked timestamp
- **Active Matches** — live table from `GET /matches`
- **Developer Tools** — links to Swagger UI and OpenAPI JSON

**Note:** This route is excluded from the OpenAPI spec (`hide: true`) because
it returns HTML, not a JSON API response.
