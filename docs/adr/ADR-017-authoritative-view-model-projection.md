---
id: decision-017
title: 'Authoritative View Model Projection'
owner: Project Owner + Platform
date: '2026-03-29 17:51'
status: accepted
---

# DEC-2E-001 - Authoritative View Model Projection

## Context
Decoupling the client from the core engine state and enforcing "Fog of War" rules requires that clients only see a subset of the game state relevant to their role.

## Decision
The engine defines one observer-relative projection tailored to the requester's
role (Player 0, Player 1, competitive bot, live spectator, terminal replay, or
explicit omniscient research). The server applies it to both modern view models
and legacy payloads. Raw `GameState` is internal and MUST NOT be broadcast to
live clients or passed to competitive bots. The View Model is the sole
authoritative source for visual state and allowed interactions (`validActions`).

## Consequences
- Prevents clients from seeing opponent-hidden information.
- Simplifies client implementation by providing role-specific state.
- Enables engine-independent UI development.
- Makes hidden-state noninterference testable across state, action, event,
  narration, bot, and replay consumers.
