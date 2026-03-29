# Phalanx Duel: Comprehensive Gameplay Scenarios

**Reference Style**: /Users/mike/github.com/just3ws/lawnstarter-engineer-assessment

This document defines the normative, verifiable scenarios for Phalanx Duel. These scenarios drive the **API Completeness & Decoupling** milestone. Each scenario is written in Gherkin-style (Given/When/Then) to be both human-readable and machine-verifiable.

## 1. Registration & Lobby

### Scenario: New Player Registration
**Goal**: Verify external identity management.
*   **Given** an unauthenticated external client.
*   **When** the client submits a `POST /api/auth/register` with a unique email and valid gamertag.
*   **Then** the server returns `200 OK` with a JWT and a User object.
*   **And** the OpenAPI spec validates the response structure.

### Scenario: Match Creation (PvE - Bot)
**Goal**: Verify bot match initialization via API.
*   **Given** an authenticated player "Alice".
*   **When** Alice sends a `createMatch` message over WebSocket with `opponent: "bot-random"`.
*   **Then** the server responds with `matchCreated`.
*   **And** the `GameState` (ViewModel) indicates Alice is Player 0 and Player 1 is a Bot.
*   **And** the `validActions` array includes `deploy`.

### Scenario: Match Creation (PvP - Invitation Link)
**Goal**: Verify peer-to-peer match discovery.
*   **Given** an authenticated player "Alice".
*   **When** Alice sends a `createMatch` message with `opponent: "human"`.
*   **Then** the server responds with `matchCreated` and a `matchId`.
*   **When** player "Bob" receives the ID and sends `joinMatch` with that `matchId`.
*   **Then** both players receive a `gameState` update.
*   **And** the server broadcasts `playerJoined` to both.

---

## 2. Core Gameplay Loop (View Model Auth)

### Scenario: Deployment Phase Redaction
**Goal**: Verify Fog of War in the API View Model.
*   **Given** a match in `DeploymentPhase`.
*   **When** Alice (P0) deploys a card to `column 0`.
*   **Then** Alice's View Model shows the full card details in `column 0`.
*   **But** Bob's (P1) View Model shows `column 0` as a card with `faceDown: true` and redacted `suit/value`.

### Scenario: Legal Move Discovery
**Goal**: Verify the server informs the client of valid interactions.
*   **Given** it is Alice's turn in `AttackPhase`.
*   **Then** Alice's View Model contains a `validActions` array including `{"type": "attack", "attackingColumn": 0}`.
*   **And** Bob's View Model contains `validActions: []` (or only `forfeit`).

---

## 3. Battle & Resolution

### Scenario: Predictive Simulation (Dry-Run)
**Goal**: Verify the client can preview an outcome without committing.
*   **Given** a match in `AttackPhase`.
*   **When** Alice submits a `POST /api/matches/:id/simulate` with an `attack` action.
*   **Then** the server returns a "Projected View Model".
*   **And** the actual match state remains unchanged.
*   **And** the projection shows the calculated damage to Bob's life points.

---

## 4. Security, Fraud & Edge Cases

### Scenario: Attempted Cheating (Illegal Phase Action)
**Goal**: Verify server authority over game rules.
*   **Given** a match in `DeploymentPhase`.
*   **When** Alice attempts to send an `attack` action via WebSocket.
*   **Then** the server rejects the message with an `actionError`.
*   **And** the error code is `INVALID_PHASE`.
*   **And** the actual `GameState` remains unchanged.

### Scenario: Identity Spoofing (Impersonation)
**Goal**: Verify player-socket binding.
*   **Given** Alice is Player 0 and Bob is Player 1.
*   **When** Bob sends an action with `playerIndex: 0`.
*   **Then** the server rejects the message with `UNAUTHORIZED_ACTION`.

---

## 5. Spectator Experience

### Scenario: Live Spectating
**Goal**: Verify the spectator view model.
*   **Given** a live match between Alice and Bob.
*   **When** a third client sends `watchMatch` with the `matchId`.
*   **Then** the spectator receives a `gameState` update.
*   **And** the spectator's View Model has `faceDown: true` for ALL cards in both players' hands.
*   **But** all cards on the battlefield are `faceDown: false` (per Phalanx Rule 13.3).

---

## 6. Game Conclusion

### Scenario: Victory by Life Point Depletion
**Goal**: Verify terminal state transition.
*   **Given** Bob has `2 LP` remaining.
*   **When** Alice performs an attack that deals `3 damage`.
*   **Then** the server broadcasts a `gameState` with `phase: "gameOver"`.
*   **And** the `outcome` object specifies `winnerIndex: 0` and `victoryType: "lpDepletion"`.
