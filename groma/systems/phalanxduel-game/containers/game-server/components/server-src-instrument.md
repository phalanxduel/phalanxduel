---
type: C4 Component
title: Instrument
status: stable
groma:
  id: server-src-instrument
  parent: game-server
  code:
    - scanner: typescript
      file: server/src/instrument.ts
      symbol: emitOtlpLog
---

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [server/src/instrument.ts](../../../../../../server/src/instrument.ts) | [otel-collector](../../../../../externals/otel-collector.md) | Exports traces, metrics, and logs | OTLP HTTP |
