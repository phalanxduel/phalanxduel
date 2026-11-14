---
type: C4 Component
title: Migrate
status: stable
groma:
  id: migrate
  parent: db-migrate
  code:
    - scanner: typescript
      file: server/src/db/migrate.ts
      symbol: runMigrations
---
