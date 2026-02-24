# Retrospectives

## 2026-02-24 — DeploymentPhase config propagation fix

### What went well
- Root cause was identified quickly by reading the engine's `package.json` exports and discovering `dist/` was stale.
- The engine's `dist/state.js` had `modeClassicDeployment: true` hardcoded (from a pre-DeploymentPhase snapshot), so rebuilding via `pnpm --filter @phalanxduel/engine build` immediately fixed the 3 server test failures.
- `preferTsSourceImports` Vite plugin in vitest configs clarified why the engine source changes worked in engine tests but not server tests.

### What was surprising
- The stale `dist/` was not gitignored in the conventional sense from the server's perspective — it existed on disk from a prior session. No module-not-found error, just silent wrong behavior.
- The CI workflow had no `pnpm build` step before `pnpm test`, which would cause server tests to fail in a fresh checkout since `engine/dist/` is gitignored.
- The `replay.test.ts` engine test was non-deterministic: card IDs contained `new Date().toISOString()`, so two sequential `replayGame(config, [])` calls produced different card IDs, causing "Card not found in hand" intermittently.

### What felt effective
- Reading `engine/dist/state.js` directly (not just `engine/src/state.ts`) to spot the `modeClassicDeployment: true` hardcode.
- Adding `drawTimestamp` to `GameConfig` as an optional injectable timestamp — minimal API change that makes replay tests fully deterministic without affecting production behavior.
- Fixing `DamageMode` by adding `DamageModeSchema` to `shared/src/schema.ts` and regenerating, rather than manually editing `types.ts`.

### What to do differently
- After any engine source change, immediately rebuild (`pnpm --filter @phalanxduel/engine build`) before running server tests. The dist is not auto-rebuilt.
- Always run `pnpm typecheck` early; it would have caught the `DamageMode` client issue immediately.
- When a test uses card IDs derived from `createInitialState`, ensure the config includes a fixed `drawTimestamp` to avoid timing-sensitive failures.
