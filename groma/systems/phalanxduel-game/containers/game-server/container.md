---
type: C4 Container
title: Game Server
status: stable
groma:
  id: game-server
  parent: phalanxduel-game
  technology: TypeScript / Fastify / WebSocket
description: Authoritative HTTP and WebSocket match server
---

Hosts REST matchmaking and action endpoints, WebSocket match actors, authentication, ELO ladder, and Postgres persistence.
