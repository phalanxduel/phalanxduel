# CODEX.md

## Phalanx Duel v2 (Godot Migration)

The Godot 4.x client is the primary UI. Refer to `docs/v2/` and the Backlog (`m-14`) for architectural decisions.

### Parity Protocol

1.  **State Contract**: All state is derived from `GameViewState`. Never compute game rules in GDScript.
2.  **Automation**: Drive via `PlayerIntent`. Verify via `AutomationCheckpoint`.
3.  **Testing**: Parity verified by `pnpm qa:replay:verify` against the TypeScript reference client.
