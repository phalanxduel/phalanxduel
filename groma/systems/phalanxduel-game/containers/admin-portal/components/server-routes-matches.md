---
type: C4 Component
title: Matches
status: stable
groma:
  id: server-routes-matches
  parent: admin-portal
  code:
    - scanner: typescript
      file: admin/src/server/routes/matches.ts
      symbol: registerMatchRoutes
---

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [admin/src/server/routes/matches.ts](../../../../../../admin/src/server/routes/matches.ts) | [server/src/index.ts](../../../../../../server/src/index.ts) | Controls active matches | Internal HTTP |
