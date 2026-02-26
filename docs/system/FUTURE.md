# Phalanx Duel — Future Enhancements

Ideas and deferred mechanics that are **not part of v1**. These are captured
here so they are not lost, but none of them should block the core game from
being playable and testable.

---

## PHX-SERVER-Backlog-001 — Server Integrity & Hardening Pass (Post-Evaluation) [Completed 2026-02-26]

Captured and resolved the highest-priority server-side issues identified during
codebase evaluation. This was a focused reliability/hardening task, not a
feature expansion.

**Status:** Completed on `2026-02-26`

**Implemented:**
- Fixed REST `POST /matches` -> WS `joinMatch` contract mismatch by supporting
  typed pending matches and safe first-join slot assignment.
- Fixed `system:init` phase telemetry to record the actual phase transition
  (`pre` -> `post`) instead of hardcoding `StartTurn -> AttackPhase`.
- Hardened admin auth defaults to fail closed outside `development`/`test`
  unless explicit admin credentials are configured.
- Gated `/debug/error` to `development`/`test` by default (or explicit
  `PHALANX_ENABLE_DEBUG_ERROR_ROUTE=1`).
- Added regression coverage for REST-created match -> two WS joins -> game
  start broadcast.

**Problem summary:**
- `POST /matches` pre-registers a placeholder match with `players: [null, null]`
  and stores it with a type cast, but `MatchManager.joinMatch()` assumes player
  slot 0 exists. A REST-created match can fail/crash on first WS join.
- `system:init` phase telemetry in `server/src/match.ts` is hardcoded as
  `StartTurn -> AttackPhase`, but engine init can transition to
  `DeploymentPhase` in classic deployment mode.
- Admin Basic Auth falls back to default credentials (`phalanx/phalanx`) when
  env vars are absent.
- `/debug/error` is registered unconditionally and should be gated outside
  development/test.
- Tests cover `POST /matches` and feeds, but do not assert the full REST-create
  -> WS-join path.

**Scope (completed):**
- Fix the REST create/join contract mismatch (either create a valid host slot or
  redesign/remove the placeholder route pattern).
- Derive init phase telemetry from actual state transition (`pre`/`post`)
  instead of hardcoding.
- Require explicit admin credentials in non-dev environments (fail closed).
- Gate `/debug/error` to development/test (or admin-only with explicit env
  flag).
- Add tests covering REST-created match -> first join -> second join ->
  successful game start broadcast.

**Acceptance criteria (met):**
- A match created via `POST /matches` can be joined without runtime error.
- Telemetry reports the actual `system:init` phase transition in both classic
  and cumulative modes.
- Production startup/requests do not expose usable default admin credentials.
- `/debug/error` is unavailable by default in production.
- A regression test fails on current behavior and passes after the fix.

**Implementation touch points (actual):**
- `server/src/app.ts`
- `server/src/match.ts`
- `server/tests/ws.test.ts`
- `server/tests/hardening.test.ts`
- `server/tests/match.test.ts`

**Notes:**
- Keep changes isolated to server package unless a contract change requires
  explicit shared schema updates.
- Preserve existing in-progress local edits in the repo root.

**Optional follow-up (separate task if desired):**
- Add startup warning/error logging when `NODE_ENV=production` and admin
  credentials are missing (currently requests fail closed, but startup signal
  could be clearer).
- Add a dedicated test that asserts the exact `system:init` telemetry phase in
  both classic and cumulative modes (requires telemetry test seam/mocking).

---

## PHX-ENGINE-Backlog-001 — State Machine Fidelity Hardening (Resumeable Sequence)

Improve the **fidelity** of the engine state machine so the runtime reducer,
tests, and documented transition graph stay aligned over time. This is a
sequenced hardening effort, not a gameplay rules expansion.

**Status:** Planned / multi-session (resumeable)

**Baseline (completed 2026-02-26):**
- Commit `ddf9152c` (`refactor(engine): enforce FSM transitions in applyAction`)
  added runtime transition checks (`assertTransition`) and routed phase changes
  through a checked helper in `engine/src/turns.ts`.
- `STATE_MACHINE` in `engine/src/state-machine.ts` was updated to model runtime
  micro-step transitions (including `system:advance` and `system:victory`).
- `engine/tests/state-machine.test.ts` was updated for the runtime-accurate
  graph shape.
- QA passed: `pnpm --filter @phalanxduel/engine test -- state-machine.test.ts`
  (Vitest reported `55` passing tests across `5` files in that run).

**Direction update (2026-02-26):**
- Long-term vision is to adopt **XState** for state-machine modeling/orchestration.
- Near-term work should be designed to be **XState-forward** (smallest safe steps,
  no regression to deterministic replay/hash guarantees).
- Do not rewrite the combat/domain reducer first. Improve observability, docs
  fidelity, and drift controls before any runtime framework migration.
