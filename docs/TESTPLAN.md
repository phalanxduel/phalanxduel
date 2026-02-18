# Phalanx — Test Plan

This document maps each rule ID from [RULES.md](./RULES.md) to the test files
that verify it. The CI gate `pnpm rules:check` enforces that every rule ID is
referenced in at least one test.

## Rule-to-Test Mapping

| Rule ID | Description | Test File(s) |
|---|---|---|
| PHX-DEPLOY-001 | Initial battlefield deployment | `engine/tests/rules.test.ts` |
| PHX-DEPLOY-002 | Alternating card placement | `engine/tests/rules.test.ts` |
| PHX-CARDS-001 | Deck composition | `engine/tests/rules.test.ts` |
| PHX-CARDS-002 | Card values | `engine/tests/rules.test.ts` |
| PHX-CARDS-003 | Face-down cards (deferred — see `FUTURE.md`) | `engine/tests/rules.test.ts` |
| PHX-CARDS-004 | Joker card (deferred — see `FUTURE.md`) | `engine/tests/rules.test.ts` |
| PHX-COMBAT-001 | Basic combat resolution | `engine/tests/rules.test.ts` |
| PHX-SUIT-001 | Diamonds: doubled defense (front row) | `engine/tests/rules.test.ts` |
| PHX-SUIT-002 | Hearts: halve overflow to player LP | `engine/tests/rules.test.ts` |
| PHX-SUIT-003 | Clubs: doubled overflow to back card | `engine/tests/rules.test.ts` |
| PHX-SUIT-004 | Spades: doubled overflow to player LP | `engine/tests/rules.test.ts` |
| PHX-LP-001 | Players start with 20 LP | `engine/tests/rules.test.ts` |
| PHX-LP-002 | LP depletion victory | `engine/tests/rules.test.ts` |
| PHX-OVERFLOW-001 | Column overflow damage | `engine/tests/rules.test.ts` |
| PHX-OVERFLOW-002 | Ace overflow exception | `engine/tests/rules.test.ts` |
| PHX-COMBATLOG-001 | Structured combat log | `engine/tests/rules.test.ts` |
| PHX-COMBATLOG-002 | Self-verifiable combat log | `engine/tests/rules.test.ts` |
| PHX-ACE-001 | Ace invulnerability | `engine/tests/rules.test.ts` |
| PHX-REINFORCE-001 | Auto front row advancement | `engine/tests/rules.test.ts` |
| PHX-REINFORCE-002 | Reinforcement phase entry after destruction | `engine/tests/rules.test.ts` |
| PHX-REINFORCE-003 | Mandatory deployment to damaged column | `engine/tests/rules.test.ts` |
| PHX-REINFORCE-004 | Draw to 4 after reinforcement | `engine/tests/rules.test.ts` |
| PHX-REINFORCE-005 | Victory requires no battlefield + no hand + no drawpile | `engine/tests/rules.test.ts` |
| PHX-TURNS-001 | Turn structure | `engine/tests/rules.test.ts` |
| PHX-TURNS-002 | Pass increments turn number | `engine/tests/rules.test.ts` |
| PHX-VICTORY-001 | Win condition | `engine/tests/rules.test.ts` |
| PHX-VICTORY-002 | Forfeit | `engine/tests/rules.test.ts` |
| PHX-RESOURCES-001 | Hand card management | `engine/tests/rules.test.ts` |
| PHX-TXLOG-001 | Transaction log records every game action | `engine/tests/rules.test.ts` |
| PHX-TXLOG-002 | Entries contain action, sequence number, state hashes | `engine/tests/rules.test.ts` |
| PHX-TXLOG-003 | Game is replayable from initial config + ordered actions | `engine/tests/replay.test.ts` |
| PHX-DAMAGE-001 | Optional per-turn HP reset | `engine/tests/rules.test.ts`, `engine/tests/replay.test.ts` |

## Test Styles

- **Engine unit tests (AAA):** Arrange / Act / Assert. Pure function testing,
  no I/O. Located in `engine/tests/`.
- **Server integration tests (BDD):** Given / When / Then style via
  `describe`/`it`. Uses supertest to hit real HTTP endpoints. Located in
  `server/tests/`.
- **Schema tests:** Validate Zod schema parsing for expected and rejected
  inputs. Located in `shared/tests/`.

## Adding a New Rule

1. Add the rule ID and description to `docs/RULES.md`.
2. Add a row to the mapping table above.
3. Create a `describe('PHX-XXX-NNN: ...')` block in the appropriate test file.
4. Use `it.todo(...)` for stubs; replace with real assertions when implementing.
5. Run `pnpm rules:check` to confirm coverage.
