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
1. **Transport/Domain Seam**: Extracting network details (`WebSocket`) from `MatchInstance`.
2. **Lifecycle Orchestration Seam**: Moving `LocalMatchManager` to an Event-Driven architecture (listening to `MatchActor` events) instead of manually orchestrating database saves, bot scheduling, and ladder updates.
3. **Bot Participation Seam**: Pushing bot orchestration directly behind the `MatchActor` boundary.

## Completed Refactors

4. ~~**Engine State Representation Seam**~~: `GameProjection` adapter now lives in `engine/src/projection.ts`, exported from `@phalanxduel/engine`. 17 unit tests. (TASK-MEDIUM.02)
