# Phalanx — Protocol Specification

Describes the wire protocol between client and server.

## Transport

- **HTTP/REST** — used for match creation, health checks, and non-realtime queries.
- **WebSocket** — used for real-time game state synchronization.

Both transports use JSON payloads. Schemas are defined in `shared/src/schema.ts`.

---

## HTTP Endpoints

### GET /health

Returns server status.

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "0.1.0"
}
```

### POST /matches (placeholder)

TODO: define match creation endpoint.

---

## WebSocket Message Envelope

All WS messages use a common envelope defined by `WsMessageEnvelopeSchema`:

```json
{
  "type": "<message_type>",
  "payload": {},
  "timestamp": "2024-01-01T00:00:00.000Z",
  "matchId": "<uuid, optional>",
  "playerId": "<uuid, optional>"
}
```

### Client-to-Server Message Types (placeholder)

| Type | Description |
|---|---|
| `join` | TODO: player joins a match |
| `action` | TODO: player performs a game action |

### Server-to-Client Message Types (placeholder)

| Type | Description |
|---|---|
| `ack` | Acknowledges receipt of a client message |
| `state` | TODO: full or partial game state update |
| `error` | TODO: error response |
