---
episode_id: ep-29-architecture-and-guiding-principles
title: "System Architecture & Guiding Principles"
format: "16:9"
companion_url: "https://phalanxduel.com/library/architecture/"
privacy: private
pronunciation:
  Phalanx: FAY-lanks
  API: A P I
  C4: C four
  SQL: sequel
---

<!-- cue:arch-engine -->
Phalanx Duel is designed as a hands-on architecture laboratory. At the core sits a pure, zero-I/O TypeScript rules engine — the single source of truth shared by the authoritative Fastify server, browser client, bots, and replay verifier.

<!-- cue:arch-ledger -->
Every match runs inside a server-authoritative actor backed by an append-only action ledger and SHA-256 per-turn state hashes. Clients never calculate combat outcomes; they render redacted projections of verified server state.

<!-- cue:arch-library -->
Explore the entire system interactively in the Architecture Library and the live Groma C4 map at phalanxduel.com/library/architecture, including the database ERD, package dependency graph, and OpenAPI directory.
