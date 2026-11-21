---
type: C4 Actor
title: Player
description: Plays Phalanx Duel matches via web, CLI, or AI client
status: stable
groma:
  id: player
---

Human or agentic player who authenticates, joins matchmaking, deploys units, and executes tactical turns.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [player](player.md) | [client/src/index.ts](../../client/src/index.ts) | Plays matches in browser | HTTPS / WebSocket |
| [player](player.md) | [clients/go/duel-cli/internal/phalanxapi/client.go](../../clients/go/duel-cli/internal/phalanxapi/client.go) | Plays matches in terminal | CLI / WebSocket |
| [player](player.md) | [mcp/src/server.ts](../../mcp/src/server.ts) | Plays and analyzes via AI | Model Context Protocol |