- Verification direction:
  - Use **policy-based optional machine binding** for turn signatures/hashes.
  - Support at least two verification profiles over time:
    - `standard` (core deterministic replay hash)
    - `official` (higher-fidelity provenance binding, intended for public/competitive events)
  - Long-term goal includes **offline third-party verification** for official
    events and a public event stream for analysis/audit/tuning.

**Working rules (apply to every unit below):**
- Complete **one unit only** before starting the next.
- Keep each unit isolated: no unrelated engine/server/client refactors.
- Run targeted QA before commit; do not rely on reasoning-only changes.
- Update this section status/checklist at the end of each unit so the next
  session can resume without re-discovery.
- If scope expands mid-unit, stop and document the spillover in the next unit
  instead of batching.
- Treat `docs/RULES.md` as the authoritative v1.x rules reference, but allow it
  to evolve as new behavior is discovered/decided. If a unit changes
  runtime-observable behavior (or clarifies behavior not yet covered), update
  `docs/RULES.md` in the same unit or explicitly record a temporary divergence.
- Treat `docs/system/ARCHITECTURE.md` as descriptive/system-level guidance, not
  the canonical source for wire/schema field shapes. Prefer references to
  `@phalanxduel/shared` schemas over duplicating field definitions.
- Design near-term changes as if XState adoption is certain:
  - keep phase transitions explicit and serializable
  - keep side effects/timers/network out of the deterministic transition core
  - prefer stable event/trigger names and versioned machine definitions
  - avoid coupling hashes to framework-internal snapshot serialization

**Known drift risks to actively prevent:**
- Stale references to non-existent docs (for example `engine/src/state-machine.ts`
  referencing `docs/system/GAME_STATE_MACHINE.md`).
- Architecture examples/descriptions drifting from the actual shared schemas
  (for example transaction log field descriptions vs `shared/src/schema.ts`).
- Rules clarifications landing only in code/tests and not being backfilled into
  `docs/RULES.md`.

**XState-forward constraints (to protect deterministic replay/hash compatibility):**
- The hashed/replayable authority remains the **domain state transition result**
  (`preState + action + postState + deterministic metadata`), not raw framework
  interpreter internals.
- Any XState adoption in the engine path must use deterministic inputs only
  (no ambient time, random IDs, async invokes, or timer scheduling in the hashed
  transition path unless explicitly modeled/injected).
- Persist machine version identifiers explicitly. Versioned state machines are
  desirable, but replay must bind to the machine version used when the match/turn
  was produced.
- If XState snapshots are persisted, treat them as operational state; do not make
  replay/hash validity depend on undocumented/internal snapshot fields.
- Phase-hop traces should be designed now so they can become XState migration
  fixtures later.

**Verification/signature constraints (policy-based profiles):**
- Separate **integrity hashes** from **authenticity signatures**:
  - hash = deterministic turn transition integrity
  - signature = trusted attestation over a chosen hash/profile
- `standard` profile should optimize for replay stability and developer testing.
- `official` profile may bind additional provenance (for example machine/rules
  version identifiers and trace/provenance digests), but must remain explicitly
  versioned and documented.
- Verification policy must be immutable per match once the match begins.
- Official-profile outputs should be verifiable by third parties offline (public
  keys / key IDs / signature metadata available).
- Do not bind canonical replay validity to framework-internal snapshot encoding
  (including future XState internal snapshot shapes).

**Pre-decisions already made (to avoid re-litigating in Units 2C/2D):**
- `official` matches require a spectator delay policy with an event-configurable
  minimum floor (turn-based delay preferred).
- Top ladder / season finals should use the `official` verification profile.
- Post-match hidden-state reveal should support a configurable delay and must be
  able to be set to `0` (immediate reveal) when policy permits.
- Official post-match hidden-state reveal default should be `endOfMatch`, with
  `endOfRound` as a supported option.
- If `endOfRound` reveal is used, round boundaries should be published as
  explicit stream events.
- Prefer open, widely adopted standards for offline signature verification;
  current direction is JWKS-style public key distribution unless a better fit is
  identified during `Unit 2C`.
- Use a single private ingress stream/topic (trusted/internal only) and split to
  audience-specific derived streams via trusted consumers/processors; public
  consumers must not read ingress directly.
- Production analytics/anti-cheat should start from a safer derived-feature
  stream (no raw hidden state by default). Local development may expose richer
  hidden-state debug outputs via explicit local-only configuration.
- `ranked-like` mode may exist before auth/persistence, but it must be
  explicitly non-authoritative and use guest aliases (`matchAlias` semantics).
- Stable cross-match public pseudonyms are a future enhancement tied to
  auth/persistence; keep identity-provider concerns separate from the game
  engine and event schema design.

