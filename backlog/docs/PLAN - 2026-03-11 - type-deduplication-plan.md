# 2026-03-11 Type De-duplication Plan

## Objective

Remove the current type-definition hotspots that create drift, duplicated
artifact shapes, and ambiguous vocabulary, without pushing package-local
concerns into `@phalanxduel/shared` unnecessarily.

## Scope

In scope:
- narration-only type and field renames in `client/src`
- canonicalizing shared playthrough artifact types used by the QA runner and CI
  verifier
- adopting shared `DamageMode` where the semantics already match exactly
- lightweight guardrails so the same collisions do not reappear

Out of scope:
- moving every local type into `@phalanxduel/shared`
- changing the public game protocol or `shared/src/schema.ts`
- redesigning the playthrough artifact JSON format

## Additional Observation: Production vs Tooling Firewall

The dependency and package review adds an important constraint to this work:

- production runtime code should not depend on dev/test/tooling modules
- tooling-shared types are acceptable, but only inside tooling-only execution
  paths
- package manifests should reflect that boundary, not just source imports

Current repo observations:
- no direct runtime imports from `bin/`, `scripts/`, or test-framework modules
  were found in `client/src`, `server/src`, `engine/src`, or `shared/src`
- the main boundary risk is package-surface leakage rather than source-level
  imports
- `server/package.json` currently lists `tsx` in `dependencies`, even though the
  observed call sites are dev/task-oriented (`dev`, `task:sentry-test`,
  `db:migrate`)
- `server/src/loadEnv.ts` uses Node built-ins (`parseEnv`) rather than `dotenv`,
  so `dotenv` should be re-validated before remaining on the production
  dependency surface

Implication for this plan:
- extract shared playthrough artifact types into tooling-only modules under
  `scripts/` or a similar root tooling area
- do not move tooling contracts into `@phalanxduel/shared` unless they are
  genuine runtime/wire contracts
- add a follow-up audit to remove dev/test tools from production dependency
  lists where they are not required at runtime

## Current Hotspots

### 1. Narration `CardType` collides with shared `CardType`

`client/src/narration-bus.ts` defines:

```ts
type CardType = 'ace' | 'face' | 'number';
```

That is not the same concept as the shared contract's `CardType`, which is the
card taxonomy from `shared/src/schema.ts`:

```ts
z.enum(['number', 'ace', 'jack', 'queen', 'king', 'joker'])
```

This is a naming collision, not just a duplicate declaration. The local name
suggests parity with the shared contract when the semantics are intentionally
different.

### 2. Playthrough artifact types are duplicated across producer and consumer

`bin/qa/simulate-headless.ts` produces `manifest.json` and `events.ndjson`.
`scripts/ci/verify-playthrough-anomalies.ts` consumes those same files, but
redefines `FailureReason`, `RunManifest`, and `RunEvent` locally instead of
importing a shared artifact type module.

That duplication creates silent drift risk whenever the runner adds or renames a
field.

### 3. `CliOptions` is a generic name reused for different concerns

The runner and the anomaly verifier both define `CliOptions`, but those shapes
do not represent the same thing. This is not a DRY opportunity; it is a naming
problem. Keeping the same generic name hides the ownership boundary between:

- playthrough execution options
- anomaly-check configuration

### 4. `simulate-headless.ts` locally redefines shared `DamageMode`

The runner declares `'classic' | 'cumulative'` locally even though
`@phalanxduel/shared` already owns `DamageMode` with the same values and
meaning.

This is true duplication and should be eliminated.

## Design Direction

- `@phalanxduel/shared` owns game-domain and cross-package contract types.
- Root-level tooling modules own QA artifact formats that are shared by multiple
  scripts but are not part of the runtime game protocol.
- Executable-local configuration types remain local, but use specific names that
  encode ownership and purpose.
- Presentation-only client classifications must use presentation-specific names,
  not contract-domain names.

## Execution Plan

### Phase 1. Canonicalize the playthrough artifact contract

Create a neutral root-level module, for example:

- `scripts/lib/playthrough-artifacts.ts`

Move these types into that module and export them with explicit names:

- `PlaythroughFailureReason`
- `PlaythroughRunEvent`
- `PlaythroughRunManifest`

