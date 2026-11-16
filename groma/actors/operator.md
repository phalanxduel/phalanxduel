---
type: C4 Actor
title: Operator
description: Administers matches, users, deployments, and observability
status: stable
groma:
  id: operator
---

Site operator who monitors telemetry, moderates accounts, inspects match integrity, and manages releases.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [operator](operator.md) | [admin/src/client/main.tsx](../../admin/src/client/main.tsx) | Manages matches and users | HTTPS |
