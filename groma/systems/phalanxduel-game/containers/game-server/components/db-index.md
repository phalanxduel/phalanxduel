---
type: C4 Component
title: Index
status: stable
groma:
  id: db-index
  parent: game-server
  code:
    - scanner: typescript
      file: server/src/db/index.ts
---

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [server/src/db/index.ts](../../../../../../server/src/db/index.ts) | [postgresql](../../../../../externals/postgresql.md) | Reads and persists match state | Drizzle ORM / SQL |
