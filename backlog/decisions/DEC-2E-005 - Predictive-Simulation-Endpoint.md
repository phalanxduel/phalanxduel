---
id: DEC-2E-005
title: Predictive Simulation Endpoint
owner: Platform + Engine
date: '2026-03-29 20:08'
status: accepted
---

# DEC-2E-005 - Predictive Simulation Endpoint

## Context
Clients need a way to preview the results of an action (e.g., battle previews, legal move validation) without duplicating complex engine logic or altering the actual match state.

## Decision
Implement a read-only simulation endpoint `POST /matches/:id/simulate` that accepts a game action and returns the projected `ViewModel` of the resulting state.

## Consequences
- Allows clients to provide rich feedback (like "If I attack here, I will lose this card") via a single API call.
- Enforces security by requiring participant identity and only allowing simulation of the requester's own moves.
- Bypasses Fastify's default rigid response serialization for this route to handle complex discriminated unions in the `PhalanxEvent` payloads, ensuring all derived event data reaches the client.
- Maintains side-effect free execution by using `applyAction` on an in-memory state without persisting the result.
