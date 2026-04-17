# Architectural Boundaries: Engine vs. Server

This document formalizes the separation of concerns between the deterministic **Game Engine** and the stateful, IO-driven **Game Server**.

## 1. The Core Philosophy

Phalanx Duel follows a strict "Hexagonal Architecture" approach for its core logic:

- **The Engine (`engine/`)**: A pure, deterministic state machine. It knows HOW to play the game but doesn't know WHO is playing or WHERE the data is stored.
- **The Server (`server/`)**: The authoritative orchestrator. It handles networking, identity, persistence, and concurrency.

---

## 2. Boundary Layers

### A. The Engine (Pure Logic)
- **Responsibility**: State transitions, rule enforcement, Bot AI, event derivation.
- **Contract**: Accepts a `GameState` and an `Action`, returns a new `GameState` (or throws/returns validation error).
- **No Side Effects**: The engine never hits the database, never sends a network packet, and never reads the system clock (timestamps are passed in).

### B. The Match Actor (Concurrency & Persistence)
- **Responsibility**: Serializes access to a single match, persists actions to the Ledger, and rehydrates state.
- **Concurrency**: Uses a Promise chain (`currentExecution`) to ensure actions for a given match are processed sequentially.
- **Data Guard**: Validates that the player sending an action is authorized for that match before calling the engine.

### C. The Match Manager (Orchestration)
- **Responsibility**: Match lifecycle (create, join, cleanup), socket-to-match mapping, and distributed synchronization via Postgres `LISTEN/NOTIFY`.

---

## 3. Data Ownership & Flow

### Pure Component Data (shared)
- `GameState`: The authoritative snapshot of a duel at a specific moment.
- `Action`: A request to change the game state.
- `PhalanxEvent`: A descriptive outcome of a transition (e.g., "Card Deployed").

### Stateful Data (server)
- `MatchInstance`: Wraps `GameState` with server-specific metadata (sockets, reconnect timers, bot strategies).
- `Ledger`: The append-only log of all `Actions` applied to a match.

### Sequence of an Action
1. **Server** receives a WebSocket message.
2. **Match Manager** identifies the `MatchActor` for the `matchId`.
3. **MatchActor** authorizes the `playerId`.
4. **MatchActor** calls `engine.validateAction()`.
5. **MatchActor** appends the action to the **Ledger** (DB).
6. **MatchActor** calls `engine.applyAction()` to get the new `GameState`.
7. **MatchActor** derives `PhalanxEvents` and broadcasts to all connected clients.

---

## 4. Constraint Enforcement

- **No leaking Engine internals**: The server should only interact with the engine via the public `applyAction` and `validateAction` entry points.
- **Deterministic Replay**: Because the Ledger contains every action, any node in the cluster can rehydrate the full `GameState` by re-applying the actions in sequence.
- **Opaque Sockets**: The Engine must never hold a reference to a `WebSocket`. Communication is purely message-driven.
