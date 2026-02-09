---
description: "TDD implementation of a game rule: write failing test, then implement"
argument-hint: "<PHX-CATEGORY-NNN>"
model: sonnet
allowed-tools: "Read, Write, Edit, Bash, Grep, Glob"
---

Implement the game rule: $ARGUMENTS

This MUST follow strict TDD. Do not write implementation before a failing test exists.

## Step 1: Understand the rule

- Read `docs/RULES.md` and find the rule by ID ($0)
- Read `docs/TESTPLAN.md` to find the expected test file
- Read any existing test stubs referencing this rule ID
- Read `engine/src/` to understand current engine exports and patterns
- Read `shared/src/schema.ts` to understand available types

If the rule has a **TODO: finalize** marker with unresolved questions, STOP and report what needs to be decided before implementation can proceed.

## Step 2: Write the failing test

- Convert any `.todo()` stubs for this rule ID into real test cases with assertions
- Use AAA style (Arrange / Act / Assert) for engine tests
- Create a dedicated test file if the rule warrants it (e.g., `engine/tests/deploy.test.ts`)
- Test both the happy path AND at least one validation/rejection case
- Run `pnpm test:engine` — tests MUST FAIL (red phase)

## Step 3: Implement the minimum code

- Add or modify functions in `engine/src/` to make the failing tests pass
- All engine functions must be pure and deterministic:
  - Input: `GameState` + action parameters
  - Output: new `GameState`
  - No side effects, no I/O, no randomness (RNG is injected via seed)
- Export new functions from `engine/src/index.ts`

## Step 4: Verify (green phase)

- Run `pnpm test:engine` — all tests must PASS
- Run `pnpm typecheck` — no type errors
- Run `pnpm lint` — no lint errors
- Run `pnpm rules:check` — rule ID still covered

## Step 5: Report

Summarize:
- What functions were added/modified
- What test cases were written
- What edge cases remain for future rules
- Any design decisions made and why