**Long-term observability / public stream direction (design target):**
- Publicly write game lifecycle events (create, join, move/action intent,
  turn-result, win/lose/draw/error) to an append-only stream suitable for
  analytics, anomaly detection, and replay verification.
- Treat analytics and anti-cheat pattern analysis as consumers of the stream,
  not as hidden side channels inside game execution.
- Design event envelopes so they can carry verification profile metadata and
  optional signatures without breaking standard/casual matches.

**Progress checklist (resume from the first unchecked item):**
- [x] Baseline runtime FSM enforcement (`ddf9152c`)
- [ ] Unit 1 — Runtime phase-hop trace (recommended next)
- [ ] Unit 2A — Documentation authority + drift guardrails (`RULES.md` + architecture)
- [ ] Unit 2 — Runtime/table parity tests from recorded traces
- [ ] Unit 2B — XState phase-machine spike (shadow/adapter, no authority switch)
- [ ] Unit 2C — Verification profiles + signature provenance design (standard/official)
- [ ] Unit 2D — Public event stream envelope design (analytics + offline verification)
- [ ] Unit 3 — Split runtime FSM vs conceptual/doc FSM
- [ ] Unit 4 — Engine-local phase-scoped types
- [ ] Unit 5 — Shared schema phase discrimination

**Planned execution order (do not infer from numbering):**
- Phase 1: `Unit 1` (runtime phase-hop trace)
- Phase 2: `Unit 2A` (documentation authority + drift guardrails)
- Phase 3: `Unit 2` (runtime/table parity tests using recorded traces)
- Phase 4: `Unit 2B` (XState phase-machine spike in shadow/adapter mode)
- Phase 5: `Unit 2C` (verification profiles + signature provenance design)
- Phase 6: `Unit 2D` (public event stream envelope design)
- Then continue with `Unit 3+` based on results and priorities

**Sequential workplan (current recommended path):**
- Step 1 / `Unit 1`:
  - Add XState-ready phase-hop traces to transaction logging.
  - Produce at least one deterministic trace assertion (`pass` path minimum).
- Step 2 / `Unit 2A`:
  - Document authority boundaries (`RULES.md`, shared schemas, runtime FSM,
    architecture).
  - Fix known doc drift and stale FSM doc references.
  - Add a lightweight drift guard (process/check/script).
- Step 3 / `Unit 2`:
  - Build runtime-to-`STATE_MACHINE` parity tests using recorded traces.
  - Keep outputs reusable for XState shadow parity in `Unit 2B`.
- Step 4 / `Unit 2B`:
  - Implement an XState phase-machine shadow/adapter prototype.
  - Compare XState phase traces against reducer traces (no authority switch).
- Step 5 / `Unit 2C`:
  - Define `standard` vs `official` verification profiles, hash/signature
    boundaries, provenance binding, JWKS/JWS direction, and match-level policy
    immutability.
  - Include ranked-like (guest alias, non-authoritative) and future
    ranked/ladder identity modes in the policy model.
- Step 6 / `Unit 2D`:
  - Define canonical internal event envelopes plus derived audience streams.
  - Encode verification metadata hooks and official signature fields.
  - Define live redaction and post-match hidden-state reveal policies
    (`endOfMatch` default, `endOfRound` option, `delay=0` support).
  - Add explicit round-boundary events for `endOfRound` release workflows.

**Resume protocol (start of a later session):**
- Read this section first and identify the first unchecked unit.
- Verify the baseline commit is present (`git rev-parse --short HEAD` and/or
  `git log --oneline --grep="enforce FSM transitions"`).
- Re-run the unit's listed QA command before changing scope if there has been
  unrelated engine churn since the last session.
- Work only the active unit's files/touch points.
- On completion: commit, mark the unit complete here, record the commit hash and
  QA result, then stop.

### Unit 1 — Runtime Phase-Hop Trace (Recommended Next)

**Goal:** Make actual reducer execution observable so state-machine fidelity can
be measured from recorded runtime behavior.

**Scope:**
- Extend `applyAction()` / `stepPhase()` in `engine/src/turns.ts` to capture the
  exact phase-hop sequence for one action (`from`, `trigger`, `to`).
- Persist the trace in transaction logging (either a new optional transaction
  field or a transaction details extension) with schema support in
  `shared/src/schema.ts`.
- Keep behavior unchanged apart from recording trace metadata.
- Make the trace format XState-ready:
  - explicit `from`, `trigger`, `to`
  - stable ordering
  - serializable shape suitable for future fixture reuse

**Touch points (expected):**
- `engine/src/turns.ts`
- `shared/src/schema.ts`
- `engine/tests/state-machine.test.ts` or a new focused engine test file

**QA (minimum):**
- `pnpm --filter @phalanxduel/engine test -- state-machine.test.ts`
- Add a test asserting a known action (for example `pass`) records the expected
  phase-hop sequence.

