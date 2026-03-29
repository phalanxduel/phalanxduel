---
id: DEC-2E-001
status: locked
owner: Mike Hall
date: 2026-03-29
---
# DEC-2E-001: Authoritative View Model Projection

To ensure UI decoupling and enforce Fog of War, the server must project a "View Model" tailored to the requester's identity (Player 0, Player 1, or Spectator). The raw `GameState` is considered internal and MUST NOT be broadcast to clients. The View Model is the sole authoritative source for visual state and allowed interactions (`validActions`).
