---
type: C4 Component
title: Index
status: stable
groma:
  id: server-src-index
  parent: game-server
  code:
    - scanner: typescript
      file: server/src/index.ts
---

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [server/src/index.ts](../../../../../../server/src/index.ts) | [engine/src/index.ts](../../../../../../engine/src/index.ts) | Validates and advances match state | TypeScript |
| [server/src/index.ts](../../../../../../server/src/index.ts) | [shared/src/index.ts](../../../../../../shared/src/index.ts) | Serializes protocol and hashes | TypeScript |