**Exit criteria (must all be true):**
- A transaction log entry can include an exact runtime phase-hop trace.
- At least one regression test asserts the trace sequence for a deterministic
  action path.
- No gameplay behavior changes.

**Stop/resume note to record when done:**
- Commit hash
- QA command(s) run + result
- Any trace schema shape decisions made (so Unit 2 uses the same format)
- Whether the trace schema is suitable as future XState parity fixtures

### Unit 2 — Runtime/Table Parity Tests From Recorded Traces

**Goal:** Prove every runtime phase hop observed in reducer execution is
declared in `STATE_MACHINE`, and produce reusable parity fixtures for future
XState validation.

**Scope:**
- Add tests that replay representative actions and inspect recorded phase-hop
  traces.
- Assert each hop maps to a declared transition using `hasTransition()` /
  `assertTransition()` from `engine/src/state-machine.ts`.
- Cover `deploy`, `attack` (victory and non-victory), `pass`, `reinforce`,
  `forfeit`, and `system:init`.

**Touch points (expected):**
- `engine/tests/state-machine.test.ts` or `engine/tests/fsm-parity.test.ts`

**QA (minimum):**
- `pnpm --filter @phalanxduel/engine test -- state-machine.test.ts`
- If a new file is created, run it directly as well.

**Exit criteria (must all be true):**
- Tests fail if a runtime phase hop is missing from `STATE_MACHINE`.
- Coverage includes both immediate-victory and multi-step turn flows.
- No new runtime code paths added beyond parity assertions/tests.
- Test fixtures/output are reusable for a future XState shadow machine parity run.

**Stop/resume note to record when done:**
- Commit hash
- QA command(s) run + result
- Any gaps intentionally deferred (for example rare branches not yet covered)
- Which traces/scenarios are ready to reuse for `Unit 2B`

### Unit 2A — Documentation Authority + Drift Guardrails (`RULES.md` + Architecture)

**Goal:** Prevent dead documentation by defining an explicit documentation
authority model, fixing known drift, and adding a repeatable process/check for
future changes, while preserving `docs/RULES.md` as an evolving authoritative
v1.x rules spec.

**Guidance (authoritative-but-evolving rules):**
- `docs/RULES.md` is the v1.x authoritative rules definition for intended system
  behavior.
- It must remain updateable as new discoveries/decisions resolve ambiguity or
  fill gaps not originally covered.
- Code/tests may discover edge cases first, but those discoveries are not
  complete until they are either:
  1. codified in `docs/RULES.md`, or
  2. explicitly listed as a temporary divergence / pending clarification.

**Scope:**
- Add a short "Documentation Authority & Drift Policy" section to
  `docs/system/ARCHITECTURE.md` (or another stable system-doc location) that
  states:
  - `docs/RULES.md` = normative rules/spec authority
  - `@phalanxduel/shared` Zod schemas = canonical data-contract authority
  - engine FSM table = runtime transition authority (implementation-level)
  - `docs/system/ARCHITECTURE.md` = explanatory/non-normative system overview
- Fix currently known architecture/doc drift and stale references:
  - audit and correct transaction log/hash/event descriptions in
    `docs/system/ARCHITECTURE.md` against `shared/src/schema.ts`
  - remove or replace stale references to missing `docs/system/GAME_STATE_MACHINE.md`
    with an existing artifact/path (or create the missing doc intentionally)
- Add a lightweight anti-dead-doc process:
  - when runtime behavior changes, same PR updates `docs/RULES.md` or records a
    temporary divergence
  - when schema shapes change, same PR updates any duplicated examples in docs
    (or replaces them with references)
  - require a brief "Docs impact" note in backlog completion notes for this
    state-machine fidelity track
- Add a small verification hook (script/test/checklist) to reduce drift:
  - minimum acceptable: documented PR/backlog checklist and a grep-based audit
  - preferred: a CI/local check that flags broken doc references and obvious
    stale pointers

**Touch points (expected):**
- `docs/RULES.md`
- `docs/system/ARCHITECTURE.md`
- `docs/system/FUTURE.md` (this backlog entry updates)
- Optional doc-check script / lint config / CI wiring
- `engine/src/state-machine.ts` comments (if stale doc references are fixed here)

**QA (minimum):**
- Manual consistency review of:
  - `docs/RULES.md`
  - `docs/system/ARCHITECTURE.md`
  - `shared/src/schema.ts`
  - `engine/src/state-machine.ts`
- Run any added doc-check script (if introduced)
- `rg`/link audit confirms no stale references remain to missing FSM docs (unless
  intentionally reintroduced as a created file)

**Exit criteria (must all be true):**
- Authority levels are explicitly documented (rules vs schemas vs runtime FSM vs
  architecture overview).
