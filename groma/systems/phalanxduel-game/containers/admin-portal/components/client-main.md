---
type: C4 Component
title: Main
status: stable
groma:
  id: client-main
  parent: admin-portal
  code:
    - scanner: typescript
      file: admin/src/client/main.tsx
---

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [admin/src/client/main.tsx](../../../../../../admin/src/client/main.tsx) | [admin/src/server/index.ts](../../../../../../admin/src/server/index.ts) | Calls operator API endpoints | HTTPS / REST |
