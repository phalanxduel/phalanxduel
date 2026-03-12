# 2026-03-11 Suppression Hardening Plan

**Status:** Phase 1 and Phase 2 completed on 2026-03-11. Phases 3-5 remain
deferred follow-up work.

## Objective

Reduce the repo's linting, formatting, and type-check suppression footprint to
the minimum necessary set, with each remaining suppression:

- scoped as narrowly as possible
- tied to one specific rule
- documented with a precise reason
- easy to audit in code review and CI

This plan treats suppressions as a safety mechanism of last resort, not as a
normal implementation tool.

## Execution Outcome (2026-03-11)

Completed in this execution:

1. Removed the avoidable inline suppressions targeted by Phase 1:
   - `client/src/lobby.ts`
   - `client/src/main.ts`
   - `engine/src/turns.ts`
   - `server/src/match.ts`
   - `engine/tests/bot.test.ts`
   - `server/tests/bot-match.test.ts`
2. Replaced the Phase 2 third-party `any` seams with typed boundaries:
   - `server/src/app.ts`
   - `server/src/instrument.ts`
3. Fixed two validation-discovered follow-ons so the repo stayed green under
   real runtime pressure:
   - `server/src/db/match-repo.ts`: skip persistence until `match.config`
     exists, avoiding a `config NOT NULL` violation during pending-match saves
   - `bin/qa/simulate-headless.ts`: fixed the `activePage` temporal-dead-zone
     bug that broke the headless playthrough harness
4. Tightened the anomaly verifier in
   `scripts/ci/verify-playthrough-anomalies.ts` so it parses structured server
   log lines instead of flagging info-level 429 entries as generic "errors".

Current post-execution state:

- the Phase 1 and Phase 2 code suppressions targeted by this plan are gone
- `pnpm check:ci` is green
- `pnpm qa:playthrough:verify` passed from a clean local stack twice after the
  fixes landed
- the remaining inline suppression noted by this plan is docs-only:
  `backlog/completed/docs/PLAN - 2026-03-06 - auth-implementation.md`

## Guidance for Future Agents

If a future AI needs to continue suppression cleanup or adjacent hardening, use
this order of operations:

1. Inventory first, then classify:
   - removable by better types
   - removable by helper extraction
   - true third-party seam
   - docs-only example
2. Prefer real type surfaces over suppression comments:
   - declaration files for build-time globals
   - window/global augmentations for browser hooks
   - small omit/redaction helpers instead of ignored destructuring
3. At third-party seams, accept `unknown` and narrow locally with a minimal
   capability type or guard. Do not push `any` through the call site just
   because the library surface is loose.
4. In tests, preserve adversarial coverage with narrow adapters or explicit test
   helpers rather than `as any`.
5. Validate in concentric rings:
   - changed-file lint/type checks
   - package-level type/test checks
   - full `pnpm check:ci`
   - only then the browser or playthrough regression suite
6. For structured log analysis, parse JSON logs instead of matching broad
   `error` regexes against historical log files. Otherwise old noise will look
   like a fresh regression.
7. When a planned phase lands, update the plan doc immediately. Do not leave a
   completed phase looking open for the next agent.

## Target Standard

Suppressions are acceptable only when they meet all of the following:

1. Removal was attempted first.
2. The suppression is scoped to the smallest possible surface:
   - one expression
   - one line
   - one generated file
   - one explicitly justified config entry
3. The exact rule is named.
4. The reason is written inline and is specific to the code at that location.
5. The reason explains why the safer alternative is currently not possible.
6. The suppression does not silently broaden the allowed behavior elsewhere.

Examples of acceptable forms:

- `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Sentry exposes this API as untyped proxy`
- generated-file ignore entries with a comment explaining the generator/source
- file-scoped markdownlint exceptions only for files with known structural needs

Examples that should be eliminated:

- broad ignore patterns like `*.md` when only a few generated docs need exclusion
- bare `@ts-expect-error` without a durable reason
- duplicate config-level suppressions in multiple files without a single
  authoritative source
- inline suppressions used to avoid writing a proper type declaration

## Original Baseline (Pre-Execution)

### Inline suppressions found in code and docs before execution

Repo audit found `13` inline suppressions:

- `11` ESLint disable comments
- `2` TypeScript suppressions (`@ts-expect-error`)

