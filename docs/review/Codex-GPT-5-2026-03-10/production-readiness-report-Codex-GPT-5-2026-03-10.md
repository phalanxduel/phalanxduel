# Production Readiness Review

Reviewer: Codex  
Model: GPT-5  
Date: 2026-03-10  
Scope: repository review of rules, engine, server, client, tests, and operational docs

Evidence reviewed:
- `docs/RULES.md`
- `docs/system/ARCHITECTURE.md`
- `docs/system/DECISIONS.md`
- `docs/system/FUTURE.md`
- `README.md`
- `shared/src/schema.ts`
- `shared/src/hash.ts`
- `engine/src/deck.ts`
- `engine/src/state.ts`
- `engine/src/turns.ts`
- `engine/src/combat.ts`
- `engine/src/replay.ts`
- `server/src/app.ts`
- `server/src/match.ts`
- `server/src/routes/stats.ts`
- `server/src/loadEnv.ts`
- selected engine/server/client/shared tests

Validation run:
- `rtk pnpm rules:check` -> passed
- `rtk pnpm --filter @phalanxduel/engine test -- replay.test.ts state-machine.test.ts` -> passed; engine suite reported 87 tests passing
- `rtk pnpm --filter @phalanxduel/server test -- replay.test.ts filter.test.ts custom-params-match.test.ts` -> passed when allowed to bind local sockets; server suite reported 157 tests passing

Fact vs inference:
- Fact: directly observed in code, docs, or test output.
- Inference: a production consequence derived from the observed implementation.

## 1. Executive Assessment

Overall judgment: not ready for production.

Why:
- The repository has a serious core worth building on: explicit rules docs, a mostly pure engine boundary, deterministic hashing, phase-trace tests, and real observability plumbing.
- The current production surface still breaks the two most important promises of this product: fair hidden-information play and trustworthy replay/audit.
- Several issues are not cosmetic. They let clients learn hidden state, submit actions as the wrong player, and make replay verification materially weaker than the rules/spec claims.

Top 5 risks:
1. Hidden information is exposed to clients over the wire.
2. The server trusts client-supplied `action.playerIndex`, which weakens authoritative control.
3. Replay of live matches is not currently trustworthy because the live timestamp inputs used to generate card IDs are not preserved and replay does not validate against stored hashes.
4. The product surface advertises dynamic/custom grids, but combat resolution is still effectively hard-coded to front/back two-rank columns.
5. The canonical event/audit model described in `docs/RULES.md` is not implemented in the runtime payloads; the declared event schema is mostly unused.

Recommended readiness label:
- Not ready for production.

What would move it to limited production:
- Eliminate hidden-state leakage.
- Bind actions to the authenticated socket/player server-side.
- Make replay deterministic from persisted canonical inputs and verify against stored hashes.
- Narrow feature surface to rules the engine fully supports, or finish dynamic-grid combat support.
- Either implement the canonical event model or rewrite the rules/docs to reflect the actual audit contract.

## 2. Architecture and System Boundaries

Current state:
- Fact: package boundaries are clearly intended and mostly clean. README and architecture docs separate `shared/`, `engine/`, `server/`, and `client/` responsibilities (`README.md`, `docs/system/ARCHITECTURE.md`).
- Fact: `eslint.config.js` restricts engine imports from `@phalanxduel/server` and `@phalanxduel/client`, which is the right architectural guardrail for a deterministic core.
- Fact: `engine/src/state-machine.ts` explicitly calls itself the runtime transition authority and is tied to rules/doc consistency via `scripts/ci/verify-doc-fsm-consistency.ts`.

Where the boundaries break down:
- Fact: the server broadcast layer repackages the canonical game state incorrectly. `server/src/match.ts:552-583` sends `preState: match.state` even though that object is already the current post-action state, and then sends a separately filtered `postState`.
- Fact: the authoritative server boundary is weak because `server/src/app.ts:789-872` forwards the client action largely unchanged, and `server/src/match.ts:440-466` never checks that the socket owner matches `action.playerIndex`.
- Fact: match parameter authority is split. `shared/src/schema.ts:164-242` defines the authoritative schema and 48-slot cap, but `server/src/match.ts:90-107` performs its own normalization without calling that schema, and `server/src/app.ts:298-309` publishes a conflicting 144-slot note.

