---
format: read-aloud
kind: architecture-demo
lang: en-US
title: "Phalanx Duel. What the system does."
source: "PVL scenario catalog and SCMC system-purpose presentation"
voice: "Zoe (Premium)"
spoken_minutes: 2
pronunciation:
  Phalanx: "FAY lanks"
  phalanx: "FAY lanks"
  PVL: "P V L"
  OTel: "O tel"
  Jaeger: "YAY ger"
  OpenObserve: "Open Observe"
sections:
  - "The system purpose"
  - "Authority"
  - "Evidence"
  - "Spectator mode"
  - "Deterministic rewatch"
  - "The panoramic view"
---

# Phalanx Duel, system-purpose companion

<!-- cue: intro | kicker: "PHALANX DUEL" | title: "The system purpose" | scene: title -->
The purpose of a system is what it does.
Phalanx Duel coordinates intent under pressure.
A player chooses a move. The system resolves it. The system preserves the proof.

<!-- cue: authority | kicker: "THE CONTRACT" | title: "The client proposes. The server decides." | scene: turn -->
The browser is a client, not an authority.
It sends an intent to the server.
The server validates the action and the deterministic engine computes the next state.
The same input produces the same result, whether the opponent is a person, a bot, or a test runner.

<!-- cue: evidence | kicker: "THE PROOF" | title: "A match leaves a causal trail." | scene: attack -->
An accepted action becomes more than a screen update.
It becomes a transaction, an event, a state hash, and a replay position.
The scenario runner carries a trace context from the browser to the server and back to the evidence.
That makes a turn inspectable instead of mysterious.

<!-- cue: spectator | kicker: "THE OBSERVER" | title: "A spectator sees the same truth safely." | scene: reinforce -->
Spectator mode is not a second player.
It is a redacted observer projection attached to the authoritative match.
The viewer can follow turns, phases, and public events without receiving hidden cards or private actions.

<!-- cue: rewatch | kicker: "THE MEMORY" | title: "Rewatch is reconstruction, not a recording." | scene: suits -->
Rewatch starts from the deterministic initial state and applies the ordered public action log.
Step links, state hashes, and the engine agree on the same position.
The result is a replay people can inspect, share, and question.

<!-- cue: panoramic | kicker: "PANORAMIC VIEW" | title: "One identity across the strata." | scene: winning -->
P V L follows the journey from scenario runner to trace, session, match, replay step, and state hash.
Open Observe and Jaeger show the operational evidence.
The purpose is not to draw a pretty diagram.
The purpose is to show what the system actually does, and where the evidence is still unknown.

<!-- cue: outro | kicker: "PHALANX DUEL" | title: "Coordination under pressure" | scene: outro -->
That is Phalanx Duel as a system.
A game on the surface. A coordination line underneath.
Intent enters. Authority resolves. Evidence remains.
