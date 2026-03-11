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

Type ownership and the current inventory snapshot are documented in
[`docs/system/TYPE_OWNERSHIP.md`](./TYPE_OWNERSHIP.md). Use that document when
deciding whether a new type belongs in `shared` or is allowed to stay
package-local.

## Turn Lifecycle (Deterministic)

Each turn executes all 7 phases as defined in `docs/RULES.md`:

1.  **StartTurn**
2.  **AttackPhase**
3.  **AttackResolution**
4.  **CleanupPhase**
5.  **ReinforcementPhase**
6.  **DrawPhase**
7.  **EndTurn**

Phases always emit events, even if no state changes, ensuring a consistent and observable execution path.

## Event Sourcing & Determinism

Game state is derived from an ordered sequence of turns and their inputs. v1.0 mandates a strict deterministic replay guarantee.

### Hashing Model

Replay integrity is captured per transaction with:
- `stateHashBefore` — hash of pre-transition game state (excluding `transactionLog`)
- `stateHashAfter` — hash of post-transition game state (excluding `transactionLog`)

The hash function is injected into the engine so it remains environment-agnostic.
The server passes `computeStateHash` from `@phalanxduel/shared/hash`.

### Transaction Log Entry Structure

Every turn produces a log entry containing:
- `sequenceNumber` — ordinal position in the log
- `action` — the action that was applied
- `stateHashBefore` — deterministic pre-transition state hash
- `stateHashAfter` — deterministic post-transition state hash
- `timestamp` — ISO-8601 datetime
- `details` — action-specific transition details (`deploy`/`attack`/`pass`/`reinforce`/`forfeit`)
- `phaseTrace` (optional) — ordered phase hops (`from`, `trigger`, `to`) emitted by reducer transitions
- `phaseTraceDigest` (optional) — reserved provenance digest hook for official verification profiles

## Data Flow

1. Client sends an action intent via WebSocket.
2. Server validates the action and executes the 7-phase turn lifecycle.
3. Engine returns the updated state and transaction log entry (including optional phase trace).
4. Server persists the transition and broadcasts the new state and allowed audience events to clients.
5. Each step is wrapped in an OpenTelemetry span.

```text
1. Client sends an action intent via WebSocket.
2. Server validates the action and executes the 7-phase turn lifecycle.
3. Engine returns the updated state and transaction log entry.
4. Server persists the transition and broadcasts the new state and allowed events.
5. Each step is wrapped in an OpenTelemetry span.
```