Assessment:
- Architecture is directionally good at the package level.
- The runtime trust boundary is not good enough for a competitive authoritative game.
- There is not one fully enforced source of truth for match creation and runtime wire contracts.

Recommendations:
- Derive `playerIndex` from the socket/session on the server. Do not trust `action.playerIndex` from the client.
- Stop sending `preState` externally until there is a real, filtered pre-state use case.
- Validate match creation against `MatchParametersSchema` or a server-owned schema derived from it, rather than normalizing by hand.
- Collapse `/matches/:matchId/replay` and `/api/matches/:matchId/verify` into one clearly scoped verification surface with a single auth policy.

## 3. Determinism and Rule Fidelity

What is strong:
- Fact: `engine/src/deck.ts` uses a seeded deterministic shuffle.
- Fact: `shared/src/hash.ts` sorts object keys recursively before hashing.
- Fact: `engine/src/turns.ts` records `stateHashBefore`, `stateHashAfter`, and `phaseTrace`.
- Fact: engine tests cover replay, pass rules, state-machine edges, face cards, and simulation.

Critical determinism gaps:
- Fact: initial draw card IDs depend on `drawTimestamp`, and `engine/src/state.ts:126` falls back to `new Date().toISOString()` when it is absent.
- Fact: `server/src/match.ts:404-415` persists a `GameConfig` without `drawTimestamp`.
- Fact: `engine/src/replay.ts:29-39` recreates initial state from that config, so replay lacks the original draw timestamp input.
- Fact: per-turn draw IDs also depend on the "frozen" turn timestamp. `engine/src/turns.ts:225` uses `options?.timestamp ?? action.timestamp`. Live server play overrides that timestamp with `new Date().toISOString()` in `server/src/match.ts:458-463`, while replay uses the client action timestamp because `engine/src/replay.ts:37-38` passes only `hashFn`.
- Inference: once a live match contains deploy/reinforce actions that reference drawn card IDs, replay from persisted `match.config + actionHistory` is likely to diverge from the original live card IDs.

Rule-fidelity gaps:
- Fact: `docs/RULES.md` Section 8 defines a general target chain over rank 0 through rank N-1.
- Fact: `engine/src/combat.ts:92-163` resolves only a front slot and one back slot.
- Fact: the client and server expose 1..12 rows and columns (`client/src/lobby.ts:294-295`, `client/src/lobby-preact.tsx:76-77`, `server/src/app.ts:303-304`).
- Inference: custom grids above two rows are partially supported in state/deployment helpers but not fully implemented in combat resolution. That means a visible product feature surface exceeds the rules engine's proven behavior.
- Fact: the card ID format in `engine/src/state.ts:167-170` appends `::${i}` while `docs/RULES.md` Section 2.1 documents a five-part template without that suffix.

Recommendations:
- Persist a canonical `drawTimestamp` at match creation/start and a canonical per-turn frozen timestamp for every applied action. Replay must use those persisted values, not fresh clocks.
- Add a "replay from persisted live match" test at the server layer that creates a real match, captures persisted config/state/action history, and replays it.
- Either remove multi-row custom matches from the UI/server until combat supports arbitrary rank chains, or finish the combat/generalized cleanup implementation and add scenario tests for 3-row+ games.
- Treat card ID format as a versioned contract and align docs and implementation immediately.

## 4. Event Model, Logging, Replay, and Auditability

