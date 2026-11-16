---
type: C4 Component
title: Index
status: stable
groma:
  id: client-src-index
  parent: web-client
  code:
    - scanner: typescript
      file: client/src/index.ts
---

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [client/src/index.ts](../../../../../../client/src/index.ts) | [server/src/index.ts](../../../../../../server/src/index.ts) | Sends actions and receives state | WebSocket / REST |
