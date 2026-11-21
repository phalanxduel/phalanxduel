---
type: C4 Component
title: Db
status: stable
groma:
  id: src-db
  parent: mcp-server
  code:
    - scanner: typescript
      file: mcp/src/db.ts
---

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [mcp/src/db.ts](../../../../../../mcp/src/db.ts) | [postgresql](../../../../../externals/postgresql.md) | Queries match history | Drizzle ORM / SQL |