Current state:
- Fact: `docs/RULES.md` Section 17 specifies a hierarchical event model with event/span IDs, parent IDs, names, timestamps, payloads, and status.
- Fact: `shared/src/schema.ts:102-115` defines `PhalanxEventSchema`, but runtime usage is effectively absent.
- Fact: the websocket payload built in `server/src/match.ts:558-583` always sends `events: []`.
- Fact: `shared/src/schema.ts:405-413` defines `phaseTraceDigest`, but I did not find any runtime producer for it.
- Fact: the client narration and battle log systems consume `transactionLog`, not canonical emitted events (`client/src/narration-producer.ts:73-115`, `client/src/game.ts:399-403`, `client/src/game-preact.tsx:373-377`).

Replay endpoint quality:
- Fact: `/matches/:matchId/replay` and `/api/matches/:matchId/verify` both just re-run `replayGame(...)` and return `finalStateHash` (`server/src/app.ts:454-462`, `server/src/routes/stats.ts:34-42`).
- Fact: neither endpoint compares replayed hashes to persisted `transactionLog.stateHashAfter`, persisted final state, or persisted phase traces.
- Fact: `server/tests/replay.test.ts` only covers Basic Auth behavior, not replay correctness against a real stored match.

Assessment:
- Auditability is currently centered on transaction log snapshots plus operational telemetry, not the canonical event model promised in the rules.
- Debug/ops telemetry and match truth are conceptually adjacent but not cleanly separated in the documentation or runtime contract.
- The current replay endpoint is a diagnostic helper, not a proof-grade verifier.

Recommendations:
- Decide what the canonical audit artifact is now: versioned event stream, versioned transaction log, or both. Then make docs, schema, and runtime match that decision.
- If `transactionLog` remains canonical, document it as canonical and remove the unused span/event claims from `docs/RULES.md`.
- If the event model remains the target, implement event emission before claiming replay/audit readiness.
- Extend replay verification to compare:
  - persisted final state hash vs replayed final state hash
  - persisted per-transaction hashes vs replayed hashes
  - persisted phase trace or digest vs replayed phase trace or digest
- Add an explicit schema version for audit envelopes and verification profile metadata.

## 5. Test Strategy and Correctness Guarantees

What is strong:
- Fact: engine coverage includes state-machine edges, replay, simulations, pass rules, face cards, bots, and dynamic-grid state helpers.
- Fact: `engine/tests/fsm-trace-fixtures.test.ts` and `scripts/ci/verify-doc-fsm-consistency.ts` are unusually valuable because they connect docs and runtime phase behavior.
- Fact: server tests cover websocket flow, filtering, health, telemetry, replay route auth, auth routes, metrics, and ladder logic.

Where the suite is still not proving the most important things:
- Fact: `engine/tests/replay.test.ts` passes because it injects a fixed `drawTimestamp` in test config (`engine/tests/replay.test.ts:15`), which is not how live server matches are persisted.
- Fact: I found no test asserting that a real live match created through `MatchManager` can be replayed from persisted data without ID drift.
- Fact: I found no websocket or match-manager test asserting that a player cannot submit an action with the opponent's `playerIndex`.
- Fact: I found no websocket payload test asserting that hidden state is absent from every outbound field, including `preState`.
- Fact: dynamic-grid tests focus on state helpers, not multi-rank combat behavior.
- Fact: `server/tests/defaults-endpoint.test.ts` does not assert the published total-slot note, so the 48 vs 144 drift is currently invisible to tests.

Recommendations:
- Add a server integration test for "player 0 socket attempts `forfeit` with `playerIndex: 1`" and require rejection.
- Add websocket payload redaction tests that inspect both `preState` and `postState`, not just `postState`.
- Add a "persisted live match replay" golden test from `MatchManager` output.
- Add dynamic-grid combat tests for 3-row+ attack chains or disable the feature until those tests exist.
- Add a regression test that asserts `/api/defaults` reflects the same constraints as `MatchParametersSchema`.

## 6. Documentation as a Production Asset

What is strong:
- Fact: `docs/RULES.md` is easy to locate and clearly intended to be canonical.
- Fact: `docs/system/DECISIONS.md` is a strong asset. It explicitly distinguishes rules authority, schema authority, runtime FSM authority, and descriptive docs.
- Fact: README points new engineers to rules and architecture docs quickly.

