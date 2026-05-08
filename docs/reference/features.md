---
title: "System Features"
description: "A summary of the core tactical and technical features that define the Phalanx Duel system."
status: active
updated: "2026-05-08"
audience: all
---

# Phalanx Duel — System Features

Phalanx Duel is more than a simple card game; it is a high-fidelity tactical combat system built on a deterministic, server-authoritative engine. This document summarizes the primary, secondary, and tertiary features that make the system unique.

## 🛡️ Primary Features: Tactical Combat Depth

### 1. Phalanx Damage Carry-over
Unlike traditional card games where combat is often a simple 1:1 trade, Phalanx Duel features a **columnar damage flow**. Damage from an attack flows through the enemy ranks—from front-row defenders to back-row supports, and finally to the player's Lifepoints—unless intercepted by tactical maneuvers or shields.

### 2. Strategic Suit Effects
The standard deck of 52 cards is transformed into a tactical toolkit where every suit has a battlefield-altering effect:
- **♠ Spades (Assault)**: Double damage spikes against the opponent player.
- **♣ Clubs (Demolition)**: Double damage against opponent cards, shattering defenses.
- **♦ Diamonds (Fortification)**: Project AoE shields to adjacent cards, absorbing lethal damage.
- **♥ Hearts (Vitality)**: Siphon energy to heal the player or create "death shields" that prevent fatal blows.

### 3. Fog of War & Hidden Information
The system enforces a sophisticated visibility model. Cards are deployed face-down and only revealed when they participate in combat or the owner initiates an attack. This creates a deep layer of psychological play and strategic bluffing.

---

## 🏗️ Secondary Features: Technical Excellence

### 1. Server-Authoritative Determinism
The entire game engine is **pure and deterministic**. All game state is derived from an append-only ledger of actions. This ensures that every match can be perfectly replayed, verified, and audited for fairness.

### 2. Truth Gate Quality Assurance
Our CI/CD pipeline uses the "Truth Gate"—an automated battery of thousands of simulated playthroughs that verify every code change against formal state-machine invariants. We use **property-based testing** (`fast-check`) to explore edge cases that manual testing would never find.

### 3. Integrated Observability Triad
The system is built for operations. We use a centralized **Grafana LGTM stack** (Loki, Grafana, Tempo, Mimir) to provide real-time visibility into match health, latency, and system performance.

---

## ⚡ Tertiary Features: Modern Web Experience

### 1. Cinematic Visual Feedback
The battlefield comes alive with cinematic signals. Column-wide energy glows and tactical corner accents on the cards provide immediate, logical feedback on attack resolution, reinforcements, and victory conditions.

### 2. Distributed Scaling Architecture
Built to scale, the system supports multi-node clusters via Postgres `LISTEN/NOTIFY`. Players can be connected to different physical nodes and still participate in the same real-time match with sub-millisecond latency.

### 3. Resilient Match Lifecycle
Matches are durable. If a player disconnects or the database experiences a transient failure, the system maintains in-memory continuity and allows for authenticated recovery and re-joining of active sessions.

---

## 🚀 Unique Value Proposition

Phalanx Duel bridges the gap between **classical card games** and **modern tactical sims**. By combining the familiarity of a 52-card deck with a deterministic, high-observability backend, we've created a platform that is:
- **Provably Fair**: Replay hashes and event logs provide cryptographic proof of every outcome.
- **Strategically Deep**: Multi-phase turns and positional card logic reward long-term planning.
- **Operationally Robust**: Built on a modern OTel-native stack for high-availability competitive play.
