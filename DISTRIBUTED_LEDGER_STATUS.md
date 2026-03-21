# Distributed Ledger Status Report - 2026-03-21

## 1. Executive Summary
We have successfully pivoted the distributed scaling strategy from "Application State Syncing" to a pure **Distributed Ledger (Event Sourcing)** model. This shift aligns the implementation with the Phalanx Duel core principles of determinism and immutability, resolving previous architectural leakage between transport, session, and data layers.

## 2. Current Architectural State (OSI-Aligned)

| Layer | Status | Implementation Details |
| :--- | :--- | :--- |
| **L1/2: Physical/Data Link** | **Complete** | Refactored Postgres schema to `matches` (metadata) and `match_actions` (authoritative ledger). Enforces atomic sequencing via unique constraints. |
| **L3: Network** | **Complete** | `PostgresEventBus` implements stateless `LISTEN/NOTIFY` coordination. PDUs carry only `matchId`, triggering local rehydration. |
| **L5: Session** | **In Progress** | `MatchManager` refactored into an **Actor Supervisor**. Maps transient local WebSockets to persistent Match Actors. |
| **L7: Application** | **Complete** | `MatchActor` rehydrates state by evaluating the ledger segments using the deterministic Engine. |

## 3. Workstream Status (Backlog TASK-95 through TASK-99)

*   [x] **TASK-95: Refactor Schema for Durable Ledger**: DB Schema simplified; migrations generated.
*   [x] **TASK-96: Implement ILedgerStore and Postgres Provider**: Providers implemented for both Postgres and InMemory.
*   [x] **TASK-97: Refactor MatchManager into Actor Supervisor**: Core actor logic implemented; state rehydration loop functional.
*   [ ] **TASK-98: Implement Interrupt-driven Synchronization**: Final "Invalidate and Re-read" loop implementation.
*   [ ] **TASK-99: Final Cluster Verification**: Automated parity proof simulation.

## 4. Technical Debt & Verification
*   **Build Status**: All source code, linting, and typechecks are **Green** (`verify:quick` passed).
*   **Documentation**: `DISTRIBUTED_LEDGER.md` established as the new architectural source of truth.
*   **Regressions**: Single-node gameplay remains functional via the `InMemoryLedgerStore` and `EventEmitterBus`.

## 5. Reference Points
*   **Base SHA**: `7167db6e` (Last commit before distributed ledger work began).
*   **Key Files**: `server/src/match.ts`, `server/src/db/postgres-store.ts`, `server/src/db/schema.ts`.

---
**Next Action**: Move this workstream to a dedicated branch for final TASK-98/99 execution and parity proof.
