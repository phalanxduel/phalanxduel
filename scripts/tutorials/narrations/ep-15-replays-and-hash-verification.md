---
episode_id: ep-15-replays-and-hash-verification
title: "Deterministic Replays & Cryptographic Hash-Chain Verification"
format: "16:9"
companion_url: "https://phalanxduel.com/learn/gameplay-assurance/"
privacy: private
pronunciation:
  Phalanx: FAY-lanks
  LP: life points
  MCTS: M C T S
---

<!-- cue:replay-intro -->
Phalanx Duel is built on a pure, deterministic TypeScript engine — meaning every match is 100 percent replayable and cryptographically verifiable.

<!-- cue:step-through -->
Open any completed match to step turn-by-turn through deployments, attacks, suit modifiers, and event logs with full arithmetic provenance.

<!-- cue:hash-verify -->
Every turn emits a canonical SHA-256 state hash linked into a verifiable chain. Anyone can run the match verify endpoint to prove zero tampering from turn zero to game over.
