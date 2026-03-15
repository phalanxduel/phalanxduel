---
title: "Retrospectives"
description: "Historical implementation notes and session retrospectives. Not authoritative for current behavior — read for learning context only."
status: historical
updated: "2026-03-12"
audience: human
---

# Retrospectives

Archived from `.claude/RETROSPECTIVES.md` on 2026-03-12 so historical
implementation notes live under `docs/` instead of assistant-specific config.

## 2026-02-24 — DeploymentPhase config propagation fix

### What went well

- Root cause was identified quickly by reading the engine's `package.json`
  exports and discovering `dist/` was stale.
- The engine's `dist/state.js` had `modeClassicDeployment: true` hardcoded
  (from a pre-DeploymentPhase snapshot), so rebuilding via
  `pnpm --filter @phalanxduel/engine build` immediately fixed the 3 server test
  failures.
- `preferTsSourceImports` Vite plugin in vitest configs clarified why the
  engine source changes worked in engine tests but not server tests.

### What was surprising

- The stale `dist/` was not gitignored in the conventional sense from the
  server's perspective — it existed on disk from a prior session. No
  module-not-found error, just silent wrong behavior.
- The CI workflow had no `pnpm build` step before `pnpm test`, which would
  cause server tests to fail in a fresh checkout since `engine/dist/` is
  gitignored.
- The `replay.test.ts` engine test was non-deterministic: card IDs contained
  `new Date().toISOString()`, so two sequential `replayGame(config, [])` calls
  produced different card IDs, causing "Card not found in hand" intermittently.

### What felt effective

- Reading `engine/dist/state.js` directly (not just `engine/src/state.ts`) to
  spot the `modeClassicDeployment: true` hardcode.
- Adding `drawTimestamp` to `GameConfig` as an optional injectable timestamp —
  minimal API change that makes replay tests fully deterministic without
  affecting production behavior.
- Fixing `DamageMode` by adding `DamageModeSchema` to `shared/src/schema.ts`
  and regenerating, rather than manually editing `types.ts`.

### What to do differently

- After any engine source change, immediately rebuild
  (`pnpm --filter @phalanxduel/engine build`) before running server tests. The
  dist is not auto-rebuilt.
- Always run `pnpm typecheck` early; it would have caught the `DamageMode`
  client issue immediately.
- When a test uses card IDs derived from `createInitialState`, ensure the
  config includes a fixed `drawTimestamp` to avoid timing-sensitive failures.

## 2026-02-24 — PHX-FACECARD-001: Classic Face Card Destruction Eligibility

### What went well

- The TDD loop was clean: wrote 16 failing tests first, all 6 ineligibility
  tests failed correctly, then implementation made all 49 engine tests green in
  one pass.
- The `AttackContext` interface pattern solved the `max-params` lint error
  (limit=6) while making the code more readable — bundling the 3 new immutable
  attack-context fields into a single object is semantically clean.
- The "origin attacker immutable across chain" test case caught the exact chain
  propagation behavior by testing Jack -> number5 front -> Queen back,
  verifying overflow is halted at Queen even with 6 remaining damage.

### What was surprising

- `pnpm rules:check` doesn't exist in the codebase — the CI only has
  lint/typecheck/test/schema:check. The CLAUDE.md and ROADMAP references to it
  are aspirational. No need to add a rule ID to a separate RULES.md list.
- The ESLint `max-params` limit was 6, which the 7-param `absorbDamage` and
  9-param `resolveColumnOverflow` both exceeded. Caught quickly by running
  `pnpm lint` before committing.
- The face card eligibility check must run *before* the Ace check in
  `absorbDamage` — otherwise the code wouldn't reach the Ace path for
  face-card+ace combinations. The two rules are orthogonal.

### What felt effective

- Reading the roadmap's implementation plan (`isFaceCardEligible` pseudocode,
  test case list) before writing any code — it was accurate and complete,
  requiring only minor adjustments.
- Deriving `attackerIsAce` inside `resolveColumnOverflow` from
  `ctx.attackerType === 'ace'` rather than threading it as a separate parameter
  — keeps the function signature at exactly 6 params.
- Testing cumulative mode by setting `gameOptions: { damageMode: 'cumulative' }`
  in the state factory and verifying `currentHp === 1` (not null, not full HP).

### What to do differently

- Check `eslint max-params` configuration before adding more than 4 parameters
  to any function — the limit is 6 and can be hit quickly when threading
  immutable context through a call chain. Prefer bundling params into an
  interface upfront.
