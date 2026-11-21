---
type: Groma Flow
title: Play a terminal match
groma:
  id: play-a-terminal-match
---

A player connects through the Go duel-cli, which uses generated OpenAPI REST endpoints and resilient WebSocket messaging with ACK replay.

## Steps

| From | To | Action |
| --- | --- | --- |
| [Player](../actors/player.md) | [Client](../systems/phalanxduel-game/containers/duel-cli/components/client.md) | Issues terminal commands to join and play a match |
| [Client](../systems/phalanxduel-game/containers/duel-cli/components/client.md) | [Index](../systems/phalanxduel-game/containers/game-server/components/server-src-index.md) | Submits turns via REST/WebSocket with ACK replay |
| [Index](../systems/phalanxduel-game/containers/game-server/components/server-src-index.md) | [Index](../systems/phalanxduel-game/containers/game-engine/components/engine-src-index.md) | Advances authoritative match state |
