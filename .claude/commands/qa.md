---
description: "Run game smoke test and report what works vs what breaks"
model: sonnet
allowed-tools: "Read, Write, Edit, Bash, Grep, Glob"
---

Run a quick QA smoke test against the Phalanx game engine. This writes a temporary integration test, executes it, reports results, and cleans up.

## Steps

1. Read `engine/src/index.ts` to discover what functions are currently exported
2. Read `shared/src/types.ts` for available type definitions
3. Write `engine/tests/qa-smoke.test.ts` — a temporary test that exercises the full game flow:
   - Create a deck (PHX-CARDS-001)
   - Shuffle with seed (determinism)
   - Draw 12 cards (PHX-DEPLOY-001)
   - Deploy to 2×4 grid (PHX-DEPLOY-001)
   - Execute an attack (PHX-COMBAT-001)
   - Check victory condition (PHX-VICTORY-001)
4. Run `pnpm test:engine -- qa-smoke` and capture output
5. **Delete** `engine/tests/qa-smoke.test.ts` (always, even on failure)
6. Report results

## Report Format

```markdown
## QA Smoke Test Report

| Step | Rule | Description | Status |
|------|------|-------------|--------|
| 1 | PHX-CARDS-001 | Create deck | PASS/FAIL/MISSING |
| 2 | — | Deterministic shuffle | PASS/FAIL/MISSING |
| 3 | PHX-DEPLOY-001 | Draw cards | PASS/FAIL/MISSING |
| 4 | PHX-DEPLOY-001 | Deploy to grid | PASS/FAIL/MISSING |
| 5 | PHX-COMBAT-001 | Basic attack | PASS/FAIL/MISSING |
| 6 | PHX-VICTORY-001 | Victory check | PASS/FAIL/MISSING |

### Missing Functions
(List functions that don't exist yet)

### Failing Steps
(Error messages for each failure)

### Summary
- **Implemented:** X/6 steps
- **Next function needed:** <name> for <rule ID>
```

## Rules

1. **Always clean up** the temporary test file, even if tests fail.
2. **Adapt imports** to what actually exists — read the exports first.
3. **MISSING** = function not exported. **FAIL** = exists but wrong behavior.
4. Do not fix anything. Report only.
