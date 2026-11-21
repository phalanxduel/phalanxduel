---
type: C4 Component
title: Db
status: stable
groma:
  id: server-db
  parent: admin-portal
  code:
    - scanner: typescript
      file: admin/src/server/db.ts
---

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [admin/src/server/db.ts](../../../../../../admin/src/server/db.ts) | [postgresql](../../../../../externals/postgresql.md) | Queries match and user records | Drizzle ORM / SQL |
