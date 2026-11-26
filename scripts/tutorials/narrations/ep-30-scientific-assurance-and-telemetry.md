---
episode_id: ep-30-scientific-assurance-and-telemetry
title: "Scientific Gameplay Assurance, Truth Gate & OpenTelemetry"
format: "16:9"
companion_url: "https://phalanxduel.com/learn/gameplay-assurance/"
privacy: private
pronunciation:
  Phalanx: FAY-lanks
  OTel: oh-tell
  QA: Q A
---

<!-- cue:truth-gate -->
In Phalanx Duel, correctness is measured rather than assumed. An implementation-independent combat reference proof checks over two point three million finite combat cases against a pinned digest, backed by mutation tests and property-based fuzzing.

<!-- cue:otel-pipeline -->
Every match action, reconnect, and database query emits native OpenTelemetry spans flowing through the collector to Jaeger for distributed traces and OpenObserve for longitudinal analytics.

<!-- cue:playability-gate -->
Before any interface change ships, the automated Playability Gate drives full end-to-end matches from lobby to game over, guaranteeing the arena stays fast, fair, and verifiable.
