# Quality Gap Adoption Plan

## Executive Summary

The repository already has a strong quality spine: `verify:quick`, `verify:full`, `verify:ci`, and `verify:release`; dependency-cruiser boundary checks; ESLint ratchets; Vitest coverage; Playwright QA; AsyncAPI/OpenAPI artifacts; Zod-backed shared schemas; migration drift checks; and generated docs artifacts. The right next step is not a framework rewrite. It is an incremental adoption plan that layers enforcement and analysis around the existing architecture.

The main gaps are still real, but they are narrow and tractable:

- architecture boundary enforcement is present but incomplete
- domain purity is implied by conventions, not fully enforced
- property-based tests, mutation tests, runtime WebSocket contract validation, perf smoke gates, and hotspot prioritization are not yet wired into the verification spine
- DB/schema validation exists, but it is not yet framed as a broader persistence-quality gate

The adoption strategy should be advisory-first, then hard-fail only for low-noise rules. The first implementation slice should be a small planning/telemetry layer that surfaces the biggest risks without changing gameplay behavior or the existing verification contract.

## Current Baseline

What already exists and should be preserved:

- `package.json` already exposes `verify:quick`, `verify:full`, `verify:ci`, `verify:release`, `lint`, `lint:md`, `docs:check`, `qa:playthrough`, `qa:playthrough:verify`, `qa:playthrough:ui`, `qa:replay:verify`, `qa:fairness:verify`, and `qa:cluster:verify`
- `scripts/ci/verify.sh` already orchestrates the main quality pipeline and gates quick/full/ci/release differently
- dependency-cruiser already blocks the obvious client/server and engine/shared boundary violations
- ESLint already ratchets complexity and type-aware safety rules
- Vitest is already the unit-test backbone across `client/`, `server/`, `engine/`, and `shared/`
- Playwright already exists for headed browser validation via the playthrough runner
- `shared/src/schema.ts` is the canonical Zod contract source
- `docs/api/asyncapi.yaml` already documents the WebSocket protocol
- `server/src/app.ts` already validates inbound WebSocket messages at the transport boundary with Zod
- `server/src/db/migrations.ts` and `server/src/db/check-migrations.ts` already provide a SQL migration ledger with checksum drift detection
- `server/src/db/schema.ts` already contains the persistence model for matches, ratings, and match results
- generated docs artifacts already exist under `docs/system/`

## Gap Matrix

| Gap | Current State | Risk | Recommended Tooling | First Script | CI Mode | Priority |
|---|---|---|---|---|---|---|
| Architecture boundary enforcement | Partial dependency-cruiser coverage | Cross-package drift can creep in quietly | dependency-cruiser forbidden rules | `verify:boundaries` | Advisory first, then hard-fail | High |
| Property-based testing | No current fast-check adoption | Determinism and legal-state regressions can escape example-based tests | `fast-check` + Vitest | `verify:property` | CI after initial stabilization | High |
| Mutation testing | Not present | Coverage can look good while assertions stay weak | StrykerJS on high-value domain code | `verify:mutation` | Local-first, then narrow CI | Medium |
| Runtime WebSocket contract validation | Inbound WS validated; outbound contract mostly documented/tested | Shape drift between transport, docs, and runtime | Zod as source of truth + AsyncAPI + generated schemas | `verify:contracts` | CI for boundary drift | High |
| Performance regression gates | QA playthroughs exist, no perf smoke tripwire | Regressions in connect/reconnect/match lifecycle can slip in | k6 or Artillery | `verify:perf` | Advisory first, tiny CI smoke | Medium |
| Postgres/schema validation | Migration checksum and generated schema exist | Constraint drift and migration gaps can still surprise deploys | SQL migration checks, optional pgTAP later | `verify:db` | CI on schema-affecting changes | High |
| Domain purity enforcement | Enforced mostly by conventions and import rules | Engine/domain can accumulate IO, time, env, or randomness | dependency-cruiser + ESLint custom rules | `verify:purity` | Advisory first | High |
| Hotspot / complexity prioritization | ESLint and knip exist, but no prioritized hotspot report | Review focus is spread too thin | cheap churn/size/fan-in report | `quality:hotspots` | Informational only | Medium |

## Adoption Phases

### Phase 0 — Inventory Only

No behavior changes.

- produce a repo-wide quality inventory report that summarizes current enforcement, gaps, and candidate script names
- map the canonical sources of truth for engine, transport, schema, and persistence quality
- identify the smallest stable source for each gap before any hard gate is added

### Phase 1 — Advisory Gates

Add scripts that report problems but do not fail release.

- `verify:boundaries` should run dependency-cruiser with stricter rules and render a human-readable report
- `verify:contracts` should compare AsyncAPI, Zod schemas, and generated JSON artifacts
- `verify:db` should report migration/schema drift, missing constraints, and checksum mismatches
- `quality:hotspots` should rank files by churn, size, fan-in, and lint/test pressure

### Phase 2 — Hard Gates for Safe Rules

Turn on failure for deterministic, low-noise rules.

- hard-fail obvious architecture violations
- hard-fail contract drift that is fully deterministic
- hard-fail migration checksum drift and missing migration artifacts
- keep perf, mutation, and property suites advisory until their noise floor is understood

