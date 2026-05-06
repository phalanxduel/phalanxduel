---
title: "Phalanx Duel — Test Council Audit"
date: "2026-04-13"
auditor: "Codex Test Council"
status: "action-required"
related:
  - reports/qa/final-audit.md
  - reports/qa/rule-traceability.md
  - docs/reference/test-constitution.md
---

# Phalanx Duel — Test Council Audit

## Executive Verdict

| Dimension | Verdict |
| --- | --- |
| Release trustworthiness | Yellow/Red |
| Fairness trustworthiness | Yellow/Red |
| Determinism trustworthiness | Yellow |
| Replay trustworthiness | Yellow |
| Test suite trustworthiness | Yellow/Red |

Core truth:

- Engine proves important deterministic behavior.
- Server proves basic authority and reconnect behavior.
- Browser path does not prove end-to-end player truth.
- CI green does not mean fairness green.

Top systemic risks:

1. Protected CI omits strongest fairness gates.
2. Replay proof is mostly self-consistency proof.
3. Browser QA proves movement and selectors more than game semantics.
4. Protocol does not bind actions to authoritative turn or state version.
5. Test architecture is drifting through copied builders, copied socket doubles, and cross-package test imports.

## Repository Test Surface

- Root governance: [package.json](../../package.json), [bin/check](../../bin/check), [bin/test](../../bin/test)
- Engine rules and replay: [engine/tests](../../engine/tests)
- Server authority and transport: [server/tests](../../server/tests)
- Client render and connection tests: [client/tests](../../client/tests)
- Shared schema and hash tests: [shared/tests](../../shared/tests)
- QA harnesses: [bin/qa](../../bin/qa)
- CI verification scripts: [scripts/ci](../../scripts/ci)

Present categories:

- deterministic engine tests
- replay tests
- server WS and REST integration tests
- client jsdom tests
- QA playthrough scripts
- schema and doc drift checks

Missing or weak categories:

- property-based gameplay invariants
- protocol stale or late action tests
- built-package fidelity checks
- browser authoritative end-to-end trust gate
- open-handle and process-leak checks
- mutation-style false-green resistance

## Known-Knows

| Behavior | Evidence | Confidence | Fragility notes |
| --- | --- | --- | --- |
| Engine replay stays deterministic on seeded paths | [engine/tests/replay.test.ts](../../engine/tests/replay.test.ts), [bin/qa/replay-verify.ts](../../bin/qa/replay-verify.ts) | High | Same-engine oracle, not independent model |
| Golden engine scenarios cover real combat semantics | [engine/tests/golden-scenarios.test.ts](../../engine/tests/golden-scenarios.test.ts) | Medium/High | Many cases still curated, not generated |
| Server rejects basic spoofing and malformed action paths | [server/tests/security-spoofing.test.ts](../../server/tests/security-spoofing.test.ts), [server/tests/action-endpoint.test.ts](../../server/tests/action-endpoint.test.ts) | High | Does not cover stale or late legal action windows |
| Reconnect timeout and forfeit path exist | [server/tests/reconnect.test.ts](../../server/tests/reconnect.test.ts), [server/src/match.ts](../../server/src/match.ts) | Medium/High | Timer-heavy proof, no full restart plus action scenario |
| API-only live playthrough completes matches | [artifacts/playthrough-api/api-1776041311053/summary.json](../../artifacts/playthrough-api/api-1776041311053/summary.json) | Medium | Browser player path still unproven |

## Known-Unknowns

| Area | Why uncertain | Current evidence | Missing proof | Severity | Fairness impact |
| --- | --- | --- | --- | --- | --- |
| Browser journey | Latest UI artifact failed before gameplay | [artifacts/playthrough/2026-04-11T15-18-15-179Z_1775920694942_classic_lp20/manifest.json](../../artifacts/playthrough/2026-04-11T15-18-15-179Z_1775920694942_classic_lp20/manifest.json) | Stable lobby-to-game-over browser run | High | Real players can fail before tests do |
| Protocol freshness | Action payload has no turn nonce or state token | [shared/src/schema.ts](../../shared/src/schema.ts), [client/src/connection.ts](../../client/src/connection.ts) | Negative tests and wire contract | High | Late intent can apply in wrong legal window |
| Attack symmetry | Many tests stay on player 0 and column 0 | [engine/tests/rules-coverage.test.ts](../../engine/tests/rules-coverage.test.ts) | Matrix over player and column symmetry | High | One-sided combat bugs can hide |
| Type-state legality | Shared state model is broad object, not discriminated phase model | [shared/src/schema.ts](../../shared/src/schema.ts) | Contradictory state rejection by type and schema | Medium/High | Impossible state can cross boundaries |
| Package fidelity | Vitest rewrites to TS source | [scripts/build/resolve-source.ts](../../scripts/build/resolve-source.ts) | Built export lane | Medium | Published package drift can ship |

