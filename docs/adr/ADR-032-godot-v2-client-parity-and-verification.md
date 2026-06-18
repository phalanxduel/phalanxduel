# ADR-032: Godot V2 Client Parity and Verification

Status: Accepted
Date: 2026-06-17

## Context
The Phalanx Duel project needs a native Godot client (v2) that can become the
primary rich-client experience. The v1 browser client remains the established
UX and automation reference. Godot parity work must preserve deterministic game
logic in the TypeScript engine/server and avoid duplicating rules in GDScript.

## Decision
We adopted the following strategy to achieve parity:

1. **Metadata Bridge:** Godot nodes expose semantic automation IDs mirroring
   browser `data-testid` selectors where practical.
2. **Aesthetic Centralization:** `ThemeManager.gd` centralizes Godot UI colors
   so scenes can stay aligned with browser-side style tokens.
3. **Deterministic Verification:** `bin/qa/godot-automation.ts` and
   `bin/qa/godot-playthrough.ts` write browser-shaped artifacts with manifests,
   event logs, checkpoints, and result summaries.
4. **Visual Regression:** `bin/qa/compare-snapshots.ts` provides a pixel
   comparison path for headed Godot screenshots against browser gallery
   baselines.

## Consequences

- **Positive:** Godot parity can be verified through machine-readable artifacts
  instead of manual inspection alone.
- **Positive:** Godot UI scenes can share stable theme tokens and automation IDs
  across parity slices.
- **Constraint:** Headless Godot uses the dummy renderer and cannot provide
  viewport screenshots; visual evidence requires a headed run.
- **Risk:** The project now has a larger dual-client maintenance surface until
  Godot fully replaces the browser client for primary UX.
- **Open:** Platform-specific Steamworks integration is intentionally deferred
  until parity exit gates pass and a human approves the required account and
  service-integration scope.
