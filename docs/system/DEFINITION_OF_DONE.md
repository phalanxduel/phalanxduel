---
title: "Definition of Done"
description: "Project completion bar for Phalanx Duel. A change is done when behavior, verification, docs, and operational story all align with the trust model."
status: active
updated: "2026-03-14"
audience: agent
related:
  - docs/system/dod/core-criteria.md
  - docs/system/dod/change-surfaces.md
  - docs/system/dod/completion-rules.md
---

# Definition of Done

A change is not done because code exists or Husky passed on staged files. A change is done only when behavior, verification, documentation, and operational story all align with the project's trust model.

## Canonical Sources

| Concern | Canonical source |
| --- | --- |
| Gameplay rules and invariants | [`docs/RULES.md`](../RULES.md) |
| Cross-package contracts and generated schemas | [`shared/src/schema.ts`](../../shared/src/schema.ts) |
| Runtime/package boundaries | [`docs/system/ARCHITECTURE.md`](./ARCHITECTURE.md) |
| Type ownership and package-local modeling | [`docs/system/TYPE_OWNERSHIP.md`](./TYPE_OWNERSHIP.md) |
| Flags, rollout controls, and admin behavior | [`docs/system/FEATURE_FLAGS.md`](./FEATURE_FLAGS.md) |
| Contributor workflow and verification commands | [`.github/CONTRIBUTING.md`](../../.github/CONTRIBUTING.md) |
| Security disclosure and vulnerability handling | [`.github/SECURITY.md`](../../.github/SECURITY.md) |

If a change introduces behavior not covered by a canonical source, the work is not done until the missing source is created or extended.

## Sections

- [Core Criteria](./dod/core-criteria.md) — the 7 criteria every change must satisfy (spec alignment, verification, trust/safety, code quality, observability, accessibility, AI-assisted work)
- [Change Surfaces](./dod/change-surfaces.md) — additional done criteria by change type (rules engine, schemas, server auth, client UX, docs/scripts)
- [Completion Rules](./dod/completion-rules.md) — Husky expectations and "not done if" checklist
