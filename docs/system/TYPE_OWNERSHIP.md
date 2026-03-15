---
title: "Type Ownership"
description: "Rules for where types live across packages. Cross-package shapes go in shared/; local shapes stay local. Enforces production/tooling firewall."
status: active
updated: "2026-03-14"
audience: agent
authoritative_source: "shared/src/schema.ts, shared/src/types.ts"
related:
  - docs/system/ARCHITECTURE.md
  - docs/system/dod/core-criteria.md
---

# Type Ownership

## Canonical Ownership

Cross-package and wire-contract data shapes are owned by `@phalanxduel/shared`. The source of truth is `shared/src/schema.ts`; `shared/src/types.ts` is the inferred TypeScript surface exported from that schema layer.

Package-local types are acceptable when they are limited to one package or one tooling workflow, for example:

- UI-only state and props in `client/src`
- engine-internal helper types in `engine/src`
- server-only operational types in `server/src`
- one-off CLI or CI shapes in `bin/` or `scripts/`

If a shape crosses package boundaries, do not redefine it locally. Promote it into `shared` or a shared helper module instead.

Tooling boundary:

- Runtime packages (`client/src`, `server/src`, `engine/src`, `shared/src`) should not import from `bin/`, `scripts/`, or test-only modules.
- Tooling-shared types are allowed, but they belong in tooling-only modules and must not leak into production runtime dependency paths.

## Known Duplication Hotspots

- `client/src/narration-bus.ts` defines a local `CardType` that overlaps in name with `shared/src/types.ts` `CardType`, but represents narration categories (`'ace' | 'face' | 'number'`) rather than the shared contract's card type. This is a naming collision and a source of conceptual drift.
- `bin/qa/simulate-headless.ts` and `scripts/ci/verify-playthrough-anomalies.ts` both define local QA artifact types such as `FailureReason`, `RunManifest`, and `RunEvent`.
- Those same files also both use the generic name `CliOptions`, but for different executable-specific configurations. That is a naming collision, not a shared-shape opportunity.
- `bin/qa/simulate-headless.ts` also defines a local `DamageMode`, overlapping in name with the shared contract type in `shared/src/types.ts`.

Execution plan: `backlog/docs/PLAN - 2026-03-11 - type-deduplication-plan.md`

## Guidance

- Import from `@phalanxduel/shared` when a shape crosses process, package, or wire boundaries.
- If two non-test files need the same local shape, extract it once instead of copying it.
- Keep a hard firewall between production runtime code and dev/test/tooling code. Sharing a type through a tooling module is fine for scripts, but production packages should not load Playwright, Vitest, Knip, dependency analysis helpers, or similar dev-only surfaces.
- Prefer narrower names for local helper types when a shared contract already owns the broader domain term.
- Run `pnpm docs:knip` after major schema or QA tooling changes to keep the dead-code inventory current (`docs/system/KNIP_REPORT.md`).
