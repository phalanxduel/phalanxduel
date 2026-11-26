---
episode_id: ep-32-how-to-contribute
title: "How to Contribute: Clone to Local Demo in 5 Minutes"
format: "16:9"
companion_url: "https://phalanxduel.com/contribute/"
privacy: private
pronunciation:
  Phalanx: FAY-lanks
  ADR: A D R
  PR: P R
---

<!-- cue:clone-to-demo -->
Contributing to Phalanx Duel starts on your host machine with Node 24, pnpm, and Postgres. Clone the repository, run pnpm install and pnpm qa:setup, then launch the full local stack with bin/phx-demo-ctl up.

<!-- cue:guardrails -->
The repository ships with strict guardrails: database environment isolation wrappers protect your development data, the Playability Gate verifies end-to-end matches before UI changes, and Architectural Decision Records document every major design choice.

<!-- cue:ship-pr -->
Run pnpm check to validate builds, lint, typechecking, and tests in one command. Whether you improve tactics, docs, clients, or observability, start at phalanxduel.com/contribute.
