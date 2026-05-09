# Quality Gap Adoption Plan

## Executive Summary

The repository already has a mature quality spine: structured `verify:*` scripts, dependency-cruiser boundary checks, ESLint ratchets with per-package thresholds, Vitest coverage gates across all five workspace packages, Playwright QA automation, Zod-backed canonical schemas, AsyncAPI WebSocket docs, Drizzle migration drift detection, OpenAPI generation, and generated documentation artifacts. The framework rewrite risk is zero — there is nothing structural to replace.

The genuine gaps are narrower than the original plan implied. Investigation confirmed that `fast-check` is already installed in engine devDeps, `property-fastcheck.test.ts` already exists, Stryker is already installed with an `engine/.stryker.json` config, `verify:property` and `verify:mutation` scripts already exist, and `verify:perf` already runs in-process MatchActor latency benchmarks. The work that remains is closing the enforcement and CI-integration gaps, not standing up missing systems from scratch.

The actual gaps after inspection:

- **dep-cruiser rule coverage is incomplete**: admin isolation, test-only-to-prod imports, and scripts-in-app-packages are not yet forbidden
- **domain purity relies on import-level rules only**: `Date.now`, `Math.random`, `setTimeout`, `setInterval`, `process.env`, and `globalThis.fetch` are global references — dep-cruiser and restricted-imports do not catch them; ESLint `no-restricted-globals`/`no-restricted-syntax` rules are missing
- **Stryker config has no score threshold**: `engine/.stryker.json` lacks a `thresholds` block; mutation testing cannot gate anything
- **`verify:property` and `verify:mutation` are not wired into CI**: neither appears in `scripts/ci/verify.sh` `ci` or `full` branches
- **WS contract check is heuristic only**: `scripts/ci/verify-contracts.ts` uses string matching in YAML; it does not parse the generated JSON schemas at `shared/schemas/*.schema.json` or validate them structurally
- **`verify:perf` is in-process only**: it measures `MatchActor` transition latency but does not cover HTTP health, WebSocket connect/disconnect, or any concurrency scenario; no k6/Artillery smoke test exists
- **DB constraint coverage is undocumented**: migration runner tests exist, but there is no checklist or script verifying which NOT NULL, UNIQUE, and FK constraints the live schema actually enforces
- **No hotspot script**: ESLint complexity rules and knip exist separately; there is no combined git-churn + file-size + fan-in scoring script

---

## Current Baseline

The following already exists and **must be preserved**:

| Layer | Where |
|---|---|
| `verify:quick`, `verify:full`, `verify:ci`, `verify:release` | `scripts/ci/verify.sh` |
| `verify:boundaries` | `scripts/ci/verify-boundaries.sh` — runs all dep-cruiser rules |
| `verify:contracts` | `scripts/ci/verify-contracts.ts` — heuristic WS contract check |
| `verify:mutation` | `pnpm --filter @phalanxduel/engine exec stryker run` |
| `verify:perf` | `tsx bin/qa/verify-perf.ts` — in-process p99 latency gate |
| `verify:property` | `pnpm --filter @phalanxduel/engine test tests/property-fastcheck.test.ts` |
| `verify:integration:api` | `scripts/ci/verify-integration-api.sh` |
| `qa:playthrough:verify`, `qa:replay:verify`, `qa:fairness:verify`, `qa:cluster:verify` | `scripts/ci/playthrough-verify.sh` and `bin/qa/*.ts` |
| dep-cruiser 7 rules | `.dependency-cruiser.json` — no-circular, engine-isolation, engine-purity, shared-isolation, no-client-in-server, no-server-in-client, no-direct-db-in-engine |
| ESLint ratchets | `eslint.config.js` — per-package complexity/depth/param caps, restricted-imports for engine |
| Vitest coverage thresholds | per-package `vitest.config.ts` — 60–80% lines/functions/branches by package |
| Canonical Zod schemas | `shared/src/schema.ts` |
| AsyncAPI docs | `docs/api/asyncapi.yaml` |
| Generated JSON schemas | `shared/schemas/client-messages.schema.json`, `shared/schemas/server-messages.schema.json` |
| Migration drift detection | `server/src/db/check-migrations.ts` |
| Drizzle schema | `server/src/db/schema.ts` |
| Stryker config | `engine/.stryker.json` (incremental, vitest runner) |
| fast-check | `engine/devDependencies`, `engine/tests/property-fastcheck.test.ts` |
| OpenTelemetry | server, client, admin — **not** engine or shared (by design) |

