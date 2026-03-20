# Schema Evolution and Migration Strategy

This document defines the formal policy for evolving the Phalanx Duel schemas (`shared/src/schema.ts`) and database migrations while preserving competitive replay integrity.

---

## 1. Versioning Model

Phalanx Duel uses a dual-versioning system to separate gameplay logic from transport protocols.

| Identifier | Level | Purpose |
| :--- | :--- | :--- |
| **`specVersion`** | Gameplay | Tracks rules engine changes (combat, suits, turn lifecycle). |
| **`SCHEMA_VERSION`** | Transport | Tracks field additions, protocol changes, and DB structure. |

### 1.1 Compatibility Matrix
*   **Minor Bumps (0.x.y)**: Add-only changes. Fully backward compatible.
*   **Major Bumps (X.0.0)**: Breaking changes. Requires a coordinated client/server release and potential data migration.

---

## 2. Rules for Evolution

### 2.1 Forward Compatibility (Adding Fields)
*   **Default Policy**: Always add new fields as `.optional()` or with a `.default()`.
*   **Validation**: Every change must pass `rtk pnpm schema:gen` and `rtk pnpm verify:all`.

### 2.2 Backward Compatibility (Removing/Renaming)
*   **Prohibited**: Fields used in deterministic state calculation (e.g. `Card.id`, `PlayerState.lifepoints`) **MUST NOT** be renamed or removed without a `specVersion` bump.
*   **Deprecation**: To remove a field, mark it as optional in version N, and remove it in version N+1 after verifying no live matches depend on it.

---

## 3. Replay & Hash Chain Integrity

Because every turn is signed by a state hash, any change to the `GameState` schema has the potential to break the chain of trust for historical matches.

### 3.1 Immutable Replays
Matches recorded under `specVersion` 1.0 must always be replayable using the 1.0 engine.
*   **Strategy**: If a breaking change is required, the engine must support "versioned application" (e.g. `applyActionV1`, `applyActionV2`) to ensure historical hash chains remain valid.

### 3.2 Verification
Every schema change must be verified against the `engine/tests/replay.test.ts` suite. If the hashes of existing test scenarios change, the modification is considered **Breaking** and must follow the Major Version policy.

---

## 4. Client/Server Negotiation

1.  **Handshake**: Clients include their `SCHEMA_VERSION` in the WebSocket handshake.
2.  **Rejection**: The server rejects connections from clients with unsupported versions (e.g., version mismatch in major or critical minor).
3.  **Warning**: If a client is behind by one minor version, the server allows the connection but sends an `OUTDATED_CLIENT` warning.

---

## 5. Deployment & Migrations

### 5.1 Drizzle Migrations
*   **Append-Only**: Prefer adding new tables/columns over modifying existing ones.
*   **Multi-Phase Rollout**:
    1.  Deploy DB migration (Add column).
    2.  Deploy Code (Read old, Write both).
    3.  Deploy Code (Read new, Write new).
    4.  (Optional) Deploy DB migration (Remove old column).
