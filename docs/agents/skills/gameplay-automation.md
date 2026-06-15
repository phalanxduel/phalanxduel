# Gameplay Automation Contract

This guide defines the repo's automation contract for v2 gameplay work.
It exists so future agents can keep the game fully automatable while the Godot
client and the browser QA surfaces evolve in parallel.

## Contract

1. Preserve deterministic automation first, visual polish second.
2. Keep gameplay rules authoritative in the TypeScript engine.
3. Use committed scenario or replay data for harnesses; do not reimplement
   game logic in GDScript.
4. Prefer the smallest runner that proves the change.
5. Treat visible Godot playback as a confirmation path, not the only proof of
   head-to-head automation.

## Current Runner Map

- `pnpm qa:playthrough:verify`: rules and replay integrity gate.
- `pnpm qa:playthrough`: quick headless match smoke.
- `pnpm qa:playthrough:ui`: browser end-to-end validation.
- `pnpm qa:playthrough:ui -- --spectator`: visual spectator verification.
- `pnpm qa:godot:automation`: headless Godot harness with machine-readable
  checkpoints.
- `pnpm qa:godot:playthrough`: visible Godot demo or live watch playback.

## Decision Rules

- If the change touches engine, shared schema, or replay integrity, verify the
  TypeScript playthrough gate first.
- If the change touches browser UI or spectator surfaces, prove playability
  before polishing the UI.
- If the change touches Godot launch paths or playback surfaces, verify the
  Godot harness first, then confirm the visible runner starts, plays, and exits
  cleanly.
- If a new flag or mode is added, document it in
  `docs/reference/pnpm-scripts.md` in the same change.

## Failure Handling

- If a runner crashes, fix the startup or wiring path before adding polish.
- If automation diverges from the engine's deterministic output, treat that as
  a contract bug, not a presentation issue.
- If a change cannot be proven by automation, stop and create the missing
  runner or checkpoint before continuing.