---

## Gap Matrix

| Gap | Current State | Risk | Recommended Tooling | First Script | CI Mode | Priority |
|---|---|---|---|---|---|---|
| dep-cruiser: admin, test-to-prod, scripts-in-app | Missing rules | Cross-package drift; test helpers leak into production bundles | dep-cruiser `forbidden` additions | `verify:boundaries` (extend existing) | Hard-fail after advisory | High |
| ESLint domain purity globals | Only import-level rules for engine | `Date.now`, `Math.random`, `process.env`, timers can silently enter engine code | ESLint `no-restricted-globals` + `no-restricted-syntax` in `engine/src` overrides | `verify:full` (lint) | Hard-fail | High |
| Stryker mutation score threshold | No `thresholds` in `engine/.stryker.json` | Mutation run produces report but never gates anything | Add `thresholds: { high: 80, low: 60, break: 50 }` to stryker config | `verify:mutation` (extend existing) | Local-first, then CI narrow | Medium |
| `verify:property` not in CI | Script exists, not in `verify.sh` | Determinism regressions can reach main | Wire into `verify:full` and `verify:ci` | Already named | Add to `verify.sh` | High |
| `verify:mutation` not in CI | Script exists, local-only | Weak assertion coverage can accumulate | Add to `verify:ci` once threshold is set | Already named | Add to `verify.sh` after threshold | Medium |
| WS contract check is heuristic | String-match in YAML only | Schema drift between Zod source, JSON artifacts, and AsyncAPI goes undetected | Parse `shared/schemas/*.schema.json` and diff against Zod-generated output | `verify:contracts` (strengthen existing) | Hard-fail in CI | High |
| `verify:perf` covers only in-process | MatchActor p99 only | HTTP/WS connection regressions, concurrency degradation invisible | k6 smoke test: health + WS connect/disconnect + match lifecycle | `verify:perf:ws` (new) | Advisory first, then CI smoke | Medium |
| DB constraint coverage undocumented | Migration runner test exists, no constraint inventory | Constraint drift after migration is silent | Constraint checklist doc + optional pgTAP smoke | `verify:db` (new) | Advisory first | Medium |
| Hotspot scoring script | ESLint + knip exist separately | Review focus is spread; highest-churn high-complexity files unranked | `git log --numstat` + file size + fan-in composite | `quality:hotspots` (new) | Informational only | Low |

---

## Adoption Phases

### Phase 0 — Confirm Inventory

**Status: Complete.** This document is the output.

Anchor files confirmed:
- `shared/src/schema.ts` — canonical runtime contract
- `engine/.stryker.json` — mutation config, needs threshold
- `engine/tests/property-fastcheck.test.ts` — property tests, needs CI wire
- `scripts/ci/verify-contracts.ts` — WS check, needs structural upgrade
- `bin/qa/verify-perf.ts` — in-process perf, needs WS companion
- `.dependency-cruiser.json` — 7 rules, needs admin + test-leak + scripts rules
- `eslint.config.js` — engine section needs `no-restricted-globals`

### Phase 1 — Advisory Gates (no behavior changes)

Add or strengthen scripts that **report** problems without blocking release:

1. **Extend `.dependency-cruiser.json`** — add advisory forbidden rules for:
   - `admin` must not import from `server/src` (only `shared/src` and `node_modules`)
   - `*.test.ts` and `*.spec.ts` files must not be imported by production source files
   - `scripts/` and `bin/` must not be imported by `engine/`, `server/`, `client/`, `shared/`, or `admin/` source
   - Run advisory: `depcruise --config .dependency-cruiser.advisory.json .`
   - Document any existing violations before enforcing

2. **Add ESLint `no-restricted-globals` to `engine/src`** — advisory warn first:
   - Block: `Date`, `Math.random`, `setTimeout`, `clearTimeout`, `setInterval`, `clearInterval`, `queueMicrotask`, `fetch`, `WebSocket`, `process`, `globalThis`
   - In `eslint.config.js` engine block, set as `warn` initially

3. **Add Stryker `thresholds` block** in `engine/.stryker.json`:
   ```json
   "thresholds": { "high": 80, "low": 60, "break": 50 }
   ```
   Run locally to confirm the current score before enforcement