- Current known drift items are resolved or listed as explicit temporary
  divergences with owners/next step.
- There is a repeatable process/check to prevent dead documentation from
  accumulating silently.
- `docs/RULES.md` update expectations are explicit for behavior clarifications
  discovered first in code/tests.

**Stop/resume note to record when done:**
- Commit hash
- Drift items fixed vs deferred
- Whether the drift guard is process-only, script-based, or CI-enforced

### Unit 2B — XState Phase-Machine Spike (Shadow/Adapter, No Authority Switch)

**Goal:** Validate an XState-forward design in the smallest safe slice without
replacing the current deterministic reducer as the authoritative runtime.

**Scope:**
- Implement a minimal XState phase machine (phase orchestration only, no combat
  math rewrite) that models the current phase transitions/triggers.
- Run it in shadow/adapter mode against selected scenarios using traces from
  Units 1/2.
- Compare phase-hop outputs against the existing reducer traces.
- Do **not** switch production authority from `applyAction()` in this unit.

**Touch points (expected):**
- `engine/src/state-machine.ts` (mapping/helpers as needed)
- New spike/prototype file(s) for XState machine modeling
- Engine tests (new parity/shadow tests)
- Optional notes in `docs/system/FUTURE.md` summarizing spike findings

**QA (minimum):**
- Existing engine FSM tests
- New shadow parity tests comparing reducer traces vs XState phase traces for
  representative flows (`system:init`, `deploy`, `pass`, `attack`, `reinforce`,
  `forfeit`)

**Exit criteria (must all be true):**
- XState phase machine can reproduce phase-hop traces for covered scenarios.
- Any incompatibilities with deterministic replay/hash requirements are
  documented with concrete mitigation options.
- No gameplay regressions because runtime authority is unchanged.

**Stop/resume note to record when done:**
- Commit hash
- Covered scenarios and mismatches
- Recommendation: proceed to incremental adoption vs further spike work

### Unit 2C — Verification Profiles + Signature Provenance Design (`standard` / `official`)

**Goal:** Define a durable verification model that supports flexible casual play
and higher-fidelity official events without breaking deterministic replay.

**Scope:**
- Define verification profiles and their hash/signature payloads:
  - `standard`: core deterministic turn integrity hash
  - `official`: core hash + explicit provenance binding (rules/machine/profile versions,
    optional trace/provenance digests)
- Specify what is hashed vs signed vs metadata-only.
- Specify canonical serialization requirements for hashed payloads.
- Specify machine/rules version binding policy (and whether included in core vs
  official profile hashes).
- Specify signature envelope for offline third-party verification (algorithm, `kid`,
  public key distribution assumptions, signature bytes/encoding).
- Evaluate and choose an open standard key distribution format (JWKS preferred
  baseline) and document why.
- Document match-level immutability of `verificationPolicy`.
- Define identity/policy compatibility for:
  - open play (`guestAlias`)
  - ranked-like (guest alias, explicitly non-authoritative)
  - future ranked/ladder (`stablePseudonym`, after auth/persistence)

**Touch points (expected):**
- `docs/RULES.md` (normative behavior/verification profile semantics)
- `docs/system/ARCHITECTURE.md` (system/operational overview)
- `shared/src/schema.ts` (if profile fields/envelopes are introduced now)
- `docs/system/FUTURE.md` (record design decisions and follow-ons)

**QA (minimum):**
- Design review against current replay/hash flow and transaction log fields
- Explicit examples for both `standard` and `official` verification payloads
- Consistency check that `standard` remains low-friction for tests/dev replay

**Exit criteria (must all be true):**
- A written profile spec exists for `standard` and `official`.
- Hash/signature/provenance boundaries are explicit and testable.
- Offline third-party verification requirements for `official` are documented.
- Deterministic replay compatibility constraints remain intact.
- A concrete recommendation exists for public key distribution (JWKS or
  alternative) with rationale.
- Ranked-like vs future ranked/ladder policy differences are explicit (so
  identity persistence is not accidentally implied before auth exists).

**Stop/resume note to record when done:**
- Commit hash
- Chosen hash/signature envelope format(s)
- Open questions deferred to implementation

### Unit 2D — Public Event Stream Envelope Design (Analytics + Offline Verification)

**Goal:** Design an append-only public event stream schema that supports replay
verification, analytics, anomaly detection, and future anti-cheat tooling.

**Scope:**
- Define event envelope types for public lifecycle events (create, join, action
  intent, turn result, outcome, error) and identify which are public vs private.
- Add verification profile metadata/signature hooks to the envelope schema.
- Define stable identifiers and ordering/causality fields (match id, sequence,
  turn index, previous hash/event linkage as needed).
- Define privacy/redaction policy for public events (player identifiers, IPs,
  internal diagnostics, etc.).
