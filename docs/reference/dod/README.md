---
title: "Definition of Done"
description: "Project completion bar for Phalanx Duel. A change is done when behavior, verification, docs, and operational story all align with the trust model."
status: active
updated: "2026-05-08"
audience: agent
related:
  - docs/reference/dod/core-criteria.md
  - docs/reference/dod/change-surfaces.md
  - docs/reference/dod/completion-rules.md
---

# Definition of Done

A change is not done because code exists or Husky passed on staged files. A change is done only when behavior, verification, documentation, and operational story all align with the project's trust model.

## Canonical Sources

| Concern | Canonical source |
| --- | --- |
| Gameplay rules and invariants | [`docs/gameplay/rules.md`](../../gameplay/rules.md) |
| Rule change governance | [`docs/reference/governance.md`](../governance.md) |
| Cross-package contracts and generated schemas | [`shared/src/schema.ts`](../../../shared/src/schema.ts) |
| Runtime/package boundaries | [`docs/architecture/principles.md`](../../architecture/principles.md) |
| Type ownership and package-local modeling | [`docs/architecture/type-ownership.md`](../../architecture/type-ownership.md) |
| Flags, rollout controls, and admin behavior | [`docs/architecture/feature-flags.md`](../../architecture/feature-flags.md) |
| Contributor workflow and verification commands | [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) |
| Gameplay Truth Gates (Replay, Anomaly, Coverage) | [`docs/reference/test-constitution.md`](../test-constitution.md) |
| Security disclosure and vulnerability handling | [`SECURITY.md`](../../../SECURITY.md) |

If a change introduces behavior not covered by a canonical source, the work is not done until the missing source is created or extended.

## Sections

- [Core Criteria](./core-criteria.md) — the 7 criteria every change must satisfy.
- [Change Surfaces](./change-surfaces.md) — additional done criteria by change type.
- [Completion Rules](./completion-rules.md) — final checklist and "not done if" rules.
