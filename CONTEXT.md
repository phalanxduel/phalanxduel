# Domain Glossary

This document captures the core concepts and domain language of Phalanx Duel. It provides names for the seams and architectural components in the system.

## Entities and Boundaries

- **Match**: A single game session between two participants (human vs human, or human vs bot).
- **MatchActor**: The transactional boundary and single source of truth for match state transitions. It consumes discrete `Action` events and produces updated state and lifecycle events.
- **MatchInstance**: The read-model/projection of an active match. It contains the game configuration, the latest state snapshot, and temporary connection metadata.
- **LedgerStore**: The persistence layer that stores the append-only log of actions for a match, acting as the ultimate source of truth.
- **LocalMatchManager**: The orchestration layer that ties together WebSocket connections, MatchActors, and the LedgerStore.
- **GameState**: The pure domain representation of the game's current status, including player hands, battlefields, lifepoints, and the transaction log.
- **Action**: A validated state transition request (e.g., play a card, pass, system init).
- **GameProjection**: A narrow, deep adapter over raw `GameState` (in `engine/src/projection.ts`). Provides semantic accessors (`isGameOver`, `isPlayerTurn(id)`, `getPlayerId`, `getPlayerIndex`, etc.) so consumers never traverse nested state arrays directly.

## Upcoming Refactors

The system has several "shallow" seams that need deepening to improve locality and leverage:

## Completed Refactors/Workstreams

1. ~~**Engine State Representation Seam**~~: `GameProjection` adapter now lives in `engine/src/projection.ts`, exported from `@phalanxduel/engine`. 17 unit tests. (TASK-MEDIUM.02)
2. ~~**Transport/Domain Seam**~~: Extracted all WebSocket transport logic into `MatchConnectionTracker`. Removed `socket` property from `PlayerConnection` and `SpectatorConnection`. (TASK-HIGH.02)
3. ~~**Bot Participation Seam**~~: Encapsulated bot orchestration in `MatchActor`. Removed manual scheduling from `LocalMatchManager`. (TASK-MEDIUM.01)
4. ~~**Lifecycle Orchestration Seam**~~: Moved `LocalMatchManager` to an Event-Driven architecture (listening to `MatchActor.onStateUpdated`). Side-effects are now perfectly encapsulated per-node. (TASK-HIGH.03)
5. ~~**Horizontal Scaling Readiness**~~: Finalized multi-node scaling readiness and cluster verification. (TASK-94)
6. ~~**Achievement System (Wave 4)**~~: Implemented tactical pattern detection and cinematic profile UI. (TASK-251 through TASK-256)