### Phase 3 — Domain Correctness Expansion

Add property tests, contract tests, and mutation tests.

- use `fast-check` for deterministic engine invariants
- use StrykerJS only against the highest-value pure domain packages first
- expand runtime contract tests to cover both inbound shape validation and outbound schema parity

### Phase 4 — Runtime / Performance / DB Validation

Add perf smoke tests and DB checks.

- add a tiny k6 or Artillery smoke test for health, socket connect/disconnect, basic match lifecycle, and reconnect behavior
- add DB validation for the critical schema constraints that support match integrity and ratings
- keep the load tests small enough that they trip regressions without becoming a benchmark suite

## Proposed Package Additions

| Package | Type | Why | Required Now? | Risk |
|---|---|---|---|---|
| `fast-check` | devDependency | Property-based tests for deterministic engine invariants | Yes, for Phase 3 | Low |
| `stryker` / `@stryker-mutator/*` | devDependency | Mutation testing for domain assertions | Later | Medium |
| `k6` or `artillery` | devDependency | Minimal performance smoke gates | Later | Medium |
| `pgTAP` | DB test tooling | Optional SQL-level constraint verification | Later | Medium |

## Proposed Script Additions

Suggested `package.json` additions:

```json
{
  "scripts": {
    "verify:boundaries": "bash scripts/ci/verify-boundaries.sh",
    "verify:contracts": "tsx scripts/ci/verify-contracts.ts",
    "verify:db": "bash scripts/ci/verify-db.sh",
    "verify:property": "vitest run --config vitest.property.config.ts",
    "verify:mutation": "stryker run",
    "verify:perf": "k6 run tests/load/smoke.js",
    "quality:hotspots": "tsx scripts/ci/quality-hotspots.ts"
  }
}
```

These names are placeholders for the plan. The first implementation slice should decide whether each script belongs in `scripts/ci/`, `scripts/docs/`, or `bin/qa/` based on existing conventions.

## Proposed CI Integration

### `verify:quick`

Keep it fast and deterministic. Do not add mutation or perf suites here. If any new script lands in `verify:quick`, it should be advisory-only and cheap.

### `verify:full`

This is the right place for:

- advisory boundary reports
- advisory contract reports
- property-based tests once the generators are stable
- DB drift checks

### `verify:ci`

This is the correct place for CI-safe regression gates:

- hard boundary violations
- hard contract drift
- focused property tests
- tiny perf smoke tests if they are stable enough

### `verify:release`

Reserve for release-critical gates only:

- schema drift
- contract drift
- DB verification
- a narrow perf smoke check if it proves stable

## Risk Register

- slow CI if property and perf suites are added too early
- flaky perf tests if thresholds are too tight or the environment is unstable
- over-strict architecture rules that block legitimate test or tooling imports
- schema duplication if Zod, AsyncAPI, and generated JSON drift apart
- property tests that mostly generate impossible states
- mutation tests that cost too much for too little signal
- false confidence from shallow transport validation that does not reach engine legality

## First Implementation Slice

The smallest safe first PR should do only this:

1. add `docs/quality/quality-gap-adoption-plan.md`
2. add a lightweight inventory artifact or helper that maps current scripts and enforcement points
3. add an index link from `docs/README.md`
4. do not install new packages yet
5. do not change `package.json` yet
6. do not rewrite `verify:*`

Acceptance criteria:

- the plan is grounded in the current repo structure
- the current quality baseline is preserved in writing
- each gap has a recommended tool and a first script name
- the plan clearly distinguishes advisory work from hard gates
- the plan identifies the first safe implementation slice

Definition of done:

- the document exists
- the docs index links to it
- it names the first incremental scripts and the CI phase they belong to
- it explicitly preserves the existing verification spine

## Backlog Tasks

1. Inventory current boundary rules and identify the minimal dependency-cruiser extensions.
2. Prototype property-based engine invariants with `fast-check`.
3. Add a narrow mutation-testing scope for the highest-value pure domain code.
4. Define a single source of truth for WS runtime validation across Zod, AsyncAPI, tests, and docs.
5. Add a perf smoke tripwire for socket and match lifecycle regressions.
6. Extend DB checks with a compact schema/constraint gate.
7. Add a cheap hotspot report and publish it as an informational artifact.

Each task should be independently implementable and should stop if it starts to pressure the architecture or verification spine.

## Stop Conditions

Do not proceed if any of the following become true:

- the new boundary rules produce noisy false positives
- the property generators spend most of their time creating impossible states
- the mutation suite is too slow for the repo’s normal inner loop
- the WebSocket schema source of truth is unclear
- the DB checks cannot run locally with the existing workflow
- the perf smoke test is unstable enough to hide real regressions

## Notes on Repo Alignment

The most likely implementation anchors are:

- `shared/src/schema.ts` for the canonical runtime contract
- `docs/api/asyncapi.yaml` for the external protocol shape
- `server/src/app.ts` for transport boundary validation
- `server/src/db/schema.ts` plus `server/src/db/migrations.ts` for persistence validation
- `scripts/ci/verify.sh` for verification orchestration
- `.dependency-cruiser.json` and `eslint.config.js` for boundary/purity enforcement

If an implementation slice needs deeper repo inspection, note the exact file path before changing behavior.
