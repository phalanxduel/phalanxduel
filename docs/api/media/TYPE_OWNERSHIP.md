# Type Ownership

## Canonical Ownership

Cross-package and wire-contract data shapes are owned by `@phalanxduel/shared`.
The source of truth is `shared/src/schema.ts`; `shared/src/types.ts` is the
inferred TypeScript surface exported from that schema layer.

Package-local types are acceptable when they are limited to one package or one
tooling workflow, for example:
- UI-only state and props in `client/src`
- engine-internal helper types in `engine/src`
- server-only operational types in `server/src`
- one-off CLI or CI shapes in `bin/` or `scripts/`

If a shape crosses package boundaries, do not redefine it locally. Promote it
into `shared` or a shared helper module instead.

## Inventory Snapshot (2026-03-11)

This snapshot counts actual declaration sites in `.ts`, `.tsx`, `.mts`, `.cts`,
and `.d.ts` files. It includes `type`, `interface`, and `enum` definitions, and
excludes `import type` lines and `export type { ... }` re-exports.

- Total definitions: `103`
- `type` aliases: `60`
- `interface` declarations: `43`
- `enum` declarations: `0`

Breakdown by area:
- `shared/src`: `37`
- `client/src`: `21`
- `engine/src`: `7`
- `server/src`: `20`
- `client/tests` + `engine/tests`: `2`
- `bin`: `10`
- `scripts`: `6`

Interpretation:
- Most protocol-facing types are already centralized in `shared/src/types.ts`.
- The remaining spread is mostly package-local runtime code and QA tooling.
- The raw count alone does not prove broad redundancy; the concrete issue is a
  small set of overlapping names and duplicated tooling shapes.

## Known Duplication Hotspots

- `client/src/narration-bus.ts` defines a local `CardType` that overlaps in name
  with `shared/src/types.ts` `CardType`, but represents narration categories
  (`'ace' | 'face' | 'number'`) rather than the shared contract's card type.
  This is a naming collision and a source of conceptual drift.
- `bin/qa/simulate-headless.ts` and
  `scripts/ci/verify-playthrough-anomalies.ts` both define local QA artifact
  types such as `FailureReason`, `RunManifest`, and `RunEvent`.
- Those same files also both use the generic name `CliOptions`, but for
  different executable-specific configurations. That is a naming collision, not
  a shared-shape opportunity.
- `bin/qa/simulate-headless.ts` also defines a local `DamageMode`, overlapping
  in name with the shared contract type in `shared/src/types.ts`.

Execution plan:
- `backlog/docs/PLAN - 2026-03-11 - type-deduplication-plan.md`

## Guidance

- Import from `@phalanxduel/shared` when a shape crosses process, package, or
  wire boundaries.
- If two non-test files need the same local shape, extract it once instead of
  copying it.
- Prefer narrower names for local helper types when a shared contract already
  owns the broader domain term.
- Re-run this inventory after major schema or QA tooling changes so drift stays
  visible.
