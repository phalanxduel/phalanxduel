---
type: Groma Flow
title: Play a browser match
groma:
  id: play-a-browser-match
---

A player joins a match in the React web client, exchanges real-time tactical actions with the authoritative game server, and persists verified turns to PostgreSQL.

## Steps

| From | To | Action |
| --- | --- | --- |
| [Player](../actors/player.md) | [Index](../systems/phalanxduel-game/containers/web-client/components/client-src-index.md) | Opens lobby and submits tactical turns |
| [Index](../systems/phalanxduel-game/containers/web-client/components/client-src-index.md) | [Index](../systems/phalanxduel-game/containers/game-server/components/server-src-index.md) | Sends actions over WebSocket/REST and receives redacted state |
| [Index](../systems/phalanxduel-game/containers/game-server/components/server-src-index.md) | [Index](../systems/phalanxduel-game/containers/game-engine/components/engine-src-index.md) | Validates legal moves and computes deterministic combat transitions |
| [Index](../systems/phalanxduel-game/containers/game-server/components/server-src-index.md) | [Index](../systems/phalanxduel-game/containers/shared-contracts/components/shared-src-index.md) | Computes canonical turn hashes and serializes wire messages |
| [Index](../systems/phalanxduel-game/containers/game-server/components/db-index.md) | [PostgreSQL](../externals/postgresql.md) | Persists match state, event log, and ladder ratings |
