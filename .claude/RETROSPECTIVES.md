# Phalanx — Retrospective Summary

This is a compressed sprint-level retrospective (covering work from 2026-02-10
to 2026-02-16). It captures recurring learnings and explicit team agreements so
new sessions can load context quickly.

## Sprint Learnings

### 1) Schema-first sequencing is consistently reliable

- Most successful changes followed: schema -> generated artifacts -> engine ->
  tests -> server -> client -> docs.
- `pnpm schema:gen` remained stable across major changes (reinforcement,
  overflow/LP, forfeit/outcome, Heroical removal).
- Refactors stayed low-risk when changes were made in dependency order instead
  of cross-cutting edits.

### 2) Full-suite verification is required for rule changes

- Engine-only verification missed integration effects (victory-condition and
  reinforcement changes broke server flow tests).
- Running the entire test suite caught cross-package regressions early.
- Simulation/stress tests were high-value for validating state invariants.

### 3) Generated files are part of the source of truth

- `schema:check` failures repeatedly came from unstaged generated JSON/schema
  artifacts, not logic defects.
- Workflow must treat generated artifacts as mandatory outputs of schema edits.

### 4) Documentation drift is a recurring operational risk

- Multiple docs diverged from implementation (protocol, rules semantics,
  HOWTOPLAY details, deferred features mixed into v1 rules).
- Source-first doc rewrites improved accuracy and exposed hidden issues.
- Deferred mechanics (Joker, face-down, direct Spade damage, etc.) need clear
  separation from active rules to reduce confusion.

### 5) Security and protocol correctness need explicit gates

- Server broadcast behavior exposed sensitive state (opponent card visibility).
- Reconnect logic existed but did not restore authenticated match state.
- These issues were discoverable in code review but not consistently covered by
  tests/checklists.

### 6) Test design quality improved outcomes

- Batch authoring targeted tests (especially TDD for reinforcement) produced
  clearer implementation boundaries and faster iteration.
- Pure helper functions made behavioral changes easier to validate in isolation.
- Some misses were due to incomplete assertion scope (e.g., outcome metadata),
  not missing test execution.

### 7) Work decomposition improved throughput

- Explicit phased plans and task tracking reduced backtracking.
- Separating “execution plan” docs from “open work” docs improved triage and
  reduced duplicate maintenance.

## Team Agreements

These agreements are now the default execution standard:

1. Follow schema-first dependency order for game/protocol changes.
2. Run full repo verification for gameplay/state-machine changes:
   typecheck + lint + build + all tests (not engine-only).
3. When schema changes, always regenerate and stage generated artifacts in the
   same change set.
4. Keep docs implementation-anchored:
   RULES/HOWTOPLAY/PROTOCOL updates are required for user-visible behavior,
   protocol changes, or rule semantics updates.
5. Keep v1 scope clean:
   deferred or experimental mechanics belong in `docs/FUTURE.md`, not in active
   rules/spec docs.
6. Add explicit security/protocol review on server-phase work:
   state filtering/privacy, reconnect/re-auth, and lifecycle correctness.
7. Expand tests alongside behavior changes:
   include integration effects and structured outcome/state invariants, not only
   unit-level return values.
8. For large tasks, split into smaller committable chunks to reduce context and
   rollback risk.
9. Before starting new work, quickly scan this summary plus the current roadmap
   and tasks to avoid repeating prior mistakes.

## 2026-02-17: Event Sourcing, OpenAPI & Client Contract (Phases A-E)

### What went well

- **Schema-first sequencing held up again**: The 5-phase dependency chain
  (A: schema → B: engine → C: server → D: client → E: docs) executed cleanly.
  Each phase's outputs were immediately consumable by the next.
- **Discriminated union pattern for transaction details**: Using Zod's
  `discriminatedUnion` on `details.type` made the 5 detail variants
  (deploy/attack/pass/reinforce/forfeit) type-safe and extensible.
- **Injected hash function pattern**: Making `applyAction` accept an optional
  `hashFn` kept the engine browser-safe while letting the server inject
  `computeStateHash` (node:crypto). Clean separation of concerns.
- **Combat log embedding**: Keeping `CombatLogEntry` inside
  `TransactionDetailAttack.combat` avoided duplication while preserving the
  structured attack audit trail.
- **Replay validation is powerful**: `replayGame` + deterministic engine means
  any match can be verified from its config + action list. The replay endpoint
  was trivial to implement once the engine function existed.

### What was surprising

- **Transaction log overhead on stress tests**: The 100-game stress test timed
  out at 5s because building transaction entries per action adds measurable
  overhead. Needed 15s timeout — worth monitoring as game complexity grows.
- **ESLint destructuring quirk**: `const { transactionLog: _, ...rest }` triggers
  `no-unused-vars` even though `_` is convention for discards. The
  `argsIgnorePattern` config only applies to function args, not destructured
  variables. Required explicit `eslint-disable` comments.
- **Client type narrowing for embedded combat**: Extracting `CombatLogEntry`
  from `TransactionDetailAttack` required a cast since TS doesn't narrow
  discriminated unions through `.filter().map()` chains automatically.

### What felt effective