What is weak:
- Fact: `CONTRIBUTING.md` points to `docs/system/CONTRIBUTING.md`, but that file does not exist.
- Fact: README says "Node.js >= 20" while `package.json` pins `24.14.0` (`README.md:13`, `package.json:6`).
- Fact: `/api/defaults` publishes `rows * columns <= 144` while the authoritative schema and rules say 48 (`server/src/app.ts:308`, `shared/src/schema.ts:194-199`, `docs/RULES.md` Section 3.3).
- Fact: I found no glossary, player mental-model doc, or concise contributor onboarding doc explaining terms like phalanx, target chain, reinforcement, collapse, and suit-boundary semantics.
- Fact: `docs/system/FUTURE.md` explicitly lists verification profile design and public event-stream design as still pending (`docs/system/FUTURE.md:203-205`, `docs/system/FUTURE.md:495-540`).

Assessment:
- Documentation quality is above average for an early project, but it is not yet reliable enough to serve as production infrastructure for a niche deterministic game.
- The repo teaches the engine author better than it teaches a new contributor or a new player.

Recommendations:
- Fix broken doc links immediately.
- Add a short glossary and "how to think about a turn" explainer separate from the full rules spec.
- Add a contributor onboarding doc that covers local setup, required Node version, checks to run, and where rules/runtime/contracts live.
- Keep `docs/RULES.md` normative, but add a derived traceability table from major rule sections to engine tests.

## 7. Code Quality and Maintainability

What is strong:
- Fact: package boundaries and naming are mostly coherent.
- Fact: schema-first shared types and hash utilities are a maintainable foundation.
- Fact: state-machine data in `engine/src/state-machine.ts` is cleaner than burying phase logic implicitly in conditionals.

Hotspots:
- Fact: `engine/src/turns.ts` is a large multifunction file handling validation, phase transitions, victory checks, hashing, replay metadata, pass rules, and draw behavior.
- Fact: `server/src/match.ts` mixes match lifecycle, websocket broadcasting, secrecy filtering, persistence orchestration, bot scheduling, and ladder side effects.
- Fact: the event schema exists but is not integrated, which creates dead abstraction weight.
- Fact: there are two replay/verify routes with nearly identical bodies (`server/src/app.ts`, `server/src/routes/stats.ts`).

Recommendations:
- Split `engine/src/turns.ts` into explicit submodules for validation, transition orchestration, turn-finalization, and replay metadata.
- Split `server/src/match.ts` into:
  - action authorization
  - secrecy filtering / outbound projection
  - persistence / replay verification
  - bot orchestration
- Remove or implement unused event/audit schema pieces so the code reflects actual truth.

## 8. Operational Readiness

What is strong:
- Fact: the server has health, OpenAPI, OTEL tracing/metrics, Sentry integration, and an admin dashboard.
- Fact: there are Drizzle migrations and Fly deploy scripts.
- Fact: server observability test coverage is materially better than typical early-stage hobby projects.

What is still missing:
- Fact: `server/src/app.ts:167` falls back to `'phalanx-dev-secret'` for JWT signing if `JWT_SECRET` is absent.
- Fact: `server/src/loadEnv.ts` loads env files but does not enforce a required-production-env contract.
- Fact: I did not find an operator runbook or rollback guide under `docs/`.
- Fact: replay/verification support is not strong enough yet for match-dispute resolution.

Recommendations:
- Fail fast on startup in production if required secrets are missing.
- Replace the JWT fallback with a dev/test-only branch.
- Add a short production runbook covering env, migrations, deploy, rollback, replay verification, and dispute investigation.
- Promote replay verification and hidden-state integrity checks to release gates.

## 9. Security and Fair Play Considerations

This is the weakest area of the current codebase.

