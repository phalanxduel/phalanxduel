---
title: "Architecture"
description: "Server-authoritative design principles, dependency boundaries, and key decisions. Code is authoritative; this captures the WHY behind structural choices."
status: active
updated: "2026-03-15"
audience: agent
authoritative_source: "engine/src/state-machine.ts, shared/src/schema.ts"
related:
  - docs/RULES.md
  - docs/system/TYPE_OWNERSHIP.md
  - docs/system/PNPM_SCRIPTS.md
---

# Architecture

## Core Principle

Server-authoritative. Clients send intents; the server validates via the engine and broadcasts resulting state. Clients trust nothing — no game logic runs client-side.

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
        TurnHash[computeTurnHash]
    end
    Conn -->|WebSocket| App
    MM --> Apply
    MM --> Hash
```

## Dependency Direction

```text
shared ← engine ← server
shared ← client
```

`engine` and `client` have no dependency on each other. The engine has no server knowledge. Boundaries are enforced by dependency-cruiser (`docs/system/dependency-graph.svg`).

## Why Deterministic

All game state derives from an ordered sequence of inputs. v1.0 mandates strict replay guarantees:

- Engine functions are pure: `(state, action) → next state`
- RNG is injected so tests and replays use a fixed seed
- The hash function is injected so the engine has no environment dependencies
- Turn phases always emit events even with no state change, ensuring a consistent observable execution path

The 8-phase turn loop (in order): `StartTurn` → `DeploymentPhase` (optional) → `AttackPhase` → `AttackResolution` → `CleanupPhase` → `ReinforcementPhase` → `DrawPhase` → `EndTurn`. See [`docs/RULES.md`](../RULES.md) for definitions. See `engine/src/state-machine.ts` for the authoritative implementation.

## Hashing Design

Per-transaction replay integrity via `stateHashBefore` and `stateHashAfter`. Both hashes **exclude `transactionLog`** deliberately — including it would create a circular dependency since each log entry contains hashes of the state before that entry was appended.

The hash function is injected into the engine via `computeStateHash` from `@phalanxduel/shared/hash`. The full transaction log entry shape is in `shared/src/schema.ts`.

**TurnHash** is the canonical per-turn signature (RULES.md §20.2):

```text
turnHash = SHA-256(stateHashAfter + ":" + eventIds.join(":"))
```

Computed by `computeTurnHash` from `@phalanxduel/shared/hash` and included in `PhalanxTurnResult` on every broadcast. It is independently verifiable from the event log and state hash alone — no replay required.

## Event Log

Each turn produces a `PhalanxEvent[]` derived deterministically from the `TransactionLogEntry` by `deriveEventsFromEntry` in `engine/src/events.ts`. Events follow a span-based model (RULES.md §17) — every phase emits `span_started`/`span_ended` plus `functional_update` events for state changes.

The full event log for a match (`MatchEventLog`) is persisted to the database and queryable via HTTP:

- `GET /matches/completed` — paginated list of completed match summaries (matchId, players, outcome, turn count, fingerprint)
- `GET /matches/:id/log` — full event log with content negotiation: `text/html` → rendered HTML, `?format=compact` → token-efficient JSON, default → full structured JSON

The client surfaces this via a "View Log" link on the game-over screen and a "Past Games" panel in the lobby (lazy-loaded from `GET /matches/completed`).

CI enforces event log completeness via `pnpm rules:check` → `scripts/ci/verify-event-log.ts`, which verifies every action type reachable from the engine produces a non-empty `PhalanxEvent[]`.
