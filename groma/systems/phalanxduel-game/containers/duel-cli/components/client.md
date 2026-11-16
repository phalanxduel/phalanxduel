---
type: C4 Component
title: Client
status: stable
groma:
  id: client
  parent: duel-cli
  code:
    - scanner: go
      file: clients/go/duel-cli/internal/phalanxapi/client.go
---

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [clients/go/duel-cli/internal/phalanxapi/client.go](../../../../../../clients/go/duel-cli/internal/phalanxapi/client.go) | [server/src/index.ts](../../../../../../server/src/index.ts) | Submits turns and joins matches | REST / WebSocket |
