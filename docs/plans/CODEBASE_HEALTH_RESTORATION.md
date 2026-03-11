# Codebase Health & Reasoning Restoration Plan (2026-03-11)

## Summary of Observations

### 1. Architectural Visibility
- **Status:** Good.
- **Findings:** The system is strictly server-authoritative. Modular boundaries are well-defined in the `dependency-graph.svg`.
- **Concern:** The client package is not correctly exporting its entry points for documentation, leading to a "blind spot" in the technical reference.

### 2. Dead Code & Complexity
- **Status:** Needs Attention.
- **Findings:** Knip identified 8 unused exports and 10 unused types.
- **Concern:** These "ghost" exports increase cognitive load when reasoning about the engine's public API.

### 3. Logic Verification (Coverage)
- **Status:** **Critical Failure**.
- **Findings:** Engine branch coverage is at 71.67% (Threshold: 80%). `bot.ts` is at ~48% coverage.
- **Concern:** The AI/Bot logic is largely unverified, making it difficult to reason about its deterministic behavior or debug edge cases.

---

## Sequential Execution Plan

### Phase 1: Dead Code Elimination (Knip)
*Objective: Remove unused symbols to clarify the public API.*
1.  **Surgical Pruning:** Remove unused exports in `client/src/lobby.ts`, `engine/src/state-machine.ts`, and `server/src/match.ts`.
2.  **Type Cleanup:** Delete or internalize unused interfaces identified in `client/src/game.ts` and `server/src/abTests.ts`.
3.  **Dependency Audit:** Remove `dotenv` from `server/package.json` if confirmed redundant.

### Phase 2: Technical Reference Completion (TypeDoc)
*Objective: Ensure the documentation accurately reflects the codebase.*
1.  **Client Entry Points:** Update `client/package.json` with proper `exports` to fix TypeDoc warnings.
2.  **Type Visibility:** Export `ValidationResult` in `shared/src/gamertag.ts` so it can be documented.
3.  **Mermaid Support:** Update `typedoc.json` to correctly render architectural diagrams.

### Phase 3: Engine Logic Hardening (Vitest)
*Objective: Reach 80%+ branch coverage in the core engine.*
1.  **Bot Testing:** Create `engine/tests/bot-logic.test.ts` specifically targeting decision branches in `bot.ts`.
2.  **Combat Edge Cases:** Add tests for uncovered lines (338-354) in `engine/src/combat.ts`.

### Phase 4: Verification
1.  Re-run `pnpm knip` to ensure 0 unused exports.
2.  Re-run `pnpm docs:build` to ensure 0 warnings.
3.  Re-run `pnpm test:coverage` to verify the 80% threshold is met.