Critical findings:
- Fact: outbound game-state messages include `preState: match.state` in `server/src/match.ts:561` and `server/src/match.ts:579`. That object is not filtered for hidden information.
- Fact: even the explicit filtering helpers only remove `hand` and `drawpile`; they preserve `deckSeed` because they spread the remaining player state (`server/src/match.ts:118-129`, `server/src/match.ts:133-146`, `shared/src/schema.ts:332`).
- Fact: `engine/src/deck.ts` makes deck order reconstructable from a seed and canonical deck order.
- Inference: any client or spectator that can observe `preState` or player `deckSeed` can reconstruct hidden cards and future draws. That is a direct fair-play failure for a competitive game.
- Fact: `server/src/app.ts:789-872` and `server/src/match.ts:440-466` do not bind the submitted action to the socket owner's player index.
- Inference: a connected player can submit `pass`, `attack`, or `forfeit` as the opponent whenever the opponent is the active player. Deploy/reinforce abuse is constrained by hidden card IDs, but pass/forfeit abuse is immediate and severe.
- Fact: `server/src/app.ts:167` uses a default JWT secret outside any explicit dev/test guard.

Recommendations:
- Remove `preState` from external messages until a filtered and justified version exists.
- Strip `deckSeed` and any other hidden-state reconstruction fields from all non-authoritative outbound payloads.
- Derive the authoritative actor from the socket/session and overwrite or ignore `action.playerIndex`.
- Add wire-level redaction tests and adversarial action-auth tests before launch.
- Require production JWT secret configuration.

## 10. Product and Contributor Readiness

Current impression:
- Fact: the repository communicates more seriousness than a throwaway prototype. The rules spec, architecture notes, tests, and telemetry work are real assets.
- Fact: the repo still feels like an advanced prototype rather than a production game platform because the public feature surface outruns the validated authority model.
- Fact: there is enough structure for contributors to see intent, but not enough onboarding to help them contribute safely without oral history.

Recommendations:
- Polish trust-critical surfaces first, not cosmetic ones: secrecy, authority, replay, and rules traceability.
- Add a newcomer doc for engineers and a concise player explainer for the domain vocabulary.
- Mark unfinished feature surfaces explicitly. If dynamic grids are experimental, say so in the UI/docs or hide them.

## 11. Production Readiness Scorecard

| Area | Score (1-5) | Notes | What moves it up one level |
| --- | --- | --- | --- |
| Architecture clarity | 4 | Package structure and authority docs are good. Runtime trust boundary is not. | Bind socket identity to authoritative actions and unify match-parameter validation. |
| Determinism confidence | 2 | Engine core is deterministic when fully specified, but live replay inputs are not fully preserved. | Persist canonical draw/turn timestamps and replay against them. |
| Rule fidelity confidence | 2 | Strong for the default two-rank path; weak for exposed dynamic-grid/custom rules surface. | Either disable unsupported grid shapes or add generalized combat + tests. |
| Replay/audit readiness | 1 | Replay endpoints are diagnostic, not proof-grade. Event model is not implemented. | Compare replay against persisted hashes/traces and version the audit contract. |
| Test maturity | 3 | Better than average, especially in engine and observability. Missing adversarial and real-match replay tests. | Add fair-play/auth, redaction, and persisted-match replay tests. |
| Documentation quality | 3 | Canonical rules and decisions docs are strong; onboarding and drift control are incomplete. | Fix broken links/drift and add glossary + contributor onboarding. |
| Operational readiness | 3 | Health, telemetry, migrations, and deploy scripts exist. Env validation/runbooks do not. | Add startup env validation and operator runbooks. |
| Security/fair-play posture | 1 | Hidden-state leakage and action impersonation are production blockers. | Fix payload secrecy, bind actor identity server-side, remove default JWT secret. |
| Maintainability | 3 | Solid foundation, but key orchestration files are overloaded and audit abstractions are half-implemented. | Split hotspots and eliminate unused/fictional abstractions. |
| Onboarding clarity | 2 | README points to the right docs, but player/contributor learning path is incomplete. | Add concise onboarding docs and glossary. |

## 12. Concrete Deliverables

