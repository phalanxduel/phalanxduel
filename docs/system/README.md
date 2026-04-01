---
title: "System Documentation"
description: "Index for system architecture, development process, and operational docs. All technical documentation for contributors and agents."
status: active
updated: "2026-03-14"
audience: agent
related:
  - docs/README.md
---

# System Documentation

→ [← Documentation Wiki](../README.md)

## Architecture & Design

- [Architecture](./ARCHITECTURE.md) — server-authoritative principle, dependency direction, determinism and hashing model
- [Versioning Policy](./VERSIONING.md) — SCHEMA_VERSION vs specVersion, breaking change rules, and replay compatibility
- [Type Ownership](./TYPE_OWNERSHIP.md) — where types live, cross-package rules, production/tooling firewall, known hotspots

## Development Process

- [Developer Guide](./DEVELOPER_GUIDE.md) — setup, local scenarios, validation choices, QA, OTEL, Docker, FAQ
- [Definition of Done](./DEFINITION_OF_DONE.md) — completion bar, canonical source index
  - [Core Criteria](./dod/core-criteria.md) — the 7 criteria every change must satisfy
  - [Change Surfaces](./dod/change-surfaces.md) — additional done criteria by change type
  - [Completion Rules](./dod/completion-rules.md) — Husky expectations and "not done if" checklist
- [PNPM Scripts](./PNPM_SCRIPTS.md) — when to use `check:quick` vs `check:ci`, QA playthroughs, docs artifacts

## Security & Trust

- [Security Strategy](./SECURITY_STRATEGY.md) — formal threat model, STRIDE risk analysis, and implemented mitigations
- [Security Resources](./SECURITY_RESOURCES.md) — reference index for OWASP and industry security standards
- [Durable Audit Trail](./DURABLE_AUDIT_TRAIL.md) — normalized transaction ledger and point-in-time recovery architecture
- [Schema Evolution](./SCHEMA_EVOLUTION_STRATEGY.md) — policy for safe database migrations and contract stability

## Operations

- [Operations Runbook](./OPERATIONS_RUNBOOK.md) — canonical guide for triage, deployment, and response
- [Performance SLOs](./PERFORMANCE_SLOS.md) — formal latency, availability, and throughput targets
- [Feature Flags & Admin](./FEATURE_FLAGS.md) — active flags, admin auth, experiment assignment, rollout progression
- [Archival Policy](./ARCHIVAL_POLICY.md) — when and where to move stale plans, reports, and completed work

## Generated Artifacts

These files are auto-generated — do not edit manually.

- [KNIP Report](./KNIP_REPORT.md) — unused exports and types (`pnpm docs:knip` to refresh)
- `dependency-graph.svg` — package dependency graph (`pnpm docs:dependency-graph` to refresh)
- `site-flow-1.svg`, `site-flow-2.svg`, `gameplay-sequence-1.svg`, `persistence-sequence-1.svg`, `observability-sequence-1.svg`, and `domain-model-1.svg` — rendered Mermaid architecture/flow diagrams (`pnpm docs:site-flow` to refresh)
- `docs/api/` — compiled TypeDoc reference for exported APIs, type aliases, schemas, and package-level contracts (`pnpm docs:build` to refresh)
