---
description: "Add a new Zod schema to shared/src/schema.ts with generation and tests"
argument-hint: "<SchemaName> [field:type field:type ...]"
model: sonnet
allowed-tools: "Read, Write, Edit, Bash, Grep, Glob"
---

Add a new Zod schema to the Phalanx shared package. Schema details: $ARGUMENTS

Follow these steps exactly:

1. **Read current schemas:**
   - Read `shared/src/schema.ts` to understand existing patterns and available schemas to reference
   - Read `shared/tests/schema.test.ts` to see test patterns

2. **Add the schema to `shared/src/schema.ts`:**
   - Follow existing naming convention: `export const <Name>Schema = z.object({...})`
   - Use existing schemas where possible (e.g., `SuitSchema`, `RankSchema`, `CardSchema`)
   - Place the new schema after related schemas (keep logical grouping)
   - Use strict Zod types: `.uuid()` for IDs, `.datetime()` for timestamps, `.min()/.max()` for bounds

3. **Regenerate artifacts:**
   - Run `pnpm schema:gen` to update `shared/src/types.ts` and `shared/json-schema/`

4. **Add tests to `shared/tests/schema.test.ts`:**
   - Add a `describe('<SchemaName>Schema', () => {...})` block
   - Include at minimum:
     - One test parsing a valid object (AAA style)
     - One test rejecting an invalid object (missing required field or wrong type)
   - Use realistic test data matching game domain

5. **Verify:**
   - Run `pnpm test:shared` to confirm tests pass
   - Run `pnpm schema:check` to confirm generated files are up to date
   - Run `pnpm typecheck` to confirm no type errors
   - Report results

Do NOT modify engine, server, or client code. Only touch the shared package.
