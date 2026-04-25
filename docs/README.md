---
title: "Documentation Wiki"
description: "Navigation index for all Phalanx Duel documentation. Start here to find any doc in the repo."
status: active
updated: "2026-03-31"
audience: agent
---

# Phalanx Duel — Documentation Wiki

`docs/` is the canonical home for active reference documentation. Decision
records, backlog workflow/process docs, active plans, and task execution
history belong in the Backlog surfaces (`docs/adr/`, `docs/archive/`,
and task files) to avoid duplicate or stale documentation.

## System

Architecture, development process, and operational documentation for contributors and agents.

→ **[docs/system/](./system/README.md)**

| Doc | What it covers |
|---|---|
| [Architecture](docs/architecture/principles.md) | Server-authoritative design, dependency boundaries, hashing model |
| [Site Flow Map](docs/architecture/site-flow.md) | Screen transitions, transport triggers, and live browser presentation notes |
| [Versioning Policy](docs/architecture/versioning.md) | SCHEMA_VERSION vs specVersion, breaking changes, replays |
| [Public Event Schemas](./api/EVENT_SCHEMAS.md) | JSON Schema contracts for external consumers |
| [Definition of Done](docs/reference/dod.md) | Completion bar and canonical source index |
| [Security Strategy](docs/architecture/security-strategy.md) | Formal threat model, STRIDE analysis, and mitigations |
| [Security Resources](docs/reference/security-resources.md) | Reference index for OWASP and industry security standards |
| [Operations Runbook](docs/ops/runbook.md) | Canonical guide for triage, deployment, and response |
| [Developer Guide](docs/tutorials/developer-guide.md) | Friendly HowTos, common scenarios, and FAQ for contributors |
| [Playthrough Scenario Runbook](docs/tutorials/playthrough-scenarios.md) | Commandsets for guest/auth, spectator, staging, production, and swarm QA runs |
| [Performance SLOs](docs/ops/slo.md) | Latency, availability, and throughput targets |
| [Durable Audit Trail](docs/architecture/audit-trail.md) | Normalized transaction log and recovery architecture |
| [Schema Evolution](docs/architecture/schema-evolution.md) | Policy for safe contract and database changes |
| [PNPM Scripts](docs/reference/pnpm-scripts.md) | When to use which script (decision guidance) |
| [Feature Flags & Admin](docs/architecture/feature-flags.md) | Flags, experiment controls, admin auth, rollout |
| [Type Ownership](docs/architecture/type-ownership.md) | Where types live, cross-package rules, known hotspots |
| [Archival Policy](docs/ops/archival-policy.md) | When and where to archive stale artifacts |
| [KNIP Report](./system/KNIP_REPORT.md) | Unused exports and types (auto-generated) |

## SEO

Route indexability decisions for `robots.txt` and `sitemap.xml`.

→ [docs/ops/seo.md](docs/ops/seo.md)

## Legal

Governance, licensing, and trademark policy.

→ [Governance](docs/reference/governance.md) · [Trademarks](docs/reference/trademarks.md)

## History

Retrospectives and project evolution notes. Historical context only — not authoritative for current behavior.

→ [docs/archive/retrospectives.md](docs/archive/retrospectives.md)

---

## Root-level Resources

| Resource | Purpose |
|---|---|
| [`AGENTS.md`](../AGENTS.md) | RTK shell rule + AI collaboration expectations (all agents) |
| [`.github/CONTRIBUTING.md`](../.github/CONTRIBUTING.md) | Contributor setup and validation workflow |
| [`CHANGELOG.md`](../CHANGELOG.md) | Pre-release milestones and notable repo changes |
| [`.github/SECURITY.md`](../.github/SECURITY.md) | Vulnerability reporting channel and supported-version policy |
| [`LICENSE`](../LICENSE) | Repository license terms |
| [`docs/tutorials/ai-agent-workflow.md`](../docs/tutorials/ai-agent-workflow.md) | Task lifecycle, WIP limits, branching conventions |
| [`shared/src/schema.ts`](../shared/src/schema.ts) | Cross-package contracts — authoritative source of truth |
