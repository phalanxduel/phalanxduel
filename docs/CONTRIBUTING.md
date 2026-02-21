# Phalanx Duel — Contributing

## TDD-First Workflow

All game rule changes follow this strict order:

1. **Document the rule** — add or update the rule ID in `docs/RULES.md`.
2. **Write the test** — create a failing test referencing that rule ID.
3. **Implement the rule** — write the minimum code to make the test pass.
4. **Verify CI** — all gates must pass before merge.

Do not write implementation code before writing a failing test.

## CI Gates

Every PR must pass all of the following (see `.github/workflows/ci.yml`):

| Gate | Command | What it checks |
|---|---|---|
| Lint | `pnpm lint` | ESLint across all packages |
| Typecheck | `pnpm typecheck` | `tsc --noEmit` in every package |
| Test | `pnpm test` | Vitest unit + integration tests |
| Schema | `pnpm schema:check` | Generated types/JSON Schema match source |
| Rules | `pnpm rules:check` | Every rule ID in RULES.md has a test reference |

## Adding a New Rule

1. Add rule ID (`PHX-<CATEGORY>-NNN`) and description to `docs/RULES.md`.
2. Update the mapping in `docs/TESTPLAN.md`.
3. Add a `describe('PHX-XXX-NNN: ...')` block in `engine/tests/rules.test.ts`
   (or a new test file).
4. Start with `it.todo(...)` stubs, then implement.
5. Run `pnpm rules:check` locally to verify coverage.

## Modifying Schemas

1. Edit `shared/src/schema.ts`.
2. Run `pnpm schema:gen` to regenerate `types.ts` and JSON Schema snapshots.
3. Commit the generated files alongside your schema changes.
4. `pnpm schema:check` verifies this in CI.

## Test Conventions

- **Engine tests** — AAA (Arrange / Act / Assert). Pure functions only.
- **Server tests** — BDD (Given / When / Then via describe/it). Uses supertest.
  - Chosen over Playwright because server tests validate HTTP/WS behavior, not
    browser rendering. supertest is lighter and faster for this purpose.
- **Schema tests** — validate Zod parse success/failure for boundary inputs.

## Observability

When adding server-side logic, wrap it in tracing spans. See
`server/src/tracing.ts` for helper functions and `docs/OBSERVABILITY.md` for
the attribute contract.
