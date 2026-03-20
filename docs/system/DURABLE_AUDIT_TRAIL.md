# Durable Audit Trail (transaction_logs)

The Phalanx system implements a normalized, append-only durable audit trail to ensure competitive integrity, deterministic replayability, and reliable operational recovery.

## 1. Schema Overview

The `transaction_logs` table stores an ordered sequence of every action applied to a match. Unlike the aggregate `transactionLog` stored in the `matches` table, this table is designed for high-concurrency safety and granular querying.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary key. |
| `match_id` | UUID | Foreign key to the `matches` table. |
| `sequence_number` | Integer | Incremental counter starting at 0. |
| `action` | JSONB | The full `Action` payload received from the player. |
| `state_hash_before` | Text | SHA-256 state hash before applying the action. |
| `state_hash_after` | Text | SHA-256 state hash after applying the action. |
| `events` | JSONB | The array of `PhalanxEvent` objects produced by this turn. |
| `created_at` | Timestamp | Server-side record of when the action was persisted. |

### 1.1 Indexes
*   **Unique Index**: `(match_id, sequence_number)` ensures no duplicate actions can be recorded for a single step and provides O(1) retrieval for turn-by-turn replay.

## 2. Persistence Flow

1.  **Action Received**: Server receives a WebSocket `Action`.
2.  **Fidelity Check**: Server validates the action against the engine's `STATE_MACHINE`.
3.  **Engine Apply**: Engine applies the action and returns the new state and derived events.
4.  **Audit Write**: Server writes a new row to `transaction_logs` containing the action, hashes, and events.
5.  **State Snapshot**: Server updates the `matches` table with the latest state snapshot.
6.  **Broadcast**: Server broadcasts the resulting state to all participants.

## 3. Reliability & Recovery Use Cases

### 3.1 Point-in-Time Recovery
If a match state becomes corrupted or stuck due to a logic bug, operators can:
1.  Query the `transaction_logs` for that `match_id`.
2.  Re-apply the actions sequence up to the desired `sequence_number`.
3.  Reconstruct the canonical `GameState` and resume play.

### 3.2 Dispute Resolution
In ranked play, if a player disputes a result (e.g., claiming a "ghost move" or "desync"), the `transaction_logs` provide an immutable ledger of every authorized action and the resulting state hashes.

### 3.3 Performance Monitoring
The `transaction_logs` table allows for off-path analysis of game performance, turn durations, and rule-frequency without impacting the live `matches` table performance.

## 4. Replay Verification

Matches are verified by the `replayGame` utility. A match is considered **Canonical** only if:
1.  The sequence of actions in `transaction_logs` results in the same final `stateHashAfter` as recorded in the ledger.
2.  The chain of hashes (`state_hash_after` of seq N == `state_hash_before` of seq N+1) is unbroken.