4. **Wire `verify:property` into `verify:full`** in `scripts/ci/verify.sh`

5. **Document DB constraint inventory** in a new file `docs/quality/db-constraints.md`:
   - List every NOT NULL, UNIQUE, CHECK, and FK constraint in `server/src/db/schema.ts`
   - Flag any domain invariant (e.g., LP ≥ 0, match state enum, player index range) that has no DB constraint

6. **Strengthen `verify:contracts`** — replace heuristic YAML string match with:
   - `JSON.parse` of `shared/schemas/client-messages.schema.json` and `server-messages.schema.json`
   - Verify that the `type` discriminant values present in the JSON schemas match those extracted from `shared/src/schema.ts`
   - Check that `docs/api/asyncapi.yaml` references the same message names

### Phase 2 — Hard Gates for Low-Noise Rules

Convert Phase 1 advisory rules to failures for rules with low false-positive risk:

1. **Promote dep-cruiser advisory rules to errors** after a one-sprint quiet period:
   - `admin-isolation` (admin must not import server internals)
   - `no-test-imports-in-prod` (test-only files not importable by src)
   - `no-scripts-in-app` (scripts/bin not importable by workspace packages)
   - Merge into `.dependency-cruiser.json`; remove advisory config

2. **Promote ESLint engine globals to `error`** after advisory phase surfaces and fixes any violations

3. **Enable Stryker threshold in CI** — add `verify:mutation` to `verify:ci` after confirming score ≥ 60 locally

4. **Promote `verify:contracts` to hard-fail in CI** — once structural check is in place, wire into `verify:ci`

5. **Wire `verify:property` into `verify:ci`** — it is already stable by this point

### Phase 3 — Domain Correctness Expansion

Expand property tests and contract coverage:

1. **Additional property tests in `engine/tests/property-fastcheck.test.ts`**:
   - Serialization round-trip: `JSON.parse(JSON.stringify(state))` produces equivalent state under `applyAction`
   - No action sequence produces a negative LP unless game rules explicitly allow it in `damageMode: 'cumulative'`
   - `getValidActions` never returns an action that causes an exception in `applyAction`
   - Phase transitions are monotonically forward within a turn cycle (no phase regression)

2. **Extend `verify:contracts`** to cover outbound server messages:
   - Generate a sample `ServerMessage` for each discriminant type using Zod `.parse({})` with defaults
   - Validate each sample against its JSON schema entry
   - This surfaces schema mismatches before they reach clients

3. **Raise Stryker threshold** once the score baseline is stable:
   - `high: 85, low: 70, break: 60`

### Phase 4 — Runtime / Performance / DB Validation

1. **Add k6 WebSocket smoke test** at `tests/load/ws-smoke.js`:
   - Scenarios: health endpoint, WS connect/disconnect (10 VUs × 30s), single match lifecycle, reconnect after disconnect
   - Threshold: error rate < 1%, WS connect p95 < 200ms
   - Add `verify:perf:ws` script: `k6 run tests/load/ws-smoke.js`
   - Keep `verify:perf` (in-process p99) as-is for engine regression
   - Wire `verify:perf:ws` into `verify:release` only (not `verify:ci`)

2. **Add `verify:db` script** at `scripts/ci/verify-db.sh`:
   - Run `node -r tsx/esm server/src/db/check-migrations.ts` (already exists)
   - Optionally: query `information_schema.table_constraints` to verify expected constraints are present in the live schema
   - Wire into `verify:ci` after migration runs

3. **Add `quality:hotspots` script** at `scripts/docs/quality-hotspots.ts`:
   - Input: `git log --numstat --since="90 days ago"` + `find . -name '*.ts' -not -path '*/node_modules/*'` for size
   - Score = normalized(churn) × 0.4 + normalized(size) × 0.3 + normalized(fan-in from dep-cruiser JSON output) × 0.3
   - Output: `docs/quality/hotspots.md` — top 20 files with score and reason
   - Informational only; never blocks CI

---

## Proposed Package Additions

| Package | Type | Why | Required Now? | Risk |
|---|---|---|---|---|
| `k6` | Load test binary (not npm) | WS smoke test — Phase 4 | No, Phase 4 only | Low; local binary, not bundled |
| No other packages needed | — | All other tools already installed | — | — |

