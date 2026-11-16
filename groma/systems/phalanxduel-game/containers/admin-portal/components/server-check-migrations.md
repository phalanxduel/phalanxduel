---
type: C4 Component
title: Check migrations
status: stable
groma:
  id: server-check-migrations
  parent: admin-portal
  code:
    - scanner: typescript
      file: admin/src/server/check-migrations.ts
      symbol: checkPendingMigrations
---
