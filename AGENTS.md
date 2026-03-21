# AI Agent Collaboration Log

This document tracks the reasoning, decisions, and instructions shared between human and AI agents in the development of Phalanx Duel.

## Architectural Principles

1.  **Durable Ledger (Layer 2)**: The database is a pure, append-only action log.
2.  **Actor Model (Layer 7)**: Each match is an isolated actor that rehydrates from the ledger.
3.  **OSI Isolation**: Abstractions do not leak between Transport (L4), Session (L5), and Application (L7).

---

## Log Entries

### 2026-03-21 - Distributed Ledger Refactor

**Context**: Attempted to implement horizontal scaling by synchronizing monolithic "MatchInstance" objects. This resulted in architectural leakage where player names and session IDs were forced into the database schema.

**Decision**: Revert to a "Ledger-as-Authority" model.
*   Strip the `matches` table to immutable config.
*   Store all game inputs in `match_actions`.
*   Use `LISTEN/NOTIFY` as an interrupt signal to trigger local rehydration.

**Implementation Plan**:
```bash
# 1. Simplify Schema
pnpm --filter @phalanxduel/server db:generate --name refactor_to_ledger
# 2. Refactor MatchManager to Actor Supervisor
# 3. Implement Invalidate & Re-read Sync
```

---

## Technical Instruction Snippets

### Ledger Sequencing Constraint
To ensure integrity at Layer 1, the `match_actions` table must have a composite unique index:
```sql
CREATE UNIQUE INDEX match_seq_idx ON match_actions (match_id, sequence_number);
```

### Actor Sync Loop
The Actor rehydrates by fetching only missing segments:
```typescript
async sync() {
  const newActions = await ledger.getActions(matchId, localSeq);
  newActions.forEach(a => {
    state = engine.apply(state, a);
    localSeq++;
  });
}
```

---

## Role Assignment Map

| Role | Tool/Agent | Responsibility |
| :--- | :--- | :--- |
| **Persistence** | Drizzle/Postgres | Layer 1/2 Durable Ledger. |
| **Networking** | HAProxy/WS | Layer 3/4 Transport. |
| **Domain Host** | MatchActor | Layer 7 Logic Execution. |

---

## Session Handoff - distributed-scaling-v1

### Current State
*   **Schema**: Finalized (`matches` + `match_actions`).
*   **Logic**: `MatchActor` implemented with "Invalidate and Re-read" sync.
*   **Observability**: `MatchRepository` provides completed match history.

### Next Session Directives
1.  Verify high-concurrency "many duels" performance.
2.  Implement Snapshotting if replaying > 100 actions becomes slow.

### Verification Status
```json
{
  "build": "green",
  "lint": "green",
  "typecheck": "green"
}
```