`fast-check` ✅ already in `engine/devDependencies`
`@stryker-mutator/core` ✅ already in `engine/devDependencies`
`@stryker-mutator/vitest-runner` ✅ already in `engine/devDependencies`

---

## Proposed Script Additions and Changes

### New scripts to add to root `package.json`

```json
{
  "scripts": {
    "verify:perf:ws":    "k6 run tests/load/ws-smoke.js",
    "verify:db":         "bash scripts/ci/verify-db.sh",
    "quality:hotspots":  "tsx scripts/docs/quality-hotspots.ts"
  }
}
```

### Existing scripts to modify

| Script | Change |
|---|---|
| `verify:property` | Already correct — add to `verify:full` call in `scripts/ci/verify.sh` |
| `verify:mutation` | Already correct — add to `verify:ci` call in `scripts/ci/verify.sh` after threshold set |
| `verify:contracts` | Replace heuristic body with structural JSON schema comparison |
| `verify:boundaries` | Extend dep-cruiser config to cover admin, test-to-prod, scripts-in-app |
| `lint:typed` (engine section) | Add `no-restricted-globals` for engine/src |

---

## Proposed CI Integration

### `verify:quick` (~10s)

No changes. Keep lint + typecheck only. Do not add any new scripts here.

### `verify:full` (~60s)

Add:
- `verify:property` (Phase 1, wire it in)
- `quality:hotspots` (Phase 4, informational artifact only)

### `verify:ci`

Add in phases:
- Phase 2: `verify:contracts` (structural, after strengthening)
- Phase 2: `verify:mutation` (after threshold confirmed)
- Phase 4: `verify:db`

### `verify:release`

Add in Phase 4:
- `verify:perf:ws` (WS smoke, after it proves stable locally)

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Dep-cruiser admin/test-leak rules have false positives in existing code | Medium | Run advisory first; document all violations before enforcing |
| ESLint `no-restricted-globals` fires in legitimate engine test helpers | Medium | Apply rule to `engine/src/**` only, not `engine/tests/**` |
| Stryker mutation score is below 60 on first run | High | Start threshold at `break: 40`, ratchet up; investigate score before committing |
| `verify:property` is slow and adds >30s to CI | Low | fast-check runs are bounded; existing file has sane iteration count — measure first |
| `verify:contracts` structural check has false positives from discriminant naming | Low | Parse and normalize discriminant values before comparison |
| k6 WS smoke test is flaky under CI environment constraints | High | Keep in `verify:release` only; never put it in `verify:ci` |
| DB constraint query depends on schema that changes during migration | Low | Run after `db:migrate` step in CI (already the order) |
| Hotspot script depends on `git log` which is slow in shallow CI clones | Medium | Add `--depth` guard; mark informational, not a gate |

---

## First Implementation Slice

The smallest safe first PR contains exactly these changes. No new packages. No rewritten scripts.

### Files to add or change

| File | Change |
|---|---|
| `engine/.stryker.json` | Add `"thresholds": { "high": 80, "low": 60, "break": 50 }` |
| `.dependency-cruiser.json` | Add 3 new forbidden rules: `admin-isolation`, `no-test-imports-in-prod`, `no-scripts-in-app` (as `warn` initially) |
| `eslint.config.js` | In the `engine/src/**/*.ts` config block, add `no-restricted-globals` rule as `warn` for: `Date`, `Math`, `setTimeout`, `clearTimeout`, `setInterval`, `clearInterval`, `fetch`, `WebSocket`, `process` |
| `scripts/ci/verify.sh` | In the `full` and `ci` branches, call `pnpm verify:property` |
| `scripts/ci/verify-contracts.ts` | Replace YAML string match with `JSON.parse` of `shared/schemas/*.schema.json` + discriminant comparison |
| `docs/quality/db-constraints.md` | New file: inventory of DB constraints from `server/src/db/schema.ts` |

### Scripts to run to validate the slice

```sh
pnpm verify:boundaries       # confirm no false positives from new dep-cruiser rules
pnpm lint:typed               # confirm no new engine globals violations (expect warns only)
pnpm verify:contracts         # confirm structural contract check passes on current schemas
pnpm verify:property          # confirm property tests still pass
```

### Acceptance criteria

