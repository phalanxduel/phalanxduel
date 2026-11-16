---
type: C4 Component
title: Check migrations
status: stable
groma:
  id: db-check-migrations
  parent: game-server
  code:
    - scanner: typescript
      file: server/src/db/check-migrations.ts
      symbol: checkPendingMigrations
---
