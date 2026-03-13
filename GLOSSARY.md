# Phalanx Duel Glossary

This document defines the canonical terminology used throughout the Phalanx Duel codebase, documentation, and game rules. Standardizing these terms ensures clear communication between developers, players, and automated systems.

## Core Concepts

### Phalanx
The name of the open tactical card system and suite of game formats. In the context of the game, it refers to the tactical arrangement of cards and the broader ecosystem.

### Duel
The specific 1v1 competitive format of the Phalanx system.

### Match
A single game session between two players (P1 and P2) from initialization to completion.

---

## Technical & Rule Terms

### Action
A discrete command sent by a player to the game engine (e.g., Attack, Deploy, Pass).

### Attack Phase
The phase of a turn where the active player declares and resolves an attack.

### Battlefield
The grid where cards are played. Each player has their own side of the battlefield, typically organized into columns and ranks.

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

### Graveyard
The pile where cards are placed after being destroyed or discarded. The graveyard is LIFO (Last-In, First-Out) and cards are never reshuffled back into the deck.

### Origin Attacker
The specific card that initiated an attack. Its properties (suit, value, type) remain immutable throughout the resolution of that specific **Target Chain**.

### Rank
The position index of a card within a **Column**. Rank 0 is the "front" rank, closest to the opponent.

### Reinforcement Phase
The phase where a player can deploy additional cards to the **Battlefield** from their hand, provided there are empty ranks.

### Span
A hierarchical container for events, inspired by OpenTelemetry. A **Turn** is a span, and each **Phase** within a turn is a child span.

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

### Replay
A record of all actions in a match that can be "replayed" through the engine to verify the final state and integrity.

### Transaction Log
A persistent record of every state transition (action + pre-state hash + post-state hash) in a match.
