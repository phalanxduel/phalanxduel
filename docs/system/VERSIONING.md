# Phalanx Duel Versioning Policy

This document defines the authoritative versioning policy for Phalanx Duel. It explains the semantics of the primary version identifiers and the rules for evolving them while maintaining deterministic replay compatibility.

## 1. Version Identifiers

Phalanx Duel uses two distinct version signals to track implementation changes vs. gameplay logic changes.

| Identifier | Location | Semantics | Target Audience |
|------------|----------|-----------|-----------------|
| `SCHEMA_VERSION` | `shared/src/schema.ts` | **Implementation version.** Tracks the wire-format, public API surfaces, and TypeScript types. Follows [SemVer 2.0.0](https://semver.org/). | Developers, API Clients, Integrators |
| `specVersion` | `docs/RULES.md` | **Gameplay logic version.** Tracks the authoritative rules of the game. Matches the version header in `RULES.md`. | Engine Maintainers, Replay Consumers |

---

## 2. Evolving `SCHEMA_VERSION` (Implementation)

The `SCHEMA_VERSION` governs the contract between the server and its clients (Web, Admin, Mobile, or CLI).

### 2.1 Bumping Rules

- **MAJOR (`X.0.0`)**: Breaking changes to the wire protocol or public API.
  - *Examples:* Renaming required fields in `GameState`, removing public endpoints, breaking changes to the WebSocket message structure.
  - *Requirement:* A bump in `specVersion` ALWAYS requires a MAJOR bump in `SCHEMA_VERSION`.
- **MINOR (`0.X.0`)**: Backward-compatible additions.
  - *Examples:* Adding new optional fields to existing schemas, adding new API endpoints, introducing new event types that clients can safely ignore.
- **PATCH (`0.0.X`)**: Backward-compatible bug fixes or internal changes.
  - *Examples:* Internal-only refactors, dependency updates, documentation improvements, fixing validation logic that doesn't change the contract.

### 2.2 Automation

The `bin/maint/sync-version.sh` script is the canonical tool for updating `SCHEMA_VERSION`. It synchronizes all `package.json` files and the `SCHEMA_VERSION` constant in `shared/src/schema.ts`.

---

## 3. Evolving `specVersion` (Rules)

The `specVersion` governs the deterministic execution of game turns. It is the key used to ensure that a match replayed today produces the exact same outcome as when it was originally played.

### 3.1 Bumping Rules

- **MAJOR (`X.0`)**: Any change to game logic that results in a different `stateHash` for the same inputs.
  - *Examples:* Changing damage calculation (e.g. ♠ multiplier), changing board geometry constraints, adding new card types (e.g. Jokers), changing turn phase sequencing.
- **MINOR/PATCH**: Currently not used. Rules are considered atomic per major version.
  - Clarifications or errata that do not change execution logic are handled via **Rule Amendments** (`docs/RULE_AMENDMENTS.md`) and do not trigger a version bump.

### 3.2 Change Workflow

1. Propose rule change in `docs/RULES.md`.
2. Increment the version header in `RULES.md` (e.g., `v1.0` → `v2.0`).
3. Update `specVersion` literals in `shared/src/schema.ts`.
4. Update the default `specVersion` in `engine/src/state.ts`.
5. Perform a MAJOR bump of `SCHEMA_VERSION` using `sync-version.sh`.

---

## 4. Replay Compatibility Invariants

The Phalanx Duel trust model relies on 100% deterministic replays.

1. **Version Locking**: Every `GameState` and `MatchEventLog` MUST include the `specVersion` used for its creation.
2. **Engine Parity**: An engine implementation MUST reject any match record with a `specVersion` it does not explicitly support.
3. **Breaking Changes**: When `specVersion` is bumped, old match records become "historical". They can be viewed using the event logs from their original session, but they cannot be re-simulated using the new version of the engine logic unless the engine implements multi-version dispatching.
4. **Forward-Only State**: Replaying a match MUST NOT modify its original `specVersion` or any associated hashes.

---

## 5. Compatibility Matrix

| specVersion | SCHEMA_VERSION Range | Compatibility Notes |
|-------------|----------------------|---------------------|
| `1.0`       | `0.4.0` - `0.x.x`    | Initial stable release of the Phalanx Duel system. |

*This matrix is updated whenever a version bump occurs.*
