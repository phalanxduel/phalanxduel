---
type: C4 Component
title: Server
status: stable
groma:
  id: server
  parent: mcp-server
  code:
    - scanner: typescript
      file: mcp/src/server.ts
---

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [mcp/src/server.ts](../../../../../../mcp/src/server.ts) | [server/src/index.ts](../../../../../../server/src/index.ts) | Executes agentic match tools | REST / WebSocket |
