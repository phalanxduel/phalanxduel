---
type: C4 Component
title: Bot
status: stable
groma:
  id: autonomous-bot-src-bot
  parent: autonomous-bot
  code:
    - scanner: typescript
      file: agents/autonomous-bot/src/bot.ts
---

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [agents/autonomous-bot/src/bot.ts](../../../../../../agents/autonomous-bot/src/bot.ts) | [mcp/src/server.ts](../../../../../../mcp/src/server.ts) | Drives automated matches | MCP stdio / SSE |