### Top 10 observations

1. The repository has a credible deterministic-engine architecture on paper and in package boundaries.
2. The strongest current assets are `docs/RULES.md`, `docs/system/DECISIONS.md`, `engine/src/state-machine.ts`, and the phase-trace tests.
3. Hidden-state secrecy is currently broken by outbound payload design.
4. Server-authoritative intent handling is currently undercut by trusting `action.playerIndex`.
5. Replay verification is weaker than the project claims because live-match timestamps used for card IDs are not preserved in replay inputs.
6. The canonical event model is declared in docs and schema but not implemented in runtime payloads.
7. The repo exposes dynamic/custom grid options more broadly than the combat engine appears to support.
8. Match-parameter authority is split across docs, shared schema, client limits, server defaults metadata, and server normalization code.
9. Observability is a relative strength: OTEL, Sentry, health, metrics, and admin/dashboard support are already present.
10. Contributor/player onboarding is incomplete, with at least one broken link and no glossary.

### Top 10 recommendations

1. Stop transmitting raw `preState` externally.
2. Remove `deckSeed` from all player/spectator payloads.
3. Bind the acting player to the socket/session server-side and ignore client `playerIndex`.
4. Persist canonical initial-draw and per-turn frozen timestamps and use them in replay.
5. Make replay verification compare against stored hashes and phase traces, not just recomputed final state.
6. Implement or explicitly defer the event model; do not keep it half-declared.
7. Validate match parameters through the authoritative schema and fix the 48 vs 144 drift.
8. Disable or hide multi-row custom grids until combat supports them.
9. Remove the production JWT fallback secret and add required-env startup validation.
10. Add a glossary, contributor onboarding doc, and rules-to-tests traceability doc.

### Critical blockers before production

- Hidden information leakage through outbound game-state payloads.
- Client ability to submit actions as the other player.
- Replay inputs are insufficient to reproduce live card IDs and therefore do not justify production replay claims.
- Dynamic-grid feature surface exceeds validated combat behavior.
- Canonical audit/event contract is not implemented.
- Production secret handling is incomplete due JWT fallback behavior.

### What is surprisingly strong

- The repository already distinguishes rules authority, schema authority, runtime FSM authority, and descriptive docs.
- The engine/state-machine test surface is materially stronger than a typical early-stage game project.
- Operational telemetry and admin/support hooks are ahead of the current fair-play/readiness level.
- The project owner is already documenting future verification/profile work explicitly rather than hand-waving it away.

### What can wait until after launch

- Public event-stream design for external analytics consumers, once internal canonical replay is fixed first.
- Ranked/official verification profile expansion, after casual authoritative play is secure.
- UI/A/B experimentation polish.
- Additional admin dashboard refinement.
- Deeper ladder/ranking work beyond current persistence basics.

### Suggested remediation sequence

1. Fix secrecy: remove `preState`, `deckSeed`, and any other hidden-state leakage from external payloads.
2. Fix authority: bind actions to the authenticated socket/player and add adversarial tests.
3. Fix replay inputs: persist canonical timestamps and add real persisted-match replay tests.
4. Fix replay verification: compare against stored per-turn hashes/traces and return meaningful mismatch reports.
5. Reduce feature surface to validated rules: disable unsupported multi-row/custom grid modes or finish generalized combat support.
6. Resolve spec/runtime drift: card ID format, total-slot limits, match-parameter validation, `/api/defaults`, broken doc links.
7. Harden production config: required env validation, no default JWT secret in production, explicit operator runbook.
8. Decide the canonical audit artifact and make docs/schema/runtime agree.

## Final Verdict

Final verdict: not ready for production.

This codebase is closer to "serious pre-production engine with promising platform scaffolding" than to "production-ready competitive game service." The foundation is real, and some of it is unusually thoughtful. The blockers are concentrated in exactly the areas that matter most for a deterministic competitive game: secrecy, authoritative action ownership, replay trust, and audit clarity. Those should be treated as launch-gating work, not backlog polish.