- `verify:boundaries` passes with no new violations after the 3 new dep-cruiser rules
- `verify:contracts` structural check passes (no discriminant drift detected)
- `verify:property` passes in CI context (wired into `verify:full`)
- Stryker produces a score report when run locally; score is recorded in `docs/quality/db-constraints.md` or a comment
- ESLint warns (not errors) on any `Date.now` or `Math.random` found in engine source, if any; confirm none currently exist (engine is already pure)

### Definition of done

- All 6 files above are created or modified
- `pnpm verify:full` passes locally
- CI pipeline passes
- `docs/quality/db-constraints.md` documents the constraint inventory
- This plan document is linked from `docs/README.md` or `docs/quality/` index

---

## Backlog Tasks

Each task is independently implementable.

1. **Add Stryker mutation score threshold to `engine/.stryker.json`**
   - AC: `thresholds.break` set to ≥ 50; local run confirms score is above break
   - DoD: `verify:mutation` returns non-zero on a test-removed branch

2. **Wire `verify:property` into `verify:full` and `verify:ci` in `scripts/ci/verify.sh`**
   - AC: `pnpm check` (which calls `verify:full`) runs property tests
   - DoD: CI pipeline runs property tests and fails if they fail

3. **Add dep-cruiser rules: `admin-isolation`, `no-test-imports-in-prod`, `no-scripts-in-app`**
   - AC: Rules defined in `.dependency-cruiser.json` with `severity: warn`; no existing violations
   - DoD: `verify:boundaries` passes; escalate to `error` after one quiet sprint

4. **Add ESLint `no-restricted-globals` for engine purity (global API usage)**
   - AC: Rule blocks `Date`, `Math.random`, `setTimeout`, `setInterval`, `fetch`, `WebSocket`, `process` in `engine/src/**`
   - DoD: `pnpm lint:typed` warns (not errors) on violation; promote to error after advisory period

5. **Replace heuristic WS contract check with structural JSON schema comparison in `scripts/ci/verify-contracts.ts`**
   - AC: Script parses `shared/schemas/client-messages.schema.json` and `server-messages.schema.json`; discriminant values compared structurally against Zod schema
   - DoD: Introducing a drift (rename a Zod type) causes `verify:contracts` to fail

6. **Write `docs/quality/db-constraints.md` — constraint inventory for `server/src/db/schema.ts`**
   - AC: Every table's NOT NULL, UNIQUE, CHECK, and FK constraints listed; domain invariants noted where no constraint exists
   - DoD: Document reviewed and committed; linked from quality index

7. **Add `verify:db` script (`scripts/ci/verify-db.sh`)**
   - AC: Runs migration drift check; optionally queries `information_schema.table_constraints`; wire into `verify:ci`
   - DoD: CI fails if migration checksum drifts or expected constraints are absent

8. **Add k6 WS smoke test (`tests/load/ws-smoke.js`) and `verify:perf:ws` script**
   - AC: Covers health, WS connect/disconnect (10 VUs × 30s), single match lifecycle; threshold error rate < 1%
   - DoD: `verify:perf:ws` passes locally; added to `verify:release`; does not run in `verify:ci`

9. **Add `quality:hotspots` script (`scripts/docs/quality-hotspots.ts`)**
   - AC: Scores all `.ts` source files by git churn × 0.4 + size × 0.3 + fan-in × 0.3; outputs `docs/quality/hotspots.md`
   - DoD: Report generated and committed; `quality:hotspots` added to `docs:artifacts` pipeline

---

## Stop Conditions

Do not proceed with a phase if any of the following become true:

- New dep-cruiser rules produce more than 5 false positives in existing source that cannot be resolved in the same PR
- ESLint `no-restricted-globals` fires in a location that legitimately requires a global (re-evaluate the rule scope, not the code)
- Stryker mutation score is below 40 on the first local run — investigate before setting any threshold (the gap may indicate missing tests, not a tooling issue)
- `verify:property` runtime in CI exceeds 60 seconds — reduce fast-check `numRuns` before wiring into CI
- `verify:contracts` structural check cannot distinguish between a real drift and a naming convention difference — hold until a better discriminant extraction approach is found
- k6 WS smoke test fails more than 10% of the time in identical local conditions — do not add to CI until it is stable
- DB constraint query requires elevated Postgres privileges not available in the CI service definition