Current locations:

- `client/src/main.ts`
  - `@typescript-eslint/no-explicit-any` x3
- `client/src/lobby.ts`
  - `@ts-expect-error` x1
- `engine/src/turns.ts`
  - `@typescript-eslint/no-unused-vars` x1
- `engine/tests/bot.test.ts`
  - `@typescript-eslint/no-explicit-any` x1
- `server/src/instrument.ts`
  - `@typescript-eslint/no-explicit-any` x1
- `server/src/app.ts`
  - `@typescript-eslint/no-explicit-any` x1
- `server/src/match.ts`
  - `@typescript-eslint/no-unused-vars` x2
- `server/tests/bot-match.test.ts`
  - `@typescript-eslint/no-explicit-any` x2
- `backlog/completed/docs/PLAN - 2026-03-06 - auth-implementation.md`
  - `@ts-expect-error` x1 in a code sample

### Config-level suppression surface

- `eslint.config.js`
  - ignores generated or external artifact trees
  - includes `eslint-config-prettier`, which is an intentional compatibility
    layer and not treated as accidental suppression in this plan
- `.prettierignore`
  - currently ignores `*.md` globally, which is broader than justified
- `.markdownlint.jsonc`
  - disables 14 rules globally
- `.markdownlint-cli2.jsonc`
  - repeats the same 14 disabled rules plus ignore globs
- `.markdownlintignore`
  - overlaps with `.markdownlint-cli2.jsonc` ignore behavior

## Observations

### 1. Some suppressions are clearly removable

- `client/src/lobby.ts` should not need `@ts-expect-error` for `__APP_VERSION__`;
  this should be solved with a declaration in `client/src/vite-env.d.ts`.
- Several test-only `any` casts can likely be replaced with `unknown` plus a
  narrow test helper type.
- The `no-unused-vars` suppressions used during object redaction are likely
  replaceable with small helper functions instead of ignored destructuring.

### 2. Some suppressions are probably still needed, but are too weakly typed

- `server/src/app.ts` and `server/src/instrument.ts` both suppress `any` around
  third-party bootstrapping seams.
- Those may remain exceptional locations, but they should use minimal adapter
  interfaces or wrapper types before falling back to a suppression.

### 3. The biggest config-level problem is breadth, not count

- Ignoring all Markdown in `.prettierignore` is substantially broader than the
  likely intent.
- Markdownlint configuration is duplicated across two config files and one ignore
  file, which makes the suppression surface harder to reason about.

## Sequential Execution Plan

### Phase 1. Remove avoidable code suppressions

Status: complete on 2026-03-11.

Objective: eliminate suppressions where a real type or helper can replace them.

Tasks:

1. Replace `client/src/lobby.ts` `@ts-expect-error` by declaring
   `__APP_VERSION__` in `client/src/vite-env.d.ts`.
2. Replace `client/src/main.ts` `window as any` usage with a minimal global
   window augmentation, for example:
   - `triggerSentryError?: () => void`
   - `SentryToolbar?: { init(opts: ...): void }`
3. Replace test-only `any` casts in:
   - `engine/tests/bot.test.ts`
   - `server/tests/bot-match.test.ts`
   with narrow helper interfaces or `unknown`-based adapters.
4. Replace `no-unused-vars` redaction suppressions in:
   - `engine/src/turns.ts`
   - `server/src/match.ts`
   with explicit omit/redaction helpers.

Acceptance:

- removable suppressions are deleted, not rephrased
- no `@ts-expect-error` remains where a declaration file solves the problem
- tests continue to express adversarial cases without resorting to `any`

### Phase 2. Narrow unavoidable runtime suppressions

Status: complete on 2026-03-11.

Objective: for cases that cannot yet be removed, reduce them to the minimum safe
adapter surface.

Tasks:

1. In `server/src/instrument.ts`, replace `metrics.getMeterProvider() as any`
   with a minimal runtime capability type such as:
   - `type MeterProviderWithAddMetricReader = { addMetricReader?: (...) => void }`
2. In `server/src/app.ts`, replace `buildLoggerConfig() as any` with the
   narrowest Fastify/Pino-compatible type available from the library surface.
3. If a suppression still remains after typing improvements:
   - keep it line-scoped
   - keep the exact rule name
   - add a reason with concrete third-party API behavior

