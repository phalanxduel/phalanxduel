---
episode_id: ep-19-terminal-client-duel-cli
title: "Playing from the Terminal with Go duel-cli"
format: "16:9"
companion_url: "https://phalanxduel.com/build-with-phalanx/"
privacy: private
pronunciation:
  Phalanx: FAY-lanks
  LP: life points
  MCTS: M C T S
---

<!-- cue:cli-intro -->
Prefer the terminal? Phalanx Duel ships an official Go CLI client built from generated OpenAPI and AsyncAPI contracts.

<!-- cue:cli-join -->
Launch duel-cli to browse the live lobby, join a match against a browser opponent, and play turns with resilient WebSocket ACK replay and automatic rejoin.

<!-- cue:cross-client -->
Because the TypeScript server is the single source of truth, terminal players, browser players, and MCP AI agents all compete on the exact same authoritative board.
