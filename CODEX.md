# CODEX.md

## Current UI Context

Godot/V2 migration is iceboxed. Treat the React browser client as the active UI
and the TypeScript engine/server as the source of truth unless Backlog explicitly
reactivates Godot/V2 work.

### Deterministic Protocol

1. **State Contract**: Client UI state is derived from server/engine-owned state contracts.
2. **Automation**: Preserve protocol-level regression coverage before UI changes.
3. **Testing**: Verify gameplay with `pnpm qa:playthrough:verify` and replay coverage as needed.