- Define consumer expectations (analytics, tuning, anomaly detection, third-party
  verification) and non-goals.
- Define post-match hidden-state reveal timing controls, including explicit
  support for immediate reveal (`delay = 0`) where allowed by match/event policy.
- Define ingress vs derived stream boundaries:
  - private canonical ingress topic (trusted only)
  - derived public spectator stream(s)
  - derived official audit stream
  - derived analytics/anti-cheat feature streams (safer-by-default)
- Define explicit round-boundary event envelopes to support `endOfRound`
  post-match hidden-state release workflows.

**Touch points (expected):**
- `docs/RULES.md` (if event semantics become normative)
- `docs/system/ARCHITECTURE.md`
- `shared/src/schema.ts` (future schema work; optional in design-only unit)
- `docs/system/FUTURE.md`

**QA (minimum):**
- Envelope examples for standard and official-profile matches
- Walkthrough of a sample match stream showing ordering and verification fields
- Review for compatibility with planned XState versioning/provenance metadata

**Exit criteria (must all be true):**
- Public stream envelope schema/design is documented and versioned.
- Verification metadata integration path is clear for both profiles.
- Privacy/redaction boundaries are explicit enough to guide implementation.
- Post-match hidden-state reveal timing policy is explicit (including `0` delay
  support and official/ranked defaults).
- Stream boundary model (private ingress + derived audience streams) is explicit,
  including which audiences may receive hidden-state-derived vs fully redacted
  events.

**Stop/resume note to record when done:**
- Commit hash
- Public vs private event scope decisions
- Deferred implementation blockers (if any)

### Unit 3 — Split Runtime FSM vs Conceptual/Doc FSM

**Goal:** Remove ambiguity between engine micro-step enforcement and
higher-level gameplay flow documentation.

**Scope:**
- Separate the enforced runtime transition graph from conceptual/documentation
  transitions, or explicitly mark conceptual shortcuts as non-runtime.
- Update comments in `engine/src/state-machine.ts` so "single source of truth"
  refers unambiguously to runtime enforcement.
- Update docs and/or doc generation so the conceptual graph no longer drifts
  from the enforced graph.

**Touch points (expected):**
- `engine/src/state-machine.ts`
- `docs/system/GAME_STATE_MACHINE.md` (or doc generation path, if applicable)
- `engine/tests/state-machine.test.ts` (if graph assertions need to split)

**QA (minimum):**
- Engine FSM tests
- Any doc generation/snapshot check used by the repo

**Exit criteria (must all be true):**
- Runtime graph and conceptual graph are clearly separated or explicitly mapped.
- No mixed conceptual/runtime edges remain in the enforced table.

**Stop/resume note to record when done:**
- Commit hash
- Which representation is authoritative for runtime vs docs
- Any follow-up doc cleanup deferred

### Unit 4 — Engine-Local Phase-Scoped Types (No Shared Schema Churn Yet)

**Goal:** Improve engine code fidelity/readability using narrower phase-aware
  types without broad protocol/schema impact.

**Scope:**
- Introduce engine-local TypeScript helper types (for example
  `ReinforcementState`, `GameOverState`, `AttackPhaseState`) and narrow selected
  logic in `engine/src/turns.ts`.
- Prioritize high-risk branches (`reinforcement`, `outcome`, end-of-turn
  victory checks).
- No shared package schema changes in this unit.

**Touch points (expected):**
- `engine/src/turns.ts`
- Optional new engine-local type helper file
- Engine tests (only if narrowing requires fixture updates)

**QA (minimum):**
- Engine tests
- Typecheck for engine package (or repo typecheck command used locally)

**Exit criteria (must all be true):**
- Critical branches in `engine/src/turns.ts` use narrower phase-aware types.
- No behavior changes; this is a type-safety/refactor unit only.

**Stop/resume note to record when done:**
- Commit hash
- Which branches were narrowed vs deferred to Unit 5
- Any type ergonomics pain points found

### Unit 5 — Shared Schema Phase Discrimination

**Goal:** Encode phase fidelity at the shared schema/type layer so invalid
phase/field combinations are rejected structurally.

**Scope:**
- Refactor `GameStateSchema` in `shared/src/schema.ts` from a broad object into a
  `phase`-discriminated union (or layered equivalent) with per-phase required /
  forbidden fields (`reinforcement`, `outcome`, etc.).
- Update impacted engine/server/client call sites and tests.
- Preserve compatibility intentionally (document any migration strategy if wire
  compatibility cannot remain exact).

**Touch points (expected):**
- `shared/src/schema.ts`
- `shared/src/types.ts` (generated/inferred type impact)
- `engine/src/*`, `server/src/*`, `client/src/*` as needed
- Cross-package tests impacted by stricter validation

