# Quality System Reference

**TL;DR — three commands:**

```sh
pnpm quality:status        # read-only dashboard: what's configured, what's passing
pnpm check                 # full local verification pass (~60s)
pnpm verify:ci             # reproduces what CI runs on every PR
```

---

## What this directory contains

| File | Purpose |
|---|---|
| `README.md` | This file — map of the quality system |
| `quality-gap-adoption-plan.md` | Phased adoption plan for each quality layer |
| `db-constraints.md` | Constraint inventory for all Drizzle tables |
| `hotspots.md` | Generated: git-churn + size + fan-in risk scores (run `pnpm quality:hotspots`) |
| `high-signal-surfaces.md` | Curated list of high-value measurement surfaces |

---

## Verification spine

All quality gates flow through four named modes in `scripts/ci/verify.sh`:

| Script | When to use | What it runs |
|---|---|---|
| `pnpm verify:quick` | During coding (~10s) | lint + typecheck + build |
| `pnpm check` → `verify:full` | Before pushing (~60s) | everything below + QA simulations |
| `pnpm verify:ci` | Reproduces CI | coverage + boundaries + contracts + property + perf + QA replay |
| `pnpm verify:release` | Pre-release | + fairness + integration:api + perf:ws |

**Inner loop shortcut:** for `client/src/` or CSS-only changes use `pnpm verify:quick`. Use `pnpm check` when `engine/`, `server/src/`, or `shared/` files change.

---

## Quality layers

### Coverage

| Package | Tool | Thresholds | Report location |
|---|---|---|---|
| `engine` | Vitest v8 | lines/fn/stmt 80%, branch 79% | `engine/coverage/` |
| `server` | Vitest v8 | lines/fn/stmt 60%, branch 50% | `server/coverage/` |
| `shared` | Vitest v8 | lines/fn/stmt/branch 80% | `shared/coverage/` |
| `client` | Vitest v8 | stmt/lines 58% | `client/coverage/` |
| `admin` | Vitest v8 | none configured | `admin/coverage/` |

```sh
pnpm test:coverage:run     # generate all coverage reports
pnpm test:coverage:report  # verify thresholds
```

Coverage is checked in `verify:ci`. Server excludes instrumentation files (`instrument.ts`, `metrics.ts`, `tracing.ts`).

---

### Architecture boundaries

**Tool:** dependency-cruiser (`.dependency-cruiser.json`)

| Rule | Severity | What it enforces |
|---|---|---|
| `no-circular` | error | no circular imports anywhere |
| `engine-isolation` | error | engine only imports from engine/src, shared, or node_modules |
| `engine-purity` | error | engine cannot import IO node modules (fs, http, net, etc.) |
| `shared-isolation` | error | shared has no workspace dependencies |
| `no-client-in-server` | error | server never imports client |
| `no-server-in-client` | error | client never imports server |
| `no-direct-db-in-engine` | error | engine cannot import drizzle-orm or postgres |
| `admin-isolation` | **warn** | admin must not import server internals |
| `no-test-imports-in-prod` | **warn** | production source cannot import test files |
| `no-scripts-in-app` | **warn** | workspace source cannot import scripts/ or bin/ |

```sh
pnpm verify:boundaries     # run dep-cruiser against all rules
pnpm docs:dependency-graph # regenerate docs/system/dependency-graph.svg
```

The three `warn` rules are advisory — they will be promoted to `error` once confirmed noise-free over one sprint.

---

### Domain purity (engine)

**Tool:** ESLint `no-restricted-globals` + `no-restricted-syntax` applied to `engine/src/**`

Blocked globals in `engine/src`: `Date`, `setTimeout`, `clearTimeout`, `setInterval`, `clearInterval`, `queueMicrotask`, `fetch`, `WebSocket`, `process`, `performance`.

Blocked syntax: `Math.random()` (use injected RNG via `GameConfig.rngSeed`).

Currently advisory (`warn`). One known issue: `engine/src/state.ts:147` uses `process.env.NODE_ENV` to suppress a console log in tests — this should be removed in a future cleanup.

```sh
pnpm lint:typed            # full type-aware lint including engine purity rules
```

---

### Mutation testing

**Tool:** StrykerJS (`engine/stryker.config.json`)

- Scope: `engine/src/**/*.ts` (excludes `index.ts` and `.d.ts`)
- Runner: Vitest
- Thresholds: `break: 50`, `low: 60`, `high: 80`
- Mode: incremental (`.stryker-incremental.json` caches results)
- Wired into: `verify:full` (local runs only — not yet in `verify:ci`)

```sh
pnpm verify:mutation       # run mutation tests (slow, ~5-15 min first run)
```

**Promoting to CI:** run locally, confirm score ≥ 60, then add `pnpm verify:mutation` to the `ci` block in `scripts/ci/verify.sh`.

---

### Property-based testing

**Tool:** fast-check + Vitest (`engine/tests/property-fastcheck.test.ts`)

Invariants checked on every run:
- Initial state always satisfies phase, player index, and card count invariants
- Any sequence of valid actions preserves total card count (52 per player), legal HP range, and non-negative lifepoints

