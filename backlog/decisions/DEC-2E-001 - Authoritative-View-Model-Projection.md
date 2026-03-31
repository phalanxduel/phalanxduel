---
id: DEC-2E-001
title: Authoritative View Model Projection
owner: Project Owner + Platform
date: '2026-03-29 17:51'
status: accepted
---

# DEC-2E-001 - Authoritative View Model Projection

## Context
Decoupling the client from the core engine state and enforcing "Fog of War" rules requires that clients only see a subset of the game state relevant to their role.

## Decision
The server must project a "View Model" tailored to the requester's identity (Player 0, Player 1, or Spectator). The raw `GameState` is considered internal and MUST NOT be broadcast to clients. The View Model is the sole authoritative source for visual state and allowed interactions (`validActions`).

## Consequences
- Prevents clients from seeing opponent-hidden information.
- Simplifies client implementation by providing role-specific state.
- Enables engine-independent UI development.