**QA (minimum):**
- Shared, engine, and server test suites touching schema validation
- Any protocol serialization/parsing tests

**Exit criteria (must all be true):**
- Invalid phase/field combinations fail schema validation.
- Core engine/server flows still serialize/parse successfully.
- Migration/compat notes are documented if needed.

**Stop/resume note to record when done:**
- Commit hash
- Compatibility notes (breaking/non-breaking)
- Remaining schema fidelity improvements (if any)

**Recommendation (current path):** Execute `Unit 1 -> Unit 2A -> Unit 2` to
lock runtime observability and documentation fidelity, then run `Unit 2B` as the
first XState step (shadow/adapter only). After that, formalize verification
profiles (`Unit 2C`) before designing the public event stream envelope (`Unit 2D`).

---

## Joker Card

The Joker has 0 attack and 0 defense value, no suit, and no suit bonuses. It
is considered a "Wild" card. The specific Wild mechanic is undefined.

Ideas for the Wild mechanic:
- Copy the suit/rank of an adjacent card
- Act as a wildcard during deployment (player chooses its effective suit)
- Sacrifice to draw additional cards
- Absorb one lethal hit then discard itself

The Joker is excluded from the 52-card deck in v1. Games use a standard deck
without Jokers.

**Related rule IDs:** PHX-CARDS-004, PHX-CARDS-002 (Joker value 0)

---

## Face-Down Cards

Cards in the drawpile and discard pile are face-down. A future mechanic could
place cards face-down on the battlefield (neither player sees the value). The
face-down card still occupies its grid position and can be targeted. When it
takes damage or is otherwise revealed, it flips face-up before the effect
resolves.

No specific trigger for face-down battlefield placement is defined yet.

Ideas:
- Deploy the last 1-2 cards face-down during deployment
- A special card ability that flips a card face-down
- Reinforcement from the drawpile arrives face-down

**Related rule ID:** PHX-CARDS-003

---

## Multi-Player (3+ Players)

The grid layout is designed for head-to-head play. A future expansion could
support 3+ players with adjusted grid sizes or a shared battlefield.

---

## Heroical Mechanics (deferred — revisit when core game is stable)

Heroical is implemented (`PHX-HEROICAL-001`, `PHX-HEROICAL-002`) but is
considered **provisional**. The mechanic exists in the engine and can be
triggered during play, but it has not been balanced or extensively playtested
against the core combat loop.

**Current implementation:**
- `PHX-HEROICAL-001` — A face card (J/Q/K) in hand can be swapped onto the
  battlefield in place of an existing card during the combat phase
- `PHX-HEROICAL-002` — A Heroical swap targeting an Ace destroys the Ace
  instantly, bypassing Ace invulnerability

**Deferred work:**
- Balance review: does the hand-swap create solvable dominant strategies?
- Cost/restriction design: should Heroical consume the whole turn? Cost LP?
  Be limited to once per game?
- Interaction audit: Heroical + suit bonuses, Heroical into a reinforcement
  column, Heroical when opponent has no back row
- Exposing `heroicalSwap` as a `GameOptions` toggle (Phase 27 explicitly
  excludes this until the mechanic is stable)
- Additional rule IDs if cost/restriction mechanics are added

**Do not expand, tune, or add UI for Heroical until the core game (deployment,
combat, overflow, LP, reinforcement, victory) has been playtested and feels
right. Heroical is opt-in complexity, not a core loop dependency.**

---

## Repeated Pass Auto-Loss Rule

A player who passes their turn N consecutive times without attacking should
automatically forfeit. This prevents stalling (a player who cannot win running
down the clock indefinitely) and keeps games moving.

**Proposed rule (PHX-TURNS-002):**
- A consecutive-pass counter is tracked per player in `GameState`.
- Each time a player submits a `pass` action during their combat turn, their
  counter increments. A successful attack resets the counter to 0.
- When the counter reaches the threshold (initially **3**), the `pass` action
  is treated as a forfeit: the opponent wins via `victoryType: 'forfeit'`.
- The threshold should be a `GameOptions` field (`maxConsecutivePasses`,
  default 3) so it can be tuned or disabled per match.

**Implementation touch points:**
- `shared/src/schema.ts` — add `consecutivePasses: [number, number]` to
  `GameStateSchema`; add `maxConsecutivePasses: z.number().int().min(1).default(3)`
  to `GameOptionsSchema`
- `engine/src/turns.ts` — increment counter on pass, reset on attack, trigger
  forfeit when threshold is reached
- `engine/src/state.ts` — initialise `consecutivePasses: [0, 0]` in
  `createInitialState`
- `docs/RULES.md` — add PHX-TURNS-002 rule ID before implementing
- Tests — existing pass tests still valid; add stall-detection tests