```sh
pnpm verify:property       # run property tests in isolation
```

Wired into both `verify:full` and `verify:ci`.

To add a new property: append an `it('...', () => fc.assert(...))` call to `engine/tests/property-fastcheck.test.ts`. See [fast-check docs](https://fast-check.dev) for arbitrary generators.

---

### WebSocket contract validation

**Source of truth:** `shared/src/schema.ts` (Zod) → generates `shared/schemas/*.schema.json`

| Layer | Check | Mode |
|---|---|---|
| JSON schema structure | `verify:contracts` validates `oneOf` entries have `properties.type.const` | hard fail |
| AsyncAPI coverage | warns when a type is absent from `docs/api/asyncapi.yaml` | advisory |
| Schema freshness | `schema:check` re-runs `schema:gen` and diffs | hard fail in CI |

```sh
pnpm verify:contracts      # structural contract check
pnpm schema:check          # freshness check (JSON schema matches Zod source)
pnpm schema:gen            # regenerate shared/schemas/ and shared/src/types.ts
```

**Known gap:** 6 types (`joinQueue`, `leaveQueue`, `queueJoined`, `queueLeft`, `queueMatchFound`, `forceReload`) exist in the JSON schemas but are not yet documented in `docs/api/asyncapi.yaml`. Advisory warning only.

---

### Performance gates

| Script | What it measures | Threshold | Wired into |
|---|---|---|---|
| `verify:perf` | in-process MatchActor p99 transition latency | p99 < 10ms | `verify:full`, `verify:ci` |
| `verify:perf:ws` | k6 WS connect/disconnect (10 VUs × 30s) | error rate < 1%, p95 connect < 200ms | `verify:release` only |

```sh
pnpm verify:perf           # in-process benchmark (no server required)
pnpm verify:perf:ws        # k6 WS smoke (requires server running + k6 installed)
```

`verify:perf:ws` requires [k6](https://k6.io/docs/get-started/installation/) (`brew install k6`) and a running server (`pnpm dev`). Set `BASE_URL` env var if not using localhost:3001.

---

### Database / schema validation

**Tool:** Drizzle ORM + `server/src/db/check-migrations.ts`

```sh
pnpm --filter @phalanxduel/server db:migrate    # apply migrations
pnpm schema:check                               # verify generated artifacts are current
```

- `server/migrations/0000_baseline.sql` — baseline SQL migration
- `server/src/db/schema.ts` — Drizzle schema definition (source of truth)
- `server/src/db/check-migrations.ts` — checksum drift detection

See `docs/quality/db-constraints.md` for a full constraint inventory and gap analysis.

**pgTAP:** not adopted. The migration checksum approach plus Drizzle ORM provides sufficient coverage for the current scale.

---

### Hotspot prioritization

**Tool:** `scripts/docs/quality-hotspots.ts`

Scores source files by: git churn (40%) + line count (30%) + dep-cruiser fan-in (30%). Outputs `docs/quality/hotspots.md`. Informational only — never gates CI.

```sh
pnpm quality:hotspots      # generate docs/quality/hotspots.md (requires git history)
pnpm quality:hotspots --days 30 --top 10   # last 30 days, top 10 files
```

---

### Knip (unused exports/dependencies)

**Tool:** knip (`knip.json`)

```sh
pnpm docs:knip             # generate docs/system/KNIP_REPORT.md
```

Checked as part of `docs:artifacts` and `verify:ci`. Violations are surfaced in the knip report. `ignoreBinaries` includes external tools (k6, psql, flyctl, etc.).

---

### Markdown / formatting

```sh
pnpm lint:md               # markdownlint-cli2 on all *.md files
prettier --check .         # formatting check
prettier --write .         # auto-fix formatting
```

Both run in `verify:full` and `verify:ci`.

---

### Secrets / security

```sh
pnpm lint:tools            # shellcheck on shell scripts + secretlint
```

---

## Quick decision guide

| Situation | Command |
|---|---|
| "Is everything passing right now?" | `pnpm quality:status` |
| "What's my coverage?" | `pnpm quality:status` (reads last report) or `pnpm test:coverage:run` |
| "Did I break any architecture rules?" | `pnpm verify:boundaries` |
| "Are my schema changes reflected in generated files?" | `pnpm schema:check` |
| "Which files are highest risk for this PR?" | `pnpm quality:hotspots` |
| "Does this match what CI will run?" | `pnpm verify:ci` |
| "Full local pass before merging" | `pnpm check` |

---

## Adding a new quality gate

1. Write the script (in `scripts/ci/`, `scripts/docs/`, or `bin/qa/`)
2. Add a `package.json` script following the `verify:*` or `quality:*` naming convention
3. Run it manually to confirm it passes on a clean tree
4. Add it to the appropriate phase in `scripts/ci/verify.sh` — advisory (`full` only) first, then promote to `ci` after one sprint of quiet runs
5. Update this document and `quality-gap-adoption-plan.md`