## Unknown-Unknown Candidates

| Blind spot | Why invisible today | Likely failure mode | Fairness impact | Discovery method | Priority |
| --- | --- | --- | --- | --- | --- |
| Duplicate action receipt replay | Duplicate join covered, duplicate action not covered | Extra fanout or wrong duplicate behavior | Medium | WS duplicate action test | High |
| Reconnect plus queued action plus restart | Pieces tested separately | Desync or stale action acceptance | High | Integrated scenario harness | High |
| UI selector drift | Browser QA uses classes and copy | False red or false green | Medium | Test-id only runner path | Medium |
| Built-package export drift | Source rewrite bypasses dist | Consumers break while tests stay green | Medium | Dist smoke lane | Medium |
| Contradictory phase payloads | Schema allows loose combinations | Illegal server payloads look valid | High | Phase-aware schema tests | High |

## Shadow Work Audit

| Dimension | Score | Notes |
| --- | --- | --- |
| Rejection integrity | 3/5 | Good auth rejection, weak stale or late action proof |
| Rollback and state preservation | 3/5 | Ledger rollback exists, leak-proof broadcast proof missing |
| Failure containment | 3/5 | Unrecoverable match quarantine exists, UI cleanup weaker |
| Timeout discipline | 2/5 | Many sleeps, ad hoc timers, incomplete cleanup |
| Duplicate or stale action discipline | 2/5 | Protocol blind spot |
| Impossible-state prevention | 2/5 | Types annotate more than prevent |
| Cross-layer truth alignment | 3/5 | Engine and server align better than browser |
| Fixture honesty | 2/5 | Many hand-built states and copied doubles |
| Negative-path depth | 3/5 | Better on server auth than session fairness |
| Observability quality | 3/5 | Headless and API better than UI |
| CI truthfulness | 2/5 | Main green path omits hardest trust checks |
| Fairness protection | 2.5/5 | Core authority good, protocol and browser proof weak |

## Most Dangerous False Greens

1. [server/tests/openapi.test.ts](../../server/tests/openapi.test.ts) snapshots generated spec from same app.
2. [server/tests/client-compatibility.test.ts](../../server/tests/client-compatibility.test.ts) proves artifact strings, not runtime truth.
3. [engine/tests/state-machine.test.ts](../../engine/tests/state-machine.test.ts) mutates phase directly, then claims transition coverage.
4. [engine/tests/replay.test.ts](../../engine/tests/replay.test.ts) proves deterministic replay, not semantic correctness.
5. [bin/check](../../bin/check) sounds like full trust gate but omits replay, coverage, and playthrough truth gates.
6. [bin/qa/simulate-ui.ts](../../bin/qa/simulate-ui.ts) is browser smoke and diagnostics, not semantic authority proof.

## Tooling Recommendations

Add:

- `fast-check` or equivalent for generated invariants
- built-package CI lane
- open-handle or leaked-resource detection
- durable UI QA artifact bundle

Remove or reduce:

- copied per-file gameplay builders
- CSS-class control selectors in browser runners
- full-object fixture equality where semantic assertions matter more

Standardize:

- package-local `tests/testkit`
- one canonical attack-resolution matrix
- one canonical reconnect plus restart plus queued action scenario
- artifact completeness policy for QA runs

Forbid:

- fairness-critical tests that only assert DOM shape
- new protocol changes without stale or duplicate negative tests
- hidden cross-package source imports outside explicit integration suites

## Prioritized Backlog Focus

Highest-priority `To Do` order now should be:

1. `TASK-232` — protocol freshness and reliable replay semantics
2. `TASK-233` — make gameplay trust gates part of protected CI
3. `TASK-234` — browser QA authoritative waits and failure bundles
4. `TASK-235` — property-based gameplay invariants and replay-prefix suites
5. `TASK-236` — test architecture and type-state boundary hardening
6. `TASK-198` — adversarial server-authority CI suite
7. `TASK-205` — missing golden scenarios
8. `TASK-206` — replay validation in CI

## Constitution

Durable policy lives in [docs/reference/test-constitution.md](../../docs/reference/test-constitution.md).
