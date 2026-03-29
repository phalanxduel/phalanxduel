# API Completeness and UI Decoupling Plan

**Reference Style**: /Users/mike/github.com/just3ws/lawnstarter-engineer-assessment

This plan outlines the sequence of tasks required to achieve 100% API completeness, allowing for a fully decoupled UI that could be implemented in any language or platform (e.g., Unity, Flutter, CLI). The server will remain fully authoritative, projecting a tailored "View Model" to the client.

## Strategy

The work is organized as a Directed Acyclic Graph (DAG) to ensure prerequisites are completed before dependent features begin. Each task is mapped to a specific **Gameplay Scenario** defined in `gameplay-scenarios.md`.

### Milestone: `m-1: API Completeness & Decoupling`

#### Level 1: Foundation

*   **TASK-117: Implement Server-Side GameState Projection (View Model)**
*   *Scenario*: "Deployment Phase Redaction", "Spectator Experience".
*   *Goal*: The server must project a "View Model" that redacts hidden opponent information and explicitly lists `validActions`.
*   **TASK-113: Implement AsyncAPI Specification for WebSocket Protocol**
*   *Scenario*: "Match Creation (PvP - Invitation Link)".
*   *Goal*: Formalize the `/ws` endpoint so external clients know the sequence and shape of real-time events.

#### Level 2: Logic & Assets Discovery

*   **TASK-118: Implement Card Manifest and Rule Discovery Endpoints**
*   *Dependencies*: TASK-117
*   *Scenario*: "Legal Move Discovery".
*   *Goal*: Implement `GET /api/cards/manifest` and `GET /api/rules/phases` to remove hardcoded logic from the client.

#### Level 3: Predictive UI Support

*   **TASK-119: Implement Predictive Simulation Endpoint for Legal Moves**
*   *Dependencies*: TASK-118
*   *Scenario*: "Predictive Simulation (Dry-Run)".
*   *Goal*: Implement `POST /api/matches/:id/simulate`. Allows a client to preview the result of an action before committing.

#### Level 4: Validation & Reference Implementation

*   **TASK-120: Automate SDK/Client Stub Generation from Specs**
*   *Dependencies*: TASK-113, TASK-119
*   *Goal*: Prove decoupling by automatically generating a usable SDK.
*   **TASK-121: Align Current UI as Reference Implementation**
*   *Goal*: Update the existing React/Preact client to consume the new ViewModel and Discovery endpoints, proving it is a decoupled "reference implementation" before final rollout.
