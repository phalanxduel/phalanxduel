---
type: C4 Component
title: Instrument
status: stable
groma:
  id: server-instrument
  parent: admin-portal
  code:
    - scanner: typescript
      file: admin/src/server/instrument.ts
---

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [admin/src/server/instrument.ts](../../../../../../admin/src/server/instrument.ts) | [otel-collector](../../../../../externals/otel-collector.md) | Exports admin telemetry | OTLP HTTP / gRPC |
