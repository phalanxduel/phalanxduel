# CODEX.md

Codex uses [`AGENTS.md`](AGENTS.md) as the canonical repo instruction surface.
This file only records Codex-specific routing/context that must remain
consistent with `AGENTS.md`.

## Current UI Context

The React browser client in `client/` is the active UI and demo path, and the
TypeScript engine/server are the source of truth. Godot/V2 source is retired
and removed from main. Historical Backlog entries do not authorize restoring it;
restoration requires an explicit human request. See `AGENTS.md` for recovery.

### Deterministic Protocol

1. **State Contract**: Client UI state is derived from server/engine-owned state contracts.
2. **Automation**: Preserve protocol-level regression coverage before UI changes.
3. **Testing**: Verify gameplay with `pnpm qa:playthrough:verify` and replay coverage as needed.
