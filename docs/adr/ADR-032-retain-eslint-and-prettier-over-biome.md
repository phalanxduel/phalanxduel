---
id: decision-032
title: 'ADR-032 - Retain ESLint and Prettier over Biome'
owner: Project Owner + Platform
date: '2026-11-25'
status: accepted
---

# ADR-032 - Retain ESLint and Prettier over Biome

## Context

We evaluated adopting Biome to replace or supplement ESLint and Prettier for formatting and linting TypeScript across the Phalanx Duel monorepo (`shared`, `engine`, `server`, `client`, `admin`, `mcp`, `bin/qa`, and `scripts`).

Biome offers significantly faster single-binary formatting and non-type-aware linting for TypeScript, JavaScript, JSON, and CSS. However, our current `eslint.config.js` and `.prettierrc` pipeline enforces several repository-wide safety and governance controls that go beyond syntactic linting.

## Decision

Remain on **ESLint (`typescript-eslint` + `eslint-plugin-security` + `eslint-plugin-tsdoc`) and Prettier** rather than adopting Biome.

### Rationale

1. **Type-aware safety rules (`projectService`):** The repository enforces type-checked rules (`@typescript-eslint/no-floating-promises`, `@typescript-eslint/no-misused-promises`, `@typescript-eslint/restrict-template-expressions`, and incremental `@typescript-eslint/no-unsafe-*` ratchets) via `pnpm lint:typed`. Biome does not provide full `projectService` parity for these rules.
2. **Security and documentation plugins:** `eslint-plugin-security` (e.g. `detect-non-literal-fs-filename`) and `eslint-plugin-tsdoc` have no direct Biome equivalents.
3. **Polyglot formatting surface:** Prettier formats Markdown, YAML, JSON, CSS, and TypeScript with one configuration. Because Biome does not format Markdown or YAML, Prettier would still be required in the repo.
4. **Avoid dual-tool drift:** Adding Biome alongside ESLint and Prettier would introduce two linter/formatter configurations to keep synchronized in exchange for only ~8 seconds of wall-clock savings per run, while Vitest remains the dominant cost in `pnpm check`.

## Consequences

- Single formatting and linting toolchain remains in place (`eslint.config.js` + `.prettierrc` + `markdownlint-cli2`).
- Fast containerized verification continues to use `ESLINT_SKIP_PROJECT_SERVICE=1` while full type-aware linting remains available via `pnpm lint:typed`.
- Revisit this decision only if Biome achieves full type-aware rule parity with `typescript-eslint` and covers our security/documentation requirements without requiring a parallel toolchain.