Implementation notes:
- `PlaythroughRunManifest` should become the canonical full artifact shape.
- `scripts/ci/verify-playthrough-anomalies.ts` should import the full manifest
  type rather than maintaining a local subset copy.
- `PlaythroughRunEvent` should include the optional `actor` field so the
  verifier stays aligned with the producer even if it does not currently use
  that field.
- Keep the serialized `manifest.json` and `events.ndjson` format unchanged in
  this phase.

Acceptance:
- the runner and verifier import the same artifact types
- no local `RunManifest`, `RunEvent`, or `FailureReason` declarations remain in
  those two files
- existing playthrough artifacts remain readable without migration

### Phase 2. Use shared `DamageMode` instead of redefining it

Update `bin/qa/simulate-headless.ts` to import `type DamageMode` from
`@phalanxduel/shared` rather than declaring a local union.

Implementation notes:
- if `scripts/lib/playthrough-artifacts.ts` needs `DamageMode`, import it there
  so the manifest contract stays aligned with the game-domain contract
- search for any additional local `'classic' | 'cumulative'` aliases and remove
  them when they represent the same shared concept

Acceptance:
- no local `DamageMode` declaration remains in `bin/qa/simulate-headless.ts`
- playthrough option parsing and manifest writing continue to use the shared
  domain values

### Phase 3. Rename narration-specific card classification types

Rename the narration-only type in `client/src/narration-bus.ts`:

- `CardType` -> `NarrationRankClass`

Rename the associated event field everywhere narration events flow:

- `cardType` -> `rankClass`

Expected touch points:
- `client/src/narration-bus.ts`
- `client/src/narration-producer.ts`
- `client/src/narration-overlay.ts`
- `client/src/narration-ticker.ts`
- `client/tests/narration-bus.test.ts`
- related narration tests and helpers

Implementation notes:
- rename helper return values as well, for example `classifyCardId()` returning
  `{ suit, rankClass }`
- keep this mapping client-local; it is a presentation classification, not a
  protocol contract
- do not change `@phalanxduel/shared` in this phase

Acceptance:
- no local `CardType` definition remains outside `shared/src`
- narration code reads as presentation-specific rather than protocol-specific
- client narration tests continue to pass after the field rename

### Phase 4. Rename executable-local option types for clarity

Do not centralize the two `CliOptions` types. Rename them to reflect ownership:

- `bin/qa/simulate-headless.ts`: `PlaythroughRunnerOptions`
- `scripts/ci/verify-playthrough-anomalies.ts`: `PlaythroughAnomalyCheckOptions`

Rationale:
- the shapes are different
- the responsibilities are different
- sharing the name currently suggests a false common abstraction

Acceptance:
- the generic `CliOptions` name is removed from both files
- option types read as executable-specific configuration, not shared schema

### Phase 5. Add a narrow guardrail against recurrence

Add a lightweight CI check, for example `scripts/ci/verify-type-ownership.ts`,
with a deliberately narrow first scope:

- fail if non-`shared` runtime code defines `CardType` or `DamageMode`
- optionally allow a small explicit allowlist if a valid exception appears later

This should be narrow on purpose. The goal is to stop the already-observed
collisions from reappearing, not to build a noisy generic type-linter.

Acceptance:
- the repo has an automated check for the high-risk shared-name collisions
- the check is wired into an existing local/CI verification path

## Sequential Workplan

Execute in this order. Do not combine Steps 2 and 3 in the same PR unless the
repo is already quiet and the reviewer explicitly wants one larger change.

### Step 0. Tighten the production/tooling firewall

Audit package-level dependency surfaces before deeper refactors.

Immediate checks:
- confirm whether `server` truly needs `tsx` in `dependencies` or whether it can
  move to `devDependencies`
- confirm whether `server` still needs `dotenv` at runtime, given
  `server/src/loadEnv.ts` uses Node built-ins
- verify that no runtime package imports from `bin/`, `scripts/`, or test-only
  helpers

Why first:
- it is a quick win with a high architectural payoff
- it reduces the chance that shared tooling types accidentally become runtime
  dependencies
- it enforces the production/dev-test separation before new shared tooling
  modules are introduced