- **Parallel verification**: Running typecheck + lint + test + rules:check after
  each phase caught issues early (client combatLog refs after Phase B, lint
  errors after Phase C).
- **Comprehensive docs from implementation knowledge**: Writing CLIENT_CONTRACT.md
  after implementing all 5 phases meant the documentation was accurate by
  construction, not by reverse-engineering.
- **Reusing existing test infrastructure**: The `makeCombatState` helper and
  simulation test patterns from Phase 10 transferred directly to transaction
  log testing.

### What to do differently

- **Pre-plan lint implications of helpers**: The `gameStateForHash` destructuring
  and test file destructuring patterns all hit the same ESLint issue. Could have
  addressed the pattern once in the first occurrence rather than fixing 3 files.
- **Consider stress test budget early**: When adding per-action overhead, check
  simulation/stress test timeouts proactively rather than after failure.
- **Type helper for discriminated union extraction**: A small utility type for
  extracting variants from discriminated unions would clean up the client's
  `as { type: 'attack'; combat: CombatLogEntry }` casts.

## 2026-02-17: Phases 13-16 (Filtering, Proxy, Hardening, Deployment)

### What went well

- **Parallel phase execution**: Phases 13+14 ran in a single pass without
  conflicts — state filtering (server) and Vite proxy (client) touched
  different files entirely.
- **Static file serving was trivial**: `@fastify/static` + `existsSync` check
  means the server auto-serves client dist when present, no config needed.
- **Multi-stage Docker build is clean**: deps → build → runtime stages keep
  the final image small while supporting the pnpm workspace layout.
- **Rate limiting and TTL cleanup were straightforward**: Simple sliding window
  and interval-based cleanup patterns worked well without external deps.

### What was surprising

- **tsx is a devDependency but needed at runtime**: The server `start` script
  runs TypeScript source via `tsx`, so it must be a production dependency.
  Easy to miss since it works fine in dev where all deps are installed.
- **pnpm workspace `--prod` install needs all package.json files**: The
  Dockerfile must COPY each workspace package.json individually before
  `pnpm install` to get the dependency graph right.

### What felt effective

- **Incremental verification after each phase**: Running typecheck + lint +
  test after each batch caught issues immediately.
- **Session storage pattern for reconnection**: Using `sessionStorage` rather
  than `localStorage` ensures credentials clear on tab close, avoiding stale
  match references.

### What to do differently

- **Test the Docker build in CI**: The Dockerfile hasn't been validated by
  running `docker build` — should be a CI step or at least a manual test.
- **Consider a build step for server too**: Running tsx in production adds
  startup overhead. A proper tsc build step would improve cold start time.

## 2026-02-17: Phase 17 — Lobby UX (Join-via-Link Flow + Layout Reorder)

### What went well

- **Client-only change was self-contained**: No schema, engine, or server changes
  needed. The entire feature was 3 files in `client/src/` — fast to implement and
  verify.
- **Existing `resetToLobby()` and `clearMatchParam()` reuse**: The "create your
  own match" link just called `resetToLobby()` which already handled state reset
  and URL cleanup. Only needed a minor tweak to also clear the `mode` param.
- **URL param approach for mode sharing**: Encoding damage mode in the shared link
  (`?match=xxx&mode=per-turn`) was zero-cost — no server changes, no new protocol
  messages. The join-via-link view reads it directly from the URL.

### What was surprising

- **Nothing broke**: Pure additive UI changes with no state machine or protocol
  modifications. Typecheck, lint, and build all passed on first try.

### What felt effective

- **Reading all 3 files before editing**: Understanding the existing lobby layout,
  state management, and CSS patterns meant edits were targeted and consistent with
  established conventions (el() helper, class naming, dark theme colors).
- **QA smoke test confirmed engine stability**: Running the full 6-step QA after
  a client-only change validated that nothing regressed across packages.

### What to do differently

- **Manual testing still needed**: The lobby UX changes are purely visual/interactive
  and have no automated test coverage. Consider adding Playwright or similar E2E
  tests if client complexity continues to grow.

## 2026-02-18: Phase 18 — Damage Mode (Cumulative vs Per-Turn Reset)

### What went well

- **Schema-first rollout stayed reliable**: Adding `DamageMode` and `GameOptions`
  in shared first kept engine/server/client wiring straightforward.
- **Behavioral tests captured rule intent**: The new `PHX-DAMAGE-001` tests cover
  resets after overflow, auto-advance, Ace behavior, and replay determinism.
- **Feature reused existing UX work**: The lobby mode selector and join-via-link
  mode badge integrated naturally with Phase 17's URL flow.

### What was surprising

- **Sandboxed commands can hide true CI signal**: Server tests and schema checks
  needed unrestricted execution because of local socket/listen requirements.

### What to do differently

- **Keep roadmap handoff notes current**: "Uncommitted work" text drifted quickly
  and needed cleanup to avoid misleading the next session.

## Open Risks To Track

- Docker image not yet tested (`docker build` not run in CI or manually).
- tsx at runtime adds startup latency — consider compiling server for production.
- Documentation can drift again without disciplined "change-with-code" updates.

## Retrospective Maintenance

- Add short incremental notes only when new learnings materially change this
  summary.
- Prefer updating existing sections over appending long chronological entries.
