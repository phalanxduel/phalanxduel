# Gameplay Automation Contract

This guide defines the repo's automation contract for gameplay work.
It exists so future agents can keep the game fully automatable while the browser UI surfaces evolve.

## Contract

1. Preserve deterministic automation first, visual polish second.
2. Keep gameplay rules authoritative in the TypeScript engine.
3. Use committed scenario or replay data for harnesses.
4. Prefer the smallest runner that proves the change.

## Current Runner Map

- `pnpm qa:playthrough:verify`: rules and replay integrity gate.
- `pnpm qa:playthrough`: quick headless match smoke.
- `pnpm qa:playthrough:ui`: browser end-to-end validation.
- `pnpm qa:playthrough:ui -- --spectator`: visual spectator verification.

## Decision Rules

- If the change touches engine, shared schema, or replay integrity, verify the
  TypeScript playthrough gate first.
- If the change touches browser UI or spectator surfaces, prove playability
  before polishing the UI.
- If a new flag or mode is added, document it in
  `docs/reference/pnpm-scripts.md` in the same change.

## Failure Handling

- If a runner crashes, fix the startup or wiring path before adding polish.
- If automation diverges from the engine's deterministic output, treat that as
  a contract bug, not a presentation issue.
- If a change cannot be proven by automation, stop and create the missing
  runner or checkpoint before continuing.