**Design notes:**
- The counter is per-player, not shared, so both players can pass independently.
- A player with no valid attacks is already in a losing position; the auto-loss
  formalises this without requiring the opponent to do anything.
- Reinforcement passes (passing during a reinforcement phase) should NOT count
  toward the stall counter — they are structurally forced.
- If `maxConsecutivePasses: 0` is set, the rule is disabled (unlimited passing).

**Related rule IDs (to be created):** PHX-TURNS-002

---

## Card UI — Font Size Pass (Readability)

The card value (rank) and suit symbol displayed on battlefield cards need a
readability pass. At current sizes they are legible on desktop but marginal on
smaller screens and in peripheral vision during rapid play.

**Scope:**
- Increase the font size of `.card-rank` and `.card-suit` elements in
  `client/src/style.css` — prioritise rank (the combat value) over suit label
- Consider making the suit a larger Unicode glyph (♠ ♥ ♦ ♣) as the primary
  suit indicator instead of or alongside the text label
- Verify at 375px mobile viewport — suit/rank must be legible at smallest
  battlefield cell size
- Check that HP numbers (`card-hp`) remain proportional and don't crowd rank
- No engine or server changes; pure CSS

**When to do it:** Any session, low risk. Takes 15–30 minutes. Can be batched
with any client-side visual polish session.

---

## Per-Player Card Skinning / Themes

Players should be able to customise the visual appearance of their cards
independently of their opponent. This is a value-add feature with a clear
monetisation path: default themes are free, premium themes are earned as prizes
or available for purchase.

### Design goals

1. **Pure client-side rendering.** The server never knows or transmits skin data.
   Card identity (`suit`, `rank`) is unchanged — only the visual presentation
   differs. This keeps the engine and server zero-touch.
2. **No gameplay impact.** Both players always know the opponent's card values
   (the server enforces hidden information; the skin does not add fog-of-war).
3. **Composable theme system.** A theme describes the card face, back, border,
   and colour palette. Players pick one theme for "my cards" independently.
4. **Prize / purchase distribution.** Theme IDs are unlocked tokens stored
   client-side (localStorage or account). Premium themes require a valid
   unlock token. The token is never validated server-side (cheat risk is
   cosmetic only — no gameplay advantage).

### Theme anatomy

A theme is a CSS class + optional asset bundle:

| Layer | Default | Customisable |
|---|---|---|
| Card face background | `--bg-card` (dark) | colour, gradient, texture image |
| Card border | `--border` (gold) | colour, width, corner radius |
| Rank glyph | IBM Plex Mono, white | font, size, colour |
| Suit glyph | Unicode ♠/♥/♦/♣ | glyph set, colour, icon |
| Card back (drawpile display) | solid `--bg` | pattern, colour, image |
| HP bar | amber | colour scheme |

### Implementation sketch

```javascript
client/src/themes/
  index.ts         — ThemeRegistry: { id, name, cssClass, unlockRequired }[]
  default.ts       — built-in free themes (Classic, Night, Parchment)
  premium.ts       — premium theme descriptors (no assets committed until purchased)
client/src/style.css
  .theme-classic   — current default (no change)
  .theme-night     — dark blue/silver palette
  .theme-parchment — warm cream, serif rank glyphs
  .theme-[prize]   — e.g. .theme-tournament-gold for event winners
```

Each player's chosen theme class is applied to their own battlefield container
only (`#player-battlefield` vs `#opponent-battlefield`), so both themes coexist
on screen simultaneously.

### Unlock / purchase flow (future)

- **Free themes:** always available, no token required.
- **Prize themes:** distributed as a unique code after a tournament or event.
  Code stored in `localStorage['phalanx_unlocked_themes']` as a JSON array of
  theme IDs. No server validation.
- **Purchasable themes:** integrate with a payment provider (Stripe, etc.).
  On successful payment, write the theme ID to localStorage (or a future
  player account). Same local storage mechanism as prize themes.
- **Account sync (future):** if a player account system is added, unlocked
  theme IDs become a server-side field, enabling cross-device sync.

### Milestones

1. CSS theme system + ThemeRegistry with 2–3 free themes — no unlock logic
2. Theme selector in lobby/settings panel (per-player independent picks)
3. Theme persistence in `localStorage` across sessions
4. Prize/unlock token mechanism
5. Purchase integration (separate from the game repo — payment service)

**When to do it:** After core gameplay is stable and playtested. Themes are
cosmetic and carry zero technical risk to game integrity.

**Related:** card font size pass (above) should be done first — readability
baseline before layering visual themes.

---

## Other Ideas

- Player name display in waiting room *(done)*
- Mobile responsive layout *(done)*
- Match history / replay viewer *(Phase 25 — planned)*
- Spectator mode *(done — Phase 26)*
- Ranked matchmaking
- Card animations and sound effects
- Game feed (list of live matches in lobby)