Acceptance:

- any remaining runtime suppressions are limited to true third-party seam cases
- no remaining suppression comment is bare or generic

### Phase 3. Minimize formatting and markdown suppression breadth

Status: deferred. Not part of the executed 2026-03-11 request.

Objective: stop suppressing entire content classes when only generated artifacts
need exceptions.

Tasks:

1. Remove `*.md` from `.prettierignore`.
2. Re-add only the Markdown artifacts that are genuinely generated or unstable,
   if any still need exclusion.
3. Consolidate markdownlint configuration to one authoritative source:
   - either keep `.markdownlint-cli2.jsonc` as canonical and remove duplication
   - or generate one config from the other, but do not maintain both manually
4. Review each currently disabled markdownlint rule and move broad exceptions to
   narrower file-scoped ignores where possible.

Priority review targets:

- `MD025` and `MD001`
  - likely only needed for special docs like `docs/RULES.md`
- `MD033`
  - likely needed only where inline HTML or Mermaid-related markup is used
- `MD034`
  - should remain only if bare URLs are intentionally accepted across internal
    docs

Acceptance:

- Markdown formatting is enforced for normal hand-written docs
- markdownlint suppressions live in one authoritative config path
- broad Markdown rule disables are replaced with narrower exceptions where
  feasible

### Phase 4. Add auditable suppression guardrails

Status: deferred. Not part of the executed 2026-03-11 request.

Objective: make future suppressions explicit, reviewable, and mechanically
checked.

Tasks:

1. Add a CI script, for example `scripts/ci/verify-suppressions.ts`, that:
   - inventories inline suppression comments
   - fails on `@ts-ignore`
   - fails on `@ts-nocheck`
   - fails on file-wide `eslint-disable` in runtime code
   - fails on suppression comments that do not include a reason suffix
2. Optionally emit a checked-in report, for example
   `docs/system/SUPPRESSIONS_REPORT.md`, if you want the inventory visible in the
   docs pipeline.
3. Add a root script such as `pnpm suppressions:check`.
4. Wire that script into `check:quick` and `check:ci`.

Acceptance:

- new broad suppressions are blocked automatically
- every remaining suppression is discoverable by one command

### Phase 5. Document the policy as a standing repo rule

Status: deferred. Not part of the executed 2026-03-11 request.

Objective: make suppression discipline part of the repo's documented engineering
standards.

Tasks:

1. Add a system doc, for example `docs/system/SUPPRESSION_POLICY.md`, covering:
   - allowed suppression forms
   - forbidden suppression forms
   - required justification format
   - generated-file exception policy
2. Link it from:
   - `CONTRIBUTING.md`
   - `docs/system/PNPM_SCRIPTS.md` (if a suppression audit command is added)
3. Update contributor guidance so reviewers treat suppressions as exceptions that
   require explicit reasoning, not as routine cleanup.

Acceptance:

- the repo has a stable, cited policy for suppressions
- reviewers have one canonical reference for enforcement

## File-by-File Decision Matrix

### Remove outright

- `client/src/lobby.ts`
- `client/src/main.ts`
- `engine/src/turns.ts`
- `server/src/match.ts`
- `engine/tests/bot.test.ts`
- `server/tests/bot-match.test.ts`

### Attempt to replace with typed adapters, then justify if still required

- `server/src/app.ts`
- `server/src/instrument.ts`

### Convert broad config suppression to targeted exceptions

- `.prettierignore`
- `.markdownlint.jsonc`
- `.markdownlint-cli2.jsonc`
- `.markdownlintignore`

### Docs-only cleanup

- `backlog/completed/docs/PLAN - 2026-03-06 - auth-implementation.md`
  - either remove the suppression from the code sample or explain it inside the
    sample/comment itself

## Verification

Implementation should finish with all of the following:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm format:check`
5. markdown lint checks after `.prettierignore` narrowing
6. the new suppression audit command, if added

## Exit Criteria

The work is complete only when all of the following are true:

- every remaining suppression has an explicit, local reason
- no broad Markdown formatting exclusion remains without artifact-level
  justification
- no duplicate suppression config remains without a single authoritative owner
- `@ts-ignore` and `@ts-nocheck` are blocked repo-wide
- future suppressions are auditable through CI, not just manual inspection
