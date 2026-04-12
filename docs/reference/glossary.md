# Phalanx Duel Glossary

This document defines the canonical terminology used throughout the Phalanx Duel codebase, documentation, and game rules. Standardizing these terms ensures clear communication between developers, players, and automated systems.

## Core Concepts

### Phalanx
The name of the open tactical card system and suite of game formats. In the context of the game, it refers to the tactical arrangement of cards and the broader ecosystem.

### Duel
The specific 1v1 competitive format of the Phalanx system.

### Match
A single game session between two players (P1 and P2) from initialization to completion.

### Match Parameters
The canonical rule-authoritative configuration object defined in RULES.md §3. These parameters, not transport-specific compatibility fields, govern compliant v1.0 gameplay.

---

## Technical & Rule Terms

### Action
A discrete command sent by a player to the game engine (e.g., Attack, Deploy, Pass). The five player actions are: `deploy`, `attack`, `pass`, `reinforce`, and `forfeit`. Each action is only valid in specific **Phases** of the turn lifecycle.

### Attack Phase
The phase of a turn where the active player declares and resolves an attack.

### Battlefield
The grid where cards are played. Each player has their own side of the battlefield, typically organized into columns and ranks. In canonical v1.0 gameplay, battlefield cards are face-up and visible to all participants.

### Card ID
The opaque deterministic identifier assigned when a card is drawn. In v1.0 the format is `[Timestamp]::[MatchID]::[PlayerID]::[TurnNumber]::[DrawIndex]`. The suffix is a draw-order index, not encoded card identity.

### Boundary
The transition point between two adjacent targets in a **Target Chain** (e.g., between two cards, or between the last card and the player). Suit effects are evaluated at these boundaries.

### Carryover
The remaining damage value from an attacking card after it has successfully destroyed a target or had its value reduced by a **Shield** effect.

### Cleanup Phase
The phase following **Attack Resolution** where destroyed cards are moved to the **Graveyard** and columns are collapsed.

### Column
A vertical alignment of card slots on the **Battlefield**. Cards in a column are ordered by **Rank**.

### Deployment
The act of placing a card from the hand onto the **Battlefield** during the **Deployment Phase** or **Reinforcement Phase**.

### Deterministic
The property of the game engine where the same inputs (state + action) always produce the exactly same output (post-state + events) without any randomness.

### Event
A discrete, structured record of a functional update or state change occurring during a turn (e.g., `card_destroyed`, `boundary_evaluated`).

### Event Log
The ordered collection of all **Events** generated during a match. Used for auditing, debugging, and replay verification. The event log is fingerprinted with a SHA-256 hash for offline integrity checks.

### Game State
The complete snapshot of a match at any point in time, including both players' battlefields, hands, draw piles, life points, the current phase, turn number, and pass tracking. Game state is the authoritative input to the engine for computing the next state.

### Intent
A player's desire to perform an **Action**. In the Phalanx system, intents are expressed as actions and validated by the engine against the current **Game State** and **Phase**. An intent that violates state machine constraints is rejected as an illegal action.

### Graveyard
The pile where cards are placed after being destroyed or discarded. The graveyard is LIFO (Last-In, First-Out) and cards are never reshuffled back into the deck.

> **Wire format:** The state field is named `discardPile` in `PlayerStateSchema` for historical reasons. See `docs/gameplay/rule-amendments.md` RA-001.

### Origin Attacker
The specific card that initiated an attack. Its properties (suit, value, type) remain immutable throughout the resolution of that specific **Target Chain**.

### Phase
A discrete step in the **Turn** lifecycle. The Phalanx v1.0 turn lifecycle has 8 phases executed in strict order: `StartTurn` → `DeploymentPhase` → `AttackPhase` → `AttackResolution` → `CleanupPhase` → `ReinforcementPhase` → `DrawPhase` → `EndTurn`. Player actions are only valid in specific phases (see RULES.md §4).

### Player Index
The zero-based identifier for a player within a match. `0` = P1 (the match creator), `1` = P2 (the joiner). Used in state, actions, and the transaction log to unambiguously identify which player is acting or being affected.

### Rank
The position index of a card within a **Column**. Rank 0 is the "front" rank, closest to the opponent.

### Reinforcement Phase
The phase where a player can deploy additional cards to the **Battlefield** from their hand, provided there are empty ranks.

### Round
One complete cycle where both players have taken their turns. In Phalanx: Duel, a round is not an explicit game concept — the **Turn** number increments each full cycle. The term is used informally in player-facing contexts.

### Span
A hierarchical container for events, inspired by OpenTelemetry. A **Turn** is a span, and each **Phase** within the 8-phase turn lifecycle is a child span.

### SpecVersion
The version of the Phalanx Duel ruleset being followed by a match (e.g., "1.0").

### Target Chain
The ordered list of potential targets for an attack within a defending **Column**, starting from Rank 0 and ending with the defending **Player**.

---

## Suit & Card Effects

### Clubs (♣) — Weapon
A suit effect that doubles the **Carryover** damage at the first boundary after the first destruction in an attack.

### Diamonds (♦) — Shield
A suit effect that reduces the **Carryover** damage by the value of the diamond card.

### Hearts (♥) — Life/Heal
A suit effect that can mitigate damage to the player if a heart card was the final card destroyed in the **Target Chain**.

### Spades (♠) — Pierce
A suit effect where the **Origin Attacker** deals double damage when hitting the defending **Player**.

### Classic Aces
A rule mode where Aces can only be destroyed by other Aces, and only if they are at Rank 0.

### Classic Face Cards
A rule mode (Jack, Queen, King) that restricts which cards can be destroyed by which face cards based on a hierarchy.

---

## System & Infrastructure

### Canonicalize
The process of formatting game state (e.g., sorting JSON keys alphabetically) before hashing to ensure consistent, deterministic hashes.

### Centralized LGTM Stack
The single supported observability backend for Phalanx Duel. It is the shared
Grafana/Loki/Tempo/Mimir operator surface that receives telemetry from one or
more OpenTelemetry collectors.

### Collector Boundary
The architectural rule that applications emit telemetry to a local or
environment-local OpenTelemetry collector endpoint instead of owning backend
routing details directly. This preserves optionality for batching, redaction,
transport, and backend changes without changing application code.

### Local Collector
An OpenTelemetry collector process or container that receives telemetry close
to the application, for example as a sidecar, node agent, or local developer
helper. A local collector is forwarding infrastructure, not a separate
observability backend.

### Replay
A record of all actions in a match that can be "replayed" through the engine to verify the final state and integrity.

### State Hash
A SHA-256 digest of the **Canonicalized** **Game State**. State hashes are recorded in the **Transaction Log** (before and after each action) to enable replay verification and detect state divergence.

### Transaction Log
A persistent record of every state transition (action + pre-state hash + post-state hash) in a match.

### Turn
A single iteration of the 8-phase lifecycle for one player. Each turn increments the `turnNumber` counter. The active player alternates after each turn (see **Phase** for the phase sequence).

### Compatibility Input
A transport, admin, or legacy runtime field that may be accepted by some implementation surfaces but is not rule-authoritative unless represented in the canonical **Match Parameters** contract. Current examples include `gameOptions.damageMode`, `gameOptions.startingLifepoints`, and `gameOptions.quickStart`.
