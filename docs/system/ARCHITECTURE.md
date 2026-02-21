# Phalanx Duel — Architecture

## Overview

Phalanx Duel uses a **server-authoritative** architecture. The server is the single
source of truth for all game state. Clients send intents; the server validates
them against the rules engine and broadcasts the resulting state.

```mermaid
graph TB
    subgraph Client["@phalanxduel/client"]
        UI[Web UI] --> State[AppState]
        State --> Conn[WebSocket]
    end
    subgraph Server["@phalanxduel/server"]
        App[Fastify HTTP+WS] --> MM[MatchManager]
        App --> OA[OpenAPI /docs]
        MM --> OTel[OpenTelemetry]
    end
    subgraph Engine["@phalanxduel/engine"]
        Apply[applyAction] --> Validate[validateAction]
        Apply --> Combat[resolveAttack]
        Replay[replayGame] --> Apply
    end
    subgraph Shared["@phalanxduel/shared"]
        Schemas[Zod Schemas] --> Types[TS Types]
        Schemas --> JSON[JSON Schema]
        Hash[computeStateHash]
    end
    Conn -->|WebSocket| App
    MM --> Apply
    MM --> Hash
```

## Packages

### @phalanxduel/engine

Pure, deterministic rules engine. No I/O, no transport, no randomness (RNG is
injected). Every function takes a game state and an action, returns the next
state. This makes all transitions fully testable and replayable.

### @phalanxduel/server

Authoritative match server. Responsibilities:
- Accept client connections (HTTP + WebSocket)
- Validate actions through the engine
- Persist and broadcast state transitions
- Emit OpenTelemetry traces and metrics for every action
- Expose OpenAPI spec at `/docs` via `@fastify/swagger`
- Provide match replay validation via `GET /matches/:matchId/replay`

### @phalanxduel/client

Web UI. Sends player intents to the server, renders state received back. No
game logic — the client trusts the server's state.

### @phalanxduel/shared

Zod schemas as the single source of truth for data contracts. Generates:
- TypeScript types (`shared/src/types.ts`)
- JSON Schema snapshots (`shared/json-schema/*.json`)

Also contains the deterministic state hashing utility (`computeStateHash`).

## Game Phase State Machine

```mermaid
stateDiagram-v2
    [*] --> setup: createInitialState
    setup --> deployment: joinMatch + drawCards
    deployment --> deployment: deploy (alternating)
    deployment --> combat: both have 8 cards
    combat --> combat: attack / pass
    combat --> reinforcement: card destroyed + hand not empty
    combat --> gameOver: victory or forfeit
    reinforcement --> reinforcement: reinforce (column open)
    reinforcement --> combat: column full or hand empty
    reinforcement --> gameOver: forfeit
    gameOver --> [*]
```

## Event Sourcing

Game state is derived from an ordered sequence of events (actions). Given the
same initial state and the same sequence of actions, the engine always produces
the same final state. This enables:

- **Replay**: reconstruct any game state from its event log via `replayGame()`.
- **Validation**: re-derive state independently to verify integrity.
- **Hash chain**: each `TransactionLogEntry` records `stateHashBefore` and
  `stateHashAfter`, forming a verifiable chain.
- **Observability**: trace every state transition with OpenTelemetry spans.

```mermaid
graph LR
    A[Action] --> E[applyAction]
    S[State Before] --> E
    E --> S2[State After]
    E --> TLE[TransactionLogEntry]
    TLE --> TL[transactionLog]
```

### Transaction Log Entry Structure

Every action produces a `TransactionLogEntry` containing:
- `sequenceNumber` — ordinal position in the log
- `action` — the action that was applied
- `stateHashBefore` / `stateHashAfter` — SHA-256 hashes (server-side)
- `timestamp` — ISO-8601 datetime
- `details` — discriminated union with action-specific audit data

The hash function is injected into `applyAction` so the engine remains
browser-safe (no `node:crypto` dependency). The server passes `computeStateHash`
from `@phalanxduel/shared/hash`.

## Data Flow

1. Client sends an action intent via WebSocket.
2. Server validates the action against current state using the engine.
3. Engine returns either the next state or a validation error.
4. Server persists the event and broadcasts the new state to all clients.
5. Each step is wrapped in an OpenTelemetry span (see OBSERVABILITY.md).

### Action Sequence Diagram

```mermaid
sequenceDiagram
    participant P as Player (Client)
    participant S as MatchServer
    participant E as RulesEngine
    participant DB as MatchStorage
    participant O as Opponent (Client)

    P->>P: selectAttacker(pos)
    P->>P: selectTarget(pos)
    P->>S: WebSocket: { type: "playerAction", action: attack }
    Note over S: traceWsMessage starts
    S->>E: applyAction(state, action)
    E->>E: validateAction()
    alt Action Valid
        E-->>S: nextState
        S->>DB: update match state
        S->>S: Sentry.metrics.count("game.action.success")
        S-->>P: WebSocket: { type: "gameState", state: nextState }
        S-->>O: WebSocket: { type: "gameState", state: nextState }
    else Action Invalid
        E-->>S: validationError
        S->>S: Sentry.metrics.count("game.action.error")
        S-->>P: WebSocket: { type: "actionError", error: "..." }
    end
    Note over S: traceWsMessage ends
```
