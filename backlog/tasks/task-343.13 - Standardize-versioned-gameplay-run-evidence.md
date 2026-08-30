---
id: TASK-343.13
title: Standardize versioned gameplay run evidence
status: Done
assignee:
  - '@codex'
created_date: '2026-08-04 22:39'
updated_date: '2026-08-30 14:19'
labels:
  - assurance
  - qa
  - gameplay
dependencies:
  - TASK-383
documentation:
  - docs/testing.md
  - docs/reference/qa-runners.md
  - docs/architecture/type-ownership.md
  - docs/adr/ADR-008-official-outputs-verifiable-offline.md
modified_files:
  - shared/src/run-evidence.ts
  - shared/src/schema.ts
  - shared/src/index.ts
  - shared/scripts/generate-schemas.ts
  - shared/schemas/README.md
  - shared/tests/run-evidence.test.ts
  - bin/qa/run-evidence.ts
  - bin/qa/verify-run-evidence.ts
  - bin/qa/panoramic-view.ts
  - bin/qa/simulate-headless.ts
  - bin/qa/api-playthrough.ts
  - bin/qa/verify-swiftui-proof.ts
  - docs/reference/qa-runners.md
  - docs/testing.md
  - package.json
parent_task_id: TASK-343
priority: high
type: task
ordinal: 254800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace incompatible QA runner manifests and permissive evidence readers with one validated, replay-aware run-evidence contract. The contract must let local, CI, cross-client, and controlled production automation prove what actually ran without leaking credentials or hidden player state. This is the evidence foundation for subsequent trajectory, browser-adapter, and capability-gate work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A versioned machine-readable contract records runner and release identity, scenario and seed, client and transport adapters, match and player correlation, ordered actions and events, visited phases, authoritative hashes, terminal outcome, assertion results, and artifact references
- [x] #2 Engine, live API or WebSocket, and browser run producers can round-trip their evidence through the same validator without consumer-specific shape guessing
- [x] #3 Evidence readers return nonzero for missing, malformed, empty, skipped, or internally inconsistent required proof instead of silently passing
- [x] #4 Transaction-log and replay evidence is either embedded or referenced explicitly so tactical and replay analyzers consume data that producers actually emit
- [x] #5 Publicly shareable artifacts exclude credentials, private player data, and hidden state beyond the viewer policy recorded by the run
- [x] #6 Migration and operator documentation identifies canonical producers, readers, retention behavior, and compatibility handling for historical artifacts
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory every active QA producer and reader, classify their current manifests, and select one versioned evidence contract that preserves public redaction boundaries.
2. Define a shared schema/validator for runner identity, scenario/seed, adapters, correlation IDs, ordered actions/events, phases, hashes, outcome, assertions, and artifact references.
3. Adapt the engine, API/WebSocket, and browser producers to emit the contract without duplicating hidden state or credentials; retain compatibility readers for historical artifacts.
4. Make evidence consumers fail closed for missing, malformed, skipped, or internally inconsistent proof, and add replay/transaction references plus offline integrity checks.
5. Document canonical producers, retention, compatibility, and public-sharing rules; verify with package tests, schema generation, docs artifacts, rules/playability gates, and representative Panoramic View reports.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-08-30 @codex: TASK-383 is complete and its evidence tooling is now the starting point. Initial discovery shows multiple producer-specific RunManifest shapes (`simulate-headless`, `api-playthrough`, `verify-swiftui-proof`, replay/API readers) plus the newer Panoramic View capture. Next step is to converge these at a shared versioned evidence boundary without leaking hidden state.

2026-08-30 implementation slice: added shared RunEvidenceSchema with versioned runner/scenario/adapters/correlation/actions/events/phases/integrity/outcome/assertions/artifacts/viewer-policy fields and fail-closed count/redaction checks. Added legacy manifest canonicalizer, `qa:evidence:verify`, Panoramic View emission of `run-evidence.json`, public `run-evidence.schema.json`, schema tests, and QA-runner documentation.

Verification: shared typecheck passes; shared tests 160/160; tooling lint passes; MarkdownLint passes; schema generation succeeds (7 public schemas, 78 generated types); retained presentation capture validates and writes run-evidence.json; docs generation succeeds but freshness remains pending commit of this slice.

2026-08-30 verification complete: aggregate test gate passed shared 160/160, engine 422/422, server 398/398 plus 4 migration tests, client 237/237, admin 15/15, MCP 8/8.

Final checks passed: pnpm verify:quick, pnpm schema:check, pnpm docs:check, pnpm lint:md, pnpm lint:tools, shared typecheck, and qa:evidence:verify against the retained presentation capture.

Canonical sidecars now emit from headless and bot-vs-bot capture directories as run-evidence.json, API batches as game-N.run-evidence.json, SwiftUI proof as run-evidence.json, and Panoramic View as run-evidence.json. Historical manifests remain available for compatibility.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the versioned gameplay run-evidence contract and integrated it across Panoramic View, headless browser/bot-vs-bot, API batch, and SwiftUI proof producers. Added shared schema generation, legacy normalization, fail-closed CLI verification, replay/artifact references, redaction policy, docs, and retained-capture validation. Commits: 10832bd7 and ea1a5f29 plus producer integration commit finalized after verification.
<!-- SECTION:FINAL_SUMMARY:END -->
