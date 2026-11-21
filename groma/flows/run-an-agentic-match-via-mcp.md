---
type: Groma Flow
title: Run an agentic match via MCP
groma:
  id: run-an-agentic-match-via-mcp
---

An AI agent or autonomous bot interacts with Phalanx Duel through the MCP server to evaluate positions, submit turns, and inspect match history.

## Steps

| From | To | Action |
| --- | --- | --- |
| [Player](../actors/player.md) | [Server](../systems/phalanxduel-game/containers/mcp-server/components/server.md) | Invokes MCP gameplay and analysis tools |
| [Server](../systems/phalanxduel-game/containers/mcp-server/components/server.md) | [Index](../systems/phalanxduel-game/containers/game-server/components/server-src-index.md) | Creates matches and submits authenticated turn actions |
| [Engine](../systems/phalanxduel-game/containers/mcp-server/components/engine.md) | [Index](../systems/phalanxduel-game/containers/game-engine/components/engine-src-index.md) | Evaluates board states and recommends bot moves |
| [Db](../systems/phalanxduel-game/containers/mcp-server/components/src-db.md) | [PostgreSQL](../externals/postgresql.md) | Queries persisted match history and ladder ratings |
