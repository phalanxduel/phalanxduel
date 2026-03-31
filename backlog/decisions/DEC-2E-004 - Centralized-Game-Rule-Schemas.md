---
id: DEC-2E-004
title: Centralized Game Rule Schemas
owner: Engine + Platform
date: '2026-03-29 19:15'
status: accepted
---

# DEC-2E-004 - Centralized Game Rule Schemas

## Context
To allow completely decoupled UI implementation, clients need a way to discover game entities and rules without hardcoding them. This requires exposing engine internals like the state machine and card manifest via the API.

## Decision
Centralize all game rule and entity schemas (e.g., `StateTransition`, `TransitionTrigger`, `CardManifest`) in the `@phalanxduel/shared` package.

## Consequences
- Ensures a single source of truth for both the engine and the API.
- Enables perfect parity between internal logic and external documentation.
- Allows the API layer to serve discovery endpoints without introducing circular dependencies or duplicating type definitions.
