---
type: C4 Component
title: Internal auth
status: stable
groma:
  id: internal-auth
  parent: game-server
  code:
    - scanner: typescript
      file: server/src/middleware/internal-auth.ts
      symbol: validateInternalToken
---
