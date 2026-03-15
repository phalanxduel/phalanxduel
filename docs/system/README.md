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
- [Type Ownership](./TYPE_OWNERSHIP.md) — where types live, cross-package rules, production/tooling firewall, known hotspots

## Development Process

- [Definition of Done](./DEFINITION_OF_DONE.md) — completion bar, canonical source index
  - [Core Criteria](./dod/core-criteria.md) — the 7 criteria every change must satisfy
  - [Change Surfaces](./dod/change-surfaces.md) — additional done criteria by change type
  - [Completion Rules](./dod/completion-rules.md) — Husky expectations and "not done if" checklist
- [PNPM Scripts](./PNPM_SCRIPTS.md) — when to use `check:quick` vs `check:ci`, QA playthroughs, docs artifacts

## Operations

- [Feature Flags & Admin](./FEATURE_FLAGS.md) — active flags, admin auth, experiment assignment, rollout progression
- [Archival Policy](./ARCHIVAL_POLICY.md) — when and where to move stale plans, reports, and completed work

## Generated Artifacts

These files are auto-generated — do not edit manually.

- [KNIP Report](./KNIP_REPORT.md) — unused exports and types (`pnpm docs:knip` to refresh)
- `dependency-graph.svg` — package dependency graph (`pnpm docs:dependency-graph` to refresh)
