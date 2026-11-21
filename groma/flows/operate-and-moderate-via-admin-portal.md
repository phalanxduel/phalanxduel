---
type: Groma Flow
title: Operate and moderate via Admin Portal
groma:
  id: operate-and-moderate-via-admin-portal
---

An operator uses the dedicated Admin Portal to inspect match integrity, manage users, and control active matches over the internal network.

## Steps

| From | To | Action |
| --- | --- | --- |
| [Operator](../actors/operator.md) | [Main](../systems/phalanxduel-game/containers/admin-portal/components/client-main.md) | Signs in and inspects dashboards, users, and match integrity |
| [Main](../systems/phalanxduel-game/containers/admin-portal/components/client-main.md) | [Index](../systems/phalanxduel-game/containers/admin-portal/components/server-index.md) | Calls authenticated operator REST endpoints |
| [Matches](../systems/phalanxduel-game/containers/admin-portal/components/server-routes-matches.md) | [Index](../systems/phalanxduel-game/containers/game-server/components/server-src-index.md) | Sends internal match lifecycle commands |
| [Db](../systems/phalanxduel-game/containers/admin-portal/components/server-db.md) | [PostgreSQL](../externals/postgresql.md) | Queries matches, users, and retention tables |
