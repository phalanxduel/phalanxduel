---
type: C4 Component
title: Engine
status: stable
groma:
  id: engine
  parent: mcp-server
  code:
    - scanner: typescript
      file: mcp/src/tools/engine.ts
      symbol: registerEngineTools
---

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [mcp/src/tools/engine.ts](../../../../../../mcp/src/tools/engine.ts) | [engine/src/index.ts](../../../../../../engine/src/index.ts) | Evaluates board states | TypeScript |