Definition of done:
- production package manifests no longer carry clearly dev/test-only tools
  without justification
- the repo has a documented rule that tooling modules stay outside production
  dependency paths

### Step 1. Establish the tooling contract boundary

Create `scripts/lib/playthrough-artifacts.ts` and move the artifact-level shared
types there:

- `PlaythroughFailureReason`
- `PlaythroughRunEvent`
- `PlaythroughRunManifest`

Why first:
- it removes the highest-confidence duplication
- it gives both the producer and consumer one canonical import target
- it avoids mixing tooling refactors with client runtime renames

Definition of done:
- both `bin/qa/simulate-headless.ts` and
  `scripts/ci/verify-playthrough-anomalies.ts` import artifact types from the
  new module
- local copies of `FailureReason`, `RunEvent`, and `RunManifest` are deleted

### Step 2. Align tooling with shared game-domain types

Replace the runner-local `DamageMode` alias with `type DamageMode` imported from
`@phalanxduel/shared`.

Why second:
- it is a true de-duplication with minimal behavioral risk
- it keeps the artifact module aligned with the domain contract before any other
  renames happen

Definition of done:
- no local `DamageMode` remains in `bin/qa/simulate-headless.ts`
- any extracted artifact type that references `DamageMode` uses the shared type

### Step 3. Rename executable-local option types

Rename the two unrelated `CliOptions` declarations:

- `PlaythroughRunnerOptions`
- `PlaythroughAnomalyCheckOptions`

Why third:
- it removes a misleading generic name
- it clarifies ownership before the larger client-side narration rename

Definition of done:
- `CliOptions` no longer appears in those files
- function signatures and defaults use the new names consistently

### Step 4. Rename narration-only card classification vocabulary

Rename the local narration classification:

- `CardType` -> `NarrationRankClass`
- `cardType` -> `rankClass`

Why fourth:
- this has the widest touch surface in client code and tests
- keeping it separate from tooling changes makes regressions easier to isolate

Definition of done:
- narration producer, bus, ticker, overlay, and tests all use
  `NarrationRankClass` / `rankClass`
- no non-`shared` runtime file defines a local `CardType` for this concept

### Step 5. Add a narrow anti-regression check

Add `scripts/ci/verify-type-ownership.ts` with an intentionally small rule set:

- block local runtime definitions of `CardType`
- block local runtime definitions of `DamageMode`
- allow explicit exceptions only if documented

Why fifth:
- after the names are cleaned up, the check can lock in the result without
  fighting in-progress refactors

Definition of done:
- the script runs locally
- it is wired into an existing verification path such as `check:quick`

### Step 6. Close the loop in docs

Update `docs/system/TYPE_OWNERSHIP.md` after the implementation lands so the
document reflects resolved hotspots rather than planned work.

Why last:
- the doc should describe the post-change state, not half-complete execution

Definition of done:
- resolved hotspots are either removed or marked complete
- the doc points to any remaining follow-up instead of stale warnings

## Recommended PR Sequence

1. Tooling contract cleanup:
   - audit and tighten the production/tooling dependency firewall
   - add `scripts/lib/playthrough-artifacts.ts`
   - import shared `DamageMode`
   - rename runner/verifier option types
2. Client narration rename:
   - rename `CardType` -> `NarrationRankClass`
   - rename `cardType` -> `rankClass`
3. Guardrail + documentation follow-through:
   - add the targeted verification script
   - update `docs/system/TYPE_OWNERSHIP.md` after implementation lands

This order keeps the lower-risk tooling cleanup separate from the client-facing
narration rename and makes regressions easier to isolate.

## QA

Minimum verification for the implementation work:

- `pnpm typecheck`
- relevant client tests covering narration behavior
- `pnpm qa:anomalies -- --latest 1` against a recent playthrough artifact set if
  artifacts are available locally

If the verifier lacks a stable fixture today, add one in the implementation PR
that extracts `PlaythroughRunManifest` and `PlaythroughRunEvent`.

## Exit Criteria

All of the following should be true:

- shared game-domain names are no longer redefined locally in the known hotspot
  files
- the playthrough artifact format has one canonical type module
- narration vocabulary no longer implies parity with the shared card contract
- automated checks exist for the high-signal shared-name collisions
