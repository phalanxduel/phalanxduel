---
id: DEC-2E-004
status: locked
owner: @generalist
date: 2026-03-29
---
# DEC-2E-004: Centralized Game Rule Schemas

Centralize all game rule and entity schemas (e.g., `StateTransition`, `TransitionTrigger`, `CardManifest`) in the `@phalanxduel/shared` package. This ensures a single source of truth for both the engine and the API, enabling perfect parity between internal logic and external documentation. By moving these from `@phalanxduel/engine`, we allow the API layer to serve discovery endpoints without introducing circular dependencies or duplicating type definitions.
