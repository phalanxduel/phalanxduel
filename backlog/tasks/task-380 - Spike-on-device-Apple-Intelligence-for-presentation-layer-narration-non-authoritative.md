---
id: TASK-380
title: >-
  Spike: on-device Apple Intelligence move-recommender for the SwiftUI client
  (non-authoritative)
status: To Do
assignee: []
created_date: '2026-07-26 19:55'
updated_date: '2026-07-27 00:08'
labels:
  - swiftui
  - exploratory
dependencies: []
references:
  - docs/architecture/principles.md
  - docs/architecture/versioning.md
priority: low
type: spike
ordinal: 247800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Explore Apple's Foundation Models framework (`import FoundationModels`, macOS 26+/Apple Intelligence-capable hardware) as a third "brain" tier for Phalanx Duel opponents, alongside the two that already exist server-side: Anthropic and local llama.cpp, selected via `ANALYSIS_PROVIDER` in `mcp/src/tools/analysis.ts` (`engine_llm_recommend`, `match_analyze`). This started as presentation-layer narration only; scope now extends to genuine on-device move recommendation, since the existing `engine_llm_recommend` pattern already proves this is safe: the LLM never computes game state or invents legal actions — it only picks an index from a list of actions the engine already validated (`candidateActions`/`getValidActions`), same as `engine_bot_recommend`'s MCTS/heuristic path. Apple Intelligence fits the same slot, just running client-side instead of via the MCP server.

Concretely: build a position-summary prompt in Swift analogous to `buildRecommendPrompt` (LP totals, battlefield card counts, hand size, phase/turn, legal action list with suit-bonus hints), call Foundation Models with a `@Generable` struct constraining the response to a valid action index + one-sentence reasoning (mirrors `parseActionChoice`'s JSON-with-fallback-to-index-0 parsing, but structured generation should make that fallback path unnecessary), then submit the chosen action through the normal authenticated match/WebSocket flow — same trust boundary as a human player. Must not touch `validActions` computation or any gameplay/replay-relevant logic directly, per `docs/architecture/principles.md`'s server-authoritative model and `docs/architecture/versioning.md`'s deterministic-replay requirement — the model recommends within an already-validated action set; it never decides validity or computes state.

Narration/flavor-text use (the original scope of this task) remains a valid, lower-risk secondary use of the same on-device access and can ship independently/first if the move-recommender proves harder to scope.

Must handle unavailability gracefully: check `SystemLanguageModel.availability` and hide/disable the on-device opponent option (falling back to narration-only or no on-device AI feature at all) on hardware/OS versions without Apple Intelligence — same "alpha, disclose the limits" standard applied to ad-hoc signing and unnotarized builds elsewhere in game-swiftui.

Still exploratory/low priority — no committed timeline. This is the kind of feature that makes the AI-diversity story real rather than marketing: cloud opponent (Claude), local-network opponent (llama.cpp via zdots), fully on-device opponent (Apple Intelligence), same rules, swappable brain.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Foundation Models availability is checked at runtime (SystemLanguageModel.availability) with a clean, disclosed fallback when unavailable — never a silent failure or crash
- [ ] #2 The on-device model only ever selects from a server-validated legal-action list; it has no code path that computes or overrides game state, validity, or the replay-relevant transaction log
- [ ] #3 Chosen actions are submitted through the same authenticated match/WebSocket flow a human player uses, with no special-cased server trust for AI-originated moves
- [ ] #4 A spike report (design doc or PR description) documents Foundation Models availability constraints (OS/hardware), latency observed, and whether structured @Generable output reliably avoids invalid action indices
- [ ] #5 Narration/flavor-text use case (original task scope) is still explicitly in scope as a lower-risk fallback if the move-recommender proves too complex to land in one pass
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
