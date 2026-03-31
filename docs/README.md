---
title: "Documentation Wiki"
description: "Navigation index for all Phalanx Duel documentation. Start here to find any doc in the repo."
status: active
updated: "2026-03-14"
audience: agent
---

# Phalanx Duel — Documentation Wiki

`docs/` is the canonical home for active reference documentation. Decision
records, backlog workflow/process docs, active plans, and task execution
history belong in the Backlog surfaces (`backlog/decisions/`, `backlog/docs/`,
and task files) to avoid duplicate or stale documentation.

## System

Architecture, development process, and operational documentation for contributors and agents.

→ **[docs/system/](./system/README.md)**

| Doc | What it covers |
|---|---|
| [Architecture](./system/ARCHITECTURE.md) | Server-authoritative design, dependency boundaries, hashing model |
| [Versioning Policy](./system/VERSIONING.md) | SCHEMA_VERSION vs specVersion, breaking changes, replays |
| [Public Event Schemas](./api/EVENT_SCHEMAS.md) | JSON Schema contracts for external consumers |
| [Definition of Done](./system/DEFINITION_OF_DONE.md) | Completion bar and canonical source index |
| [Security Strategy](./system/SECURITY_STRATEGY.md) | Formal threat model, STRIDE analysis, and mitigations |
| [Security Resources](./system/SECURITY_RESOURCES.md) | Reference index for OWASP and industry security standards |
| [Operations Runbook](./system/OPERATIONS_RUNBOOK.md) | Canonical guide for triage, deployment, and response |
| [Performance SLOs](./system/PERFORMANCE_SLOS.md) | Latency, availability, and throughput targets |
| [Durable Audit Trail](./system/DURABLE_AUDIT_TRAIL.md) | Normalized transaction log and recovery architecture |
| [Schema Evolution](./system/SCHEMA_EVOLUTION_STRATEGY.md) | Policy for safe contract and database changes |
| [PNPM Scripts](./system/PNPM_SCRIPTS.md) | When to use which script (decision guidance) |
| [Feature Flags & Admin](./system/FEATURE_FLAGS.md) | Flags, experiment controls, admin auth, rollout |
| [Type Ownership](./system/TYPE_OWNERSHIP.md) | Where types live, cross-package rules, known hotspots |
| [Archival Policy](./system/ARCHIVAL_POLICY.md) | When and where to archive stale artifacts |
| [KNIP Report](./system/KNIP_REPORT.md) | Unused exports and types (auto-generated) |

## SEO

Route indexability decisions for `robots.txt` and `sitemap.xml`.

→ [docs/seo/ROBOTS_ROUTE_SITEMAP.md](./seo/ROBOTS_ROUTE_SITEMAP.md)

## Legal

Governance, licensing, and trademark policy.

→ [Governance](./legal/GOVERNANCE.md) · [Trademarks](./legal/TRADEMARKS.md)

## History

Retrospectives and project evolution notes. Historical context only — not authoritative for current behavior.

→ [docs/history/RETROSPECTIVES.md](./history/RETROSPECTIVES.md)

---

## Root-level Resources

| Resource | Purpose |
|---|---|
| [`AGENTS.md`](../AGENTS.md) | RTK shell rule + AI collaboration expectations (all agents) |
| [`.github/CONTRIBUTING.md`](../.github/CONTRIBUTING.md) | Contributor setup and validation workflow |
| [`backlog/docs/ai-agent-workflow.md`](../backlog/docs/ai-agent-workflow.md) | Task lifecycle, WIP limits, branching conventions |
| [`shared/src/schema.ts`](../shared/src/schema.ts) | Cross-package contracts — authoritative source of truth |
